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

> RF-03 (gestão de contas admin/mentor) estava listada aqui como "fora desta etapa" originalmente, mas acabou implementada — ver T-FE-19.

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
- **Status:** Done
- **Scope:** Passar as telas do aluno (login, tarefas, envio) e o formulário público por viewport mobile (RNF-01).
- **Acceptance Criteria:** Sem quebra de layout em 375px de largura nessas telas.
- **Validation Steps:** DevTools em viewport mobile, checklist manual por tela.
- **Notes:** Testado em 375px antes de mexer em qualquer CSS (medindo `scrollWidth` vs. `clientWidth`) em vez de adivinhar — achou overflow horizontal real (603px de conteúdo num viewport de 375px) em **todas** as páginas, com a mesma causa raiz: o `AppShell` (header compartilhado), não as páginas em si (`/login`, `/cadastro`, `/aluno` já empilhavam bem sozinhas). Corrigido: wordmark "InfoHub → InovAMF" vira só o ícone abaixo de `sm:` (texto só aparece em telas maiores); nav ganha `overflow-x-auto` em vez de forçar a largura; "Enviar minha ideia" vira "Inscrever-se" no mobile; `RoleSwitcher` esconde o label "Atalho de demonstração:" e o `<select>` fica com `w-28` (trunca o nome, mas a lista continua completa ao abrir) em vez de `w-auto`. Revalidado: `scrollWidth === clientWidth` (zero overflow) em `/`, `/login`, `/cadastro` (com um colega adicionado) e `/aluno` (lista e formulário de envio aberto); desktop conferido lado a lado pra garantir que nada regrediu. Sem erros de console.

### Ticket: T-FE-18 Landing page + sidebar administrativa
- **Priority:** P1
- **Status:** Done
- **Scope:** Reestruturação de navegação, pedida depois do T-FE-17: a `/` era um resto do style guide do T-FE-01, a navegação inteira vivia em botões soltos no header, e não havia "casa" pra funcionalidades administrativas crescerem.
- **Acceptance Criteria:** `/` vira uma landing page de verdade (pública, com CTAs "Enviar minha ideia"/"Entrar" e o resumo das 6 etapas); área administrativa ganha uma sidebar fixa própria; header principal fica só com logo + sessão.
- **Validation Steps:** Navegar deslogado pela landing; logar como admin e conferir a sidebar; logar como aluno e conferir que a home redireciona pra `/aluno`.
- **Notes:** `app/page.tsx` reescrita como landing pública (hero com gradiente de marca, CTAs, `JourneySteps` — as 6 etapas buscadas via `getJourneyStages()`, não hardcoded); quem já tem sessão ativa é redirecionado automaticamente pro seu destino (`/aluno` ou `/admin`) via `useEffect` + `router.replace`. Novo `app/admin/layout.tsx` com `AdminSidebar` (sidebar fixa em desktop, vira barra horizontal com scroll em mobile) — a guarda de papel continua em cada página (a sidebar é só chrome, não fronteira de autorização, RNF-03). `AppShell`/header simplificado: nav de admin/mentor removida de lá (a sidebar assume), só o aluno mantém um link direto ("Minhas tarefas").

  **Dois bugs reais encontrados e corrigidos durante a validação:** (1) o botão "Sair" nunca navegava pra lugar nenhum — quem saía de uma página restrita (ex.: `/admin/contas`) ficava preso vendo a mensagem de acesso negado; corrigido com `router.push("/")` depois do `signOut()`. (2) `Button` com `render={<Link/>}` (padrão Base UI) sem `nativeButton={false}` disparava um warning de acessibilidade no console (link renderizado sem semântica nativa de botão); corrigido nos dois CTAs da landing.

  Validado com smoke test: landing → login → redireciona pro `/admin` corretamente; clicar no logo enquanto logado volta pro próprio painel (não mostra a landing de novo); logout leva de volta pra `/`; zero overflow mobile em `/`, `/admin` (sidebar) e `/admin/contas`. Sem erros de console.

### Ticket: T-FE-19 Gestão de contas admin/mentor (RF-03)
- **Priority:** P1
- **Status:** Done
- **Scope:** RF-03 tinha ficado de fora da Fase 1 (listada como baixa prioridade); aproveitando a reestruturação de navegação (T-FE-18), que abriu espaço na sidebar pra isso, foi implementada.
- **Acceptance Criteria:** Admin consegue listar, criar, editar e desativar/reativar contas de administrador/mentor.
- **Validation Steps:** Criar uma conta de mentor, editar, desativar, reativar; conferir que a própria conta logada não pode se autodesativar.
- **Notes:** Novo `/admin/contas` (exclusivo `ADMIN` — mentor não gerencia outras contas), na sidebar do T-FE-18. `services/users.service.ts` ganhou `getStaffUsers`/`createStaffUser`/`updateStaffUser`/`setStaffUserActive`, cada mutação registrando auditoria (RNF-05: `STAFF_ACCOUNT_CREATED/UPDATED/DEACTIVATED/REACTIVATED`, novos rótulos em `/admin/auditoria`). Componentes `components/admin/{staff-form,staff-list}.tsx` seguem o mesmo padrão de edição inline já usado em tarefas (T-FE-12).

  **Bug de self-lockout encontrado durante a validação** (não em produção — no meu próprio script de teste, um seletor errado desativou a conta admin logada em vez da conta de teste): confirmou que a UI não impedia um admin de desativar a própria conta, o que travaria o acesso dele até outro admin reativar. Corrigido em duas camadas: o botão "Desativar" fica desabilitado na própria linha (`isSelf && staffUser.isActive`), e `setStaffUserActive` no service rejeita a mesma operação mesmo se chamada diretamente (defesa em profundidade). Validado: botão desabilitado confirmado via teste automatizado: `self-deactivate disabled: true`.

