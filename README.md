# dsh-aha

`dsh-aha` 是一个独立的 DeepSeek Harness Web 启动壳。它不维护 DeepSeek Harness 源码 fork，而是通过 pnpm 精确依赖官方发布的 `@deepseek-ai/dsh@0.1.1-rc.2` 及其公开组合模块。

项目自己负责命令行、进程生命周期和部署参数；Agent 内核、Web UI、API 与插件实现均来自官方发布包。

## 界面主题

本项目在官方 Web UI 之上提供固定的「Champagne Light」亮色主题。界面使用淡香槟色连续纸面、低对比度分隔和克制的蓝色行动强调，不提供暗色或跟随系统的外观切换。

主题通过 DeepSeek Harness 的公开扩展点接入：Host 插件负责首屏亮色引导，浏览器插件通过 ThemeRuntime 覆盖语义 token，并使用 Slot 优先级隐藏官方 Appearance 设置行。项目不会复制、修改或引用 DeepSeek Harness 的内部构建文件；Workspace、Session、Chat、Trajectory、工具详情、设置与目录选择等真实行为仍由官方发布包提供。

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

服务固定绑定 `0.0.0.0:3080`，启动后不会自动打开浏览器。请访问 `http://127.0.0.1:3080`。

修改端口：

```sh
pnpm start --port 4080
```

为具名域名添加浏览器 API 信任项；该参数可以重复：

```sh
pnpm start --trusted-host aha.internal --trusted-host aha.internal:3080
```

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

`dsh-aha` 默认绑定全部网络接口，并且不提供用户身份认证。DeepSeek Harness 能够执行命令和读写工作区，因此只能在可信局域网中运行；不要把端口直接暴露到公网。

`--trusted-host` 用于防御 DNS rebinding，不是身份认证机制。

## 开发

```sh
pnpm dev
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm check
```

升级 DeepSeek Harness 时，应同时更新所有 `@deepseek-ai/dsh*` 依赖，重新生成 `pnpm-lock.yaml`，再运行 `pnpm check` 和实际 HTTP 启动验证。
