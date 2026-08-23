# Como criar um Service com NestJS

Este documento explica, passo a passo, como criar e usar um service em uma
aplicação NestJS.

Um service é uma classe responsável por executar operações de negócio e
coordenar o acesso a dados. Ele recebe dependências pelo container do NestJS e
pode ser chamado por controllers, jobs, consumers ou outros services.

Neste projeto, o service de usuários está em:

```text
src/users/users.service.ts
```

Ele executa atualmente duas operações:

| Método | Responsabilidade |
| --- | --- |
| `findAll` | Busca usuários ordenados pela data de criação |
| `create` | Cria e persiste um novo usuário |

## 1. O que é um service

Um service é uma classe que concentra operações que não devem ficar dentro do
controller.

O fluxo normal é:

```text
Requisição HTTP -> Controller -> Service -> Repository -> Banco de dados
```

Cada camada possui um papel:

- **Controller:** recebe a requisição e devolve a resposta.
- **Service:** executa regras de negócio e coordena operações.
- **Repository:** consulta e grava dados.
- **Entity:** representa os dados persistidos.

O controller atual chama o service:

```typescript
@Get()
findAll() {
  return this.usersService.findAll();
}
```

O service chama o repository:

```typescript
findAll() {
  return this.usersRepository.find({
    order: { createdAt: 'DESC' },
  });
}
```

Essa separação mantém o controller pequeno e permite reutilizar a lógica em
outros pontos da aplicação.

## 2. Responsabilidades de um service

Um service pode:

- Consultar dados.
- Criar, atualizar ou remover registros.
- Validar regras de negócio.
- Coordenar vários repositories.
- Chamar serviços externos.
- Publicar eventos.
- Controlar transações.
- Converter dados entre camadas.
- Lançar exceções de domínio ou HTTP.

Um service não deve assumir responsabilidades que pertencem a outras camadas:

- Não deve definir rotas HTTP.
- Não deve interpretar diretamente URL ou headers.
- Não deve montar respostas HTTP manualmente sem necessidade.
- Não deve conter toda a configuração da aplicação.
- Não deve expor detalhes desnecessários do banco ao controller.

## 3. Crie a pasta e o arquivo

Organize o service junto dos arquivos da mesma funcionalidade:

```text
src/
└── users/
    ├── user.entity.ts
    ├── users.controller.ts
    ├── users.module.ts
    └── users.service.ts
```

Crie o arquivo:

```bash
mkdir -p src/users
touch src/users/users.service.ts
```

O padrão de nome é:

```text
<recurso>.service.ts
```

Exemplos:

```text
users.service.ts
products.service.ts
auth.service.ts
orders.service.ts
```

## 4. Importe `Injectable`

Comece importando o decorator `Injectable`:

```typescript
import { Injectable } from '@nestjs/common';
```

Aplique-o à classe:

```typescript
@Injectable()
export class UsersService {}
```

`@Injectable()` informa ao NestJS que a classe pode ser gerenciada pelo
container de injeção de dependências.

O decorator permite que o NestJS:

- Crie a instância do service.
- Resolva dependências do construtor.
- Controle o ciclo de vida do provider.
- Disponibilize o service para controllers e outros providers.

Sem `@Injectable()`, a classe não seguirá o padrão esperado de injeção de
dependências do NestJS.

## 5. Registre o service no módulo

O service também precisa ser registrado no módulo:

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

O campo `providers` informa quais objetos o NestJS deve criar e gerenciar.

No projeto atual:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

O `UsersService` é utilizado pelo `UsersController` porque ambos pertencem ao
mesmo módulo.

## 6. Injete dependências pelo construtor

O NestJS recomenda receber dependências pelo construtor:

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly dependency: SomeDependency) {}
}
```

Não crie dependências manualmente:

```typescript
// Evite:
const dependency = new SomeDependency();
```

A criação manual ignora o container do NestJS e dificulta substituição,
configuração e testes.

### `private readonly`

Na declaração:

```typescript
constructor(private readonly usersRepository: Repository<User>) {}
```

- `private` limita o acesso à classe.
- `readonly` impede trocar a referência depois da construção.
- `usersRepository` é o nome da dependência.
- `Repository<User>` é o tipo do repository.

## 7. Injete o repository do TypeORM

Como o projeto utiliza TypeORM, o service recebe o repository de `User`:

```typescript
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

