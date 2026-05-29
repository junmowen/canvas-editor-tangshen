# Demo 目录说明

`src/demo/` 只承载本地演示页和示例代码，不属于编辑器核心库的稳定 API 边界。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| `main.ts` | 本地 demo 启动入口，绑定工具栏、监听器、右键菜单和快捷键 |
| `mock.ts` | demo 初始化数据 |
| `menus/` | demo 工具栏、插入菜单、页脚选项、留痕面板等集成逻辑 |
| `components/` | demo 专用组件，例如签名面板 |
| `plugins/` | 插件示例代码 |
| `utils/` | demo 辅助函数 |
| `styles/` | demo 页面样式 |
| `assets/` | demo 图标和截图资源 |

## 边界规则

- demo 可以依赖 `src/editor/` 的公开导出。
- demo 可以使用 `src/components/` 中的共享 UI 组件。
- `src/editor/` 不应反向依赖 `src/demo/`。
- 示例插件放在这里是为了降低核心库目录噪音；正式插件应独立发布或放到专门包中。

## 位置说明

- 所属层级：本地演示层
- 上游调用：Vite app 入口
- 下游依赖：`src/editor` 公开导出、`src/components`、demo 资源

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `main.ts` | 初始化 demo 编辑器和所有工具栏交互。 |
| `mock.ts` | demo 初始文档数据。 |
| `menus/` | demo 工具栏、插入菜单、页脚和留痕面板。 |
| `plugins/` | demo 示例插件。 |
| `components/` | demo 专用组件。 |
| `assets/` / `styles/` / `utils/` | demo 图标、样式和辅助函数。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `main.ts` | demo 初始化逻辑 | 创建 `Editor` 实例并绑定菜单、监听器和插件。 | Vite demo 页面 |
| `menus/setupInsertMenus.ts` | `setupInsertMenus()` | 绑定插入图片、表格、控件、分页符等菜单。 | `main.ts` |
| `menus/setupFooterOptions.ts` | `setupFooterOptions()` | 绑定页脚选项、目录、页面设置和评论面板。 | `main.ts` |
| `menus/setupTrackChange.ts` | `setupTrackChange()` | 绑定修订留痕面板和评论连线。 | `main.ts` |
| `plugins/*/index.ts` | plugin 函数 | 演示 copy / markdown 插件扩展。 | `main.ts` |
