# Troubleshooting

Guia rápido para diagnosticar problemas comuns no projeto.

## 1. Diagnóstico inicial

Execute na raiz:

```bash
node --version
npm --version
docker --version
docker compose version
git status --short
```

Verifique serviços:

```bash
docker compose ps
docker compose logs --tail=100 db api
```

Confirme que existe `.env` local e que ele não está sendo versionado.

## 2. Falha no `npm install`

Confira a versão do Node e a rede. O projeto usa Node 22 no Docker.

Tente uma instalação limpa apenas se puder recriar dependências:

```bash
rm -rf node_modules
npm install
```

Preserve o `package-lock.json` para instalações reproduzíveis.

## 3. Falha no build

Execute:

```bash
npm run build
```

Verifique imports, decorators e o `tsconfig.json`. O build compila somente
`src/`; exemplos Markdown não são compilados.

## 4. MariaDB não inicia

```bash
docker compose up -d db
docker compose ps
docker compose logs db
```

Aguarde o healthcheck. Se o volume foi criado com credenciais diferentes:

```bash
docker compose down -v
npm run db:up
```

Esse comando apaga os dados locais.

## 5. Erro de conexão

Use a URL correta para o modo de execução:

```text
API local:  mysql://app:app@localhost:3307/appdb
API Docker: mysql://app:app@db:3306/appdb
```

Dentro do container, `localhost` não aponta para o MariaDB.

## 6. Porta ocupada

```bash
ss -ltnp | grep -E ':3000|:3001|:3307'
```

A API local usa `PORT=3001`; a API Compose usa `3000`; o MariaDB é publicado
em `3307`.

## 7. Rota retorna 404

Confirme prefixo, método HTTP e módulo:

```text
GET /users
POST /users
```

Verifique se `UsersController` está em `controllers` e `UsersModule` está em
`AppModule.imports`.

## 8. Erro de repository

Confirme:

```typescript
imports: [TypeOrmModule.forFeature([User])]
providers: [UsersService]
```

E no service:

```typescript
@InjectRepository(User)
private readonly usersRepository: Repository<User>
```

## 9. Dados antigos ou schema incorreto

O volume mantém dados entre reinícios. Consulte:

```bash
docker volume ls
docker compose down -v
```

Não use `down -v` em dados que precisam ser preservados.

## 10. Logs úteis

```bash
docker compose logs -f api
docker compose logs -f db
docker compose ps
```

Não compartilhe logs contendo senhas, tokens ou dados pessoais.

## 11. Checklist

- [ ] Versões conferidas.
- [ ] Banco saudável.
- [ ] URL correta para host/container.
- [ ] Portas livres.
- [ ] `.env` presente.
- [ ] Logs consultados.
- [ ] Volume preservado antes de removê-lo.
- [ ] Build executado.
