-- Review before applying to YQYHub. This migration changes only namiya_store
-- and creates two dedicated Storage buckets; it never edits another app schema.
BEGIN;
CREATE SCHEMA IF NOT EXISTS "namiya_store";
REVOKE ALL ON SCHEMA "namiya_store" FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA "namiya_store" TO postgres;

CREATE TABLE "namiya_store"."profiles" (
  "id" TEXT NOT NULL,
  "authUserId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "profiles_authUserId_key" ON "namiya_store"."profiles"("authUserId");

CREATE TABLE "namiya_store"."shops" (
  "id" TEXT NOT NULL,
  "ownerId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "draft" JSONB,
  "published" JSONB,
  "publishedAt" TIMESTAMP(3),
  "revision" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "shops_ownerId_key" ON "namiya_store"."shops"("ownerId");

CREATE TABLE "namiya_store"."uploads" (
  "id" TEXT NOT NULL,
  "ownerId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "path" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "uploads_path_key" ON "namiya_store"."uploads"("path");
CREATE INDEX "uploads_ownerId_createdAt_idx" ON "namiya_store"."uploads"("ownerId", "createdAt");

CREATE TABLE "namiya_store"."threads" (
  "id" TEXT NOT NULL,
  "shopId" TEXT NOT NULL,
  "shopOwnerId" UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  "visitorId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "signature" TEXT,
  "title" TEXT NOT NULL,
  "clientRequestId" TEXT NOT NULL,
  "blockedByVisitor" BOOLEAN NOT NULL DEFAULT false,
  "blockedByOwner" BOOLEAN NOT NULL DEFAULT false,
  "visitorReadAt" TIMESTAMP(3),
  "ownerReadAt" TIMESTAMP(3),
  "generationStatus" TEXT NOT NULL DEFAULT 'idle',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "threads_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "threads_visitorId_clientRequestId_key" ON "namiya_store"."threads"("visitorId", "clientRequestId");
CREATE INDEX "threads_visitorId_updatedAt_idx" ON "namiya_store"."threads"("visitorId", "updatedAt");
CREATE INDEX "threads_shopOwnerId_updatedAt_idx" ON "namiya_store"."threads"("shopOwnerId", "updatedAt");

CREATE TABLE "namiya_store"."messages" (
  "id" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "seq" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'human',
  "clientRequestId" TEXT,
  "replyToId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'completed',
  "leaseUntil" TIMESTAMP(3),
  "error" TEXT,
  "audioPath" TEXT,
  "audioStatus" TEXT NOT NULL DEFAULT 'idle',
  "audioLeaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "namiya_store"."threads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "messages_replyToId_key" ON "namiya_store"."messages"("replyToId");
CREATE UNIQUE INDEX "messages_threadId_clientRequestId_key" ON "namiya_store"."messages"("threadId", "clientRequestId");
CREATE UNIQUE INDEX "messages_threadId_seq_key" ON "namiya_store"."messages"("threadId", "seq");
CREATE INDEX "messages_threadId_createdAt_idx" ON "namiya_store"."messages"("threadId", "createdAt");

-- Browser clients have no Data API privileges. The application uses Prisma
-- with explicit auth.users ownership checks. RLS is defense in depth.
REVOKE ALL ON ALL TABLES IN SCHEMA "namiya_store" FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA "namiya_store" REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
ALTER TABLE "namiya_store"."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "namiya_store"."shops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "namiya_store"."uploads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "namiya_store"."threads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "namiya_store"."messages" ENABLE ROW LEVEL SECURITY;

-- Service-role writes only; no client Storage policies are created.
-- ON CONFLICT DO NOTHING deliberately does not alter existing buckets.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('namiya-private', 'namiya-private', false, 15728640)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('namiya-scenes', 'namiya-scenes', true, 10485760, ARRAY['image/webp'])
ON CONFLICT (id) DO NOTHING;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'namiya-private' AND public) THEN
    RAISE EXCEPTION 'namiya-private must be private';
  END IF;
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'namiya-scenes' AND NOT public) THEN
    RAISE EXCEPTION 'namiya-scenes must be public';
  END IF;
END $$;
COMMIT;
