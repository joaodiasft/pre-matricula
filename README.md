# Pré-matrícula Redas 2026

Aplicação completa em Next.js 15 + Prisma para gerenciar o fluxo de pré-matrícula dos cursos Redas (Redação, Exatas, Matemática e Gramática). O sistema foi desenhado mobile-first, usa UI moderna com shadcn + Tailwind e atende os requisitos de cadastro, organização de turmas, planos e confirmação presencial com token sequencial.

## Principais recursos

- **Landing page** com CTA, cronograma, benefícios, tabela de horários, planos, depoimentos e FAQ.
- **Fluxo de pré-matrícula em 8 fases** com barra de progresso, salvamento automático e servidor de ações com validações: cadastro, dados básicos, escolha de turmas (1 por modalidade), planos, forma de pagamento, revisão, agendamento presencial (datas >= 05/01/2026), checklist e CTA social.
- **Regras de negócio implementadas**:
  - Matrícula R$ 100 com 50% de desconto automático até o dia 10 do mês.
  - Token sequencial `R00001...` controlado em tabela dedicada.
  - Lista de espera automática quando a turma atinge capacidade (considerando status ativos).
  - Promoção Redação + Gramática com contador para os 10 primeiros pagamentos confirmados.
  - Limite de uma turma por modalidade.
- **Área do aluno** com status em tempo real, detalhes da inscrição, token, data agendada e contato rápido com a secretaria.
- **Painel admin** com cards de status, contador de bônus e tabela para alterar status e pagamento de cada pré-matrícula diretamente (executando server actions com verificação de permissão).
- **Autenticação** via NextAuth (Credentials) com criação de conta, login e sessão JWT.
- **Banco de dados** PostgreSQL (Prisma) com migrations + seed automatizado (1 admin, 2 alunos, 3 pré-matrículas ilustrativas, todas as turmas, planos e promoções configuradas).

## Stack e dependências

- Next.js 15 (App Router, Server Actions e Route Handlers).
- TypeScript + React 19.
- Prisma 5.19 (PostgreSQL) + seeds.
- NextAuth + bcrypt.
- Tailwind CSS + shadcn/ui + Radix UI.
- React Hook Form + Zod.
- Sonner para feedbacks.

## Configuração

1. **Instale as dependências**

   ```bash
   npm install
   ```

2. **Variáveis de ambiente**

   O arquivo `.env` já contém os valores de exemplo utilizados neste projeto:

   ```ini
   DATABASE_URL="postgres://..."
   NEXTAUTH_SECRET="nextauth-secret-change-me"
   ```

   Ajuste conforme necessário (principalmente `NEXTAUTH_SECRET` em produção).

3. **Migrations + Seed**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

   Isso cria todo o esquema (users, courses, sessions, plans, pre-enrollments, token counter) e popula:

   | Usuário        | Email             | Senha           | Observação   |
   | -------------- | ----------------- | --------------- | ------------ |
   | Admin          | admin@redas.com   | redasadmin123   | Role ADMIN   |
   | Aluno demo     | aluno@redas.com   | redasaluno123   | Role STUDENT |

4. **Rodar em desenvolvimento**

   ```bash
   npm run dev
   ```

   A aplicação fica disponível em `http://localhost:3000`.

## Estrutura de diretórios de destaque

```
src/
 ├─ app/
 │   ├─ page.tsx (Landing page)
 │   ├─ pre-matricula/ (fluxo principal)
 │   ├─ painel/ (área do aluno)
 │   └─ admin/ (dashboard secretaria)
 ├─ components/
 │   ├─ pre-enrollment/ (flow, formulários e auth tabs)
 │   ├─ admin/ (tabela com ações)
 │   └─ ui/ (biblioteca shadcn adaptada)
 ├─ lib/
 │   ├─ auth, prisma, constants, utils, validators
 │   └─ queries/ (busca cursos + estatísticas)
 ├─ server/
 │   ├─ actions/ (pre-enrollment e admin)
 │   └─ data/ (helpers compartilhados com server components)
 └─ types/
     ├─ enrollment.ts (tipos Prisma)
     └─ client.ts (tipos serializados para client components)
```

## Rotas principais

- `/` – Landing page com CTA.
- `/pre-matricula` – Fluxo completo mobile-first, exige login.
- `/painel` – Painel do aluno (status, token, contatos).
- `/admin` – Dashboard da secretaria (apenas role ADMIN).
- `/api/auth/*` – Endpoints NextAuth e cadastro.

## Scripts úteis

| Script             | Descrição                                    |
| ------------------ | -------------------------------------------- |
| `npm run dev`      | Desenvolvimento com Turbopack                |
| `npm run build`    | Build de produção                            |
| `npm run start`    | Servir build                                 |
| `npm run lint`     | Lint do Next.js                              |
| `npm run db:migrate` | Executa `prisma migrate dev`               |
| `npm run db:seed`  | Roda o seed (`tsx prisma/seed.ts`)           |
| `npm run db:push`  | `prisma db push` (útil para sincronizações)  |

## Observações finais

- As regras de negócio de lista de espera, tokens, desconto de matrícula e promoção Redação + Gramática foram implementadas diretamente nos server actions para manter consistência.
- Todas as telas foram desenhadas mobile-first e mantém identidade visual (rosa, preto, branco, cinza) com fontes modernas.
- Use o painel admin para alterar status/pagamento e acompanhar métricas rápidas. Ajustes adicionais (troca de turma, capacidade, exportações avançadas) podem ser implementados a partir dos server actions existentes.

Sinta-se à vontade para evoluir o projeto adicionando integrações de pagamento, envio automático de emails/WhatsApp e dashboards analíticos mais completos. Boas matrículas! 🚀
