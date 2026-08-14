# Plano — Frontend com dados mockados (InfoHub → InovAMF)

Próximo entregável da disciplina: a camada de **interface completa**, sem fluxos cadastrais/listagem com dados reais — todas as telas navegáveis e funcionais visualmente, consumindo dados mockados através de uma camada de `services` desenhada para já ter o formato (contrato) que a API real vai devolver depois. Quando o backend existir, a troca deve ser só "trocar a implementação do service", sem tocar em componente de UI.

Este plano assume as decisões já registradas em `decisoes.md` e `PLAN.md`: Next.js (App Router) + TypeScript + Prisma + PostgreSQL como stack de destino; **Tailwind CSS + shadcn/ui** para esta camada de UI (decisão desta etapa, ver Seção 1).

## 1. Decisões desta etapa

- **UI stack**: Tailwind CSS + shadcn/ui. Motivo: componentes acessíveis (dialog, tabs, table, form, dropdown) já testados, que aceleram montar todas as telas do funil/kanban/formulários sem abrir mão de qualidade visual; customizados com o tema de cores do InfoHub (Seção 2). Trade-off: acopla o projeto ao padrão de componentes do shadcn (Radix UI por baixo) — aceitável porque os componentes são copiados para dentro do repo (`src/components/ui`), não uma dependência de pacote fechada, então continuam editáveis livremente.
- **Mocks vivem na camada de `services`**, não em fixtures soltos nos componentes — ver Seção 4. Isso é o que torna a troca para dados reais um trabalho isolado.

## 2. Design system — identidade visual InfoHub

Baseado no logotipo (`assets/logotipo.png`): ícone de lâmpada formado por nós conectados, em gradiente de vermelho-escuro/bordô até laranja, com wordmark em cinza/preto.

### 2.1 Paleta de cores

Escala de marca (gradiente vermelho → laranja do logotipo), do mais escuro ao mais claro:

| Token | Hex aprox. | Uso |
|---|---|---|
| `brand-900` | `#4A0E1A` | bordô escuro — texto sobre fundo claro em contextos de marca, estados "pressed" |
| `brand-800` | `#7A1220` | hover de botões primários, ícones de alerta de marca |
| `brand-700` | `#B31B22` | — |
| `brand-600` | `#D62027` | vermelho — cor primária de ação (botões, links, foco) |
| `brand-500` | `#E8452A` | vermelho-alaranjado — estado padrão de destaque, badges "ativo" |
| `brand-400` | `#ED6A2C` | — |
| `brand-300` | `#F7941D` | laranja — acentos, ícones secundários, gráficos |
| `brand-100` | `#FDE4CE` | fundo suave (cards de destaque, hover leve) |
| `brand-50`  | `#FFF6EE` | fundo de página em seções de destaque |

Gradiente de marca (para hero/cabeçalhos, replicando o logo): `linear-gradient(135deg, #4A0E1A 0%, #D62027 55%, #F7941D 100%)`.

> Os valores hex são aproximações visuais extraídas do logotipo. Antes de finalizar o tema, confirmar com um color picker sobre `assets/logotipo.png` e ajustar `tailwind.config` se necessário — isso não bloqueia o início da implementação.

Neutros (cor secundária: preto/cinza, para texto e UI neutra):

| Token | Uso |
|---|---|
| `neutral-950` | texto principal, wordmark |
| `neutral-600` | texto secundário, legendas |
| `neutral-300` | bordas, divisores |
| `neutral-100` | fundo de página padrão |
| `neutral-0` (branco) | fundo de cards/superfícies |

Cores semânticas (status de tarefa/etapa — não vêm do logo, mas precisam conviver com a paleta de marca sem colidir): `success` (verde, aprovado), `warning` (amarelo, pendente/atenção), `danger` (usa `brand-600`/`brand-700`, já que vermelho é a cor de marca — cuidado para não confundir "ação primária" com "erro"; usar `danger` um pouco mais dessaturado ou com ícone de alerta explícito para diferenciar de botão primário).

### 2.2 Tipografia

Sem fonte definida no material da disciplina — usar uma sans-serif neutra e legível como padrão (ex.: `Inter`, já com ótimo suporte no Next.js via `next/font`), evitando escolha estética não justificada pelo escopo acadêmico. Hierarquia: `text-2xl/3xl` para títulos de página, `text-sm` para metadados (prazos, status), `font-medium` para labels de formulário.

