-- AlterTable
ALTER TABLE "call_recordings" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "follow_ups" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "company_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "company_id" UUID;

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "companies_code_key" ON "companies"("code");

-- CreateIndex
CREATE INDEX "idx_recordings_company" ON "call_recordings"("company_id");

-- CreateIndex
CREATE INDEX "idx_calls_company" ON "calls"("company_id");

-- CreateIndex
CREATE INDEX "idx_campaigns_company" ON "campaigns"("company_id");

-- CreateIndex
CREATE INDEX "idx_followups_company" ON "follow_ups"("company_id");

-- CreateIndex
CREATE INDEX "idx_leads_company" ON "leads"("company_id");

-- CreateIndex
CREATE INDEX "idx_users_company" ON "users"("company_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "call_recordings" ADD CONSTRAINT "call_recordings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
