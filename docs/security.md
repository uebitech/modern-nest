# Segurança

Este guia reúne controles básicos para proteger a API NestJS, suas entradas,
respostas, headers e infraestrutura.

## Estado atual

A aplicação atual ainda não configura explicitamente:

- `ValidationPipe`.
- CORS.
- Rate limiting.
- Helmet.
- Autenticação.
- Filtro global de segurança.

O objetivo deste documento é orientar a implementação desses controles.

## 1. Validação de entrada

Tipos TypeScript não validam dados em runtime. Use DTOs e `class-validator`:

```bash
npm install class-validator class-transformer
```

DTO:

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name!: string;

  @IsEmail()
  email!: string;
}
```

Ative globalmente:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

Rejeite entradas desconhecidas e limite tamanho de strings, listas, paginação e
uploads. Consulte [dto.md](dto.md).

## 2. CORS

CORS controla quais origens de navegador podem acessar a API.

Configuração explícita:

```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') ?? [],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
});
```

Não use `origin: '*'` junto com `credentials: true`.

Em produção, liste apenas origens confiáveis:

```env
CORS_ORIGIN=https://app.example.com
```

## 3. Rate limiting

Rate limiting reduz abuso, brute force e sobrecarga.

Instale o módulo:

```bash
npm install @nestjs/throttler
```

Configure no módulo:

```typescript
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
})
export class AppModule {}
```

Ative o guard global:

```typescript
providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
],
```

Use limites mais restritivos para login e recuperação de senha. Em ambientes
com proxy, configure corretamente a identificação do IP.

## 4. Headers de segurança

Instale Helmet:

```bash
npm install helmet
```

No bootstrap:

```typescript
import helmet from 'helmet';

app.use(helmet());
```

Helmet adiciona headers que reduzem riscos comuns, como exposição de tecnologia,
clickjacking e alguns vetores de conteúdo.

Revise a política de Content Security Policy conforme o frontend. Não copie uma
política ampla sem entender seus recursos.

## 5. HTTPS e proxy

Em produção, use HTTPS entre cliente e proxy. A aplicação pode ficar atrás de
Nginx, ingress ou load balancer.

Garanta que:

- O certificado seja válido.
- HTTP redirecione para HTTPS.
- Headers de proxy sejam tratados corretamente.
- Cookies seguros usem `Secure` e `HttpOnly`.
- O proxy não exponha a porta interna sem necessidade.

## 6. Proteção contra exposição de dados

Não retorne automaticamente:

- Senhas ou hashes.
- Tokens.
- Segredos de ambiente.
- Dados internos de infraestrutura.
- Stack traces.
- Queries SQL.
- Campos privados desnecessários.

Selecione campos explicitamente:

```typescript
return {
  id: user.id,
  name: user.name,
  email: user.email,
};
```

Use response DTOs e serializers quando o contrato crescer.

## 7. SQL injection

Use repositories e parâmetros do TypeORM:

```typescript
return repository
  .createQueryBuilder('user')
  .where('user.email = :email', { email })
  .getOne();
```

Nunca concatene entrada do cliente em SQL:

```typescript
// Evite:
.where(`user.email = '${email}'`)
```

## 8. Credenciais

- Use `.env` apenas localmente.
- Use secret manager em produção.
- Troque credenciais padrão do Compose.
- Use permissões mínimas no banco.
- Rotacione segredos.
- Não registre URLs com senha.
- Revise commits e imagens antes do deploy.

Os valores `app/app` e `root/root` do Compose são apenas para desenvolvimento.

## 9. Autenticação e autorização

Proteja endpoints privados com JWT e guards. Verifique permissões no servidor,
nunca confie em role enviada pelo cliente.

Consulte [authentication.md](authentication.md).

## 10. Erros seguros

Respostas de erro devem ser úteis sem revelar implementação:

```json
{
  "statusCode": 500,
  "code": "INTERNAL_ERROR",
  "message": "Erro interno do servidor"
}
```

Registre o detalhe técnico internamente com um identificador de correlação.
Consulte [error-handling.md](error-handling.md).

## 11. Dependências

Mantenha dependências atualizadas:

```bash
npm audit
npm outdated
```

Revise vulnerabilidades antes de atualizar pacotes em produção. Fixar versões
por lockfile torna instalações reproduzíveis.

## 12. Banco e backups

Use migrations controladas e backups testados. Restrinja acesso ao banco para
rede e usuários necessários.

Consulte [database.md](database.md) e [migrations.md](migrations.md).

## 13. Checklist

- [ ] DTOs validam requests.
- [ ] Propriedades extras são rejeitadas.
- [ ] CORS lista origens confiáveis.
- [ ] Rate limiting está ativo.
- [ ] Helmet está configurado.
- [ ] Produção usa HTTPS.
- [ ] Segredos não estão no código ou logs.
- [ ] Respostas não expõem dados internos.
- [ ] Queries usam parâmetros.
- [ ] Dependências são auditadas.
- [ ] Banco possui usuário com permissões mínimas.
- [ ] Autenticação e autorização são testadas.