### 2.3 Componentes de marca

- **Logo**: usar `assets/logotipo.png` (ícone) + wordmark em texto (Tailwind, não imagem) no header/sidebar, para poder trocar cor conforme tema claro/escuro sem exportar novos PNGs.
- **Badges de etapa do funil** (1 a 6): usar a escala `brand-*` posicional — etapa 1 mais próxima do laranja (`brand-300`), etapa 6 mais próxima do bordô (`brand-800`) — reforçando visualmente "a jornada esquenta conforme avança".
- **Botão primário**: fundo `brand-600`, hover `brand-700`.

## 3. Escopo de telas (mapeado às RF do documento de requisitos)

Cobertura por papel, nesta ordem de prioridade (replica P0/P1 do `PLAN.md`):

### P0 — fluxo crítico
1. **Login** (RF-01) — formulário único, roteia por papel após autenticar (mock).
2. **Formulário público de inscrição** (RF-02, RF-04, RF-05) — Etapa 1, todos os campos da Seção 4.2 do documento de requisitos, incluindo e-mail de cada integrante (ver decisão registrada em `PLAN.md`/T005) e checkbox de consentimento LGPD (RNF-02).
3. **Painel do administrador — funil/kanban** (RF-06, RF-07) — colunas = 6 etapas, cards = equipes, com busca e filtros (nome, curso, área, status de tarefa, mentor).
4. **Página de detalhe da equipe** (RF-08, RF-09, RF-10) — dados cadastrais, histórico de etapas, tarefas, arquivos entregues, anotações internas (visão admin/mentor) vs. visão restrita (aluno).
5. **Área do aluno — lista de tarefas** (RF-13) — pendentes/concluídas, prazos, instruções.
6. **Envio de tarefa (upload/link)** (RF-14) — formulário de submissão, com suporte a link externo (Pitch Vídeo, Q3) além de upload de arquivo.
7. **Aprovação/reprovação de entrega** (RF-15, RF-16) — ação do admin/mentor na página de detalhe da tarefa, com histórico de versões visível.
8. **Controle de acesso visual por papel** (RNF-03) — layout muda navegação conforme papel mockado ativo (admin, mentor, aluno líder, aluno integrante).

### P1 — completude
9. **CRUD de tarefas + templates por etapa** (RF-11, RF-12) — tela do admin para criar/editar tarefa, escolher template por etapa.
10. **Configuração de lembretes por tarefa** (RF-17, RF-20) — datas de lembrete automático + disparo manual avulso.
11. **Dashboard com indicadores** (RF-22) — cards de KPI (equipes ativas, distribuição por etapa, tarefas atrasadas, prontas para InovAMF).
12. **Exportação CSV** (RF-23) — botão que gera CSV a partir dos dados mockados já carregados em tela (sem chamada real de export).
13. **Filtro por período/turma** (RF-24) — seletor de cohort no painel do admin.
14. **Layout responsivo mobile-first da área do aluno** (RNF-01) — validado nas telas 5, 6, e login.

### Fora desta etapa (mock não cobre)
- Qualquer persistência real, autenticação real, envio de e-mail real, upload real de arquivo.
- RF-03 (gestão de contas admin/mentor) pode ficar como tela simples de listagem mockada, prioridade baixa — não é P0/P1 no fluxo do aluno/admin do dia a dia.

## 4. Arquitetura da camada de dados mockados

Objetivo: os componentes de UI nunca importam um array mockado diretamente — sempre chamam uma função de `services/`, como se fosse uma chamada de API. Isso cria uma "costura" (seam) para a integração futura.

```
app/src/                     # dentro de app/ na raiz do repositório (ver README.md)
  app/                       # rotas (App Router) — inalterado em relação ao PLAN.md
  services/                  # camada de acesso a dados — hoje mock, amanhã fetch/Prisma
    teams.service.ts
    tasks.service.ts
    users.service.ts
    journey.service.ts
    notifications.service.ts
    reports.service.ts
  mocks/                     # dados estáticos + geradores, usados SÓ pelos services
    data/
      teams.mock.ts
      tasks.mock.ts
      users.mock.ts
    factories/               # helpers para gerar variações (ex.: buildTeam(overrides))
  types/                     # contratos compartilhados (DTOs), espelhando os models Prisma
    team.ts
    task.ts
    user.ts
    ...
  components/
    ui/                      # componentes shadcn/ui (copiados, customizáveis)
    <domínio>/                # componentes de negócio: TeamCard, JourneyBoard, TaskForm...
```

