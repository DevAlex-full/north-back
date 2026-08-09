-- =============================================================================
-- MIGRACAO_TIMEZONE_SP_LEGADO.sql
--
-- Migração de dados ONE-OFF (não é uma migration Prisma — não toca no
-- schema, não roda via `prisma migrate`). Corrige registros legados de
-- `tasks` e `daily_goals` que foram gravados pelo backend antigo usando
-- meia-noite UTC (`new Date('YYYY-MM-DD')` / `day.setHours(0,0,0,0)` no
-- fuso do servidor) para o formato que o backend novo espera: 00:00 em
-- America/Sao_Paulo, que é 03:00:00 UTC (Brasil não tem mais horário de
-- verão desde 2019 — offset fixo -03:00).
--
-- Escopo: SOMENTE registros cujo instante bate exatamente com
-- "00:00:00.000 UTC" — o formato inequivocamente legado. Nenhum outro
-- registro é tocado. `completedAt`, `status`, `title`, `description`,
-- `priority`, `isRecurring`, `observation`, `scheduleBlockId`, `id`,
-- `userId`, `createdAt`, `updatedAt` são preservados sem alteração em
-- `tasks`; `targetAmount` (ressalvado o caso de conflito — ver Passo 5),
-- `earnedAmount`, `gasAmount`, `status`, `id`, `userId`, `createdAt`,
-- `updatedAt` são preservados em `daily_goals`.
--
-- Idempotente: depois de rodar uma vez, os registros passam a ter horário
-- 03:00:00 UTC e deixam de bater com a condição `WHERE ... = '00:00:00'`
-- — rodar o script de novo não altera nada.
--
-- Pré-condição assumida: este script roda ANTES de qualquer tarefa nova
-- ser criada pelo backend corrigido (que já grava em 03:00:00 UTC) — ou
-- seja, neste momento não deveria existir ainda nenhuma duplicata real
-- causada pelo bug descrito no Bloqueio 1 (ensureTasksForDate recriando
-- tarefas recorrentes por não achar os registros legados). Por isso este
-- script NÃO tenta deduplicar `tasks` — só corrige o timestamp. Se, na
-- prática, o backend novo já rodou em produção antes desta migração e já
-- gerou duplicatas, isso deve ser tratado à parte (não é o que este
-- script resolve).
--
-- Como revisar antes de aplicar em produção:
--   1. Rode só os SELECTs de auditoria (Passos 1 e 4) primeiro, fora de
--      uma transação, e confira os números/amostras.
--   2. Só então rode o script inteiro (ele já é BEGIN...COMMIT).
--   3. Se preferir revisar antes do COMMIT, troque o `COMMIT;` final por
--      `ROLLBACK;`, rode, confira os SELECTs de conferência (Passos 3 e
--      8) que aparecem no meio da transação, e rode de novo com
--      `COMMIT;` quando estiver satisfeito.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- PASSO 1 — AUDITORIA (tasks): registros legados que serão afetados.
-- Critério: o instante gravado é exatamente 00:00:00.000 em UTC.
-- -----------------------------------------------------------------------
SELECT
  id,
  "userId",
  "scheduleBlockId",
  title,
  status,
  "isRecurring",
  date              AS date_legado_utc,
  (date + interval '3 hours') AS date_novo_utc_previsto,
  "completedAt"
FROM tasks
WHERE (date AT TIME ZONE 'UTC')::time = '00:00:00'
ORDER BY "userId", date;

-- -----------------------------------------------------------------------
-- PASSO 2 — UPDATE (tasks): desloca +3h só os registros legados.
-- Todas as demais colunas (completedAt, status, title, description,
-- priority, isRecurring, observation, scheduleBlockId, id, userId,
-- createdAt, updatedAt) permanecem intocadas — só `date` muda.
-- NÃO usamos "updatedAt = now()" implícito porque este UPDATE não passa
-- pelo Prisma Client (que é quem aplica @updatedAt); um UPDATE SQL direto
-- não tem esse efeito colateral, então updatedAt histórico é preservado.
-- -----------------------------------------------------------------------
UPDATE tasks
SET date = date + interval '3 hours'
WHERE (date AT TIME ZONE 'UTC')::time = '00:00:00';

-- -----------------------------------------------------------------------
-- PASSO 3 — CONFERÊNCIA (tasks): nenhum registro deve mais bater com o
-- padrão legado; a contagem de linhas por dia civil deve ser a mesma de
-- antes (nenhuma linha criada ou perdida, só o horário mudou).
-- -----------------------------------------------------------------------
SELECT count(*) AS restantes_em_00h_utc
FROM tasks
WHERE (date AT TIME ZONE 'UTC')::time = '00:00:00';
-- Esperado: 0 (a menos que existam tarefas legítimas cujo dia civil real,
-- por algum motivo externo a este script, dependa de 00:00 UTC — não é o
-- caso aqui, já que todo o domínio é America/Sao_Paulo).

SELECT
  "userId",
  (date AT TIME ZONE 'America/Sao_Paulo')::date AS dia_civil_sp,
  count(*) AS total,
  count(*) FILTER (WHERE status = 'DONE') AS done,
  count(*) FILTER (WHERE status = 'PENDING') AS pending,
  count(*) FILTER (WHERE status = 'IN_PROGRESS') AS in_progress,
  count(*) FILTER (WHERE status = 'SKIPPED') AS skipped
FROM tasks
GROUP BY "userId", dia_civil_sp
ORDER BY "userId", dia_civil_sp;

-- =============================================================================
-- daily_goals
-- =============================================================================

