Antes de codar, cada dupla registra sua escolha de Banco de dados e ORM (usar nenhum também é uma decisão de arquitetura):

01 - Querem usar ORM? Sim ou não?
02 - Qual? Sequelize, Prisma, TypeORM, MikroORM, Objection, Knex...
03 - Por quê? Produtividade, migrations, tipagem, documentação, curva de aprendiado.
04 - Qual trade-off vocês assumem? Toda escolha sacrifica algo, digam o quê.

## Respostas — InfoHub → InovAMF

**01 — Querem usar ORM?**
Sim.

**02 — Qual?**
TypeORM.

**03 — Por quê?**
- Modelagem orientada a objetos via decorators (entities), próxima do que já é visto em outras cadeiras com Hibernate/JPA — curva de aprendizado menor para quem vem desse background.
- Suporte a dois padrões (Active Record e Data Mapper), permitindo escolher o estilo mais didático para o projeto.
- Migrations integradas, evitando alterar o schema do Postgres manualmente.
- Integração natural com TypeScript e com o backend em Next.js (API Routes/Server Actions) definido para o projeto.

**04 — Qual trade-off vocês assumem?**
- Tipagem e developer experience do TypeORM são historicamente menos polidas que as de ferramentas mais recentes (ex.: Prisma), com mais casos de erros só percebidos em runtime.
- Menor alinhamento nativo com ambientes serverless/edge (pool de conexões, cold starts), o que exige atenção ao configurar o data source em produção (ex.: Vercel).
- Mais "mágica" (decorators, metadata reflection) do que SQL puro ou um query builder simples (ex.: Knex), tornando o SQL gerado menos óbvio à primeira vista — aceito em troca de produtividade e migrations automáticas.

---

_Demais decisões de arquitetura da disciplina serão registradas neste arquivo à medida que forem tomadas (ver `PLAN.md`, Seção 8 — Open Questions, para pontos ainda pendentes de padronização com a turma)._
