# DTOs e validação

DTO significa **Data Transfer Object**. É um objeto usado para definir os dados
que entram ou saem de uma camada da aplicação.

Neste projeto, o controller atualmente usa um tipo inline:

```typescript
create(@Body() body: { name: string; email: string }) {
  return this.usersService.create(body.name, body.email);
}
```

Essa abordagem é simples, mas tipos TypeScript desaparecem quando o código é
executado. Portanto, eles não validam automaticamente requests reais.

## 1. DTO versus Entity

| DTO | Entity |
| --- | --- |
| Define o contrato de entrada/saída da API | Representa a tabela do banco |
| Pode conter decorators de validação | Contém decorators do TypeORM |
| Pode omitir ou transformar campos | Possui campos persistidos |
| Não precisa ser salvo diretamente | É usada pelo repository |

Entity atual:

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

O cliente não deve enviar `id` ou `createdAt` na criação. Esses campos são
responsabilidade da persistência, não do DTO de criação.

## 2. Instale as bibliotecas de validação

```bash
npm install class-validator class-transformer
```

- `class-validator`: fornece decorators como `IsEmail` e `IsNotEmpty`.
- `class-transformer`: transforma o body em uma instância da classe DTO.

## 3. Crie `CreateUserDto`

Crie a pasta e o arquivo:

```bash
mkdir -p src/users/dto
touch src/users/dto/create-user.dto.ts
```

Conteúdo:

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

Regras:

- `IsString`: exige texto.
- `IsNotEmpty`: impede valor vazio.
- `Length(2, 120)`: limita o nome entre 2 e 120 caracteres.
- `IsEmail`: exige um formato de e-mail válido.

## 4. Crie `UpdateUserDto`

Atualizações normalmente são parciais. O cliente pode alterar apenas um campo.

Uma forma simples:

```typescript
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
```

`IsOptional` permite que o campo não seja enviado, mas, se for enviado, as
outras regras ainda serão aplicadas.

Uma alternativa comum em projetos NestJS é usar `PartialType`:

```bash
npm install @nestjs/mapped-types
```

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

## 5. Use o DTO no controller

Atualize o controller:

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Post()
create(@Body() body: CreateUserDto) {
  return this.usersService.create(body.name, body.email);
}
```

Para atualização:

```typescript
import { Body, Param, Patch, ParseIntPipe } from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';

@Patch(':id')
update(
  @Param('id', ParseIntPipe) id: number,
  @Body() body: UpdateUserDto,
) {
  return this.usersService.update(id, body);
}
```

O controller recebe o DTO e delega ao service. Ele não deve conter toda a regra
para atualizar o banco.

## 6. Ative o `ValidationPipe`

No `src/main.ts`:

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

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
```

Opções:

- `whitelist`: considera apenas propriedades com decorators de validação.
- `forbidNonWhitelisted`: rejeita propriedades desconhecidas com `400`.
- `transform`: transforma o body em instâncias e converte valores quando
  possível.

Sem esse pipe, os decorators do DTO não são aplicados automaticamente às
requisições.

## 7. Teste a validação

Request válida:

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com"}'
```

Request inválida:

```bash
curl -X POST http://localhost:3001/users \
  -H 'content-type: application/json' \
  -d '{"name":"A","email":"invalido","extra":true}'
```

Com `ValidationPipe`, a segunda request deve retornar `400 Bad Request`.

## 8. DTO de resposta

Não é obrigatório devolver a entity diretamente. Para controlar o formato:

```typescript
export class UserResponseDto {
  id!: number;
  name!: string;
  email!: string;
  createdAt!: Date;
}
```

O service ou um mapper pode construir esse objeto explicitamente:

```typescript
return {
  id: user.id,
  name: user.name,
  email: user.email,
  createdAt: user.createdAt,
};
```

Essa estratégia ajuda a evitar exposição acidental de campos internos quando a
entity crescer.

## 9. Erros comuns

### DTO não valida

Verifique se:

- As bibliotecas estão instaladas.
- Os decorators foram importados de `class-validator`.
- `ValidationPipe` foi registrado.
- O controller usa o DTO no parâmetro `@Body()`.

### Campo extra é aceito

Ative `whitelist` e `forbidNonWhitelisted`.

### `PartialType` não encontrado

Instale `@nestjs/mapped-types` e confirme o import correto.

### DTO e entity ficaram iguais

Eles podem compartilhar propriedades, mas têm objetivos diferentes. Não inclua
no DTO de criação campos gerados pelo banco como `id` e `createdAt`.

## 10. Checklist

- [ ] DTO de criação criado.
- [ ] DTO de atualização criado.
- [ ] Campos obrigatórios validados.
- [ ] E-mail validado com `IsEmail`.
- [ ] `ValidationPipe` configurado.
- [ ] Campos desconhecidos rejeitados.
- [ ] Entity não usada como contrato de entrada automaticamente.
- [ ] Requests válidas e inválidas testadas.
