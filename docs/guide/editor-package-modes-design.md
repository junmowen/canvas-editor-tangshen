# 编辑器双模式设计

## 背景

当前 npm 包主要提供纯编辑器核心能力。使用方可以直接实例化 `Editor`，但菜单栏、页脚、目录、批注面板、弹窗、上传、导入导出按钮、页面缩放等外层交互需要自己参考 demo 重新实现。这个边界对深度定制项目友好，但对只想快速接入完整文档编辑体验的用户成本较高。

本设计把产品形态拆成两个稳定入口：

- 开箱即用模式：提供完整编辑器应用外壳，内置常用菜单、状态栏、面板、默认样式和默认交互。
- 纯编辑器模式：继续只暴露画布编辑核心，适合业务自行实现菜单、布局和命令编排。

## 目标

- 保持现有 `Editor` 入口兼容，不破坏已有使用方。
- 新增一个开箱即用入口，让用户最少只传容器和文档数据即可得到完整编辑体验。
- 把 demo 中已经验证过的菜单、页脚、面板和样式沉淀为可复用包能力，而不是只作为本地示例存在。
- 给菜单、面板、命令、上传、导入导出等能力定义清晰扩展点，避免用户 fork demo。
- 支持渐进式定制：从默认全量 UI 开始，按需关闭、替换或追加菜单项。

## 非目标

- 不把业务系统的文件管理、权限、协同、用户体系内置进编辑器包。
- 不在第一阶段提供所有框架适配器。框架组件可以后续基于同一套 headless service 和 UI preset 封装。
- 不改变核心文档 schema、命令系统和渲染管线。
- 不要求开箱即用模式覆盖所有 demo 调试功能；调试、实验性入口默认不进入稳定 UI。

## 用户路径

### 快速接入用户

用户希望几分钟内在页面上得到可编辑文档、工具栏、插入菜单、缩放、页面模式、搜索、打印等能力。

```ts
import { createCanvasEditorApp } from '@hufe921/canvas-editor/app'
import '@hufe921/canvas-editor/app.css'

const app = createCanvasEditorApp({
  container: document.querySelector('#editor')!,
  value: {
    main: [{ value: 'Hello World' }]
  }
})
```

### 深度定制用户

用户希望保留现有方式，只使用核心编辑器实例，通过命令和监听器接入自有 UI。

```ts
import Editor from '@hufe921/canvas-editor'

const editor = new Editor(
  document.querySelector('#editor')!,
  {
    main: [{ value: 'Hello World' }]
  },
  {}
)
```

### 渐进式定制用户

用户希望使用默认 UI，但隐藏部分菜单或替换上传、导出、保存等行为。

```ts
import { createCanvasEditorApp } from '@hufe921/canvas-editor/app'
import '@hufe921/canvas-editor/app.css'

const app = createCanvasEditorApp({
  container: document.querySelector('#editor')!,
  value,
  ui: {
    preset: 'standard',
    toolbar: {
      exclude: ['track-change', 'watermark'],
      append: [
        {
          id: 'save',
          title: '保存',
          icon: 'save',
          run: ctx => saveDocument(ctx.editor.command.getValue())
        }
      ]
    }
  },
  handlers: {
    uploadImage: async file => {
      const url = await uploadFile(file)
      return { url }
    },
    exportPdf: async ctx => {
      await exportPdfByBusiness(ctx.editor)
    }
  }
})
```

## 对外入口

### 包入口

建议保留核心默认入口，并新增 app 子路径入口。

| 入口 | 定位 | 内容 |
| --- | --- | --- |
| `@hufe921/canvas-editor` | 纯编辑器模式 | `Editor`、命令、类型、枚举、核心样式 |
| `@hufe921/canvas-editor/app` | 开箱即用模式 | `createCanvasEditorApp()`、UI 配置类型、preset 类型 |
| `@hufe921/canvas-editor/app.css` | 开箱即用样式 | 工具栏、面板、弹窗、页脚、布局样式 |
| `@hufe921/canvas-editor/headless` | 可选后续入口 | 菜单模型、状态同步、命令适配，不带 DOM UI |

