# Banco de dados

Este guia explica como o projeto se conecta ao MariaDB, como o TypeORM mapeia
entities e repositories, como executar consultas e como fazer backup e
restauração dos dados.

## 1. Arquitetura do banco

O projeto usa:

- **MariaDB 11** como banco relacional.
- **TypeORM** como ORM.
- **mysql2** como driver Node.js.
- **Docker Compose** para executar o banco localmente.

O fluxo de acesso é:

```text
UsersService
    -> Repository<User>
    -> TypeORM
    -> mysql2
    -> MariaDB
```

A aplicação não monta SQL diretamente no `UsersController`. O service usa o
repository fornecido pelo TypeORM.

## 2. Configuração do MariaDB com Docker

O serviço `db` está definido no `compose.yml`:

```yaml
services:
  db:
    image: docker.io/library/mariadb:11
    environment:
      MARIADB_DATABASE: appdb
      MARIADB_USER: app
      MARIADB_PASSWORD: app
      MARIADB_ROOT_PASSWORD: root
    ports:
      - "3307:3306"
    volumes:
      - mariadb_data:/var/lib/mysql
```

A configuração significa:

| Configuração | Valor | Finalidade |
| --- | --- | --- |
| Imagem | `mariadb:11` | Versão do servidor |
| Banco | `appdb` | Banco inicial |
| Usuário | `app` | Usuário da aplicação |
| Senha | `app` | Senha local do usuário |
| Porta externa | `3307` | Porta na máquina hospedeira |
| Porta interna | `3306` | Porta dentro do container |
| Volume | `mariadb_data` | Persistência dos dados |

Inicie somente o banco:

```bash
npm run db:up
```

Verifique o container:

```bash
docker compose ps
docker compose logs db
```

## 3. `DATABASE_URL`

A aplicação lê a conexão pela variável `DATABASE_URL`.

Formato geral:

```text
mysql://USUARIO:SENHA@HOST:PORTA/BANCO
```

No desenvolvimento local:

```env
DATABASE_URL="mysql://app:app@localhost:3307/appdb"
```

No Docker Compose:

```env
DATABASE_URL="mysql://app:app@db:3306/appdb"
```

A diferença de host é importante:

- Fora do Docker, a aplicação usa `localhost` e a porta publicada `3307`.
- Dentro do Docker, a aplicação usa o nome do serviço `db` e a porta interna
  `3306`.

Dentro do container, `localhost` significa o próprio container da API, não o
container do MariaDB.

## 4. Configuração do TypeORM

No `AppModule`, o projeto configura o TypeORM assim:

```typescript
TypeOrmModule.forRoot({
  type: 'mysql',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: true,
})
```

### `type`

Indica o tipo de banco compatível com o driver:

```typescript
type: 'mysql'
```

O driver `mysql2` é compatível com MySQL e MariaDB.

### `url`

Lê a URL completa de conexão do ambiente:

```typescript
url: process.env.DATABASE_URL
```

A URL contém credenciais, host, porta e nome do banco.

### `autoLoadEntities`

```typescript
autoLoadEntities: true
```

Faz o NestJS carregar as entities registradas pelos módulos funcionais com
`TypeOrmModule.forFeature`.

### `synchronize`

```typescript
synchronize: true
```

Sincroniza o esquema do banco com as classes TypeORM ao iniciar.

É conveniente durante um exemplo local, mas deve ser desativado em produção.
Para produção, use migrations versionadas. Consulte [migrations.md](migrations.md).

## 5. Entity `User`

A entity atual representa a tabela `users`:

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
```

Mapeamento:

| Propriedade | Coluna | Comportamento |
| --- | --- | --- |
| `id` | `id` | Chave primária automática |
| `name` | `name` | Texto obrigatório |
| `email` | `email` | Texto com unicidade |
| `createdAt` | `createdAt` | Data automática de criação |

A entity descreve o modelo persistido. Ela não define sozinha as rotas da API.

## 6. Repository

O repository é a interface usada para consultar e alterar a tabela.

No módulo:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
```

No service:

```typescript
constructor(
  @InjectRepository(User)
  private readonly usersRepository: Repository<User>,
) {}
```

A sequência é:

1. `User` é declarada como entity.
2. `forFeature([User])` registra seu repository.
3. `@InjectRepository(User)` solicita o repository.
4. O NestJS injeta o repository no service.

## 7. Consultas de leitura

O método atual lista os usuários:

```typescript
findAll() {
  return this.usersRepository.find({
    order: { createdAt: 'DESC' },
  });
}
```

Isso equivale conceitualmente a:

```sql
SELECT * FROM users ORDER BY createdAt DESC;
```

### Buscar por id

```typescript
findOne(id: number) {
  return this.usersRepository.findOneBy({ id });
}
```

Conceitualmente:

```sql
SELECT * FROM users WHERE id = ? LIMIT 1;
```

### Buscar por e-mail

```typescript
findByEmail(email: string) {
  return this.usersRepository.findOneBy({ email });
}
```

### Selecionar colunas

Quando não precisar de todos os campos:

```typescript
return this.usersRepository.find({
  select: {
    id: true,
    name: true,
    email: true,
  },
});
```

Selecionar somente o necessário reduz dados transferidos e ajuda a evitar
exposição acidental de campos internos.

## 8. Inserir dados

O service atual cria e salva um usuário:

```typescript
create(name: string, email: string) {
  const user = this.usersRepository.create({ name, email });
  return this.usersRepository.save(user);
}
```

