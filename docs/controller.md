# Como criar um Controller com NestJS

Este documento explica, passo a passo, como criar um controller em uma
aplicação NestJS.

Um controller é a camada que recebe requisições HTTP, identifica a rota e
repassa os dados para um service. Ele normalmente não deve conter consultas SQL
nem regras complexas de persistência. Essas responsabilidades ficam no service
e no repository.

Neste projeto, o controller de usuários está em:

```text
src/users/users.controller.ts
```

Ele expõe atualmente:

| Método HTTP | Rota | Responsabilidade |
| --- | --- | --- |
| `GET` | `/users` | Listar usuários |
| `POST` | `/users` | Criar um usuário |

## 1. Pré-requisitos

Para acompanhar o exemplo, tenha instalado:

- Node.js 22 ou versão compatível com o projeto.
- npm.
- TypeScript.
- NestJS CLI, disponível como dependência de desenvolvimento neste projeto.
- Um projeto NestJS já inicializado.

Instale as dependências:

```bash
npm install
```

As dependências mais relevantes para controllers são:

- `@nestjs/common`: fornece `Controller`, `Get`, `Post`, `Body` e outros
  decorators HTTP.
- `@nestjs/core`: inicializa a aplicação NestJS.
- `@nestjs/platform-express`: fornece o adaptador HTTP padrão.
- `reflect-metadata`: permite que os decorators funcionem em tempo de execução.

## 2. O que é um controller

Um controller é uma classe responsável por organizar endpoints relacionados a
uma parte da aplicação.

Ele faz a ponte entre:

```text
Cliente HTTP -> Controller -> Service -> Repository/Entity -> Banco de dados
```

Cada parte possui uma responsabilidade diferente:

- **Cliente HTTP:** envia método, URL, headers, parâmetros e body.
- **Controller:** recebe a requisição e extrai seus dados.
- **Service:** executa regras de negócio e coordena operações.
- **Repository:** consulta ou grava dados.
- **Entity:** representa a estrutura persistida no banco.

Um controller não precisa conhecer os detalhes de conexão do banco. No projeto
atual, `UsersController` chama `UsersService`, e o service usa o repository do
TypeORM.

## 3. Crie a pasta do recurso

Organize os arquivos por funcionalidade:

```text
src/
└── users/
    ├── user.entity.ts
    ├── users.controller.ts
    ├── users.module.ts
    └── users.service.ts
```

Para criar apenas o arquivo do controller:

```bash
mkdir -p src/users
touch src/users/users.controller.ts
```

A pasta pode conter outros arquivos do mesmo recurso. Isso facilita encontrar a
entity, o service, o controller e o módulo que trabalham juntos.

## 4. Importe os decorators

Comece importando os decorators necessários:

```typescript
import { Body, Controller, Get, Post } from '@nestjs/common';
```

Cada decorator tem uma função:

- `Controller`: marca uma classe como controller e define um prefixo de rota.
- `Get`: associa um método à requisição HTTP `GET`.
- `Post`: associa um método à requisição HTTP `POST`.
- `Body`: extrai o corpo da requisição.

Depois importe o service que será utilizado:

```typescript
import { UsersService } from './users.service';
```

O caminho relativo `./users.service` indica que o service está na mesma pasta
do controller.

## 5. Declare o controller

A estrutura mínima é:

```typescript
import { Controller } from '@nestjs/common';

@Controller('users')
export class UsersController {}
```

O valor `'users'` é o prefixo de todas as rotas da classe.

Por isso, um método com `@Get()` dentro dessa classe responde a:

```text
GET /users
```

E um método com `@Get(':id')` responderia a:

```text
GET /users/123
```

O prefixo evita repetir `users` em cada método e mantém as rotas agrupadas.

## 6. Injete o service