第一阶段可以只实现 `app` 和 `app.css`。`headless` 入口适合后续给 React、Vue 或自研 UI 复用。

### createCanvasEditorApp

```ts
interface CreateCanvasEditorAppOptions {
  container: HTMLElement
  value: IEditorData | IElement[]
  editor?: IEditorOption
  ui?: CanvasEditorAppUIOptions
  handlers?: CanvasEditorAppHandlers
  locale?: string
}

interface CanvasEditorApp {
  editor: Editor
  container: HTMLElement
  setValue(value: IEditorData | IElement[]): void
  getValue(): IEditorData
  updateOptions(options: Partial<CreateCanvasEditorAppOptions>): void
  register(options: CanvasEditorAppRegisterOptions): void
  on(listeners: Partial<Editor['listener']>): () => void
  destroy(): void
}
```

这里的 `editor` 只透传给核心 `Editor`，不把 UI 配置混入核心配置。这样可以保证核心层继续纯净，开箱即用层承担应用外壳。

## UI preset

### 预设分层

| preset | 适用场景 | 默认能力 |
| --- | --- | --- |
| `minimal` | 轻量编辑 | 撤销重做、字体、字号、基础富文本、对齐、列表、缩放 |
| `standard` | 默认推荐 | `minimal` + 插入表格、图片、链接、分页符、搜索、打印、页面模式 |
| `document` | 类文档处理 | `standard` + 页眉页脚、页码、水印、目录、批注、修订 |
| `form` | 表单填报 | `standard` + 控件、只读/表单/设计模式、控件面板 |

默认值建议为 `standard`，避免首次接入出现过多复杂入口，也避免过于简陋。

### 菜单模型

菜单不应直接绑定 DOM class，而应先抽象成声明式模型，再由默认 UI 渲染。

```ts
interface ToolbarItem {
  id: string
  type: 'button' | 'select' | 'color' | 'divider' | 'group' | 'dropdown'
  title?: string
  icon?: string
  children?: ToolbarItem[]
  when?: (ctx: CanvasEditorAppContext) => boolean
  active?: (ctx: CanvasEditorAppContext) => boolean
  disabled?: (ctx: CanvasEditorAppContext) => boolean
  run?: (ctx: CanvasEditorAppContext, payload?: unknown) => void | Promise<void>
}
```

默认菜单通过命令系统调用核心能力。使用方可以通过 `include`、`exclude`、`replace`、`append` 调整菜单，不需要复制整套菜单实现。

```ts
interface ToolbarPatch {
  include?: string[]
  exclude?: string[]
  replace?: Record<string, ToolbarItem>
  append?: ToolbarItem[]
}
```

### 默认 UI 区域

| 区域 | 是否默认启用 | 说明 |
| --- | --- | --- |
| 顶部工具栏 | 是 | 富文本、插入、页面、审阅等入口 |
| 编辑画布 | 是 | 核心 `Editor` 容器 |
| 页脚状态栏 | 是 | 页码、页面模式、缩放、编辑模式 |
| 目录侧栏 | 否 | 有标题目录时可开启 |
| 批注侧栏 | 否 | 开启批注或修订时显示 |
| 搜索替换浮层 | 按需 | 点击搜索后挂载 |
| 通用弹窗 | 按需 | 超链接、表格、控件、水印、页面设置等 |

## 目录结构建议

第一阶段可以把 demo 中稳定能力迁移到 `src/app/`，避免核心反向依赖 demo。

```txt
src/
  editor/               # 现有纯编辑器核心
  app/
    index.ts            # createCanvasEditorApp 入口
    CanvasEditorApp.ts  # 应用外壳生命周期
    context.ts          # app 上下文和依赖注入
    presets/            # minimal / standard / document / form
    toolbar/            # 菜单模型、默认菜单、状态同步
    panels/             # 目录、批注、修订、设置面板
    dialogs/            # 链接、图片、表格、水印等弹窗
    footer/             # 页脚状态栏
    styles/             # app.css 源文件
    assets/             # app 级图标
  demo/                 # 只保留演示和本地调试，不再作为稳定 API 来源
```

