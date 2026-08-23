# Custom Providers

Providers são objetos gerenciados pelo container de dependências do NestJS.
Services são providers comuns, mas o sistema também permite tokens e fábricas.

## 1. Provider padrão

```typescript
@Module({
  providers: [UsersService],
})
export class UsersModule {}
```

O token padrão é a própria classe `UsersService`.

## 2. `useValue`

Fornece um valor fixo:

```typescript
providers: [
  {
    provide: 'APP_OPTIONS',
    useValue: { timeout: 5000 },
  },
],
```

Injete:

```typescript
constructor(@Inject('APP_OPTIONS') options: AppOptions) {}
```

Útil para configuração simples e mocks.

## 3. `useClass`

Escolhe uma implementação:

```typescript
providers: [
  {
    provide: 'LOGGER',
    useClass: JsonLogger,
  },
],
```

O consumidor depende do token, não da classe concreta.

## 4. `useFactory`

Cria o provider dinamicamente:

```typescript
{
  provide: 'DATABASE_OPTIONS',
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    url: config.getOrThrow<string>('DATABASE_URL'),
  }),
}
```

A factory pode ser assíncrona quando o provider precisar aguardar configuração.

## 5. Tokens customizados

Use constantes para evitar erros de string:

```typescript
export const LOGGER_TOKEN = Symbol('LOGGER');
```

Registro:

```typescript
{ provide: LOGGER_TOKEN, useClass: JsonLogger }
```

Injeção:

```typescript
constructor(@Inject(LOGGER_TOKEN) logger: LoggerPort) {}
```

## 6. Injeção de configurações

```typescript
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'JWT_OPTIONS',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
      }),
    },
  ],
})
export class AuthModule {}
```

Não coloque secrets diretamente no provider.

## 7. Mocks para testes

Substitua um provider:

```typescript
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
```

`useValue` é normalmente o caminho mais simples para unit tests.

## 8. Provider assíncrono

```typescript
{
  provide: 'REMOTE_CLIENT',
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    return createClient(config.getOrThrow('REMOTE_URL'));
  },
}
```

Evite bloquear o boot por uma dependência externa sem timeout.

## 9. Exportar providers

Para outro módulo consumir:

```typescript
@Module({
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

O módulo consumidor deve importar `UsersModule`.

## 10. Boas práticas

- Prefira tokens constantes ou Symbols.
- Use interfaces para contratos conceituais.
- Não injete secrets em logs.
- Mocke dependências externas nos unit tests.
- Mantenha factories pequenas.
- Exporte somente providers necessários.
- Teste providers alternativos.

## 11. Checklist

- [ ] Provider está em `providers`.
- [ ] Token é consistente.
- [ ] Dependências da factory estão em `inject`.
- [ ] Configuração vem do ambiente.
- [ ] Provider necessário foi exportado.
- [ ] Mocks cobrem dependências externas.
