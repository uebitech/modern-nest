# Como criar um Module com NestJS

Este documento explica, passo a passo, como criar e organizar um módulo em uma
aplicação NestJS.

O módulo é a unidade que agrupa uma funcionalidade relacionada. Ele conecta
controllers, services, entities, repositories e outros módulos por meio do
container de injeção de dependências do NestJS.

Neste projeto, o módulo de usuários está em:

```text
src/users/users.module.ts
```

O módulo-raiz da aplicação está em:

```text
src/app.module.ts
```

## 1. O que é um module

Um module é uma classe TypeScript anotada com `@Module()`.

Ele informa ao NestJS:

- Quais módulos externos a funcionalidade precisa importar.
- Quais controllers recebem requisições HTTP.
- Quais providers, como services, pertencem à funcionalidade.
- Quais providers podem ser utilizados por outros módulos.

A estrutura geral é:

```text
Module
├── imports: dependências de outros módulos
├── controllers: endpoints HTTP
├── providers: services e objetos injetáveis
└── exports: providers liberados para outros módulos
```

Um módulo não é necessariamente um arquivo grande. Seu papel principal é
organizar as dependências e definir os limites de uma funcionalidade.

## 2. Fluxo de uma aplicação modular

O NestJS monta a aplicação a partir do módulo-raiz:

```text
AppModule
├── ConfigModule
├── TypeOrmModule
└── UsersModule
    ├── UsersController
    ├── UsersService
    ├── User entity
    └── Repository<User>
```

O fluxo de uma requisição do projeto é:

```text
Cliente HTTP
    -> UsersController
    -> UsersService
    -> Repository<User>
    -> tabela users
```

O `UsersModule` conecta o controller ao service e o service ao repository. O
`AppModule` conecta o `UsersModule` à aplicação inteira.

## 3. Estrutura recomendada de pastas

Organize cada recurso em sua própria pasta:

```text
src/
├── app.module.ts
├── main.ts
└── users/
    ├── user.entity.ts
    ├── users.controller.ts
    ├── users.module.ts
    └── users.service.ts
```

Cada arquivo possui uma responsabilidade:

- `user.entity.ts`: mapeia a tabela `users`.
- `users.controller.ts`: expõe as rotas HTTP.
- `users.service.ts`: executa operações e regras de negócio.
- `users.module.ts`: registra e conecta os componentes de usuários.

Essa organização é chamada de organização por feature ou por recurso.

## 4. Crie a pasta e o arquivo do módulo

Crie a pasta do recurso:

```bash
mkdir -p src/users
```

Crie o módulo:

```bash
touch src/users/users.module.ts
```

O nome mais comum segue o padrão:

```text
<recurso>.module.ts
```

Exemplos:

```text
users.module.ts
products.module.ts
auth.module.ts
orders.module.ts
```

## 5. Importe o decorator `Module`

Todo módulo precisa importar `Module` do pacote `@nestjs/common`:

```typescript
import { Module } from '@nestjs/common';
```

Depois, aplique o decorator à classe:

```typescript
@Module({})
export class UsersModule {}
```

A classe pode ser exportada e importada pelo módulo-raiz ou por outros módulos.

Sem `@Module`, o NestJS não conhece a classe como um módulo da aplicação.

## 6. Entenda as propriedades de `@Module`

O decorator `@Module` recebe um objeto de configuração:

```typescript
@Module({
  imports: [],
  controllers: [],
  providers: [],
  exports: [],
})
export class UsersModule {}
```

### `imports`

Lista módulos que fornecem dependências necessárias para este módulo.

Exemplo:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
```

### `controllers`

Lista classes que recebem requisições HTTP:

```typescript
@Module({
  controllers: [UsersController],
})
export class UsersModule {}
```

### `providers`

Lista services e outros objetos gerenciados pelo container do NestJS:

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

### `exports`

Libera providers deste módulo para módulos que o importarem:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Sem `exports`, um provider normalmente fica disponível apenas dentro do módulo
que o registrou.

## 7. Registre um controller

Importe o controller:

```typescript
import { UsersController } from './users.controller';
```

Adicione-o ao campo `controllers`:

```typescript
@Module({
  controllers: [UsersController],
})
export class UsersModule {}
```

Isso informa ao NestJS que `UsersController` possui rotas HTTP que devem ser
registradas.

Se o controller não estiver nessa lista, a aplicação pode iniciar normalmente,
mas suas rotas não estarão disponíveis e retornarão `404 Not Found`.

No projeto atual, o controller possui as rotas:

```text
GET /users
POST /users
```

## 8. Registre um provider

Um service normalmente é um provider.

Importe o service:

```typescript
import { UsersService } from './users.service';
```

Registre-o:

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

O NestJS poderá então criar o service e injetá-lo no controller:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

O service também pode receber outras dependências, como repositories, desde
que elas estejam registradas no módulo:

```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}
}
```

## 9. Registre uma entity com TypeORM

Como o projeto usa TypeORM, o módulo de usuários importa o repository da entity:

```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
```

Depois, use `forFeature`:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
```

