# Builds the React PWA and serves it with nginx, which also forwards /api to the API container.
FROM node:22-alpine AS build
RUN npm install -g pnpm@9.15.9
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @books/web... --filter @books/shared
COPY packages/shared packages/shared
COPY apps/web apps/web
RUN pnpm --filter @books/shared build && pnpm --filter @books/web build

FROM nginx:1.27-alpine
COPY deploy/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html
