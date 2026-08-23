# Health check

Health checks informam se um processo está vivo e se consegue atender requests.

## Estado atual

O `compose.yml` possui healthcheck para o MariaDB, mas a API ainda não possui
endpoint `/health`. Os exemplos abaixo descrevem a implementação recomendada.

## 1. Liveness e readiness

- **Liveness:** o processo está vivo e não precisa ser reiniciado.
- **Readiness:** o processo está pronto para receber tráfego e acessar dependências.

Não confunda processo vivo com aplicação pronta.

## 2. Endpoint simples

Crie um `HealthController`:

```typescript
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
```

Registre-o no módulo:

```typescript
@Module({
  controllers: [HealthController],
})
export class AppModule {}
```

Teste:

```bash
curl http://localhost:3001/health
```

Resposta:

```json
{"status":"ok"}
```

## 3. Health check com Terminus

Para verificar dependências, use `@nestjs/terminus`:

```bash
npm install @nestjs/terminus
```

Exemplo conceitual:

```typescript
@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async check() {
    await this.dataSource.query('SELECT 1');
    return { status: 'ok', database: 'up' };
  }
}
```

Uma falha no banco deve tornar a readiness indisponível, sem necessariamente
indicar que o processo precisa ser reiniciado.

## 4. Healthcheck Docker

Exemplo para a API:

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
  interval: 10s
  timeout: 5s
  retries: 5
```

A imagem Alpine precisa possuir `wget` para esse comando; confirme isso na
imagem antes de usar a configuração.

## 5. Healthcheck atual do banco

O banco já usa:

```yaml
healthcheck:
  test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
```

A API depende de `service_healthy`, controlando a ordem inicial dos containers.
Isso não substitui retry ou tratamento de perda de conexão depois do boot.

## 6. Segurança

Health endpoints não devem expor:

- Credenciais.
- Versões desnecessárias.
- URLs internas.
- Stack traces.
- Dados de usuários.

Se houver informações operacionais detalhadas, restrinja o endpoint de readiness.

## 7. Checklist

- [ ] Existe endpoint de liveness.
- [ ] Readiness verifica dependências necessárias.
- [ ] Healthcheck Docker usa ferramenta presente na imagem.
- [ ] Falhas retornam status não saudável.
- [ ] Resposta não expõe segredos.
- [ ] Deploy aguarda readiness.
