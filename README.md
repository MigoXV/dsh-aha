# dsh-aha

`dsh-aha` 是一个独立的 DeepSeek Harness Web 启动壳。它不维护 DeepSeek Harness 源码 fork，而是通过 pnpm 精确依赖官方发布的 `@deepseek-ai/dsh@0.1.5-rc.2`（本次选定的 next 版本）及其公开组合模块。

项目自己负责命令行、进程生命周期和部署参数；Agent 内核、Web UI、API 与插件实现均来自官方发布包。

## 界面主题

本项目在官方 Web UI 之上提供固定的「Champagne Light」亮色主题。界面使用淡香槟色连续纸面、低对比度分隔和克制的蓝色行动强调，不提供暗色或跟随系统的外观切换。

主题通过 DeepSeek Harness 的公开扩展点接入：Host 插件负责首屏亮色引导，浏览器插件通过 ThemeRuntime 覆盖语义 token，并使用 Slot 优先级隐藏官方 Appearance 设置行。主题不修改官方构建文件；Workspace、Session、Chat、Trajectory、工具详情、设置与目录选择等真实行为仍由官方发布包提供。

## 局域网设置兼容补丁

官方 `0.1.5-rc.2` 设置插件将非 localhost 页面切换到内存模式，导致模型设置提示 `settings are unavailable in this browser`。经项目维护者明确授权，本项目对此保留一个最小例外：通过 `pnpm patch` 将 `@deepseek-ai/dsh-client-ui-settings` 的设置持久化模式固定为 `host`。补丁位于 `patches/`，由 `pnpm-workspace.yaml` 的 `patchedDependencies` 和锁文件管理，安装依赖时自动应用。

此补丁不伪装浏览器的 `isLoopback`，也不修改服务端令牌认证或 Host/Origin 校验；已认证的局域网浏览器可以读取、保存同一主机的设置。补丁只改动该版本发布包的一处判断，不扩展为官方源码 fork。升级时应先验证官方是否已支持非 loopback 设置持久化；确认模型目录加载、配置保存和重新打开浏览器的回归测试通过后，再移除补丁及对应配置。

更新项目后执行 `pnpm install --frozen-lockfile` 和 `pnpm build`，重启服务并强制刷新旧标签页，使浏览器加载修补后的设置插件。

## 环境要求

- Node.js `^22.19.0` 或 `>=24.0.0`
- pnpm `11.7.0`

## 安装

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
```

如需调用 DeepSeek API，可以复制示例环境文件并填写密钥：

```sh
cp .env.example .env
```

`.env` 不应提交到 Git。

## 启动

```sh
pnpm start
```

服务固定绑定 `0.0.0.0:3080`，启动后不会自动打开浏览器。首次访问请完整打开终端打印的带 `?token=...` 的链接；局域网设备使用其中的 LAN 链接，例如 `http://192.168.1.10:3080/?token=...`。

官方认证服务会将启动令牌换成 HttpOnly cookie，并跳转到不带令牌的首页。随后可直接访问同一地址；本机地址、不同局域网 IP 和不同端口的 cookie 不通用。请勿将带令牌的链接分享给不可信的人。

修改端口：

```sh
pnpm start --port 4080
```

为具名域名添加浏览器 API 信任项；该参数可以重复：

```sh
pnpm start --trusted-host aha.internal --trusted-host aha.internal:3080
```

域名首次访问时，将启动链接中的主机地址替换为该域名，保留实际端口和令牌。本机网卡的局域网 IPv4 地址会自动加入信任，无需额外指定。

## 局域网 HTTP 与连接排查

- 支持通过可信局域网 IPv4 地址直接使用 HTTP，无需将浏览器配置为信任不安全来源。
- 首页或 API 返回 401 时，重新打开当前服务启动时打印的带令牌链接。清除 cookie、认证过期或更换访问地址后都需要重新认证。
- 返回 403 时，检查访问域名是否通过 `--trusted-host` 配置，并确认 Origin 与实际访问地址一致；该参数不会绕过认证。
- 新版事件连接使用 `/api/remote.mux`。升级、构建并重启后请刷新所有旧标签页；如果仍请求 `/api/events.mux` 或 `/api/events.host`，强制刷新页面并确认端口上的进程确实已经更新。
- 仍持续断线时，检查浏览器 Network 中 WebSocket 的握手响应及终端错误；HTTP 首页可打开不代表事件连接已经就绪。

查看完整参数：

```sh
pnpm start -- --help
```

## 数据目录

会话、设置和本地凭据默认沿用 DeepSeek Harness 的 `~/.dsh`。如需使用其他位置，请在启动进程前设置 `DSH_HOME`：

```sh
export DSH_HOME=/absolute/path/to/dsh-home
pnpm start
```

`DSH_HOME` 会改变进程启动与插件加载位置，官方启动模块不允许从 `.env` 设置它。

## 安全说明

`dsh-aha` 默认绑定全部网络接口，沿用官方启动令牌与浏览器 cookie 认证，不提供多用户账号体系。DeepSeek Harness 能够执行命令和读写工作区，因此只能在可信局域网中运行；不要把端口直接暴露到公网。HTTP 不加密令牌与 cookie 的传输。

`--trusted-host` 用于防御 DNS rebinding，不是身份认证机制。

## 开发

测试包含真实 Chromium 的局域网 HTTP 回归，需要至少一个非 loopback IPv4 网卡。默认使用 `/usr/bin/chromium`；可通过 `CHROMIUM_PATH` 指定其他位置，或先安装 Playwright Chromium：

```sh
pnpm exec playwright install chromium
```

```sh
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check
```

升级 DeepSeek Harness 时，应同时更新所有 `@deepseek-ai/dsh*` 依赖与 `pnpm-workspace.yaml` 的 peer 版本覆盖，重新生成 `pnpm-lock.yaml`，再运行 `pnpm check` 和实际 HTTP 启动验证。版本回归测试会拒绝锁文件中的新旧 DSH 混用。