### Ticket: T-FE-20 Área do aluno com sidebar própria
- **Priority:** P1
- **Status:** Done
- **Scope:** Pedido depois do T-FE-18/T-FE-19: a área administrativa ganhou sidebar e navegação de verdade, mas a área do aluno continuou igual a antes (só o link "Minhas tarefas" solto no header). Objetivo: espelhar a estrutura do painel administrativo — sidebar com opções, incluindo acesso às informações da própria equipe.
- **Acceptance Criteria:** `/aluno` ganha sidebar própria ("Minhas tarefas" / "Minhas equipes"); aluno consegue ver os dados da(s) equipe(s) da qual participa (dados cadastrais, integrantes, mentores, histórico de etapas, tarefas), sem os controles exclusivos de admin/mentor (avançar etapa, notas internas).
- **Validation Steps:** Logar como aluno com 1 equipe (auto-redirect direto pro detalhe) e como aluno com 2+ equipes (Q4 — lista intermediária); conferir card de equipe leva à página de detalhe certa; conferir que o admin continua acessando a mesma página de detalhe a partir do kanban; checar 375px sem overflow.
- **Notes:** Extraído `components/layout/sidebar-nav.tsx` (componente genérico, chrome compartilhado entre desktop fixo/mobile scroll horizontal) reusado tanto por `admin-sidebar.tsx` quanto pelo novo `components/aluno/aluno-sidebar.tsx`. Novo `app/aluno/layout.tsx` monta a sidebar do aluno; `app-shell.tsx` simplificado (removida a lógica antiga de nav por papel no header, já que as duas áreas passaram a ter sidebar própria).

  A página de detalhe da equipe (RF-08/09/10) vivia em `/admin/equipes/[teamId]`, mas nunca foi exclusiva do admin — mentores e agora também alunos membros precisam acessá-la. Movida para a rota neutra `/equipes/[teamId]` (junto com `team-board-card.tsx`, de `components/admin/` pra `components/teams/`); a guarda de acesso dentro de `TeamDetailView` (staff OU membro da equipe, senão nega) continua sendo a fronteira real (RNF-03) — a rota em si não é a proteção. O link "← Voltar" ficou role-aware: "Voltar ao funil" (`/admin`) pra staff, "Voltar às minhas equipes" (`/aluno/equipes`) pro aluno.

  Nova `getTeamsForStudent()` em `teams.service.ts` e `app/aluno/equipes/page.tsx`: lista as equipes do aluno (Q4 — um aluno pode integrar mais de uma) via `team_members`; com exatamente 1 equipe, pula direto pro detalhe (`router.replace`) em vez de mostrar uma lista de um item só.

  Validado com Playwright: aluno com 1 equipe (João Pedro Alves) — clicar em "Minhas equipes" já cai direto em `/equipes/team-1`, mostrando dados cadastrais/integrantes/mentores/tarefas da própria equipe, sem os cards exclusivos de staff. Aluno com 2 equipes (Beatriz Fernandes, Q4) — `/aluno/equipes` mostra as 2 equipes (SaúdeConecta, AgroSmart) sem redirect automático; clicar em um card leva à equipe certa. Admin (Ana Beatriz Souza) — kanban em `/admin` continua funcionando, card leva a `/equipes/team-1` com "← Voltar ao funil". Zero overflow em 375px em `/aluno` e `/aluno/equipes`. Sem erros de console em nenhum fluxo.

### Ticket: T-FE-21 Polimento de header e cursor global
- **Priority:** P2
- **Status:** Done
- **Scope:** Três ajustes de refinamento pedidos após o T-FE-20: (1) tirar o select "Atalho de demonstração" do header global e movê-lo para `/login`; (2) `cursor: pointer` em tudo que é clicável; (3) header da landing com CTAs que realmente parecem botões.
- **Acceptance Criteria:** Header só mostra "Sair" quando há sessão ativa; `/login` ganha um seletor de perfis mockados abaixo do formulário real; elementos clicáveis (links, botões, select, itens de menu/aba) mostram cursor de mão; CTAs do header usam o componente `Button`.
- **Validation Steps:** Conferir header deslogado (landing/login/cadastro) e logado (aluno/admin); testar o seletor de demonstração em `/login`; inspecionar `cursor` computado num link; checar 375px sem overflow.
- **Notes:** `role-switcher.tsx` reduzido a só o botão "Sair" (RF-01) — o `<select>` de perfis foi extraído para `app/login/demo-profile-picker.tsx`, reaproveitando `getStudentMemberRoleSummary`/`useSession().users` que já existiam. `app-shell.tsx` passou a renderizar "Enviar minha ideia"/"Entrar" como `Button` (`outline`/`default`) em vez de texto sublinhado — mesmo padrão já usado no hero da landing (T-FE-18), então praticamente elimina a duplicação visual. Regra global em `globals.css` (`@layer base`) aplica `cursor: pointer` a `button:not(:disabled)`, `a[href]`, `select`, `[role="button"]`, `[role="menuitem"]`, `[role="tab"]` e `label[for]` — cobre também os componentes Base UI (que já usam esses roles) sem precisar tocar em cada um. Validado com Playwright: `/login` mostra o formulário real + o atalho de demonstração separado por divisor; selecionar um perfil no atalho loga e navega corretamente (`/aluno` ou `/admin`); área logada mostra só "Sair" no header; `cursor: pointer` confirmado computado num link da sidebar; zero overflow em 375px em `/` e `/login`. Sem erros de console.

