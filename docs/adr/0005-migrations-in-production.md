# ADR 0005: Usar migrations em produção

## Status

Aceita.

## Contexto

Alterações automáticas de schema durante o boot podem causar risco de perda e
incompatibilidade.

## Decisão

Usar migrations TypeORM controladas em produção e manter `synchronize: false`.

## Consequências

Deploys precisam aplicar migrations em etapa explícita, revisar compatibilidade
e manter estratégia de rollback e backup.