O decorator `@InjectRepository(User)` diz ao NestJS qual repository deve ser
injetado.

Para essa injeção funcionar, o módulo precisa registrar a entity:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}
```

A configuração completa depende de três partes:

1. `User` deve ser uma entity TypeORM.
2. `TypeOrmModule.forFeature([User])` deve estar no módulo.
3. `@InjectRepository(User)` deve estar no construtor do service.

## 8. Crie o método de listagem

O método atual para listar usuários é:

```typescript
findAll() {
  return this.usersRepository.find({
    order: { createdAt: 'DESC' },
  });
}
```

O método chama `find` no repository.

A opção `order` define a ordenação:

- `createdAt`: coluna usada para ordenar.
- `DESC`: ordem decrescente.
- Registros mais novos: aparecem primeiro.

A consulta é executada no banco, em vez de buscar tudo e ordenar manualmente em
memória.

Como o repository retorna uma Promise, o controller pode retornar essa Promise
diretamente:

```typescript
@Get()
findAll() {
  return this.usersService.findAll();
}
```

Também seria possível declarar o método como `async`:

```typescript
async findAll() {
  return this.usersRepository.find({
    order: { createdAt: 'DESC' },
  });
}
```

As duas formas funcionam. Use `async` quando o método precisar aguardar mais de
uma operação ou tratar exceções localmente.

## 9. Crie o método de persistência

O método atual de criação é:

```typescript
create(name: string, email: string) {
  return this.usersRepository.save(
    this.usersRepository.create({ name, email }),
  );
}
```

Ele realiza duas etapas:

### `repository.create`

```typescript
const user = this.usersRepository.create({ name, email });
```

Monta uma instância de `User` em memória. Esse método não envia necessariamente
uma instrução de inserção ao banco.

### `repository.save`

```typescript
return this.usersRepository.save(user);
```

Persiste a entidade. Como `id` e `createdAt` são preenchidos pelo banco ou pelo
TypeORM, o retorno contém os dados gerados depois da gravação.

Uma versão mais explícita é:

```typescript
async create(name: string, email: string) {
  const user = this.usersRepository.create({
    name,
    email,
  });

  return this.usersRepository.save(user);
}
```

Essa versão é mais longa, mas pode facilitar depuração e inclusão de regras
antes do `save`.

## 10. Service completo do projeto

O `UsersService` atual possui esta estrutura:

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

  findAll() {
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  create(name: string, email: string) {
    return this.usersRepository.save(
      this.usersRepository.create({ name, email }),
    );
  }
}
```

O fluxo completo é:

```text
UsersController
    -> UsersService.findAll()
    -> usersRepository.find()
    -> banco de dados
```

E para criação:

```text
UsersController
    -> UsersService.create(name, email)
    -> usersRepository.create(...)
    -> usersRepository.save(...)
    -> banco de dados
```

## 11. Receba DTOs no service

O controller atual envia dois argumentos:

```typescript
return this.usersService.create(body.name, body.email);
```

Essa forma é simples e funciona bem para um exemplo pequeno.

Quando a quantidade de campos aumenta, use um DTO:

```typescript
export class CreateUserDto {
  name!: string;
  email!: string;
}
```

O service pode receber o DTO:

```typescript
create(data: CreateUserDto) {
  const user = this.usersRepository.create(data);
  return this.usersRepository.save(user);
}
```

O controller ficaria:

```typescript
@Post()
create(@Body() body: CreateUserDto) {
  return this.usersService.create(body);
}
```

A vantagem é evitar assinaturas muito longas:

```typescript
// Menos conveniente quando há muitos campos:
create(name, email, phone, address, birthDate, role) {}

// Mais fácil de evoluir:
create(data: CreateUserDto) {}
```

O DTO representa a entrada da aplicação. A entity representa o modelo de
persistência. Eles podem ser parecidos, mas não precisam ser a mesma classe.

## 12. Valide regras de negócio

A validação de formato pode ficar em DTOs e pipes. Regras de negócio ficam no
service.

Exemplos de regras de negócio:

