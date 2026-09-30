DROP TABLE IF EXISTS "campaign_members";
DROP TABLE IF EXISTS "campaigns";

DROP INDEX IF EXISTS "idx_leads_campaign";

ALTER TABLE "leads"
DROP COLUMN IF EXISTS "campaign_id";
