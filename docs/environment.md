# Variáveis de ambiente

Este guia explica as variáveis usadas pelo projeto, as diferenças entre execução
local e Docker e os cuidados necessários com credenciais.

## 1. O que é ambiente

Ambiente é o conjunto de configurações externas ao código que muda conforme o
local de execução.

Exemplos:

- Desenvolvimento local.
- Testes automatizados.
- Homologação.
- Produção.
- Container Docker.

Credenciais, portas e URLs não devem ficar fixas no código-fonte. Use variáveis
de ambiente para configurar cada execução sem alterar a aplicação.

## 2. Variáveis do projeto

O arquivo `.env.example` possui:

```env
DATABASE_URL="mysql://app:app@localhost:3307/appdb"
PORT=3001
```

### `DATABASE_URL`

Define a conexão com o MariaDB:

```text
mysql://usuario:senha@host:porta/banco
```

Valor local:

```env
DATABASE_URL="mysql://app:app@localhost:3307/appdb"
```

### `PORT`

Define a porta HTTP da API:

```env
PORT=3001
```

O código usa `3000` como fallback quando `PORT` não estiver definida:

```typescript
await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
```

## 3. `.env.example` e `.env`

`.env.example` é um modelo sem segredos reais. Ele deve ser versionado para
orientar a configuração.

`.env` é o arquivo usado localmente. Ele pode conter credenciais e não deve ser
versionado.

Fluxo recomendado:

```bash
cp .env.example .env
```

Depois ajuste os valores para sua máquina.

O `.gitignore` deste projeto já ignora:

```text
.env
```

## 4. Como o NestJS lê as variáveis

O `AppModule` importa:

```typescript
ConfigModule.forRoot()
```

Isso carrega variáveis do ambiente e do arquivo `.env` para `process.env`.

O TypeORM lê:

```typescript
url: process.env.DATABASE_URL
```

E o bootstrap lê:

```typescript
process.env.PORT ?? 3000
```

A variável do sistema normalmente tem prioridade operacional sobre um valor
escrito no arquivo local, dependendo da configuração e da forma de inicialização.

## 5. Ambiente local

Quando a API roda diretamente no host:

```env
DATABASE_URL="mysql://app:app@localhost:3307/appdb"
PORT=3001
```

Inicie o banco:

```bash
npm run db:up
```

Inicie a API:

```bash
npm run start:dev
```

Endereços:

| Serviço | Endereço |
| --- | --- |
| API | `http://localhost:3001` |
| MariaDB | `localhost:3307` |

O mapeamento `3307:3306` significa que a máquina usa `3307`, enquanto o
container continua ouvindo em `3306`.

## 6. Ambiente Docker Compose

No serviço `api`, o Compose define:

```yaml
environment:
  DATABASE_URL: mysql://app:app@db:3306/appdb
  PORT: 3000
```

Endereços:

| Serviço | Endereço para o host |
| --- | --- |
| API | `http://localhost:3000` |
| MariaDB | `localhost:3307` |

A API, dentro da rede Compose, acessa o banco por:

```text
mysql://app:app@db:3306/appdb
```

`db` é o nome de serviço resolvido pelo DNS interno do Compose.

Inicie tudo:

```bash
docker compose -f compose.yml up --build
```

## 7. Diferença entre host e container

| Situação | Host do banco | Porta do banco | Porta da API |
| --- | --- | --- | --- |
| API no host | `localhost` | `3307` | `3001` |
| API no Compose | `db` | `3306` | `3000` |

Erro comum:

```env
DATABASE_URL="mysql://app:app@localhost:3306/appdb"
```

Essa URL só funciona se houver um banco ouvindo em `3306` no host. Para o
Compose deste projeto, use `localhost:3307` fora do Docker.

Outro erro comum é usar `db:3306` em uma API executada diretamente no host. O
nome `db` só é resolvido dentro da rede Compose.

## 8. Variáveis obrigatórias

Atualmente, as variáveis importantes são:

| Variável | Obrigatória | Fallback | Uso |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sim na prática | Nenhum | Conexão TypeORM |
| `PORT` | Não | `3000` | Porta HTTP |

Sem `DATABASE_URL`, o TypeORM não possui uma conexão válida e a aplicação pode
falhar ao iniciar ou ao executar consultas.

## 9. Boas práticas para credenciais

- Nunca versione `.env`.
- Nunca coloque senhas no README.
- Não envie credenciais em logs.
- Use segredos do ambiente de deploy em produção.
- Troque as credenciais padrão do Compose fora do ambiente local.
- Use usuários com permissões mínimas.
- Não reutilize senha de desenvolvimento em produção.
- Evite passar senha diretamente na linha de comando.
- Rotacione credenciais expostas.
- Verifique o diff antes de commitar arquivos de configuração.

Os valores `app/app` e `root/root` no Compose são adequados apenas para o
ambiente local de demonstração.

## 10. Portas usadas

O projeto usa:

```text
3000: API dentro/fora do Compose
3001: API local conforme .env.example
3307: MariaDB publicado no host
3306: MariaDB dentro do container
```

A porta externa pode ser alterada, desde que a `DATABASE_URL` seja atualizada.

Para verificar portas ocupadas:

```bash
ss -ltnp | grep -E ':3000|:3001|:3306|:3307'
```

## 11. Ambientes adicionais

Para teste, use um banco separado:

```env
DATABASE_URL="mysql://test:test@localhost:3308/appdb_test"
PORT=3100
```

Para produção, injete variáveis pelo provedor de deploy:

```text
DATABASE_URL=<secret do ambiente>
PORT=3000
NODE_ENV=production
```

`NODE_ENV` ainda não é usado explicitamente pelo código atual, mas é uma
convenção comum para bibliotecas e pipelines.

## 12. Validação de configuração

Não deixe a aplicação iniciar com configuração claramente ausente.

Uma validação simples:

```typescript
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL não foi definida');
}
```

Para projetos maiores, use schema de configuração com validação. O objetivo é
falhar cedo e informar qual variável está ausente, sem imprimir a senha.

## 13. Problemas comuns

### `.env` não é carregado

Confirme:

- O arquivo está na raiz do projeto.
- O comando foi executado na raiz.
- `ConfigModule.forRoot()` está importado.
- A variável está escrita corretamente.

### A API não conecta ao banco

Verifique a combinação:

```text
API local  -> localhost:3307
API Docker -> db:3306
```

Também confirme se o banco está saudável:

```bash
docker compose ps
docker compose logs db
```

### Alterei o `.env`, mas nada mudou

Reinicie a API. Variáveis são lidas durante a inicialização do processo.

### Porta já está em uso

Altere `PORT` no `.env` para execução local ou o mapeamento do Compose. Reinicie
o serviço depois da alteração.

## 14. Checklist

- [ ] `.env.example` está atualizado.
- [ ] `.env` não está versionado.
- [ ] `DATABASE_URL` usa host correto.
- [ ] `PORT` corresponde ao modo de execução.
- [ ] Credenciais locais não são usadas em produção.
- [ ] Banco de teste é separado do banco de desenvolvimento.
- [ ] Variáveis obrigatórias são validadas.
- [ ] Logs não exibem segredos.
- [ ] Portas não estão em conflito.