### 4.1 Regra de contrato

Cada função em `services/*.service.ts`:
- É `async` (retorna `Promise`), mesmo lendo de um array em memória — o formato de chamada já é o mesmo de uma chamada real (`fetch`/Server Action/Prisma).
- Recebe parâmetros no mesmo formato que a versão real vai receber (ex.: `getTeams(filters: TeamFilters)`, não `getTeams()` retornando tudo e filtrando na tela).
- Retorna tipos definidos em `types/`, que espelham os models do `app/prisma/schema.prisma` (nomes de campo em camelCase, mesmas entidades — `Team`, `TeamMember`, `Task`, `TaskSubmission`, etc.), adaptados para o que a tela precisa (ex.: `TeamWithCurrentStage`, um tipo "view" que já vem com o relacionamento resolvido, do jeito que uma query real com `include` devolveria).
- Simula latência mínima (`await delay(150-400ms)`) para os componentes já nascerem preparados para estado de loading — evita retrabalho de UX quando o backend real (com latência de verdade) entrar.

Exemplo de assinatura (ilustrativo, não é código final):

```ts
// services/teams.service.ts
export async function getTeamsByStage(filters: TeamFilters): Promise<TeamBoardItem[]>
export async function getTeamDetail(teamId: string): Promise<TeamDetail>
export async function advanceTeamStage(teamId: string, toStageId: number): Promise<Team>
```

Quando o backend existir, essas mesmas assinaturas passam a chamar Prisma/Server Actions por dentro — as telas não mudam.

### 4.2 Simulação de mutações

Ações que "escrevem" (aprovar tarefa, avançar etapa, criar tarefa) devem mutar o array mockado em memória (module-level state no `mocks/data/*`) para a navegação parecer real dentro de uma sessão de uso — sem persistir entre reloads. Deixar isso explícito no código com um comentário curto, para não parecer bug quando resetar ao dar refresh.

## 5. Backlog de tickets (Fase Frontend Mockado)

### Ticket: T-FE-01 Setup Next.js + Tailwind + shadcn/ui + tema InfoHub
- **Priority:** P0
- **Status:** Done
- **Scope:** Inicializar o projeto Next.js (se ainda não existir a partir de T001 do `PLAN.md`), instalar Tailwind, inicializar shadcn/ui, configurar `tailwind.config` com a paleta `brand-*`/`neutral-*` da Seção 2, importar fonte via `next/font`.
- **Acceptance Criteria:** `npm run dev` sobe uma página inicial usando as cores de marca; um componente shadcn instalado (ex.: `button`) renderiza com o tema aplicado.
- **Validation Steps:** `npm run dev`, inspecionar visualmente botão primário com `bg-brand-600`.
- **Notes:** Tailwind v4 não usa `tailwind.config.js` — os tokens `brand-50..900` foram definidos como CSS custom properties em `src/app/globals.css` (`:root` + bloco `@theme inline`), que é o equivalente na v4. Fonte trocada de Geist para Inter (conforme Seção 2.2). Validado visualmente via screenshot (build + lint limpos).

### Ticket: T-FE-02 Estrutura de types/ espelhando o schema Prisma
- **Priority:** P0
- **Status:** Done
- **Scope:** Criar `app/src/types/*.ts` com as entidades principais (User, StudentProfile, Team, TeamMember, TeamMentor, JourneyStage, Task, TaskSubmission, TaskReminder) como interfaces TypeScript, batendo com `app/prisma/schema.prisma`.
- **Acceptance Criteria:** Nenhum `any`; tipos compilam sem erro (`tsc --noEmit`).
- **Validation Steps:** `tsc --noEmit`.
- **Notes:** Um arquivo por model/domínio (`enums.ts`, `user.ts`, `team.ts`, `task.ts`, `notification.ts`, `audit.ts`) + `filters.ts` para os parâmetros de consulta dos services + `index.ts` barril. Enums do Prisma viraram `as const` objects (não `enum` do TS) — mesmo padrão que o Prisma Client gera, facilita a troca futura. Também incluídos tipos "view" (`TeamBoardItem`, `TeamDetail`, `TaskWithDetails`, etc.) com relações já resolvidas, do jeito que uma query real com `include` devolveria — são o que os services (T-FE-04) vão retornar.

