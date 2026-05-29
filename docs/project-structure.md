# 项目目录结构梳理

本文档用于快速理解当前仓库的目录分层、核心模块职责，以及后续整理目录时可以遵循的边界。

## 项目定位

当前项目是一个基于 Vite + TypeScript 的 `canvas-editor` 富文本编辑器项目。

- 库入口：`src/editor/index.ts`
- 本地演示入口：`src/demo/main.ts`
- 应用构建入口：`vite.config.ts` 的默认模式
- 库构建入口：`vite.config.ts` 的 `lib` 模式，入口为 `src/editor/index.ts`
- 文档系统：`docs/`，使用 VitePress
- 端到端测试：`cypress/`

## 顶层目录

```txt
.
├── .github/                 # GitHub 工作流或仓库协作配置，入口见 .github/README.md
├── .vscode/                 # VS Code 推荐配置
├── cypress/                 # Cypress 端到端测试，入口见 cypress/README.md
├── dist/                    # 构建产物，不建议手工维护
├── docs/                    # VitePress 文档与架构记录，入口见 docs/README.md
├── node_modules/            # 依赖安装目录，不进入源码梳理
├── scripts/                 # 发布、编码检查、issue 校验、架构约束脚本，入口见 scripts/README.md
├── src/                     # 源码主目录，核心库和 demo 已分层，入口见 src/README.md
├── tmp/                     # 临时文件目录，建议只放短期调试产物
├── index.html               # 本地 demo 页面入口
├── package.json             # npm 脚本、依赖、发布信息
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite app/lib 双模式构建配置
├── cypress.config.ts        # Cypress 配置
├── README.md                # 项目说明
├── CHANGELOG.md             # 版本变更记录
└── favicon.png              # demo 和文档共用图标
```

## 源码目录

`src/` 当前按核心库、共享 UI 组件和本地 demo 分层。`src/editor/` 是 npm 包主体，`src/demo/` 是本地演示页及示例插件。

```txt
src/
├── README.md                # src 分层总览
├── editor/                  # 编辑器核心库，对外 npm 包的主体
├── components/              # 核心和 demo 共用的轻量 UI 组件
├── demo/                    # 本地 demo、demo 组件、示例插件和 demo 资源
└── vite-env.d.ts            # Vite 类型声明
```

源码边界可直接查看：

- `src/editor/README.md`
- `src/editor/core/README.md`
- `src/editor/core/draw/README.md`
- `src/editor/core/event/README.md`
- `src/editor/core/modules/table/README.md`
- `src/editor/core/render-backend/README.md`
- `src/editor/interface/README.md`
- `src/editor/dataset/README.md`
- `src/editor/assets/README.md`
- `src/editor/utils/README.md`
- `src/editor/types/README.md`
- `src/components/README.md`
- `src/demo/README.md`

### `src/editor/`

这是最重要的目录，承载编辑器核心能力，也是库模式构建时的入口范围。

```txt
src/editor/
├── index.ts                 # 对外默认导出 Editor，并集中导出命令、枚举、类型、工具
├── core/                    # 编辑器运行时核心
├── interface/               # 对外和内部共用 TypeScript 接口
├── dataset/                 # 枚举、常量、默认数据
├── assets/                  # 编辑器核心样式和图标资源
├── utils/                   # 编辑器核心工具函数
└── types/                   # 补充类型声明
```

## 核心模块职责

### `src/editor/core/`

`core` 是当前体量最大的目录，建议按职责理解，而不是按文件数量阅读。

```txt
src/editor/core/
├── modules/                 # 表格、控件、页眉页脚、页面设置、背景、签章、块级嵌入、图片、内联、列表、富文本装饰、页码、搜索、分组等业务模块
├── command/                 # 对外命令层：格式、插入、查询、表格、搜索等命令适配
├── draw/                    # 布局、分页、绘制、光标、粒子、运行时服务
├── event/                   # 鼠标、键盘、输入、剪贴板、拖拽、EventBus
├── extension/               # 插件、注册、快捷键、i18n、override 等扩展入口
├── range/                   # 选区状态、选区查询、选区编辑
├── render-backend/          # Canvas 池、多渲染引擎、Worker 渲染协议与调度
├── runtime/                 # 右键菜单、执行器、后台任务、光标、历史、observer、zone 等运行期门面
├── shared/                  # core 内跨公共基础设施和业务模块复用的无状态 helper
└── position/                # 坐标、位置计算
```