### Ticket: T-FE-22 Identidade visual na sidebar e nas áreas logadas
- **Priority:** P2
- **Status:** Done
- **Scope:** Feedback visual pós-T-FE-21: interface muito monocromática/branca, especialmente a sidebar, sem uso da identidade de marca fora do header e dos badges de etapa.
- **Acceptance Criteria:** Sidebar (admin e aluno, que compartilham `SidebarNav`) usa a cor de marca em vez de cinza claro; cabeçalhos das colunas do kanban usam a mesma paleta; área de conteúdo logada tem um tom de fundo que destaca os cards brancos por cima.
- **Validation Steps:** Conferir visualmente `/admin`, `/admin/dashboard`, `/aluno` (desktop e 375px); checar que os cards continuam legíveis (branco sobre `neutral-50`) e que o item ativo da sidebar se destaca sobre o fundo escuro.
- **Notes:** `sidebar-nav.tsx` trocou `bg-neutral-50`/texto cinza por `bg-brand-900` (bordô escuro do logotipo) com texto `brand-100`/branco; item ativo vira `bg-brand-600` (em vez do antigo `bg-brand-50` claro, que sumia contra um fundo já claro). Cabeçalho de cada coluna do kanban em `/admin` trocou `bg-neutral-100` por `bg-brand-800` com badge de contagem `bg-brand-600`. `admin/layout.tsx` e `aluno/layout.tsx` ganharam `bg-neutral-50` na área de conteúdo (antes era branco puro, igual aos cards — sem separação visual nenhuma entre "página" e "cartão"). Dashboard (T-FE-14) já usava a escala de marca nas barras e não precisou de ajuste. Validado com screenshots: sidebar escura consistente nas duas áreas, kanban com cabeçalhos de cor, dashboard e lista de tarefas do aluno com cards brancos bem destacados do fundo; mobile (375px) mantém a sidebar horizontal na mesma paleta, sem overflow. Sem erros de console.

### Ticket: T-FE-23 Header colorido com logo branca + sidebar mais leve
- **Priority:** P2
- **Status:** Done
- **Scope:** Ajuste fino pós-T-FE-22: o peso visual (bordô escuro) ficou espalhado demais pela sidebar/kanban; a sugestão foi concentrar a cor de marca no header (usando a variante branca da logo, `assets/logo-branca.png`) e deixar a sidebar mais leve de novo.
- **Acceptance Criteria:** Header usa o gradiente de marca (mesmo do hero da landing) com a logo branca por cima; sidebar volta a um fundo claro com acento de cor só no item ativo; kanban usa cor só como destaque (borda + badge), não preenchendo o cabeçalho inteiro.
- **Validation Steps:** Conferir logo completa (sem cortes) no header em `/`, `/admin`, `/aluno`; conferir contraste dos CTAs/"Sair" sobre o gradiente; checar 375px sem overflow; sem warning de LCP no console.
- **Notes:** Header (`app-shell.tsx`) ganhou o gradiente de marca (`#4A0E1A → #D62027 → #F7941D`, mesmo do hero) com a logo branca por cima (`Image` com `priority` — resolve o warning de LCP que aparecia sem isso). A logo usada é o arquivo **inteiro** (`logo-branca.png`, lockup quadrado com ícone + wordmark + tagline) — cheguei a testar uma versão recortada só do ícone+wordmark para caber melhor numa barra fina, mas foi revertido a pedido explícito do usuário ("não pedi pra cortar, coloque inteira"); o tamanho final é o mesmo do ícone antigo (`h-8`/`h-9`, ~32-36px), então a tag "infohub" fica pequena mas a imagem não é cortada. CTAs "Enviar minha ideia"/"Entrar" e o link "Sair" (`role-switcher.tsx`) recoloridos para branco/outline branco, legíveis sobre o gradiente. `sidebar-nav.tsx` voltou a `bg-white` com item ativo `bg-brand-50`/`text-brand-700` (revertendo o `bg-brand-900` do T-FE-22, que tinha ficado pesado). Cabeçalho das colunas do kanban em `/admin` trocou o preenchimento sólido `bg-brand-800` por `bg-brand-50` + `border-l-4 border-brand-600`, cor como acento em vez de bloco cheio. Hero da landing (`app/page.tsx`) perdeu o ícone+título duplicado (o header já mostra a logo completa agora) — ficou só a chamada + CTAs.

  **Correção durante a validação:** o primeiro recorte do ícone cortou o topo do ícone (margem insuficiente no `sharp.extract`); percebido pelo usuário via screenshot e revertido para a logo inteira antes mesmo de eu re-testar o recorte corrigido — mantido o arquivo completo por decisão explícita, não o recorte.

  **Ajuste fino seguinte (mesmo ticket):** o usuário pediu pra escalar a logo usando o máximo de espaço possível **sem** cortar a imagem e **sem** aumentar a altura do header. Solução: a logo saiu do fluxo do flexbox (`position: absolute`, header com `overflow-visible`) e cresceu bem além da faixa de 52px do header (`h-24`/`sm:h-28`), "vazando" visualmente por cima e por baixo da faixa colorida sem afetar a altura real do `<header>` nem sobrepor o conteúdo abaixo. Reposicionada em seguida para alinhar com o mesmo inset horizontal (`left-4`/`sm:left-6`, medido a partir da padding-box do container `relative`) que os botões da direita já respeitavam (`px-4`/`sm:px-6`) — confirmado por medição via Playwright: 88px de cada lado em viewport 1280px.

