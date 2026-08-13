Antes de codar, cada dupla registra sua escolha de Banco de dados e ORM (usar nenhum também é uma decisão de arquitetura):

01 - Querem usar ORM? Sim ou não?
02 - Qual? Sequelize, Prisma, TypeORM, MikroORM, Objection, Knex...
03 - Por quê? Produtividade, migrations, tipagem, documentação, curva de aprendiado.
04 - Qual trade-off vocês assumem? Toda escolha sacrifica algo, digam o quê.

## Respostas — InfoHub → InovAMF

**01 — Querem usar ORM?**
Sim.

**02 — Qual?**
Prisma. (Decisão revisada: a escolha inicial havia sido TypeORM, substituída por Prisma devido ao baixo nível de familiaridade da turma com ORMs — ver trade-offs abaixo.)

**03 — Por quê?**
- Curva de aprendizado mais suave para quem está tendo o primeiro contato com ORM: schema declarativo único (`schema.prisma`), sem decorators nem configuração de metadata reflection.
- Tipagem gerada automaticamente a partir do schema (Prisma Client), reduzindo erros só percebidos em runtime — importante para uma turma com baixa familiaridade.
- Documentação e mensagens de erro consideradas as mais didáticas entre os ORMs de Node/TypeScript, o que pesa em contexto acadêmico.
- Migrations declarativas e simples de gerar (`prisma migrate dev`), com boa integração com Postgres e com Next.js.

**04 — Qual trade-off vocês assumem?**
- Menos flexível que TypeORM para modelagem orientada a objetos (sem Active Record, sem herança de entities) — o schema é centralizado em um único arquivo, o que pode ficar extenso conforme o domínio cresce.
- Prisma Client é gerado em build step (`prisma generate`), adicionando uma etapa a mais no fluxo de desenvolvimento/CI que precisa ser lembrada.
- Menor controle fino sobre queries complexas comparado a um query builder puro (ex.: Knex) ou SQL puro — para casos muito específicos pode ser necessário cair para `$queryRaw`.
- Trocar a decisão após o planejamento inicial (de TypeORM para Prisma) tem custo de retrabalho nos tickets já descritos em `PLAN.md`, aceito aqui porque o projeto ainda não tinha código implementado.

---

_Demais decisões de arquitetura da disciplina serão registradas neste arquivo à medida que forem tomadas (ver `PLAN.md`, Seção 8 — Open Questions, para pontos ainda pendentes de padronização com a turma)._
