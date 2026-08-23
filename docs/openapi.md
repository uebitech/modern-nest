# OpenAPI e Swagger

OpenAPI descreve o contrato HTTP de forma legível por pessoas e ferramentas.

## Estado atual

A aplicação ainda não possui Swagger configurado. Atualmente existem:

```text
GET /users
POST /users
```

## 1. Instale Swagger

```bash
npm install @nestjs/swagger
```

## 2. Configure no bootstrap

```typescript
const config = new DocumentBuilder()
  .setTitle('Modern Nest API')
  .setDescription('API de usuários')
  .setVersion('1.0')
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

A interface ficará em:

```text
http://localhost:3001/api
```

## 3. Documente controller

```typescript
@ApiTags('users')
@Controller('users')
export class UsersController {}
```

Documente operações:

```typescript
@ApiOperation({ summary: 'Lista usuários' })
@ApiResponse({ status: 200, type: [UserResponseDto] })
@Get()
findAll() {}
```

## 4. Documente DTO

```typescript
export class CreateUserDto {
  @ApiProperty({ example: 'Ada' })
  name!: string;

  @ApiProperty({ example: 'ada@example.com' })
  email!: string;
}
```

Use DTOs de request e response separados quando necessário.

## 5. Contrato atual

### `GET /users`

Response `200`:

```json
[
  {
    "id": 1,
    "name": "Ada",
    "email": "ada@example.com",
    "createdAt": "2026-08-23T12:00:00.000Z"
  }
]
```

### `POST /users`

Request:

```json
{
  "name": "Ada",
  "email": "ada@example.com"
}
```

Response `201` com o usuário persistido.

## 6. Segurança no schema

Quando JWT for implementado:

```typescript
.addBearerAuth()
```

E nas rotas:

```typescript
@ApiBearerAuth()
```

Não publique schemas contendo secrets ou campos internos.

## 7. Versionamento

Publique o JSON OpenAPI versionado junto com a aplicação. Mudanças de campos
obrigatórios, status ou formato devem ser tratadas como mudanças de contrato.

## 8. Checklist

- [ ] Swagger configurado.
- [ ] Cada rota possui descrição.
- [ ] Requests e responses documentados.
- [ ] Erros documentados.
- [ ] DTOs aparecem no schema.
- [ ] Segurança está descrita.
- [ ] Documentação corresponde ao comportamento real.
