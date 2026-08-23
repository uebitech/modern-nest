# Exception Filters

Exception filters capturam erros e controlam o formato da resposta HTTP.

## Estado atual

O projeto ainda não possui filtro global. As exceptions padrão do NestJS podem
ser usadas diretamente enquanto a API é pequena.

## 1. `ExceptionFilter`

Um filtro implementa:

```typescript
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();
    response.status(500).json({
      statusCode: 500,
      message: 'Erro interno do servidor',
    });
  }
}
```

## 2. `@Catch()`

`@Catch()` sem argumento captura qualquer exception. Para uma classe específica:

```typescript
@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {}
```

Use filtros específicos quando o tratamento realmente for diferente.

## 3. Filtro global

No bootstrap:

```typescript
app.useGlobalFilters(new AllExceptionsFilter());
```

Ou pelo módulo:

```typescript
providers: [
  {
    provide: APP_FILTER,
    useClass: AllExceptionsFilter,
  },
],
```

`APP_FILTER` permite injeção de dependências no filtro.

## 4. Preservar status NestJS

Um filtro real deve preservar `HttpException`:

```typescript
const status = exception instanceof HttpException
  ? exception.getStatus()
  : HttpStatus.INTERNAL_SERVER_ERROR;
```

Para `NotFoundException`, preserve `404`; para `BadRequestException`, `400`.

## 5. Padronizar resposta

Formato recomendado:

```json
{
  "statusCode": 404,
  "code": "USER_NOT_FOUND",
  "message": "Usuário não encontrado",
  "path": "/users/10",
  "timestamp": "2026-08-23T12:00:00.000Z"
}
```

Códigos estáveis ajudam clientes a tratar erros sem depender da mensagem.

## 6. Erros comuns

```typescript
throw new BadRequestException('Dados inválidos');
throw new NotFoundException('Usuário não encontrado');
throw new ConflictException('E-mail já cadastrado');
```

- `400`: entrada inválida.
- `404`: recurso inexistente.
- `409`: conflito de estado.
- `500`: falha inesperada.

## 7. TypeORM

Erros de unicidade do MariaDB não são automaticamente `409`. Capture o erro no
service ou em uma camada de adaptação:

```typescript
try {
  return await repository.save(user);
} catch (error) {
  if (isDuplicateKeyError(error)) {
    throw new ConflictException('E-mail já cadastrado');
  }
  throw error;
}
```

Não envie a mensagem SQL original ao cliente.

## 8. Logs seguros

O filtro pode registrar método, caminho, status e request id:

```typescript
logger.error({
  method: request.method,
  path: request.url,
  status,
  requestId: request.requestId,
});
```

Não registre password, JWT, Authorization, DATABASE_URL ou stack trace na
resposta. Stack trace pode ficar apenas em logs protegidos.

## 9. Escopos

Filtro de rota:

```typescript
@UseFilters(NotFoundFilter)
@Get(':id')
findOne() {}
```

Filtro de controller:

```typescript
@UseFilters(AllExceptionsFilter)
@Controller('users')
export class UsersController {}
```

Filtro global é adequado para formato de erro comum.

## 10. Testes

Teste que:

- `NotFoundException` vira `404`.
- Entrada inválida vira `400`.
- Duplicidade vira `409`.
- Erro desconhecido vira `500`.
- Segredos não aparecem na resposta.

## 11. Checklist

- [ ] Filtro implementa `ExceptionFilter`.
- [ ] `@Catch` captura o escopo correto.
- [ ] Status original é preservado.
- [ ] Resposta tem formato consistente.
- [ ] Erros TypeORM são adaptados.
- [ ] Logs não expõem dados sensíveis.
- [ ] Casos de erro possuem testes.
