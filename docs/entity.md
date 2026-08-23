3# Como criar uma Entity com NestJS e TypeORM

Este documento descreve, passo a passo, como criar uma entidade persistida no
banco de dados em uma aplicação NestJS usando TypeORM.

O exemplo utiliza uma entidade `User`, mapeada para a tabela `users`, com os
campos `id`, `name`, `email` e `createdAt`.

> **Importante:** este projeto utiliza **TypeORM**. A pasta `prisma/` existente
> no repositório não participa da execução atual da aplicação; não é necessário
> usar Prisma para seguir este guia.

## 1. Pré-requisitos

Antes de criar a entity, confirme que os seguintes recursos estão disponíveis:

- Node.js 22 ou versão compatível com o projeto.
- npm instalado.
- Docker e Docker Compose, caso o MariaDB seja executado em container.
- Um editor com suporte a TypeScript.
- Um banco MySQL ou MariaDB acessível pela aplicação.

Instale as dependências do projeto:

```bash
npm install
```

As dependências mais importantes para o mapeamento são:

- `typeorm`: biblioteca responsável pelo mapeamento objeto-relacional.
- `@nestjs/typeorm`: integração entre NestJS e TypeORM.
- `mysql2`: driver usado para conectar ao MySQL ou MariaDB.
- `reflect-metadata`: suporte exigido pelos decorators usados pelo TypeORM.

## 2. Entenda o que é uma entity

Uma entity é uma classe TypeScript que representa uma tabela do banco de dados.
Cada propriedade da classe normalmente representa uma coluna.

No exemplo abaixo:

| Classe TypeScript | Tabela/coluna do banco |
| --- | --- |
| `User` | tabela `users` |
| `id` | coluna `id` |
| `name` | coluna `name` |
| `email` | coluna `email` |
| `createdAt` | coluna `createdAt` |

A entity não é, sozinha, um endpoint HTTP. Ela descreve persistência. Para que
ela seja utilizada pela API, também é necessário registrá-la no módulo e
injetar seu repository em um service.

## 3. Crie a pasta do recurso

Organize a entity junto dos demais arquivos do recurso ao qual ela pertence:

```text
src/
└── users/
    └── user.entity.ts
```

Essa organização mantém próximos os arquivos que mudam juntos:

- `user.entity.ts`: representa a tabela.
- `users.service.ts`: contém as operações de persistência.
- `users.controller.ts`: expõe os endpoints HTTP.
- `users.module.ts`: conecta todas as peças do recurso.

Crie o arquivo:

```bash
mkdir -p src/users
touch src/users/user.entity.ts
```

## 4. Importe os decorators do TypeORM

Comece importando os decorators que descrevem a tabela e suas colunas:

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
```

Cada import tem uma função específica:

- `Entity`: informa ao TypeORM que a classe deve ser tratada como entity.
- `PrimaryGeneratedColumn`: cria uma chave primária gerada automaticamente.
- `Column`: mapeia uma propriedade comum para uma coluna.
- `CreateDateColumn`: preenche automaticamente a data de criação do registro.

Os decorators dependem destas opções no `tsconfig.json`:

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## 5. Declare a classe e o nome da tabela

Declare uma classe exportada e aplique `@Entity` antes dela:

```typescript
@Entity('users')
export class User {
  // propriedades da entity
}
```

O argumento `'users'` define explicitamente o nome da tabela.

Essa definição evita depender da estratégia automática de pluralização do ORM.
Assim, fica claro que instâncias de `User` serão persistidas na tabela `users`.

Caso `@Entity()` fosse usado sem argumento, o TypeORM calcularia o nome da
tabela a partir da classe e da configuração de naming strategy utilizada.

## 6. Adicione a chave primária

Toda tabela deve possuir uma identificação única para cada registro:

```typescript
@PrimaryGeneratedColumn()
id!: number;
```

Esse decorator normalmente cria uma coluna numérica auto-incremental.

O operador `!` é uma asserção de inicialização do TypeScript. Ele informa ao
compilador que o TypeORM preencherá a propriedade durante a criação ou leitura
da entidade, mesmo que o construtor da classe não a inicialize explicitamente.

O campo pode ser usado para localizar um registro:

```typescript
const user = await repository.findOneBy({ id: 1 });
```

## 7. Adicione uma coluna de texto

Para armazenar o nome do usuário, use `@Column`:

```typescript
@Column()
name!: string;
```

Sem opções extras, o TypeORM infere o tipo a partir do metadata do TypeScript e
cria uma coluna compatível com texto no banco.

Em aplicações reais, é recomendável definir limites e regras explicitamente,
por exemplo:

```typescript
@Column({ length: 120 })
name!: string;
```

O tamanho deve refletir a regra de negócio. Alterar o tamanho depois de a tabela
já possuir dados pode exigir uma migração.

## 8. Adicione uma coluna única para e-mail

O e-mail deve ser único para impedir duplicidade:

```typescript
@Column({ unique: true })
email!: string;
```

A opção `unique: true` instrui o TypeORM a criar uma restrição ou índice único
no banco de dados.

Essa regra deve existir no banco, e não somente no service. Uma checagem feita
apenas em TypeScript pode falhar quando duas requisições simultâneas tentarem
criar o mesmo e-mail.

Mesmo assim, a aplicação deve tratar o erro devolvido pelo banco, porque uma
violação de unicidade é uma situação esperada do domínio e deve resultar em uma
resposta HTTP adequada.

## 9. Adicione uma data automática de criação

Para registrar quando o usuário foi criado:

```typescript
@CreateDateColumn()
createdAt!: Date;
```

O TypeORM preenche essa coluna durante a inserção. O código que cria o usuário
não precisa receber nem confiar em uma data enviada pelo cliente.

Isso ajuda a manter a informação consistente e permite ordenar os usuários:

```typescript
repository.find({
  order: { createdAt: 'DESC' },
});
```

`DESC` significa ordem decrescente, portanto os registros mais recentes vêm
primeiro.

## 10. Resultado completo da entity

O arquivo `src/users/user.entity.ts` deve ficar assim:

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

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

A entity define o formato persistido, mas ainda não torna o repository
automaticamente disponível para o `UsersService`.

## 11. Configure a conexão com o banco

No módulo-raiz, registre o TypeORM:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
})
export class AppModule {}
```

