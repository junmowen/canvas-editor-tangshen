# Components 目录说明

`src/components/` 存放核心和 demo 都可能使用的轻量 UI 组件。

当前保留在这里的组件：

| 路径 | 职责 |
| --- | --- |
| `dialog/` | 通用弹窗组件，当前被 demo 菜单和核心表格右键菜单使用 |

## 边界规则

- 这里的组件可以依赖 `src/editor/dataset` 中的常量和枚举。
- 这里的组件不应依赖 `src/demo/`。
- demo 专用组件应放在 `src/demo/components/`。
- demo 反向依赖边界由 `npm run architecture:check` 校验。

## 位置说明

- 所属层级：共享组件层
- 上游调用：`src/demo/**`、可复用 UI 交互
- 下游依赖：组件自身 CSS 和浏览器 DOM

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `dialog/` | 通用弹窗组件和样式。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `dialog/Dialog.ts` | `Dialog` | 渲染输入项弹窗并返回确认数据。 | demo 菜单、插入配置 |
