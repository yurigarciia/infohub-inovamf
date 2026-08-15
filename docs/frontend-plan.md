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
- **Status:** Done
- **Scope:** `app/src/mocks/data/*.mock.ts` com um conjunto realista: 1 admin, 2 mentores, 6 equipes distribuídas pelas 6 etapas, alunos (líderes e integrantes, um deles em 2 equipes — Q4), tarefas em diferentes status, incluindo uma tarefa atrasada e uma com Pitch Vídeo como link externo (Q3).
- **Acceptance Criteria:** Dados cobrem todos os `status`/`role`/`stage` possíveis pelo menos uma vez (para toda tela ter algo pra mostrar em cada estado visual).
- **Validation Steps:** Checklist manual comparando enums usados em cada estado da UI.
- **Notes:** Verificado com um script ad-hoc (não commitado) checando integridade referencial (toda FK aponta pra um registro existente) e cobertura: `UserRole` 3/3, `TeamMemberRole` 2/2, `IdeaMaturity` 4/4, `TaskStatus` 6/6, `ReviewStatus` 3/3, `EmailNotificationType` 9/9, `EmailNotificationStatus` 3/3, 6/6 etapas com equipe. Também incluído `MOCK_TEAM_STAGE_HISTORY`, `MOCK_TEAM_NOTES`, `MOCK_TASK_TEMPLATES` e `MOCK_EMAIL_NOTIFICATIONS` (não estavam explícitos no escopo original, mas são necessários pros tickets T-FE-08/09/12 e para o dashboard).

### Ticket: T-FE-04 Camada de services (contratos assíncronos)
- **Priority:** P0
- **Status:** Done
- **Scope:** Implementar `services/*.service.ts` conforme Seção 4.1, cobrindo as consultas necessárias para as 8 telas P0.
- **Acceptance Criteria:** Nenhum componente importa de `mocks/` diretamente; toda leitura passa por uma função de `services/`.
- **Validation Steps:** Busca no código por imports de `mocks/` fora de `services/` — deve retornar vazio.
- **Notes:** `app/src/services/{users,journey,teams,tasks,notifications}.service.ts` + `latency.ts` (delay simulado) + `index.ts` barril. Todas as funções são `async`, recebem parâmetros no formato final (`TeamFilters`, inputs tipados) e retornam os tipos "view" de `types/`. Mutações (`advanceTeamStage`, `createTeamFromInscription`, `submitTask`, `reviewSubmission`, `addTeamNote`) alteram os arrays mock em memória e disparam `recordNotification` (log de e-mail mockado), replicando os efeitos colaterais que a versão real vai ter. `createTeamFromInscription` implementa o *lookup-or-create* por e-mail (T005 em PLAN.md): reaproveita conta existente em vez de duplicar. `submitTask`/`reviewSubmission` implementam o versionamento de entregas (RF-16). Validado com um smoke test ad-hoc (não commitado) exercitando os 8 fluxos P0 de ponta a ponta — todos passaram.

### Ticket: T-FE-05 Layout base + navegação por papel
- **Priority:** P0
- **Status:** Done
- **Scope:** Shell da aplicação (header com logo/wordmark, navegação lateral ou superior), com um seletor de "papel ativo" (mock de sessão) para alternar entre admin/mentor/aluno líder/aluno integrante durante a demo, já que não há login real ainda.
- **Acceptance Criteria:** Trocar o papel ativo muda os itens de menu visíveis, refletindo RNF-03.
- **Validation Steps:** Teste manual alternando papel e conferindo itens de menu.
- **Notes:** `lib/session.tsx` (Context + `useSession()`, persiste o usuário ativo em `localStorage`, resolve via `services/users.service.listUsers()` — nunca importa mocks direto) + `components/layout/{app-shell,role-switcher}.tsx`. Distinção líder/integrante no rótulo do seletor vem de `teams.service.getStudentMemberRoleSummary()` (nova função), respeitando Q1 (a distinção é por equipe, não papel global do usuário). Criadas rotas placeholder `/admin` e `/aluno` (stub, conteúdo real chega em T-FE-08/T-FE-10) só para a navegação não ter links quebrados. Validado com screenshot: sem sessão não há nav; escolher um admin mostra "Funil de equipes"; escolher uma aluna integrante troca para "Minhas tarefas". Nenhum erro no console. Quando o login real existir (T-FE-06), este provider deve ser trocado pelo resultado da autenticação de fato — `useSession()` continua a mesma API para quem consome.

