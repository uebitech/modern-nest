# Contribuindo

Este guia define um fluxo simples para alterar o projeto com segurança e
manter o histórico compreensível.

## 1. Antes de começar

Leia:

- [main.md](main.md): visão geral.
- [architecture.md](architecture.md): camadas e dependências.
- [setup.md](setup.md): execução local.
- [testing.md](testing.md): testes.

Confirme que o ambiente funciona antes da alteração:

```bash
npm install
npm run build
```

Se o banco for necessário:

```bash
npm run db:up
npm run start:dev
```

## 2. Padrões de código

Use os padrões já presentes:

- TypeScript estrito.
- Classes NestJS com decorators.
- Organização por feature.
- Dependências injetadas pelo construtor.
- Controller focado em HTTP.
- Service focado em regras de negócio.
- Repository focado em persistência.
- Entity focada no mapeamento do banco.

Nomes:

```text
users.module.ts
users.controller.ts
users.service.ts
user.entity.ts
```

Classes usam PascalCase; métodos e propriedades usam camelCase.

## 3. Organização das mudanças

Mantenha cada alteração focada:

- Uma feature ou correção por branch.
- Não misture refatoração ampla com mudança de comportamento.
- Atualize documentação quando o fluxo mudar.
- Evite arquivos gerados e `.env` no commit.
- Não altere migrations antigas já aplicadas.

Se uma mudança atravessa camadas, preserve o fluxo:

```text
Controller -> Service -> Repository -> Database
```

## 4. Branches

Crie uma branch a partir da base atualizada:

```bash
git switch main
git pull --ff-only
git switch -c feat/user-search
```

Sugestões de prefixo:

- `feat/`: nova funcionalidade.
- `fix/`: correção de bug.
- `docs/`: documentação.
- `refactor/`: refatoração sem mudança de comportamento.
- `test/`: testes.
- `chore/`: manutenção.

Use nomes curtos e descritivos:

```text
feat/user-pagination
fix/duplicate-email
Docs/api-guide
```

Prefira letras minúsculas e hífens consistentes:

```text
docs/api-guide
```

## 5. Commits

Escreva commits pequenos e objetivos:

```text
feat(users): add email validation
docs: add database setup guide
fix(users): handle duplicate email
```

Estrutura:

```text
<tipo>(<escopo>): <descrição no imperativo>
```

Tipos comuns:

- `feat`: funcionalidade.
- `fix`: correção.
- `docs`: documentação.
- `test`: teste.
- `refactor`: refatoração.
- `chore`: manutenção.

Boas mensagens explicam o que o commit faz. Evite:

```text
ajustes
mudanças
coisas novas
```

Não inclua secrets, credenciais ou arquivos de ambiente.

## 6. Pull requests

Uma pull request deve explicar:

- Qual problema foi resolvido.
- O que foi alterado.
- Como testar.
- Quais decisões ou limitações existem.
- Se houve mudança de banco.
- Se há risco de deploy.

Modelo:

```markdown
## Problema
Descreva o motivo da alteração.

## Solução
Descreva a implementação.

## Testes
- `npm run build`
- `npm test`

## Banco
- [ ] Sem alteração
- [ ] Migration adicionada

## Checklist
- [ ] Documentação atualizada
- [ ] Sem secrets
```

Mantenha a PR pequena o suficiente para uma revisão cuidadosa.

## 7. Testes obrigatórios

Antes de abrir PR:

```bash
npm run build
npm test
```

O projeto atual ainda não possui `npm test` configurado. Nesse caso, registre a
limitação e execute o build e os testes disponíveis. Consulte [testing.md](testing.md)
para configurar Jest.

Teste:

- Caminho de sucesso.
- Entrada inválida.
- Registro inexistente.
- Conflitos de unicidade.
- Regras de autorização quando aplicável.

## 8. Mudanças de banco

Ao alterar entity ou tabela:

1. Avalie compatibilidade com dados existentes.
2. Crie migration.
3. Revise `up` e `down`.
4. Teste em banco separado.
5. Atualize documentação.
6. Desative `synchronize` em produção.

Não edite uma migration que já foi executada em produção. Crie outra migration.

## 9. Revisão de código

Ao revisar, procure:

- Erros de comportamento.
- Falhas de validação.
- Exposição de dados.
- Queries inseguras.
- Dependências não registradas.
- Testes ausentes.
- Problemas de compatibilidade de migration.
- Logs com secrets.
- Mudanças incompatíveis de API.

Comentários de revisão devem ser específicos e acionáveis.

## 10. Documentação

Atualize a documentação quando alterar:

- Endpoint.
- Variável de ambiente.
- Estrutura de módulo.
- Entity ou tabela.
- Comando de execução.
- Processo de deploy.
- Regra de segurança.

Use links relativos dentro de `docs/`.

## 11. Checklist antes de alterar

- [ ] Entendi o problema e o comportamento esperado.
- [ ] Li a documentação relacionada.
- [ ] Verifiquei o código responsável.
- [ ] Confirmei se há alterações locais não minhas.
- [ ] Criei uma branch adequada.
- [ ] Mantive a mudança focada.
- [ ] Preservei APIs públicas quando possível.
- [ ] Considerei segurança e dados sensíveis.
- [ ] Considerei impacto no banco.
- [ ] Atualizei docs necessárias.

## 12. Checklist antes do commit

- [ ] O código compila.
- [ ] Testes foram executados ou a limitação foi registrada.
- [ ] Não há `.env`, secrets ou logs no diff.
- [ ] O diff contém somente arquivos esperados.
- [ ] Não há formatação desnecessária.
- [ ] Names e imports estão corretos.
- [ ] Migration foi revisada, se aplicável.
- [ ] Mensagem do commit é clara.

Comandos úteis:

```bash
git status --short
git diff --check
git diff --stat
git diff
```

## 13. Checklist antes do merge

- [ ] A PR foi revisada.
- [ ] CI passou.
- [ ] Conflitos foram resolvidos.
- [ ] Migrations estão na ordem correta.
- [ ] Deploy e rollback foram considerados.
- [ ] Documentação está atualizada.
- [ ] O branch base está atualizado.

## 14. Fluxo resumido

```text
Entender -> Branch -> Alterar -> Testar -> Documentar -> Revisar -> Commit -> PR
```

Esse fluxo reduz surpresas e mantém o projeto fácil de evoluir.