-- -----------------------------------------------------------------------
-- PASSO 4 — AUDITORIA (daily_goals): registros legados e detecção de
-- conflito com a constraint @@unique([userId, date]) — ou seja, casos em
-- que já existe, para o mesmo usuário, um DailyGoal em 03:00:00 UTC no
-- mesmo dia civil que o registro legado (em 00:00:00 UTC) representaria
-- depois de deslocado.
-- -----------------------------------------------------------------------
WITH legado AS (
  SELECT *
  FROM daily_goals
  WHERE (date AT TIME ZONE 'UTC')::time = '00:00:00'
)
SELECT
  legado.id,
  legado."userId",
  legado.date                         AS date_legado_utc,
  (legado.date + interval '3 hours')  AS date_novo_utc_previsto,
  legado."targetAmount",
  legado."earnedAmount",
  legado."gasAmount",
  legado."updatedAt"                  AS legado_updated_at,
  canonical.id                        AS conflito_com_id,
  canonical."targetAmount"            AS conflito_target_amount,
  canonical."updatedAt"               AS conflito_updated_at,
  (canonical.id IS NOT NULL)          AS tem_conflito
FROM legado
LEFT JOIN daily_goals canonical
  ON canonical."userId" = legado."userId"
 AND canonical.date = legado.date + interval '3 hours'
ORDER BY legado."userId", legado.date;

-- -----------------------------------------------------------------------
-- PASSO 5 — UPDATE (daily_goals) SEM conflito: desloca +3h normalmente.
-- targetAmount/earnedAmount/gasAmount/status/id/userId/createdAt/updatedAt
-- preservados — só `date` muda.
-- -----------------------------------------------------------------------
UPDATE daily_goals AS legado
SET date = legado.date + interval '3 hours'
WHERE (legado.date AT TIME ZONE 'UTC')::time = '00:00:00'
  AND NOT EXISTS (
    SELECT 1 FROM daily_goals canonical
    WHERE canonical."userId" = legado."userId"
      AND canonical.date = legado.date + interval '3 hours'
  );

-- -----------------------------------------------------------------------
-- PASSO 6 — CASO DE CONFLITO (daily_goals): quando já existe um registro
-- em 03:00:00 UTC para o mesmo usuário/dia, um UPDATE direto do legado
-- violaria @@unique([userId, date]). Estratégia determinística:
--
--   a) o registro "canônico" (já em 03:00 UTC) é o que sobrevive;
--   b) o `targetAmount` do sobrevivente é substituído pelo do registro
--      MAIS RECENTEMENTE ATUALIZADO entre os dois (comparando
--      `updatedAt`) — reflete a última intenção real do usuário quanto à
--      meta, venha ela do registro legado ou do canônico;
--   c) `earnedAmount`/`gasAmount` do sobrevivente NÃO são mesclados aqui
--      de propósito — a primeira leitura ou escrita após o deploy do
--      backend corrigido já roda
--      `FinancialService.reconcileDailyGoalFromTransactions`, que
--      recalcula os dois a partir das FinancialTransaction reais do dia
--      (fonte única de verdade) e sobrescreve qualquer valor herdado;
--   d) o registro legado (duplicado) é excluído após o merge, para nunca
--      deixar duas linhas para o mesmo usuário/dia.
-- -----------------------------------------------------------------------
WITH conflitos AS (
  SELECT
    legado.id            AS legado_id,
    canonical.id          AS canonical_id,
    CASE
      WHEN legado."updatedAt" > canonical."updatedAt" THEN legado."targetAmount"
      ELSE canonical."targetAmount"
    END AS target_amount_resolvido
  FROM daily_goals legado
  JOIN daily_goals canonical
    ON canonical."userId" = legado."userId"
   AND canonical.date = legado.date + interval '3 hours'
  WHERE (legado.date AT TIME ZONE 'UTC')::time = '00:00:00'
)
UPDATE daily_goals
SET "targetAmount" = conflitos.target_amount_resolvido
FROM conflitos
WHERE daily_goals.id = conflitos.canonical_id;

-- Remove os registros legados que foram mesclados no Passo 6 (evita
-- duplicidade e nunca mais bate com a constraint @@unique).
WITH conflitos AS (
  SELECT legado.id AS legado_id
  FROM daily_goals legado
  JOIN daily_goals canonical
    ON canonical."userId" = legado."userId"
   AND canonical.date = legado.date + interval '3 hours'
  WHERE (legado.date AT TIME ZONE 'UTC')::time = '00:00:00'
)
DELETE FROM daily_goals
WHERE id IN (SELECT legado_id FROM conflitos);

-- -----------------------------------------------------------------------
-- PASSO 7 — Qualquer registro legado remanescente (não deveria haver
-- nenhum a esta altura — Passo 5 tratou os sem conflito, Passo 6
-- tratou os com conflito). SELECT de segurança para confirmar.
-- -----------------------------------------------------------------------
SELECT count(*) AS legados_nao_tratados
FROM daily_goals
WHERE (date AT TIME ZONE 'UTC')::time = '00:00:00';
-- Esperado: 0

-- -----------------------------------------------------------------------
-- PASSO 8 — CONFERÊNCIA (daily_goals): um único registro por
-- (userId, dia civil SP), sem violação de unicidade.
-- -----------------------------------------------------------------------
SELECT
  "userId",
  (date AT TIME ZONE 'America/Sao_Paulo')::date AS dia_civil_sp,
  count(*) AS registros_para_este_dia
FROM daily_goals
GROUP BY "userId", dia_civil_sp
HAVING count(*) > 1;
-- Esperado: nenhuma linha (nenhum dia com mais de 1 registro por usuário)

COMMIT;