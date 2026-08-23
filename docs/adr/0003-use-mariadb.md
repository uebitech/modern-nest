# ADR 0003: Usar MariaDB

## Status

Aceita.

## Contexto

O projeto precisa de persistência relacional local, reproduzível e compatível
com o driver MySQL usado pelo TypeORM.

## Decisão

Usar MariaDB 11 em container Docker.

## Consequências

O desenvolvimento usa volume nomeado e a URL muda entre host e rede Compose.
Backups e monitoramento são necessários em ambientes persistentes.
