#!/bin/sh
set -e

echo "[backend] syncing database schema..."
pnpm exec prisma db push --schema=prisma/schema.prisma --accept-data-loss

echo "[backend] seeding initial data..."
pnpm run db:seed

echo "[backend] starting API..."
exec node dist/server.js