边界规则：

- `src/app/` 可以依赖 `src/editor/` 的公开导出。
- `src/editor/` 不依赖 `src/app/` 或 `src/demo/`。
- `src/demo/` 可以使用 `src/app/` 作为官方开箱即用示例。
- 稳定菜单能力从 `src/demo/menus` 迁移到 `src/app/toolbar` 或 `src/app/dialogs`。

## 配置设计

```ts
interface CanvasEditorAppUIOptions {
  preset?: 'minimal' | 'standard' | 'document' | 'form'
  layout?: {
    toolbar?: boolean
    footer?: boolean
    catalog?: boolean
    comment?: boolean
    trackChange?: boolean
  }
  toolbar?: ToolbarPatch
  footer?: FooterPatch
  contextMenu?: {
    mode?: 'default' | 'custom' | 'none'
    disableKeys?: string[]
    menus?: IRegisterContextMenu[]
  }
  theme?: {
    className?: string
    density?: 'compact' | 'normal'
  }
}

interface FooterPatch {
  include?: string[]
  exclude?: string[]
  replace?: Record<string, FooterItem>
  append?: FooterItem[]
}

interface FooterItem {
  id: string
  align?: 'left' | 'center' | 'right'
  title?: string
  label?: string | number | ((ctx: CanvasEditorAppContext) => string | number)
  className?: string
  when?: (ctx: CanvasEditorAppContext) => boolean
  disabled?: (ctx: CanvasEditorAppContext) => boolean
  render?: (ctx: CanvasEditorAppContext) => HTMLElement
  run?: (ctx: CanvasEditorAppContext) => void | Promise<void>
}

interface CanvasEditorAppHandlers {
  uploadImage?: (file: File, ctx: CanvasEditorAppContext) => Promise<{ url: string }>
  openImage?: (src: string, ctx: CanvasEditorAppContext) => void
  exportPdf?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  exportDocx?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  print?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  save?: (ctx: CanvasEditorAppContext) => void | Promise<void>
  onError?: (error: unknown, ctx: CanvasEditorAppContext) => void
}

interface CreateCanvasEditorAppOptions {
  listeners?: Partial<Editor['listener']>
  register?: {
    contextMenus?: IRegisterContextMenu[]
    shortcuts?: IRegisterShortcut[]
    setup?: (ctx: CanvasEditorAppContext) => void | (() => void)
  }
}
```

配置原则：

- `editor` 字段只传核心配置。
- `ui` 字段只影响外层 UI，不改变文档数据。
- `handlers` 用于接入业务副作用，例如上传、保存、导出。
- `toolbar.include` 和 `footer.include` 表示只显示列出的项，没配置的项不显示；`exclude` 表示在默认项中排除。
- `toolbar.replace/append` 和 `footer.replace/append` 用于替换或追加业务入口，不需要复制默认 DOM。
- `ui.contextMenu.mode = 'custom'` 表示隐藏内置右键菜单，只显示配置或注册的菜单；`none` 表示不显示 app 层右键菜单。
- `listeners` 会在 app 内部状态同步后继续触发，业务不需要覆盖 app 自己的监听器。
- `register` 用于声明式注册右键菜单、快捷键或一次性接入自定义初始化逻辑，也可以通过实例方法 `app.register()` 在运行时追加。
- `app.on()` 用于运行时追加监听器，返回函数可取消本次追加的监听器。
- 未提供 handler 时，默认 UI 应禁用对应按钮或使用浏览器本地能力，不能静默失败。

## 生命周期

`createCanvasEditorApp()` 内部按以下顺序执行：

1. 创建 app 根 DOM 和布局区域。
2. 创建核心 `Editor` 实例。
3. 根据 preset 生成菜单模型。
4. 绑定菜单状态同步、listener、eventbus 和快捷入口。
5. 挂载面板、页脚和按需弹窗。
6. 返回 `CanvasEditorApp` 实例。

