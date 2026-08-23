# Runbook operacional

Procedimentos para executar, verificar e manter o projeto.

## 1. Iniciar desenvolvimento

```bash
npm install
cp .env.example .env
npm run db:up
npm run start:dev
```

API local: `http://localhost:3001`.

## 2. Verificar funcionamento

```bash
curl http://localhost:3001/users
```

Verifique banco e logs:

```bash
docker compose ps
docker compose logs --tail=100 db
```

A API ainda não possui `/health`; consulte [health-check.md](health-check.md)
para a implementação planejada.

## 3. Iniciar com Docker

```bash
docker compose -f compose.yml up -d --build
docker compose ps
curl http://localhost:3000/users
```

## 4. Parar serviços

```bash
docker compose down
```

Não use `-v` em uma parada normal.

## 5. Logs

```bash
docker compose logs -f api
docker compose logs -f db
docker compose logs --tail=200 api db
```

Consulte [logging.md](logging.md).

## 6. Backup

```bash
mariadb-dump -h 127.0.0.1 -P 3307 -u app -p appdb > backup.sql
```

Guarde o backup em local protegido e independente do volume.

## 7. Restauração

```bash
mariadb -h 127.0.0.1 -P 3307 -u app -p appdb < backup.sql
```

Valide a contagem:

```bash
mysql -h 127.0.0.1 -P 3307 -u app -p appdb \
  -e 'SELECT COUNT(*) FROM users;'
```

## 8. Migrations

O projeto ainda não possui DataSource TypeORM nem scripts de migration. Quando
configurados:

```bash
npm run migration:show
npm run migration:run
```

Nunca altere schema de produção manualmente sem registrar a mudança.

## 9. Incidente de conexão

1. Verifique `docker compose ps`.
2. Consulte logs do banco.
3. Confirme `DATABASE_URL`.
4. Confirme portas e DNS.
5. Verifique espaço em disco.
6. Não remova volume antes de fazer backup.

## 10. Rollback

1. Pare o tráfego para a versão problemática.
2. Use a imagem anterior por tag imutável.
3. Verifique compatibilidade do schema.
4. Restaure backup somente com aprovação.
5. Monitore logs e requests depois do retorno.

## 11. Checklist pós-deploy

- [ ] Container está running.
- [ ] Readiness está saudável.
- [ ] API responde.
- [ ] Banco aceita consultas.
- [ ] Migrations foram aplicadas.
- [ ] Logs não possuem erros contínuos.
- [ ] Backup recente existe.
- [ ] Métricas estão normais.
