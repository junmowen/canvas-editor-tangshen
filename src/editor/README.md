# Editor 核心目录说明

`src/editor/` 是编辑器核心库目录，也是 npm 包构建的主体。

## 关键入口

| 路径 | 职责 |
| --- | --- |
| `index.ts` | 对外默认导出 `Editor`，并集中导出命令、枚举、类型和工具 |
| `core/` | 编辑器运行时核心，包括命令、绘制、事件、表格、渲染后端等 |
| `interface/` | 对外和内部共用 TypeScript 接口 |
| `dataset/` | 枚举、常量和默认配置 |
| `assets/` | 核心样式和核心右键菜单等资源 |
| `utils/` | 核心工具函数 |
| `types/` | 补充类型声明 |

核心子目录说明：

- `core/README.md`
- `core/draw/README.md`
- `core/event/README.md`
- `core/table/README.md`
- `core/render-backend/README.md`
- `interface/README.md`
- `dataset/README.md`
- `assets/README.md`
- `utils/README.md`
- `types/README.md`

## 边界规则

- 核心库不应依赖 `src/demo/`。
- 对外类型、枚举和工具应从 `index.ts` 汇总导出。
- 新增跨模块访问前，先确认是否已有 `core` 服务或 resolver 可以承接。
- 坐标、对象访问、表格遍历和 demo 反向依赖等边界需遵守 `scripts/verify-architecture.js` 的约束。

## 位置说明

- 所属层级：编辑器核心库
- 上游调用：包入口、demo、外部使用方
- 下游依赖：`core/`、`dataset/`、`interface/`、`utils/`、`assets/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `index.ts` | 编辑器对外导出入口。 |
| `core/` | 编辑器运行时核心能力。 |
| `dataset/` | 常量、枚举和默认配置。 |
| `interface/` | TypeScript 接口定义。 |
| `assets/` | 样式和图标资源。 |
| `utils/` | 跨核心模块复用的工具函数。 |
| `types/` | 补充全局类型声明。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `index.ts` | 默认导出 `Editor` | 对外暴露编辑器构造器和公共类型。 | npm 包入口、demo |
| `core/` | `Draw` / `Command` / `CanvasEvent` | 编辑器运行、命令、事件、渲染核心入口。 | `Editor` |
| `utils/` | `mergeOption()` / `formatElementList()` / `createDomFromElementList()` 等 | 配置合并、元素格式化、HTML 转换等工具。 | core、demo、导入导出 |
