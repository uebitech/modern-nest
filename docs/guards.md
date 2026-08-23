# Guards

Guards determinam se uma requisição pode continuar até o controller. Eles são
usados principalmente para autenticação e autorização.

## Estado atual

O projeto ainda não possui guards, JWT ou autenticação. Os exemplos abaixo são
uma base para evolução futura.

## 1. O que é um Guard

Um guard implementa `CanActivate`:

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class ExampleGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
```

Se retornar `true`, a requisição continua. Se retornar `false`, o NestJS bloqueia
a requisição, normalmente com `403 Forbidden`.

O guard pode retornar `boolean`, `Promise<boolean>` ou `Observable<boolean>`.

## 2. `ExecutionContext`

`ExecutionContext` permite acessar informações da requisição:

```typescript
const request = context.switchToHttp().getRequest();
const response = context.switchToHttp().getResponse();
```

Também é possível descobrir controller e método:

```typescript
const handler = context.getHandler();
const controller = context.getClass();
```

Isso é útil para ler metadata, como roles.

## 3. Guard de rota

Aplique um guard apenas em uma rota:

```typescript
@Get('private')
@UseGuards(JwtAuthGuard)
privateData() {
  return { allowed: true };
}
```

Esse guard não afeta as outras rotas do controller.

## 4. Guard de controller

Aplique a todas as rotas de uma classe:

```typescript
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {}
```

Use quando todas as operações do controller exigirem autenticação.

## 5. Guard global

Registre no bootstrap:

```typescript
app.useGlobalGuards(new JwtAuthGuard());
```

Ou pelo módulo:

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },
],
```

Um guard global protege todas as rotas. Para rotas públicas, crie metadata como
`@Public()` e faça o guard ignorá-la.

## 6. Autenticação e autorização

- **Autenticação:** confirma a identidade do usuário.
- **Autorização:** verifica permissões depois que a identidade foi confirmada.

Exemplo:

```text
JwtAuthGuard -> usuário autenticado?
RolesGuard   -> usuário possui a role necessária?
```

Autenticação geralmente falha com `401 Unauthorized`. Falta de permissão falha
com `403 Forbidden`.

## 7. `JwtAuthGuard`

Guard usando Passport:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

Uso:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@Request() request: RequestWithUser) {
  return request.user;
}
```

O guard espera normalmente:

```http
Authorization: Bearer <token>
```

Token ausente, inválido ou expirado deve produzir `401`.

## 8. `RolesGuard`

Defina metadata com um decorator:

```typescript
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

Guard:

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles) return true;

    const request = context.switchToHttp().getRequest();
    return roles.includes(request.user.role);
  }
}
```

Uso:

```typescript
@Get('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
adminArea() {
  return { allowed: true };
}
```

Em uma implementação real, retorne `403` explicitamente quando a role faltar.

## 9. Ordem dos guards

A ordem aproximada é:

```text
Guard global -> Guard do controller -> Guard da rota
```

Com múltiplos guards na mesma rota, a ordem declarada deve ser considerada:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
```

Primeiro o usuário é autenticado; depois sua permissão é verificada.

## 10. Guard customizado por header

Exemplo didático:

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    return request.headers['x-api-key'] === process.env.API_KEY;
  }
}
```

Não compare secrets fixos no código. Use ambiente e prefira comparação segura
quando o risco justificar.

## 11. Teste de Guard

Crie um contexto mockado:

```typescript
const context = {
  switchToHttp: () => ({
    getRequest: () => ({ headers: { authorization: 'Bearer token' } }),
  }),
} as ExecutionContext;

expect(guard.canActivate(context)).toBe(true);
```

Teste token ausente, token inválido, role correta e role ausente.

## 12. Checklist

- [ ] Guard implementa `CanActivate`.
- [ ] Autenticação e autorização estão separadas.
- [ ] Tokens não são registrados em logs.
- [ ] Rotas privadas usam `JwtAuthGuard`.
- [ ] Roles são verificadas no servidor.
- [ ] Erros usam `401` e `403` corretamente.
- [ ] Guards possuem testes.
