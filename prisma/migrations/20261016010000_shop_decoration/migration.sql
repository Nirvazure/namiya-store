BEGIN;
ALTER TABLE "namiya_store"."shops"
  ADD COLUMN "decorationOnboardedAt" TIMESTAMP(3);
COMMIT;
