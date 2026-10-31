# syntax=docker/dockerfile:1
# Books API image. Build from the repository root:
#   docker build -f apps/api/Dockerfile -t books-api .
# Configuration comes only from environment variables (see apps/api/.env.example).

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# ---- build: install everything, compile shared + api, then extract prod deps ----
FROM base AS build
WORKDIR /repo
# Tests are not run in the image, so skip the large MongoDB test binary download.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@books/api..."
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @books/shared build \
 && pnpm --filter @books/api build \
 && pnpm --filter @books/api deploy --prod /out

# ---- runtime: production dependencies + compiled code only, non-root ----
FROM node:22-slim AS runtime
ENV NODE_ENV=production
ENV PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
