# Documentação do projeto

Este diretório reúne a documentação da API NestJS com TypeORM, MariaDB e Docker.

## Índice por nível

### Básico

- [Entity](entity.md): criação e configuração de entidades TypeORM.
- [Controller](controller.md): criação de rotas e recebimento de requisições.
- [Service](service.md): regras de negócio e acesso a repositories.
- [Module](module.md): organização de controllers, services e dependências.
- [DTO](dto.md): contratos de entrada, validação e separação entre API e banco.
- [API](api.md): endpoints disponíveis, requests, responses e erros.

### Intermediário

- [Architecture](architecture.md): camadas, fluxo e dependências da aplicação.
- [Database](database.md): MariaDB, TypeORM, consultas e backups.
- [Environment](environment.md): variáveis, portas e credenciais.
- [Setup](setup.md): pré-requisitos, instalação e execução local ou via Docker.
- [Guards](guards.md): autenticação, autorização e controle de acesso.
- [Middleware](middleware.md): preparação de requests, logs e request id.
- [Pipes](pipes.md): validação e transformação de dados.
- [Interceptors](interceptors.md): execução antes/depois e transformação de respostas.
- [Filters](filters.md): captura e padronização de exceptions.
- [Decorators](decorators.md): decorators nativos e customizados.
- [HTTP lifecycle](http-lifecycle.md): ciclo completo de uma requisição.
- [Interceptors and pipes flow](interceptors-and-pipes-flow.md): visão visual do fluxo.
- [Custom providers](custom-providers.md): tokens, factories e mocks.
- [Error handling](error-handling.md): exceptions e respostas padronizadas.
- [Logging](logging.md): logs, níveis, Docker e rastreamento de erros.

### Produção

- [Authentication](authentication.md): login, JWT, guards e permissões.
- [Security](security.md): validação, CORS, rate limiting e proteção de dados.
- [Migrations](migrations.md): evolução controlada do esquema do banco.
- [Deployment](deployment.md): build, deploy, healthcheck e migrations.
- [Health check](health-check.md): liveness, readiness e dependências.
- [Performance](performance.md): paginação, consultas, índices e métricas.
- [Privacy](privacy.md): proteção, retenção e exposição de dados pessoais.
- [OpenAPI](openapi.md): contrato e documentação Swagger.
- [API versioning](api-versioning.md): evolução compatível dos endpoints.

### Qualidade

- [Testing](testing.md): testes unitários, testes de controller e integração.
- [Testing guards and middleware](testing-guards-middleware.md): testes dos componentes HTTP.
- [Contributing](contributing.md): código, branches, commits e pull requests.
- [Release](release.md): validação e processo de entrega.

### Operação e governança

- [Troubleshooting](troubleshooting.md): diagnóstico de falhas comuns.
- [Runbook](runbook.md): procedimentos de operação e incidentes.
- [Glossary](glossary.md): termos NestJS, TypeORM e Docker.
- [ADR 0001: NestJS](adr/0001-use-nestjs.md)
- [ADR 0002: TypeORM](adr/0002-use-typeorm.md)
- [ADR 0003: MariaDB](adr/0003-use-mariadb.md)
- [ADR 0004: Docker Compose](adr/0004-use-docker-compose.md)
- [ADR 0005: Migrations](adr/0005-migrations-in-production.md)

## Visão geral

O projeto expõe uma API simples de usuários:

```text
Cliente HTTP
    -> UsersController
    -> UsersService
    -> Repository<User>
    -> MariaDB
```

Os endpoints atuais são:

| Método | URL | Descrição |
| --- | --- | --- |
| `GET` | `/users` | Lista usuários |
| `POST` | `/users` | Cria um usuário |

## Como instalar rapidamente

```bash
npm install
cp .env.example .env
npm run db:up
npm run start:dev
```

Na execução local, a API fica na porta `3001` e o MariaDB na porta `3307`.

Para executar API e banco juntos com Docker:

```bash
docker compose -f compose.yml up --build
```

Nesse caso, a API fica disponível em `http://localhost:3000`.

## Exemplos rápidos

Listar usuários:

```bash
curl http://localhost:3001/users
```

Criar usuário:

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

## Estrutura do projeto

```text
modern-nest/
├── compose.yml             # Serviços Docker: API e MariaDB
├── Dockerfile              # Imagem de build e execução da API
├── package.json            # Dependências e scripts npm
├── .env.example            # Modelo de variáveis locais
├── prisma/                 # Diretório legado/vazio; a aplicação usa TypeORM
├── src/
│   ├── app.module.ts       # Módulo-raiz
│   ├── main.ts             # Inicialização do servidor
│   └── users/
│       ├── user.entity.ts  # Mapeamento da tabela users
│       ├── users.controller.ts
│       ├── users.module.ts
│       └── users.service.ts
└── docs/                   # Guias deste projeto
```

## Scripts disponíveis

Os scripts atuais estão no `package.json`:

```bash
npm run build       # Compila TypeScript
npm start           # Executa dist/main.js
npm run start:dev   # Executa em modo watch
npm run db:up       # Sobe somente o banco
```

Testes automatizados ainda não possuem script configurado. Consulte
[testing.md](testing.md) para a configuração recomendada.