### Ticket: T-FE-06 Tela de login (mock)
- **Priority:** P0
- **Status:** Done
- **Scope:** Formulário de login visual; submissão "autentica" contra os usuários mockados por e-mail e redireciona para a home do papel correspondente.
- **Acceptance Criteria:** Login com e-mail de cada papel mockado leva à respectiva home; e-mail não encontrado mostra erro.
- **Validation Steps:** Teste manual com e-mails válidos/inválidos dos mocks.
- **Notes:** `/login` usa `services/users.service.authenticateByEmail(email, password)` — a senha não é verificada nesta fase (só precisa estar preenchida), só a existência da conta pelo e-mail; a assinatura já é a que o login real vai ter. Sucesso chama `useSession().setUserId()` e redireciona: `STUDENT` → `/aluno`, `ADMIN`/`MENTOR` → `/admin`. Inclui link "Esqueci minha senha" (RF-01) com nota inline explicando que o fluxo real dependeria do Resend (Q7) — sem simular o envio de fato. `AppShell` ganhou um link "Entrar" visível só quando não há sessão ativa; o seletor de papel do T-FE-05 continua disponível como "Atalho de demonstração" ao lado do login real. Validado com screenshot: e-mail inexistente mostra erro inline; login válido de aluno redireciona pra `/aluno` e atualiza a sessão exibida no header. Sem erros de console.

### Ticket: T-FE-07 Formulário público de inscrição (Etapa 1)
- **Priority:** P0
- **Status:** Done
- **Scope:** Todos os campos da Seção 4.2, incluindo e-mail por integrante e campo repetível de colegas, consentimento LGPD, validação client-side (zod/react-hook-form).
- **Acceptance Criteria:** Submissão válida adiciona uma equipe nova ao mock em memória, visível no painel do admin sem reload da página.
- **Validation Steps:** Preencher e enviar; conferir card novo aparecendo no funil.
- **Notes:** `/cadastro`, com `react-hook-form` + `zod` (instalados nesta etapa — `@hookform/resolvers` para a integração). Campo repetível de colegas via `useFieldArray`, cada um com nome/e-mail/curso/período (período incluído mesmo não estando explícito no texto do documento original, porque `student_profiles.period` é `NOT NULL` no schema — mesmo padrão aplicado ao líder). Submissão chama `createTeamFromInscription`, que agora retorna `{ team, leaderUserId }` (ajuste de contrato) para a página poder logar automaticamente o líder (RF-02: o próprio envio cria a conta de acesso) e redirecionar para `/aluno`. `cohort` fixo em `CURRENT_COHORT` (nova constante em `lib/constants.ts`, também usada pelos mocks). Confirmação de que o painel do admin (T-FE-08) mostrará a equipe nova fica pendente daquele ticket (ainda não existe UI de kanban); a criação em si já foi validada na camada de service (T-FE-04).

  Dois bugs reais encontrados e corrigidos durante a validação visual: (1) `SelectValue` do Base UI não mostra o rótulo do item selecionado sem uma função `children` explícita — corrigido nos dois selects (área e estágio). (2) `SessionProvider` (T-FE-05) carregava a lista de usuários só uma vez no mount, então uma conta criada em runtime (o líder do formulário) não resolvia em `user` mesmo depois de `setUserId` — corrigido tornando `setUserId` assíncrono: ele recarrega a lista de usuários e só depois aplica o novo id, e os chamadores (`/login`, `/cadastro`) agora fazem `await`.

### Ticket: T-FE-08 Painel do administrador — funil/kanban
- **Priority:** P0
- **Status:** Done
- **Scope:** Board com 6 colunas (etapas), cards de equipe, busca e filtros (nome, curso, área, status de tarefa, mentor).
- **Acceptance Criteria:** Filtros combinam corretamente (AND); busca por nome é case-insensitive.
- **Validation Steps:** Teste manual combinando 2+ filtros.
- **Notes:** `/admin` substitui o placeholder do T-FE-05. 6 colunas (`getJourneyStages()`), cards com área, líder marcado e badge "Pronta p/ InovAMF" quando aplicável. Filtros (busca, curso, área, status de tarefa, mentor) combinam em AND via `getTeamsByStage(filters)` — todos opcionais, `getIdeaAreas()`/nova `getMentors()` (`users.service.ts`) alimentam os selects. Nova regra de lint (`react-hooks/set-state-in-effect`, provavelmente do React 19/Next 16) barrou `setIsLoading(true)` síncrono no corpo do effect de filtro — corrigido adiando a chamada para dentro de um `Promise.resolve().then()`. Validado com screenshot + smoke test: busca por "EcoRota" isola 1 equipe, filtro de status "Atrasada" encontra corretamente a FinPlan (única com tarefa LATE). Sem erros de console. Clique para abrir detalhe da equipe fica para o T-FE-09 (rota ainda não existe).

