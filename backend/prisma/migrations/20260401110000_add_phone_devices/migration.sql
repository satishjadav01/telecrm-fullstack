CREATE TABLE "phone_devices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "assigned_to_user_id" UUID,
    "label" VARCHAR(120) NOT NULL,
    "imei" VARCHAR(40) NOT NULL,
    "phone_number" VARCHAR(20),
    "manufacturer" VARCHAR(80),
    "model" VARCHAR(80),
    "sim_number" VARCHAR(40),
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "phone_devices_imei_key" ON "phone_devices"("imei");
CREATE INDEX "idx_phone_devices_company" ON "phone_devices"("company_id");
CREATE INDEX "idx_phone_devices_assignee" ON "phone_devices"("assigned_to_user_id");

ALTER TABLE "calls"
ADD COLUMN "phone_device_id" UUID;

CREATE INDEX "idx_calls_phone_device_time" ON "calls"("phone_device_id", "created_at" DESC);

ALTER TABLE "phone_devices"
ADD CONSTRAINT "phone_devices_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "phone_devices"
ADD CONSTRAINT "phone_devices_assigned_to_user_id_fkey"
FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "calls"
ADD CONSTRAINT "calls_phone_device_id_fkey"
FOREIGN KEY ("phone_device_id") REFERENCES "phone_devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