### Ticket: T-FE-03 Mocks base (usuários, equipes, tarefas)
- **Priority:** P0
- **Scope:** `src/mocks/data/*.mock.ts` com um conjunto realista: 1 admin, 2 mentores, ~6 equipes distribuídas pelas 6 etapas, alunos (líderes e integrantes, alguns em múltiplas equipes — refletindo a decisão Q4), tarefas em diferentes status, incluindo pelo menos uma tarefa atrasada e uma com Pitch Vídeo como link.
- **Acceptance Criteria:** Dados cobrem todos os `status`/`role`/`stage` possíveis pelo menos uma vez (para toda tela ter algo pra mostrar em cada estado visual).
- **Validation Steps:** Checklist manual comparando enums usados em cada estado da UI.

### Ticket: T-FE-04 Camada de services (contratos assíncronos)
- **Priority:** P0
- **Scope:** Implementar `services/*.service.ts` conforme Seção 4.1, cobrindo as consultas necessárias para as 8 telas P0.
- **Acceptance Criteria:** Nenhum componente importa de `mocks/` diretamente; toda leitura passa por uma função de `services/`.
- **Validation Steps:** Busca no código por imports de `mocks/` fora de `services/` — deve retornar vazio.

### Ticket: T-FE-05 Layout base + navegação por papel
- **Priority:** P0
- **Scope:** Shell da aplicação (header com logo/wordmark, navegação lateral ou superior), com um seletor de "papel ativo" (mock de sessão) para alternar entre admin/mentor/aluno líder/aluno integrante durante a demo, já que não há login real ainda.
- **Acceptance Criteria:** Trocar o papel ativo muda os itens de menu visíveis, refletindo RNF-03.
- **Validation Steps:** Teste manual alternando papel e conferindo itens de menu.

### Ticket: T-FE-06 Tela de login (mock)
- **Priority:** P0
- **Scope:** Formulário de login visual; submissão "autentica" contra os usuários mockados por e-mail e redireciona para a home do papel correspondente.
- **Acceptance Criteria:** Login com e-mail de cada papel mockado leva à respectiva home; e-mail não encontrado mostra erro.
- **Validation Steps:** Teste manual com e-mails válidos/inválidos dos mocks.

### Ticket: T-FE-07 Formulário público de inscrição (Etapa 1)
- **Priority:** P0
- **Scope:** Todos os campos da Seção 4.2, incluindo e-mail por integrante e campo repetível de colegas, consentimento LGPD, validação client-side (zod/react-hook-form).
- **Acceptance Criteria:** Submissão válida adiciona uma equipe nova ao mock em memória, visível no painel do admin sem reload da página.
- **Validation Steps:** Preencher e enviar; conferir card novo aparecendo no funil.

### Ticket: T-FE-08 Painel do administrador — funil/kanban
- **Priority:** P0
- **Scope:** Board com 6 colunas (etapas), cards de equipe, busca e filtros (nome, curso, área, status de tarefa, mentor).
- **Acceptance Criteria:** Filtros combinam corretamente (AND); busca por nome é case-insensitive.
- **Validation Steps:** Teste manual combinando 2+ filtros.

### Ticket: T-FE-09 Página de detalhe da equipe
- **Priority:** P0
- **Scope:** Dados cadastrais, histórico de etapas, lista de tarefas, arquivos entregues, anotações internas (ocultas para o aluno).
- **Acceptance Criteria:** Anotações internas não renderizam quando o papel ativo é aluno.
- **Validation Steps:** Alternar papel ativo na mesma equipe e conferir visibilidade.

### Ticket: T-FE-10 Área do aluno — lista de tarefas + envio
- **Priority:** P0
- **Scope:** Lista de tarefas do aluno logado (mock), tela/modal de envio suportando upload de arquivo (mock de input file, sem upload real) e link externo (Pitch Vídeo).
- **Acceptance Criteria:** Envio muda o status da tarefa para "SUBMITTED" no mock em memória, refletido na visão do admin.
- **Validation Steps:** Enviar como aluno, conferir mudança de status na visão do admin.

