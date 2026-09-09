FROM node:22-alpine
WORKDIR /app
RUN corepack enable
ARG BACKEND_INTERNAL_URL=http://localhost:4000
ENV BACKEND_INTERNAL_URL=$BACKEND_INTERNAL_URL
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN pnpm install --frozen-lockfile --prod=false
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN pnpm --filter @gym-crm/frontend build
WORKDIR /app/apps/frontend
EXPOSE 3000
CMD ["pnpm","start"]
