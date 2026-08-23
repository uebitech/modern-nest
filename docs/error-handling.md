# Tratamento de erros

Este guia explica como tratar erros em uma aplicação NestJS e como padronizar
respostas para que clientes recebam informações previsíveis.

## 1. Estado atual do projeto

O projeto atual ainda não possui exceptions customizadas nem filtro global. O
controller delega diretamente ao service:

```typescript
@Get()
findAll() {
  return this.usersService.findAll();
}
```

A seguir estão padrões recomendados para evoluir a API.

## 2. O que é um erro HTTP

Uma falha deve informar:

- Status HTTP adequado.
- Mensagem compreensível.
- Código estável para o cliente, quando necessário.
- Detalhes de validação, se aplicável.
- Nenhum segredo ou stack trace em produção.

Não transforme toda falha em `500`. Erros causados pela entrada do cliente devem
ser `4xx`; problemas inesperados da aplicação ou infraestrutura são `5xx`.

## 3. `BadRequestException`

Use `BadRequestException` quando a requisição é inválida:

- Campo obrigatório ausente.
- Formato incorreto.
- Id que não pode ser convertido.
- Combinação de parâmetros inválida.

Exemplo:

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class UsersService {
  validateName(name: string) {
    if (!name.trim()) {
      throw new BadRequestException('O nome é obrigatório');
    }
  }
}
```

Resposta padrão do NestJS:

```json
{
  "statusCode": 400,
  "message": "O nome é obrigatório",
  "error": "Bad Request"
}
```

Para parâmetros numéricos, prefira `ParseIntPipe`:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.findOne(id);
}
```

## 4. `NotFoundException`

Use quando o formato da requisição é válido, mas o recurso não existe:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';

async findOne(id: number) {
  const user = await this.usersRepository.findOneBy({ id });

  if (!user) {
    throw new NotFoundException('Usuário não encontrado');
  }

  return user;
}
```

Resposta:

```json
{
  "statusCode": 404,
  "message": "Usuário não encontrado",
  "error": "Not Found"
}
```

A busca deve ficar no service, porque a decisão de considerar a ausência um erro
faz parte da operação de negócio.

## 5. `ConflictException`

Use quando a requisição é válida, mas entra em conflito com o estado atual:

- E-mail já cadastrado.
- Nome único já utilizado.
- Operação duplicada.
- Recurso que não pode ser alterado no estado atual.

Exemplo:

```typescript
import { ConflictException } from '@nestjs/common';

