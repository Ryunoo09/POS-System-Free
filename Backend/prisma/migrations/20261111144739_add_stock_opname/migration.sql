-- CreateEnum
CREATE TYPE "stock_opname_status" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "stock_opname_scope" AS ENUM ('ALL', 'CATEGORY', 'PRODUCT');

-- AlterEnum
ALTER TYPE "stock_reference_type" ADD VALUE 'STOCK_OPNAME';

-- CreateTable
CREATE TABLE "stock_opname_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_number" VARCHAR(30) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "stock_opname_status" NOT NULL DEFAULT 'DRAFT',
    "scope" "stock_opname_scope" NOT NULL,
    "notes" VARCHAR(500),
    "rejection_reason" VARCHAR(500),
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "rejected_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "stock_opname_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_opname_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku_snapshot" VARCHAR(50) NOT NULL,
    "barcode_snapshot" VARCHAR(50),
    "name_snapshot" VARCHAR(150) NOT NULL,
    "system_stock" INTEGER NOT NULL,
    "physical_stock" INTEGER,
    "difference" INTEGER,
    "reason" VARCHAR(255),
    "counted_by" UUID,
    "counted_at" TIMESTAMPTZ(6),

    CONSTRAINT "stock_opname_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_opname_sessions_session_number_key" ON "stock_opname_sessions"("session_number");

-- CreateIndex
CREATE INDEX "stock_opname_sessions_status_created_at_idx" ON "stock_opname_sessions"("status", "created_at");

-- CreateIndex
CREATE INDEX "stock_opname_sessions_created_by_idx" ON "stock_opname_sessions"("created_by");

-- CreateIndex
CREATE INDEX "stock_opname_items_session_id_idx" ON "stock_opname_items"("session_id");

-- CreateIndex
CREATE INDEX "stock_opname_items_product_id_idx" ON "stock_opname_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "stock_opname_items_session_id_product_id_key" ON "stock_opname_items"("session_id", "product_id");

-- AddForeignKey
ALTER TABLE "stock_opname_sessions" ADD CONSTRAINT "stock_opname_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_opname_sessions" ADD CONSTRAINT "stock_opname_sessions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "stock_opname_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_counted_by_fkey" FOREIGN KEY ("counted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
