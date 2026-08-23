# Decorators

Decorators adicionam metadata e comportamento a classes, métodos e parâmetros.
NestJS usa decorators para declarar módulos, rotas, entrada e composição.

## Estado atual

O projeto já usa `@Module`, `@Controller`, `@Get`, `@Post`, `@Body`, `@Injectable`,
`@InjectRepository` e decorators TypeORM.

## 1. `@Controller`

Define o prefixo de rota:

```typescript
@Controller('users')
export class UsersController {}
```

## 2. `@Body`

Lê o corpo inteiro:

```typescript
create(@Body() body: CreateUserDto) {}
```

Ou uma propriedade:

```typescript
create(@Body('email') email: string) {}
```

## 3. `@Param`

Lê parâmetros da URL:

```typescript
@Get(':id')
findOne(@Param('id', ParseIntPipe) id: number) {}
```

## 4. `@Query`

Lê query parameters:

```typescript
@Get()
findAll(@Query('page') page?: string) {}
```

Use DTO e pipes para validar paginação.

## 5. `@Request` e `@Headers`

Request completo:

```typescript
getProfile(@Request() request: Request) {
  return request.user;
}
```

Header específico:

```typescript
get(@Headers('user-agent') userAgent: string) {}
```

Não confie em valores do cliente para autorização.

## 6. `@UseGuards`

Aplica guards a controller ou rota:

```typescript
@UseGuards(JwtAuthGuard)
@Get('me')
getMe() {}
```

## 7. Decorator customizado `@CurrentUser`

```typescript
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
```

Uso:

```typescript
@Get('me')
@UseGuards(JwtAuthGuard)
getMe(@CurrentUser() user: AuthenticatedUser) {
  return user;
}
```

O guard deve executar antes para garantir que `request.user` exista.

## 8. Decorator `@Roles`

```typescript
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
```

Uso:

```typescript
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
@Get('admin')
admin() {}
```

O `RolesGuard` lê metadata com `Reflector`.

## 9. Combinar decorators

Um endpoint pode combinar entrada, segurança e transformação:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@UsePipes(new ValidationPipe({ whitelist: true }))
@Post()
create(@CurrentUser() user: AuthenticatedUser, @Body() body: CreateDto) {}
```

Mantenha combinações fáceis de ler. Extraia conjuntos repetidos para decorators
compostos.

## 10. Decorator composto

```typescript
export const AdminOnly = applyDecorators(
  UseGuards(JwtAuthGuard, RolesGuard),
  Roles(Role.ADMIN),
);
```

Uso:

```typescript
@AdminOnly()
@Get('admin')
admin() {}
```

Não esconda comportamento importante atrás de nomes ambíguos.

## 11. Decorators e responsabilidades

- Decorator de rota: HTTP.
- Decorator de entrada: extração de dados.
- Decorator de segurança: metadata e guards.
- Decorator de validação: DTO/pipes.
- Decorator de persistência: entity TypeORM.

Decorators declaram comportamento, mas a lógica deve continuar na camada correta.

## 12. Checklist

- [ ] Rota possui prefixo claro.
- [ ] Body, params e query são validados.
- [ ] `@CurrentUser` só é usado após autenticação.
- [ ] Roles são verificadas por guard.
- [ ] Decorators compostos têm nome explícito.
- [ ] Metadata não substitui autorização real.