### Ticket: T-FE-24 Vídeo de fundo no hero da landing
- **Priority:** P2
- **Status:** Done
- **Scope:** Trocar o gradiente estático do hero por um vídeo do YouTube do prédio do InovAMF rodando em loop, decorativo (sem áudio, sem controles, não clicável/pausável), com o gradiente de marca como fallback enquanto carrega.
- **Acceptance Criteria:** Vídeo cobre o hero inteiro (sem distorcer proporção), com um filtro escuro por cima garantindo legibilidade do texto; gradiente aparece antes do vídeo carregar e há um fade suave na troca; vídeo não responde a clique/teclado.
- **Validation Steps:** Carregar `/` e observar a troca gradiente→vídeo; inspecionar `pointer-events` do iframe; checar 375px sem overflow horizontal (vídeo não deve vazar a largura da viewport); sem erros de console.
- **Notes:** Novo `components/landing/hero-background-video.tsx` — embed `youtube-nocookie.com` (`autoplay=1&mute=1&loop=1&playlist=<id>&controls=0&disablekb=1&fs=0`), envolvido num wrapper `pointer-events-none` (garante não-clicável independentemente dos parâmetros do embed) sized via truque de proporção (`w-[177.78vh] h-[56.25vw]` com `min-w-full min-h-full`, centralizado) pra sempre cobrir o container em qualquer proporção de tela, como um `object-fit: cover` manual (iframes do YouTube não suportam `object-fit` nativamente). Estado `isVideoReady` (via `onLoad` do iframe) controla um crossfade de opacidade entre o gradiente de marca (mostrado primeiro) e o vídeo+filtro. O filtro é o mesmo gradiente de marca, só que com alpha reduzido, mantendo a identidade visual por cima da imagem real do vídeo. Header ganhou `shadow-md` pra se separar visualmente do hero, já que agora o hero tem sua própria textura (vídeo) — antes os dois se fundiam por serem o mesmo gradiente sólido, o que o usuário percebeu como o header parecendo "descentralizado" (o header em si já estava com os elementos centralizados corretamente, matematicamente — 26px de centro tanto pra logo quanto pros botões — o problema era puramente a ausência de uma fronteira visual clara).

  **Bug encontrado e corrigido durante a validação (não relacionado ao vídeo):** o subtítulo do hero (`<p className="max-w-xl">`) ficava alinhado à esquerda em vez de centralizado sob o título, porque o container flex-column pai não tinha `items-center` — o `text-center` herdado centraliza o texto *dentro* da caixa do parágrafo, mas não centraliza a própria caixa (que fica mais estreita que o container por causa do `max-w-xl`) dentro do flex column, que teria a caixa esticada à esquerda por padrão (`align-items: stretch`). Esse bug já existia antes deste ticket, só ficou visualmente óbvio ao usuário nesta tela mais larga. Corrigido com `items-center` no container.

  **Ajuste seguinte (mesmo ticket):** reintroduzido o ícone antigo (`logotipo.png`, sem o wordmark) acima do título do hero — pedido do usuário pra "ganhar mais espaço" visualmente na composição (o hero tinha ficado só com texto+CTAs depois da T-FE-23 remover o ícone duplicado). `alt=""` porque é decorativo — o header já tem a logo com `alt` acessível, evitando anúncio duplicado pra leitor de tela.

### Ticket: T-FE-25 Conteúdo institucional na landing page
- **Priority:** P2
- **Status:** Done
- **Scope:** Landing estava muito enxuta (só hero + as 6 etapas). Usuário pediu análise do site oficial do InovAMF (`faculdadeamonline.com.br/inovamf`) e incorporação do conteúdo institucional relevante — quem chega no InfoHub sem contexto não sabe o que é o InovAMF nem por que vale a pena chegar até lá.
- **Acceptance Criteria:** Landing ganha seções novas com conteúdo real (não placeholder) extraído do site institucional: o que é o programa, benefícios de participar, CTA final e rodapé com localização/instituições. Mantém o estilo visual já estabelecido (cores de marca, cards com borda, mesmo padrão dos outros componentes de `landing/`).
- **Validation Steps:** Fetch do site oficial pra extrair conteúdo real; conferir visualmente todas as seções novas em desktop e 375px; checar sem overflow e sem erros de console.
- **Notes:** Conteúdo extraído via fetch de `faculdadeamonline.com.br/inovamf` (slogan "Humanismo, Negócios & Tecnologia", objetivos, benefícios, estrutura física, localização). Três componentes novos em `components/landing/`, cada um com uma responsabilidade: `about-inovamf.tsx` (o que é o programa, resumo institucional), `inovamf-benefits.tsx` (grid de 5 benefícios com ícone `lucide-react` — mentoria, infraestrutura, incubação/aceleração, parcerias, mentalidade empreendedora), `landing-footer.tsx` (instituições fundadoras + localização no Recanto Maestro). `app/page.tsx` ganhou também uma seção de CTA final (mesmo gradiente de marca do hero) antes do rodapé. Conteúdo é estático (não vem de `services/`/mocks — é institucional, não dado de domínio do InfoHub) por isso os componentes não são `"use client"` nem têm estado. Validado com screenshot full-page em desktop e 375px: todas as seções renderizam corretamente, sem overflow horizontal, sem erros de console.

### Ticket: T-FE-26 Refinamento visual da landing (T-FE-25)
- **Priority:** P2
- **Status:** Done
- **Scope:** Ajustes finos pós-T-FE-25, todos feedback direto do usuário: (1) seções consecutivas com o mesmo fundo branco se misturavam sem separação visual; (2) "Como funciona a jornada" em cards ficou datado, pedido formato timeline; (3) grid de benefícios com número ímpar de itens (5) quebrava torto na última linha; (4) rodapé estava com identidade do InovAMF/Fundação em vez do InfoHub (que é a entidade correta — o InfoHub é o laboratório da própria FAMF que encaminha equipes ao InovAMF, não o InovAMF em si, ver `docs/Infohub_InovAMF_Requisitos.md`).
- **Acceptance Criteria:** Fundos das sections alternam claramente; jornada em formato de linha do tempo (horizontal em desktop, empilhada em mobile); grid de benefícios com número par de cards (6, sem quebra torta); rodapé identifica o InfoHub, não o InovAMF/Fundação.
- **Validation Steps:** Screenshot full-page em desktop e 375px conferindo as 4 mudanças; sem overflow horizontal; sem erros de console.
- **Notes:** Sections de `app/page.tsx` alternam branco/`bg-neutral-50` (branco → cinza → branco → gradiente do CTA → cinza no rodapé). `journey-steps.tsx` reescrito: linha conectando os círculos numerados via `div` absoluto (`h-px bg-border`), horizontal com `sm:flex-row` acima do breakpoint `sm`, empilhado (`flex-col`, sem linha) em mobile — mantém a mesma escala de cor de marca por etapa (`STAGE_COLORS`) já usada nos badges de etapa em outras telas. `inovamf-benefits.tsx` ganhou um 6º card ("Networking", ícone `Network` do `lucide-react`) — também presente no conteúdo original do site do InovAMF, fechando a grade 3×2 sem sobra. `landing-footer.tsx` reescrito pra identidade do InfoHub: logo do InfoHub + "InfoHub — Faculdade Antonio Meneghetti" + tagline "laboratório de empreendedorismo que prepara alunos e equipes para o InovAMF" — antes creditava "Antonio Meneghetti Faculdade & Fundação Antonio Meneghetti" com o endereço físico do InovAMF, dando a entender que o site pertencia ao InovAMF/Fundação, quando na verdade é o InfoHub (entidade distinta, RF/contexto do próprio documento de requisitos).