### `src/editor/core/draw/`

`draw` 是编辑器实际运行的核心，负责把文档数据变成分页布局和可交互画布。

```txt
draw/
├── Draw.ts                  # Draw 主类
├── runtime/                 # 生命周期、组件注册、服务注册、绘制运行时
├── data/                    # 文档数据访问、对象解析、异步插入、导出
├── layout/                  # 行布局、分页、chunk 布局、表格布局
├── render/                  # 页面渲染管线、行渲染、位图缓存、输入预览
├── particle/                # 通用文本、换行等基础粒子绘制
├── coordinate/              # Draw 层坐标服务
├── cursor/                  # Draw 层光标服务
├── track-change/            # 留痕服务
├── query/                   # Draw 状态查询
├── state/                   # 视图状态
├── history/                 # Draw 与历史记录桥接
├── export/                  # 导出状态服务
└── dom/                     # DOM 宿主相关逻辑
```

### `src/editor/core/event/`

`event` 负责把浏览器事件转换为编辑器意图和命令。

```txt
event/
├── CanvasEvent.ts           # 画布事件入口
├── EditorInputController.ts # 编辑器输入控制
├── EditorClipboardController.ts
├── KeyboardController.ts
├── GlobalEvent.ts
├── handlers/                # click、mousedown、copy、paste、wheel 等事件处理
├── keyboard/                # 键盘意图、删除、回车、导航、Tab 等
├── pointer/                 # 指针会话、拖拽、选择、控件、表格命中意图
├── clipboard/               # HTML、纯文本、图片粘贴
├── input/                   # 输入缓冲、快速输入、增量渲染调度
├── eventbus/                # EventBus 实现
└── debug/                   # 事件调试日志
```

### `src/editor/core/modules/control/`

`control` 负责控件业务能力，承接从 event 触发后的状态切换、导航、运行实现、渲染和数据读写。

```txt
control/
├── command/                 # 控件命令定位规则
├── hittest/                 # 控件参与位置命中、直接命中和控件结构识别
├── interaction/             # 复选框、单选框和值联动控件交互处理
├── layout/                  # 控件参与行内布局的尺寸测量
├── navigation/              # 表单模式下控件之间的键盘导航和边界切换
├── policy/                  # 拖拽、删除、输入等控件业务规则
├── render/                  # 控件行内边框、选中和页级高亮渲染
├── runtime/                 # 控件管理器、具体控件实现、生命周期、值读写和高亮渲染
└── selection/               # 控件参与选区、光标落点和禁用态命中规则
```

### `src/editor/core/modules/group/`

`group` 负责批注组 / 分组相关的范围计算、分组标记维护和高亮渲染。

```txt
group/
├── render/                  # 行级分组高亮 fill rect 记录和 flush
└── runtime/                 # Group 运行对象和 fill rect 缓存
```

### `src/editor/core/modules/search/`

`search` 负责查找、替换、搜索命中列表、跳转和搜索高亮渲染。

```txt
search/
├── range/                   # 搜索命中转换为 range 的查询策略
├── render/                  # 搜索高亮参与页面绘制的编排
└── runtime/                 # Search 运行对象、命中缓存和渲染页追踪
```

### `src/editor/core/modules/page-setup/`

`page-setup` 负责页面设置相关运行对象，包括页面模式、缩放、纸张尺寸、页边距指示器、页面边框和页眉/页脚边框边界计算。

```txt
page-setup/
└── runtime/                 # 页面模式、缩放、纸张尺寸、页边距指示器、页面边框和边界计算
```

### `src/editor/core/render-backend/`

`render-backend` 是近期架构演进较多的区域，主要围绕 Canvas 池、多渲染引擎和 Worker 化渲染。

```txt
render-backend/
├── RenderBackendManager.ts  # 渲染后端调度管理
├── RenderSurfaceManager.ts  # 渲染 surface 管理
├── CanvasPool.ts            # Canvas 复用池
├── BitmapCache.ts           # 位图缓存
├── RenderBackendDebugPanel.ts
├── engines/                 # Canvas2D、OffscreenCanvas、Overlay2D、SVG DOM、WebGL 引擎
├── types/                   # 渲染任务、图层、surface、后端类型
└── worker/                  # Worker 协议、调度、快照构建、离屏渲染
```