O controller precisa delegar o trabalho para um service:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
```

O NestJS identifica o parâmetro do construtor e injeta uma instância de
`UsersService`.

### O que significa `private readonly`

- `private`: a propriedade é usada internamente pela classe.
- `readonly`: a referência não deve ser substituída depois da construção.
- `usersService`: nome da dependência injetada.
- `UsersService`: tipo da dependência.

Não é necessário chamar `new UsersService()` manualmente. O container de
injeção de dependências do NestJS cria e gerencia o service.

## 7. Registre o controller no módulo

Criar a classe não basta. O controller precisa ser registrado no módulo do
recurso:

```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

As propriedades do módulo significam:

- `controllers`: classes que recebem requisições HTTP.
- `providers`: services e outros objetos gerenciados pelo NestJS.
- `imports`: módulos cujos providers são necessários.

No projeto atual, o módulo também importa o repository da entity:

```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
```

Essa configuração permite que o `UsersService` receba `Repository<User>`.

Se o controller não estiver em `controllers`, o NestJS não registrará suas
rotas. Se o service não estiver em `providers`, a injeção de dependência falhará.

## 8. Crie uma rota GET

Uma rota para listar todos os usuários pode ser escrita assim:

```typescript
@Get()
findAll() {
  return this.usersService.findAll();
}
```

Como o controller possui o prefixo `users`, essa rota fica disponível em:

```text
GET /users
```

O retorno do service é repassado ao NestJS. Se o service retornar uma Promise,
o NestJS aguardará seu resultado e o converterá para uma resposta JSON.

O método atual do service ordena os usuários mais recentes primeiro:

```typescript
findAll() {
  return this.usersRepository.find({
    order: { createdAt: 'DESC' },
  });
}
```

O controller não precisa saber como essa consulta é feita.

## 9. Crie uma rota POST

Para criar um usuário, use `@Post` e `@Body`:

```typescript
@Post()
create(@Body() body: { name: string; email: string }) {
  return this.usersService.create(body.name, body.email);
}
```

Essa rota fica disponível em:

```text
POST /users
```

Com o seguinte JSON:

```json
{
  "name": "Ada",
  "email": "ada@example.com"
}
```

O decorator `@Body()` extrai o JSON do corpo HTTP e o coloca na variável
`body`.

O controller seleciona os campos permitidos e envia-os ao service:

```typescript
this.usersService.create(body.name, body.email);
```

Essa seleção evita encaminhar automaticamente propriedades desconhecidas para a
camada de persistência.

## 10. Controller completo do projeto

O arquivo atual `src/users/users.controller.ts` possui esta estrutura:

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

O fluxo de cada método é:

### `findAll`

1. O cliente envia `GET /users`.
2. O NestJS encontra o método marcado com `@Get()`.
3. O controller chama `usersService.findAll()`.
4. O service consulta o repository.
5. O NestJS serializa a lista para JSON.

### `create`

1. O cliente envia `POST /users` com um body JSON.
2. `@Body()` extrai o conteúdo recebido.
3. O controller lê `name` e `email`.
4. O controller chama `usersService.create(...)`.
5. O service cria e salva a entity.
6. O NestJS devolve o usuário persistido como JSON.

## 11. Teste as rotas

Com a aplicação rodando localmente na porta `3001`, liste usuários:

```bash
curl http://localhost:3001/users
```

A resposta inicial pode ser:

```json
[]
```

Crie um usuário:

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

Uma resposta possível é:

```json
{
  "id": 1,
  "name": "Ada",
  "email": "ada@example.com",
  "createdAt": "2026-08-23T12:00:00.000Z"
}
```

Consulte novamente:

```bash
curl http://localhost:3001/users
```

Com a aplicação executando pelo Docker Compose, use a porta `3000`:

```bash
curl http://localhost:3000/users
```

## 12. Como funciona o `@Body`

O body é o conteúdo enviado dentro da requisição HTTP.

Exemplo de requisição:

```http
POST /users HTTP/1.1
Content-Type: application/json

{"name":"Ada","email":"ada@example.com"}
```

O parâmetro abaixo recebe o objeto JSON:

```typescript
create(@Body() body: { name: string; email: string }) {
  return this.usersService.create(body.name, body.email);
}
```