### Ticket: T-FE-27 Sidebar colapsável + correção da logo distorcida no header
- **Priority:** P2
- **Status:** Done
- **Scope:** Pedido do usuário pra sidebar (admin e aluno, ambas via `SidebarNav`) poder ser encolhida, dando mais espaço horizontal ao conteúdo em telas menores/monitores de trabalho.
- **Acceptance Criteria:** Botão no rodapé da sidebar (desktop only) alterna entre expandida (`w-56`, ícone+label) e colapsada (`w-16`, só ícone com `title` de acessibilidade); preferência persiste entre reloads; mobile (barra horizontal) não é afetado.
- **Validation Steps:** Alternar colapso, recarregar a página e confirmar que o estado persiste; conferir 375px sem overflow e sem o botão de colapso na barra horizontal mobile; sem erros de console.
- **Notes:** `SidebarNavItem` ganhou um campo `icon: LucideIcon` obrigatório — cada item da sidebar (admin e aluno) agora tem um ícone `lucide-react` (Kanban, Dashboard, ShieldCheck, Users, ListTodo). Estado de colapso é uma preferência por dispositivo, não dado de domínio — por isso vive em `localStorage` (`infohub:sidebar-collapsed`), lido num `useEffect` com o padrão já estabelecido no projeto (`Promise.resolve().then(...)` pra não disparar `setState` síncrono no corpo do effect, mesmo approach de `session.tsx`). Botão de colapso só aparece em `md:` — na barra horizontal mobile não faz sentido colapsar.

  **Bug real encontrado e corrigido nesta validação (não relacionado ao pedido original):** o usuário reportou a logo do header "completamente distorcida". Investigando, o arquivo `app/public/logo-branca.png` commitado no T-FE-23 estava, na verdade, uma versão já recortada (1024×375, sem ser quadrada) em vez do master quadrado (1024×1024) — provavelmente uma sobrescrita acidental durante os testes de recorte daquele ticket, que passou despercebida na validação visual da época (a imagem em si não parecia "esticada" o suficiente pra chamar atenção num crop já wide). Como o código usa `width={1024} height={1024}` (proporção 1:1) pra computar o aspect ratio do `next/image`, a divergência real do arquivo (2.73:1) forçava o navegador a esticar a imagem verticalmente. Corrigido copiando novamente o master intacto de `assets/logo-branca.png` (nunca alterado, confirmado 1024×1024) para `app/public/logo-branca.png`.

  **Segundo bug de logo, encontrado logo em seguida:** mesmo com o arquivo corrigido, a logo continuava parecendo "cortada" — porque ela vazava pra cima do header (`top-1/2` centralizado, T-FE-23) e o header é o primeiro elemento da página: não há espaço acima dele pra esse vazamento ir, então o topo da logo ficava cortado pelo próprio limite do documento/viewport (a barra de favoritos do navegador do usuário reforçava a percepção do corte). O usuário ajustou diretamente o tamanho/posicionamento da logo no header nesta mesma sessão — mudança preservada como está.

  **Bug de centralização na sidebar colapsada:** os ícones ficavam alinhados à esquerda em vez de centralizados quando a sidebar colapsa. Causa: a classe `md:justify-start` era aplicada incondicionalmente e `md:justify-center` só quando colapsado — as duas competindo no mesmo breakpoint, com a ordem de precedência decidida pela ordem interna do CSS gerado pelo Tailwind (não pela ordem em que as classes aparecem no `className`), então `justify-start` vencia mesmo colapsado. Corrigido tornando as duas mutuamente exclusivas (`isCollapsed ? "md:justify-center md:px-0" : "md:justify-start"`).