### `src/editor/core/modules/table/`

表格能力横跨 `draw`、`event`、`command` 和 `render-backend`，但通用表格服务集中在这里。

```txt
table/
├── contextmenu/             # 表格专属右键菜单
├── hittest/                 # 表格命中测试
├── interaction/             # 表格工具条等交互副作用
├── layout/                  # 表格布局快照、访问器和布局引擎
├── navigation/              # 表格内横向、纵向、退格等导航
├── particle/                # 表格绘制、工具条和结构操作
├── position/                # 表格上下文 positionList 解析和单元格内部 position 计算
├── render/                  # 表格覆盖层、失效管理和渲染特例 helper
├── selection/               # 表格选择类型、起始状态和公开选区投影
├── target/                  # 表格上下文、目标和快照切片解析
├── track-change/            # 表格参与修订留痕的递归和分页片段策略
└── utils/                   # 表格通用工具
```

### `src/editor/core/shared/`

core 内跨公共基础设施和业务模块复用的无状态 helper。

```txt
shared/
├── traversal/
│   └── ElementTreeTraversal.ts  # 通用元素树 walk/find 和表格上下文转换
└── utils/
    └── editorState.ts           # core 内编辑状态 helper
```

### `src/editor/core/range/`

选区状态、选区查询、编辑边界、选区起点和拖选范围解析。

```txt
range/
├── selection/               # 选区起点、拖选范围、文本命中范围和表格拖选范围解析
├── utils/                   # range 内部辅助
├── RangeManager.ts
├── RangeManagerBase.ts
├── RangeManagerEdit.ts
├── RangeManagerQuery.ts
└── RangeManagerState.ts
```

## 类型、枚举和常量

```txt
src/editor/interface/        # IEditorOption、IElement、Command、Listener、Table 等接口
src/editor/dataset/enum/     # Editor、Element、Control、Row、List、Table 等枚举
src/editor/dataset/constant/ # 默认常量、正则、菜单 key、页面配置等
```

建议规则：

- 对外暴露的类型优先放在 `interface/`，并从 `src/editor/index.ts` 导出。
- 业务分支判断使用 `dataset/enum/` 中的枚举，避免散落字符串。
- 默认值、固定 key、正则等放在 `dataset/constant/`。

## Demo 相关目录

`src/demo/` 是本地演示页，不属于核心 npm 包的主体。

```txt
src/demo/
├── main.ts                  # 初始化 demo 编辑器、绑定工具栏、监听器和右键菜单
├── mock.ts                  # demo 数据
├── menus/
│   ├── setupInsertMenus.ts  # 插入菜单
│   ├── setupTrackChange.ts  # 留痕/批注面板
│   ├── setupFooterOptions.ts # 页脚、页面模式、目录、批注更新
│   └── dialogValue.ts       # 弹窗数据处理
├── components/
│   └── signature/           # demo 签名组件
├── plugins/
│   ├── copy/                # 插件示例：重写复制命令
│   └── markdown/            # 插件示例：增加 markdown 插入命令
├── utils/                   # demo 辅助函数
├── assets/                  # demo 图标和快照资源
└── styles/                  # demo 页面样式
```

`index.html` 通过 `/src/demo/main.ts` 启动本地 demo。库模式构建仍然只使用 `src/editor/index.ts`。

`src/components/dialog/` 是共享弹窗组件，当前同时被 demo 菜单和核心表格右键菜单使用，因此没有放入 `src/demo/components/`。

## 已归档的手工测试文件

```txt
cypress/fixtures/manual/
├── pagecanvashost_dump.txt
├── test-table-pagination.html
└── test-table-position.html
```

这些文件原来位于仓库根目录，现在归入 Cypress fixtures 下的手工测试资料目录，避免和正式入口文件混在一起。

## 文档目录

```txt
docs/
├── index.md                 # VitePress 首页
├── .vitepress/config.ts     # 文档站点配置
├── guide/                   # 中文指南、架构方案、迁移记录，入口见 guide/index.md
├── en/                      # 英文文档
├── issue-regression/        # issue 回归管理、问题记录和测试数据
├── encoding-rules.md        # 编码、换行和注释规范
└── public/                  # 文档静态资源
```