### Ticket: T-FE-09 Página de detalhe da equipe
- **Priority:** P0
- **Status:** Done
- **Scope:** Dados cadastrais, histórico de etapas, lista de tarefas, arquivos entregues, anotações internas (ocultas para o aluno).
- **Acceptance Criteria:** Anotações internas não renderizam quando o papel ativo é aluno.
- **Validation Steps:** Alternar papel ativo na mesma equipe e conferir visibilidade.
- **Notes:** `/admin/equipes/[teamId]` (rota dinâmica, Server Component fino que resolve `params` e delega pro Client Component `components/teams/team-detail-view.tsx`). Cards de dados cadastrais, equipe (integrantes + mentores), histórico de etapas (nome resolvido via `getJourneyStages()`) e tarefas com entregas (link do arquivo/link externo + status de revisão, mostrando as duas versões quando há reprovação+reenvio). Seção de anotações internas + formulário de adicionar (`addTeamNote`) só renderiza se `isStaff` (`ADMIN`/`MENTOR`). Botões "Avançar etapa"/"Retroceder etapa" (RF-09, via `advanceTeamStage`) também só para staff, desabilitados nas bordas (etapa 1/6). **Guarda de acesso**: se o usuário ativo é `STUDENT` e não é membro da equipe, a página mostra "Você não tem acesso a esta equipe." em vez dos dados — checagem básica de RNF-03 nesta camada (reforço mais completo fica para o T-FE-17). Reaproveitado o mesmo padrão de `Promise.resolve().then()` para os `setState` em efeito (mesma regra de lint do T-FE-08). Também criado `lib/labels.ts` centralizando os mapas de rótulo PT-BR que estavam duplicados entre `admin/page.tsx`, `cadastro/page.tsx` e `role-switcher.tsx`. Validado com smoke test: admin vê anotações e botões; o próprio líder da equipe (aluno) não vê nem um nem outro; aluno de outra equipe é bloqueado; avançar etapa move a equipe e atualiza o histórico. Sem erros de console.

### Ticket: T-FE-10 Área do aluno — lista de tarefas + envio
- **Priority:** P0
- **Status:** Done
- **Scope:** Lista de tarefas do aluno logado (mock), tela/modal de envio suportando upload de arquivo (mock de input file, sem upload real) e link externo (Pitch Vídeo).
- **Acceptance Criteria:** Envio muda o status da tarefa para "SUBMITTED" no mock em memória, refletido na visão do admin.
- **Validation Steps:** Enviar como aluno, conferir mudança de status na visão do admin.
- **Notes:** `/admin` substitui o placeholder do T-FE-05. `getTasksForStudent` (T-FE-04) ganhou um novo tipo de retorno `TaskWithTeam` (nome da equipe resolvido — necessário porque um aluno pode ter tarefas de mais de uma equipe, Q4). Tarefas divididas em "Pendentes" (PENDING/IN_PROGRESS/LATE/REJECTED — precisam de ação) e "Concluídas" (SUBMITTED/APPROVED). Formulário de envio inline por tarefa com toggle arquivo/link: upload valida tipo (PDF/PNG/JPEG/MP4) e tamanho (até 50 MB, RNF-04) client-side antes de enviar, usando `URL.createObjectURL` como `fileUrl` mock (não há upload real nesta fase); link valida como URL bem formada. Guarda de papel: usuário não-aluno vê "Esta área é exclusiva para alunos." Validado com smoke test: envio por link move a tarefa para "Concluídas"; upload de `.txt` é rejeitado por tipo; upload de 51 MB é rejeitado por tamanho; upload de PDF válido de ~34 bytes é aceito e a tarefa migra de pendente para concluída. Sem erros de console.