### Ticket: T-FE-28 Dashboard como home da área administrativa
- **Priority:** P2
- **Status:** Done
- **Scope:** Pedido do usuário: ao entrar como administrador, a home deve ser o dashboard (não mais o funil/kanban), e "Dashboard" deve ser o primeiro item da sidebar.
- **Acceptance Criteria:** Admin logando cai direto em `/admin` mostrando o dashboard; "Dashboard" é o primeiro item da sidebar (só pra ADMIN); "Funil de equipes" continua acessível (agora em `/admin/equipes`), primeiro item pra MENTOR (que não tem dashboard). Mentor logando não deve ver a mensagem de "exclusivo do administrador" — precisa cair direto no funil.
- **Validation Steps:** Login como admin (cai no dashboard) e como mentor (cai no funil, sem mensagem de acesso negado); clicar "Funil de equipes" a partir do dashboard; conferir link "Voltar ao funil" na página de detalhe de equipe; checar 375px sem overflow.
- **Notes:** Troca de rotas: conteúdo de `admin/dashboard/page.tsx` passou a ser `admin/page.tsx` (a home), e o antigo `admin/page.tsx` (kanban) virou `admin/equipes/page.tsx`. Como login/landing/redirects já apontavam genericamente pra `/admin` (não para uma URL fixa do kanban), a troca do que `/admin` significa não exigiu mudança nesses pontos — exceto o link "Voltar ao funil" em `team-detail-view.tsx`, que precisou apontar explicitamente pra `/admin/equipes` (antes ia pra `/admin`, que agora é o dashboard, não o funil). `admin-sidebar.tsx` reordenado: Dashboard primeiro (só ADMIN), depois Funil de equipes, Auditoria, Contas.

  O dashboard continua sendo ADMIN-only (RF-22 é "pra coordenação"), mas como ele virou a home de `/admin` — rota que tanto ADMIN quanto MENTOR acessam ao logar — um MENTOR caindo ali agora é redirecionado automaticamente (`router.replace`) pro funil (`/admin/equipes`) em vez de ver a mensagem de acesso negado que fazia sentido antes (quando `/admin/dashboard` era uma rota "extra", não a home de ninguém). Regenerado `.next/types/routes` via `npm run build` (mesmo padrão de mudança de rota já visto em tickets anteriores). Validado com Playwright: admin → `/admin` (dashboard); mentor → `/admin/equipes` direto, sem tela intermediária de erro; back-link da equipe aponta pra `/admin/equipes`; zero overflow em 375px. Sem erros de console.

### Ticket: T-FE-29 Corrige loop de navegação e sidebar ausente em `/equipes/[teamId]`
- **Priority:** P1
- **Status:** Done
- **Scope:** Dois bugs reais reportados pelo usuário na área do aluno: (1) com uma equipe só, "Minhas equipes" pulava direto pro detalhe, e o botão "Voltar" de lá voltava pra `/aluno/equipes`, que redirecionava na hora de novo pro detalhe — um loop de ida-e-volta; (2) a tela de detalhe de equipe (`/equipes/[teamId]`, rota neutra desde o T-FE-20) não tinha sidebar nenhuma, deixando quem chegava lá sem navegação além do botão "Voltar".
- **Acceptance Criteria:** "Minhas equipes" sempre mostra a lista (mesmo com 1 equipe só), sem redirecionamento automático; "Voltar" nunca faz loop; `/equipes/[teamId]` tem a sidebar certa pro papel de quem está vendo (aluno vê `AlunoSidebar`, admin/mentor vê `AdminSidebar`).
- **Validation Steps:** Aluno com 1 equipe — clicar "Minhas equipes", clicar no card, clicar "Voltar", confirmar que fica na lista (não faz loop); conferir sidebar presente e correta pro aluno e pro admin/mentor na tela de detalhe; checar 375px sem overflow.
- **Notes:** `aluno/equipes/page.tsx` perdeu o `useEffect` que fazia `router.replace` automático quando `teams.length === 1` — a lista agora sempre renderiza, mesmo com uma equipe só (esse comportamento "atalho" era a causa raiz do loop: list→detail→"voltar"→list→detail de novo, instantaneamente, porque a lista nunca dava tempo de ficar visível). Novo `app/equipes/layout.tsx` (client component, `LayoutProps<"/equipes">`) escolhe `AlunoSidebar` ou `AdminSidebar` pelo `role` da sessão — a guarda de acesso de verdade (RNF-03) continua dentro de `TeamDetailView`, esse layout é só chrome de navegação, igual ao padrão já usado em `admin/layout.tsx`/`aluno/layout.tsx`. Validado com Playwright: aluno de 1 equipe (João Pedro) — lista aparece, card leva ao detalhe, "Voltar" retorna pra lista sem repique; admin (Ana Beatriz) — mesmo fluxo a partir do funil, com `AdminSidebar` completa (Dashboard/Funil/Auditoria/Contas) visível na tela de detalhe; zero overflow em 375px nos dois papéis. Sem erros de console.

### Ticket: T-FE-30 Separa Pendentes/Concluídas na tela de equipe + mock mais realista
- **Priority:** P2
- **Status:** Done
- **Scope:** Dois problemas relacionados apontados pelo usuário: (1) `TeamTasksCard` listava todas as tarefas juntas, sem separar pendentes de concluídas (a área do aluno já fazia isso, RF-13, mas a tela de equipe do admin/mentor não); (2) o mock de tarefas era pouco realista — equipes em etapas avançadas apareciam com só 1-2 tarefas no total, dando a impressão de que faltava histórico das etapas já percorridas.
- **Acceptance Criteria:** `TeamTasksCard` agrupa em "Pendentes"/"Concluídas" com contador, mesmo padrão visual da área do aluno; equipes avançadas (`team-5`, `team-6`, `team-4`) têm pelo menos uma tarefa aprovada por etapa já concluída no histórico.
- **Validation Steps:** Abrir `/equipes/team-5` e `/equipes/team-6` e conferir a separação com contadores corretos; checar 375px sem overflow; sem erros de console.
- **Notes:** `team-tasks-card.tsx` reaproveita `PENDING_TASK_STATUSES` (`lib/task-status.ts`, já usado em `app/aluno/page.tsx`) pra filtrar em dois grupos — nenhuma lógica nova de status, só reuso do mesmo critério já estabelecido. `tasks.mock.ts` ganhou 6 tarefas novas (`task-10` a `task-15`, todas `APPROVED`, usando os templates existentes de RF-11) cobrindo as etapas 3 e 4 do `team-5`, etapas 3-5 do `team-6` e etapa 3 do `team-4` — janelas de data alinhadas com `MOCK_TEAM_STAGE_HISTORY` (`enteredAt`/`exitedAt` de cada etapa), com as respectivas `TaskSubmission` (`sub-10-1` a `sub-15-1`). Resultado: `team-5` (TechMentor) passa de 2 para 4 tarefas (1 pendente + 3 concluídas); `team-6` (AgroSmart, a mais avançada) passa de 2 para 5 tarefas, todas concluídas. Validado com screenshot full-page: contadores "Pendentes (1)"/"Concluídas (3)" no `team-5`, "Pendentes (0)"/"Concluídas (5)" no `team-6`; zero overflow em 375px. Sem erros de console.

