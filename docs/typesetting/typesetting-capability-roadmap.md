# 排版能力梳理与推进文档

更新时间：2026-05-29

> 本文是 2026-05-29 的历史能力盘点和路线图草案，用于保留当时的能力边界、差距判断和推进思路。2026-05-30 之后的实际开发状态、子任务拆分、验收口径和风险关闭以 [排版推进项开发功能与进度跟踪](./typesetting-development-progress.md) 为准；OOXML/DOCX 的字段映射和最小闭环状态以 [内部模型到 OOXML 映射推进文档](./ooxml-model-mapping.md) 为准。

## 目标

以 WPS Office Writer、ONLYOFFICE Document Editor 作为产品参照，梳理当前 `canvas-editor` 项目的排版能力边界，明确已经可用、已有模型但未完整落地、需要补齐的能力，并给出后续推进优先级。

当前项目版本：`package.json` 中为 `0.9.116`。项目定位是基于 Canvas/SVG 的富文本和类 Word 文档编辑器，现有代码已经覆盖正文、分页、表格、页眉页脚、页码、水印、控件、目录、打印等基础办公文档能力。

## 实现约束

排版相关能力后续新增或修改代码时，必须遵守以下注释约束：

- 类必须有中文注释，说明职责、所属排版能力和主要协作对象。
- 函数/方法必须有中文注释，说明输入、输出、副作用和触发的重排或渲染行为。
- 属性、接口字段、配置项必须有中文注释，说明业务含义、单位、默认值或取值范围。
- 核心算法代码必须有中文注释，尤其是分页、分栏、表格跨页、公式排版、控件数据绑定、OOXML 映射等复杂逻辑。
- 新增排版能力的测试用例也必须用中文说明覆盖的业务场景和边界条件。
- 不允许只用英文缩写或实现细节命名替代注释；注释要能让业务侧和后续维护者理解该代码为什么存在。

## 参照产品能力框架

参照 WPS/ONLYOFFICE 的 Writer 类产品，排版能力可分为 10 个层级：

| 层级 | 参照能力 | 对用户的价值 |
| --- | --- | --- |
| 文本样式 | 字体、字号、加粗、斜体、下划线、删除线、上下标、颜色、高亮、清除格式 | 基础编辑和局部强调 |
| 段落排版 | 对齐、两端对齐、行距、段前段后、缩进、悬挂缩进、制表位、项目符号/编号 | 正文可读性和标准文档格式 |
| 页面设置 | 纸张大小、方向、页边距、装订线、镜像页边距、分页/连续视图、分栏 | 合同、报告、病历、试卷等页面级版式 |
| 页眉页脚 | 页眉、页脚、页码、页码范围、首页/奇偶页差异 | 正式文档和打印交付 |
| 表格排版 | 表格插入、行列增删、合并拆分、边框、底色、斜线表头、单元格垂直对齐、跨页 | 表单、清单、病历模板 |
| 对象排版 | 图片、环绕、浮动、裁剪、边框阴影、公式、代码块、分隔线、块级嵌入 | 图文混排和专业内容 |
| 引用结构 | 标题、目录、书签/超链接、脚注尾注、交叉引用 | 长文档导航和结构化输出 |
| 审阅协作 | 批注、修订、接受/拒绝修订、只读/表单/打印模式 | 多人审核和业务流转 |
| 输出与互通 | 打印、图片/PDF 导出、HTML/纯文本、复制粘贴、Office 格式导入导出 | 和外部办公体系互通 |
| 性能稳定 | 大文档、表格跨页、局部重排、懒渲染、离屏/WebGL/SVG 后端 | 可用于真实业务文档 |

## 当前项目能力盘点

