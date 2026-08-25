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
- 目录、批注和留痕审阅面板属于开箱即用 UI，由 app 内部维护；留痕作者通过 `handlers.getTrackChangeAuthor` 注入，批注数据源、创建和删除通过 `handlers.getComments` / `handlers.createComment` / `handlers.deleteComment` 注入。
- 标准预设内建富文本、格式刷、表格、图片、公式、图表图形、控件、日期、内容块、搜索替换、水印、页分栏、段落缩进和制表位等入口；公式支持右键编辑已有内容。
- 页脚内建目录导航、编辑模式、页面模式、纸张、页边距、页码、缩放和编辑器配置；`Ctrl/Cmd+P`、`Ctrl/Cmd+F`、`Ctrl+-`、`Ctrl+=`、`Ctrl+0` 可直接使用。
- 工具栏按钮可以同时声明 `run` 和 `runDblclick`，用于格式刷这类单击与双击语义不同的命令。
- 保存、打印、图片上传、PDF/DOCX 导出均可通过 `handlers` 覆盖；未覆盖打印和导出时使用编辑器默认实现，异步失败统一交给 `handlers.onError`。

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `index.ts` | app 子路径入口，导出 `createCanvasEditorApp()` 和相关类型。 |
| `CanvasEditorApp.ts` | app 外壳生命周期、DOM 布局、核心编辑器实例和 footer 状态。 |
| `reviewPanels.ts` | 内建目录、批注和留痕审阅面板及连线。 |
| `toolbar.ts` | 默认 preset、声明式菜单项和内置菜单行为。 |
| `types.ts` | app 对外类型。 |
| `styles/app.css` | 开箱即用模式样式。 |

## 最小接入

```ts
import { createCanvasEditorApp } from '@hufe921/canvas-editor/app'
import '@hufe921/canvas-editor/app.css'

const app = createCanvasEditorApp({
  container: document.querySelector('#app')!,
  value: {
    main: [{ value: '开箱即用编辑器' }]
  },
  ui: {
    preset: 'standard'
  },
  handlers: {
    save: ctx => {
      console.log(ctx.editor.command.getValue())
    },
    uploadImage: async file => {
      return {
        url: URL.createObjectURL(file)
      }
    }
  }
})

console.log(app.editor)
```

## 标准预设能力

`preset: 'standard'` 默认包含：

- 基础编辑：撤销、重做、格式刷、清除格式、格式标记、字体、字号、加粗、斜体、下划线、删除线、上下标、颜色、高亮。
- 段落版式：标题、对齐、分散对齐、行间距、分栏、制表位、段落缩进、列表。
- 插入能力：表格、图片、图表图形、超链接、分隔符、水印、代码块、分页符、控件、复选框、单选框、公式、日期、内容块。
- 文档能力：搜索替换、打印、DOCX、PDF、保存。
- 审阅能力：留痕开关、留痕面板、接受/拒绝修订、右键批注、批注卡片、批注连线、目录。
- 页脚能力：目录、页面模式、可见页码、页码、纸张尺寸、纸张方向、页边距、页码范围、全屏、编辑器配置、编辑模式、缩放。

## 业务注入点

常用 `handlers`：

- `save`：覆盖保存。
- `uploadImage`：覆盖图片上传，返回 `{ url, width?, height? }`。
- `print`：覆盖打印；未传时使用 `editor.command.executePrint()`。
- `exportPdf` / `exportDocx`：覆盖导出；未传时使用内置下载。
- `getComments` / `createComment` / `deleteComment`：接入业务批注数据。
- `getTrackChangeAuthor`：接入当前修订作者。
- `onError`：集中处理上传、导出、异步菜单等错误。

UI 可通过 `ui.toolbar`、`ui.footer`、`ui.contextMenu` 增删替换；运行时可通过 `app.updateOptions()`、`app.register()`、`app.on()` 继续追加。

## 响应式边界

开箱即用 UI 内建 900px、600px 和 360px 三档响应式约束：

- 工具栏和页脚在窄屏下内部横向滚动，不扩大页面宽度。
- 表格、公式、搜索、分栏、缩进、制表位等浮层限制在视口内。
- 手机宽度下通用弹窗改为单列表单，输入框和按钮不越界。
- 批注和留痕卡片在手机宽度下收敛到视口内；平板和桌面保留右侧连线。
- 临时工具浮层互斥，打开新工具或目录前会关闭旧浮层，避免移动端叠层遮挡。

## 发布产物

发布入口由 `package.json` 暴露：

- `@hufe921/canvas-editor/app` -> `dist/canvas-editor-app.es.js`
- `@hufe921/canvas-editor/app.css` -> `dist/canvas-editor-app.css`

发布前至少执行：

```bash
npm run type:check
npx eslint src/app cypress/e2e/smoke/app-mode.cy.ts
npx cypress run --spec cypress/e2e/smoke/app-mode.cy.ts --config trashAssetsBeforeRuns=false
npx cypress run --spec cypress/e2e/issues/issue-track-change-fast-delete.cy.ts --config trashAssetsBeforeRuns=false
vite build --mode lib-app
```

## 与旧 demo 的边界

`index.html` 中的静态 DOM 菜单已经迁移为 `toolbar.ts` 和 `CanvasEditorApp.ts` 的声明式配置。旧 demo 的展开式表格面板、搜索面板和公式菜单在 app 中改为可复用浮层；这属于交互形态升级，不再按 `index.html` 原 DOM 挂载。业务演示数据、医院模板、示例批注弹窗和 PDF 字体仍保留在 `src/demo/`，不进入 `src/app/`。
