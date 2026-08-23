# Middleware

Middleware é uma função executada antes do handler final. Ele recebe request,
response e `next`, podendo observar ou alterar o fluxo.

## Estado atual

O projeto ainda não possui middleware customizado. O `main.ts` apenas cria a
aplicação, ativa shutdown hooks e inicia o servidor.

## 1. `NestMiddleware`

Crie um middleware:

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = Date.now();

    response.on('finish', () => {
      console.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${Date.now() - startedAt}ms`);
    });

    next();
  }
}
```

Sempre chame `next()` quando a request deve continuar.

## 2. Middleware global

No `main.ts`, o middleware pode ser aplicado diretamente:

```typescript
app.use((request, response, next) => {
  console.log(request.method, request.url);
  next();
});
```

Use isso para comportamentos realmente globais, como request id ou logging.

## 3. Middleware por módulo

Implemente `NestModule`:

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';

@Module({})
export class UsersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes(UsersController);
  }
}
```

Também é possível filtrar por método e caminho:

```typescript
consumer
  .apply(RequestLoggerMiddleware)
  .forRoutes({ path: 'users', method: RequestMethod.GET });
```

## 4. Logger de requests

Inclua método, caminho, status e duração. Não registre body completo ou header
`Authorization` por padrão.

```typescript
const safePath = request.originalUrl.split('?')[0];
console.log({
  method: request.method,
  path: safePath,
  statusCode: response.statusCode,
  durationMs: Date.now() - startedAt,
});
```

Prefira `Logger` do NestJS ou logger estruturado em vez de `console.log` em
produção.

## 5. `requestId`

Um id de request permite encontrar todos os logs da mesma chamada:

```typescript
import { randomUUID } from 'node:crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    const requestId = request.header('x-request-id') ?? randomUUID();
    response.setHeader('x-request-id', requestId);
    request.requestId = requestId;
    next();
  }
}
```

Valide tamanho e formato do id recebido. Nunca use `requestId` como prova de
identidade.

## 6. Leitura de headers

Headers podem ser lidos assim:

```typescript
const userAgent = request.header('user-agent');
const language = request.header('accept-language');
```

Não confie em headers enviados pelo cliente para autorização. Proxies podem
alterá-los; configure confiança no proxy de forma explícita.

## 7. Autenticação simples via middleware

Uma API key simples pode ser lida por middleware:

```typescript
@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    if (request.header('x-api-key') !== process.env.API_KEY) {
      response.status(401).json({ message: 'Não autorizado' });
      return;
    }

    next();
  }
}
```

Para autenticação de usuário e JWT, prefira Guards, pois eles integram melhor o
ciclo de autorização do NestJS.

## 8. Middleware, Guard e Interceptor

| Recurso | Melhor uso |
| --- | --- |
| Middleware | Preparar request, request id e logging |
| Guard | Decidir se pode acessar a rota |
| Interceptor | Executar antes/depois e transformar resultado |
| Pipe | Validar ou transformar parâmetros |
| Filter | Capturar e formatar exceptions |

Middleware executa antes do contexto Nest completo. Guards conhecem o handler e
podem ler metadata. Interceptors envolvem a execução do handler.

## 9. Ordem aproximada

```text
Middleware -> Guards -> Interceptors -> Pipes -> Controller
```

Filters tratam exceptions lançadas durante o fluxo.

## 10. Boas práticas

- Sempre chame `next` quando apropriado.
- Não faça consultas pesadas em todo middleware global.
- Não registre secrets.
- Gere request id cedo.
- Mantenha middleware pequeno.
- Use Guards para autorização.
- Teste status e chamada de `next`.

## 11. Checklist

- [ ] Middleware implementa `NestMiddleware` quando registrado por módulo.
- [ ] `next()` é chamado no caminho permitido.
- [ ] Requests possuem rastreamento.
- [ ] Logs não expõem tokens.
- [ ] Middleware está aplicado às rotas corretas.
- [ ] Autorização não depende apenas de middleware.
