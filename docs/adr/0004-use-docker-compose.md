# ADR 0004: Usar Docker Compose

## Status

Aceita.

## Contexto

API e banco precisam iniciar com configuração previsível no desenvolvimento.

## Decisão

Usar `compose.yml` para definir API, MariaDB, healthcheck e volume.

## Consequências

O banco é acessado por `localhost:3307` no host e `db:3306` entre containers.
Produção pode exigir orquestrador, secrets e armazenamento mais robusto.
