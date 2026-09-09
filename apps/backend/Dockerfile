FROM node:22-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY packages/shared packages/shared
COPY apps/backend apps/backend
RUN pnpm --filter @gym-crm/backend exec prisma generate --schema=prisma/schema.prisma && pnpm --filter @gym-crm/backend build
RUN chmod +x apps/backend/entrypoint.sh
WORKDIR /app/apps/backend
EXPOSE 4000
CMD ["./entrypoint.sh"]