`create` monta o objeto em memória. `save` executa a persistência.

A entity gera `id` e `createdAt`; o cliente não precisa enviá-los.

## 9. Atualizar dados

Atualização carregando a entity:

```typescript
async update(id: number, name: string) {
  const user = await this.usersRepository.findOneBy({ id });

  if (!user) {
    throw new NotFoundException('Usuário não encontrado');
  }

  user.name = name;
  return this.usersRepository.save(user);
}
```

Atualização direta:

```typescript
return this.usersRepository.update(id, { name });
```

Use a primeira forma quando precisar validar o registro ou aplicar lógica antes
de salvar. Use a segunda quando uma alteração direta for suficiente.

## 10. Remover dados

Remover uma entity carregada:

```typescript
const user = await this.usersRepository.findOneBy({ id });

if (!user) {
  throw new NotFoundException('Usuário não encontrado');
}

await this.usersRepository.remove(user);
```

Remover diretamente pelo id:

```typescript
await this.usersRepository.delete(id);
```

Defina explicitamente se remover um id inexistente deve ser erro ou operação
idempotente.

## 11. QueryBuilder

Para consultas simples, os métodos do repository são suficientes. Para filtros
complexos, use `QueryBuilder`:

```typescript
return this.usersRepository
  .createQueryBuilder('user')
  .where('user.name LIKE :name', { name: `%${name}%` })
  .orderBy('user.createdAt', 'DESC')
  .getMany();
```

Sempre use parâmetros nomeados. Evite concatenar entrada do usuário no SQL:

```typescript
// Evite:
.where(`user.name = '${name}'`)
```

Parâmetros ajudam a prevenir injeção de SQL.

## 12. Volume Docker

O volume no Compose é:

```yaml
volumes:
  - mariadb_data:/var/lib/mysql
```

`/var/lib/mysql` é o diretório de dados dentro do container MariaDB. O volume
nomeado faz os dados sobreviverem à remoção do container.

Liste volumes:

```bash
docker volume ls
```

Inspecione:

```bash
docker volume inspect modern-nest_mariadb_data
```

O nome pode variar conforme o nome do projeto Compose.

Remova containers sem apagar dados:

```bash
docker compose down
```

Remova containers e dados:

```bash
docker compose down -v
```

O segundo comando é destrutivo para o ambiente local.

## 13. Backup

Faça backup lógico usando `mariadb-dump` ou `mysqldump`.

Se o cliente estiver instalado na máquina:

```bash
mariadb-dump \
  -h 127.0.0.1 \
  -P 3307 \
  -u app \
  -p \
  appdb > backup.sql
```

Alternativa:

```bash
mysqldump \
  -h 127.0.0.1 \
  -P 3307 \
  -u app \
  -p \
  appdb > backup.sql
```

Digite a senha quando solicitado. Não coloque a senha diretamente no comando
nem versione `backup.sql` se ele contiver dados reais.

### Backup a partir do container

Descubra o nome do container:

```bash
docker compose ps
```

Execute o dump dentro do serviço:

```bash
docker compose exec db mariadb-dump \
  -u app \
  -papp \
  appdb > backup.sql
```

Evite essa forma em ambientes compartilhados porque a senha aparece no comando.
Prefira um prompt seguro quando possível.

### Verifique o backup

Confira se o arquivo existe e possui conteúdo:

```bash
ls -lh backup.sql
head -n 20 backup.sql
```

Um backup válido deve conter instruções de criação e inserção ou estrutura
compatível com o modo de dump escolhido.

## 14. Restauração

Crie o banco vazio ou confirme que ele existe. Depois restaure:

```bash
mariadb \
  -h 127.0.0.1 \
  -P 3307 \
  -u app \
  -p \
  appdb < backup.sql
```

Alternativa com `mysql`:

```bash
mysql \
  -h 127.0.0.1 \
  -P 3307 \
  -u app \
  -p \
  appdb < backup.sql
```

Depois verifique:

```bash
mysql -h 127.0.0.1 -P 3307 -u app -p appdb \
  -e 'SELECT COUNT(*) AS total FROM users;'
```

### Restaurar limpando o ambiente local

Para apagar o volume e criar o banco novamente:

```bash
docker compose down -v
docker compose up -d db
```

Depois importe o backup. Não use esse fluxo sem confirmar que os dados antigos
podem ser descartados.

## 15. Boas práticas

- Não versione senhas ou backups com dados reais.
- Use credenciais diferentes em desenvolvimento, teste e produção.
- Não use `synchronize: true` em produção.
- Faça migrations para mudanças de esquema.
- Faça backups testados, não apenas arquivos nunca restaurados.
- Monitore espaço e saúde do banco.
- Use parâmetros em consultas dinâmicas.
- Adicione índices apenas para consultas justificadas.
- Evite retornar dados sensíveis pela API.
- Use transações quando uma operação altera várias tabelas.

## 16. Checklist

- [ ] MariaDB está ativo.
- [ ] `DATABASE_URL` aponta para host e porta corretos.
- [ ] `TypeOrmModule.forRoot` está configurado.
- [ ] A entity está registrada no módulo funcional.
- [ ] O repository está disponível no service.
- [ ] Consultas usam filtros e ordenação apropriados.
- [ ] O volume `mariadb_data` foi entendido.
- [ ] Backups são criados sem expor credenciais.
- [ ] Um backup já foi restaurado em ambiente de teste.
- [ ] Migrations são usadas antes de produção.
