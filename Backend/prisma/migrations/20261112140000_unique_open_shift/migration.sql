-- Satu shift OPEN per kasir (HARDEN-01)
CREATE UNIQUE INDEX "shifts_one_open_per_cashier"
  ON "shifts" ("cashier_id")
  WHERE "status" = 'OPEN';