`TypeOrmModule.forFeature([User])` registra o repository associado à entity
`User` no escopo do `UsersModule`.

Isso permite esta injeção no service:

```typescript
constructor(
  @InjectRepository(User)
  private readonly usersRepository: Repository<User>,
) {}
```

A sequência é:

1. A entity `User` descreve a tabela `users`.
2. `forFeature([User])` registra o repository dessa entity.
3. `@InjectRepository(User)` solicita o repository.
4. O NestJS injeta o repository no `UsersService`.
5. O service usa o repository para consultar ou salvar dados.

## 10. Module completo do projeto

O `UsersModule` atual é:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

Cada parte possui uma função:

- `Module`: transforma a classe em módulo NestJS.
- `TypeOrmModule.forFeature([User])`: disponibiliza `Repository<User>`.
- `controllers: [UsersController]`: registra as rotas de usuários.
- `providers: [UsersService]`: registra o service.
- `export class UsersModule`: permite importar o módulo em outro arquivo.

## 11. Entenda o escopo dos providers

Por padrão, providers são encapsulados no módulo em que foram registrados.

Neste exemplo, `UsersService` pode ser utilizado por `UsersController` porque os
dois pertencem ao mesmo `UsersModule`:

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

Outro módulo não deve usar `UsersService` automaticamente. Para disponibilizá-lo,
adicione-o a `exports`:

```typescript
@Module({
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Depois, o módulo consumidor importa `UsersModule`:

```typescript
@Module({
  imports: [UsersModule],
})
export class ReportsModule {}
```

A partir disso, um provider exportado pode ser injetado em um provider de
`ReportsModule`.

Exportar tudo indiscriminadamente aumenta o acoplamento. Exporte somente o que
outros módulos realmente precisam utilizar.

## 12. Importe o módulo no `AppModule`

Um módulo funcional precisa ser incluído na árvore de módulos da aplicação.

No módulo-raiz:

```typescript
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';

@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

No projeto atual, `AppModule` também configura ambiente e TypeORM:

```typescript
@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true,
    }),
    UsersModule,
  ],
})
export class AppModule {}
```

O `AppModule` é carregado pelo `main.ts`:

```typescript
const app = await NestFactory.create(AppModule);
```

O NestJS percorre os imports a partir de `AppModule` e registra os módulos,
controllers e providers encontrados.

## 13. Diferença entre `forRoot` e `forFeature`

A integração do TypeORM utiliza dois padrões comuns.

### `forRoot`

Configura a conexão global com o banco:

```typescript
TypeOrmModule.forRoot({
  type: 'mysql',
  url: process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: true,
})
```

Normalmente é usado uma vez no módulo-raiz.

### `forFeature`

Registra entities e repositories para um módulo funcional:

```typescript
TypeOrmModule.forFeature([User])
```

Normalmente é usado no módulo que possui o service responsável por aquela
entity.

Resumo:

| Configuração | Local comum | Função |
| --- | --- | --- |
| `forRoot` | `AppModule` | Abrir e configurar a conexão |
| `forFeature` | Módulo funcional | Disponibilizar repositories |

## 14. Módulos globais

Um módulo pode ser marcado como global com `@Global()`:

