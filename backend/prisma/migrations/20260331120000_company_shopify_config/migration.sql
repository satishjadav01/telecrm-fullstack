ALTER TABLE "companies"
  ADD COLUMN "shopify_store_domain" VARCHAR(255),
  ADD COLUMN "shopify_admin_access_token" TEXT,
  ADD COLUMN "shopify_api_version" VARCHAR(20);