当前 `docs/guide/` 中存在大量阶段性方案和进度记录，主要集中在 Canvas 池、多引擎渲染后端、表格、性能和 issue 回归方面。`docs/guide/index.md` 已提供按主题归类的入口，`docs/guide/architecture/index.md` 是架构与性能专题入口，`docs/guide/render-backend/index.md` 是渲染后端专题入口，`docs/guide/table/index.md` 是表格与分页专题入口，`docs/guide/issues/index.md` 是上游 issue 推进入口。

## 测试目录

```txt
cypress/
├── README.md                # Cypress 总览
├── e2e/
│   ├── README.md            # e2e 目录职责和命名规则
│   ├── smoke/               # 基础编辑器烟测
│   ├── menus/               # 工具栏菜单行为
│   ├── control/             # 控件行为
│   ├── issues/              # issue 回归用例，入口见 issues/README.md
│   ├── render-backend/      # 渲染后端专项用例
│   ├── table/               # 表格、分页、选择和边框专项
│   ├── performance/         # 性能压测
│   └── utils/               # 测试辅助
├── fixtures/                # 测试资源，入口见 fixtures/README.md
├── support/                 # Cypress 支持文件
└── tsconfig.json            # Cypress TypeScript 配置
```

## 脚本目录

```txt
scripts/
├── README.md                # 脚本职责和维护规则
├── release.js               # 发布脚本
├── verify-utf8.js           # 编码检查
├── verify-architecture.js   # 架构约束检查
├── verifyCommit.js          # commit message 检查
├── verifyIssues.js          # issue 回归检查
├── issueSpecs.part*.js      # issue 用例拆分数据
└── ...
```

`verify-architecture.js` 当前约束了几个关键边界：

- 坐标体系应通过 `CoordinateService` 访问。
- 对象列表和对象数据应通过 resolver 访问。
- 命令层不应直接消费原始正文列表。
- 表格快照访问应收口在 `TargetResolver` 后面。
- 通用表格遍历应放在 `table/utils`。
- demo 专用代码应保留在 `src/demo/`，核心库和共享组件不应反向导入 demo。
- 旧的 demo 根路径（如 `src/main.ts`、`src/assets/`、`src/plugins/`、`src/style*.css`）不应重新出现。
- Cypress 用例和 fixture 应保留在已归类目录中，例如 `cypress/e2e/smoke/`、`cypress/fixtures/images/`、`cypress/fixtures/examples/`。
- Cypress spec 应访问 `http://localhost:3000/canvas-editor/index.html`，避免使用会返回 404 的 `/canvas-editor/`。
- 主要目录必须保留 README 或 `index.md` 入口，避免后续目录结构再次失去导航。
- `src/editor/core/` 每个一级子目录必须保留 `README.md`。

这些规则可以作为后续整理目录时的硬边界参考。

## 常见查找路径

