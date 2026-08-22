# NestJS + TypeORM + MariaDB + Docker

## Subir com Docker

```bash
docker compose -f compose.yml up --build
```

A API ficará disponível em `http://localhost:3000` quando executada com Docker.

## Endpoints

```bash
curl http://localhost:3000/users
curl -X POST http://localhost:3000/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

Os dados do MariaDB ficam no volume Docker `mariadb_data`.

## Desenvolvimento local

```bash
cp .env.example .env
npm install
npm run db:up
npm run start:dev
```

No desenvolvimento local, a API fica disponível em `http://localhost:3001` e o
banco em `localhost:3307`. Se o volume já tiver sido criado com outras
credenciais, recrie-o antes de subir o banco:

```bash
docker compose down -v
npm run db:up
```

Para parar os serviços:

```bash
docker compose -f compose.yml down
```
