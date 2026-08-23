# Documentação da API

A API oferece endpoints para listar e criar usuários.

## Endereço base

### Execução local

```text
http://localhost:3001
```

### Execução com Docker Compose

```text
http://localhost:3000
```

A porta local vem de `PORT`. O Compose define `PORT=3000` dentro do container.

## Modelo de usuário

A entity `User` possui:

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | `number` | Identificador gerado automaticamente |
| `name` | `string` | Nome do usuário |
| `email` | `string` | E-mail único |
| `createdAt` | `Date` | Data de criação automática |

## `GET /users`

Lista todos os usuários cadastrados.

### Request

Não exige body, parâmetros ou query parameters.

```http
GET /users HTTP/1.1
Host: localhost:3001
Accept: application/json
```

### cURL

```bash
curl http://localhost:3001/users
```

Com Docker Compose:

```bash
curl http://localhost:3000/users
```

### Response de sucesso

Status: `200 OK`

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

Quando não existem usuários:

```json
[]
```

Os registros são ordenados por `createdAt` em ordem decrescente, portanto os
mais recentes aparecem primeiro.

### Erros possíveis

- `500 Internal Server Error`: falha de conexão, consulta ou configuração do
  banco.
- `404 Not Found`: URL ou prefixo incorreto, por exemplo, usar `/user` em vez
  de `/users`.

## `POST /users`

Cria um novo usuário.

### Headers

```http
Content-Type: application/json
Accept: application/json
```

### Request body

```json
{
  "name": "Ada",
  "email": "ada@example.com"
}
```

Campos usados atualmente:

| Campo | Obrigatório | Tipo | Descrição |
| --- | --- | --- | --- |
| `name` | Sim | `string` | Nome do usuário |
| `email` | Sim | `string` | E-mail que deve ser único |

O controller atual usa um tipo TypeScript inline. Isso documenta os campos no
código, mas ainda não ativa validação de runtime. Consulte [dto.md](dto.md) para
uma implementação com DTO e `ValidationPipe`.

### cURL

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

Com Docker Compose:

```bash
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

### Response de sucesso

Status padrão: `201 Created`

```json
{
  "id": 1,
  "name": "Ada",
  "email": "ada@example.com",
  "createdAt": "2026-08-23T12:00:00.000Z"
}
```

`id` e `createdAt` são gerados durante a persistência.

### Erros possíveis

#### JSON inválido

Um body que não seja JSON válido pode resultar em:

```text
400 Bad Request
```

#### Body ausente ou com campos inválidos

No estado atual, não há `ValidationPipe` nem DTO com `class-validator`. Por
isso, o TypeScript não valida requisições em runtime. Dados ausentes podem
chegar ao banco e provocar erro, normalmente:

```text
500 Internal Server Error
```

A recomendação é habilitar validação e devolver `400 Bad Request`, conforme
descrito em [dto.md](dto.md).

#### E-mail duplicado

A entity define `email` como único:

```typescript
@Column({ unique: true })
email!: string;
```

Uma tentativa de usar o mesmo e-mail pode gerar:

```text
500 Internal Server Error
```

O comportamento recomendado é capturar a violação de unicidade e retornar
`409 Conflict`.

## Fluxos de exemplo

### Criar e listar

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"Grace","email":"grace@example.com"}'

curl http://localhost:3001/users
```

### Verificar banco

```bash
mysql -h 127.0.0.1 -P 3307 -u app -p appdb
```

Depois:

```sql
SELECT id, name, email, createdAt FROM users;
```

## Resumo dos status

| Status | Uso |
| --- | --- |
| `200 OK` | Listagem concluída |
| `201 Created` | Usuário criado |
| `400 Bad Request` | JSON ou entrada inválida, quando validação estiver configurada |
| `404 Not Found` | Rota inexistente |
| `409 Conflict` | E-mail duplicado, comportamento recomendado |
| `500 Internal Server Error` | Falha inesperada ou de infraestrutura |