`destroy()` 必须释放：

- 核心 `Editor` 实例资源。
- app 创建的 DOM。
- 所有事件监听器。
- 弹窗、面板和异步任务引用。

## 与现有 demo 的关系

现有 demo 是实现来源，不应继续作为使用方复制粘贴的唯一参考。迁移策略：

| demo 能力 | 新归属 |
| --- | --- |
| 基础工具栏按钮 | `src/app/toolbar` |
| 插入菜单和弹窗 | `src/app/toolbar` + `src/app/dialogs` |
| 页脚页面模式、缩放、编辑模式 | `src/app/footer` |
| 目录、批注、修订面板 | `src/app/panels` |
| demo mock 数据 | 继续留在 `src/demo/mock.ts` |
| 实验性调试入口 | 继续留在 `src/demo/` |

demo 后续应改为：

```ts
import { createCanvasEditorApp } from '../app'

createCanvasEditorApp({
  container: document.querySelector('#app')!,
  value: mockData,
  ui: {
    preset: 'document',
    layout: {
      catalog: true,
      comment: true,
      trackChange: true
    }
  }
})
```

## 样式与主题

开箱即用样式通过独立 CSS 导入，避免影响纯编辑器模式。

```ts
import '@hufe921/canvas-editor/app.css'
```

样式约束：

- app 层 class 使用统一前缀，例如 `.ce-app`、`.ce-toolbar`、`.ce-footer`。
- 核心编辑器已有样式继续由核心入口负责。
- 业务主题通过 `ui.theme.className` 挂到 app 根节点。
- 不把 demo 页面级布局样式泄漏到 app 样式里。

## 兼容与迁移

### 已有用户

已有代码无需修改：

```ts
import Editor from '@hufe921/canvas-editor'
```

### 新用户

文档首页推荐开箱即用入口：

```ts
import { createCanvasEditorApp } from '@hufe921/canvas-editor/app'
import '@hufe921/canvas-editor/app.css'
```

### 从复制 demo 迁移

如果用户已经复制了 demo 菜单，迁移路径是：

1. 用 `createCanvasEditorApp()` 替代自建 DOM 菜单。
2. 把已有上传、保存、导出逻辑迁移到 `handlers`。
3. 把自定义按钮迁移到 `ui.toolbar.append` 或 `replace`。
4. 如果仍需要完全自定义 UI，保留 `Editor` 纯编辑器模式。

## 实施阶段

### 阶段一：稳定 app 外壳

- 新增 `src/app` 目录和 `createCanvasEditorApp()`。
- 提供 `standard` preset。
- 沉淀基础工具栏、插入图片、插入表格、搜索、打印、页面缩放和页脚状态栏。
- 提供 `canvas-editor-app.css` 构建产物，并通过 `@hufe921/canvas-editor/app.css` 暴露。
- demo 改用 app 入口验证。

### 阶段二：高级文档能力

- 增加 `minimal`、`document`、`form` preset。
- 迁移目录、批注、修订、水印、页眉页脚、控件相关 UI。
- 完善 toolbar patch、handler、状态同步和错误处理。
- 补充 Cypress 覆盖主要菜单路径。

### 阶段三：框架封装

- 抽出 headless 菜单模型和状态服务。
- 提供 Vue / React 包装组件或示例。
- 增加主题变量和更细粒度插槽。

## 验收标准

- 纯编辑器模式原有导入方式、类型和行为保持兼容。
- 使用开箱即用模式时，用户只传 `container` 和 `value` 即可完成编辑器初始化。
- 默认 `standard` preset 至少覆盖基础富文本、插入表格、插入图片、搜索、打印、缩放、页面模式。
- 用户可以通过配置隐藏默认菜单项、追加自定义菜单项、替换上传和导出行为。
- `src/editor/` 不新增对 `src/app/` 或 `src/demo/` 的依赖。
- `npm run type:check`、`npm run lint`、`npm run architecture:check` 通过。
- 新增或迁移菜单路径有 Cypress smoke 测试覆盖。
