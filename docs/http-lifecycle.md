# Ciclo de vida HTTP

O ciclo HTTP do NestJS descreve como uma request entra na aplicação, passa pelas
camadas e se transforma em response.

## 1. Ordem geral

```text
Request
  -> Middleware
  -> Guards
  -> Interceptors (antes)
  -> Pipes
  -> Controller
  -> Service
  -> Repository/serviço externo
  -> Interceptors (depois)
  -> Response
```

Se uma exception ocorrer, o fluxo passa pelo tratamento de exceptions e pode ser
formatado por um filter.

## 2. Onde autenticar

Autenticação deve ocorrer em Guard:

```text
Authorization header -> JwtAuthGuard -> request.user
```

Middleware pode preparar headers ou request id, mas Guard é o local natural para
decidir acesso a uma rota NestJS.

## 3. Onde autorizar

Autorização acontece depois de saber quem é o usuário:

```text
JwtAuthGuard -> RolesGuard -> Controller
```

Role, permission e ownership devem ser verificados no servidor.

## 4. Onde validar

Valide formato em DTO + `ValidationPipe`:

```typescript
app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
```

Use pipes específicos para ids e valores simples.

## 5. Onde transformar

- Entrada HTTP: Pipes.
- Resultado do handler: Interceptors.
- Modelo de negócio: Service/mapper.
- Persistência: Entity/TypeORM.

Não misture transformação de response com regra de banco sem motivo.

## 6. Onde capturar erros

- Entrada inválida: `ValidationPipe`.
- Recurso inexistente: Service lança `NotFoundException`.
- Conflito: Service lança `ConflictException`.
- Formato global: Exception Filter.
- Diagnóstico: Logger.

## 7. Onde registrar logs

Middleware pode registrar início e fim da request. Interceptor pode medir duração.
Filter pode registrar exceptions.

Use request id em todas as mensagens relacionadas:

```text
requestId=abc method=POST path=/users status=201 durationMs=12
```

## 8. Exemplo do projeto

Para `POST /users`:

1. Middleware opcional cria request id.
2. Guard opcional verifica autenticação.
3. Interceptor inicia medição.
4. Pipes validam body, se configurados.
5. `UsersController.create` extrai `name` e `email`.
6. `UsersService.create` cria e salva `User`.
7. TypeORM acessa MariaDB.
8. Interceptor registra duração.
9. NestJS envia `201 Created`.

## 9. Ordem de escopo

Dentro de cada tipo, a configuração pode ser global, de controller ou de rota.
A ordem final depende do recurso e do adaptador, então consulte testes quando
um comportamento específico for importante.

## 10. Checklist

- [ ] Request id é criado cedo.
- [ ] Guard protege rotas privadas.
- [ ] Pipes validam entrada.
- [ ] Controller apenas coordena HTTP.
- [ ] Service aplica regras.
- [ ] Repository persiste.
- [ ] Interceptor mede ou transforma conscientemente.
- [ ] Filter padroniza erros.
- [ ] Logs não expõem segredos.
