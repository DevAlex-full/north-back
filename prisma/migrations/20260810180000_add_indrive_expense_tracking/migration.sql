-- Correção Meta Indrive: rastreamento estrutural de despesas operacionais
--
-- Adiciona affectsIndriveGoal em financial_transactions — fonte
-- estrutural (booleana) que decide se uma SAÍDA reduz a Meta Indrive.
-- Substitui a antiga heurística de leitura (que só reconhecia
-- Gasolina/Combustível via source/categoria a cada reconciliação) por
-- uma classificação decidida uma vez, em tempo de escrita, e persistida.
--
-- Backfill inequívoco: transações de despesa cuja origem OU categoria JÁ
-- identificava Gasolina/Combustível de forma estrutural (mesma regra que
-- o código já usava antes desta migration) recebem
-- affectsIndriveGoal = true automaticamente. Não depende de texto livre
-- em `description` — description nunca é lido aqui.
--
-- BACKWARD-COMPATIBLE POR DESIGN: esta migration NÃO toca em
-- daily_goals. `DailyGoal.gasAmount` é mantido fisicamente como está
-- (nome legado interno) — ver nota de dívida semântica documentada em
-- `src/repositories/financial.repository.ts`. Isso permite aplicar esta
-- migration antes, durante ou depois do deploy do backend novo sem
-- nenhuma janela de incompatibilidade: o backend antigo continua lendo
-- `gasAmount` normalmente (a coluna nunca muda de nome), e o backend
-- novo também lê/escreve a mesma coluna física, só expondo o nome de
-- domínio `expenseAmount` na camada de repository para cima.
--
-- Não altera nenhuma migration anterior. Não afeta nenhuma outra tabela.

-- AlterTable: financial_transactions
ALTER TABLE "financial_transactions" ADD COLUMN "affectsIndriveGoal" BOOLEAN NOT NULL DEFAULT false;

-- Backfill inequívoco (Gasolina/Combustível já estruturalmente
-- identificável por source ou pelo nome da categoria vinculada).
UPDATE "financial_transactions"
SET "affectsIndriveGoal" = true
WHERE "type" = 'EXPENSE'
  AND (
    lower(trim(COALESCE("source", ''))) IN ('gasolina', 'fuel')
    OR lower(trim(COALESCE(
         (SELECT "name" FROM "financial_categories"
          WHERE "financial_categories"."id" = "financial_transactions"."categoryId"),
         ''
       ))) IN ('gasolina', 'combustivel', 'combustível')
  );

-- Nenhum índice isolado em affectsIndriveGoal: é um boolean de baixa
-- cardinalidade e toda consulta de reconciliação já filtra primeiro por
-- (userId, date) — ver `getDayRangeSP`/`findTransactionsInRange` em
-- financial.repository.ts — e só então classifica em memória. Um índice
-- solto em uma coluna boolean não seria seletivo o bastante para o
-- planner preferir sobre os índices já existentes de userId/date, então
-- não adiciona valor real.