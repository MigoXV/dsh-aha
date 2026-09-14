# AGENTS.md

- 本项目必须使用 pnpm 安装依赖、运行脚本和维护锁文件，禁止引入 npm 或 npx 工作流。
- DeepSeek Harness 只通过官方 registry 发布包使用；不得复制、修改或以相对路径引用其源码仓库。
- 唯一授权补丁例外：允许通过 pnpm patch 将 `@deepseek-ai/dsh-client-ui-settings@0.1.5-rc.2` 的浏览器设置持久化判断固定为 `host`，修复 LAN 设置页；补丁必须纳入版本控制，保留服务端认证及 Host/Origin 校验，不扩展为其他官方包修改。
- 所有 `@deepseek-ai/dsh*` 依赖必须保持在同一个明确版本，升级时同时更新并运行完整检查。
- 修改启动组合前，先确认使用的是官方包公开导出，不依赖构建产物中的哈希化内部文件。
- README.md 必须使用中文编写。
