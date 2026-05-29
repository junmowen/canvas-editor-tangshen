# Cypress 目录索引

这个目录存放端到端测试、测试资源和 Cypress 运行支持代码。

| 路径 | 职责 |
| --- | --- |
| `e2e/` | Cypress 用例，按功能域分组，入口见 `e2e/README.md` |
| `fixtures/` | 静态测试资源，入口见 `fixtures/README.md` |
| `support/` | Cypress 全局支持代码和自定义命令 |
| `global.d.ts` | Cypress 自定义命令类型声明 |
| `tsconfig.json` | Cypress TypeScript 配置 |
| `screenshots/` | Cypress 失败截图输出目录，已被 `.gitignore` 忽略 |

## 常用命令

```sh
npm run cypress:open
npm run cypress:run
```

本项目多数用例会访问本地 demo 地址。运行前请先启动：

```sh
npm run dev
```

Cypress spec 中应显式访问：

```txt
http://localhost:3000/canvas-editor/index.html
```

不要使用 `http://localhost:3000/canvas-editor/`，当前 Vite dev server 会对该路径返回 404。
