# Autenticação e autorização

Este guia apresenta uma forma comum de adicionar login, JWT, guards, usuários
autenticados e permissões ao projeto NestJS.

## Estado atual

A aplicação atual possui apenas o módulo de usuários e não implementa:

- Login.
- Senhas.
- JWT.
- `AuthModule`.
- Guards de autenticação.
- Permissões ou roles.

Os exemplos deste documento são o caminho recomendado para uma evolução futura.
Não adicione senhas à entity `User` sem definir hash, migração e política de
segurança.

## 1. Autenticação versus autorização

- **Autenticação:** responde quem é o usuário.
- **Autorização:** responde o que esse usuário pode fazer.

Fluxo comum:

```text
Credenciais -> Login -> JWT -> Guard -> Usuário autenticado -> Permissão
```

O login valida credenciais. O JWT transporta uma identidade assinada. O guard
bloqueia requests sem token. A autorização verifica roles ou permissões.

## 2. Estrutura recomendada

Crie um módulo próprio:

```text
src/auth/
├── auth.controller.ts
├── auth.module.ts
├── auth.service.ts
├── guards/
│   └── jwt-auth.guard.ts
└── strategies/
    └── jwt.strategy.ts
```

O módulo de usuários continua responsável pelos dados do usuário. O módulo de
auth fica responsável por login, estratégia e validação do token.

## 3. Dependências

Uma implementação JWT comum usa:

```bash
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install --save-dev @types/passport-jwt @types/bcrypt
```

- `@nestjs/jwt`: assina e verifica tokens.
- `passport`: abstrai estratégias de autenticação.
- `passport-jwt`: lê JWT do request.
- `bcrypt`: compara senha com hash.

Nunca armazene senha em texto puro.

## 4. Campos de autenticação

Uma entity de autenticação pode adicionar:

```typescript
@Column({ unique: true })
email!: string;

@Column({ select: false })
passwordHash!: string;
```

`select: false` evita trazer o hash em consultas comuns. Para login, busque-o
explicitamente com uma consulta apropriada.

O ideal é armazenar `passwordHash`, não `password`.

## 5. Crie o `AuthModule`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

O segredo deve vir do ambiente, nunca ser escrito no código.

## 6. Login

O endpoint de login recebe credenciais:

```typescript
@Post('login')
login(@Body() body: LoginDto) {
  return this.authService.login(body.email, body.password);
}
```

O service valida a senha e assina o token:

```typescript
async login(email: string, password: string) {
  const user = await this.usersService.findByEmailWithPassword(email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new UnauthorizedException('Credenciais inválidas');
  }

  return {
    accessToken: await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    }),
  };
}
```

Não diga se o e-mail ou a senha estava errada. Uma mensagem única reduz
vazamento de informações sobre contas existentes.

## 7. JWT

JWT possui normalmente três partes:

```text
header.payload.signature
```

Payload recomendado:

```json
{
  "sub": 1,
  "email": "ada@example.com",
  "iat": 1724414400,
  "exp": 1724415300
}
```

- `sub`: identificador do usuário.
- `iat`: momento de emissão.
- `exp`: expiração.

Não coloque senha, hash ou dados sensíveis no payload. JWT assinado não é
necessariamente criptografado; o cliente pode ler o payload.

## 8. Variáveis JWT

Adicione ao ambiente de produção:

```env
JWT_SECRET=segredo-longo-e-aleatorio
JWT_EXPIRES_IN=15m
```

Use um segredo aleatório, longo e exclusivo por ambiente. Nunca versione o
valor real em `.env`, README, logs ou imagem Docker.

## 9. Estratégia JWT

A estratégia extrai e valida o token:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  validate(payload: { sub: number; email: string }) {
    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}
```

`validate` retorna o objeto que o Passport colocará em `request.user`.

## 10. Guard JWT

Crie um guard:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Proteja uma rota:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getProfile(@Request() request: RequestWithUser) {
  return request.user;
}
```

Request:

```http
Authorization: Bearer <access-token>
```

Token ausente, inválido ou expirado deve resultar em `401 Unauthorized`.

## 11. Usuário autenticado

Um decorator evita repetir acesso a `request.user`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
```

Uso:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: AuthenticatedUser) {
  return user;
}
```

O usuário autenticado deve vir do token validado, não de um id enviado pelo
cliente como se fosse confiável.

## 12. Roles e permissões

Para autorização simples, defina roles:

```typescript
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}
```

Decorator:

```typescript
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
```

Guard:

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    return requiredRoles.includes(request.user.role);
  }
}
```

Uso:

```typescript
@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
getAdminData() {
  return { allowed: true };
}
```

Sem autenticação, a request falha em `JwtAuthGuard`. Com autenticação, mas sem
role, deve falhar em `RolesGuard`, normalmente com `403 Forbidden`.

## 13. Permissões granulares

Roles funcionam para regras simples. Para sistemas maiores, use permissões:

```text
users:read
users:create
users:update
users:delete
```

Uma role pode possuir várias permissões. A verificação deve ser centralizada em
um guard ou authorization service, não duplicada em cada controller.

## 14. Access token e refresh token

Uma arquitetura comum usa:

- Access token curto, usado nas requests.
- Refresh token de duração maior, usado para obter novo access token.

Boas práticas:

- Expiração curta para access tokens.
- Rotação de refresh tokens.
- Revogação em logout ou comprometimento.
- Armazenamento seguro no cliente.
- Não colocar refresh token em logs.

JWT não é automaticamente revogável. Se a aplicação precisa invalidar tokens,
controle sessões, versão de token ou lista de revogação.

## 15. Teste da autenticação

Teste:

```text
POST /auth/login com credenciais válidas -> 200
POST /auth/login com credenciais inválidas -> 401
GET /users/me sem token -> 401
GET /users/me com token inválido -> 401
GET /admin com role insuficiente -> 403
GET /admin com role correta -> 200
```

Nunca use senha real em testes ou fixtures versionadas.

## 16. Checklist

- [ ] Senhas são armazenadas somente como hash.
- [ ] Login retorna token apenas após validar credenciais.
- [ ] JWT possui expiração.
- [ ] `JWT_SECRET` vem do ambiente.
- [ ] Payload não contém dados sensíveis.
- [ ] Rotas privadas usam guard.
- [ ] Usuário autenticado vem de `request.user`.
- [ ] Permissões são verificadas separadamente de autenticação.
- [ ] Falhas retornam `401` ou `403` corretamente.
- [ ] Tokens não aparecem em logs.
- [ ] Login, logout e expiração têm testes.
