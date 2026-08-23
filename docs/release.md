# Processo de release

Este documento descreve uma entrega reproduzível da aplicação.

## 1. Antes da release

- Confira branch e status.
- Leia mudanças pendentes.
- Atualize documentação.
- Confirme migrations.
- Garanta backup quando necessário.

```bash
git status --short
npm run build
```

## 2. Testes

O projeto ainda não possui `npm test` configurado. Quando testes estiverem
instalados:

```bash
npm test
npm run test:cov
```

Não ignore falhas; registre limitações explicitamente.

## 3. Build da imagem

```bash
docker build -t registry.example.com/modern-nest:1.0.0 .
```

Use tag imutável baseada em versão ou commit.

## 4. Publicação

```bash
docker push registry.example.com/modern-nest:1.0.0
```

Escaneie imagem e dependências antes de publicar.

## 5. Migrations

Com TypeORM configurado:

```bash
npm run migration:show
npm run migration:run
```

Execute migrations antes da versão que depende do novo schema.

## 6. Deploy

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 api
```

Em produção, injete variáveis por secret manager e não por arquivo versionado.

## 7. Verificação

- API responde.
- Banco está saudável.
- Healthcheck está pronto.
- Logs não mostram falhas repetidas.
- Endpoint crítico funciona.
- Métricas estão normais.

## 8. Rollback

Use a imagem anterior e verifique compatibilidade com o schema atual. Não reverta
migrations automaticamente; avalie dados e dependências antes.

## 9. Registro

Documente:

- Versão.
- Commit.
- Imagem.
- Migrations.
- Responsável.
- Horário.
- Resultado da verificação.

## 10. Checklist

- [ ] Build passou.
- [ ] Testes passaram ou limitação registrada.
- [ ] Imagem foi criada.
- [ ] Tag é imutável.
- [ ] Backup foi avaliado.
- [ ] Migrations foram revisadas.
- [ ] Variáveis estão seguras.
- [ ] Healthcheck passou.
- [ ] Rollback está disponível.