As opções significam:

- `type: 'mysql'`: usa o driver compatível com MySQL/MariaDB.
- `url`: lê host, porta, usuário, senha e banco de `DATABASE_URL`.
- `autoLoadEntities: true`: inclui entities registradas por módulos funcionais.
- `synchronize: true`: tenta sincronizar as tabelas com as classes ao iniciar.

### Atenção ao `synchronize`

` synchronize: true` é prático em exemplos e desenvolvimento local, mas não é
recomendado para produção. Alterações na entity podem alterar o esquema
automaticamente e causar perda ou transformação inesperada de dados.

Em produção, prefira migrations versionadas e execute-as como etapa controlada
do processo de deploy.

## 12. Registre a entity no módulo funcional

No módulo de usuários, use `forFeature`:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

`TypeOrmModule.forFeature([User])` registra o repository de `User` no escopo
do módulo `UsersModule`.

Sem esse registro, o NestJS não saberá como resolver a dependência
`Repository<User>` no construtor do service.

## 13. Injete o repository no service

O service recebe o repository por injeção de dependência:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
}
```

A sequência de resolução é:

1. `UsersModule` registra `User` com `forFeature`.
2. O NestJS cria o provider do repository.
3. `@InjectRepository(User)` solicita esse provider.
4. O NestJS injeta o repository no `UsersService`.
5. O service pode executar consultas e gravações usando TypeORM.

## 14. Crie operações de leitura e gravação

Uma implementação mínima pode listar e criar usuários:

```typescript
findAll() {
  return this.usersRepository.find({
    order: { createdAt: 'DESC' },
  });
}

