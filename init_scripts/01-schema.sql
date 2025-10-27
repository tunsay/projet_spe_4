CREATE TYPE "user_role" AS ENUM (
  'user',
  'admin'
);

CREATE TYPE "document_type" AS ENUM (
  'folder',
  'text',
  'file'
);

CREATE TYPE "permission_level" AS ENUM (
  'read',
  'edit',
  'owner'
);

CREATE TABLE "users" (
  "id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "email" "VARCHAR(255)" UNIQUE NOT NULL,
  "password_hash" "VARCHAR(255)" NOT NULL,
  "display_name" "VARCHAR(100)",
  "role" user_role NOT NULL DEFAULT 'user',
  "is_blocked" BOOLEAN NOT NULL DEFAULT false,
  "two_factor_secret" "VARCHAR(100)",
  "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
  "created_at" "TIMESTAMPTZ" NOT NULL DEFAULT (NOW()),
  "updated_at" "TIMESTAMPTZ" NOT NULL DEFAULT (NOW())
);

CREATE TABLE "documents" (
  "id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "parent_id" UUID,
  "owner_id" UUID NOT NULL,
  "name" "VARCHAR(255)" NOT NULL,
  "type" document_type NOT NULL,
  "content" TEXT,
  "file_path" "VARCHAR(1024)",
  "mime_type" "VARCHAR(100)",
  "last_modified_by_id" UUID,
  "last_modified_at" "TIMESTAMPTZ" NOT NULL DEFAULT (NOW()),
  "created_at" "TIMESTAMPTZ" NOT NULL DEFAULT (NOW())
);

CREATE TABLE "document_permissions" (
  "user_id" UUID NOT NULL,
  "document_id" UUID NOT NULL,
  "permission" permission_level NOT NULL DEFAULT 'read',
  PRIMARY KEY ("user_id", "document_id")
);

CREATE TABLE "collaboration_sessions" (
  "id" UUID PRIMARY KEY DEFAULT (gen_random_uuid()),
  "document_id" UUID UNIQUE NOT NULL,
  "host_id" UUID NOT NULL,
  "created_at" "TIMESTAMPTZ" NOT NULL DEFAULT (NOW())
);

CREATE TABLE "session_participants" (
  "session_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "joined_at" "TIMESTAMPTZ" NOT NULL DEFAULT (NOW()),
  PRIMARY KEY ("session_id", "user_id")
);

CREATE TABLE "messages" (
  "id" BIGSERIAL PRIMARY KEY,
  "session_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" "TIMESTAMPTZ" NOT NULL DEFAULT (NOW())
);

CREATE UNIQUE INDEX ON "documents" ("parent_id", "name");

ALTER TABLE "documents" ADD FOREIGN KEY ("parent_id") REFERENCES "documents" ("id") ON DELETE CASCADE;

ALTER TABLE "documents" ADD FOREIGN KEY ("owner_id") REFERENCES "users" ("id");

ALTER TABLE "documents" ADD FOREIGN KEY ("last_modified_by_id") REFERENCES "users" ("id");

ALTER TABLE "document_permissions" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "document_permissions" ADD FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE;

ALTER TABLE "collaboration_sessions" ADD FOREIGN KEY ("document_id") REFERENCES "documents" ("id") ON DELETE CASCADE;

ALTER TABLE "collaboration_sessions" ADD FOREIGN KEY ("host_id") REFERENCES "users" ("id");

ALTER TABLE "session_participants" ADD FOREIGN KEY ("session_id") REFERENCES "collaboration_sessions" ("id") ON DELETE CASCADE;

ALTER TABLE "session_participants" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;

ALTER TABLE "messages" ADD FOREIGN KEY ("session_id") REFERENCES "collaboration_sessions" ("id") ON DELETE CASCADE;

ALTER TABLE "messages" ADD FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE;
