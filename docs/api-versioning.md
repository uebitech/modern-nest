# Versionamento da API

Versionamento permite evoluir contratos sem quebrar consumidores existentes.

## Estado atual

A API ainda não possui versão explícita. As rotas atuais são:

```text
GET /users
POST /users
```

## 1. Quando versionar

Considere criar uma versão quando houver mudança incompatível:

- Renomear campos.
- Remover endpoint.
- Alterar significado de um campo.
- Tornar campo obrigatório.
- Mudar status ou formato de resposta.

Mudanças aditivas geralmente podem ser compatíveis, mas devem ser avaliadas.

## 2. Versionamento por URL

Forma explícita:

```typescript
@Controller({ path: 'users', version: '1' })
export class UsersController {}
```

Configure URI versioning no bootstrap conforme a estratégia escolhida. Rotas:

```text
/v1/users
/v2/users
```

## 3. Versionamento por header

Alternativas usam header ou media type:

```http
Accept: application/vnd.modern-nest.v1+json
```

É mais discreto, mas menos visível e pode dificultar testes manuais.

## 4. Compatibilidade

Ao evoluir:

1. Adicione a nova forma.
2. Mantenha a antiga durante a transição.
3. Comunique depreciação.
4. Meça uso da versão antiga.
5. Remova somente após prazo definido.

## 5. DTOs por versão

```typescript
export class CreateUserV1Dto {}
export class CreateUserV2Dto {}
```

Evite alterar silenciosamente um DTO usado por clientes antigos.

## 6. Documentação

Cada versão deve ter OpenAPI, exemplos, status e data de descontinuação claros.

## 7. Checklist

- [ ] Mudança foi classificada como compatível ou incompatível.
- [ ] Versão foi definida quando necessário.
- [ ] Clientes foram comunicados.
- [ ] DTOs não quebram consumidores antigos.
- [ ] Depreciação possui prazo.
- [ ] Testes cobrem versões suportadas.
