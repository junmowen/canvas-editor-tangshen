# Src 目录索引

`src/` 按核心库、共享组件和本地 demo 分层。

| 路径 | 职责 |
| --- | --- |
| `editor/` | 编辑器核心库，也是 npm 包构建主体 |
| `components/` | 核心库和 demo 共用的轻量 UI 组件 |
| `demo/` | 本地演示页、示例插件、demo 资源和 demo 专用组件 |
| `vite-env.d.ts` | Vite 类型声明 |

## 边界

- `src/editor/` 不应依赖 `src/demo/`。
- demo 专用代码放在 `src/demo/`。
- 核心和 demo 都要使用的轻量 UI 组件放在 `src/components/`。
- 目录边界由 `npm run architecture:check` 做基础校验。

更细的说明见：

- `src/editor/README.md`
- `src/components/README.md`
- `src/demo/README.md`

## 位置说明

- 所属层级：源码根目录
- 上游调用：构建入口、Vite demo、npm 包导出
- 下游依赖：`editor/`、`components/`、`demo/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `editor/` | 编辑器核心库源码和对外导出主体。 |
| `components/` | demo 和核心可复用的轻量 UI 组件。 |
| `demo/` | 本地演示页、示例插件和 demo 资源。 |
| `vite-env.d.ts` | Vite 环境类型声明。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `editor/index.ts` | 默认导出和命名导出 | 暴露 `Editor`、命令、枚举、接口和工具。 | npm 包入口、demo |
| `demo/main.ts` | demo 启动脚本 | 初始化演示编辑器和工具栏交互。 | Vite demo 页面 |
| `components/dialog/Dialog.ts` | `Dialog` | 提供轻量弹窗组件。 | demo 菜单和核心辅助交互 |