- Não permitir cadastro com e-mail já usado.
- Não permitir cancelar um pedido já enviado.
- Não permitir transferência para a própria conta.
- Não permitir alterar uma entidade arquivada.

Uma regra pode ser implementada assim:

```typescript
import { ConflictException } from '@nestjs/common';

async create(name: string, email: string) {
  const existingUser = await this.usersRepository.findOneBy({ email });

  if (existingUser) {
    throw new ConflictException('E-mail já cadastrado');
  }

  const user = this.usersRepository.create({ name, email });
  return this.usersRepository.save(user);
}
```

A restrição `unique: true` da entity continua necessária. A consulta anterior
melhora a mensagem, mas não substitui a proteção do banco contra duas
requisições simultâneas.

## 13. Trate registros inexistentes

Para buscar um único registro, use `findOneBy`:

```typescript
import { NotFoundException } from '@nestjs/common';

async findOne(id: number) {
  const user = await this.usersRepository.findOneBy({ id });

  if (!user) {
    throw new NotFoundException('Usuário não encontrado');
  }

  return user;
}
```

O service transforma a ausência do registro em uma exceção HTTP compreensível.
O NestJS converte `NotFoundException` em uma resposta `404 Not Found`.

O controller correspondente seria:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.findOne(id);
}
```

O controller extrai e converte o parâmetro; o service decide o que significa um
usuário inexistente.

## 14. Métodos CRUD comuns

Um service de usuários pode evoluir para:

```typescript
findAll() {}

findOne(id: number) {}

create(data: CreateUserDto) {}

update(id: number, data: UpdateUserDto) {}

remove(id: number) {}
```

### Listar

```typescript
findAll() {
  return this.usersRepository.find({
    order: { createdAt: 'DESC' },
  });
}
```

### Buscar um

```typescript
findOne(id: number) {
  return this.usersRepository.findOneBy({ id });
}
```

### Criar

```typescript
create(data: CreateUserDto) {
  const user = this.usersRepository.create(data);
  return this.usersRepository.save(user);
}
```

### Atualizar

```typescript
async update(id: number, data: UpdateUserDto) {
  const user = await this.findOne(id);
  Object.assign(user, data);
  return this.usersRepository.save(user);
}
```

### Remover

```typescript
async remove(id: number) {
  const user = await this.findOne(id);
  await this.usersRepository.remove(user);
  return user;
}
```

O método de atualização deve confirmar que o registro existe antes de alterar.
O método de remoção também deve decidir como tratar um id inexistente.

## 15. `save`, `insert`, `update` e `remove`

O TypeORM oferece várias operações.

### `save`

```typescript
return this.usersRepository.save(user);
```

Cria ou atualiza uma entidade conforme a presença de sua chave primária. É
conveniente quando você precisa do objeto persistido.

### `insert`

```typescript
return this.usersRepository.insert({ name, email });
```

Executa uma inserção direta. É útil quando você precisa do resultado da
operação, mas não necessariamente da entidade completa.

### `update`

```typescript
return this.usersRepository.update(id, { name });
```

Atualiza diretamente sem carregar a entidade inteira primeiro. Use quando as
regras não exigirem o objeto atual ou hooks associados à entidade.

### `remove`

```typescript
return this.usersRepository.remove(user);
```

Remove uma entidade carregada.

### `delete`

```typescript
return this.usersRepository.delete(id);
```

Remove diretamente pelo identificador. Antes de usar, defina como o service
tratará o caso em que nenhum registro foi encontrado.

## 16. Paginação

Retornar todos os registros pode ser caro quando a tabela cresce.

Uma paginação simples:

```typescript
async findAll(page = 1, limit = 20) {
  const [users, total] = await this.usersRepository.findAndCount({
    skip: (page - 1) * limit,
    take: limit,
    order: { createdAt: 'DESC' },
  });

  return {
    data: users,
    total,
    page,
    limit,
  };
}
```

Antes de executar, valide limites e valores negativos:

```typescript
page = Math.max(1, page);
limit = Math.min(Math.max(1, limit), 100);
```

Em APIs reais, use DTOs e pipes para validar esses parâmetros antes de chegarem
ao service.

## 17. Transações

Quando uma operação altera várias tabelas, pode ser necessário usar uma
transação para garantir que tudo seja confirmado ou desfeito em conjunto.

Exemplo com `DataSource`:

```typescript
import { DataSource } from 'typeorm';

