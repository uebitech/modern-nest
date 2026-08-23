# Testes de Guards, Middleware e componentes HTTP

Este documento reúne padrões de teste para Guards, Middleware, Pipes,
Interceptors e Exception Filters.

## 1. Guard

Teste um guard com `ExecutionContext` mockado:

```typescript
const request = { user: { id: 1 } };
const context = {
  switchToHttp: () => ({ getRequest: () => request }),
} as ExecutionContext;

expect(new JwtAuthGuard().canActivate(context)).toBe(true);
```

Casos essenciais:

- Usuário autenticado.
- Usuário ausente.
- Token inválido.
- Role correta.
- Role ausente.

Para guards Passport, teste a estratégia separadamente ou faça teste E2E com
um token de teste.

## 2. Middleware

Teste se o middleware chama `next`:

```typescript
const request = { method: 'GET', originalUrl: '/users' } as Request;
const response = {
  on: jest.fn(),
  setHeader: jest.fn(),
} as unknown as Response;
const next = jest.fn();

new RequestIdMiddleware().use(request, response, next);

expect(next).toHaveBeenCalledTimes(1);
expect(response.setHeader).toHaveBeenCalled();
```

Teste também headers já existentes e erros de autenticação simples.

## 3. Pipes

```typescript
const pipe = new PositiveIntPipe();

expect(pipe.transform('10')).toBe(10);
expect(() => pipe.transform('abc')).toThrow(BadRequestException);
```

Teste transformação e rejeição de valores inválidos.

## 4. Interceptors

Mocke `CallHandler` com Observable:

```typescript
const next = { handle: () => of({ value: 1 }) };
const result = interceptor.intercept(context, next);

await expect(lastValueFrom(result)).resolves.toEqual({ value: 1 });
```

Verifique se `handle` foi chamado, se a resposta foi transformada e se erros
foram relançados.

## 5. Exception Filters

Use mocks de `ArgumentsHost`:

```typescript
const json = jest.fn();
const status = jest.fn().mockReturnValue({ json });
const response = { status };
const host = {
  switchToHttp: () => ({
    getResponse: () => response,
    getRequest: () => ({ url: '/users/1', method: 'GET' }),
  }),
} as unknown as ArgumentsHost;

new AllExceptionsFilter().catch(new NotFoundException('Ausente'), host);

expect(status).toHaveBeenCalledWith(404);
expect(json).toHaveBeenCalled();
```

## 6. Testes de autorização

Teste o fluxo completo:

```text
sem token -> 401
com token inválido -> 401
com token válido e role errada -> 403
com token válido e role correta -> 200
```

Não valide autorização apenas com um mock que sempre retorna `true`; inclua
casos negativos.

## 7. Testes unitários versus E2E

- Unitários: rápidos, isolados, com mocks.
- Integração: módulos e providers reais.
- E2E: request HTTP, guards, pipes, filters e resposta.

Use unitários para lógica e E2E para confirmar o contrato externo.

## 8. Comandos

O projeto atual ainda não possui Jest configurado. Consulte [testing.md](testing.md)
para instalar:

```bash
npm install --save-dev jest @types/jest ts-jest @nestjs/testing
npm test
npm run test:cov
```

## 9. Checklist

- [ ] Guard tem testes positivos e negativos.
- [ ] Middleware chama `next` corretamente.
- [ ] Headers são testados.
- [ ] Pipes testam transformação e erro.
- [ ] Interceptors testam resultado e exception.
- [ ] Filters testam status e formato.
- [ ] Autorização tem casos `401`, `403` e sucesso.
- [ ] Testes E2E cobrem rotas protegidas.