O header `Content-Type: application/json` informa ao NestJS como interpretar o
corpo.

### Selecionar um campo específico

Também é possível extrair apenas uma propriedade:

```typescript
create(@Body('email') email: string) {
  return this.usersService.create('Nome padrão', email);
}
```

Na prática, receber um objeto ou DTO costuma ser mais apropriado quando vários
campos fazem parte do contrato.

## 13. Use DTOs em vez de tipos inline

O tipo inline atual é simples e funciona:

```typescript
body: { name: string; email: string }
```

Quando o projeto cresce, crie um DTO (Data Transfer Object) separado:

```text
src/users/dto/create-user.dto.ts
```

Conteúdo:

```typescript
export class CreateUserDto {
  name!: string;
  email!: string;
}
```

Use o DTO no controller:

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Post()
create(@Body() body: CreateUserDto) {
  return this.usersService.create(body.name, body.email);
}
```

O DTO melhora a organização e pode receber decorators de validação.

## 14. Adicione validação ao body

Para validar dados recebidos, instale:

```bash
npm install class-validator class-transformer
```

Adicione regras ao DTO:

```typescript
import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name!: string;

  @IsEmail()
  email!: string;
}
```

Ative o `ValidationPipe` no arquivo de inicialização:

```typescript
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
```

As opções fazem o seguinte:

- `whitelist: true`: remove propriedades sem decorators de validação.
- `forbidNonWhitelisted: true`: rejeita propriedades desconhecidas em vez de
  removê-las silenciosamente.
- `transform: true`: converte valores quando possível para o tipo declarado.

Com isso, um body inválido como este:

```json
{
  "name": "A",
  "email": "email-invalido",
  "admin": true
}
```

pode resultar em `400 Bad Request`.

A validação deve ocorrer antes do service para que dados inválidos não cheguem
à camada de negócio.

## 15. Rotas com parâmetros

Para buscar um usuário pelo id:

```typescript
import { Controller, Get, Param } from '@nestjs/common';

@Get(':id')
findOne(@Param('id') id: string) {
  return this.usersService.findOne(Number(id));
}
```

A rota será:

```text
GET /users/10
```

O valor capturado por `@Param('id')` chega inicialmente como texto. Converta-o
para número antes de enviá-lo ao service, ou use um pipe:

```typescript
import { ParseIntPipe } from '@nestjs/common';

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.findOne(id);
}
```

Com `ParseIntPipe`, um valor que não pode ser convertido para inteiro provoca
uma resposta `400 Bad Request` automaticamente.

## 16. Query parameters

Use `@Query` para filtros, paginação e ordenação:

```typescript
import { Controller, Get, Query } from '@nestjs/common';

@Get()
findAll(@Query('name') name?: string) {
  return this.usersService.findAll(name);
}
```

A requisição seria:

```text
GET /users?name=Ada
```

Para receber vários parâmetros:

```typescript
@Get()
findAll(@Query() query: { page?: number; limit?: number }) {
  return this.usersService.findAll(query);
}
```

Em aplicações reais, use DTOs e pipes de transformação para validar `page` e
`limit`.

## 17. Códigos de status HTTP

O NestJS normalmente escolhe códigos padrão:

- `GET`: `200 OK`.
- `POST`: `201 Created`.
- Body inválido: `400 Bad Request` quando há `ValidationPipe`.
- Recurso inexistente: normalmente `404 Not Found`.
- Conflito de unicidade: pode ser `409 Conflict`.

Você pode definir explicitamente um status:

```typescript
import { HttpCode, HttpStatus, Post } from '@nestjs/common';

@Post()
@HttpCode(HttpStatus.CREATED)
create(@Body() body: CreateUserDto) {
  return this.usersService.create(body.name, body.email);
}
```

Para a rota POST, o status `201` já é o comportamento padrão do NestJS, então o
decorator acima é opcional.

## 18. Tratamento de erros

O controller pode permitir que exceções do NestJS sejam tratadas pelo framework:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.findOne(id);
}
```

