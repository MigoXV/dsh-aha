# syntax=docker/dockerfile:1

FROM node:24-bookworm AS build

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

WORKDIR /src

# 先复制依赖清单，让源码变化不会使依赖层失效。
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ui-champagne/package.json packages/ui-champagne/package.json
COPY patches ./patches

RUN corepack enable \
    && pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.build.json ./
COPY config ./config
COPY src ./src
COPY packages/ui-champagne ./packages/ui-champagne

RUN pnpm build
RUN pnpm --filter dsh-aha deploy --legacy --prod /opt/dsh

FROM docker:27-cli AS docker-cli

FROM node:24-bookworm-slim

RUN apt-get update \
    && apt-get install --yes --no-install-recommends bash ca-certificates curl git openssh-client ripgrep \
    && rm -rf /var/lib/apt/lists/*

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=build /opt/dsh /opt/dsh

# 根包的构建产物与组合文件被 .gitignore 排除，显式覆盖可避免
# pnpm deploy 的 packlist 规则漏掉运行时入口。
COPY --from=build /src/lib /opt/dsh/lib
COPY --from=build /src/config /opt/dsh/config
COPY --from=build /src/package.json /opt/dsh/package.json

ENV DSH_HOME=/var/lib/dsh \
    DSH_TELEMETRY_DISABLED=1 \
    DSH_PERMISSION_MODE=workspace-write \
    PATH=/opt/dsh/node_modules/.bin:${PATH}

WORKDIR /workspace

VOLUME ["/var/lib/dsh"]
EXPOSE 3080

HEALTHCHECK CMD curl --fail --silent http://127.0.0.1:3080/ >/dev/null || exit 1

STOPSIGNAL SIGTERM

# dsh-aha 固定监听 0.0.0.0，且不会自动打开浏览器。
ENTRYPOINT ["node", "/opt/dsh/lib/bin.js"]