@Injectable()
export class OrdersService {
  constructor(private readonly dataSource: DataSource) {}

  async createOrder() {
    return this.dataSource.transaction(async (manager) => {
      const order = manager.create(Order, {});
      const savedOrder = await manager.save(order);

      const payment = manager.create(Payment, {
        orderId: savedOrder.id,
      });
      await manager.save(payment);

      return savedOrder;
    });
  }
}
```

Se uma operação dentro da função lançar uma exceção, a transação será revertida
pelo TypeORM.

Para uma operação simples de usuário, como a criação atual, uma transação
explícita normalmente não é necessária.

## 18. Services e chamadas externas

Um service também pode encapsular um cliente externo:

```typescript
@Injectable()
export class NotificationsService {
  constructor(private readonly httpService: HttpService) {}

  async sendWelcomeEmail(email: string) {
    return this.httpService.axiosRef.post('/messages', {
      to: email,
      template: 'welcome',
    });
  }
}
```

Mantenha clientes externos atrás de services próprios. Assim, o restante da
aplicação não precisa conhecer detalhes de URL, autenticação ou formato da API
externa.

## 19. Métodos privados

Use métodos privados para extrair detalhes internos:

```typescript
@Injectable()
export class UsersService {
  async create(name: string, email: string) {
    this.ensureEmailIsValid(email);
    const user = this.usersRepository.create({ name, email });
    return this.usersRepository.save(user);
  }

  private ensureEmailIsValid(email: string) {
    if (!email.includes('@')) {
      throw new BadRequestException('E-mail inválido');
    }
  }
}
```

Um método privado não faz parte do contrato público do service e pode mudar sem
afetar o controller.

Para validações genéricas de formato, prefira DTOs e `class-validator`. Use
métodos do service para regras que dependem do estado do sistema ou do banco.

## 20. Services e exports

Por padrão, um provider fica disponível no módulo que o registrou.

Para outro módulo usar o service, exporte-o:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

Depois importe o módulo consumidor:

```typescript
@Module({
  imports: [UsersModule],
  providers: [ReportsService],
})
export class ReportsModule {}
```

Agora `ReportsService` pode receber `UsersService` no construtor.

Não exporte providers sem necessidade. Exports excessivos tornam os módulos
mais acoplados e escondem os limites da aplicação.

## 21. Teste unitário de um service

Um service pode ser testado com um repository falso ou mockado:

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(UsersService);
    repository = moduleRef.get(getRepositoryToken(User));
  });

  it('deve listar usuários', async () => {
    repository.find.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });
});
```

O teste verifica o comportamento do service sem depender de um banco real.

Para testar criação, configure os mocks:

```typescript
it('deve criar um usuário', async () => {
  const user = {
    id: 1,
    name: 'Ada',
    email: 'ada@example.com',
    createdAt: new Date(),
  } as User;

  repository.create.mockReturnValue(user);
  repository.save.mockResolvedValue(user);

  await expect(
    service.create('Ada', 'ada@example.com'),
  ).resolves.toBe(user);

  expect(repository.create).toHaveBeenCalledWith({
    name: 'Ada',
    email: 'ada@example.com',
  });
  expect(repository.save).toHaveBeenCalledWith(user);
});
```

## 22. Teste de integração

Um teste de integração usa uma conexão real ou um banco de teste para validar:

- Mapeamento da entity.
- Consultas do repository.
- Restrições de unicidade.
- Transações.
- Integração entre módulo, service e banco.

O teste unitário é mais rápido. O teste de integração captura problemas que um
mock não consegue detectar, como nomes de colunas ou tipos incompatíveis.

Use os dois níveis conforme o risco da funcionalidade.

## 23. Erros comuns

### `Nest can't resolve dependencies`

Esse erro normalmente significa que o service ou uma dependência dele não foi
registrada.

Verifique:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService],
})
export class UsersModule {}
```

Confirme também o decorator:

```typescript
@InjectRepository(User)
private readonly usersRepository: Repository<User>
```

### O service não está disponível no controller

Verifique se o service está em `providers` e se foi importado corretamente:

```typescript
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