### Ticket: T-FE-31 Some o lembrete de tarefas já concluídas
- **Priority:** P3
- **Status:** Done
- **Scope:** Percebido logo após o T-FE-30 (a separação Pendentes/Concluídas deixou isso visível): o botão "Enviar lembrete agora" aparecia em qualquer tarefa, incluindo as já aprovadas/entregues — não faz sentido lembrar o aluno de algo que ele já entregou e foi aprovado.
- **Acceptance Criteria:** `ReminderSection` só aparece em tarefas com status que ainda exigem ação do aluno (pendente, em andamento, atrasada, reprovada).
- **Validation Steps:** Abrir `/equipes/team-5`, conferir que a tarefa pendente tem "Enviar lembrete agora" e as 3 aprovadas não.
- **Notes:** `task-review-item.tsx` passou a condicionar a renderização de `<ReminderSection>` com `PENDING_TASK_STATUSES.includes(task.status)` (mesmo critério já usado pra separar Pendentes/Concluídas no T-FE-30 e na área do aluno) — sem lógica nova, só reuso do critério já estabelecido. Efeito colateral correto: tarefa `SUBMITTED` (entregue, aguardando revisão) também não mostra mais lembrete, já que não há nada a cobrar do aluno nesse estado. Validado com screenshot: `team-5` mostra o botão só na tarefa "Preparar roteiro do Pitch" (pendente), ausente nas 3 aprovadas.

### Ticket: T-FE-32 Terceiro grupo "Aguardando avaliação do InfoHub"
- **Priority:** P2
- **Status:** Done
- **Scope:** Pergunta do usuário revelou um gap real: com só Pendentes/Concluídas (T-FE-30), uma tarefa `SUBMITTED` (aluno já entregou, falta admin/mentor decidir) caía junto com "Concluídas" — escondendo exatamente o que precisa de ação do InfoHub agora.
- **Acceptance Criteria:** `TeamTasksCard` ganha um terceiro grupo "Aguardando avaliação do InfoHub" (status `SUBMITTED`), entre Pendentes e Concluídas; "Concluídas" passa a significar só `APPROVED` de fato.
- **Validation Steps:** Abrir `/equipes/team-6` (tem uma tarefa `SUBMITTED` com reenvio pendente de revisão) e conferir os três grupos com contadores corretos; checar 375px sem overflow.
- **Notes:** `team-tasks-card.tsx` foi de dois filtros pra uma lista de três grupos (`Pendentes` = `PENDING_TASK_STATUSES`, que já cobre `REJECTED` — reenvio também é responsabilidade do aluno; `Aguardando avaliação do InfoHub` = só `SUBMITTED`; `Concluídas` = só `APPROVED`), renderizados via `.map` em vez de blocos JSX duplicados — mais fácil de estender se aparecer um quarto grupo no futuro. Validado com screenshot: `team-6` (AgroSmart) mostra "Pendentes (0)" / "Aguardando avaliação do InfoHub (1)" — com os botões Aprovar/Reprovar já visíveis ali — / "Concluídas (4)"; zero overflow em 375px. Sem erros de console.

### Ticket: T-FE-33 Dialog de detalhes da tarefa + big number de aprovação pendente
- **Priority:** P2
- **Status:** Done
- **Scope:** Dois pedidos do usuário: (1) poder clicar numa tarefa pra ver os detalhes completos (comentários, link/arquivo entregue, descrição/instruções) em vez de tudo sempre expandido inline; (2) um big number no dashboard pra tarefas aguardando aprovação do InfoHub.
- **Acceptance Criteria:** Cada tarefa em `TeamTasksCard` vira uma linha resumo (título, prazo, badge de status) clicável, que abre um dialog com descrição, todas as versões de entrega (com link), comentário de revisão, aprovar/reprovar e edição; dashboard ganha um 4º stat tile "Aguardando aprovação".
- **Validation Steps:** Clicar numa tarefa e conferir o dialog completo (incluindo a descrição, que antes não aparecia em lugar nenhum pro admin/mentor); testar edição e aprovação de dentro do dialog; conferir o novo tile no dashboard bate com a contagem real de tarefas `SUBMITTED`; checar 375px sem overflow.
- **Notes:** Novo `components/ui/dialog.tsx` — wrapper em cima do `@base-ui/react/dialog` (Root/Trigger/Portal/Backdrop/Popup/Title/Description/Close), mesmo padrão dos outros componentes de `ui/` (`button.tsx`, `select.tsx`). `task-review-item.tsx` reestruturado: a linha resumo agora é o próprio `DialogTrigger` (que já renderiza um `<button>` nativo, sem precisar de `render`); todo o conteúdo que antes ficava sempre visível (submissões, comentário, aprovar/reprovar, editar, lembrete) migrou pra dentro do `DialogContent` — incluindo a **descrição da tarefa**, que na versão anterior nunca era exibida pro admin/mentor (só existia no formulário de criação/edição e na visão do aluno). Modo de edição também passou a viver dentro do dialog. Dashboard: novo campo `awaitingReviewCount` em `DashboardStats`/`getDashboardStats()` (conta tarefas com status `SUBMITTED`), 4º `StatTile` "Aguardando aprovação" entre "Equipes ativas" e "Tarefas atrasadas", grid ajustado pra `sm:grid-cols-2 lg:grid-cols-4`. Validado com Playwright: dashboard mostra "Aguardando aprovação: 2" (bate com as tarefas `SUBMITTED` reais nos mocks); dialog abre com descrição+entregas+ações; aprovar uma tarefa de dentro do dialog fecha o dialog e recarrega a lista corretamente (tarefa migra pro grupo "Concluídas"); edição funciona dentro do dialog; ESC fecha; zero overflow em 375px. Sem erros de console.