| 想找的内容 | 优先查看 |
| --- | --- |
| 对外 API 和导出 | `src/editor/index.ts` |
| 编辑器初始化流程 | `src/editor/index.ts`、`src/editor/core/draw/Draw.ts` |
| demo 工具栏行为 | `src/demo/main.ts`、`src/demo/menus/` |
| 命令实现 | `src/editor/core/command/` |
| 元素树遍历 | `src/editor/core/shared/traversal/` |
| 选区起点/拖选范围/行选区渲染 | `src/editor/core/range/selection/` |
| position 查询辅助 | `src/editor/core/position/utils/` |
| 段落格式标记渲染 | `src/editor/core/modules/paragraph/render/` |
| 布局和分页 | `src/editor/core/draw/layout/` |
| 业务元素行内测量 | `src/editor/core/modules/*/layout/` |
| 页面绘制 | `src/editor/core/draw/render/` |
| 通用元素绘制 | `src/editor/core/draw/particle/` |
| 业务元素绘制 | `src/editor/core/modules/*/particle/` |
| 控件业务/实现 | `src/editor/core/modules/control/`、`src/editor/core/modules/control/runtime/` |
| 搜索/分组运行对象 | `src/editor/core/modules/search/runtime/`、`src/editor/core/modules/group/runtime/` |
| 水印运行对象 | `src/editor/core/modules/watermark/runtime/` |
| 富文本装饰运行/绘制对象 | `src/editor/core/modules/richtext/runtime/`、`src/editor/core/modules/richtext/particle/`、`src/editor/core/modules/richtext/render/` |
| 控件业务渲染 | `src/editor/core/modules/control/render/` |
| 图片业务渲染 | `src/editor/core/modules/image/render/` |
| 内联业务渲染 | `src/editor/core/modules/inline/render/` |
| 分隔符/分页符渲染 | `src/editor/core/modules/separator/render/`、`src/editor/core/modules/page-break/render/` |
| 列表行头渲染 | `src/editor/core/modules/list/render/` |
| 页级业务渲染 | `src/editor/core/modules/background/render/`、`src/editor/core/modules/area/render/`、`src/editor/core/modules/control/render/`、`src/editor/core/modules/search/render/`、`src/editor/core/modules/placeholder/render/` |
| 页码/行号运行对象与快照策略 | `src/editor/core/modules/page-number/runtime/`、`src/editor/core/modules/page-number/render/`、`src/editor/core/modules/line-number/runtime/` |
| 页面设置运行对象 | `src/editor/core/modules/page-setup/runtime/` |
| 背景/签章/占位运行对象 | `src/editor/core/modules/background/runtime/`、`src/editor/core/modules/badge/runtime/`、`src/editor/core/modules/placeholder/runtime/` |
| 页眉/页脚运行对象 | `src/editor/core/modules/header/runtime/`、`src/editor/core/modules/footer/runtime/` |
| 鼠标/键盘/粘贴 | `src/editor/core/event/` |
| 表格逻辑 | `src/editor/core/modules/table/`、`src/editor/core/modules/table/layout/engine/`、`src/editor/core/modules/table/track-change/` |
| worker 快照业务策略 | `src/editor/core/modules/image/render/`、`src/editor/core/modules/richtext/render/`、`src/editor/core/modules/list/render/`、`src/editor/core/modules/page-number/render/` |
| 渲染后端 | `src/editor/core/render-backend/` |
| 类型定义 | `src/editor/interface/` |
| 枚举和常量 | `src/editor/dataset/` |
| 文档站配置 | `docs/.vitepress/config.ts` |
| Cypress 用例 | `cypress/e2e/` |
| Issue 回归用例索引 | `cypress/e2e/issues/README.md` |

## 当前混乱点

1. `src/demo/` 已从 `src/editor/` 中分离出来；阅读时可以先判断是在看核心库还是本地 demo。
2. `src/editor/core/draw/` 体量很大，布局、渲染、控件、粒子、运行时、数据访问都在同一层级，需要靠子目录职责区分。
3. 表格能力仍横跨 `command`、`event/pointer`、`table`、`render-backend`，但表格布局引擎已收敛到 `src/editor/core/modules/table/layout/engine/`，表格绘制和操作已收敛到 `src/editor/core/modules/table/particle/`，表格覆盖层、渲染失效、表格元素行级渲染和渲染特例 helper 已收敛到 `src/editor/core/modules/table/render/`，块级嵌入、列表、超链接、日期、分页符、分隔符、上下标等业务粒子已收敛到各自 `modules/*/particle/`，图片、LaTeX、控件、block、Tab、分隔符、分页符和上下标行内测量已收敛到各自 `modules/*/layout/`，block 行级调度、运行态 host 生命周期和导出态回退已收敛到 `src/editor/core/modules/block/render/`，控件行内绘制分发、边框和页级高亮已收敛到 `src/editor/core/modules/control/render/`，图片正文行内、LaTeX 和浮动渲染策略已收敛到 `src/editor/core/modules/image/render/`，超链接和日期行级渲染已收敛到 `src/editor/core/modules/inline/render/`，列表行头渲染已收敛到 `src/editor/core/modules/list/render/`，分隔符和分页符行级渲染已收敛到 `src/editor/core/modules/separator/render/`、`src/editor/core/modules/page-break/render/`，背景、区域、搜索和占位内容页级渲染已收敛到各自 `modules/*/render/`，段落格式标记和行尾换行符标记已收敛到 `src/editor/core/modules/paragraph/render/`，行级富文本高亮、上下标、文本装饰和分组高亮输出已收敛到 `src/editor/core/modules/richtext/render/`、`src/editor/core/modules/group/render/`，分组和搜索运行对象已收敛到 `src/editor/core/modules/group/runtime/`、`src/editor/core/modules/search/runtime/`，页眉页脚、页面设置、背景、签章、占位内容、水印、页码、行号和富文本装饰运行对象已收敛到 `src/editor/core/modules/header/runtime/`、`src/editor/core/modules/footer/runtime/`、`src/editor/core/modules/page-setup/runtime/`、`src/editor/core/modules/background/runtime/`、`src/editor/core/modules/badge/runtime/`、`src/editor/core/modules/placeholder/runtime/`、`src/editor/core/modules/watermark/runtime/`、`src/editor/core/modules/page-number/runtime/`、`src/editor/core/modules/line-number/runtime/`、`src/editor/core/modules/richtext/runtime/`，表格 target resolver 已收敛到 `src/editor/core/modules/table/target/`，表格选择投影、拖选单元格 range 与跨行列选区清理已收敛到 `src/editor/core/modules/table/selection/`，表格右键菜单定义已收敛到 `src/editor/core/modules/table/contextmenu/`，表格工具条交互副作用已收敛到 `src/editor/core/modules/table/interaction/`，普通选区起点、拖选范围和行级选区矩形渲染已收敛到 `src/editor/core/range/selection/`，页内指针坐标类型已收敛到 `src/editor/core/event/pointer/coordinates/`。
4. `docs/guide/` 中长期文档、阶段计划、进度记录、迁移记录混在一起，文档价值高但导航成本偏高。
5. `cypress/e2e/issues`、`cypress/e2e/menus`、`cypress/e2e/render-backend` 用例数量较多，建议通过命名和索引文档维护查找入口。

