BEGIN;

ALTER TABLE "namiya_store"."shops"
  ADD COLUMN "isOpen" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "discoverable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "acceptingLetters" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "ownerDisplayName" TEXT NOT NULL DEFAULT '旅人',
  ADD COLUMN "ownerAvatarUrl" TEXT;

UPDATE "namiya_store"."shops"
SET "acceptingLetters" = CASE
  WHEN jsonb_typeof("published"->'acceptingLetters') = 'boolean'
    THEN ("published"->>'acceptingLetters')::boolean
  WHEN jsonb_typeof("draft"->'acceptingLetters') = 'boolean'
    THEN ("draft"->>'acceptingLetters')::boolean
  ELSE true END;

CREATE INDEX "shops_isOpen_discoverable_publishedAt_idx"
  ON "namiya_store"."shops"("isOpen", "discoverable", "publishedAt");

CREATE TABLE "namiya_store"."shop_favorites" (
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "shopId" TEXT NOT NULL REFERENCES "namiya_store"."shops"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "shop_favorites_pkey" PRIMARY KEY ("userId", "shopId")
);
CREATE INDEX "shop_favorites_userId_createdAt_shopId_idx"
  ON "namiya_store"."shop_favorites"("userId", "createdAt", "shopId");
ALTER TABLE "namiya_store"."shop_favorites" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "namiya_store"."shop_favorites" FROM PUBLIC, anon, authenticated;

COMMIT;