## 6. Definition of Done (desta etapa)

- Todas as telas P0 (Seção 3) navegáveis de ponta a ponta usando dados mockados via `services/`.
- Nenhum componente de UI importa `mocks/` diretamente (T-FE-04).
- Tema de cores do InfoHub aplicado (`tailwind.config` com paleta `brand-*`).
- `npm run build` e `npm run lint` sem erros.
- Checklist de RF-01 a RF-24 revisado: cada RF coberto nesta fase tem uma tela correspondente demonstrável; RFs que dependem de backend real (envio de e-mail de fato, persistência entre sessões) ficam marcados como "mock only" nesta etapa.

## 6.1 Auditoria de conformidade RF/RNF (pós T-FE-17)

Revisão feita depois de fechar os 17 tickets, comparando contra `docs/Infohub_InovAMF_Requisitos.md`. Nem tudo estava coberto — o que segue documenta o que foi corrigido nesta revisão e o que fica pendente de propósito.

**Corrigido nesta revisão:**
- **RNF-03 (controle de acesso) — gap real.** `/admin` (o kanban) não tinha nenhuma guarda de papel: um aluno ou visitante deslogado navegando direto pra URL via digitação enxergava o funil inteiro com dados internos de todas as equipes. Corrigido com guarda `ADMIN`/`MENTOR` (mesmo padrão já usado em `/admin/dashboard` e na página de detalhe da equipe).
- **RNF-05 (auditoria) — não existia de fato.** O schema/tipos já tinham `AuditLog`, mas nenhum service gravava nele. Adicionado `services/audit.service.ts` (`recordAuditLog`/`getAuditLogs`), chamado a partir de `advanceTeamStage` (mudança de etapa), `reviewSubmission` (aprovação/reprovação) e `recordNotification` (todo envio de e-mail passa a gerar uma entrada — cobre literalmente os três eventos que RNF-05 pede). Nova tela `/admin/auditoria` (exclusiva `ADMIN`) lista os eventos mais recentes primeiro. Validado ao vivo: aprovar uma entrega gera duas linhas novas na auditoria (a aprovação e o e-mail disparado por causa dela).
- **RNF-01 (mobile) — estendido para o admin.** T-FE-17 tinha testado só login/cadastro/aluno; ao reconferir, `/admin`, `/admin/dashboard` e a nova `/admin/auditoria` também foram validados em 375px (zero overflow de documento; a tabela de auditoria e as colunas do kanban rolam dentro do próprio container, o que é o padrão esperado pra dado tabular/kanban em tela pequena, não uma quebra de layout).

**Documentado como dependência do backend real (não dá pra fazer bem feito só no mock):**
- **RN-04 (marcação automática de tarefa atrasada).** A única tarefa com status `LATE` existe porque nasceu assim no seed (`task-4`) — não há nenhum código que recalcula isso em runtime. A regra de negócio de verdade ("tarefa vencida sem entrega vira atrasada automaticamente") exige um job/cron rodando no servidor comparando `dueDate` com a data atual — não existe "tempo passando" pra simular isso de forma confiável só no navegador. Fica para a fase de backend (`modules/notifications` ou um job dedicado, conforme `PLAN.md` Seção 5). Efeito colateral: os e-mails `TASK_LATE`/`DEADLINE_LATE` também nunca disparam de verdade nesta fase — só existem como registros estáticos no seed de `notifications.mock.ts`.
- **RNF-02 (LGPD) — cobertura parcial, documentada.** O que dá pra fazer só no frontend foi feito: consentimento obrigatório no formulário de cadastro (`/cadastro`, T-FE-07) e o campo `lgpdConsentedAt` persistido no momento do cadastro. **Política de retenção e exclusão de dados fica fora do escopo do mock** — depende de um backend real com banco persistente; não faz sentido simular "excluir dados" sobre um array que já é efêmero (reseta a cada reload).

**Decisão de escopo consciente (não é gap, revisitado a pedido do usuário):**
- **RF-11 (modelos de tarefa) — catálogo fixo, sem CRUD pelo admin.** O requisito diz só "usar modelos de tarefa pré-configurados por etapa", sem exigir que o administrador possa criar/editar modelos pela interface. `getTaskTemplates()` (leitura) existe e é usado no formulário "Nova tarefa" (T-FE-12); os 4 modelos (etapas 3-6) vivem como uma lista fixa em `MOCK_TASK_TEMPLATES` (`tasks.mock.ts`), no mesmo espírito das 6 etapas da jornada em si, que também são fixas/não editáveis nesta fase. Decisão confirmada com o usuário: manter fixo — não construir `createTaskTemplate`/`updateTaskTemplate`/`deleteTaskTemplate` nem tela de gestão de modelos por enquanto. Se isso mudar no futuro, seria um CRUD simples seguindo o mesmo padrão já usado em RF-03 (T-FE-19, `staff-form`/`staff-list`).

## 7. Observações para a integração futura com o backend

- Ao trocar `services/` para chamadas reais, os `types/` em `src/types/*` devem passar a ser derivados do Prisma Client (`import type { Team } from '@prisma/client'`) em vez de interfaces manuais — nesta fase eles são escritos à mão porque ainda não existe `schema.prisma` gerado/migrado no banco real de desenvolvimento.
- O `delay()` artificial dos mocks deve ser removido nessa troca; os componentes já devem estar preparados para loading states reais (Suspense/skeletons), então a experiência não deve mudar.