## 建议整理方向

### 低风险整理

- 在 `docs/` 中保留这份结构文档，并在 README 或 VitePress 导航里加入口。（已完成 VitePress 中文侧边栏入口）
- 给 `docs/guide/` 增加二级索引，例如 `architecture/`、`migration/`、`progress/`、`api/`。（已先补 `docs/guide/index.md` 作为一级入口）
- 给 `cypress/e2e/issues` 增加一份 issue 用例索引，说明 issue 编号、覆盖点和关联文档。（已完成）
- 保持 `src/demo/main.ts` 只承担 demo 工具栏集成，不向核心库反向渗透。

### 中风险整理

- demo 相关代码已收口到 `src/demo/`：

```txt
src/demo/
├── main.ts
├── mock.ts
├── components/
├── menus/
├── plugins/
├── styles/
└── assets/
```

- 根目录下的临时 HTML 测试页已移动到 `cypress/fixtures/manual/`，避免和正式入口混淆。
- Cypress fixture 根目录已按 `examples/`、`images/`、`manual/` 分类，并补充 `cypress/fixtures/README.md`。
- `canvas-pool-render-backend-*` 文档已归档到 `docs/guide/render-backend/`。

### 高风险整理

- 拆分 `src/editor/core/draw/` 的内部服务边界，例如进一步明确 `layout`、`render`、`runtime`、`data`、`interaction` 的依赖方向。
- 收口表格相关实现，形成更明确的“表格通用服务 / 表格布局 / 表格交互 / 表格绘制 / 表格命令”边界。
- 调整核心模块依赖方向前，必须同步更新 `scripts/verify-architecture.js`，避免规则失效。

## 推荐阅读顺序

新同学或长时间未接触该项目时，建议按下面顺序阅读：

1. `package.json`：先看脚本、构建模式和发布入口。
2. `vite.config.ts`：确认 demo 构建和 lib 构建的入口差异。
3. `src/editor/index.ts`：理解对外 API、Editor 初始化流程和导出边界。
4. `src/editor/core/draw/Draw.ts`：理解核心运行时如何启动。
5. `src/editor/core/command/`：理解业务侧如何操作编辑器。
6. `src/editor/core/event/`：理解浏览器事件如何进入编辑器。
7. `src/editor/core/draw/layout/` 和 `src/editor/core/draw/render/`：理解布局和渲染主流程。
8. `src/editor/core/modules/table/`：遇到表格问题时重点阅读。
9. `src/editor/core/render-backend/`：遇到 Canvas 池、多引擎、Worker 渲染问题时重点阅读。
10. `cypress/e2e/`：通过测试用例反向理解功能边界和回归风险。
