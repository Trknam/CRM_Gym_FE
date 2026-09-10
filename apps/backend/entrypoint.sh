#!/bin/sh
set -e

echo "[backend] syncing database schema..."
pnpm exec prisma db push --schema=prisma/schema.prisma

echo "[backend] starting API..."
exec node dist/server.js