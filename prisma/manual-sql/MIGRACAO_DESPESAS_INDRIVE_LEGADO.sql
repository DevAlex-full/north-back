-- =============================================================================
-- MIGRACAO_DESPESAS_INDRIVE_LEGADO.sql
--
-- Complementar à migration Prisma `20260810180000_add_indrive_expense_tracking`
-- (que já migra automaticamente, de forma inequívoca, toda despesa cuja
-- origem/categoria estrutural já identificava Gasolina/Combustível).
--
-- Este script trata o caso APENAS AMBÍGUO deixado de fora de propósito:
-- despesas antigas cadastradas como
--
--     Categoria: Outros
--     Descrição: "Indrive" (ou variações como "indrive", "Comissão Indrive",
--                 "Indrive - pedágio" etc.)
--
-- porque, antes desta correção, não existia opção estrutural para marcar
-- uma saída como vinculada ao Indrive — o usuário usou a descrição como
-- gambiarra. Migrar isso automaticamente seria exatamente a heurística de
-- texto que a correção proíbe (`description.includes('indrive')`), então
-- este script NÃO faz esse UPDATE sozinho — ele só AUDITA e deixa o UPDATE
-- pronto, comentado, para revisão humana linha a linha antes de rodar.
--
-- Como usar:
--   1. Rode a PARTE 1 (SELECT de auditoria) e leia cada linha encontrada.
--   2. Para cada linha que você confirmar ser realmente uma despesa
--      operacional do Indrive, anote o `id`.
--   3. Descomente e ajuste a PARTE 2 (UPDATE) para atingir SOMENTE os IDs
--      confirmados (nunca rode com um WHERE textual amplo tipo
--      description ILIKE '%indrive%' direto em produção).
--   4. Rode a PARTE 3 (SELECT de verificação) para conferir o resultado.
--
-- Idempotente: rodar a PARTE 1 de novo depois de aplicar a PARTE 2 mostra
-- uma lista menor (só o que ainda não foi confirmado/migrado) — os IDs já
-- migrados desaparecem da lista de "candidatos" porque já estarão com
-- affectsIndriveGoal = true.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------
-- PARTE 1 — AUDITORIA: candidatos ambíguos (Categoria = Outros/Erva/etc,
-- descrição menciona "indrive" de alguma forma, ainda NÃO vinculados
-- estruturalmente). Revise cada linha manualmente — nenhuma é alterada
-- aqui.
-- -----------------------------------------------------------------------
SELECT
  ft.id,
  ft."userId",
  fc.name  AS categoria_atual,
  ft.amount,
  ft.description,
  ft.date,
  ft."affectsIndriveGoal"
FROM financial_transactions ft
JOIN financial_categories fc ON fc.id = ft."categoryId"
WHERE ft.type = 'EXPENSE'
  AND ft."affectsIndriveGoal" = false
  AND lower(trim(COALESCE(fc.name, ''))) NOT IN ('gasolina', 'combustivel', 'combustível')
  AND ft.description ILIKE '%indrive%'
ORDER BY ft."userId", ft.date;

-- -----------------------------------------------------------------------
-- PARTE 2 — UPDATE (NÃO executar automaticamente).
-- Descomente e substitua a lista de IDs pelos que você confirmou na
-- PARTE 1. NUNCA rode a versão comentada abaixo (WHERE description
-- ILIKE '%indrive%') direto — ela está aqui só como referência de onde
-- os candidatos vieram, não como comando pronto para produção.
-- -----------------------------------------------------------------------

-- UPDATE financial_transactions
-- SET "affectsIndriveGoal" = true
-- WHERE id IN (
--   'SUBSTITUA_PELO_ID_1',
--   'SUBSTITUA_PELO_ID_2'
-- );

-- Referência (NÃO usar em produção — heurística de texto, só para
-- entender de onde a lista da PARTE 1 veio):
-- UPDATE financial_transactions ft
-- SET "affectsIndriveGoal" = true
-- FROM financial_categories fc
-- WHERE fc.id = ft."categoryId"
--   AND ft.type = 'EXPENSE'
--   AND lower(trim(COALESCE(fc.name, ''))) NOT IN ('gasolina', 'combustivel', 'combustível')
--   AND ft.description ILIKE '%indrive%';

-- -----------------------------------------------------------------------
-- PARTE 3 — VERIFICAÇÃO: confirme, depois de aplicar a PARTE 2 com os
-- IDs corretos, que os registros migrados agora aparecem aqui e que
-- nenhum registro fora da lista revisada foi alterado.
-- -----------------------------------------------------------------------
SELECT
  ft.id,
  fc.name AS categoria_atual,
  ft.amount,
  ft.description,
  ft."affectsIndriveGoal"
FROM financial_transactions ft
JOIN financial_categories fc ON fc.id = ft."categoryId"
WHERE ft."affectsIndriveGoal" = true
  AND lower(trim(COALESCE(fc.name, ''))) NOT IN ('gasolina', 'combustivel', 'combustível')
ORDER BY ft."userId", ft.date;

-- IMPORTANTE: troque para ROLLBACK; se estiver só auditando/testando, ou
-- para COMMIT; quando os IDs da PARTE 2 já estiverem revisados e corretos.
ROLLBACK;