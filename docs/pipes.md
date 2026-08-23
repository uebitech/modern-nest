# Pipes

Pipes transformam ou validam dados antes que eles cheguem ao método do
controller.

## 1. O que são Pipes

Um pipe implementa `PipeTransform`:

```typescript
import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class ExamplePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    return value;
  }
}
```

O valor retornado chega ao controller. Uma exception interrompe a request.

## 2. `ValidationPipe`

Instale validação:

```bash
npm install class-validator class-transformer
```

Ative globalmente:

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
);
```

- `whitelist`: considera campos validados.
- `forbidNonWhitelisted`: rejeita campos desconhecidos.
- `transform`: converte e transforma valores.

## 3. Validação com DTO

```typescript
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;
}
```

Controller:

```typescript
@Post()
create(@Body() body: CreateUserDto) {
  return this.usersService.create(body.name, body.email);
}
```

Entrada inválida deve resultar em `400 Bad Request`.

## 4. `ParseIntPipe`

Converta e valide ids:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {
  return this.usersService.findOne(id);
}
```

`GET /users/abc` falha com `400`; `GET /users/10` chega como número `10`.

## 5. Pipes globais

Aplicam-se à aplicação inteira:

```typescript
app.useGlobalPipes(new ValidationPipe());
```

Use para validação comum, mas avalie impacto em todos os endpoints.

## 6. Pipes de método

Aplique a um método:

```typescript
@UsePipes(new ValidationPipe({ whitelist: true }))
@Post()
create(@Body() body: CreateUserDto) {
  return body;
}
```

## 7. Pipes de parâmetro

Aplique a um parâmetro específico:

```typescript
findOne(@Param('id', ParseIntPipe) id: number) {}
```

Também é possível usar `DefaultValuePipe`:

```typescript
findAll(
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
) {}
```

## 8. Transformação

Um pipe pode normalizar entrada:

```typescript
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown) {
    return typeof value === 'string' ? value.trim() : value;
  }
}
```

Uso:

```typescript
create(@Body('name', TrimPipe) name: string) {}
```

Não transforme dados de modo surpreendente. Documente normalizações importantes.

## 9. Pipe customizado com erro

```typescript
@Injectable()
export class PositiveIntPipe implements PipeTransform {
  transform(value: string) {
    const numberValue = Number(value);

    if (!Number.isInteger(numberValue) || numberValue <= 0) {
      throw new BadRequestException('O valor deve ser um inteiro positivo');
    }

    return numberValue;
  }
}
```

## 10. Erros `400 Bad Request`

Pipes devem usar `BadRequestException` para entrada inválida:

```typescript
throw new BadRequestException('Parâmetro inválido');
```

Não use `404` para formato inválido. `404` representa recurso ou rota não
existente.

## 11. Ordem e responsabilidade

Pipes executam depois dos guards e antes do controller:

```text
Guards -> Interceptors antes -> Pipes -> Controller
```

Pipes transformam e validam. Eles não devem consultar banco ou decidir
permissões.

## 12. Testes

```typescript
it('converte id positivo', () => {
  expect(new PositiveIntPipe().transform('4')).toBe(4);
});

it('rejeita id inválido', () => {
  expect(() => new PositiveIntPipe().transform('0')).toThrow(
    BadRequestException,
  );
});
```

## 13. Checklist

- [ ] DTO possui decorators de validação.
- [ ] `ValidationPipe` foi ativado.
- [ ] Params numéricos usam `ParseIntPipe`.
- [ ] Campos desconhecidos são tratados.
- [ ] Pipes lançam `400` para entrada inválida.
- [ ] Transformações são previsíveis.
- [ ] Pipes possuem testes.
