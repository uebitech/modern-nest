# Migrations

Migrations são arquivos versionados que descrevem alterações no esquema do banco
de dados. Elas permitem evoluir tabelas de forma previsível, revisável e
repetível.

## 1. Estado atual do projeto

O projeto atualmente usa:

```typescript
synchronize: true
```

Essa opção faz o TypeORM tentar ajustar o banco com base nas entities ao iniciar.
É prática para desenvolvimento inicial, mas não substitui uma estratégia de
migrations.

A pasta `prisma/` existente não é usada pela aplicação atual, que usa TypeORM.
Portanto, as migrations deste guia devem ser configuradas para TypeORM.

## 2. Por que evitar `synchronize: true` em produção

`synchronize: true` pode:

- Alterar tabelas automaticamente ao iniciar a aplicação.
- Criar ou remover colunas sem uma revisão explícita.
- Causar alterações incompatíveis com dados existentes.
- Tornar o histórico do esquema difícil de auditar.
- Fazer cada ambiente chegar a um estado diferente.
- Executar mudanças inesperadas durante um deploy.

Em desenvolvimento local, pode ser útil para protótipos. Em produção, prefira:

```typescript
synchronize: false,
migrationsRun: true,
```

ou execute migrations explicitamente como etapa do deploy.

## 3. O que uma migration contém

Uma migration normalmente possui dois métodos:

- `up`: aplica a alteração.
- `down`: desfaz a alteração.

Exemplo conceitual:

```typescript
import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPhoneToUsers1710000000000
  implements MigrationInterface
{
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'phone',
        type: 'varchar',
        length: '30',
        isNullable: true,
      }),
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'phone');
  }
}
```

O `up` adiciona a coluna. O `down` remove a mesma coluna.

## 4. Configure uma DataSource

O TypeORM CLI precisa de um arquivo `DataSource`.

Crie, por exemplo, `src/database/data-source.ts`:

```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';

export default new DataSource({
  type: 'mysql',
  url: process.env.DATABASE_URL,
  entities: [User],
  migrations: ['dist/database/migrations/*.js'],
});
```

Para executar o CLI diretamente com TypeScript, adapte os caminhos para os
arquivos `.ts` e use `ts-node` ou uma configuração equivalente.

A configuração de migrations deve estar alinhada ao diretório gerado no build.

## 5. Instale o suporte necessário

O projeto já possui `typeorm` e `ts-node`. O CLI pode ser executado com:

```bash
npx typeorm-ts-node-commonjs -d src/database/data-source.ts migration:show
```

Se esse binário não estiver disponível, instale o pacote auxiliar:

```bash
npm install --save-dev typeorm-ts-node-commonjs
```

Em projetos modernos, também é possível configurar o CLI TypeORM com `ts-node`
por meio de scripts no `package.json`.

## 6. Crie uma migration

Depois de alterar uma entity, gere uma migration:

```bash
npx typeorm-ts-node-commonjs \
  -d src/database/data-source.ts \
  migration:generate src/database/migrations/AddPhoneToUsers
```

O comando compara entities com o esquema conhecido e gera operações de alteração.

Revise o arquivo gerado antes de executá-lo. Geração automática não substitui
revisão humana, principalmente quando há renome de coluna ou transformação de
dados.

Para criar um arquivo vazio:

```bash
npx typeorm-ts-node-commonjs \
  -d src/database/data-source.ts \
  migration:create src/database/migrations/AddPhoneToUsers
```

Use migration manual quando a mudança exigir backfill, transformação ou SQL
específico do banco.

## 7. Execute migrations

Veja migrations pendentes:

```bash
npx typeorm-ts-node-commonjs \
  -d src/database/data-source.ts \
  migration:show
```

Execute as pendentes:

```bash
npx typeorm-ts-node-commonjs \
  -d src/database/data-source.ts \
  migration:run
```

O TypeORM registra as migrations executadas em uma tabela de controle. Assim,
cada migration é aplicada uma vez por ambiente.

Adicione scripts para facilitar:

```json
{
  "scripts": {
    "migration:show": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:show",
    "migration:run": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run",
    "migration:revert": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:revert"
  }
}
```

