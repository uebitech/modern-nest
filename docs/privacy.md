# Privacidade e proteção de dados

A entity `User` armazena nome e e-mail, que podem ser dados pessoais. Este guia
orienta o tratamento responsável desses dados.

## 1. Minimização

Colete somente os campos necessários para a finalidade da aplicação.

Atualmente:

```text
name
email
```

Não adicione dados pessoais apenas por conveniência futura.

## 2. Acesso

- Restrinja acesso ao banco.
- Use usuários com permissões mínimas.
- Proteja endpoints administrativos.
- Separe ambientes.
- Audite acessos quando necessário.

## 3. E-mail

Não registre e-mail em logs sem necessidade. Evite expor listas completas para
usuários não autorizados.

A restrição `unique` evita duplicidade, mas não substitui política de retenção.

## 4. Secrets

Nunca armazene no Git:

- Senhas.
- JWT secrets.
- Tokens.
- `DATABASE_URL` real.
- Backups com dados reais.

Use `.env.example` apenas com valores demonstrativos.

## 5. Logs

Não registre:

- Authorization header.
- Senhas ou hashes.
- Tokens.
- Body sensível.
- Credenciais de banco.

Use request id para correlação sem copiar dados pessoais para toda mensagem.

## 6. Backups

Backups precisam de:

- Criptografia em trânsito e repouso.
- Controle de acesso.
- Retenção definida.
- Teste de restauração.
- Registro de responsáveis.

Não use backup de produção em desenvolvimento sem anonimização.

## 7. Retenção e exclusão

Defina quanto tempo usuários ficam armazenados e como requests de exclusão são
tratadas. Exclusão lógica ou física deve considerar obrigações legais e relações
com outras tabelas.

## 8. Respostas da API

Não retorne campos internos automaticamente:

```typescript
return {
  id: user.id,
  name: user.name,
  email: user.email,
};
```

Quando autenticação for adicionada, limite resultados por usuário e permissão.

## 9. Incidentes

Ao suspeitar de exposição:

1. Preserve evidências.
2. Revogue secrets comprometidos.
3. Restrinja acesso.
4. Avalie dados afetados.
5. Registre o incidente.
6. Siga a política legal e organizacional.

## 10. Checklist

- [ ] Dados coletados têm finalidade.
- [ ] Acesso é mínimo.
- [ ] Secrets estão fora do Git.
- [ ] Logs são redigidos.
- [ ] Backups são protegidos.
- [ ] Retenção foi definida.
- [ ] Exclusão foi planejada.
- [ ] Incidentes possuem procedimento.
