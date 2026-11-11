-- AlterEnum
ALTER TYPE "price_change_source" ADD VALUE 'PURCHASE';

-- AlterEnum
ALTER TYPE "price_field" ADD VALUE 'AVERAGE_COST';

-- AlterTable
ALTER TABLE "product_price_history" ADD COLUMN     "purchase_order_id" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "average_cost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "product_price_history_purchase_order_id_idx" ON "product_price_history"("purchase_order_id");

-- AddForeignKey
ALTER TABLE "product_price_history" ADD CONSTRAINT "product_price_history_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: biaya rata-rata awal mengikuti harga beli terakhir
UPDATE "products" SET "average_cost" = "cost_price" WHERE "average_cost" = 0;
