# ADR 0002: Usar TypeORM

## Status

Aceita.

## Contexto

A aplicação precisa mapear entities TypeScript para um banco relacional.

## Decisão

Usar TypeORM integrado por `@nestjs/typeorm`.

## Consequências

Repositories são injetados nos services. O schema deve evoluir com migrations
antes de produção; `synchronize` fica restrito a desenvolvimento controlado.