async create(name: string, email: string) {
  const existingUser = await this.usersRepository.findOneBy({ email });

  if (existingUser) {
    throw new ConflictException('E-mail já cadastrado');
  }

  const user = this.usersRepository.create({ name, email });
  return this.usersRepository.save(user);
}
```

A restrição `unique` também deve existir no banco. A consulta melhora a
mensagem, mas não elimina uma condição de corrida entre requests simultâneas.

## 6. Outras exceptions úteis

NestJS fornece outras exceptions:

```typescript
UnauthorizedException // 401: autenticação ausente ou inválida
ForbiddenException    // 403: autenticado, mas sem permissão
MethodNotAllowedException // 405: método não permitido
UnprocessableEntityException // 422: entrada semântica inválida
InternalServerErrorException // 500: falha inesperada
```

Use a exception que melhor representa o contrato HTTP. Não use `Unauthorized`
para uma entidade inexistente nem `NotFound` para JSON malformado.

## 7. Validação com `ValidationPipe`

Com DTOs, o `ValidationPipe` pode converter erros de validação em `400`:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

Uma entrada inválida pode retornar:

```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "name should not be empty"
  ],
  "error": "Bad Request"
}
```

Consulte [dto.md](dto.md) para configurar os decorators.

## 8. Filtros globais

Um exception filter global intercepta erros antes da resposta final.

Crie, por exemplo, `src/common/filters/http-exception.filter.ts`:

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as { message?: string | string[] }).message
        : exceptionResponse;

    response.status(status).json({
      statusCode: status,
      message: message ?? 'Erro interno do servidor',
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

Registre no `main.ts`:

```typescript
app.useGlobalFilters(new HttpExceptionFilter());
```

O filtro transforma exceptions em um formato consistente. Em produção, não
inclua stack trace nem detalhes internos de banco na resposta.

## 9. Filtro para erros de banco

Erros do TypeORM não são automaticamente `ConflictException`. Uma camada de
tratamento pode identificar violações de unicidade e convertê-las:

```typescript
try {
  return await this.usersRepository.save(user);
} catch (error) {
  if (this.isDuplicateKeyError(error)) {
    throw new ConflictException('E-mail já cadastrado');
  }

  throw error;
}
```

Mantenha a identificação do código do driver isolada em um helper. Não exponha
a mensagem SQL original ao cliente.

## 10. Padronização das respostas

Um formato recomendado para erros:

```json
{
  "statusCode": 404,
  "code": "USER_NOT_FOUND",
  "message": "Usuário não encontrado",
  "path": "/users/10",
  "timestamp": "2026-08-23T12:00:00.000Z"
}
```

Campos:

- `statusCode`: status HTTP.
- `code`: código estável para o frontend ou consumidor.
- `message`: mensagem legível.
- `path`: rota solicitada.
- `timestamp`: instante do erro.

O código deve ser estável mesmo que a mensagem seja traduzida ou alterada.

Exemplo com exception customizada:

```typescript
throw new HttpException(
  {
    statusCode: 409,
    code: 'USER_EMAIL_ALREADY_EXISTS',
    message: 'E-mail já cadastrado',
  },
  HttpStatus.CONFLICT,
);
```

## 11. Não exponha informações sensíveis

Evite retornar:

- Senhas.
- Tokens.
- URLs internas.
- Stack traces.
- Queries SQL.
- Credenciais de banco.
- Detalhes de infraestrutura.

Registre detalhes técnicos em logs protegidos e devolva uma mensagem segura ao
cliente.

## 12. Logs

Registre contexto suficiente para investigação:

```typescript
this.logger.error('Falha ao criar usuário', {
  email,
  errorId,
});
```

Evite registrar senha, token ou dados pessoais sem necessidade. Um `errorId`
pode ligar a resposta pública ao log interno.

## 13. Onde tratar cada erro

| Erro | Camada preferencial |
| --- | --- |
| JSON malformado | Parser/framework |
| Campo inválido | DTO + ValidationPipe |
| Id inválido | Pipe no controller |
| Usuário inexistente | Service |
| E-mail duplicado | Service + banco |
| Formato de erro | Filter global |
| Falha de infraestrutura | Filter/logs |

## 14. Teste de erros

Verifique pelo menos:

```text
POST /users com body inválido -> 400
GET /users/999 inexistente -> 404
POST /users com e-mail repetido -> 409
Falha inesperada -> 500 sem detalhes internos
```

Exemplo E2E:

```typescript
await request(app.getHttpServer())
  .get('/users/999')
  .expect(404);
```

## 15. Boas práticas

- Use status HTTP semântico.
- Valide entrada antes do service.
- Trate regras de negócio no service.
- Mantenha restrições críticas no banco.
- Padronize o JSON de erro.
- Use códigos estáveis para consumidores.
- Não exponha detalhes internos.
- Registre logs seguros.
- Teste sucesso e falha.
- Não capture uma exception para ignorá-la silenciosamente.

## 16. Checklist

- [ ] `BadRequestException` é usada para entrada inválida.
- [ ] `NotFoundException` é usada para recurso inexistente.
- [ ] `ConflictException` é usada para conflitos.
- [ ] `ValidationPipe` está configurado quando há DTOs.
- [ ] Existe filtro global quando a API exige formato único.
- [ ] Respostas possuem estrutura previsível.
- [ ] Stack trace não é enviado ao cliente.
- [ ] Dados sensíveis não aparecem em logs.
- [ ] Erros possuem testes.