```typescript
import { Global, Module } from '@nestjs/common';

@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

Um provider exportado por um módulo global pode ser usado sem importar esse
módulo explicitamente em todos os módulos.

Use módulos globais com cuidado. Eles reduzem imports explícitos, mas escondem
dependências e podem dificultar a compreensão e os testes da aplicação.

O `ConfigModule.forRoot()` utilizado neste projeto disponibiliza configuração
de ambiente conforme a configuração da biblioteca NestJS Config.

## 15. Módulos compartilhados

Quando vários recursos utilizam a mesma funcionalidade, crie um módulo
compartilhado:

```typescript
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class SharedModule {}
```

Use-o em outros módulos:

```typescript
@Module({
  imports: [SharedModule],
  providers: [UsersService],
})
export class UsersModule {}
```

Um módulo compartilhado pode fornecer:

- Logger.
- Configuração.
- Clientes de serviços externos.
- Repositories especializados.
- Guards, interceptors ou pipes reutilizados.

Evite transformar um único módulo em um depósito de todos os componentes da
aplicação. Agrupe apenas dependências realmente compartilhadas.

## 16. Módulos dinâmicos

Módulos dinâmicos permitem configurar um módulo no momento da importação.
Bibliotecas NestJS usam esse padrão em métodos como:

```typescript
ConfigModule.forRoot()
TypeOrmModule.forRoot({...})
TypeOrmModule.forFeature([User])
```

Um módulo dinâmico pode expor métodos como `register` ou `forRoot`:

```typescript
@Module({})
export class NotificationsModule {
  static register(options: { from: string }) {
    return {
      module: NotificationsModule,
      providers: [
        {
          provide: 'NOTIFICATION_OPTIONS',
          useValue: options,
        },
      ],
      exports: ['NOTIFICATION_OPTIONS'],
    };
  }
}
```

Importação:

```typescript
@Module({
  imports: [
    NotificationsModule.register({
      from: 'no-reply@example.com',
    }),
  ],
})
export class AppModule {}
```

Esse padrão é útil para bibliotecas ou componentes configuráveis. Para um
recurso simples como usuários, um módulo estático comum é suficiente.

## 17. Módulos e injeção de dependência

O módulo define o contexto no qual o NestJS resolve dependências.

Considere:

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

Quando o NestJS cria `UsersService`, ele procura suas dependências dentro do
contexto disponível para `UsersModule`.

Se `UsersService` depende de `Repository<User>`, então o módulo precisa importar
o provider correspondente:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}
```

Se um provider vier de outro módulo, esse outro módulo precisa:

1. Registrar o provider em `providers`.
2. Liberá-lo em `exports`.
3. Ser importado pelo módulo consumidor.

A ausência de qualquer etapa pode causar erro de resolução de dependência.

## 18. Módulos e controllers

Controllers são registrados no módulo que possui a funcionalidade da rota:

```typescript
@Module({
  controllers: [UsersController],
})
export class UsersModule {}
```

O módulo-raiz não precisa listar diretamente todos os controllers da aplicação.
Basta importar o módulo funcional:

```typescript
@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

Isso mantém o `AppModule` pequeno e delega a organização de cada recurso ao seu
próprio módulo.

## 19. Módulos e services

O service deve ser registrado como provider no módulo que o utiliza:

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

O controller injeta o service:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

O service não deve ser criado manualmente pelo controller:

```typescript
// Evite isto:
const service = new UsersService();
```

A criação manual ignora o container do NestJS e impede a injeção automática das
dependências do service, como repositories e outros providers.

## 20. Como adicionar um novo recurso

Para criar um recurso `products`, siga esta sequência:

### Estrutura

```text
src/products/
├── product.entity.ts
├── products.controller.ts
├── products.module.ts
└── products.service.ts
```

### Módulo

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product])],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
```

### AppModule

```typescript
import { ProductsModule } from './products/products.module';

@Module({
  imports: [ProductsModule],
})
export class AppModule {}
```

A entity, o controller e o service precisam existir com os nomes e caminhos
corretos para que os imports funcionem.

## 21. Exemplo completo de módulo

Abaixo está um exemplo de módulo para um recurso de tarefas:

```typescript
// tasks.module.ts
import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
```

Nesse exemplo:

- `TasksController` recebe as requisições de tarefas.
- `TasksService` contém a lógica das tarefas.
- `exports` permite que outro módulo utilize `TasksService`.
- O módulo não precisa importar nada porque o exemplo não usa banco ou provider
  externo.

## 22. Teste um módulo

Um teste unitário simples pode verificar se o módulo consegue criar o service:

```typescript
import { Test } from '@nestjs/testing';
import { TasksModule } from './tasks.module';
import { TasksService } from './tasks.service';

describe('TasksModule', () => {
  it('deve criar o service', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TasksModule],
    }).compile();

    expect(moduleRef.get(TasksService)).toBeDefined();
  });
});
```

Em um teste de integração, também verifique se:

- O módulo-raiz consegue iniciar.
- Os controllers são registrados.
- Repositories são resolvidos.
- A conexão com dependências externas funciona.

## 23. Erros comuns

