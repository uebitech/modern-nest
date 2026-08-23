# Testes

Este documento descreve como testar services, controllers e a integração com o
banco nesta aplicação NestJS.

## Estado atual do projeto

O `package.json` atual ainda não possui Jest, `@nestjs/testing` ou scripts de
teste. Os exemplos abaixo mostram a configuração recomendada e não podem ser
executados até que essas dependências sejam instaladas.

## 1. Instale as ferramentas

```bash
npm install --save-dev jest @types/jest ts-jest
npm install --save-dev @nestjs/testing
```

Crie scripts no `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage"
  }
}
```

Para TypeScript, configure Jest com `ts-jest` conforme a estrutura de build do
projeto. Uma configuração simples pode ficar em `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
};
```

## 2. O que testar

A divisão recomendada é:

- **Unitário:** testa uma classe isolada com dependências mockadas.
- **Controller:** testa se rotas delegam corretamente ao service.
- **Integração:** testa várias camadas juntas, normalmente com banco de teste.
- **E2E:** testa a aplicação iniciada como um cliente real faria.

## 3. Teste unitário do service

O `UsersService` depende de `Repository<User>`. Em um teste unitário, use um
mock para não depender do MariaDB.

Arquivo sugerido:

```text
src/users/users.service.spec.ts
```

Exemplo:

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

  it('lista usuários ordenados por data', async () => {
    repository.find.mockResolvedValue([]);

    await expect(service.findAll()).resolves.toEqual([]);
    expect(repository.find).toHaveBeenCalledWith({
      order: { createdAt: 'DESC' },
    });
  });

  it('cria e salva um usuário', async () => {
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
    ).resolves.toEqual(user);

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Ada',
      email: 'ada@example.com',
    });
    expect(repository.save).toHaveBeenCalledWith(user);
  });
});
```

Esse teste verifica a ordenação solicitada e a sequência de criação e gravação
sem abrir uma conexão real.

## 4. Mock do repository

O mock precisa oferecer os métodos usados pelo service:

```typescript
const repositoryMock = {
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
};
```

Associe-o ao token TypeORM:

```typescript
{
  provide: getRepositoryToken(User),
  useValue: repositoryMock,
}
```

Se o service começar a usar `findOneBy`, `update` ou `remove`, adicione esses
métodos ao mock e crie testes para eles.

## 5. Teste do controller

O controller pode ser testado com um service falso. O objetivo é verificar se
as rotas chamam o método correto e encaminham os dados.

Arquivo sugerido:

```text
src/users/users.controller.spec.ts
```

Exemplo:

```typescript
import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const serviceMock = {
    findAll: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersController);
    jest.clearAllMocks();
  });

  it('delega a listagem ao service', async () => {
    const users = [{ id: 1, name: 'Ada' }];
    serviceMock.findAll.mockResolvedValue(users);

    await expect(controller.findAll()).resolves.toEqual(users);
    expect(serviceMock.findAll).toHaveBeenCalledTimes(1);
  });

  it('delega nome e e-mail ao service', async () => {
    const user = { id: 1, name: 'Ada', email: 'ada@example.com' };
    serviceMock.create.mockResolvedValue(user);

    await expect(
      controller.create({ name: 'Ada', email: 'ada@example.com' }),
    ).resolves.toEqual(user);

    expect(serviceMock.create).toHaveBeenCalledWith(
      'Ada',
      'ada@example.com',
    );
  });
});
```

Esse teste não precisa de TypeORM nem de MariaDB porque o service está mockado.

## 6. Teste de integração

O teste de integração verifica a interação entre módulo, service, repository e
banco real ou de teste.

Antes do teste:

1. Crie um banco separado, como `appdb_test`.
2. Use credenciais específicas de teste.
3. Não use o volume de desenvolvimento sem limpar os dados.
4. Execute migrations ou sincronização controlada.
5. Limpe os registros entre os testes.

O objetivo é validar coisas que mocks não capturam:

- Nome real da tabela.
- Tipos das colunas.
- Coluna única de `email`.
- Geração de `id`.
- Preenchimento de `createdAt`.
- Consultas TypeORM contra MariaDB.

Exemplo conceitual de teste:

```typescript
describe('Users integration', () => {
  it('persiste e recupera um usuário', async () => {
    const created = await service.create('Ada', 'ada@example.com');
    const users = await service.findAll();

    expect(created.email).toBe('ada@example.com');
    expect(users).toHaveLength(1);
  });
});
```

Não execute esse tipo de teste contra um banco de produção.

## 7. Teste end-to-end

Um teste E2E inicializa a aplicação e faz requests HTTP:

```typescript
import request from 'supertest';
```

Instale:

```bash
npm install --save-dev supertest @types/supertest
```

Exemplo conceitual:

```typescript
it('POST /users cria um usuário', async () => {
  const response = await request(app.getHttpServer())
    .post('/users')
    .send({ name: 'Ada', email: 'ada@example.com' })
    .expect(201);

  expect(response.body.email).toBe('ada@example.com');
});
```

Esse nível verifica controller, service, TypeORM e a resposta HTTP juntos.

## 8. Comandos

Depois de configurar Jest:

```bash
npm test
```

Executar em modo watch:

```bash
npm run test:watch
```

Gerar cobertura:

```bash
npm run test:cov
```

Executar um arquivo específico:

```bash
npx jest src/users/users.service.spec.ts
```

Executar apenas testes cujo nome corresponda a um padrão:

```bash
npx jest -t "cria e salva"
```

## 9. Boas práticas

- Unitários devem ser rápidos e isolados.
- Mocke repositories em testes unitários.
- Teste regras de negócio, não detalhes internos irrelevantes.
- Use integração para validar TypeORM e banco.
- Use E2E para validar contratos HTTP importantes.
- Separe banco de teste do banco de desenvolvimento.
- Limpe dados entre casos.
- Não dependa da ordem global dos testes.
- Verifique casos de sucesso e erro.
- Teste e-mail duplicado quando o tratamento de conflito for implementado.
- Adicione testes quando uma nova rota ou regra for criada.

## 10. Checklist

- [ ] Jest instalado.
- [ ] `@nestjs/testing` instalado.
- [ ] Script `test` configurado.
- [ ] Configuração TypeScript do Jest criada.
- [ ] Service testado com repository mockado.
- [ ] Controller testado com service mockado.
- [ ] Integração testada com banco separado.
- [ ] Endpoints críticos testados com E2E.
- [ ] Cobertura analisada.
