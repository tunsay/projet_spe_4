-- password:  testtesttest

-- Insertion d'un utilisateur admin
INSERT INTO "users" (
  "email",
  "password_hash",
  "display_name",
  "role",
  "is_blocked",
  "is_two_factor_enabled",
  "created_at",
  "updated_at"
) VALUES (
  'admin@example.com',
  '$2b$10$PdjrQ5ixQ5q6c47.3CliX.oHgIednvVoFaGFrbtc55yOgQw7qr2P6',
  'Admin User',
  'admin',
  false,
  false,
  NOW(),
  NOW()
),
(
  'tuna@example.com',
  '$2b$10$PdjrQ5ixQ5q6c47.3CliX.oHgIednvVoFaGFrbtc55yOgQw7qr2P6',
  'Tuna Admin User',
  'admin',
  false,
  false,
  NOW(),
  NOW()
);

-- Insertion de 5 utilisateurs standards
INSERT INTO "users" (
  "email",
  "password_hash",
  "display_name",
  "role",
  "is_blocked",
  "is_two_factor_enabled",
  "created_at",
  "updated_at"
) VALUES
(
  'alice@example.com',
  '$2b$10$PdjrQ5ixQ5q6c47.3CliX.oHgIednvVoFaGFrbtc55yOgQw7qr2P6',
  'Alice Dupont',
  'user',
  false,
  false,
  NOW(),
  NOW()
),
(
  'bob@example.com',
  '$2b$10$PdjrQ5ixQ5q6c47.3CliX.oHgIednvVoFaGFrbtc55yOgQw7qr2P6',
  'Bob Martin',
  'user',
  false,
  false,
  NOW(),
  NOW()
),
(
  'charlie@example.com',
  '$2b$10$PdjrQ5ixQ5q6c47.3CliX.oHgIednvVoFaGFrbtc55yOgQw7qr2P6',
  'Charlie Moreau',
  'user',
  false,
  false,
  NOW(),
  NOW()
),
(
  'diana@example.com',
  '$2b$10$PdjrQ5ixQ5q6c47.3CliX.oHgIednvVoFaGFrbtc55yOgQw7qr2P6',
  'Diana Petit',
  'user',
  false,
  false,
  NOW(),
  NOW()
),
(
  'eve@example.com',
  '$2b$10$PdjrQ5ixQ5q6c47.3CliX.oHgIednvVoFaGFrbtc55yOgQw7qr2P6',
  'Eve Leclerc',
  'user',
  false,
  false,
  NOW(),
  NOW()
);