### O módulo não foi importado

Sintoma: a rota registrada no módulo não existe ou retorna `404`.

Verifique se o módulo funcional está em `imports` do `AppModule`:

```typescript
@Module({
  imports: [UsersModule],
})
export class AppModule {}
```

### Controller fora de `controllers`

Sintoma: a aplicação inicia, mas os endpoints não são registrados.

Correção:

```typescript
@Module({
  controllers: [UsersController],
})
export class UsersModule {}
```

### Service fora de `providers`

Sintoma: erro informando que uma dependência não pode ser resolvida.

Correção:

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

### Repository TypeORM não encontrado

Sintoma comum:

```text
Nest can't resolve dependencies of the UsersService
```

Verifique se o repository foi registrado:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
})
export class UsersModule {}
```

Confirme também se `User` foi importado do arquivo correto.

### Provider usado por outro módulo não foi exportado

Se `ReportsModule` precisa usar `UsersService`, o `UsersModule` deve exportá-lo:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

E `ReportsModule` deve importar `UsersModule`:

```typescript
@Module({
  imports: [UsersModule],
})
export class ReportsModule {}
```

### Dependência circular

Dependências circulares podem ocorrer quando dois módulos importam um ao outro.

Quando a relação for realmente necessária, o NestJS oferece `forwardRef`:

```typescript
import { forwardRef, Module } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => UsersModule)],
})
export class ReportsModule {}
```

Use essa solução apenas quando a relação circular fizer parte do domínio.
Frequentemente, extrair a responsabilidade compartilhada para um terceiro módulo
reduz o acoplamento de forma mais clara.

## 24. Boas práticas

- Organize módulos por funcionalidade.
- Mantenha o módulo-raiz responsável apenas pela composição global.
- Registre cada controller no módulo dono da rota.
- Registre cada service em `providers`.
- Exporte somente providers que outros módulos precisam usar.
- Importe dependências explicitamente.
- Use `forRoot` para configuração global e `forFeature` por recurso.
- Evite módulos globais sem necessidade.
- Evite colocar regras de negócio dentro do módulo.
- Evite acessar repositories diretamente no controller.
- Prefira dependências claras a imports implícitos.
- Teste o módulo quando ele possuir muitas dependências.
- Preserve nomes consistentes entre pasta, classe e arquivo.

## 25. Checklist final

Antes de considerar um módulo pronto, confirme:

- [ ] O arquivo possui extensão `.module.ts`.
- [ ] A classe possui o decorator `@Module`.
- [ ] Os módulos necessários estão em `imports`.
- [ ] Os controllers estão em `controllers`.
- [ ] Os services estão em `providers`.
- [ ] Entities TypeORM estão registradas com `forFeature` quando necessário.
- [ ] Providers usados externamente estão em `exports`.
- [ ] O módulo funcional foi importado pelo módulo-raiz.
- [ ] Os caminhos dos imports estão corretos.
- [ ] A aplicação consegue resolver as dependências.
- [ ] As rotas do módulo foram testadas.
- [ ] O projeto compila com `npm run build`.

## 26. Forma mais simples de criar um module

A maneira mais simples de criar um módulo é:

### 1. Crie o arquivo

```bash
touch src/hello/hello.module.ts
```

### 2. Escreva o módulo

```typescript
import { Module } from '@nestjs/common';

@Module({})
export class HelloModule {}
```

Esse módulo já é válido, mas ainda não possui controller ou service.

### 3. Adicione um controller simples

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('hello')
export class HelloController {
  @Get()
  sayHello() {
    return { message: 'Olá, NestJS!' };
  }
}
```

Registre-o no módulo:

```typescript
import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';

@Module({
  controllers: [HelloController],
})
export class HelloModule {}
```

### 4. Importe no módulo-raiz

```typescript
import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [HelloModule],
})
export class AppModule {}
```

### 5. Teste

Inicie a aplicação e execute:

```bash
curl http://localhost:3000/hello
```

Resposta esperada:

```json
{
  "message": "Olá, NestJS!"
}
```

O fluxo mínimo é:

1. `@Module({})` cria o módulo.
2. `controllers` registra o controller.
3. `imports` conecta o módulo ao `AppModule`.
4. `@Controller('hello')` cria o prefixo da rota.
5. `@Get()` cria a rota `GET /hello`.

Para o projeto atual, o mesmo padrão é aplicado com `UsersModule`,
`UsersController`, `UsersService` e `TypeOrmModule.forFeature([User])`.