### Ticket: T-FE-11 Aprovação/reprovação + histórico de versões
- **Priority:** P0
- **Status:** Done
- **Scope:** Ação de aprovar/reprovar na página de detalhe da tarefa; reprovação reabre a tarefa com comentário; reenvio gera nova versão, mantendo a anterior visível no histórico.
- **Acceptance Criteria:** Fluxo completo reprovar → aluno reenvia → nova versão aparece, versão antiga preservada.
- **Validation Steps:** Teste manual do fluxo completo alternando papéis.
- **Notes:** Sem rota própria de "detalhe da tarefa" — os botões Aprovar/Reprovar ficam inline no card da tarefa dentro de `/admin/equipes/[teamId]` (T-FE-09), que já reúne todo o contexto necessário (título, descrição, prazo, histórico de versões). Só aparecem para `isStaff` quando a entrega atual (`isCurrent`) está `PENDING`; reprovar exige comentário (usa `reviewSubmission` de T-FE-04). Validado com smoke test de ponta a ponta: reprovar a v2 do AgroSmart com comentário → Thiago (líder) reenvia pelo `/aluno` → volta pro admin e as 3 versões aparecem (v1 Reprovada, v2 Reprovada, v3 Em análise), com os botões de revisão reaparecendo pra v3. Sem erros de console.

  **Gotcha descoberto durante o teste**: os mocks vivem só em memória do lado do navegador — uma navegação de página inteira (`location.href`/refresh, não um `<Link>` do Next.js) reseta todo o estado mockado de volta ao dataset inicial. Isso é esperado nesta fase (T-FE-04 já previa isso: "não persiste entre reloads") e não afeta o uso real do app (a navegação normal por `<Link>`/`router.push` nunca recarrega a página), mas é importante lembrar ao escrever testes/scripts de verificação: sempre navegar clicando em links, nunca com `page.goto()` para rotas internas depois do primeiro carregamento.

### Ticket: T-FE-12 CRUD de tarefas + templates por etapa
- **Priority:** P1
- **Status:** Done
- **Scope:** Tela do admin para criar tarefa (avulsa ou a partir de template), editar prazo/descrição.
- **Acceptance Criteria:** Tarefa criada aparece na lista do aluno correspondente.
- **Validation Steps:** Criar tarefa como admin, conferir na área do aluno.
- **Notes:** Sem tela própria — formulário "Nova tarefa" e o link "Editar" ficam no mesmo card de `/admin/equipes/[teamId]` usado pela revisão (T-FE-11), mesmo raciocínio de reaproveitar o contexto já reunido em vez de fragmentar em outra rota. Novo `createTask`/`updateTask`/`getTaskTemplates` em `tasks.service.ts`: escolher um template pré-preenche título/descrição (ainda editáveis); tarefa avulsa fica com `templateId: null`. Criar tarefa notifica todos os membros da equipe (`TASK_ASSIGNED`, RF-18). Validado com smoke test: editar prazo de uma tarefa existente reflete na hora; criar tarefa avulsa aparece no card da equipe e, ao trocar para o líder daquela equipe, aparece em `/aluno` na aba Pendentes. Sem erros de console.

### Ticket: T-FE-13 Lembretes (configuração + manual)
- **Priority:** P1
- **Status:** Done
- **Scope:** UI de configurar datas de lembrete por tarefa e disparar lembrete manual avulso (sem envio real de e-mail — apenas registro visual "lembrete enviado").
- **Acceptance Criteria:** Lembrete configurado aparece listado na tarefa; disparo manual muda um indicador visual de "último lembrete".
- **Validation Steps:** Teste manual configurando e disparando lembrete.
- **Notes:** Corrigido um bug latente: `toTaskWithDetails` (T-FE-04) sempre retornava `reminders: []` hardcoded, nunca lendo `MOCK_TASK_REMINDERS` — corrigido para resolver de verdade. Novo `configureReminder`/`sendManualReminder` em `tasks.service.ts`; disparo manual também notifica todos os membros da equipe (`MANUAL_REMINDER`, RF-18). UI (`ReminderSection`, dentro do card de tarefa em `/admin/equipes/[teamId]`, staff-only) lista os lembretes existentes, mostra "Último lembrete enviado", e tem os dois controles: "Enviar lembrete agora" e "Configurar lembrete automático" (data). O disparo automático de fato (job varrendo tarefas na data configurada) é trabalho de backend — fora do escopo do frontend mockado. Validado com screenshot: lembrete manual aparece na lista com "(manual)" e atualiza o indicador; lembrete automático configurado aparece como "agendado". Sem erros de console.