create(name: string, email: string) {
  const user = this.usersRepository.create({ name, email });
  return this.usersRepository.save(user);
}
```

É importante distinguir os dois métodos usados na criação:

- `create`: monta uma instância da entity em memória.
- `save`: persiste essa instância no banco e executa a operação SQL.

O método `save` também devolve os valores preenchidos pelo banco, como `id` e
`createdAt`.

## 15. Exponha a entity pela API

O controller pode delegar as operações ao service:

```typescript
import { Body, Controller, Get, Post } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Post()
  create(@Body() body: { name: string; email: string }) {
    return this.usersService.create(body.name, body.email);
  }
}
```

Os decorators formam as rotas:

- `@Controller('users')` define o prefixo `/users`.
- `@Get()` cria `GET /users`.
- `@Post()` cria `POST /users`.
- `@Body()` lê o JSON enviado no corpo da requisição.

O controller não deve criar SQL diretamente. Ele apenas traduz a requisição e
delega a operação ao service.

## 16. Configure as variáveis de ambiente

Para executar localmente, copie o exemplo:

```bash
cp .env.example .env
```

O conteúdo esperado é semelhante a:

```env
DATABASE_URL="mysql://app:app@localhost:3307/appdb"
PORT=3001
```

A URL local usa `localhost:3307` porque o Compose publica a porta interna
`3306` do MariaDB como porta `3307` na máquina hospedeira.

Quando a API roda dentro do Compose, ela deve usar o nome do serviço como host:

```env
DATABASE_URL="mysql://app:app@db:3306/appdb"
PORT=3000
```

Dentro da rede Docker, `localhost` apontaria para o próprio container da API,
não para o container do banco.

## 17. Suba o banco com Docker

Inicie somente o banco para desenvolvimento local:

```bash
npm run db:up
```

Ou use o Compose diretamente:

```bash
docker compose up -d db
```

O serviço espera o healthcheck do MariaDB antes de ser considerado pronto.

Para executar API e banco juntos:

```bash
docker compose -f compose.yml up --build
```

## 18. Inicie a aplicação

Com o banco disponível, execute:

```bash
npm run start:dev
```

No desenvolvimento local, a API usa a porta definida em `.env`, normalmente
`3001`.

Para compilar e executar como produção local:

```bash
npm run build
npm start
```

## 19. Teste a entity pela API

Liste usuários:

```bash
curl http://localhost:3001/users
```

Crie um usuário:

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

A resposta deve conter os valores persistidos, incluindo `id` e `createdAt`.

Com a API executando pelo Compose, use a porta `3000`:

```bash
curl http://localhost:3000/users
```

## 20. Verifique a tabela no MariaDB

Conecte-se ao banco publicado localmente:

```bash
mysql -h 127.0.0.1 -P 3307 -u app -p appdb
```

A senha configurada no Compose é `app`.

Depois, consulte a tabela:

```sql
SHOW TABLES;
DESCRIBE users;
SELECT id, name, email, createdAt FROM users;
```

A tabela deve conter as colunas correspondentes à entity.

## 21. Problemas comuns

### Repository não encontrado

Erro típico:

```text
Nest can't resolve dependencies of the UsersService
```

Verifique se o módulo contém:

```typescript
imports: [TypeOrmModule.forFeature([User])]
```

Também confirme se `UsersService` está em `providers`.

### Falha de conexão com o banco

Confira:

1. Se o container do MariaDB está ativo.
2. Se `DATABASE_URL` usa `localhost:3307` fora do Docker.
3. Se `DATABASE_URL` usa `db:3306` dentro do Docker Compose.
4. Se usuário, senha e nome do banco correspondem ao `compose.yml`.
5. Se o banco terminou o processo de inicialização.

Consulte os logs:

```bash
docker compose logs db
```

### E-mail duplicado

O banco rejeitará uma segunda gravação com o mesmo e-mail por causa de
`unique: true`. O controller deve futuramente converter essa exceção em um
status HTTP compreensível, como `409 Conflict`.

### Alteração na entity não aparece

Em desenvolvimento, confirme se `synchronize: true` está ativo e reinicie a
API. Em produção, crie e execute uma migration em vez de depender de
sincronização automática.

### Credenciais antigas no volume

O MariaDB inicializa as credenciais somente quando o volume é criado. Para
recriar o banco local, apagando os dados persistidos:

```bash
docker compose down -v
docker compose up -d db
```

> O comando `down -v` remove o volume e, portanto, apaga os dados do ambiente.

## 22. Boas práticas para evoluir a entity

Ao adicionar novos campos:

1. Defina o tipo TypeScript correto.
2. Escolha se a coluna aceita `NULL`.
3. Defina tamanho, índice e unicidade quando necessário.
4. Atualize DTOs e validações da API.
5. Atualize testes.
6. Use migration em ambientes persistentes.
7. Verifique compatibilidade com dados já existentes.

Exemplo de campo opcional:

```typescript
@Column({ nullable: true, length: 255 })
phone?: string;
```

Exemplo de campo obrigatório com tamanho definido:

```typescript
@Column({ length: 120 })
name!: string;
```

Exemplo de índice para consultas frequentes:

```typescript
import { Index } from 'typeorm';

@Index(['email'])
@Entity('users')
export class User {
  // campos da entity
}
```

Não adicione índices automaticamente para todas as colunas. Índices melhoram
leituras específicas, mas aumentam o custo de escritas e o espaço utilizado.

## 23. Checklist final

Antes de considerar a entity pronta, confirme:

- [ ] A classe possui `@Entity`.
- [ ] A tabela tem uma chave primária.
- [ ] Cada coluna possui o decorator adequado.
- [ ] Campos únicos têm restrição no banco.
- [ ] A entity foi registrada com `forFeature`.
- [ ] O service injeta o repository correto.
- [ ] A conexão TypeORM está configurada.
- [ ] `DATABASE_URL` aponta para o host correto.
- [ ] O banco está ativo e saudável.
- [ ] A API foi compilada com `npm run build`.
- [ ] Os endpoints foram testados.
- [ ] Mudanças de esquema estão documentadas por migration quando necessário.

A entity é a base do acesso aos dados, mas uma implementação completa também
precisa considerar validação de entrada, tratamento de exceções, autenticação,
paginação, testes e estratégia de migrations conforme o ambiente de execução.

## 24. Forma mais simples de criar uma entity

Para criar uma entity básica, faça apenas estes passos:

### 1. Crie o arquivo

```bash
touch src/products/product.entity.ts
```

### 2. Escreva a classe

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;
}
```

Nesse exemplo:

- `@Entity('products')` cria o vínculo com a tabela `products`.
- `@PrimaryGeneratedColumn()` cria o `id` automático.
- `@Column()` cria a coluna `name`.

### 3. Registre no módulo

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
})
export class ProductsModule {}
```

Pronto: com a conexão TypeORM configurada, a tabela `products` poderá ser
criada automaticamente quando `synchronize: true` estiver ativo.

Para criar uma entity ainda mais simples no projeto atual, o arquivo completo
de `User` pode ser resumido a:

```typescript
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;
}
```

Depois, adicione outros campos, como `email` e `createdAt`, conforme a
necessidade da aplicação.