### O repository não é encontrado

Confirme se `forFeature` usa a mesma entity do decorator de injeção:

```typescript
TypeOrmModule.forFeature([User])
@InjectRepository(User)
```

Usar entities diferentes ou imports inconsistentes impede a resolução correta.

### A regra está no lugar errado

Validação de formato simples:

```text
DTO + class-validator
```

Regra que depende do estado do banco:

```text
Service
```

Persistência:

```text
Repository/TypeORM
```

Separar essas responsabilidades facilita a manutenção.

### O service retorna dados demais

Não retorne automaticamente informações sensíveis ou internas. Se necessário,
transforme a entidade em um objeto de resposta:

```typescript
return {
  id: user.id,
  name: user.name,
  email: user.email,
};
```

Em aplicações maiores, use response DTOs ou serializers.

### A consulta retorna registros demais

Adicione filtros, paginação e seleção de colunas. Evite carregar grandes
quantidades de dados sem necessidade.

## 24. Boas práticas

- Use `@Injectable()` nos services gerenciados pelo NestJS.
- Registre services em `providers`.
- Injete dependências pelo construtor.
- Mantenha controllers focados em HTTP.
- Coloque regras de negócio no service.
- Use repositories para persistência.
- Use DTOs para entradas complexas.
- Valide dados antes de persistir.
- Trate registros inexistentes explicitamente.
- Mantenha restrições importantes também no banco.
- Prefira métodos pequenos e com uma responsabilidade.
- Use transações quando várias alterações precisarem ser atômicas.
- Evite retornar entidades com dados sensíveis.
- Escreva testes para regras importantes.
- Não exporte services sem necessidade.
- Evite instanciar services com `new`.
- Evite duplicar regras entre controller e service.

## 25. Checklist final

Antes de considerar um service pronto, confirme:

- [ ] O arquivo segue o padrão `<recurso>.service.ts`.
- [ ] A classe possui `@Injectable()`.
- [ ] O service está em `providers` do módulo.
- [ ] As dependências são injetadas pelo construtor.
- [ ] O repository TypeORM está registrado com `forFeature`.
- [ ] O controller delega operações ao service.
- [ ] As regras de negócio estão no service.
- [ ] Entradas complexas usam DTOs.
- [ ] Dados de entrada são validados.
- [ ] Registros inexistentes geram comportamento definido.
- [ ] Erros de banco são tratados quando necessário.
- [ ] Operações múltiplas usam transação quando necessário.
- [ ] Dados sensíveis não são retornados indevidamente.
- [ ] O service possui testes adequados.
- [ ] O projeto compila com `npm run build`.

## 26. Forma mais simples de criar um service

O service mínimo precisa apenas do decorator `@Injectable`, de uma classe e de
um método:

### 1. Crie o arquivo

```bash
touch src/hello.service.ts
```

### 2. Escreva o service

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloService {
  getMessage() {
    return 'Olá, NestJS!';
  }
}
```

### 3. Registre no módulo

```typescript
import { Module } from '@nestjs/common';
import { HelloService } from './hello.service';

@Module({
  providers: [HelloService],
  exports: [HelloService],
})
export class AppModule {}
```

O service agora pode ser injetado em um controller:

```typescript
import { Controller, Get } from '@nestjs/common';
import { HelloService } from './hello.service';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  getMessage() {
    return { message: this.helloService.getMessage() };
  }
}
```

Para que a rota funcione, registre também o controller:

```typescript
@Module({
  controllers: [HelloController],
  providers: [HelloService],
})
export class AppModule {}
```

Teste:

```bash
curl http://localhost:3000/hello
```

Resposta esperada:

```json
{
  "message": "Olá, NestJS!"
}
```

O caminho mínimo é:

1. Criar uma classe com `@Injectable()`.
2. Adicionar um método.
3. Registrar a classe em `providers`.
4. Injetar o service onde ele será utilizado.
5. Chamar o método.

Para o projeto atual, o mesmo padrão é aplicado ao `UsersService`, com a
adição do `Repository<User>` fornecido pelo TypeORM.
