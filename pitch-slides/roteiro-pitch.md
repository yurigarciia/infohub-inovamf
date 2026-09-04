# Roteiro de Pitch — InfoHub → InovAMF

Seguindo a estrutura do Prof. Diego: **Atenção → Problema → Impacto → Solução → Demonstração → Diferencial → Fechamento**

**Ideia central pra ficar na cabeça da banca** (repetir com outras palavras no fechamento):
> "O InfoHub → InovAMF pega uma jornada que hoje vive espalhada em planilha e WhatsApp e transforma numa plataforma única — visual, com prazos, aprovação e histórico — pra levar o aluno do esboço da ideia até a porta do InovAMF."

---

## 1) Atenção

**Abrir com uma pergunta ou situação, não com "o nosso projeto é...":**

> "Quem aqui já teve que acompanhar o andamento de várias pessoas ao mesmo tempo — quem entregou, quem está atrasado, quem precisa de um lembrete — usando só planilha e grupo de WhatsApp? [pausa] É exatamente isso que a equipe do InfoHub faz hoje, manualmente, pra cada aluno que passa pelas 6 etapas até chegar no InovAMF."

*(Alternativa mais direta com dado: "Hoje, cada equipe que passa pelo InfoHub é acompanhada numa planilha. Não existe prazo automático, não existe histórico, não existe um lugar só pra ver em que etapa cada equipe está.")*

---

## 2) Problema

**Fazer a banca sentir a dor — seja concreto, não genérico:**

- O acompanhamento das 6 etapas (do envio da ideia até o Pitch final) é feito manualmente: planilha + WhatsApp.
- Não há **prazo com cobrança automática** — lembrete é alguém lembrando de mandar mensagem.
- Não há **histórico** de quando cada equipe mudou de etapa, nem de quem aprovou o quê.
- Quando o aluno tem dúvida sobre uma tarefa, não tem onde consultar — depende de perguntar de novo.
- Isso não escala: quanto mais equipes o InfoHub atende por semestre, pior fica.

> "O processo em si — a jornada de 6 etapas, a mentoria — já funciona bem. O problema é a **ferramenta**: hoje é papel e mensagem, quando podia ser um sistema."

---

## 3) Impacto

**Por que isso importa de verdade — pra quem, e o que muda:**

- **Pra equipe InfoHub/mentores:** enxergar o funil inteiro num painel só, saber exatamente quem está atrasado e quem já pode avançar de etapa — em vez de abrir 7 abas de planilha.
- **Pra aluno:** uma área própria, com prazo, instrução clara da tarefa e onde anexar a entrega — sem depender de lembrar uma conversa de WhatsApp de duas semanas atrás.
- **Pra coordenação:** um dashboard com números reais (quantas equipes ativas, quantas tarefas atrasadas, quantas prontas pro InovAMF) pra decisão, não achismo.
- Sem isso, o InfoHub fica **limitado pelo tamanho da planilha** — com isso, o processo escala.

---

## 4) Solução

**Sua tese, em uma frase, depois desdobrada:**

> "Construímos o InfoHub → InovAMF: um sistema web que digitaliza a jornada de 6 etapas, com um painel administrativo pro InfoHub e uma área própria pro aluno."

Pontos-chave (curto, sem entrar em código ainda):
- Funil visual das 6 etapas (kanban) pro admin/mentor.
- Tarefas com prazo, modelo pré-configurado por etapa, aprovação/reprovação de entrega.
- Auditoria: todo avanço de etapa e aprovação fica registrado.
- Área do aluno espelhando a mesma qualidade da área administrativa — sidebar, "minhas tarefas", "minhas equipes".
- Stack: **Next.js + TypeScript + Prisma + PostgreSQL** — decisão documentada, pensada pra crescer (fase atual é o monolito; arquitetura já preparada pra evoluir).

---

## 5) Demonstração

**"Vai lá e apaga o fogo que você causou" — mostra funcionando, ao vivo. Roteiro sugerido (curto, ensaiado):**

1. **Landing page** (`/`) — mostra o vídeo de fundo do prédio do InovAMF, contexto institucional, CTA "Enviar minha ideia".
2. **Login como admin** → cai direto no **Dashboard**: big numbers (equipes ativas, aguardando aprovação, atrasadas, prontas pro InovAMF) + distribuição por etapa.
3. **Funil de equipes** (kanban) — mostra as 6 colunas, uma equipe em cada etapa.
4. Clica numa equipe → **tela de detalhe**: dados cadastrais, integrantes, histórico de etapas, e o card de **tarefas separado em Pendentes / Aguardando avaliação do InfoHub / Concluídas**.
5. Clica numa tarefa → abre o **dialog de detalhe** (descrição, entrega, aprovar/reprovar).
6. Troca pra um perfil de **aluno** → área do aluno com sidebar própria, "Minhas tarefas" já separadas em pendente/concluída.
7. (Se der tempo) Mostra o **diagrama do banco de dados** — 17 tabelas, decisão de tokens de sessão.

> Regra de ouro: ensaiar esse trajeto antes, cronometrado. Se travar, ter print de backup.

---

## 6) Diferencial

**O que TE torna único — não é só "fizemos uma tela bonita":**

- Não é só front-end genérico: cada tela nasceu de um **requisito** (RF-01 a RF-24) e foi **auditada** contra ele — o que não dava pra fazer só com mock foi documentado como decisão consciente, não esquecido.
- Modelagem de banco de dados completa e **defendível**: 17 tabelas, decisões justificadas (ex.: por que access token não vira tabela, por que refresh token sim — segurança pensada, não só "porque sim").
- Identidade visual própria do InfoHub, não um template — sidebar, header, cores, tudo com intenção.
- Área do aluno com o mesmo nível de cuidado que a área administrativa — muita solução trata aluno como "usuário de segunda categoria" da ferramenta interna.
- Arquitetura pensada em fases: hoje é um monolito com dados mockados, mas já estruturado pra virar o sistema real sem reescrever do zero.

---

## 7) Fechamento

**Reforçar a ideia central + deixar um gancho:**

> "Resumindo: o InfoHub hoje depende de planilha e WhatsApp pra acompanhar cada equipe em 6 etapas até o InovAMF. O que a gente construiu transforma isso numa plataforma única — visual, com prazo, aprovação e histórico — pensada tanto pra quem gerencia quanto pra quem é acompanhado. É a base pronta pra crescer junto com o InfoHub."

*(Fechar com silêncio de 1-2 segundos antes de abrir pra perguntas — não emendar "então é isso, obrigado" apressado.)*

---

## Notas rápidas sobre a apresentação (checklist)

- [ ] **Preparação**: ensaiar em voz alta pelo menos 1x cronometrado.
- [ ] **Postura**: quem não está falando, olha pra quem está falando (não pro notebook).
- [ ] **Divisão de papéis**: decidir quem fala cada bloco e quem conduz a demonstração ao vivo.
- [ ] Ter **prints/vídeo de backup** da demonstração caso algo trave (wifi, servidor).
- [ ] Não ler slide — slide é apoio visual, a fala é o pitch.