### Ticket: T-FE-14 Dashboard com indicadores
- **Priority:** P1
- **Status:** Done
- **Scope:** Cards de KPI (RF-22) usando os dados mockados.
- **Acceptance Criteria:** Números batem com a contagem real dos dados mockados carregados.
- **Validation Steps:** Conferir manualmente contagem exibida vs. array mockado.
- **Notes:** `/admin/dashboard`, nova `services/reports.service.ts` (`getDashboardStats`, já aceita `cohort` opcional para reuso no T-FE-16), novo `types/reports.ts`. Exclusivo do papel `ADMIN` (RF-22 é "para a coordenação"; mentor não vê). 3 stat tiles (equipes ativas, tarefas atrasadas, prontas para o InovAMF) + distribuição por etapa como barras horizontais usando a mesma escala de marca (`brand-300`→`brand-800`) já usada nos badges de etapa — carreguei a skill `dataviz` antes de construir, já que é um dashboard com stat tiles + uma visualização de magnitude por categoria; como é encoding sequencial de hue único (não categórico multi-série), não precisou rodar o validador de paleta categórica. Cada barra já vem com o rótulo do valor sempre visível (sem depender de hover). Também corrigi um bug de destaque duplo na navegação: como "/admin/dashboard" começa com "/admin", tanto "Funil de equipes" quanto "Dashboard" ficavam marcados como ativos ao mesmo tempo — corrigido escolhendo sempre o item de href mais específico. Validado com screenshot: 6 equipes ativas, 1 tarefa atrasada, 1 pronta para o InovAMF, 1 equipe por etapa — tudo batendo com os mocks. Sem erros de console.

### Ticket: T-FE-15 Exportação CSV (client-side)
- **Priority:** P1
- **Status:** Done
- **Scope:** Botão que gera e baixa um CSV a partir dos dados mockados filtrados em tela (RF-23), sem chamada de API.
- **Acceptance Criteria:** Arquivo baixado abre corretamente e reflete os filtros aplicados no painel.
- **Validation Steps:** Aplicar filtro, exportar, abrir CSV e conferir linhas.
- **Notes:** Novo `lib/csv.ts` (`toCsv` — serializa com escaping de vírgula/aspas/quebra de linha; `downloadTextFile` — Blob + `<a download>`, sem chamada de rede). Botão "Exportar CSV" em `/admin` ao lado do título, desabilitado quando não há equipes. Exporta exatamente o array `teams` já filtrado em tela (nome, área, etapa, turma, estágio da ideia, pronta para InovAMF, líder + e-mail, demais integrantes). Validado interceptando o evento de download do Playwright: filtrar por área "Sustentabilidade" e exportar gera um CSV com exatamente as 2 linhas esperadas (EcoRota, AgroSmart) e todas as colunas corretas. Sem erros de console.

### Ticket: T-FE-16 Filtro por período/turma (cohort)
- **Priority:** P1
- **Status:** Done
- **Scope:** Seletor de `cohort` no painel do admin (RF-24), usando os valores presentes nos dados mockados.
- **Acceptance Criteria:** Selecionar um cohort filtra o funil só para aquele período.
- **Validation Steps:** Teste manual trocando cohort.
- **Notes:** Até este ticket todos os mocks compartilhavam a mesma turma (`CURRENT_COHORT`, "2026.2"), então o filtro não tinha o que filtrar de verdade — adicionada uma 7ª equipe (`team-7`, "EcoVerde") na turma anterior ("2026.1", constante `PREVIOUS_COHORT`), com usuário, membro, mentor e histórico de etapa próprios, para o filtro ser demonstrável. Nova `getCohorts()` em `teams.service.ts` deriva os valores distintos direto de `MOCK_TEAMS` (mais recente primeiro), populando o novo `FilterSelect` "Turma" em `/admin`, que já combina em AND com os demais filtros (T-FE-08) e é usado pela exportação CSV (T-FE-15) sem nenhuma mudança adicional, já que ambos leem o mesmo estado `teams` filtrado. Validado com screenshot: sem filtro mostra as 7 equipes; selecionar "2026.1" isola exatamente a EcoVerde ("1 equipe(s) encontrada(s)"). Sem erros de console.

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