O service pode lançar uma exceção apropriada:

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

Evite colocar toda a regra de busca no controller. O controller deve apenas
receber o id e delegar a operação.

Para erros de e-mail duplicado, a aplicação pode capturar a exceção específica
do banco e convertê-la em `ConflictException`.

## 19. Quando usar decorators de resposta

Na maioria dos casos, retornar um valor diretamente é a opção mais simples:

```typescript
@Get()
findAll() {
  return this.usersService.findAll();
}
```

Use `@Res()` apenas quando realmente precisar controlar diretamente a resposta
do Express. Misturar retorno direto e `@Res()` pode mudar o comportamento do
NestJS e dificultar testes.

Retorno direto recomendado:

```typescript
@Post()
create(@Body() body: CreateUserDto) {
  return this.usersService.create(body.name, body.email);
}
```

Resposta manual, quando necessária:

```typescript
import { Res } from '@nestjs/common';
import { Response } from 'express';

@Get()
findAll(@Res() response: Response) {
  return response.status(200).json([]);
}
```

A abordagem manual deve ser usada com parcimônia, pois acopla o controller ao
Express.

## 20. Rotas CRUD comuns

Um controller de usuários completo pode possuir:

```typescript
@Get()
findAll() {}

@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}

@Post()
create(@Body() body: CreateUserDto) {}

@Patch(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: UpdateUserDto,
) {}

@Delete(':id')
remove(@Param('id', ParseIntPipe) id: number) {}
```

Os endpoints correspondentes seriam:

| Método | Rota | Ação |
| --- | --- | --- |
| `GET` | `/users` | Listar |
| `GET` | `/users/:id` | Buscar um |
| `POST` | `/users` | Criar |
| `PATCH` | `/users/:id` | Atualizar parcialmente |
| `DELETE` | `/users/:id` | Remover |

Não é necessário criar todas as operações de uma vez. Comece pelas ações que
a aplicação realmente precisa.

## 21. Exemplo mínimo completo

A forma mais simples de criar um controller é:

### Service

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class HelloService {
  getMessage() {
    return { message: 'Olá, NestJS!' };
  }
}
```

### Controller

```typescript
import { Controller, Get } from '@nestjs/common';
import { HelloService } from './hello.service';

@Controller('hello')
export class HelloController {
  constructor(private readonly helloService: HelloService) {}

  @Get()
  getMessage() {
    return this.helloService.getMessage();
  }
}
```

### Módulo

```typescript
import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';
import { HelloService } from './hello.service';

@Module({
  controllers: [HelloController],
  providers: [HelloService],
})
export class HelloModule {}
```

### Módulo-raiz

```typescript
import { Module } from '@nestjs/common';
import { HelloModule } from './hello/hello.module';

@Module({
  imports: [HelloModule],
})
export class AppModule {}
```

### Teste

```bash
curl http://localhost:3000/hello
```

Resposta:

```json
{
  "message": "Olá, NestJS!"
}
```

O ponto mais importante é que `HelloController` precisa estar em
`controllers`, `HelloService` em `providers` e `HelloModule` em `imports` do
módulo-raiz.

## 22. Exemplo aplicado ao projeto atual

Para o recurso de usuários, os passos são:

1. Criar `users.controller.ts`.
2. Importar `Body`, `Controller`, `Get` e `Post`.
3. Importar `UsersService`.
4. Aplicar `@Controller('users')`.
5. Injetar `UsersService` no construtor.
6. Criar `findAll` com `@Get()`.
7. Criar `create` com `@Post()` e `@Body()`.
8. Registrar `UsersController` em `UsersModule`.
9. Incluir `UsersModule` no `AppModule`.
10. Testar com `curl`.

A implementação mínima correspondente é:

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

## 23. Erros comuns

### A rota retorna 404

Verifique:

- Se o método possui o decorator correto, como `@Get()` ou `@Post()`.
- Se o prefixo está correto, como `@Controller('users')`.
- Se o controller está em `controllers` no módulo.
- Se o módulo funcional está importado pelo `AppModule`.
- Se a requisição usa a porta correta.

### O service não pode ser injetado

Verifique se o service está em `providers`:

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

Se o service usa um repository TypeORM, verifique também:

```typescript
imports: [TypeOrmModule.forFeature([User])]
```

### O body chega vazio

Confirme:

- Se o header é `content-type: application/json`.
- Se o JSON está válido.
- Se o método realmente usa `@Body()`.
- Se a requisição está enviando conteúdo no body.

Exemplo correto:

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

### O TypeScript aceita campos, mas a API não valida

Tipos TypeScript são removidos durante a execução. A anotação:

```typescript
body: { name: string; email: string }
```

ajuda o compilador, mas não valida automaticamente requisições em runtime.
Para validação real, use DTOs, `class-validator` e `ValidationPipe`.

### A rota chama a operação errada

Compare o verbo HTTP e o decorator:

```typescript
@Get()
findAll() {}

