-- Fase 4.1A — North como ERP pessoal para freelancer
-- Evolui Lead para representar Cliente/Prospect, estende Project para
-- suportar projetos de cliente, e torna FinancialTransaction vinculável
-- opcionalmente a um Project. Todas as colunas são nullable ou têm
-- DEFAULT, portanto não há impacto em linhas já existentes.

-- AlterTable: leads — novos campos de contato
ALTER TABLE "leads" ADD COLUMN "email" TEXT;
ALTER TABLE "leads" ADD COLUMN "whatsapp" TEXT;
ALTER TABLE "leads" ADD COLUMN "website" TEXT;

-- AlterTable: projects — suporte a projetos de cliente
ALTER TABLE "projects" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "projects" ADD COLUMN "clientId" TEXT;
ALTER TABLE "projects" ADD COLUMN "clientStatus" TEXT;
ALTER TABLE "projects" ADD COLUMN "agreedValue" DOUBLE PRECISION;
ALTER TABLE "projects" ADD COLUMN "nextAction" TEXT;

CREATE INDEX "projects_clientId_idx" ON "projects"("clientId");
CREATE INDEX "projects_kind_idx" ON "projects"("kind");

ALTER TABLE "projects" ADD CONSTRAINT "projects_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: financial_transactions — vínculo opcional com projeto
ALTER TABLE "financial_transactions" ADD COLUMN "projectId" TEXT;

CREATE INDEX "financial_transactions_projectId_idx" ON "financial_transactions"("projectId");

ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;