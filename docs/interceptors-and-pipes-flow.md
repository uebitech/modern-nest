# Fluxo de Interceptors e Pipes

Este documento mostra a ordem aproximada de processamento de uma requisição
HTTP no NestJS.

## 1. Fluxo visual

```text
Request
  -> Middleware
  -> Guards
  -> Interceptors antes
  -> Pipes
  -> Controller
  -> Service
  -> Interceptors depois
  -> Exception Filters
  -> Response
```

O service não é uma etapa HTTP própria do framework; ele é chamado pelo
controller durante a execução do handler.

## 2. Middleware

Executa cedo e recebe objetos do adaptador HTTP:

```typescript
(request, response, next) => {
  request.requestId = randomUUID();
  next();
}
```

Use para request id, logging inicial e preparação genérica.

## 3. Guards

Decidem se a request pode continuar:

```typescript
canActivate(context: ExecutionContext) {
  return Boolean(context.switchToHttp().getRequest().user);
}
```

Use para autenticação e autorização.

## 4. Interceptors antes

O código antes de `next.handle()` roda antes do handler:

```typescript
intercept(context: ExecutionContext, next: CallHandler) {
  const startedAt = Date.now();
  return next.handle().pipe(
    tap(() => console.log(Date.now() - startedAt)),
  );
}
```

## 5. Pipes

Validam e transformam argumentos:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}
```

Se falharem, o controller não é executado.

## 6. Controller e service

Depois de passar pelos guards, interceptors e pipes:

```text
Controller -> Service -> Repository -> Database
```

O controller recebe dados já extraídos e transformados.

## 7. Interceptors depois

O resultado retorna pelo Observable do interceptor. Nesse momento pode ser
medido, transformado ou acompanhado.

```typescript
return next.handle().pipe(
  map((data) => ({ data })),
);
```

## 8. Exception Filters

Se qualquer etapa lançar uma exception, o filtro pode convertê-la em resposta.

```text
Exception -> Filter -> JSON HTTP
```

Filtros não substituem validação nem autorização.

## 9. Exemplo completo

```typescript
// Middleware: cria request id
// Guard: verifica JWT
// Interceptor: inicia cronômetro
// Pipe: converte id
// Controller: chama service
// Service: consulta banco
// Interceptor: registra duração
// Filter: trata eventual erro
```

## 10. Cuidados

- Não coloque regra de negócio em middleware.
- Não use interceptor como substituto de guard.
- Não faça autorização apenas em pipe.
- Não esconda exceptions do filtro.
- Não transforme respostas sem compatibilidade definida.

## 11. Resumo por responsabilidade

| Etapa | Pergunta respondida |
| --- | --- |
| Middleware | O que preparar antes da aplicação? |
| Guard | Pode acessar esta rota? |
| Interceptor | O que fazer ao redor do handler? |
| Pipe | O dado é válido e está no formato certo? |
| Controller | Qual operação HTTP foi solicitada? |
| Service | Qual regra de negócio executar? |
| Filter | Como representar o erro? |