@Post()
create() {}
```

`GET /users` não chama um método marcado com `@Post()`, e `POST /users` não
chama um método marcado com `@Get()`.

## 24. Boas práticas

- Mantenha controllers pequenos e focados em HTTP.
- Delegue regras de negócio para services.
- Não acesse repositories diretamente no controller.
- Use DTOs para contratos maiores ou reutilizados.
- Valide body, parâmetros e query parameters.
- Use `ParseIntPipe` para ids numéricos.
- Retorne exceções HTTP apropriadas.
- Evite expor dados sensíveis diretamente.
- Adicione testes para cada rota pública.
- Use nomes de rota consistentes e no plural para coleções.
- Não coloque senha ou credenciais no body de resposta.
- Documente respostas diferentes quando a API crescer.

## 25. Checklist final

Antes de considerar um controller pronto, confirme:

- [ ] A classe possui `@Controller`.
- [ ] O prefixo da rota está correto.
- [ ] Cada método possui o decorator HTTP adequado.
- [ ] O controller foi registrado em `controllers`.
- [ ] Os services foram registrados em `providers`.
- [ ] As dependências são injetadas pelo construtor.
- [ ] O body possui DTO ou tipo adequado.
- [ ] A entrada é validada quando necessário.
- [ ] Parâmetros numéricos usam pipe de conversão.
- [ ] O controller delega regras ao service.
- [ ] Os erros retornam status HTTP coerentes.
- [ ] Os endpoints foram testados com sucesso.
- [ ] O projeto compila com `npm run build`.

## 26. Resumo mais simples

Para criar um controller, você precisa de quatro coisas:

```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }
}
```

1. `@Controller('users')` define o prefixo.
2. `@Get()` define a rota HTTP.
3. O construtor recebe o service.
4. O método delega a operação ao service.
5. O controller é registrado no módulo.

Esse é o caminho mínimo para criar um controller funcional no NestJS.

## 27. Forma mais simples de criar um controller

O exemplo mínimo precisa apenas de três partes: criar um arquivo, aplicar
`@Controller` na classe e aplicar `@Get` em um método.

### 1. Crie o arquivo

```bash
touch src/hello.controller.ts
```

### 2. Escreva o controller

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

### 3. Registre no módulo

```typescript
import { Module } from '@nestjs/common';
import { HelloController } from './hello.controller';

@Module({
  controllers: [HelloController],
})
export class AppModule {}
```

### 4. Teste a rota

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

O que aconteceu:

1. `@Controller('hello')` criou o prefixo `/hello`.
2. `@Get()` criou a rota `GET /hello`.
3. `sayHello()` retornou um objeto JavaScript.
4. O NestJS converteu o objeto automaticamente para JSON.

Esse é o controller funcional mais simples possível. Depois, você pode
adicionar um service, receber dados com `@Body()`, parâmetros com `@Param()` ou
filtros com `@Query()` conforme a necessidade do recurso.
