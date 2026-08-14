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


Mais perguntas em aberto:
Seção 8 do documento de requisitos: o que precisa ser decidido antes de desenhar o banco:
Q1 - Cada integrante de equipe terá login próprio, ou só o aluno líder acessa o sistema?
R: Líder e integrante com acessos diferentes

Q2 - Mentores terão perfil próprio (restrito às suas equipes) ou usarão o login de administrador?
R: Perfil próprio

Q3 - O Pitch Vídeo será upload de arquivo ou link (Youtube/Drive)? Muda o armazenamento.
R: Link 

Q4 - Um aluno pode participar de mais de uma ideia/equipe ao mesmo tempo?
R: Pode participar de mais.

Q5 - Existe um numero máximo de integrantes por equipe?
R: Não.

Q6 - Haverá etapas pós-InovAMF, ou o escopo termina na entrega dos materiais?
R: Não.

Q7 - Qual serviço de e-mail a instituição usa ou prefee (Google Workspace, Outlook, transacional)?
R: RESEND

_Demais decisões de arquitetura da disciplina serão registradas neste arquivo à medida que forem tomadas (ver `PLAN.md`, Seção 8 — Open Questions, para pontos ainda pendentes de padronização com a turma)._

------

Modelagem ao Vivo

1 - Definir tabelas para suprir RF-01 a RF-24
2 - Deinifir os atributos e a chave primária de cada tabela.
3 - Ligar os relacionamentos (1:N, N:N)
4 - Aplicar as decisões em aberto (Q1 - Q7) no modelo.
5 - Montar o DER no dbdiagram.io, projetado no telão

* Leve em consideração todas as decisões tomadas até o momento

**Resultado:** modelagem concluída — ver [`docs/modelagem-banco.md`](docs/modelagem-banco.md) (raciocínio dos 5 passos), [`db/schema.sql`](db/schema.sql) (DDL completo) e [`db/diagram.dbml`](db/diagram.dbml) (importar em dbdiagram.io).

Requisitos Iniciais do Projeto

As regras do jogo:
1 - Front + Back em um único projeto: toda a aplicação deve subir com um único comando (sem backend e frontend separado)
2 - ENTREGA DE HOJE: arquivo .sql com o banco de dados completo  + o ORM definido

**Entregue:** [`db/schema.sql`](db/schema.sql) (DDL completo) + [`prisma/schema.prisma`](prisma/schema.prisma) (ORM: Prisma).

------

Frontend com dados mockados

Próximo entregável: interface completa (sem fluxos cadastrais/listagem com dados reais), consumindo dados mockados por uma camada de services já no formato esperado do backend futuro.

**Decisão — stack de UI:** Tailwind CSS + shadcn/ui. Motivo: componentes acessíveis prontos (dialog, tabs, table, form) aceleram montar todas as telas do funil sem abrir mão de qualidade visual; customizados com a paleta de cores do InfoHub (vermelho-bordô → laranja, extraída de `assets/logotipo.png`). Trade-off: componentes shadcn são copiados para dentro do repo (não é uma dependência fechada), então ficam livres para editar, mas aumentam a quantidade de arquivos em `src/components/ui`.

**Entregue:** [`docs/frontend-plan.md`](docs/frontend-plan.md) — design system (paleta de cores, tipografia), escopo de telas mapeado às RF-01 a RF-24, arquitetura da camada de mocks/services (pensada para integração futura com o backend real) e backlog de 17 tickets (T-FE-01 a T-FE-17).