## 8. Reverta uma migration

Para desfazer a última migration executada:

```bash
npx typeorm-ts-node-commonjs \
  -d src/database/data-source.ts \
  migration:revert
```

A reversão executa o método `down` da última migration.

Não trate `revert` como mecanismo de rollback de dados em produção sem planejar
o impacto. Uma migration pode já ter sido usada por aplicações ou dependências
posteriores.

## 9. Evolua a tabela `users`

Exemplo de evolução segura para adicionar telefone:

### Etapa 1: altere a entity

```typescript
@Column({ nullable: true, length: 30 })
phone?: string;
```

Tornar o campo inicialmente opcional evita quebrar registros existentes.

### Etapa 2: gere ou escreva a migration

```bash
npx typeorm-ts-node-commonjs \
  -d src/database/data-source.ts \
  migration:generate src/database/migrations/AddPhoneToUsers
```

### Etapa 3: revise a migration

Confirme que ela adiciona uma coluna nullable e que o `down` consegue removê-la.

### Etapa 4: aplique em ambiente de teste

```bash
npm run migration:run
```

### Etapa 5: valide dados e aplicação

```bash
npm run build
curl http://localhost:3001/users
```

### Etapa 6: aplique em produção

Execute a migration antes de iniciar uma versão da aplicação que dependa da
nova coluna.

## 10. Mudanças incompatíveis

Para tornar `name` obrigatório em uma tabela que já possui dados, não aplique
simplesmente `NOT NULL`.

Use uma sequência compatível:

1. Adicione a coluna como nullable.
2. Faça backfill dos registros existentes.
3. Valide que não há valores nulos.
4. Altere a coluna para `NOT NULL`.
5. Só depois torne o campo obrigatório no DTO e na aplicação.

Para renomear uma coluna, preserve os dados explicitamente:

```typescript
await queryRunner.renameColumn('users', 'name', 'full_name');
```

Revise também a entity, consultas, DTOs e consumidores da API.

## 11. Dados e migrations

Migrations de esquema alteram a estrutura. Migrations de dados transformam
registros.

Exemplo conceitual:

```typescript
await queryRunner.query(
  `UPDATE users SET email = LOWER(email) WHERE email IS NOT NULL`,
);
```

Antes de transformar dados:

- Faça backup.
- Teste em uma cópia.
- Verifique unicidade e integridade.
- Considere volume e tempo de execução.
- Tenha uma estratégia de rollback ou restauração.

## 12. Ordem e histórico

Boas migrations são:

- Pequenas.
- Ordenadas por timestamp.
- Imutáveis depois de aplicadas em produção.
- Revisadas no pull request.
- Compatíveis com dados existentes.
- Reproduzíveis em um banco novo.

Não edite uma migration antiga já executada em produção. Crie uma nova migration
que corrija ou complemente o comportamento.

## 13. Desenvolvimento, CI e produção

### Desenvolvimento

Pode usar `synchronize: true` em um banco descartável, mas prefira testar também
com migrations para detectar problemas reais de deploy.

### CI

Uma pipeline pode:

1. Criar um banco de teste.
2. Executar todas as migrations.
3. Executar testes.
4. Destruir o banco temporário.

### Produção

Uma sequência comum é:

1. Construir a imagem.
2. Fazer backup, se necessário.
3. Executar migrations aprovadas.
4. Iniciar a nova versão da API.
5. Verificar healthcheck e logs.

Evite fazer a aplicação depender de sincronização automática durante o boot.

## 14. Checklist

- [ ] `synchronize` está desativado em produção.
- [ ] Existe uma `DataSource` para o CLI.
- [ ] A entity está incluída na configuração.
- [ ] O diretório de migrations está correto no build.
- [ ] A migration possui `up` e `down` coerentes.
- [ ] A migration foi revisada manualmente.
- [ ] O banco foi salvo em backup quando necessário.
- [ ] A migration foi testada em banco separado.
- [ ] O histórico não foi alterado depois de aplicado.
- [ ] A API foi validada após a migration.