| 能力域 | 当前状态 | 证据位置 | 说明 |
| --- | --- | --- | --- |
| 基础富文本 | 已落地 | `README.md`、`src/editor/core/command/CommandAdaptRichText.ts` | 支持字体、字号、粗斜体、下划线、删除线、上下标、颜色、高亮、格式刷、清除格式。 |
| 段落对齐 | 已落地 | `src/editor/dataset/enum/Row.ts`、`CommandAdaptRichText.ts` | 支持左对齐、居中、右对齐、分散/两端对齐。 |
| 段落缩进 | 已落地 | `CommandAdaptRichText.ts`、`RowLayoutEngine.ts` | 支持左缩进、右缩进、首行缩进、悬挂缩进，并参与行宽计算。 |
| 行距 | 验收中 | [TS-05](./typesetting-development-progress.md#ts-05-段落高级行距与分页控制)、[OOXML 段落映射](./ooxml-model-mapping.md#段落与字符映射) | `rowMargin` 保留旧数据打开行为；`spaceBefore`、`spaceAfter`、`lineSpacing`、`lineSpacingType` 已进入布局计算，并完成 OOXML 第一批映射。跨表格、跨页局部分栏组合仍按 TS-05 扩大覆盖。 |
| 列表 | 已落地 | `src/editor/dataset/enum/List.ts`、`RowLayoutEngine.ts` | 支持有序/无序列表、圆点/空心圆/方块/复选框/十进制编号，多级列表已有布局计数逻辑。 |
| 标题与目录 | 开发中 | [TS-06](./typesetting-development-progress.md#ts-06-标题父子树)、`CommandAdaptRichText.ts` | 支持 1-6 级标题、目录查询、目录定位；标题父子树、缓存、目录消费和标题定位 API 已完成第一批，章节拖拽和按章导出仍需继续接入。 |
| 纸张大小/方向/页边距 | 已落地 | `PageSetupService.ts`、`setupFooterOptions.ts` | 支持纸张宽高、横纵向、四边距设置，并触发重新排版。 |
| 分页/连续视图 | 已落地 | `PageSetupService.ts`、`PageMode` | 支持分页和连续模式切换，连续模式对页眉页脚有恢复逻辑。 |
| 分栏 | 开发中 | [TS-03](./typesetting-development-progress.md#ts-03-分栏真实排版)、[OOXML 页面设置映射](./ooxml-model-mapping.md#页面设置映射) | 已从配置持久化推进到真实行流、选中内容分栏、栏内表格/内联图片/公式/控件第一批处理，并完成全局分栏 OOXML 双向映射；浮动图片环绕避让、复杂公式换行和控件真实输入态仍在推进。 |
| 装订线/镜像页边距 | 开发中 | [TS-04](./typesetting-development-progress.md#ts-04-装订线与镜像页边距)、[OOXML 页面设置映射](./ooxml-model-mapping.md#页面设置映射) | 已接入页码上下文边距、镜像页边距、顶部装订线、页边距 UI/绘制层第一批收口，并完成 OOXML 第一批双向映射；复杂页上下文导出真实分页仍需扩大覆盖。 |
| 页眉页脚 | 已落地 | `src/editor/core/modules/header/`、`footer/`、相关 Cypress 用例 | 支持独立区域、双击进入、禁用、只读、导出 HTML。 |
| 首页/奇偶页页眉页脚 | 开发中 | [TS-07](./typesetting-development-progress.md#ts-07-首页奇偶页页眉页脚)、`headerPageScopes/footerPageScopes` | 已完成 first/odd/even/all 作用域模型、runtime 按页读取/渲染/position 和 OOXML default/first/even 正向导出第一批；编辑区切换、连续模式体验、反向导入和 PDF/图片导出一致性仍需推进。 |
| 页码 | 已落地 | `PageNumber.ts`、`CommandAdaptRichText.ts` | 支持格式、起始页码、从指定页开始、最大页范围、阿拉伯/中文数字。 |
| 行号 | 已落地 | `LineNumber.ts`、`PageFrameRenderer.ts` | 支持禁用/启用、字体、颜色、距正文距离、连续或按页编号。 |
| 水印 | 已落地 | `Watermark.ts`、`setupInsertMenus.ts` | 支持文字/图片水印、颜色、透明度、字号、重复、间距、页码占位符。 |
| 页边框 | 已落地 | `PageBorder.ts`、`PageFrameRenderer.ts` | 支持颜色、线宽、内边距、样式、虚线数组、禁用开关。 |
| 表格基础 | 已落地 | `Command.ts`、`CommandAdaptTable.ts`、`src/editor/core/modules/table/` | 支持插入、行列增删、合并拆分、整表选择、自动适配、行内/块级表格。 |
| 表格样式 | 已落地 | `ITableAttr`、`ITd`、`tableMenus.ts` | 支持表格/单元格边框类型、颜色、宽度、单元格背景、垂直对齐、斜线。 |
| 表格跨页 | 已落地且重点强化 | `TableLayoutEngine.ts`、`TableFragmentSplitter.ts`、大量 `cypress/e2e/table` 用例 | 支持表格 fragment 拆分、合并单元格跨页、剩余空间、页脚/页码避让等场景。 |
| 图片排版 | 已落地 | `ImageDisplay`、`ImagePositionPolicy.ts`、`ImageParticle.ts` | 支持内联、块级、环绕、紧密、浮于文字上方/下方、拖动、边框、阴影、裁剪、WebGL 预览处理。 |
| 公式 | 开发中 | [TS-01](./typesetting-development-progress.md#ts-01-专业公式能力)、[OOXML 公式映射](./ooxml-model-mapping.md#标题列表表格和对象映射) | 已从正文图片化插入推进到结构化公式模型、专业符号库、文本型公式控件、页面内可视编辑和 Canvas 公式盒模型，并完成 MathML/OOXML 第一批序列化与 OOXML 公式第一批反向解析；节点级可视化编辑、复杂换行和完整 DOCX 往返仍在推进。 |
| 代码块/分隔线/块 | 已落地 | `ElementType.BLOCK/SEPARATOR`、相关 modules | 支持代码块、分隔线、iframe/video block。 |
| 控件与表单 | 开发中 | [TS-02](./typesetting-development-progress.md#ts-02-控件业务数据融合)、[OOXML 控件映射](./ooxml-model-mapping.md#标题列表表格和对象映射) | 支持文本、选择、日期、数字、单选、复选、表单模式和批量设置；`controlSchema`、初始化值/属性、业务字段绑定、级联/远程选项、同步/异步校验和失败高亮已完成第一批，复杂跨字段规则面板仍未接入。 |
| 批注/分组 | 部分落地 | `group` modules、demo comment 区 | 支持分组高亮、定位、删除，demo 层模拟批注；正式批注线程模型仍需补齐。 |
| 修订 | 已落地 | `ITrackChange`、`CommandAdaptDomain`、`setupTrackChange.ts` | 支持开启修订、插入/删除痕迹、接受/拒绝单条和全部。 |
| 打印/导出 | 已落地并扩展 DOCX 最小闭环 | `executePrint()`、`getImage()`、[TS-13](./typesetting-development-progress.md#ts-13-ooxml-完整映射与-docx-导入导出)、[OOXML 映射](./ooxml-model-mapping.md) | 支持打印、按页面导出图片；OOXML package、DOCX 导出/导入最小子集和 SVG 打印资源等待已进入 TS-13，PDF 主线化/插件化仍待 TS-14 决策。 |
| 大文档性能 | 已落地并持续优化 | `thousand-pages-editing.*`、`IncrementalRenderScheduler.ts`、`renderBackend` | 有千页编辑、输入刷新、Offscreen/WebGL/SVG 后端配置和局部渲染路径。 |

## 关键差距

> 以下差距保留 2026-05-29 的判断口径。部分 P0/P1 项已经在 2026-05-30 之后完成第一批落地或进入验收，最新缺口请优先查看 [推进总览](./typesetting-development-progress.md#推进总览)、[P0 验收清单](./typesetting-development-progress.md#p0-验收清单) 和 [测试矩阵](./typesetting-development-progress.md#测试矩阵)。

### P0：影响“类 Word 排版”的核心差距

1. 专业公式能力严重欠缺。
   - 当前公式能力已开始从“插入 LaTeX 渲染结果”转向文本型公式控件和结构化模型，但还不满足医院、工厂、工程、检验、药品剂量、化学反应式、工艺参数、质量计算等专业文档的完整编辑需要。
   - 影响：专业模板无法结构化录入公式；复制粘贴、编辑回显、导出、打印、搜索、校验和业务系统取值都难以稳定。
   - 建议：建立结构化公式模型和公式编辑器，支持分式、根式、上下标、矩阵、括号组、希腊字母、运算符、化学式、单位、变量占位、公式编号，并保证 Canvas 预览、打印、图片/PDF/DOCX 导出一致。

2. 分栏目前只完成配置持久化，核心排版未按栏生成行流。
   - 最新状态：TS-03 已推进到真实行流、选中内容分栏和栏内表格/内联图片/公式/控件第一批处理，剩余缺口以 [TS-03](./typesetting-development-progress.md#ts-03-分栏真实排版) 为准。
   - 影响：报告、简报、试卷、多栏合同无法达到 WPS/ONLYOFFICE 的页面布局能力。
   - 建议：新增 `PageColumnLayoutService`，在主文档分页时把正文区域拆成 `columnRects`，让 `RowLayoutEngine.computeRowList()` 接收当前栏宽和栏起点，行满后先流入下一栏，再进入下一页。

3. 装订线和镜像页边距字段未参与页面度量。
   - 最新状态：TS-04 已完成页码上下文边距、镜像页边距、顶部装订线和绘制/导出第一批收口，剩余缺口以 [TS-04](./typesetting-development-progress.md#ts-04-装订线与镜像页边距) 为准。
   - 影响：打印装订、双面打印、左右页内外边距无法准确预览。
   - 建议：在 `DrawMetricsService.getOriginalMargins()` 引入页码上下文，支持 `gutter/gutterPosition/mirrorMargins`；渲染页边距指示器也要同步。

4. 段落高级分页控制有模型但缺少排版行为。
   - 涉及字段：`pageBreakBefore`、`keepWithNext`、`keepLines`、`widowControl`。
   - 最新状态：TS-05 已接入段前分页、keep、孤行/寡行、精确/倍数行距和段前段后，多栏组合进入验收，剩余缺口以 [TS-05](./typesetting-development-progress.md#ts-05-段落高级行距与分页控制) 为准。
   - 影响：标题孤行、表格前标题跨页、段落末尾孤行等正式文档问题难以控制。
   - 建议：在分页阶段增加段落块级决策层，先按段落收集行，再应用分页规则。

5. 行距/段前段后模型未完整转化为 WPS 式段落面板。
   - 当前 `rowMargin` 可用，但 `spaceBefore/spaceAfter/lineSpacing/lineSpacingType` 需要成为布局输入。
   - 最新状态：字段已进入布局计算，并完成 OOXML 第一批映射；面板体验和复杂组合回归继续按 [TS-05](./typesetting-development-progress.md#ts-05-段落高级行距与分页控制) 推进。
   - 建议：保留 `rowMargin` 旧数据打开行为，同时新增精确行距、倍数行距、段前段后布局计算。

6. 控件与业务数据融合能力需要标准化。
   - 当前已有控件模型和部分批量设置 API，但用户需要在初始化编辑器时直接传入业务数据、选择项、默认值、禁用/只读规则和校验规则，让业务系统与编辑器快速融合。
   - 最新状态：TS-02 已完成 `controlSchema`、初始化值/属性、业务字段绑定、级联/远程选项、同步/异步校验和失败高亮第一批，剩余缺口以 [TS-02](./typesetting-development-progress.md#ts-02-控件业务数据融合) 为准。
   - 影响：医院病历、工厂质检单、设备巡检表、审批表等模板需要大量下拉、单选、多选、日期、数字、文本控件；如果缺少标准 API，业务侧只能做大量二次封装。
   - 建议：提供统一的 `controlDataSource/controlInitialValues/controlSchema` 能力，支持按 `controlId/conceptId/externalId/code` 绑定控件，支持初始化传入各种选择项、级联选项、默认值、值域校验、必填规则、只读/禁用状态，并支持批量读取和回填。

### P1：提升正式文档交付质量

1. 标题父子层级关系。
   - 当前标题有 `level/titleId`，但没有稳定的父标题、子标题、同级标题关系；长文档目录、章节折叠、章节拖拽、按章导出会缺少结构依据。
   - 最新状态：标题树构建、缓存、目录消费和标题定位 API 已完成第一批，剩余章节操作以 [TS-06](./typesetting-development-progress.md#ts-06-标题父子树) 为准。
   - 建议：新增标题树构建与缓存能力，生成 `parentTitleId/childrenTitleIds/path/order` 等结构信息；目录、定位、章节操作统一消费标题树，而不是在 UI 层临时推断。

2. 首页/奇偶页页眉页脚。
   - 最新状态：`headerPageScopes/footerPageScopes` 已接入页眉页脚数据结构、runtime 按页读取/渲染/position 和 OOXML default/first/even 正向导出第一批；后续继续补编辑区切换、连续模式、反向导入和 PDF/图片导出一致性。

3. 制表位。
   - 当前 `tabStops` 有模型，Tab 元素也存在，但需要支持左/中/右/小数点/竖线制表位的定位与 UI。
   - 最新状态：显式制表位布局、命令/API、右/居中/小数点/竖线对齐、worker 快照和 demo UI 第一批已进入验收，剩余交互以 [TS-09](./typesetting-development-progress.md#ts-09-制表位) 为准。

4. 脚注/尾注。
   - 当前未看到对应模型。合同、论文、说明书等长文档会需要。

5. 样式系统。
   - 当前有 `styleId/styleName`、标题字号映射，但还不是完整的正文/标题/列表/表格样式库。
   - 建议：建立 `DocumentStyle` 数据层，支持样式应用、更新样式、基于样式生成目录。

### P2：增强 WPS/ONLYOFFICE 体验一致性

1. 图片环绕细节。
   - 已有内联、块级、环绕、紧密、浮动，但还可补齐上下型、穿越型、相对页面/边距/段落锚定、锁定锚点、叠放顺序。

2. 表格属性面板。
   - 表格能力强，但很多能力在右键菜单或接口层；需要统一成 WPS 式“表格属性”：表格宽度、对齐、文字环绕、单元格边距、行高策略、跨页断行、重复标题行。

3. 中文排版细节。
   - 当前有标点避头、英文断词策略；可继续补齐禁则、悬挂标点、自动调整中西文间距、避尾标点、竖排文本。

4. 文本高级效果。
   - 模型已有 `textScale/textPosition/textOutline/textShadow/textGlow/textReflection/textEnclosure/textRuby/textCombine`，需要补齐命令、UI、渲染和导出一致性。

### P3：互通与生态

1. DOCX 导入导出。
   - 当前主线以内部 JSON/HTML/图片/打印为主；若要对标 WPS/ONLYOFFICE，DOCX 互通是关键。
   - 最新状态：OOXML 映射框架、DOCX package/ZIP 导出、基础导入和字段级映射第一批已推进，见 [TS-13](./typesetting-development-progress.md#ts-13-ooxml-完整映射与-docx-导入导出) 与 [内部模型到 OOXML 映射推进文档](./ooxml-model-mapping.md)。
   - 建议：先做内部模型到 OOXML 的完整映射设计，而不是只做最小子集；以完整导入导出为目标，覆盖文档结构、页面设置、段落、字符样式、标题树、列表、表格、图片、公式、页眉页脚、页码、水印、批注/修订等对象，再按优先级分批实现。

2. PDF 导出。
   - README 提到 PDF 分支，建议确认是否需要合并主线或以插件形式提供。

3. 协同编辑。
   - README Roadmap 中提到 CRDT。若面向多人在线文档，需要把排版、修订、批注、选区和冲突合并放在同一设计里推进。

## 推进路线

各推进项的开发功能拆分、子任务状态和验收口径统一记录在：[排版推进项开发功能与进度跟踪](./typesetting-development-progress.md)。
推进过程中的风险、实现约束和应对措施也纳入同一份进度文档，见：[风险与约束总览](./typesetting-development-progress.md#风险与约束总览)。

| 推进项 | 开发功能 | 进度文档 |
| --- | --- | --- |
| 段落块/栏/页排版中间层 | 段落块模型、栏模型、页模型、行布局产物改造、规则迁移入口 | [TS-00](./typesetting-development-progress.md#ts-00-段落块栏页排版中间层) |
| 专业公式能力 | 公式 AST、可视化公式编辑器、专业符号库、公式排版、复制粘贴和导出映射 | [TS-01](./typesetting-development-progress.md#ts-01-专业公式能力) |
| 控件业务数据融合 | 初始化 API、选项注入、控件绑定、批量读写、事件回调和校验 | [TS-02](./typesetting-development-progress.md#ts-02-控件业务数据融合) |
| 分栏真实排版 | 栏区计算、栏内行流、栏内对象、选区和定位 | [TS-03](./typesetting-development-progress.md#ts-03-分栏真实排版) |
| 装订线与镜像页边距 | 页码上下文边距、奇偶页内外边距、打印导出一致性 | [TS-04](./typesetting-development-progress.md#ts-04-装订线与镜像页边距) |
| 段落高级行距与分页控制 | 精确/倍数/自动行距、段前段后、分页控制、孤行/寡行 | [TS-05](./typesetting-development-progress.md#ts-05-段落高级行距与分页控制) |
| 标题父子树 | 标题树构建、缓存、增量更新、目录和章节 API | [TS-06](./typesetting-development-progress.md#ts-06-标题父子树) |
| 首页/奇偶页页眉页脚 | 页眉页脚作用域、渲染编辑区切换、导出互通 | [TS-07](./typesetting-development-progress.md#ts-07-首页奇偶页页眉页脚) |
| 样式系统 | 文档样式模型、样式命令、样式 UI、OOXML 样式映射 | [TS-08](./typesetting-development-progress.md#ts-08-样式系统) |
| 制表位 | 制表位布局算法、命令/API、UI 回显 | [TS-09](./typesetting-development-progress.md#ts-09-制表位) |
| 表格属性面板 | 表格属性模型、命令、属性面板 | [TS-10](./typesetting-development-progress.md#ts-10-表格属性面板) |
| 图片对象排版增强 | 图片锚定、环绕类型、属性面板 | [TS-11](./typesetting-development-progress.md#ts-11-图片对象排版增强) |
| 中文排版细节 | 中文断行规则、中西文间距、竖排与纵横混排 | [TS-12](./typesetting-development-progress.md#ts-12-中文排版细节) |
| OOXML 完整映射与 DOCX 导入导出 | 完整映射表、DOCX 导出、DOCX 导入、回归对比 | [TS-13](./typesetting-development-progress.md#ts-13-ooxml-完整映射与-docx-导入导出) |
| PDF 导出主线化/插件化 | PDF 架构决策、输出链路、回归测试 | [TS-14](./typesetting-development-progress.md#ts-14-pdf-导出主线化插件化) |

### 阶段 1：专业公式与排版核心补齐（3-4 周）

目标：补齐专业领域公式短板，并让页面排版具备可对标 WPS/ONLYOFFICE 的基本页面布局能力。

交付：

- 段落块/栏/页排版中间层：在现有行级计算之上增加中间层，作为分栏、段落分页控制、表格跨页、公式跨页和后续 OOXML 映射的统一承载。
- 公式编辑器 MVP：可视化编辑分式、根式、上下标、括号组、希腊字母、常用运算符、单位和变量占位。
- 专业符号库：医院场景覆盖剂量、浓度、检验指标、统计符号；工厂场景覆盖工艺参数、工程单位、公差/上下限、化学式和反应式。
- 公式数据模型：公式保存为结构化 AST，同时保留 LaTeX/MathML 或导出中间格式，支持编辑回显、复制粘贴和业务系统解析。
- 公式渲染一致性：正文、表格、页眉页脚、打印、图片/PDF/DOCX 导出保持一致。
- 分栏参与真实排版：支持 1-N 栏、栏间距、自定义栏宽、分页与表格/图片避让。
- 装订线、镜像页边距参与正文区域、页边距指示器、打印输出。
- 段前段后、精确/倍数/自动行距进入布局引擎。
- Cypress 覆盖：公式编辑回显、表格内公式、公式跨页、专业符号插入、多栏长文档、栏内图片、栏内表格、横向纸张、镜像页边距。

建议改动点：

- `src/editor/core/modules/image/particle/latex/`
- 新增 `src/editor/core/modules/formula/`
- `src/editor/interface/Element.ts`
- `src/editor/core/draw/layout/DrawMetricsService.ts`
- `src/editor/core/draw/layout/RowLayoutEngine.ts`
- `src/editor/core/modules/page-setup/runtime/PageSetupService.ts`
- `src/editor/interface/PageColumns.ts`
- `src/demo/menus/setupFooterOptions.ts`

### 阶段 2：段落分页控制（2 周）

目标：解决正式文档中最常见的跨页质量问题。

交付：

- `pageBreakBefore`：段前分页。
- `keepWithNext`：标题与下一段同页。
- `keepLines`：段落行不拆页。
- `widowControl`：孤行/寡行控制。
- Cypress 覆盖：标题跨页、长段落跨页、表格前标题、段落末尾孤行。

建议实现：

- 在行布局之后、分页提交之前增加段落块元信息。
- 不直接在字符循环中处理所有分页规则，避免规则互相打架。

### 阶段 3：页眉页脚与样式体系（2-3 周）

目标：增强正式文档模板能力。

交付：

- 标题父子树：按标题级别生成稳定父子关系，支持目录树、章节定位和后续章节操作。
- 首页不同、奇偶页不同页眉页脚。
- 样式库：正文、标题 1-6、引用、列表、表格样式。
- 样式应用后目录生成保持稳定。
- UI：样式选择、更新当前样式、清除样式。

### 阶段 3.5：控件业务融合能力（2 周）

目标：让业务系统可以通过 API 快速把模板控件、选项数据和业务值注入编辑器。

交付：

- 初始化 API：创建编辑器时支持传入控件值、控件选项、默认值、只读/禁用/必填/校验规则。
- 选择类控件：支持单选、多选、下拉、级联选择、远程选项懒加载、本地选项快照。
- 绑定机制：统一支持 `controlId/conceptId/externalId/code` 定位控件，减少业务系统和模板之间的脆弱耦合。
- 批量接口：完善批量设置、批量读取、按业务字段回填、按控件分组回填，并返回失败项和原因。
- 事件回调：控件值变化、选项加载、校验失败、控件聚焦/失焦、联动变更对外可订阅。
- Cypress 覆盖：初始化传值、选择项传入、批量回填、禁用/只读、必填校验、表格内控件、表单模式。

### 阶段 4：表格属性和对象排版体验（3 周）

目标：把已有能力组织成办公软件用户熟悉的面板。

交付：

- 表格属性面板：表格宽度、对齐、文字环绕、单元格边距、行高、跨页、重复标题行。
- 图片属性面板：环绕方式、相对位置、锁定比例、裁剪、边框、阴影、层级。
- 对应命令 API 文档和 Cypress 覆盖。

### 阶段 5：导入导出与互通（持续）

目标：支持与外部办公文档流转。

交付：

- 建立内部模型到 DOCX/OOXML 的完整映射表，覆盖 `IEditorData/IElement/IEditorOption` 到 OOXML package、document、styles、numbering、settings、header/footer、media、comments、revisions、公式等部件的对应关系。
- 以完整导入导出为目标推进：先完成映射设计和测试文档集，再分批实现导出、导入、回归对比，避免早期最小子集设计限制后续互通能力。
- PDF 能力主线化或插件化。
- 建立基准文档集：合同、病历、试卷、报告、表格清单。

## 验收标准

| 场景 | 验收方式 |
| --- | --- |
| 页面设置 | 同一份文档在纵向/横向、不同纸张和页边距下，正文、页眉页脚、页码、水印不重叠。 |
| 分栏 | 三栏长文档可从左到右、从上到下稳定流动；栏内图片/表格不越界；分页后栏序正确。 |
| 段落控制 | 标题不会孤立在页底；设置 keep 后段落不被拆开；段前分页稳定生效。 |
| 表格跨页 | 合并单元格、重复标题行、页脚/页码避让、单元格编辑后局部重排稳定。 |
| 公式 | 医院/工厂常用公式可编辑、可回显、可打印、可导出；表格内公式不撑破单元格；复制粘贴后结构不丢失。 |
| 控件业务融合 | 用户初始化编辑器时可通过 API 传入控件值、选择项、默认值和规则；批量回填、批量读取、事件监听稳定可用。 |
| 打印导出 | Canvas 预览、打印、图片/PDF/DOCX 导出在页面尺寸、边距、页码、水印和公式上保持一致。 |
| 性能 | 千页文档输入、滚动、局部修改不出现明显卡顿；Cypress 性能基线不退化。 |

## 风险与约束

1. 当前核心排版是行级计算，分栏和段落分页控制需要引入“段落块/栏/页”的中间层，否则后续规则会越来越难维护。
2. 表格跨页已有大量逻辑，分栏与表格跨页结合时要优先保证不破坏现有表格测试。
3. DOCX 互通不是简单导出文本，需要稳定的样式、段落、页面、表格模型作为基础。
4. Canvas 渲染和浏览器字体度量存在环境差异，复杂排版的测试要以几何位置和像素快照结合验证。

## 推荐优先级

近期最值得投入的是：段落块/栏/页排版中间层、专业公式能力、控件业务融合能力、分栏真实排版、装订线/镜像页边距、段落高级行距和分页控制。中间层是后续分栏、段落分页控制、表格跨页和 OOXML 映射的基础；公式和控件能力对医院、工厂等专业领域是刚需，它决定项目是否能承载专业模板、业务填报和业务系统数据回填；页面排版能力则决定项目能否从“富文本编辑器”推进到“办公文档排版编辑器”。表格、图片、页眉页脚、页码、水印已经具备较好的基础，应以不破坏现有能力为前提继续增强面板体验和导出互通。

## 参考资料

- [ONLYOFFICE Help Center - User Guides](https://helpcenter.onlyoffice.com/docs/userguides.aspx)：Document Editor 用户指南与页面设置、页眉页脚、表格、图片、目录等文档能力说明。
- [WPS Academy](https://www.wps.com/academy/) 与 [WPS Help Center](https://help.wps.com/)：Writer 页面布局、页眉页脚、页码、水印、表格和目录相关说明。
- 本项目源码：`README.md`、`docs/en/guide/option.md`、`docs/en/guide/schema.md`、`src/editor/interface/*`、`src/editor/core/modules/*`、`cypress/e2e/*`。
