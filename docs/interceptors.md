# Interceptors

Interceptors envolvem a execução de um handler. Podem executar lógica antes e
depois, transformar respostas e medir performance.

## 1. O que são Interceptors

Um interceptor implementa `NestInterceptor`:

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ExampleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle();
  }
}
```

`next.handle()` continua a execução e retorna um Observable.

## 2. Antes e depois do handler

Use RxJS para agir antes e depois:

```typescript
return next.handle().pipe(
  tap(() => console.log('Depois do handler')),
);
```

Código antes de `next.handle()` executa antes do controller. Operadores do
Observable observam o resultado depois.

## 3. Medição de tempo

```typescript
const startedAt = Date.now();

return next.handle().pipe(
  tap(() => {
    const durationMs = Date.now() - startedAt;
    this.logger.log(`${request.method} ${request.url} ${durationMs}ms`);
  }),
);
```

Use isso para encontrar endpoints lentos. Não registre tokens ou body sensível.

## 4. Transformação de resposta

```typescript
return next.handle().pipe(
  map((data) => ({
    data,
    timestamp: new Date().toISOString(),
  })),
);
```

Não transforme respostas globalmente sem avaliar compatibilidade com clientes.

## 5. Interceptor local

```typescript
@Get()
@UseInterceptors(LoggingInterceptor)
findAll() {
  return this.usersService.findAll();
}
```

Use quando a lógica pertence a uma rota específica.

## 6. Interceptor de controller

```typescript
@Controller('users')
@UseInterceptors(PerformanceInterceptor)
export class UsersController {}
```

Aplica às rotas do controller.

## 7. Interceptor global

No bootstrap:

```typescript
app.useGlobalInterceptors(new PerformanceInterceptor());
```

Ou pelo módulo:

```typescript
providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: PerformanceInterceptor,
  },
],
```

Para interceptors globais com dependências NestJS, prefira `APP_INTERCEPTOR`.

## 8. Tratamento de erro no interceptor

```typescript
return next.handle().pipe(
  catchError((error) => {
    this.logger.error('Falha no handler', error.stack);
    throw error;
  }),
);
```

O interceptor registra e relança. A conversão do erro para resposta deve ficar
em exception filter ou exception apropriada.

## 9. Middleware versus interceptor

| Recurso | Característica |
| --- | --- |
| Middleware | Antes do contexto Nest, request/response/next |
| Interceptor | Envolve handler, conhece contexto e resultado |
| Guard | Decide acesso |
| Pipe | Valida ou transforma argumentos |
| Filter | Trata exceptions |

Use middleware para request id e logging inicial. Use interceptor para duração,
transformação e comportamento em torno do controller.

## 10. Interceptor com headers

```typescript
const response = context.switchToHttp().getResponse();
response.setHeader('x-response-time', `${durationMs}ms`);
```

Headers públicos devem ser definidos conscientemente e não revelar informações
internas desnecessárias.

## 11. Testes

Mocke `CallHandler`:

```typescript
const next = {
  handle: () => of({ ok: true }),
};

await lastValueFrom(interceptor.intercept(context, next));
expect(next.handle).toHaveBeenCalled();
```

Teste transformação, medição e repropagação de erros.

## 12. Checklist

- [ ] `next.handle()` é chamado.
- [ ] Lógica antes/depois está clara.
- [ ] Respostas não quebram contratos existentes.
- [ ] Performance é medida sem dados sensíveis.
- [ ] Erros são relançados ou tratados conscientemente.
- [ ] Escopo global/local é adequado.
- [ ] Interceptor possui testes.
