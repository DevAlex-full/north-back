-- Fase 4.3A — Histórico Comercial e Subtarefas
-- 100% aditiva: não altera colunas existentes, zero impacto em dados atuais.

-- Tabela de subtarefas (N subtarefas por ProjectTask)
CREATE TABLE "project_subtasks" (
    "id"          TEXT NOT NULL,
    "taskId"      TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "status"      TEXT NOT NULL DEFAULT 'PENDING',
    "order"       INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_subtasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_subtasks_taskId_idx" ON "project_subtasks"("taskId");

ALTER TABLE "project_subtasks"
    ADD CONSTRAINT "project_subtasks_taskId_fkey"
    FOREIGN KEY ("taskId") REFERENCES "project_tasks"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Tabela de histórico / atividades comerciais (N eventos por lead/projeto)
CREATE TABLE "activity_logs" (
    "id"          TEXT NOT NULL,
    "userId"      TEXT NOT NULL,
    "leadId"      TEXT,
    "projectId"   TEXT,
    "type"        TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "description" TEXT,
    "source"      TEXT NOT NULL DEFAULT 'MANUAL',
    "metadata"    JSONB,
    "occurredAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_logs_userId_idx"     ON "activity_logs"("userId");
CREATE INDEX "activity_logs_leadId_idx"     ON "activity_logs"("leadId");
CREATE INDEX "activity_logs_projectId_idx"  ON "activity_logs"("projectId");
CREATE INDEX "activity_logs_occurredAt_idx" ON "activity_logs"("occurredAt");

ALTER TABLE "activity_logs"
    ADD CONSTRAINT "activity_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "activity_logs"
    ADD CONSTRAINT "activity_logs_leadId_fkey"
    FOREIGN KEY ("leadId") REFERENCES "leads"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "activity_logs"
    ADD CONSTRAINT "activity_logs_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "projects"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;