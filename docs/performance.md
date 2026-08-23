# Performance

Guia para manter API e banco eficientes conforme o volume cresce.

## 1. Estado atual

A API lista todos os usuários com ordenação por `createdAt`. Isso é suficiente
para poucos registros, mas precisa de paginação em produção.

## 2. Paginação

```typescript
const [data, total] = await repository.findAndCount({
  skip: (page - 1) * limit,
  take: limit,
  order: { createdAt: 'DESC' },
});
```

Defina limites máximos, como `100`, para evitar requests muito grandes.

## 3. Índices

Índices devem atender consultas reais. `email` já possui unicidade. Para filtros
por nome ou data, meça antes de adicionar índices.

Índices aceleram leitura, mas aumentam custo de escrita e armazenamento.

## 4. Seleção de colunas

Retorne somente o necessário:

```typescript
repository.find({
  select: { id: true, name: true, email: true },
});
```

Isso reduz payload e exposição de dados.

## 5. Consultas

Evite:

- N+1 queries.
- `SELECT *` sem necessidade.
- QueryBuilder com SQL concatenado.
- Busca sem limite.
- Ordenação sem índice quando a tabela for grande.

Use parâmetros nomeados e avalie planos de execução.

## 6. Banco

Monitore:

- Conexões abertas.
- Queries lentas.
- CPU e memória.
- Espaço em disco.
- Locks.
- Latência.

Configure pool de conexões conforme o ambiente e a capacidade do MariaDB.

## 7. API

Meça:

- Latência p50, p95 e p99.
- Taxa de erro.
- Requests por segundo.
- Tamanho de response.
- Tempo de consulta.

Interceptors podem medir duração, mas métricas são melhores para tendências.

## 8. Cache

Cache só deve ser adicionado após identificar leitura repetida. Defina:

- Chave.
- TTL.
- Invalidação.
- Consistência aceitável.
- Comportamento quando o cache falha.

Não cacheie dados pessoais sem controle de isolamento.

## 9. Containers

- Use imagem runtime menor.
- Limite CPU e memória.
- Evite logs excessivos.
- Monitore reinícios.
- Use healthcheck.

## 10. Checklist

- [ ] Listagens possuem paginação.
- [ ] Limites máximos estão definidos.
- [ ] Queries são medidas.
- [ ] Índices são justificados.
- [ ] Payloads não carregam dados desnecessários.
- [ ] Latência e erros são monitorados.
- [ ] Cache possui invalidação definida.
- [ ] Banco possui capacidade adequada.
