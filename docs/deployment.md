# Deploy

Este guia mostra como construir a imagem, executar a aplicação em um servidor,
configurar variáveis de produção, verificar saúde e aplicar migrations.

## 1. Estado atual

O projeto já possui um `Dockerfile` multi-stage e um `compose.yml` com API e
MariaDB. O Compose é adequado para desenvolvimento e ambientes pequenos, mas
produção deve considerar armazenamento, backups, secrets, TLS, monitoramento e
alta disponibilidade.

## 2. Build da imagem

O Dockerfile possui duas etapas:

1. `build`: instala dependências e compila TypeScript.
2. `runtime`: instala somente dependências de produção e copia `dist`.

Construa:

```bash
docker build -t modern-nest:local .
```

Teste a imagem com uma URL de banco acessível:

```bash
docker run --rm \
  -e DATABASE_URL='mysql://app:app@host.docker.internal:3307/appdb' \
  -e PORT=3000 \
  -p 3000:3000 \
  modern-nest:local
```

Em Linux, `host.docker.internal` pode exigir configuração adicional. Em
produção, prefira um hostname de banco real ou uma rede privada.

## 3. Tags e registry

Use tags imutáveis:

```bash
docker build -t registry.example.com/modern-nest:1.0.0 .
docker push registry.example.com/modern-nest:1.0.0
```

Evite depender apenas de `latest`, pois isso dificulta rollback e auditoria.

## 4. Deploy com Compose

Para executar o conjunto atual:

```bash
docker compose -f compose.yml up -d --build
```

Verifique:

```bash
docker compose ps
docker compose logs -f api
```

Pare a aplicação:

```bash
docker compose down
```

Em produção, não use `down -v` automaticamente: isso pode apagar dados do
volume.

## 5. Variáveis de produção

Nunca use os valores padrão do Compose em produção. Injete secrets pelo
servidor, CI/CD, secret manager ou mecanismo equivalente:

```env
DATABASE_URL=mysql://app_prod:<senha>@db.internal:3306/appdb
PORT=3000
NODE_ENV=production
```

Variáveis comuns adicionais:

```env
JWT_SECRET=<segredo>
CORS_ORIGIN=https://app.example.com
LOG_LEVEL=info
```

Não grave secrets em Dockerfile, imagem, Git ou logs.

## 6. Servidor

Um servidor precisa de:

- Docker Engine e Compose ou um orquestrador.
- Firewall restritivo.
- DNS.
- HTTPS via proxy ou load balancer.
- Backup do banco.
- Monitoramento de CPU, memória, disco e rede.
- Política de atualização.

Exponha publicamente somente o proxy/API necessário. O banco deve ficar em rede
privada sempre que possível.

## 7. Healthcheck

O `db` já possui healthcheck:

```yaml
healthcheck:
  test: ["CMD", "healthcheck.sh", "--connect", "--innodb_initialized"]
  interval: 5s
  timeout: 5s
  retries: 20
```

A API depende do banco saudável:

```yaml
depends_on:
  db:
    condition: service_healthy
```

Isso controla a ordem inicial, mas a aplicação ainda deve tratar perda de
conexão depois do boot.

### Healthcheck da API

Adicione um endpoint, por exemplo:

```typescript
@Get('health')
health() {
  return { status: 'ok' };
}
```

Depois configure no Compose:

```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3000/health"]
  interval: 10s
  timeout: 5s
  retries: 5
```

Para uma verificação realmente útil, consulte também a disponibilidade do banco
sem executar uma operação destrutiva.

## 8. Migrations no deploy

Em produção, desative sincronização automática:

```typescript
synchronize: false
```

Aplique migrations como etapa explícita:

```bash
npm run migration:run
```

Ordem recomendada:

```text
Backup -> Migration -> Nova imagem -> Subida da API -> Healthcheck
```

A migration deve ser compatível com a versão atual durante uma atualização
rolling. Prefira mudanças em duas etapas para colunas obrigatórias ou renomes.

Consulte [migrations.md](migrations.md).

## 9. Rollback

Para rollback de aplicação:

1. Pare de direcionar tráfego para a versão problemática.
2. Use a imagem anterior com tag imutável.
3. Verifique compatibilidade com o esquema atual.
4. Só reverta migration se o impacto estiver entendido.
5. Restaure backup apenas como último recurso planejado.

Rollback de código e rollback de banco não são automaticamente a mesma operação.

## 10. Persistência do banco

O volume `mariadb_data` mantém os dados do MariaDB:

```yaml
volumes:
  - mariadb_data:/var/lib/mysql
```

Garanta que:

- O volume esteja em armazenamento persistente.
- Backups sejam copiados para local independente.
- Restauração seja testada.
- O disco seja monitorado.
- O volume não seja removido em deploy normal.

Consulte [database.md](database.md).

## 11. Processo CI/CD

Pipeline recomendada:

1. Instalar dependências com lockfile.
2. Executar análise e testes.
3. Compilar com `npm run build`.
4. Construir imagem.
5. Escanear imagem e dependências.
6. Publicar tag imutável.
7. Aplicar migrations aprovadas.
8. Atualizar serviço.
9. Verificar healthcheck.
10. Monitorar logs e métricas.

## 12. Segurança de deploy

- Não execute containers privilegiados sem necessidade.
- Use usuário não root quando possível.
- Limite portas publicadas.
- Atualize imagem base.
- Use TLS.
- Proteja o registry.
- Faça rollback planejado.
- Remova ferramentas de desenvolvimento da imagem final.
- Não copie `.env` para a imagem.

O Dockerfile atual já usa uma etapa runtime sem dependências de desenvolvimento.

## 13. Troubleshooting

Ver containers:

```bash
docker compose ps
```

Ver logs:

```bash
docker compose logs --tail=200 api db
```

Verificar imagem:

```bash
docker image ls modern-nest
```

Se a API não conectar:

- Confira `DATABASE_URL`.
- Dentro do Compose, use host `db` e porta `3306`.
- Confirme saúde do banco.
- Confira rede e firewall.
- Verifique se migration foi aplicada.

## 14. Checklist

- [ ] Imagem foi compilada e testada.
- [ ] Tag imutável foi publicada.
- [ ] Variáveis foram injetadas com segurança.
- [ ] Credenciais padrão foram removidas.
- [ ] Banco possui backup.
- [ ] `synchronize` está desativado.
- [ ] Migrations foram aplicadas.
- [ ] API possui healthcheck.
- [ ] HTTPS está configurado.
- [ ] Logs e métricas estão disponíveis.
- [ ] Rollback foi planejado.
