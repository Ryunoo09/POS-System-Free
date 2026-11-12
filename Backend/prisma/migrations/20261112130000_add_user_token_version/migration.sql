-- Revoke JWTs by bumping users.token_version (SEC-07)
ALTER TABLE "users" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 0;