### Ticket: T-FE-11 Aprovação/reprovação + histórico de versões
- **Priority:** P0
- **Scope:** Ação de aprovar/reprovar na página de detalhe da tarefa; reprovação reabre a tarefa com comentário; reenvio gera nova versão, mantendo a anterior visível no histórico.
- **Acceptance Criteria:** Fluxo completo reprovar → aluno reenvia → nova versão aparece, versão antiga preservada.
- **Validation Steps:** Teste manual do fluxo completo alternando papéis.

### Ticket: T-FE-12 CRUD de tarefas + templates por etapa
- **Priority:** P1
- **Scope:** Tela do admin para criar tarefa (avulsa ou a partir de template), editar prazo/descrição.
- **Acceptance Criteria:** Tarefa criada aparece na lista do aluno correspondente.
- **Validation Steps:** Criar tarefa como admin, conferir na área do aluno.

### Ticket: T-FE-13 Lembretes (configuração + manual)
- **Priority:** P1
- **Scope:** UI de configurar datas de lembrete por tarefa e disparar lembrete manual avulso (sem envio real de e-mail — apenas registro visual "lembrete enviado").
- **Acceptance Criteria:** Lembrete configurado aparece listado na tarefa; disparo manual muda um indicador visual de "último lembrete".
- **Validation Steps:** Teste manual configurando e disparando lembrete.

### Ticket: T-FE-14 Dashboard com indicadores
- **Priority:** P1
- **Scope:** Cards de KPI (RF-22) usando os dados mockados.
- **Acceptance Criteria:** Números batem com a contagem real dos dados mockados carregados.
- **Validation Steps:** Conferir manualmente contagem exibida vs. array mockado.

### Ticket: T-FE-15 Exportação CSV (client-side)
- **Priority:** P1
- **Scope:** Botão que gera e baixa um CSV a partir dos dados mockados filtrados em tela (RF-23), sem chamada de API.
- **Acceptance Criteria:** Arquivo baixado abre corretamente e reflete os filtros aplicados no painel.
- **Validation Steps:** Aplicar filtro, exportar, abrir CSV e conferir linhas.

### Ticket: T-FE-16 Filtro por período/turma (cohort)
- **Priority:** P1
- **Scope:** Seletor de `cohort` no painel do admin (RF-24), usando os valores presentes nos dados mockados.
- **Acceptance Criteria:** Selecionar um cohort filtra o funil só para aquele período.
- **Validation Steps:** Teste manual trocando cohort.

### Ticket: T-FE-17 Revisão de responsividade mobile-first
- **Priority:** P1
- **Scope:** Passar as telas do aluno (login, tarefas, envio) e o formulário público por viewport mobile (RNF-01).
- **Acceptance Criteria:** Sem quebra de layout em 375px de largura nessas telas.
- **Validation Steps:** DevTools em viewport mobile, checklist manual por tela.

## 6. Definition of Done (desta etapa)

- Todas as telas P0 (Seção 3) navegáveis de ponta a ponta usando dados mockados via `services/`.
- Nenhum componente de UI importa `mocks/` diretamente (T-FE-04).
- Tema de cores do InfoHub aplicado (`tailwind.config` com paleta `brand-*`).
- `npm run build` e `npm run lint` sem erros.
- Checklist de RF-01 a RF-24 revisado: cada RF coberto nesta fase tem uma tela correspondente demonstrável; RFs que dependem de backend real (envio de e-mail de fato, persistência entre sessões) ficam marcados como "mock only" nesta etapa.

## 7. Observações para a integração futura com o backend

- Ao trocar `services/` para chamadas reais, os `types/` em `src/types/*` devem passar a ser derivados do Prisma Client (`import type { Team } from '@prisma/client'`) em vez de interfaces manuais — nesta fase eles são escritos à mão porque ainda não existe `schema.prisma` gerado/migrado no banco real de desenvolvimento.
- O `delay()` artificial dos mocks deve ser removido nessa troca; os componentes já devem estar preparados para loading states reais (Suspense/skeletons), então a experiência não deve mudar.
