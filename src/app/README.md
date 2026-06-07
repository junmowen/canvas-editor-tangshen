# App 入口目录说明

`src/app/` 是开箱即用编辑器外壳目录，基于 `src/editor/` 的公开 API 组合工具栏、页脚、样式和生命周期。

## 边界规则

- `src/app/` 可以依赖 `src/editor/` 的公开导出。
- `src/editor/` 不应依赖 `src/app/`。
- demo 或业务可以通过 `createCanvasEditorApp()` 使用默认 UI，也可以继续直接使用纯 `Editor`。
- 业务副作用通过 `handlers` 注入，例如上传、保存、打印和导出。
- 顶部菜单、底部状态栏、右键菜单、事件监听和注册入口都从 `CreateCanvasEditorAppOptions` 配置进入。
- `toolbar.include` / `footer.include` 是白名单语义：配置了才显示，未配置的不显示；`exclude` 用于从默认 UI 中删减。
- `toolbar.replace/append` 和 `footer.replace/append` 用于替换或追加业务入口。
- `listeners` 会在 app 内部状态同步后被转发，避免业务监听器覆盖 app 自身状态维护。
- `register` 用于注册右键菜单、快捷键或一次性初始化逻辑，也可以通过实例方法 `app.register()` 运行时追加。
- `app.on()` 用于运行时追加事件监听器，并返回取消监听函数。

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `index.ts` | app 子路径入口，导出 `createCanvasEditorApp()` 和相关类型。 |
| `CanvasEditorApp.ts` | app 外壳生命周期、DOM 布局、核心编辑器实例和 footer 状态。 |
| `toolbar.ts` | 默认 preset、声明式菜单项和内置菜单行为。 |
| `types.ts` | app 对外类型。 |
| `styles/app.css` | 开箱即用模式样式。 |
