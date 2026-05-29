# Modules 目录索引

`modules/` 存放编辑器业务模块。`core/` 第一层保留公共基础设施、事件管线、命令适配、渲染、坐标和状态管理等横向能力。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `area/` | 区域元素相关的编辑规则，例如换行、插入和上下文继承边界 |
| `background/` | 页面背景色、背景图加载缓存和背景渲染 |
| `badge/` | 文档签章 / 区域签章配置缓存、坐标解析和渲染 |
| `block/` | iframe、video、svg、html 等块级嵌入元素的业务绘制、导出回退和 DOM 宿主管理 |
| `control/` | 控件业务能力，包括控件命中、选区、导航、输入、拖拽、删除、渲染和右键菜单 |
| `footer/` | 页脚元素、布局、position 和渲染运行对象 |
| `group/` | 批注组 / 分组相关的范围计算、分组标记维护和高亮渲染 |
| `header/` | 页眉元素、布局、position 和渲染运行对象 |
| `image/` | 图片、LaTeX 图片化预览和浮动图片相关业务，包括剪贴板、命令、命中、定位、渲染、右键菜单和交互清理 |
| `inline/` | 超链接、日期等内联业务元素的命令、右键菜单、渲染和交互副作用 |
| `line-number/` | 行号渲染和行号序号计算 |
| `list/` | 列表键盘、指针、拖拽上下文、行头渲染和 checkbox 命中等业务规则 |
| `page-break/` | 分页符命令、元素创建、插入规则和行级渲染 |
| `page-number/` | 页码渲染、页码格式化和页数占位符替换 |
| `page-setup/` | 页面设置运行对象，包括页面模式、缩放、纸张尺寸、页边距指示器、页面边框和边界计算 |
| `paragraph/` | 段落边界、段落选区、粘贴清洗、格式标记和段落级交互规则 |
| `placeholder/` | 空文档和区域占位内容的临时布局与渲染 |
| `richtext/` | 下划线、删除线、高亮、上下标等文本装饰运行、行级高亮和绘制对象 |
| `row-drag/` | 整行拖拽手柄、可见性、命中和 drop target 解析 |
| `search/` | 查找、替换、搜索命中列表、跳转和搜索高亮渲染 |
| `separator/` | 分隔符命令、元素创建、行头替换规则和行级渲染 |
| `table/` | 表格命中、布局、导航、选区、粒子、定位、右键菜单和上下文 target 解析等表格业务 |
| `title/` | 标题元素换行、段落边界和样式继承相关编辑规则 |
| `watermark/` | 文档水印命令、配置归一化和删除规则 |

## 模块内分层

业务模块内部按能力继续分层，优先使用下列目录名：

| 目录 | 职责 |
| --- | --- |
| `command/` | 业务命令参数归一化、元素创建和命令复用规则 |
| `contextmenu/` | 业务右键菜单项、菜单状态和菜单回调 |
| `clipboard/` | 业务剪贴板输入、粘贴清洗和粘贴插入规则 |
| `hittest/` | 业务命中测试、命中结果解释和命中策略 |
| `interaction/` | 鼠标、键盘、拖拽等交互触发后的业务副作用 |
| `navigation/` | 业务内部键盘导航、方向移动和边界切换 |
| `policy/` | 可跨事件复用的业务判断规则 |
| `position/` | 业务元素参与 positionList 或坐标计算的规则 |
| `runtime/` | 需要持有运行态状态、缓存或渲染副作用的业务对象 |
| `render/` | 业务专属渲染编排、覆盖层和渲染辅助 |
| `selection/` | 业务元素参与选区、拖选、光标落点和选区投影的规则 |
| `layout/` | 业务布局快照、访问器和布局引擎 |
| `particle/` | 业务绘制、工具条和结构操作入口 |
| `target/` | 业务上下文、目标和快照切片解析 |
| `utils/` | 只服务当前业务模块的通用工具 |

## 维护规则

- 表格、控件、块级嵌入、图片、内联、列表、段落、富文本装饰、标题、区域、页眉、页脚、背景、签章、占位内容、分组、搜索、行号、页码、页面设置、行拖拽、分隔符、分页符、水印等业务目录放在这里。
- 公共层调用业务模块时通过明确的 interaction / policy / command / hittest 等入口，不把业务判断重新散落到 event / range / position / command 适配层。
- 新增业务模块默认进入 `modules/`，不要再平铺到 `core/` 第一层。

## 位置说明

- 所属层级：业务模块层
- 上游调用：`draw/`、`event/`、`command/`、`range/`、`render-backend/`
- 下游依赖：各模块内部的 `runtime`、`command`、`render`、`interaction`、`policy` 等分层

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `*/README.md` | 各业务模块的目录边界、子目录说明和函数索引。 |
| `*/runtime/` | 业务运行对象和状态缓存。 |
| `*/command/` | 业务命令参数、状态和元素创建规则。 |
| `*/render/` | 业务参与页面或行绘制的调度。 |
| `*/interaction/` | 业务交互副作用和键鼠规则。 |
| `*/policy/` | 可跨事件复用的业务判断。 |

## 函数说明

| 模块 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `table/` | table runtime / hittest / layout / render | 表格命中、布局、选择、绘制和结构操作。 | draw、event、command |
| `control/` | control runtime / interaction / policy | 控件取值、输入、导航、渲染和状态切换。 | event、command、render |
| `image/` | image particle / hittest / interaction | 图片、浮动图片、LaTeX 和预览器能力。 | event pointer、render、clipboard |
| `paragraph/` / `list/` / `title/` | selection / interaction / command | 段落、列表和标题的输入边界与编辑规则。 | keyboard、range、command |
| `background/` / `page-setup/` / `watermark/` / `page-number/` / `line-number/` | runtime / render | 页面框架、背景、水印、页码和行号。 | page render、export |
