# Logging e observabilidade

Este guia explica como registrar logs úteis, consultar logs do Docker, escolher
níveis e rastrear erros sem expor dados sensíveis.

## 1. Estado atual

A aplicação atual não possui logger customizado. O NestJS oferece um logger
básico, e o Docker mantém os logs enviados para stdout e stderr.

A regra recomendada para containers é escrever logs no console e deixar a
plataforma coletá-los, em vez de gravar arquivos dentro do container.

## 2. Logger nativo do NestJS

Use `Logger`:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  async findAll() {
    this.logger.debug('Listando usuários');
    return this.usersRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}
```

O nome da classe identifica a origem do log.

## 3. Níveis de log

Níveis comuns:

- `log`: evento operacional normal.
- `error`: falha que precisa de investigação.
- `warn`: situação anormal, mas não necessariamente fatal.
- `debug`: detalhes para desenvolvimento.
- `verbose`: diagnóstico mais detalhado.

Configure níveis no bootstrap:

```typescript
const app = await NestFactory.create(AppModule, {
  logger:
    process.env.NODE_ENV === 'production'
      ? ['log', 'warn', 'error']
      : ['log', 'warn', 'error', 'debug', 'verbose'],
});
```

Não deixe `debug` e `verbose` ativos em produção sem avaliar volume e conteúdo.

## 4. O que registrar

Registre eventos úteis:

- Inicialização e encerramento.
- Falha de conexão com dependência.
- Criação de usuário sem dados sensíveis.
- Erros de autenticação agregados.
- Duração ou falha de operações importantes.
- Identificador de request.

Evite logar cada detalhe de cada request sem necessidade. Volume excessivo
prejudica custo, busca e legibilidade.

## 5. O que nunca registrar

Não registre:

- Senhas.
- Hashes de senha.
- JWT ou refresh tokens.
- Chaves secretas.
- `DATABASE_URL` completa.
- Dados pessoais sem necessidade.
- Body completo de endpoints sensíveis.
- Headers `Authorization`.

Faça redaction antes de enviar objetos para o logger.

## 6. Rastreamento de erros

Use um identificador de correlação por request:

```text
X-Request-Id: 7f5d...
```

Middleware simples:

```typescript
import { randomUUID } from 'node:crypto';

app.use((request, response, next) => {
  const requestId = request.header('x-request-id') ?? randomUUID();
  response.setHeader('x-request-id', requestId);
  request.requestId = requestId;
  next();
});
```

Em TypeScript, estenda o tipo de `Request` para declarar `requestId`.

Inclua o id no log:

```typescript
this.logger.error(
  `Falha ao criar usuário requestId=${request.requestId}`,
  error.stack,
);
```

O cliente pode informar um id, mas valide tamanho e formato; não confie nele
como identidade.

## 7. Exception filter

Um filtro global pode registrar exceptions e devolver um formato padronizado:

```typescript
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    this.logger.error({
      path: request.url,
      method: request.method,
      exception,
    });

    response.status(500).json({
      statusCode: 500,
      message: 'Erro interno do servidor',
    });
  }
}
```

Na implementação real, preserve o status de `HttpException` e não serialize o
objeto bruto se ele contiver dados sensíveis. Consulte
[error-handling.md](error-handling.md).

## 8. Logs do Docker

Ver logs de todos os serviços:

```bash
docker compose logs
```

Acompanhar em tempo real:

```bash
docker compose logs -f api
```

Somente últimas linhas:

```bash
docker compose logs --tail=100 api
```

Logs do banco:

```bash
docker compose logs db
```

Como a API escreve em stdout, o Docker consegue coletar esses eventos.

## 9. Formato estruturado

Em produção, JSON facilita busca e integração:

```json
{
  "level": "error",
  "service": "modern-nest",
  "event": "user.create.failed",
  "requestId": "7f5d...",
  "timestamp": "2026-08-23T12:00:00.000Z"
}
```

Bibliotecas como Pino ou Winston podem fornecer transporte, redaction e formato
estruturado. Escolha uma e padronize o uso em toda a aplicação.

## 10. Observabilidade

Logs mostram eventos. Para operação completa, considere:

- Métricas de latência e erro.
- Healthchecks.
- Traces distribuídos.
- Alertas.
- Dashboard.
- Retenção e custo de logs.

Não coloque toda a observabilidade em mensagens de log. Métricas são melhores
para contagens e percentis.

## 11. Retenção

Defina:

- Quanto tempo logs ficam armazenados.
- Quem pode acessá-los.
- Como dados pessoais são removidos.
- Como logs são exportados.
- Quais eventos geram alerta.

Logs podem conter dados pessoais e devem seguir a política de privacidade da
organização.

## 12. Checklist

- [ ] Logger tem contexto de classe ou serviço.
- [ ] Níveis são configurados por ambiente.
- [ ] Logs vão para stdout/stderr em containers.
- [ ] Erros possuem request id.
- [ ] Tokens e senhas são redacted.
- [ ] Exceptions são registradas sem exposição ao cliente.
- [ ] Docker logs podem ser consultados.
- [ ] Existe retenção definida.
- [ ] Métricas e alertas cobrem falhas importantes.
