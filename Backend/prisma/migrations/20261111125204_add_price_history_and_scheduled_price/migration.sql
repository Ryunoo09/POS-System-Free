-- CreateEnum
CREATE TYPE "price_field" AS ENUM ('SELLING_PRICE', 'COST_PRICE');

-- CreateEnum
CREATE TYPE "price_change_source" AS ENUM ('MANUAL', 'SCHEDULED', 'BULK');

-- CreateEnum
CREATE TYPE "scheduled_price_status" AS ENUM ('SCHEDULED', 'APPLIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "product_price_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "field" "price_field" NOT NULL,
    "old_value" DECIMAL(12,2) NOT NULL,
    "new_value" DECIMAL(12,2) NOT NULL,
    "source" "price_change_source" NOT NULL,
    "reason" VARCHAR(255),
    "changed_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_price_changes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "selling_price" DECIMAL(12,2) NOT NULL,
    "effective_date" TIMESTAMPTZ(6) NOT NULL,
    "status" "scheduled_price_status" NOT NULL DEFAULT 'SCHEDULED',
    "reason" VARCHAR(255) NOT NULL,
    "created_by_id" UUID NOT NULL,
    "applied_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "scheduled_price_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_price_history_product_id_created_at_idx" ON "product_price_history"("product_id", "created_at");

-- CreateIndex
CREATE INDEX "product_price_history_source_created_at_idx" ON "product_price_history"("source", "created_at");

-- CreateIndex
CREATE INDEX "scheduled_price_changes_status_effective_date_idx" ON "scheduled_price_changes"("status", "effective_date");

-- CreateIndex
CREATE INDEX "scheduled_price_changes_product_id_status_idx" ON "scheduled_price_changes"("product_id", "status");

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_price_changes" ADD CONSTRAINT "scheduled_price_changes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_price_changes" ADD CONSTRAINT "scheduled_price_changes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
