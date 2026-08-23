# Configuração do ambiente

Este guia mostra como preparar e executar o projeto NestJS com MariaDB.

## 1. Pré-requisitos

Instale:

- Node.js 22 ou versão compatível.
- npm, incluído na instalação do Node.js.
- Docker Engine.
- Docker Compose v2, normalmente disponível como `docker compose`.
- Git, caso o projeto seja obtido de um repositório.

Confirme as versões:

```bash
node --version
npm --version
docker --version
docker compose version
```

## 2. Instalação do Node.js

### Linux com gerenciador de versões

Uma opção é usar `nvm` e instalar a versão 22:

```bash
nvm install 22
nvm use 22
nvm alias default 22
```

Confirme:

```bash
node --version
```

O projeto usa recursos modernos do Node.js e deve ser executado com uma versão
compatível com o `Dockerfile`, que utiliza Node 22 Alpine.

### Instalação pelo site oficial

Também é possível instalar uma versão LTS do Node.js pelo site oficial do
Node.js. Depois da instalação, abra um novo terminal e confirme `node` e `npm`.

## 3. Instalação do Docker

No Linux, instale Docker Engine e o plugin Compose usando o método recomendado
pela distribuição ou pela documentação oficial do Docker.

Depois, confirme se o daemon está disponível:

```bash
docker info
docker compose version
```

Se o usuário não tiver permissão para usar Docker sem `sudo`, ajuste o grupo do
sistema conforme a política da máquina e abra uma nova sessão. Não coloque
senhas ou tokens nos arquivos do projeto.

## 4. Instale as dependências

Na raiz do projeto:

```bash
npm install
```

O comando instala NestJS, TypeORM, o driver `mysql2` e as ferramentas do
compilador TypeScript.

## 5. Configure o `.env`

Copie o modelo:

```bash
cp .env.example .env
```

Para execução local, use:

```env
DATABASE_URL="mysql://app:app@localhost:3307/appdb"
PORT=3001
```

`localhost:3307` aponta para a porta do MariaDB publicada pelo Docker Compose.

O arquivo `.env` não deve ser versionado. Ele está listado no `.gitignore`.

## 6. Execute somente o banco

Suba o MariaDB:

```bash
npm run db:up
```

Ou:

```bash
docker compose -f compose.yml up -d db
```

Verifique o estado:

```bash
docker compose ps
```

O healthcheck aguarda conexão e inicialização do InnoDB.

## 7. Execute a API localmente

Com o banco pronto:

```bash
npm run start:dev
```

A aplicação lerá `PORT=3001` e ficará em:

```text
http://localhost:3001
```

Teste:

```bash
curl http://localhost:3001/users
```

## 8. Execute tudo com Docker

Para construir a imagem e iniciar API e banco:

```bash
docker compose -f compose.yml up --build
```

A API estará em:

```text
http://localhost:3000
```

Dentro da rede Docker, a API usa `db:3306` como endereço do banco. Não troque
esse host por `localhost`, pois `localhost` dentro do container aponta para o
próprio container da API.

## 9. Pare os serviços

Se os serviços estiverem em primeiro plano, pressione `Ctrl+C`.

Para parar e remover containers:

```bash
docker compose -f compose.yml down
```

Para remover também o volume e apagar os dados locais:

```bash
docker compose -f compose.yml down -v
```

Use `down -v` somente quando realmente quiser excluir o banco local.

## 10. Problemas comuns

### `DATABASE_URL` não funciona

Confira se:

- A variável está escrita exatamente como `DATABASE_URL`.
- O banco local usa `localhost:3307`.
- A API em Compose usa `db:3306`.
- Usuário, senha e banco são `app`, `app` e `appdb`.

### Porta ocupada

Verifique processos usando as portas:

```bash
ss -ltnp | grep -E ':3000|:3001|:3307'
```

Altere `PORT` para a API local ou ajuste o mapeamento no Compose. A porta
interna do MariaDB permanece `3306`.

### Container do banco não fica saudável

Veja os logs:

```bash
docker compose logs db
```

Confira o status:

```bash
docker compose ps
```

Se o volume tiver sido inicializado com outras credenciais, recrie-o:

```bash
docker compose down -v
npm run db:up
```

### Docker não está disponível

Se `docker info` falhar, o daemon pode estar parado ou o usuário pode não ter
permissão. Corrija o serviço Docker ou as permissões antes de iniciar o Compose.

### `npm install` falha

Verifique a versão do Node, a conexão de rede e se o `package-lock.json` está
presente. Em uma instalação limpa, remova apenas dependências geradas e tente
novamente:

```bash
rm -rf node_modules
npm install
```

### A API inicia, mas o banco recusa conexão

O banco pode ainda estar inicializando. Aguarde o healthcheck e consulte os
logs. Em execução local, suba o banco antes de executar `npm run start:dev`.

## 11. Verificação final

Execute:

```bash
npm run build
curl http://localhost:3001/users
```

Se estiver usando Compose completo, troque `3001` por `3000`.
