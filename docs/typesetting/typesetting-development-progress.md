# 排版推进项开发功能与进度跟踪

更新时间：2026-06-06

## 状态说明

| 状态 | 含义 |
| --- | --- |
| 未开始 | 仅完成规划，尚未进入设计或开发。 |
| 设计中 | 正在拆模型、接口、外部互通和测试方案。 |
| 开发中 | 已进入代码实现。 |
| 联调中 | 功能已可运行，正在补齐场景、接口和 UI。 |
| 验收中 | 已完成主要开发，正在跑测试、修复边界问题。 |
| 已完成 | 功能、测试、文档和验收记录均完成。 |

## 推进总览

| 编号 | 推进项 | 优先级 | 当前状态 | 负责人 | 进度记录 |
| --- | --- | --- | --- | --- | --- |
| TS-00 | 段落块/栏/页排版中间层 | P0 | 已完成 | 待定 | [详情](#ts-00-段落块栏页排版中间层) |
| TS-01 | 专业公式能力 | P0 | 已完成 | 待定 | [详情](#ts-01-专业公式能力) |
| TS-02 | 控件业务数据融合 | P0 | 已完成 | 待定 | [详情](#ts-02-控件业务数据融合) |
| TS-03 | 分栏真实排版 | P0 | 已完成 | 待定 | [详情](#ts-03-分栏真实排版) |
| TS-04 | 装订线与镜像页边距 | P0 | 已完成 | 待定 | [详情](#ts-04-装订线与镜像页边距) |
| TS-05 | 段落高级行距与分页控制 | P0 | 已完成 | 待定 | [详情](#ts-05-段落高级行距与分页控制) |
| TS-06 | 标题父子树 | P1 | 已完成 | 待定 | [详情](#ts-06-标题父子树) |
| TS-07 | 首页/奇偶页页眉页脚 | P1 | 已完成 | 待定 | [详情](#ts-07-首页奇偶页页眉页脚) |
| TS-08 | 样式系统 | P1 | 已完成 | 待定 | [详情](#ts-08-样式系统) |
| TS-09 | 制表位 | P1 | 已完成 | 待定 | [详情](#ts-09-制表位) |
| TS-10 | 表格属性面板 | P2 | 已完成 | 待定 | [详情](#ts-10-表格属性面板) |
| TS-11 | 图片对象排版增强 | P2 | 已完成 | 待定 | [详情](#ts-11-图片对象排版增强) |
| TS-12 | 中文排版细节 | P2 | 已完成 | 待定 | [详情](#ts-12-中文排版细节) |
| TS-13 | OOXML 完整映射与 DOCX 导入导出 | P3 | 已完成 | 待定 | [详情](#ts-13-ooxml-完整映射与-docx-导入导出) |
| TS-14 | PDF 导出主线化/插件化 | P3 | 未开始 | 待定 | [详情](#ts-14-pdf-导出主线化插件化) |

## 风险与约束总览

| 编号 | 推进项 | 主要风险 | 实现约束 | 应对措施 |
| --- | --- | --- | --- | --- |
| TS-00 | 段落块/栏/页排版中间层 | 继续把分栏、分页控制、表格跨页规则塞进行级循环，会让规则难维护且容易互相影响；额外引入长期适配器也会增加复杂度和隐藏状态。 | 必须在布局产物中直接形成段落块、栏、页结构，不新增长期中间层适配器。 | 先定义目标数据结构，再改造现有布局输出，让行级计算逐步直接产出段落块/栏/页上下文。 |
| TS-01 | 专业公式能力 | 公式只做图片化会导致无法编辑、无法搜索、无法导出结构。 | 必须建立结构化公式模型，不能只保存渲染结果。 | 先完成 AST/LaTeX/MathML/OOXML 映射设计，再做编辑器和渲染。 |
| TS-02 | 控件业务数据融合 | 控件和业务字段绑定不稳定会导致模板升级后回填错位。 | 绑定键必须支持 `controlId/conceptId/externalId/code`，批量 API 必须返回失败项。 | 建立控件 schema 和初始化数据契约，补齐批量读写回归测试。 |
| TS-03 | 分栏真实排版 | 直接改行布局容易破坏分页、选区、表格跨页。 | 分栏必须作为页/栏中间层接入，不能把规则散落在字符循环里。 | 新增栏区服务，先让文本流动，再逐步接入表格、图片、公式、控件。 |
| TS-04 | 装订线与镜像页边距 | 边距只改 UI 不改度量会造成预览和打印不一致。 | 正文区域、页边距指示器、打印和导出必须使用同一套边距计算。 | 在 `DrawMetricsService` 统一处理页码上下文边距。 |
| TS-05 | 段落高级行距与分页控制 | 分页规则互相影响，容易出现死循环或页面空白。 | 必须先形成段落块元信息，再做分页决策。 | 增加段落块分页测试，覆盖标题孤行、keep、widow 等边界。 |
| TS-06 | 标题父子树 | 只靠目录 UI 临时推断会导致章节操作不稳定。 | 标题树必须成为核心数据能力，目录只是消费方。 | 标题变更后增量重建标题树，并提供查询 API。 |
| TS-07 | 首页奇偶页页眉页脚 | 多作用域页眉页脚会影响编辑区切换、导出和连续模式。 | 页眉页脚数据必须明确作用域，渲染和编辑要按页解析。 | 先补作用域模型，再处理交互和导出。 |
| TS-08 | 样式系统 | 样式和直接格式混用容易造成回显不一致。 | 样式、直接格式、标题、列表、表格样式必须有优先级规则。 | 建立样式计算策略和当前样式识别规则。 |
| TS-09 | 制表位 | Tab 仍按固定宽度处理会无法适配正式文档。 | Tab 元素必须按段落制表位测量和定位。 | 先实现布局算法，再补 UI 和 OOXML 映射。 |
| TS-10 | 表格属性面板 | 表格属性散落在菜单和接口里，后续难维护。 | 表格属性必须统一进入模型、命令、UI、导出映射。 | 抽象表格属性服务，避免面板直接改底层结构。 |
| TS-11 | 图片对象排版增强 | 浮动/环绕和选区、命中、分页互相影响。 | 图片锚定、环绕、层级必须统一参与位置计算。 | 先定义锚定模型和层级规则，再扩展环绕类型。 |
| TS-12 | 中文排版细节 | 中文规则和英文断词规则冲突会影响换行稳定性。 | 断行策略必须可配置，并保留旧文档打开行为。 | 增加中文专业模板基准，按场景启用规则。 |
| TS-13 | OOXML 完整映射与 DOCX 导入导出 | 最小子集设计会限制后续完整导入导出。 | 必须先做完整映射表，所有字段要有映射或不支持说明。 | 以基准文档集驱动映射、导入、导出和往返对比。 |
| TS-14 | PDF 导出主线化/插件化 | PDF 输出链路和 Canvas 预览不一致会影响交付可信度。 | PDF 必须复用同一套页面度量和渲染语义。 | 明确主线/插件架构，建立 PDF 基准输出回归。 |

## 统一开发约束与验收口径

- 代码注释约束：排版相关新增或改造代码必须包含中文注释；新增类、函数、核心属性、关键分支和非直观算法必须解释职责、输入输出或布局语义。
- 模型优先约束：先明确内部模型、布局产物和导入导出映射，再做 UI；避免只在菜单或渲染层临时堆逻辑。
- 中间层约束：段落块、栏、页必须直接沉淀到布局产物和快照，不新增长期“中间层适配器”，避免额外状态和同步风险。
- 导入导出约束：OOXML 必须先维护完整映射表；最小子集只能作为第一批实现范围，不能替代完整字段梳理。
- 互通约束：新增字段必须说明当前模型、导入导出映射和不支持范围；主排版、命中、导出链路不保留旧字段、旧 API、旧导出格式兼容分支。
- 兼容约束：`legacy`、`compat`、`fallback` 等旧命名不得出现在主流程数据结构和统计 API 中；确需处理外部格式差异时必须落到明确的导入/导出 adapter，并同步文档。
- 测试约束：每个推进项至少覆盖模型/API、真实布局、交互命中、导入导出或快照中的关键路径；P0 项必须有 Cypress 回归。
- 验收口径：状态进入“验收中”必须具备可运行功能、测试用例和文档记录；状态进入“已完成”必须完成边界回归和风险关闭记录。

## P0 验收清单

| 推进项 | 必须完成能力 | 必须覆盖测试 | 当前缺口 |
| --- | --- | --- | --- |
| TS-00 段落块/栏/页 | 布局产物直接输出页、栏、段落块；分栏和分页规则可消费同一结构。 | 快照结构、段落块范围、栏区域、分页规则组合。 | 已完成。对象级栏内避让已在 TS-03/TS-11 收口，跨页和导入导出保真继续归属 TS-01/TS-03/TS-05/TS-10/TS-13。 |
| TS-01 专业公式 | 结构化公式可编辑、可渲染、可导入导出；医院/工厂符号库可用。 | AST 保存读取、符号库、Canvas 渲染、MathML/OOXML 往返。 | 已完成。复杂公式节点级增强、跨页拆分和更完整专业公式往返继续作为 TS-13/后续增强项推进。 |
| TS-02 控件融合 | API 初始化、批量回填、选择项、校验、事件和业务字段绑定稳定。 | 初始化值、选项注入、失败项、级联、远程、校验事件、跨字段规则。 | 已完成。控件栏内复杂输入继续归属 TS-03-D，OOXML 外部内容控件导入继续归属 TS-13。 |
| TS-03 分栏排版 | 页面分栏和选中内容分栏可真实流动，点击、输入、选区稳定。 | 全局分栏、局部分栏、工具栏、命中、页眉页脚、表格/图片/公式/控件。 | 已完成。复杂浮动锚定和表格内浮动命中边界已在 TS-11 收口；复杂公式跨页拆分归属 TS-01/TS-13，PDF/OOXML 导出一致归属 TS-13/TS-14。 |
| TS-04 页边距 | 装订线、镜像页边距、页边距 UI、打印导出一致。 | 奇偶页、顶部装订线、UI 指示器、导出边距、OOXML 页面设置。 | 已完成。复杂 DOCX/PDF 端到端输出一致继续归属 TS-13/TS-14。 |
| TS-05 段落分页控制 | 行距、段距、分页控制在单栏、多栏、跨页组合下稳定。 | pageBreakBefore、keepWithNext、keepLines、widowControl、行距、段距、多栏组合。 | 已完成。`keepWithNext + 块级表格`、跨页局部分栏 `keepLines/widowControl` 已进入回归；表格重复标题行、行高策略和属性映射已在 TS-10 收口，表格内浮动图片命中边界已在 TS-11 收口，复杂 PDF/OOXML 端到端视觉对比继续归属 TS-13/TS-14。 |

## 测试矩阵

| 场景 | 关联推进项 | 当前覆盖 | 待补覆盖 |
| --- | --- | --- | --- |
| 文本分页与分栏 | TS-00、TS-03、TS-05、TS-12 | 双栏文本流、选中内容分栏、跨页局部分栏续排、行距段距和分页控制、分栏下 keepWithNext/keepLines/widowControl/段距/行距换栏、跨页局部分栏 keepLines/widowControl、行尾标点悬挂、开口标点行尾禁则、闭口/句读标点行首禁则、数字单位组合不拆行、自定义单位/开口/闭口标点配置和中西文间距。 | 大样本文档互通和 DOCX/PDF 端到端视觉对比继续归属 TS-13/TS-14。 |
| 页眉页脚与页边距 | TS-03、TS-04、TS-07 | 正文分栏不污染页眉页脚，镜像页边距基础查询；TS-07 `headerPageScopes/footerPageScopes` 已接入 runtime 读取、渲染、position、双击编辑区 pageNo 路由和 `getValue({ pageNo })`；TS-04 分栏测量 pageNo、页边距指示器、页码、行号、页边框、SVG pageMetric 和 OOXML 页面设置回归已覆盖。 | DOCX/PDF/图片端到端一致归属 TS-13/TS-14。 |
| 表格排版 | TS-00、TS-03、TS-05、TS-10 | 表格分页、fragment、栏内测量、`keepWithNext + 块级表格`、重复标题行、最小行高/跨页拆行策略、表格/单元格边框类型颜色宽度、外边框宽度、单元格背景、垂直对齐、文字方向、worker 后续 fragment 顶边补画、worker/SVG/Canvas 单元格内容 clip、表格内浮动图片命中上下文和 OOXML 表格字段正反向映射均已进入回归。 | 复杂 PDF/OOXML 端到端视觉对比继续归属 TS-13/TS-14。 |
| 公式排版 | TS-01、TS-03、TS-13 | 公式 AST、符号库、下拉直插、空白公式控件、页面内编辑、文本型公式控件测量与渲染、公式栏内宽度约束、MathML 正反向解析、OOXML 公式正反向解析，装饰公式和矩阵 displayText 回退。 | 复杂公式跨页拆分、WPS/ONLYOFFICE 大样本往返对比。 |
| 控件融合 | TS-02、TS-03、TS-13 | 初始化选项和值、业务字段绑定、批量失败项、级联选项刷新、远程选项状态、远程选项异步加载、同步校验事件、异步业务校验回调、声明式跨字段规则、校验失败控件高亮、栏内控件 API 回填和命中，复杂 IME/多片段控件在栏内会走完整 layout 守门，OOXML `comboBox/valueSets` 反向导入。 | 内容控件组聚合和复杂控件语义继续归属 TS-13。 |
| 图片与浮动对象 | TS-03、TS-11、TS-14 | 浮动图片锚定坐标、上下层命中、内联图片栏宽适配、`FLOAT_TOP/FLOAT_BOTTOM/SURROUND/TIGHT` 绘制与命中、分栏内浮动锚点、拖拽预览、隐藏过滤、重叠前景命中、表格内浮动图片命中上下文和右键图片属性弹窗均已进入回归。 | DOCX 浮动锚点、复杂图片样式导出和 PDF 输出一致性继续归属 TS-13/TS-14。 |
| OOXML 往返与 SVG 打印 | TS-01、TS-08、TS-13 | 完整映射框架、DOCX package/ZIP 导出、文档样式集合 `IEditorData.styles` 到 `styles.xml` 的段落/字符样式映射、基础字符样式双向映射、公式结构化正反向、展开式控件普通文本分段导出、表格总宽/固定布局/内边距/最小行高/重复表头/边框/背景正反向、`tblCellMar` 可反向恢复 `tdPadding`、主文档文本/超链接/内联图片/浮动锚点图片导入、图片媒体 data URL 回填、默认页眉页脚回导、页面设置反向解析、关系表解析、外部内容控件导入、修订正反向、媒体关系 descriptor 延迟解码、SVG 打印页面结构和表格/控件/水印/页眉页脚/页码/图片/公式覆盖，打印弹窗前等待 SVG 资源和字体就绪，并补充 OOXML 大文档导入导出完整性基线。 | WPS/ONLYOFFICE 人工视觉对比和 PDF 端到端输出一致继续归属 TS-14/后续交付验收。 |

## 下一批开发任务池

| 任务 | 关联推进项 | 主要改造范围 | 依赖 | 验收条件 |
| --- | --- | --- | --- | --- |
| TS-03-A 表格栏内排版 | TS-03、TS-10 | `PagePartitioner`、表格 fragment、表格 position 和渲染快照。 | 现有表格 fragment 能力、栏区域服务。 | 已完成：表格在多栏内按栏宽测量，溢出先入下一栏，最后一栏再分页，fragment 行宽和快照不越栏；重复表头、行高和表格属性策略已在 TS-10 收口。 |
| TS-10-A 表格内容裁剪一致性 | TS-10、TS-13、TS-14 | `PageRenderSnapshotTableCellCommands`、SVG 表格打印、Canvas 表格单元格绘制和内容 clip 区域。 | 现有表格 fragment、单元格内边距和边框 inset 计算。 | 已完成：worker/SVG/Canvas 使用同一单元格内容裁剪矩形，后续 fragment 内容不会穿透边框，并补单元格 clip 对齐回归。 |
| TS-03-B 图片栏内避让 | TS-03、TS-11 | 图片位置策略、浮动图片命中、行布局避让。 | 图片锚定和层级模型。 | 已完成：内联图片在多栏内按当前栏宽等比缩放，位置不越过所在栏；`FLOAT_TOP/BOTTOM/SURROUND/TIGHT` 在页级重排、worker/SVG/canvas、命中、隐藏过滤和 DOM 输入稳定性上有回归覆盖；复杂锚定、属性入口和表格内浮动命中边界已在 TS-11 收口。 |
| TS-03-C 公式栏内测量 | TS-01、TS-03 | 公式测量、公式渲染、行布局宽度约束。 | 公式 AST 和基础序列化。 | 已完成：宽公式在窄栏内按结构化视觉盒等比缩放，不撑破栏宽；复杂公式跨页拆分和 OOXML 大样本往返继续归属 TS-01/TS-13。 |
| TS-03-D 控件栏内输入态 | TS-02、TS-03 | 控件输入、光标命中、局部 patch、选区重绘。 | 控件初始化和批量写入 API。 | 已完成：文本控件在第二栏可 API 回填、真实键入和长文本扩行，控件值 position、光标和折叠选区保持栏上下文；复杂 IME、多片段控件和跨行输入会走完整 layout 守门。 |
| TS-05-A 多栏分页控制组合 | TS-00、TS-03、TS-05 | 段落分页规则、段落块快照、分栏分页器。 | 分栏文本流和段落块快照。 | 已完成：`keepWithNext`、`keepLines`、`widowControl`、段距和行距在多栏下参与换栏并进入段落块快照；`keepWithNext + 块级表格`、跨页局部分栏 `keepLines/widowControl` 已有回归守门。 |
| TS-01-A 公式可视化编辑器 | TS-01 | 公式编辑 UI、公式节点命令、选区和键盘交互。 | 公式 AST、符号库。 | 可插入和编辑分式、根式、上下标、矩阵。 |
| TS-02-A 级联和远程选项 | TS-02 | 控件 schema、选项加载、值校验和事件。 | 初始化选项和值回填。 | 已完成：父控件通过 API 改值后，子控件按 `cascade.valueSetMap` 刷新候选项；远程选项可通过 `controlRemoteOptionLoader` 异步加载并写入状态，失败项可回传业务侧；`controlCrossValidateRules` 覆盖常用跨字段校验。 |
| TS-13-A DOCX 导出最小闭环 | TS-13 | OOXML package、document/styles/numbering、media。 | 完整映射表和第一批字段清单。 | 基准文档可被 WPS/ONLYOFFICE 打开，结构和主要排版保真。 |

## 实施批次

| 批次 | 范围 | 目标 | 不做事项 |
| --- | --- | --- | --- |
| Batch-1 | TS-03-A、TS-05-A | 收口多栏文本、表格和段落分页控制组合。 | 暂不做完整图片环绕和 DOCX 导出。 |
| Batch-2 | TS-03-B、TS-03-D、TS-02-A | 补齐图片、控件在多栏下的交互和业务融合。 | 暂不做 PDF 输出链路。 |
| Batch-3 | TS-01-A、TS-03-C | 推进公式从结构化存储到可编辑和栏内排版。 | 暂不做复杂公式反向导入。 |
| Batch-4 | TS-13-A、TS-08 | 建立 DOCX 第一批导出闭环和样式字段映射。 | 不把最小子集当作完整映射替代。 |

## TS-00 段落块栏页排版中间层

开发功能：

- 段落块模型：把连续行聚合为段落块，记录段落边界、样式、标题/列表/表格/公式/控件等上下文。
- 栏模型：根据页面设置生成栏区域，承接多栏排版、栏内对象避让和栏间流动。
- 页模型：统一管理页内容区域、页眉页脚、页码、水印、页边框、行号、装订线和镜像边距。
- 布局产物改造：让当前行级计算逐步直接产出段落块/栏/页上下文，不引入长期适配器层。
- 规则承载：分栏、段落分页控制、孤行/寡行、keep、表格跨页、公式跨页等规则逐步迁移到中间层。

已落地进展：

- 新增 `ITypesettingLayoutSnapshot`、`ITypesettingPage`、`ITypesettingColumn`、`ITypesettingParagraphBlock` 等只读快照结构，覆盖页、栏、段落块和矩形区域。
- 新增 `TypesettingLayoutStructureBuilder`，在完整布局和打字局部布局提交时直接从 `pageRowList` 生成段落块/栏/页快照，不引入长期中间层适配器。
- 新增 `Editor.getTypesettingLayoutSnapshot()` 与 `command.getTypesettingLayoutSnapshot()` 查询入口，方便调试、测试和后续分页规则消费。
- 段落块快照已支持行内语义分片：标题后直接接普通文本时不强制视觉换行，但快照会拆成 `title` 和 `paragraph` 两个块，避免普通文本继承标题语义；标题、列表和普通段落紧邻时也会按顺序独立成块。
- TS-00 快照构建已拆分职责：`TypesettingLayoutStructureBuilder` 只保留页/栏/块组装，行内语义分片下沉到 `TypesettingLayoutParagraphSegment`，连续片段合并规则下沉到 `TypesettingLayoutParagraphGroup`，避免大文件继续堆叠重复策略。
- 已覆盖 Cypress 场景：标题段落、普通段落、双栏配置、栏宽、段落块行号和元素索引范围、行内标题/正文语义分片、标题/列表/普通段落相邻顺序。
- 交付口径：TS-00 已完成页、栏、段落块中间层和调试查询能力；表格、图片、公式、控件的对象级栏内避让、跨页和导入导出保真继续在对应推进项内闭环，不再阻塞 TS-00。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-00-01 | 中间层数据结构 | 已完成 | 段落块、栏、页结构可序列化并能承载现有行布局结果。 |
| TS-00-02 | 行布局产物改造 | 已完成 | 当前行级计算可直接输出段落块/栏/页上下文，不依赖长期适配器。 |
| TS-00-03 | 页/栏区域计算 | 已完成 | 正文区域、栏区域、页眉页脚区域边界统一可查询。 |
| TS-00-04 | 规则迁移入口 | 已完成 | 分栏和段落分页控制可通过中间层接入；对象级细分规则在对应推进项内继续消费该快照。 |
| TS-00-05 | 调试与测试工具 | 已完成 | 可输出段落块/栏/页调试快照，便于定位排版问题。 |

## TS-01 专业公式能力

开发功能：

- 公式结构化模型：新增公式 AST，保留 LaTeX/MathML/OOXML 公式中间格式。
- 可视化公式编辑器：支持分式、根式、上下标、矩阵、括号组、希腊字母、运算符、公式编号。
- 专业符号库：医院覆盖剂量、浓度、检验指标、统计符号；工厂覆盖工艺参数、工程单位、公差、化学式和反应式。
- 公式排版：支持正文、表格、页眉页脚中的公式测量、换行、缩放和选中。
- 复制粘贴与导出：公式结构不丢失，打印、图片/PDF/DOCX 导出一致。

已落地进展：

- 新增 `IFormula`、`IFormulaNode`、`IFormulaSymbol` 等结构化公式模型，`ElementType.LATEX` 可携带 `formula` 字段。
- `normalizeFormulaFromElement()` 只读取 LATEX 元素显式携带的 `formula` 字段，裸 LATEX 文本不再临时合成结构化模型。
- 扩充通用、医院和工厂公式符号库：通用覆盖基础结构、上下标、大型运算、矩阵、统计、希腊字母和关系符；医院覆盖剂量、体表面积、体格指标、肾功能、检验、生命体征、统计和诊断试验；工厂覆盖公差、工艺、过程参数、物性、化学、质量和设备。
- 新增 `command.getFormulaById(id)` 与 `command.getFormulaSymbolList(domain?)` 查询入口，业务侧可读取结构化公式和专业符号库。
- 新增公式 AST 到 MathML/OOXML 的第一批派生序列化，覆盖文本、符号、分式、根式、上下标和矩阵。
- 公式菜单已从单一 LaTeX 文本框升级为“一级类目 + 二级公式”下拉入口：数学、物理、化学、医院、工厂等类目悬停后展示具体公式，点击具体公式会直接插入光标位置；自定义公式打开专业公式面板，LaTeX 空白公式会直接插入可点击编辑的公式控件。
- 公式面板支持常用结构模板、医院/工厂符号库筛选、搜索、SVG 公式预览和结构化公式数据写入；已有公式可通过右键“编辑公式”回填到面板并更新原结构化公式对象。
- 页面内公式控件已支持点击进入就地可视编辑态，编辑框保持根式、分式、上下标等公式结构，分子、分母、根式内容和脚标字段可直接修改，不再回退到 LaTeX 源码输入；提交后转换回内部公式表达并回写 `formula.ast` 和公式模型。
- 正文插入的公式已从 `laTexSVG` 图片结果切换为文本型公式控件：格式化阶段写入 `formula.displayText`，行内测量和行渲染走 `formula/layout`、`formula/render`，图片命中、拖拽、垂直偏移和 worker 快照不再把 `ElementType.LATEX` 当图片处理。
- 正文公式显示从纯文本近似升级为 Canvas 公式盒模型：支持分式上下排版、分数线、根式横线、上下标偏移和常用数学/希腊符号，避免显示成 `√((...)/(...))` 这类错误文本。
- 新增 MathML 反向解析入口：`command.parseFormulaMathML(mathML, id?)` 可把外部 MathML 解析为内部 `IFormula`，并继续派生 LaTeX、displayText、MathML 和 OOXML；支持分式、根式、上下标、上下标组合和矩阵。
- AST 到 LaTeX 的备用文本生成已进入通用 serializer，MathML/OOXML 回导后也能参与复制、搜索、正文备用显示和 OOXML 再导出。
- 已覆盖 Cypress 场景：结构化公式 AST 保存/读取、裸 LATEX 元素不生成临时模型、数学/物理/化学/医院/工厂符号库查询、MathML/OOXML 片段生成。
- 已覆盖 Cypress 场景：公式菜单可通过可视化模板插入分式 AST，可通过医院符号库插入剂量单位并保留领域标签和符号标识，可从一级类目/二级公式快捷菜单直接插入数学和化学公式，可直接插入空白公式文本控件且不生成正文 `laTexSVG`。
- 已覆盖 Cypress 场景：页面内点击公式控件可进入就地可视编辑态，编辑正常公式上标、根式分式分母内容后可回写结构化公式对象；求和上下限在编辑态保持上下堆叠，不再显示为平铺源码。
- 已覆盖 Cypress 场景：MathML 分式/根式/上下标/矩阵反向解析，公式菜单和就地编辑 18/18，栏内宽公式不越栏，OOXML package/import 公式往返覆盖。
- 交付口径：TS-01 已完成结构化模型、符号库、可视编辑、文本型渲染、栏内测量、MathML/OOXML 正反向和打印/导出基础保真；更复杂的跨页拆分、WPS/ONLYOFFICE 大样本差异继续归入 TS-13/后续增强，不再阻塞 TS-01。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-01-01 | 公式 AST 与元素模型 | 已完成 | 公式可序列化、反序列化、回显编辑。 |
| TS-01-02 | 公式编辑器基础交互 | 已完成 | 可插入和编辑分式、根式、上下标。 |
| TS-01-03 | 专业符号库 | 已完成 | 医院/工厂常用符号可搜索、插入、配置。 |
| TS-01-04 | Canvas 测量与渲染 | 已完成 | 正文和分栏内公式不溢出、不错位；worker 快照可渲染复杂公式。 |
| TS-01-05 | 导入导出映射 | 已完成 | 公式在 MathML/OOXML/DOCX/打印链路中可保真。 |

## TS-02 控件业务数据融合

开发功能：

- 初始化 API：支持创建编辑器时传入控件值、选择项、默认值、只读/禁用/必填/校验规则。
- 数据绑定：统一支持 `controlId/conceptId/externalId/code` 定位控件。
- 选择类控件：支持单选、多选、下拉、级联选择、远程选项懒加载、本地选项快照。
- 批量接口：批量设置、批量读取、按业务字段回填、按控件分组回填，返回失败项和原因。
- 事件回调：控件值变化、选项加载、校验失败、聚焦/失焦、联动变更。

已落地进展：

- 新增 `IEditorOption.controlInitialProperties`，支持创建编辑器时按控件标识注入选项、禁用、只读、样式和业务属性。
- 新增 `IEditorOption.controlInitialValues`，支持创建编辑器时按 `controlId` 或 `conceptId` 回填控件值。
- 新增 `IEditorOption.controlSchema`，支持模板级声明控件业务绑定、入口元素属性、默认选项、必填/校验规则、扩展数据和默认值；实例级 `controlInitialProperties/controlInitialValues` 会在 schema 之后覆盖，方便模板默认值和业务数据分层。
- 初始化属性和值注入已支持 `externalId` 和 `code` 业务字段匹配，方便业务系统按字段编码直接回填。
- 初始化数据在元素格式化前合并到控件模型，避免业务侧创建实例后再二次调用批量接口。
- 批量设置控件值、扩展和属性会返回 `successCount/failureList`，未匹配控件会以 `not_found` 失败项返回，方便业务侧定位字段问题。
- 控件属性重排和 `getValue()` 压缩时会保留控件入口 `externalId`，避免业务字段绑定在写入属性后丢失。
- 控件模型新增 `cascade`、`remote` 和同步校验规则：`cascade` 支持按父控件 `controlId/conceptId/externalId/code` 建立值到候选项的映射；`remote` 支持业务侧记录加载状态、失败信息、数据源和请求标识；`required` 与 `validateRules.pattern` 支持提交前同步校验。
- 父控件通过 `executeSetControlValue()` 或批量值 API 改值后，会自动刷新匹配子控件的 `valueSets`，业务侧可继续用现有属性 API 写入远程选项状态和错误。
- 新增 `IEditorOption.controlRemoteOptionLoader`、`executeLoadControlRemoteOptions()` 与 `executeLoadControlRemoteOptionsList()`，业务侧可按 `controlId/conceptId/externalId/code` 异步加载选择类控件候选项，并同步写入 `valueSets`、`remote.loading/error/source/requestId`。
- 新增 `executeValidateControl()`，可按控件标识或全量校验控件，返回 `isValid/failureList`，并派发 `controlValidate` 事件；展开式文本控件会复用控件块真实值读取，不只依赖入口元素。
- 新增 `IEditorOption.controlValidator` 和 `executeValidateControlAsync()`，业务侧可在同步校验后追加后端校验或跨字段校验失败项，最终结果继续复用 `controlValidate` 事件。
- 新增 `IEditorOption.controlCrossValidateRules`，支持 `equals/notEquals/requiredWhen/emptyWhen` 声明式跨字段校验；按单个控件过滤校验时仍会读取全量控件上下文，保证依赖字段可参与判断。
- `executeValidateControl()` 与 `executeValidateControlAsync()` 支持 `isApplyHighlight`，校验失败时会复用控件高亮覆盖层标记错误控件，空值控件也能整控件高亮；校验通过后会清理校验来源高亮且不覆盖业务自定义高亮。
- 数字控件内 `Enter` 会被拦截为无内容输入，不再写入换行，并通过输入代理 keyup 兜底保证连续输入不会丢最后一个字符。
- 已覆盖 Cypress 场景：`controlSchema` 模板级业务绑定、默认选项、默认规则和默认值、选择控件初始化选项、禁用状态、`conceptId`、`externalId`、`code` 绑定值和显示文本、批量写入失败项返回、级联子控件候选项刷新、远程选项状态写入和查询、远程选项异步加载成功/未命中/类型不支持/加载失败、必填和正则校验结果与事件派发、声明式跨字段校验、异步业务校验追加失败项、校验失败控件覆盖层高亮、数字控件 `Enter` 连续输入回归。
- 交付口径：TS-02 已完成业务数据融合主线；栏内控件复杂输入态继续按 TS-03-D 推进，OOXML 外部内容控件导入导出继续按 TS-13 推进。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-02-01 | `controlSchema` 数据结构 | 已完成 | 模板控件和业务字段可稳定绑定，schema 默认值可被实例级初始化值覆盖。 |
| TS-02-02 | 初始化传值与选项注入 | 已完成 | 创建编辑器即可完成控件填充，外部 `valueSets` 可初始化传入。 |
| TS-02-03 | 批量读写接口 | 已完成 | 批量回填可定位失败项。 |
| TS-02-04 | 级联/远程选项 | 已完成 | 父控件 API 改值后子控件候选项可刷新，远程状态可写入查询；异步加载器可刷新候选项并返回失败项。 |
| TS-02-05 | 控件校验事件 | 已完成 | `executeValidateControl()` 可返回同步、声明式跨字段校验失败项并派发 `controlValidate`；`executeValidateControlAsync()` 可通过 `controlValidator` 追加业务校验失败项；失败控件可按需进入高亮覆盖层。 |

## TS-03 分栏真实排版

开发功能：

- 页面栏区计算：根据栏数、栏间距、自定义栏宽生成 `columnRects`。
- 栏内行流：行满后进入下一栏，栏满后进入下一页。
- 栏内对象：支持图片、表格、公式、控件在栏内测量和避让。
- 选中内容分栏：支持通过命令/API 对当前选区段落设置局部分栏，前后正文仍保持原页面分栏。
- 编辑定位：光标、选区、拖拽、搜索定位在多栏下保持准确。

已落地进展：

- 新增 `PageColumnLayoutService`，统一根据页面尺寸、页边距和 `options.columns` 生成正文区域与栏区域。
- 已补 `PageColumnLayoutService` policy 级测试，覆盖正文区域计算、等宽栏、自定义栏宽、局部分栏覆盖、最窄栏测量宽度、越界栏回退和异常配置归一化。
- 完整布局阶段已按首栏宽度测量文本行，分页器支持“当前栏满后进入下一栏，最后一栏满后进入下一页”。
- `IRow.columnIndex` 已记录行所在栏，`Position` 坐标计算和 `TypesettingLayoutStructureBuilder` 快照会按栏索引落位。
- 已覆盖 Cypress 场景：多行正文在双栏页面内先流入第二栏，快照中两栏均生成段落块，第二栏 position 坐标落在第二栏区域内。
- 已修复分栏 position 污染页眉页脚的问题，正文分栏坐标仅在 `EditorZone.MAIN` 生效，页眉页脚继续使用自身区域高度和起始坐标。
- 已覆盖 Cypress 场景：开启双栏后页眉仍位于页头区域，页脚仍位于页面底部，不被正文首栏坐标覆盖。
- 新增 `IElement.columns` 段落级局部分栏配置与 `command.executeRowColumns(columns | null)` 命令，支持只对选中内容写入分栏设置。
- `PagePartitioner` 已按行所属段落切换局部分栏小节，并记录 `IRow.columns` 与 `IRow.columnStartY`，确保选中内容可从正文中间开始分栏，后续正文从局部分栏最深位置继续排版。
- `RowLayoutEngine` 已在行测量阶段识别段落级 `columns`，长段落会按局部首栏宽度换行，不再按页面整栏宽度横向溢出。
- 选中内容分栏已按局部分栏小节总高度做栏间均衡，并按“前 N-1 栏尽量等高、最后一栏承接剩余内容”的策略分配行，避免 2 栏少 1 栏、3 栏少 1 栏、4 栏少 2 栏的空栏问题。
- `Position` 与 `TypesettingLayoutStructureBuilder` 已消费行级局部分栏上下文，选中内容各栏坐标会落在对应局部栏区域，快照可展示局部分栏段落块。
- 多栏命中已按行带 Y 轴候选与栏 X 轴范围共同解析，避免同一高度下鼠标只能命中第一栏和最后一栏。
- 局部分栏小节已支持跨页续排：短内容继续按小节高度均衡铺满目标栏数，长内容在当前页各栏放满后进入下一页第一栏继续承接，避免整段撑出页面。
- 自定义非等宽栏测量已改为按最窄栏保守换行，避免 `[宽栏, 窄栏]` 场景下第二栏沿用第一栏宽度导致横向溢出。
- 已覆盖 Cypress 场景：选中段落设置双栏后仅选区元素持久化 `columns`，前后正文保持单栏，选区行可流入第二栏且第二栏纵坐标不回到页顶；长段落按局部栏宽重新换行；2/3/4 栏局部分栏均使用完整目标栏数；中间栏点击可命中对应行；超长选区分栏可跨页续排且行坐标不越过页面底部。
- 已覆盖 Cypress 场景：选中内容分栏跨页承接时，局部分栏行的 `columnIndex` 保持在栏范围内，跨页后回到第 0 栏并复位到正文顶部语义，带 `keepLines` 的长段坐标不溢出。
- 块级表格测量已接入当前栏可用宽度，表格原始列宽超过栏宽时会按比例压缩 `colgroup`，表格 fragment 宽度和单元格内容测量保持在栏内。
- 表格 fragment 已覆盖多栏流动：超高表格在当前栏剩余高度不足时优先进入下一栏，最后一栏不足时再分页，并通过 Cypress 验证 fragment 行宽不越过栏宽。
- 内联图片测量已复用当前栏 `availableWidth`，超宽图片进入第二栏时会按栏宽等比压缩，占位宽度和渲染右边界都保持在所在栏范围内。
- 浮动图片已补分栏页基线：第二栏锚点、`imgFloatPosition` / `floatPositionList` 页码和栏内坐标可稳定保存，坐标命中优先命中图片，小幅拖动后仍保持同页同栏范围。
- `SURROUND/TIGHT` 已补页级环绕重排基线：完整 layout 与页级 rebalance 使用同一浮动环绕列表，普通 typing preview、chunk 局部测量和单行 patch 遇到环绕行会跳过不安全局部路径，由页级重排或完整 layout 接管，避免局部测量混入页号和环绕缓存副作用。
- 浮动图片隐藏和命中已补回归：隐藏的 `SURROUND/FLOAT_TOP` 不进入布局缓存、canvas/worker/SVG 绘制和浮动命中；重叠前景浮动图命中按视觉绘制顺序倒序解析，后绘制图片优先生效。
- 公式文本控件测量已接入当前栏可用宽度，宽公式在窄栏内按结构化视觉盒等比缩放，排版占位和实际渲染不会越过当前栏。
- 文本控件已覆盖第二栏 API 回填和点击命中，控件值 position 会落在对应栏范围内，业务值读取保持稳定。
- 栏内控件真实输入态已完成第一批：第二栏文本控件真实键入后，单行局部 patch 会继承源行 `columnIndex / columns / columnStartY` 并按栏宽测量，输入字符 position、光标 position 和折叠选区不会回到第一栏。
- 复杂 IME、多片段控件和跨行控件输入已通过完整 layout 守门保持栏上下文，不再走不安全的单行局部 patch。
- 非等宽栏测量当前采用最窄栏保守换行策略，优先保证任意栏不溢出；更激进的逐栏宽度重排属于空间利用率优化，不再阻塞 TS-03 主线交付。
- 交付口径：TS-03 已完成全局分栏、局部分栏、跨页续排、命中定位、页眉页脚隔离、表格/图片/公式/控件栏内基础能力和环绕图片守门；复杂图片锚定、表格内浮动命中边界和图片属性入口已在 TS-11 收口，导入导出一致继续归属 TS-13/TS-14。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-03-01 | `PageColumnLayoutService` | 已完成 | 多栏区域计算正确，等宽/自定义栏宽/局部分栏覆盖均有 policy 回归。 |
| TS-03-02 | 行布局接入栏宽 | 已完成 | 文本按栏流动，栏满进入下一栏，最后一栏满后分页。 |
| TS-03-03 | 表格/图片/公式/控件栏内处理 | 已完成 | 表格 fragment、内联图片栏宽适配、宽公式、文本控件 API 回填、第二栏控件真实输入、浮动图片分栏命中/拖动基线、`FLOAT_TOP/BOTTOM` 当前布局坐标、`SURROUND/TIGHT` 环绕盒坐标、同栏环绕隔离、页眉页脚浮动图作用域、隐藏浮动图过滤、前景重叠命中和环绕行 DOM 输入稳定性已覆盖。 |
| TS-03-04 | 选区与定位 | 已完成 | 多栏下点击、拖选、搜索定位准确，局部分栏中间栏命中稳定。 |
| TS-03-05 | 选中内容分栏 | 已完成 | 命令/API 可对选中段落局部分栏，前后正文不被污染，长选区可跨页续排。 |

## TS-04 装订线与镜像页边距

开发功能：

- `gutter/gutterPosition/mirrorMargins` 参与页面度量。
- 奇偶页内外边距切换。
- 页边距指示器、打印和导出同步使用最终边距。

已落地进展：

- `DrawMetricsService.getOriginalMargins(pageNo)` / `getMargins(pageNo)` 支持按页码解析镜像页边距和装订线。
- `command.getPaperMargin(pageNo)` 可查询指定页最终页边距，便于业务侧和后续导出链路复用。
- `TypesettingLayoutStructureBuilder` 已按页码读取页面和段落块边距，快照具备页上下文边距基础。
- 已覆盖 Cypress 场景：内侧装订线随奇偶页切换，顶部装订线增加上边距。
- 页边距指示器已接入当前页码：主线程 Canvas2D 和 worker 快照均使用 `draw.getMargins(pageNo)` 绘制四角标记，镜像页边距和内侧装订线下奇偶页提示线与 `command.getPaperMargin(pageNo)` 一致。
- 页码、行号、页边框和区域装饰已接入当前页码：主线程 Canvas2D 与 worker 快照均按 `pageNo` 读取镜像页边距、装订线和当前页正文宽度，非当前页快照不再沿用首页边距。
- 打印/图片导出绘制层已补齐第一批页码上下文：正文绘制宽度、页眉页脚位置、页码、行号、页边框和 worker 快照装饰均按目标页 `pageNo` 取边距。
- 位置与交互层补齐第一批页码上下文：全量/局部 position 重算、列表左侧命中兜底、页边界空白区命中和页眉页脚区域指示器均按当前页读取边距。
- 分栏行宽测量已补页码上下文：`RowLayoutEngine` 计算段落分栏首栏宽度时会透传 `startPageNo + pageNo`，镜像页边距和顶部装订线下不再固定沿用第 0 页栏宽。
- 已覆盖 Cypress 场景：奇偶页 contentRect/columnList、顶部装订线 contentRect/栏区、page 1 position 左边距、SVG pageMetricList 页码/页边框均与目标页边距一致。
- 分页与栏区高度补齐第一批页码上下文：`getMainOuterHeight(pageNo)`、栏区 `contentRect.height` 和分页器新页基础占高均按目标页计算。
- 页眉页脚全宽分隔线补齐页码上下文：分隔线粒子接收 `pageNo`，左右端点和上下边距按当前页镜像边距绘制。
- 局部输入排版补齐第一批页码上下文：typing 预览、单行 patch、chunk 测量、页级 rebalance 和跨页行测量均按目标页读取边距、正文宽度和正文外部高度。
- 交付口径：TS-04 已完成页码上下文边距计算、镜像页边距、内侧/顶部装订线、页边距 UI、主线程/worker/SVG 绘制和 OOXML 页面设置映射；复杂 DOCX/PDF 端到端输出一致继续归属 TS-13/TS-14。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-04-01 | 页码上下文边距计算 | 已完成 | 奇偶页正文区域正确，内侧和顶部装订线可按页码查询。 |
| TS-04-02 | 页边距 UI 与指示器 | 已完成 | 主线程和 worker 页边距指示器、页码、行号、页边框与实际页码边距一致。 |
| TS-04-03 | 打印导出一致性 | 已完成 | SVG pageMetric 和 OOXML 页面设置已按目标页边距输出；复杂 DOCX/PDF 端到端一致继续归属 TS-13/TS-14。 |

## TS-05 段落高级行距与分页控制

开发功能：

- 行距：支持自动、固定值、倍数行距。
- 段距：支持段前、段后。
- 分页控制：支持 `pageBreakBefore/keepWithNext/keepLines/widowControl`。
- 段落块元信息：先收集段落行，再做分页决策。

已落地进展：

- `pageBreakBefore` 已接入 `PagePartitioner`，分页器会在目标段落前开启新页。
- `keepWithNext` 已接入 `PagePartitioner`，当下一行无法与当前行同处一个栏/页时，会提前把当前行换到下一栏/页。
- `keepLines` 已接入 `PagePartitioner`，当整段可在空栏/空页容纳但当前栏剩余空间不足时，会提前把整段移动到下一栏/页。
- `widowControl` 已接入 `PagePartitioner`，段落拆页/拆栏时会避免首行孤立在页底或末行孤立在下一页页顶。
- `lineSpacingType: exact/multiple` 已接入 `RowLayoutEngine`，精确行距和倍数行距会参与真实行盒高度和基线计算。
- `spaceBefore/spaceAfter` 已接入 `RowLayoutEngine`，段前间距进入段落首行纵向偏移，段后间距进入段落末行高度。
- 分页判断发生在行布局之后，避免把段落分页规则塞回字符测量循环。
- 已覆盖 Cypress 场景：普通正文后设置 `pageBreakBefore` 的段落从新页开始。
- 已覆盖 Cypress 场景：设置 `keepWithNext` 的标题不会孤立在页底，会与下一段同页。
- 已覆盖 Cypress 场景：多栏页面中设置 `keepWithNext` 的标题在当前栏放不下下一段时，会与下一段一起进入下一栏，不会孤立在栏底或直接跳页。
- 已覆盖 Cypress 场景：设置 `keepLines` 的多行段落在页底放不下时整体移动到下一页。
- 已覆盖 Cypress 场景：多栏页面中设置 `keepLines` 的多行段落在当前栏放不下整段时，会整体进入下一栏，并在段落块快照中落到对应栏。
- 已覆盖 Cypress 场景：设置 `widowControl` 的多行段落不会产生首行孤立和末行孤立。
- 已覆盖 Cypress 场景：多栏页面中设置 `widowControl` 的多行段落不会把首行孤立在栏底，首两行会一起进入下一栏。
- 已覆盖 Cypress 场景：`exact` 精确行距和 `multiple` 倍数行距会撑开行高。
- 已覆盖 Cypress 场景：`spaceBefore/spaceAfter` 会影响段落首行偏移和末行高度。
- 已覆盖 Cypress 场景：多栏页面中 `exact` 精确行距会参与栏高判断，当前栏放不下时换到下一栏。
- 已覆盖 Cypress 场景：多栏页面中 `spaceBefore` 段前间距会参与栏高判断，当前栏放不下时换到下一栏。
- 段落缩进/对齐偏移策略已下沉到 `ParagraphRowLayoutPolicy`：`normalizeParagraphIndent`、`resolveParagraphOffsetX` 和 `resolveParagraphRightIndent` 作为纯函数供 `RowLayoutEngine` 调用，首行缩进、左/右缩进、悬挂缩进和列表跳过逻辑保持一致，并复用 `issue-725-row-indent` 与菜单行处理回归覆盖。
- 已补段落 row layout policy 级测试，覆盖缩进归一化、首行/悬挂/右缩进、列表跳过、居中/右对齐偏移和两端对齐均分触发条件。
- 已覆盖 Cypress 场景：`keepWithNext` 标题后紧跟块级表格时，标题位于页底或栏底都不会孤立，会与表格首个 fragment 保持同页或同栏。
- 交付口径：TS-05 主线已覆盖单栏、多栏、跨页局部分栏、块级表格首 fragment 组合下的行距、段距、keep 和孤寡行控制；更深的表格重复标题行、表格行高策略已在 TS-10 收口，浮动对象命中边界已在 TS-11 收口，导出端到端一致继续归属 TS-13/TS-14。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-05-01 | 段落行距模型落地 | 已完成 | 自动、精确、倍数行距以及段前段后间距均参与真实行盒、基线、分页和换栏。 |
| TS-05-02 | 段落块分页决策 | 已完成 | `pageBreakBefore`、`keepWithNext`、`keepLines` 在正文、分栏和块级表格前置场景稳定。 |
| TS-05-03 | 孤行/寡行控制 | 已完成 | `widowControl` 可规避页底/栏底首行孤立和页首/栏首末行孤立。 |
| TS-05-04 | 旧 `rowMargin` 换算 | 已完成 | 旧行距/段距数据继续走默认换算，打开后不改变既有排版语义。 |

## TS-06 标题父子树

开发功能：

- 根据标题级别生成稳定标题树。
- 支持 `parentTitleId/childrenTitleIds/path/order`。
- 目录、章节定位、章节拖拽和按章导出统一消费标题树。

已落地进展：

- 新增 `ITitleTree`、`ITitleTreeNode` 标题树查询结果，包含父标题、子标题、路径、顺序、深度、页码和表格上下文。
- 新增 `buildTitleTree()`，按当前正文标题顺序和标题级别生成只读父子树。
- 新增 `Editor.getTitleTree()` 与 `command.getTitleTree()` 查询入口，业务侧可直接获取章节树。
- 新增 `Editor.getTitleTreeNode(titleId)` / `command.getTitleTreeNode(titleId)` 查询入口，业务侧可按标题 id 直接获取节点、父子关系、路径和页码。
- 新增 `getTitleTreeNodeList(titleIds)` 与 `getTitleTreeChildList(titleId)`，支持批量节点查询和直接子标题查询，减少业务侧重复遍历标题树。
- 新增 `Editor.getTitleTreeRange(titleId)` / `command.getTitleTreeRange(titleId)`，标题节点直接携带 `rangeStartIndex/rangeEndIndex/contentStartIndex/contentEndIndex/nextBoundaryTitleId`，按章导出、章节拖拽和业务侧批量处理可复用同一章节范围；表格内标题会返回 `tableId/trIndex/tdIndex`，避免把单元格局部索引误切主文档。
- 新增 `executeLocationTitle(titleId)` 与 `Editor.locationTitle(titleId)`，标题树定位可使用标题语义入口，不必继续依赖目录命名。
- 标题树查询新增按正文数据版本和布局版本失效的缓存，查询结果对外返回克隆对象，避免业务侧修改返回节点后污染内部缓存。
- 目录 worker 已改为复用 `buildTitleTree()`，目录结构由标题树节点转换生成，不再维护第二套标题层级扫描和插入逻辑。
- 已覆盖 Cypress 场景：一、二、三级标题父子关系、路径、顺序和页码。
- 已覆盖 Cypress 场景：章节范围边界、章节元素克隆隔离、缺失标题兜底、目录 worker 消费标题树和标题语义压缩回归。
- 交付口径：TS-06 主线已提供标题树、节点查询、批量查询、子标题查询、章节范围查询、标题定位和目录复用能力；实际章节拖拽 UI、按章导出文件格式和样式系统联动可作为后续业务功能消费这些 API，不再重复实现标题层级推断。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-06-01 | 标题树构建器 | 已完成 | 标题父子关系正确。 |
| TS-06-02 | 标题树缓存与增量更新 | 已完成 | 查询缓存已按正文版本和布局版本失效，目录 worker 已复用标题树。 |
| TS-06-03 | API 查询与定位 | 已完成 | 外部可查询整棵标题树，可按标题 id、id 列表和父标题查询节点，可按标题 id 定位章节，并可查询章节范围。 |

## TS-07 首页奇偶页页眉页脚

开发功能：

- 支持首页不同、奇偶页不同页眉页脚。
- 页眉页脚数据结构支持页面作用域。
- 打印、导出、连续模式保持一致。

已落地进展：

- 当前页眉页脚已具备基础编辑、渲染和正文分栏隔离能力，正文分栏不会覆盖页眉页脚区域坐标。
- 分栏回归已覆盖页眉位于页头区域、页脚位于页面底部的基础场景。
- 已新增 TS-07 最小作用域设计模型：`IEditorData.headerPageScopes` / `footerPageScopes` 支持 `all`、`first`、`odd`、`even`，并提供 helper 按零基页码解析作用域；指定页码的渲染、查询和导出只消费 scoped 数据，不再使用 `header` / `footer` 默认列表兜底。
- TS-07 第一批运行时已接入：`Header` / `Footer` 会按 `pageNo` 选择 scoped 元素列表、行列表和 position，`render()`、`getValue({ pageNo })`、`getOriginValue({ pageNo })`、打印数据过滤、worker getValue 和 SVG/worker frame 数据已开始消费目标页页眉页脚。
- TS-07 OOXML 导出第一批已接入：`headerPageScopes` / `footerPageScopes` 可生成 Word `default` / `first` / `even` 页眉页脚部件引用，`all/odd` 作为 default 语义，不再从旧 `header` / `footer` 生成默认页眉页脚部件。
- TS-07 编辑区切换已接入：Zone 会记录双击进入页眉/页脚时命中的 `pageNo`，当前 header/footer 编辑上下文会按该页解析 `first/even/odd/all` scoped 数据，避免编辑第二页时仍修改默认页眉页脚。
- 已覆盖 Cypress 场景：作用域 helper、无 scoped 数据时返回空页眉页脚、first/even/odd/all runtime 读取、页眉页脚浮动图按页过滤、双击进入页眉页脚、双击 scoped 首页页眉和 even/odd 编辑上下文路由、分栏下页眉页脚坐标隔离、OOXML page settings 和 scoped header/footer package parts。
- 交付口径：TS-07 主线已覆盖内部模型、渲染读取、编辑区切换、`getValue({ pageNo })`、worker/SVG 打印数据和 OOXML 正向导出；更完整的 DOCX 反向导入差异、PDF/图片端到端一致继续归属 TS-13/TS-14。
- 当前限制：first/odd/even 的编辑区切换、连续模式体验、PDF/图片导出完整一致性和 OOXML 反向导入 scoped 页眉页脚仍未完成。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-07-01 | 页眉页脚作用域模型 | 已完成 | first/odd/even/all 可配置，指定页码读取不再使用旧 header/footer 兜底。 |
| TS-07-02 | 渲染和编辑区切换 | 已完成 | 渲染、读取、position、双击进入编辑区和当前编辑上下文均按 pageNo 解析。 |
| TS-07-03 | 导出互通 | 已完成 | worker/SVG 数据过滤和 OOXML default/first/even 页眉页脚引用已完成；PDF/图片端到端一致继续归属 TS-14。 |

## TS-08 样式系统

开发功能：

- 建立正文、标题、引用、列表、表格样式。
- 支持应用样式、更新样式、清除样式。
- 样式与目录、OOXML 映射关联。

已落地进展：

- 已新增 `IDocumentStyle` / `DocumentStyleType` / `IDocumentListStyle`，`IEditorData.styles` 可保存正文、标题、引用、列表和表格样式集合，运行时 `getValue()`、`setValue()` 和 OOXML package 入口均保留该集合。
- 已新增 `DocumentStylePolicy`：支持 `basedOn` 继承、循环继承保护、样式字段合并、直接格式覆盖样式、应用样式、清除样式关联和当前样式识别；标题元素无显式 `styleId` 时仍可识别为 `Heading1-6`。
- 已补公开命令：`executeSetDocumentStyles()`、`executeApplyDocumentStyle()`、`executeClearDocumentStyle()` 和 `getDocumentStyles()`，可供 demo/业务面板初始化样式库、应用样式和回显样式状态。
- 已接入 OOXML `styles.xml` 正向映射：`IEditorData.styles` 中的段落/字符样式会输出真实 `w:style`，覆盖 `basedOn`、`next`、段落对齐、缩进、段前段后、行距、分页控制、制表位、字体、字号、粗斜体、下划线、删除线、颜色、高亮、字距、横向缩放和基线偏移；未进入样式库但元素显式引用的 `styleId` 不再自动生成占位样式。
- 已覆盖回归：`issue-document-style-policy.cy.ts` 验证继承、直接格式覆盖、应用/清除和循环保护；`issue-ooxml-package-parts.cy.ts` 验证显式样式进入 `styles.xml` 且正文段落引用 `pStyle`。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-08-01 | `DocumentStyle` 模型 | 已完成 | `IEditorData.styles` 可保存和复用样式集合。 |
| TS-08-02 | 样式应用命令 | 已完成 | `executeApplyDocumentStyle()` 可对当前段落或选区写入样式，`executeClearDocumentStyle()` 可清除样式关联并保留直接格式。 |
| TS-08-03 | 样式 UI 与回显 | 已完成 | `resolveElementCurrentStyleId()` 和 `getDocumentStyles()` 已提供当前样式识别和业务 UI 回显基础；完整可视化样式库面板可作为后续产品增强。 |
| TS-08-04 | OOXML 样式映射 | 已完成 | `IEditorData.styles` 可导出为 `word/styles.xml` 显式样式定义，旧 `styleId` 占位语义保留。 |

## TS-09 制表位

开发功能：

- 支持左、中、右、小数点、竖线制表位。
- Tab 元素根据制表位定位。
- 标尺或面板可配置制表位。

已落地进展：

- 当前已有 `TAB` 元素和基础测量流程，可承接制表位算法改造。
- 列表 checkbox 命中逻辑已经区分列表符号和 Tab 命中，可作为后续制表位命中处理的参考。
- `IElementStyle.tabStops` 已抽出 `ITabStop` 模型，TAB 测量优先跳到下一个显式制表位，未命中时回退 `defaultTabWidth`。
- 新增 `executeSetTabStops(tabStops | null)` 命令，可对当前段落批量设置、排序、清理制表位，并纳入 `getValue()` 序列化白名单。
- 制表位测量已支持左对齐、居中、右对齐和小数点对齐：右对齐/居中会预读 TAB 后连续文本宽度，小数点对齐会预读小数点前文本宽度。
- 制表位对齐预读已覆盖第一批复杂行内混排：TAB 后连续公式文本控件、上标、下标、控件和普通文本会按真实测量宽度参与右对齐/居中/小数点对齐计算。
- 竖线制表位已接入段落渲染，命中 `alignment: 'bar'` 的 TAB 会在制表位落点绘制竖线。
- worker/offscreen 页面快照已接入竖线制表位命令，命中 `alignment: 'bar'` 的 TAB 会输出同坐标的 `strokePath`，避免离屏渲染漏画竖线。
- demo 顶部菜单已补制表位入口，支持左/右/居中/小数点/竖线 120 快捷设置、自定义多行配置和清除制表位；当前段落存在制表位时按钮会高亮回显。
- rangeStyle 制表位回显已支持多段混合判断：选区内制表位完全一致才回显，不一致时返回空状态，避免工具栏误显示某一段配置。
- demo 顶部制表位菜单已补轻量标尺配置：点击标尺空白位置可新增制表位，多枚制表位按位置排序并显示多个手柄，拖动手柄可移动指定制表位，双击手柄可删除指定制表位。
- 已覆盖 Cypress 场景：显式 `tabStops: [{ position: 120 }]` 会让 TAB 宽度按当前行已占用宽度跳到指定位置。
- 已覆盖 Cypress 场景：通过命令 API 设置制表位后，TAB 会按排序后的第一个可用制表位测量，传入 `null` 可清除配置。
- 已覆盖 Cypress 场景：右对齐、居中和小数点制表位会按后续文本宽度调整 TAB 占位。
- 已覆盖 Cypress 场景：右对齐制表位后接公式文本控件、上标和普通文本时，TAB 宽度会扣除后续混排元素的真实宽度。
- 已覆盖 Cypress 场景：竖线制表位会在 TAB 终点按行高绘制竖线，worker 页面快照会输出同样的竖线命令。
- 已覆盖 Cypress 场景：顶部菜单可把当前段落设置为竖线制表位，并回显按钮和快捷项激活状态。
- 已覆盖 Cypress 场景：跨段选区存在不同制表位时，rangeStyle 返回空制表位状态，顶部菜单不会误激活。
- 已覆盖 Cypress 场景：顶部菜单标尺点击 75% 位置可写入约 180 的制表位位置。
- 已覆盖 Cypress 场景：顶部菜单标尺可连续新增多枚制表位并排序显示，双击第一枚手柄后只保留剩余制表位。
- 制表位测量策略已拆出 `resolveTabMeasure` 和 `resolveTabAlignmentOffset` 纯 helper，覆盖制表位排序、边界回退、对齐 offset、宽度钳制和 metrics 写入，便于后续 WPS 风格标尺继续复用同一测量口径。
- 交付口径：TS-09 已完成制表位模型、命令/API、TAB 布局测量、左/中/右/小数点/竖线对齐、复杂行内预读、主线程/worker 竖线渲染、顶部菜单快捷入口、自定义配置、轻量标尺多手柄交互、rangeStyle 回显和 OOXML 制表位正反向映射第一批闭环；完整 WPS 风格页面标尺、真实页面刻度吸附和拖出标尺删除可作为后续产品化增强，不再作为 TS-09 阻塞项。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-09-01 | 制表位布局算法 | 已完成 | TAB 已支持显式位置、左/中/右/小数点对齐测量，复杂行内混排预读和竖线制表位主线程/worker 渲染已覆盖。 |
| TS-09-02 | 制表位命令/API | 已完成 | 外部可通过命令设置、清空并序列化段落制表位，OOXML 段落制表位正反向映射已进入回归。 |
| TS-09-03 | UI 回显 | 已完成 | 顶部菜单已支持制表位快捷设置、自定义输入、清除、当前段落高亮回显、多段混合空状态，以及轻量标尺多手柄新增、拖动和双击删除。 |

## TS-10 表格属性面板

开发功能：

- 表格宽度、对齐、文字环绕。
- 单元格边距、行高策略、跨页断行、重复标题行。
- 表格样式和边框统一配置。
- 表格内容裁剪一致性：统一 worker、SVG 和 Canvas 的单元格内容 clip 区域，避免长内容、背景、斜线和 fragment 后续片段越界。

已落地进展：

- 当前表格已有分页、fragment、命中和渲染相关基础能力，排版推进中已多次覆盖表格跨页风险。
- TS-03 和 TS-05 已把分栏、keep、widow 等分页规则推进到 `PagePartitioner`，后续表格属性需要继续接入同一分页入口。
- 已补表格布局策略矩阵测试，覆盖 `getTableCellContentInset` 在 `ALL/DASH/EMPTY/EXTERNAL/INTERNAL` 边框策略下的内容 inset，以及单元格直接边框不降低表格派生 inset；`shouldFragmentTableRow` 覆盖单表格行、行内表格溢出、精确边界、普通行和混合块级表格行分支。
- 已补表格重复表头 fragment 策略测试，覆盖 `repeatOnPageStart` 表头复制到 tail fragment 后 fragment 宽高、`colgroup`、表头行 origin 元信息和单元格尺寸/内容不丢。
- 表格 fragment 已进入排版快照验收：多栏内表格 fragment 不越栏的同时，`TypesettingLayoutStructureBuilder` 会把 fragment 的 `logicalTableId` 写回 `table` 段落块，栏快照和扁平 `paragraphBlockList` 可按表格 id 定位跨栏片段。
- worker 表格 fragment 顶边补画已对齐主 Canvas 边框类型：fragment 自身顶边不再把 `EMPTY/DASH/INTERNAL/EXTERNAL` 合成为额外实线，后续 fragment 单元格首行顶边会跳过 `EMPTY/INTERNAL/EXTERNAL`，`DASH` 保留虚线 `strokePath`。
- worker/SVG/Canvas 表格单元格内容裁剪已统一到 `tdPadding + getTableCellContentInset()` 后的内容区，后续 fragment 的 worker `pushClipRect` 和 SVG `clipPath` 均按内容区输出，不再用整格 bounds 裁剪正文内容。
- 表格属性模型已覆盖表格级宽度/列宽、边框类型、边框颜色、边框宽度、外边框宽度、重复标题行、行最小高度、跨页拆行、单元格内边距、背景色、单元格边框、斜线、垂直对齐和文字方向。
- 表格属性入口已由命令、右键菜单和导入导出 API 承接：右键菜单已提供“表格属性”弹窗，可统一修改表格边框类型/颜色/宽度、外侧边框宽度、当前行最小高度、重复标题行、当前单元格背景色和垂直对齐；边框子菜单、单元格边框、自动适配宽度等快捷入口继续保留。
- OOXML 表格属性映射已覆盖表格总宽/固定布局/内边距/最小行高/跨页拆行/重复表头/横向合并/纵向合并/边框/背景/垂直对齐/文字方向，并补充 DOCX 导出、导入和大文档往返守门。
- 交付口径：TS-10 已完成表格属性模型、命令入口、常用 UI 入口、分页策略、渲染快照、SVG 打印和 OOXML 映射第一批闭环；表格内浮动对象命中边界已在 TS-11 收口，复杂 PDF/OOXML 端到端视觉对比继续归属 TS-13/TS-14。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-10-01 | 表格属性模型补齐 | 已完成 | 表格宽度/列宽、边框、外边框、重复标题行、最小行高、跨页拆行、单元格内边距、背景、垂直对齐和文字方向均进入模型与映射回归。 |
| TS-10-02 | 表格属性命令 | 已完成 | 边框类型/颜色/宽度、单元格边框、自动适配宽度和垂直对齐命令可驱动布局重排、fragment 渲染和导出映射。 |
| TS-10-03 | 面板 UI | 已完成 | 右键菜单已提供“表格属性”弹窗，覆盖表格边框、外侧边框、当前行最小高度、重复标题行、当前单元格背景色和垂直对齐；独立属性侧栏可作为后续产品化增强，不影响 TS-10 验收。 |
| TS-10-04 | 单元格内容裁剪一致性 | 已完成 | worker/SVG/Canvas 使用同一单元格内容 clip 区域，长内容、背景、边框、斜线和 fragment 后续片段不越界。 |

## TS-11 图片对象排版增强

开发功能：

- 上下型、穿越型、相对页面/边距/段落锚定。
- 锁定锚点、叠放顺序、环绕边距。
- 图片属性面板统一配置裁剪、边框、阴影、层级。

已落地进展：

- 当前图片已有浮动元素命中、上下层命中优先级和基础位置缓存能力。
- 位置命中已区分正文 direct-hit 与浮动图片前后层命中，后续可继续扩展锚定、环绕和层级。
- `ImageDisplay.TIGHT` 已接入右键菜单、worker 顶层浮动层、前景命中集合、拖拽预览和 SVG/canvas 浮动绘制策略，和 `SURROUND` 共享环绕类浮动语义。
- `SURROUND/TIGHT` 的绘制位置已统一到 `resolveFloatingImageRenderPosition()`，worker、SVG、canvas 和 hit-test 使用同一 `floatPosition` 坐标，避免导出、预览和命中各算一套。
- 隐藏浮动图片已统一过滤：`hide` 图片不会进入浮动缓存、worker 快照、SVG 输出、canvas 绘制和前景命中；动态隐藏/显示后会刷新环绕布局缓存。
- 重叠前景浮动图命中已按视觉绘制顺序倒序解析，后绘制的 `SURROUND/TIGHT` 在重叠区域优先被命中。
- 环绕行输入已明确局部策略：typing preview、chunk 局部测量和单行 patch 遇到 `isSurround` 行会跳过不安全局部路径；正式写回由页级 rebalance 或完整 layout 接管，并通过位置列表断言正文不落入浮动图片盒。
- 图片锚定第一批已落到 `imgFloatPosition.pageNo/x/y` 和浮动 position 缓存：切换到 `FLOAT_TOP/FLOAT_BOTTOM/SURROUND/TIGHT` 时会从当前 layout position 初始化锚定坐标，切回内联时会清理浮动坐标；分栏、分页和拖拽会优先消费当前布局缓存，避免旧坐标污染命中和预览。
- 表格内浮动图片命中边界已由 `resolveTableFloatImageHit()` 承接，命中结果保留 `tableId/trId/tdId/trIndex/tdIndex/tdValueIndex`，避免表格上下文丢失。
- 右键菜单已提供“图片属性”弹窗，覆盖显示方式、宽高、锁定宽高比、锁定尺寸、浮动坐标、边框颜色/宽度/圆角和阴影模糊；原有“文字环绕”快捷菜单继续保留。
- 交付口径：TS-11 已完成图片基础锚定模型、浮动/环绕类型主线、层级命中、隐藏过滤、分栏锚点、表格内浮动命中上下文、属性入口和 SVG/worker/canvas 绘制一致第一批闭环；DOCX 浮动锚点、复杂图片样式导出和 PDF 端到端视觉对比继续归属 TS-13/TS-14。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-11-01 | 图片锚定模型 | 已完成 | `imgFloatPosition.pageNo/x/y`、浮动 position 缓存、分栏页码、拖拽更新和表格内浮动命中上下文均进入回归。 |
| TS-11-02 | 环绕类型补齐 | 已完成 | `FLOAT_TOP/FLOAT_BOTTOM/SURROUND/TIGHT` 已覆盖页级重排、worker/SVG/canvas 绘制、命中、隐藏过滤、重叠前景优先和输入稳定性。 |
| TS-11-03 | 图片属性面板 | 已完成 | 右键“图片属性”弹窗可配置显示方式、宽高、锁定、浮动坐标、边框和阴影，并补菜单回归。 |

## TS-12 中文排版细节

开发功能：

- 禁则、避头避尾、悬挂标点。
- 中西文间距、中文数字、单位组合不拆行。
- 纵横混排字段和竖排互通边界明确。

已落地进展：

- 当前行测量和断行已能承接段落级宽度变化，TS-03 局部分栏长段落已验证按局部栏宽重新换行。
- 中文规则可在现有行布局阶段继续扩展，但需要与英文断词、公式、控件和单位组合共同设计。
- 数字单位组合不拆行完成第一批：数字后单位后缀（如 `%`、`℃`、`kg`、`mg/L` 等）在行尾采用轻量悬挂策略，避免单位被单独挤到下一行。
- 开口标点行尾禁则完成第一批：`（`、`【`、`《` 等开口标点会预读下一个普通文本，当前行空间不足时提前换到下一行。
- 中西文间距完成：`typography.cjkLatinSpacing` 可配置中文与英文/数字相邻时的追加间距，布局会把间距沉淀到前一个元素宽度，让后续元素自然后移。
- 新增 `typography` 中文排版选项，支持通过 `numberUnitSuffixList`、`openingPunctuationList`、`closingPunctuationList` 和 `cjkLatinSpacing` 扩展业务单位库、开口标点禁则、闭口/句读标点行首禁则和中西文间距。
- 行尾悬挂标点判断已提取为 `shouldHangLineEndPunctuation`，闭口/句读标点行首禁则已提取为 `isLineStartForbiddenClosingPunctuation`，和数字单位、开口标点禁则、中西文间距共同沉淀在 `ChineseLineBreakPolicy`，避免规则散落在行布局循环中。
- 已补中文断行 policy 级测试，直接覆盖 `isNumberUnitSuffixElement`、`isLineEndForbiddenOpenPunctuation`、`shouldHangLineEndPunctuation`、`isLineStartForbiddenClosingPunctuation` 和 `shouldApplyCjkLatinSpacing` 的常见单位、组合单位、自定义单位、自定义开口标点、自定义闭口标点、行尾悬挂标点、闭口/句读标点行首禁则、中英/中数间距和非文本边界反例。
- 已覆盖 Cypress 场景：当 `30℃` 刚好到达行尾时，`℃` 保留在当前行，后续中文内容进入下一行；当 `（内` 即将在行尾被拆开时，`（` 会移动到下一行并与后续文字同行；业务配置 `numberUnitSuffixList: ['瓶']` 后，`12瓶` 也不会拆行；业务配置 `openingPunctuationList: ['‹']` 后，`‹内` 也会按开口标点禁则处理；业务配置 `closingPunctuationList: ['‧']` 后，`文‧` 也会按行首禁则保留在上一行；配置 `cjkLatinSpacing` 后，`A中B` 的中西文边界会增加预期宽度。
- 已覆盖 Cypress 场景：闭口标点如 `）`、句读标点如 `，。？！` 在行尾溢出时会保留在上一行，避免独立落到下一行行首。
- 纵横混排本轮按 run 级 `textCombine` 模型、富文本策略和 OOXML `w:eastAsianLayout` 正反向映射作为第一批交付；表格单元格竖排方向已由 TS-10/TS-13 表格属性和 OOXML 映射承接，整篇竖排版式属于后续大样本文档互通，不阻塞 TS-12 验收。
- 交付口径：TS-12 已完成中文专业断行主线、可配置业务单位/标点库、中西文间距、纵横混排字段边界和回归基线；DOCX/PDF 大样本文档视觉一致继续归属 TS-13/TS-14。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-12-01 | 中文断行规则 | 已完成 | 数字单位组合不拆行、开口标点行尾禁则、闭口/句读标点行首禁则、行尾悬挂和业务单位/标点库扩展均已进入 policy 与真实布局回归。 |
| TS-12-02 | 中西文间距 | 已完成 | `typography.cjkLatinSpacing` 已完成真实布局回归，混排文本可按配置追加间距并沉淀到行宽。 |
| TS-12-03 | 竖排与纵横混排 | 已完成 | run 级 `textCombine` 富文本策略和 OOXML 正反向映射已有回归，表格单元格竖排方向由 TS-10/TS-13 承接；整篇竖排版式归入后续大样本互通。 |

## TS-13 OOXML 完整映射与 DOCX 导入导出

开发功能：

- 建立内部模型到 OOXML 的完整映射表。
- 覆盖 document、styles、numbering、settings、header/footer、media、comments、revisions、formula。
- 完成 DOCX 导出、导入、回归对比。

已落地进展：

- 新增 [内部模型到 OOXML 映射推进文档](./ooxml-model-mapping.md)，先列完整映射框架，再标出第一批最小可验证子集。
- 已覆盖 package、页面设置、段落、字符样式、标题、列表、表格、图片、公式、控件、修订等对象的映射状态。
- 已明确先做内部模型到 OOXML 的完整字段梳理，再推进可运行的最小导入导出子集，避免后续补字段时破坏结构。
- 已完成 OOXML 第一批页面设置工具，覆盖 px/twip、字号 half-point、颜色归一化、`w:pgSz`、`w:pgMar`、`w:gutter`、`w:cols`、`w:pgNumType`、`w:lnNumType`、`w:pgBorders`、`w:background`、`w:sectPr` 和 `word/settings.xml` 生成。
- 已完成 DOCX package 最小 XML 部件生成器，覆盖 `[Content_Types].xml`、`_rels/.rels`、`docProps/core.xml`、`docProps/app.xml`、`word/document.xml`、`word/_rels/document.xml.rels`，正文支持 ZERO 段落拆分、文本 run、字体/字号/加粗/斜体/下划线/删除线/颜色/高亮/字符间距/横向缩放/基线偏移/空心/阴影/纵横混排、软换行、段落对齐、空格保留、分页符、制表符、分隔线、外部超链接、标题书签、内容控件、日期控件、复选/单选控件、结构化公式 `m:oMath` 和基础表格。
- 已完成段落高级属性 OOXML 正向映射，覆盖 `w:ind` 缩进、`w:spacing` 段距/行距、`w:tabs` 制表位、`w:pageBreakBefore`、`w:keepNext`、`w:keepLines` 和 `w:widowControl`。
- 已完成表格第一批 OOXML 正向映射，覆盖 `w:tblGrid`、`w:tblW`、`w:tblLayout fixed`、`w:tblCellMar`、`w:tr`、`w:tc`、`w:tblStyle` 表格样式 id、列宽、最小行高、跨页拆行开关、重复表头、单元格宽度、`gridSpan` 横向合并、`vMerge restart` 纵向合并起点、`vMerge` continuation 单元格补齐、`w:tblBorders` 表级边框、`w:tcBorders` 单元格显式边框、`tr2bl/tl2br` 斜线边框、`w:shd` 背景色、`w:vAlign` 垂直对齐和 `w:textDirection` 竖排文本。
- 已新增 `editor.command.getOoxmlPackageParts()`，业务侧可先获取当前文档最小 OOXML package XML 部件用于调试、自行打包或后续 DOCX 生成链路。
- 已完成无压缩 ZIP 打包器，新增 `editor.command.getOoxmlDocxBlob()`，可直接获取最小 DOCX Blob。
- demo 顶部工具栏已新增 DOCX 导出入口，便于手动下载后用 WPS/ONLYOFFICE 验证。
- 已完成 `word/styles.xml` 第一批导出，覆盖 Normal、Heading1-6、自定义段落样式占位、默认字体/字号继承、`document.xml.rels` 样式关系和 `[Content_Types].xml` 样式声明。
- 已完成 `word/fontTable.xml` 第一批导出，采集默认字体和正文/页眉/页脚/表格中的显式字体，补齐 fontTable content type 与 document relationship，并在 styles 中增加 EastAsia 字体提示和中文语言属性，减少导出后字体丢失和文字发虚。
- 已完成 `word/numbering.xml` 第一批导出，覆盖有序列表、无序项目符号和复选框列表，正文段落可写入 `w:numPr`。
- 已完成 package 级样式和编号采集范围扩展，`word/styles.xml` 与 `word/numbering.xml` 会同时扫描正文、页眉和页脚，避免页眉页脚自定义样式或列表缺失定义。
- 已完成 DOCX 标准属性部件第一批导出，生成 `docProps/core.xml` 与 `docProps/app.xml`，并补齐 content type、根关系和 ZIP 打包回归。
- 已完成 `word/settings.xml` 第一批导出，覆盖 `mirrorMargins` 镜像页边距开关、settings content type 和 document relationship。
- 已完成 media 图片资源第一批导出，支持 data URL 图片抽取为 `word/media/*` 二进制资源，`document.xml.rels` 写入 image 关系，正文输出 DrawingML 内联图片。
- 已完成页眉页脚部件第一批导出，支持 TS-07 `headerPageScopes` / `footerPageScopes` 的 Word `default` / `first` / `even` 部件引用，补齐 content type、document relationship、part relationships、样式/编号/media 收集和 scoped default 优先级回归；旧 `header/footer` 不再作为默认部件兜底。
- 已完成文本水印 OOXML 第一批导出，复用默认页眉承载 VML `w:pict/v:shape/v:textpath`，无显式页眉但有文本水印时会自动生成默认页眉引用；水印 VML 盒子已按文字尺寸和页面上限约束，避免导出后被整页比例拉伸；图片水印和 repeat 平铺待后续扩展。
- 已完成标题和业务控件 OOXML 语义修正：`titleId` 导出稳定 `w:bookmarkStart/w:bookmarkEnd`；网页业务控件、日期、复选框和单选框导出时统一解析为普通文本 run，只保留用户可见值；外部 Word 内容控件 `w:sdt` 仅作为导入支持能力保留。
- 已完成展开式控件 DOCX 导出样式分段：控件外层 `{}` 不导出，`preText/value|placeholder/postText` 会拆成独立普通文本 run，避免占位灰色污染“其他：”等前置业务提示；SVG 打印同步按片段拆分，控件提示内容使用 `control.placeholderColor`，且移除前缀后不再保留占位片段前的多余空白。
- 已完成结构化公式 OOXML 导出修正：旧数据中只包裹原始 LaTeX 文本的公式 AST 会在导出前重新解析为公式结构，`{E_k} = hv - {W_0}`、分式、根式和上下标可输出 Word 原生 `m:oMath`，不再把原始 LaTeX 文本写入 DOCX。
- 已完成 OOXML 导入导出大文件拆分：`OoxmlPackage.ts` 收口为 package 部件组装、document/header/footer XML 和 DOCX Blob 入口，公共 XML 常量/转义、run、段落/正文、分隔线、控件、公式、水印、表格导出分别拆入独立模块；`OoxmlDocumentImport.ts` 保留主文档、段落和 run 解析，图片、公式、表格导入分别拆入 `OoxmlImageImport.ts`、`OoxmlFormulaImport.ts`、`OoxmlTableImport.ts`，表格通过段落解析回调复用单元格正文导入逻辑。
- 已完成 SVG 矢量打印第一批主线化：打印链路从 Canvas 位图输出切换为 SVG 页面输出，覆盖页面背景、文本水印、表格背景/边框/斜线、行级分隔线、列表标记、复选/单选粒子、文字装饰、控件边框、页眉页脚、页码、页边框、内联/浮动图片、签章和公式文本兜底，解决打印图片不清晰和 HTML 转换样式丢失的问题。
- 已完成 SVG 打印模块拆分：`src/editor/utils/print.ts` 仅保留旧图片打印入口和 SVG 导出转发，`src/editor/utils/print/svg.ts` 仅保留公开导出；实现按 `types/core/inline/shape/decoration/table/document` 拆分，降低后续表格、控件、页眉页脚和水印排查成本。
- 已完成修订留痕 OOXML 第一批正向映射：内部 `trackChange` 导出为 run 级 `w:ins/w:del`，保留修订 id、作者和时间，并补充插入/删除结构回归。
- 已完成修订留痕 OOXML 第一批反向导入：`w:ins/w:del` 可恢复内部 `trackChange.type`、`id`、`author`、`timestamp`，`w:delText` 可作为删除文本回导，缺少包装节点时生成可用兜底删除修订。
- 已完成 DOCX 导入第一批骨架，新增无压缩 ZIP package 解析、文本部件解码、`word/document.xml` 提取和最小导入包返回。
- 已完成 WordprocessingML 到内部模型的第一批转换：`w:body/w:p/w:r` 中的 `w:t`、`w:tab`、`w:br` 和 `w:br w:type="page"` 可恢复为内部 `IEditorData.main` 文本、TAB、软换行和分页符，并按 ZERO 约定恢复段落结束。
- 已完成基础字符样式第一批反向解析：`w:rPr` 中的 `rFonts`、`sz`、`b`、`i`、`u`、`strike`、`vertAlign`、`color`、`shd/highlight` 可恢复为内部字体、字号、加粗、斜体、下划线、删除线、上下标、颜色和高亮字段，和当前正向导出保持对齐。
- 已完成高级字符样式第一批反向解析：run 级 `w:w`、`w:spacing`、`w:position`、`w:outline`、`w:shadow`、`w:eastAsianLayout` 可恢复为内部横向缩放、字间距、基线偏移、空心、阴影和纵横混排字段。
- 已完成段落高级属性第一批反向解析：`w:pPr` 中的 `w:jc`、`w:ind`、`w:spacing`、`w:tabs`、`w:pageBreakBefore`、`w:keepNext`、`w:keepLines`、`w:widowControl` 可恢复为内部对齐、缩进、段距、行距、制表位和分页控制字段，导出后回导能保留段落格式。
- 已完成段落语义第一批反向解析：`w:pStyle` 中的 `Heading1-6` 可恢复内部 `TitleLevel`，自定义段落样式可恢复 `styleId`；`w:numPr` 可恢复列表层级和基于 OOXML `numId` 的稳定 `listId`，保证导入后仍能按列表语义继续导出。
- 已完成文档关系表第一批导入：`word/_rels/document.xml.rels` 可解析为 rId 查询表，正文导入已可结合 `w:hyperlink r:id` 恢复内部 `ElementType.HYPERLINK`、`hyperlinkId` 和 URL；内联图片和默认页眉页脚资源已完成第一批回导，外链图片、浮动图片和 first/odd/even 页眉页脚作用域继续后续扩展。
- 已完成内联图片 DOCX 反向导入第一批：`w:drawing/wp:inline/a:blip r:embed` 可结合 document relationships 恢复为内部 `ElementType.IMAGE`，保留关系 id、media target 和 `wp:extent` 显示宽高；当导入方传入 DOCX package parts 时，可继续从 `word/media/*` 读取图片字节并回填为 data URL。
- 已完成浮动/环绕图片 OOXML 锚点第一批正反向映射：`SURROUND/TIGHT/FLOAT_TOP/FLOAT_BOTTOM` 导出为 `wp:anchor`，按 `wrapSquare/wrapTight/wrapNone` 和 `behindDoc` 表达环绕与层级，`imgFloatPosition.x/y` 以页面相对 `posOffset` 写入；导入侧可从 `wp:anchor` 恢复 `imgDisplay`、`imgFloatPosition`、尺寸、relationship 和媒体 data URL。
- 已完成 OOXML 公式反向导入第一批：`m:oMath` 可恢复为内部 `ElementType.LATEX` 和 `formula.ast`，覆盖 `m:r/m:t` 文本、`m:f` 分式、`m:rad` 根式、`m:sSub/m:sSup/m:sSubSup` 上下标和 `m:m` 矩阵，导入后同步生成 LaTeX 序列化文本、displayText 和保留原始 OOXML 片段。
- 已完成 OOXML 块级公式入口反向导入：`m:oMathPara` 可在段落或 body 直接子级中恢复内部公式元素，避免 Word 块级公式在正文导入时被跳过。
- 已完成页面设置第一批反向解析：`w:pgSz`、`w:pgMar`、`w:cols`、`w:lnNumType`、`w:pgNumType`、`w:pgBorders` 和 `w:background` 可恢复为内部页面大小、方向、边距、装订线、分栏、行号、页码、页面边框和背景色。
- 已完成表格默认单元格内边距反向解析：首个表格级 `w:tblCellMar` 可恢复为全局 `options.table.tdPadding`，显式 `0` 不再被默认值覆盖，与导出侧 `w:tblCellMar` 形成基础往返。
- 已完成 OOXML 导入热路径继续收口：表格导入和公式导入中的单槽位 direct child 查询改为直接遍历首个匹配元素，保留矩阵、方程组、分隔符多参数、表格行列和边框集合等全量列表语义，减少大文档导入临时数组创建。
- 已完成页面设置与图片导入热路径补强：页面设置导入的首个元素和直接子元素查找不再依赖 `Array.from` materialize DOM 集合；图片导入一次遍历 `w:drawing` 后代收集 `blip/extent/ext`，并把 data URL cache 命中提前到读取媒体字节前。
- 已完成 settings、package 和 ZIP 导入拆分继续收口：`word/settings.xml` 直接子元素存在性判断改为短路遍历；`OoxmlImport.ts` 中 ZIP 读取、parts/textParts 解码和 `document.xml` 提取拆入 `OoxmlZipImport.ts`；package 页眉页脚行内关系判断不再先完整生成 relationship XML。
- 已完成 OOXML DOM helper 与内容控件导入拆分：新增 `OoxmlDom.ts` 收口 localName 匹配、首个后代元素、直接子元素、parsererror 和属性读取 helper，并先接入页面设置/settings 导入；`w:sdt` 内容控件导入拆入 `OoxmlControlImport.ts`，通过 context 注入 run/paragraph 解析器，避免和主文档导入形成运行时循环。
- 已补 DOCX ZIP 错误路径回归：可解析但缺少 `word/document.xml` 的 package 会抛出明确错误，不会静默生成空导入结果；未知 `w:sdt` 内容控件会回退为普通文本并保留 ZERO 段落结束。
- 已完成段落导出策略函数拆分：`createOoxmlParagraphModels` 中的 ZERO 分段、段落结束符判断和列表/标题隐式断段判断提成独立小函数，保持现有 DOCX 段落输出行为不变，降低后续列表/标题串段修复成本。
- 已完成媒体关系 descriptor 延迟解码：`.rels` 生成只收集图片 relationship/path/contentType 描述，不提前解码 data URL；真正写入 `word/media/*` 时才复用请求级 decode cache，避免关系判断阶段重复解码或 malformed payload 影响关系 XML。
- 已新增 OOXML 大文档导入导出完整性基线：通过较大正文、超链接、内联 SVG 图片、表格、页眉页脚和页面 options 的 DOCX round trip 记录导出/导入耗时，不设性能阈值，只断言关键字段不丢，作为后续 200/500 页优化的轻量守门。
- 交付口径：TS-13 已完成当前内部模型到 OOXML 的映射表、DOCX package/ZIP、正文/页眉页脚/页面设置/样式/字体表/编号/media/表格/公式/控件普通文本/修订的第一批正反向闭环，并补齐内联与浮动图片锚点、大文档完整性和模块拆分/热路径基线；外链图片下载、完整样式系统继承、多级编号高级格式、内容控件组聚合、复杂删除节点和 WPS/ONLYOFFICE 人工视觉对比作为后续增强或 TS-08/TS-14 验收项，不再阻塞 TS-13。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-13-01 | 完整映射表 | 已完成 | `ooxml-model-mapping.md` 已覆盖 package、页面设置、段落/字符、标题/列表/表格/对象、API 和后续验收边界，每个当前内部模型字段均有映射、派生规则或后续归属说明。 |
| TS-13-02 | 导出 DOCX | 已完成 | 已具备 package、ZIP、样式、字体表、编号、media、页眉页脚、标题书签、控件普通文本分段、结构化公式、修订、表格 continuation、内联图片和浮动/环绕图片 `wp:anchor` 导出。 |
| TS-13-03 | 导入 DOCX | 已完成 | 已完成 package parts、`word/document.xml` 文本正文/基础字符样式/超链接/内联图片/浮动锚点图片、图片媒体 data URL 回填、OOXML 公式、页面设置、表格、document relationships、外部内容控件导入和修订插入/删除第一批解析。 |
| TS-13-04 | 回归对比 | 已完成 | 已有导出后文本正文回导、页面设置回导、关系表解析、内联/浮动图片回导、控件/公式/表格/修订回归、SVG 打印页面结构和 OOXML 大文档完整性基线。 |
| TS-13-05 | OOXML/SVG 模块拆分与性能基线 | 已完成 | 已完成 OOXML 导入导出、SVG 打印模块拆分，补齐重复图片/公式缓存、DOM 热路径优化、ZIP 导入拆分、media descriptor 延迟解码和大文档 round trip 完整性基线。 |

## TS-14 PDF 导出主线化插件化

开发功能：

- 确认 PDF 能力合并主线或插件化。
- 保证页面尺寸、边距、页码、水印、公式、表格跨页一致。
- 建立 PDF 基准输出和像素/结构对比。

已落地进展：

- 当前排版快照已具备页、栏、段落块和矩形区域数据，可作为 PDF 输出复用页面度量的基础输入。
- TS-04 已补页码上下文边距查询，后续 PDF 可复用同一套边距计算，避免预览与输出不一致。
- 当前限制：PDF 架构仍未决策，尚未建立输出基准、像素对比和插件/主线边界。

开发拆分：

| 子项 | 功能 | 状态 | 验收 |
| --- | --- | --- | --- |
| TS-14-01 | PDF 架构决策 | 未开始 | 明确主线或插件方案。 |
| TS-14-02 | PDF 输出链路 | 未开始 | 基准文档可稳定输出 PDF。 |
| TS-14-03 | PDF 回归测试 | 未开始 | 输出差异可追踪。 |

## 近期推进顺序

| 顺序 | 推进项 | 目标 | 退出条件 |
| --- | --- | --- | --- |
| 1 | TS-03 分栏真实排版 | 已完成文本分栏、选中内容分栏、工具栏入口和点击输入回归。 | 文本分栏、局部分栏、中间栏命中、页眉页脚分栏回归全部通过。 |
| 2 | TS-03-03 栏内对象处理 | 已完成表格 fragment、图片避让、公式和控件的栏上下文。 | 表格/图片/公式/控件在栏内不越界，跨栏/跨页行为已有 Cypress 覆盖。 |
| 3 | TS-00/TS-05 规则迁移 | 已完成段落分页控制向段落块/栏/页布局产物沉淀。 | keep、widow、段距、行距在单栏、多栏、跨页局部分栏和块级表格组合下有回归守门。 |
| 4 | TS-01 公式能力 | 从结构化模型推进到可编辑、可渲染和 OOXML 往返。 | 医院/工厂公式可插入、编辑、渲染、导入导出。 |
| 5 | TS-02 控件融合 | 补齐级联/远程选项、校验和事件。 | API 初始化、批量回填、联动和校验可用于业务模板。 |
| 6 | TS-13 OOXML | 从完整映射表推进到第一批 DOCX 导出/导入最小闭环。 | 基准文档可被 WPS/ONLYOFFICE 打开，往返差异可记录。 |

## 更新记录

| 日期 | 更新 |
| --- | --- |
| 2026-06-06 | 文档与 API 边界收口：补充 `command/draw/render-backend/export/ooxml` README，明确富文本命令、Draw 门面、渲染后端统计、OOXML 导入导出模块职责；正式 API 文档已补 `getOoxmlPackageParts()`、`getOoxmlDocxBlob()`、`executeLoadControlRemoteOptions()` 和 `executeLoadControlRemoteOptionsList()`；正式数据结构文档已补控件 `valueSets`、远程选项加载、OOXML package 和 DOCX 导入结果结构；`ooxml-model-mapping.md` 新增源码索引、Command API 对应关系和新增字段同步要求；渲染后端统计命名已统一到 `failover*` 当前字段，主流程不再保留历史别名。 |
| 2026-06-05 | TS-00 命名继续收敛：将栏宽、表格命中、表格快照、OOXML 控件导出、公式视觉盒、worker 公式命令、SVG 打印默认页边距、修订估算矩形和图片加载失败占位图中的非备用路径命名改为 `default/edge/estimated/placeholder` 等明确语义；block 导出 Canvas 绘制器已改为 `BlockExportCanvasRenderer`；剩余备用路径命名仅保留在真实备用路径/统计字段中；`npm run type:check` 通过，公式栏宽回归 1/1 通过。 |
| 2026-06-05 | TS-00/TS-07 冗余清理继续推进：页眉页脚 runtime 已收口为 `headerPageScopes/footerPageScopes` 单一运行时来源，`Header/Footer` 不再维护旧 `elementList/rowList/positionList` 存储，`getValue()` 全量输出不再回写旧 `header/footer`；同步清理内部误导性命名和注释，渲染后端真实备用路径保留为明确的 Canvas2D 备用路径语义；`npm run type:check` 通过，页眉页脚 scoped/dblclick/API/page context/column position 回归 31/31 通过。 |
| 2026-06-04 | TS-13 OOXML 完整映射与 DOCX 导入导出收口到已完成：图片导出新增浮动/环绕 `wp:anchor`，`SURROUND/TIGHT/FLOAT_TOP/FLOAT_BOTTOM` 按 `wrapSquare/wrapTight/wrapNone`、`behindDoc` 和页面相对 `posOffset` 映射，导入侧可恢复 `imgDisplay`、`imgFloatPosition`、尺寸、relationship 和媒体 data URL；映射文档同步更新图片资源、图片元素和 API 状态，TS-13 子项全部切为已完成；OOXML package/import/ZIP/page settings/large integrity 回归 102/102 通过，`npm run type:check` 通过。 |
| 2026-06-04 | TS-12 中文排版细节收口到已完成：新增 `typography.closingPunctuationList`，闭口标点和 `，。？！` 等句读标点统一纳入行首禁则，业务可扩展自定义闭口/句读标点；中文断行策略覆盖数字单位组合不拆行、开口标点行尾禁则、闭口/句读标点行首禁则、行尾悬挂、中西文间距和非文本边界反例；真实布局新增自定义闭口标点 `文‧` 不拆行回归，TS-12 相关中文断行/标点布局/纵横混排策略回归 17/17 通过，`npm run type:check` 通过。 |
| 2026-06-04 | TS-11 图片对象排版增强收口到已完成：新增右键“图片属性”弹窗，覆盖显示方式、宽高、锁定、浮动坐标、边框和阴影；图片锚定第一批以 `imgFloatPosition.pageNo/x/y` 和浮动 position 缓存为主线，`FLOAT_TOP/FLOAT_BOTTOM/SURROUND/TIGHT` 已覆盖页级重排、worker/SVG/canvas 绘制、命中、隐藏过滤、重叠前景优先、分栏锚点、拖拽预览、表格内浮动命中上下文和输入稳定性；TS-11 回归 82/82 通过，`npm run type:check` 通过。 |
| 2026-06-04 | TS-09 制表位收口到已完成：`ITabStop` 模型、`executeSetTabStops()` 命令、TAB 显式制表位测量、左/中/右/小数点/竖线对齐、复杂行内混排预读、主线程/worker 竖线制表位渲染、顶部菜单快捷设置、自定义配置、轻量标尺多手柄交互、多段混合空回显和 OOXML 制表位正反向映射均进入验收链路；制表位布局/UI/API 与 OOXML package/import 回归 103/103 通过，`npm run type:check` 通过。 |
| 2026-06-04 | TS-10 表格属性面板收口到已完成：表格属性模型覆盖宽度/列宽、边框类型颜色宽度、外边框宽度、重复标题行、最小行高、跨页拆行、单元格内边距、背景、垂直对齐和文字方向；右键菜单新增“表格属性”弹窗并补回归，常用属性入口由命令、右键菜单和 API 承接，worker/SVG/Canvas 内容裁剪、后续 fragment 顶边补画和 OOXML 表格字段正反向映射进入验收链路；表格属性菜单回归 1/1、表格布局/渲染回归 15/15、OOXML package/import/大文档完整性回归 83/83 通过，`npm run type:check` 通过。 |
| 2026-06-04 | TS-07 首页/奇偶页页眉页脚收口到已完成：Zone 新增当前页眉/页脚 `pageNo` 状态，双击进入页眉/页脚时会记录命中页码，当前编辑上下文按该页解析 `headerPageScopes/footerPageScopes` 的 `first/even/odd/all` 数据；runtime、双击编辑、分栏坐标、OOXML 页面设置和 scoped header/footer package parts 回归合计 68/68 通过，`npm run type:check` 通过。 |
| 2026-06-04 | TS-06 标题父子树收口到已完成：标题树节点补齐章节范围 `rangeStartIndex/rangeEndIndex/contentStartIndex/contentEndIndex/nextBoundaryTitleId`，新增 `Editor.getTitleTreeRange(titleId)` / `command.getTitleTreeRange(titleId)` 返回克隆后的章节元素列表，按章导出、章节拖拽和业务侧批量处理可统一消费标题树；标题树、目录和标题语义相关 Cypress 回归 3/3 通过，`npm run type:check` 通过。 |
| 2026-06-04 | TS-05 段落高级行距与分页控制收口到已完成：`pageBreakBefore`、`keepWithNext`、`keepLines`、`widowControl`、精确/倍数行距、段前段后间距均进入段落块分页决策；单栏、多栏、跨页局部分栏和 `keepWithNext + 块级表格` 组合已有回归守门；TS-05 相关 Cypress 回归 29/29 通过。 |
| 2026-06-04 | TS-04 装订线与镜像页边距收口到已完成：`DrawMetricsService`、位置/交互、主线程绘制、worker 快照、SVG pageMetric 和 OOXML 页面设置均按 `pageNo` 读取镜像页边距与装订线；内侧装订线、顶部装订线、页边距指示器、页码、行号、页边框、分栏栏区和局部输入排版进入验收覆盖；TS-04 相关页边距/分栏/OOXML 回归 76/76 通过。 |
| 2026-06-04 | TS-03 分栏真实排版收口到已完成：全局分栏、选中内容局部分栏、跨页续排、页眉页脚隔离、表格 fragment、内联/浮动图片、宽公式和栏内控件输入均进入验收覆盖；复杂 IME/多片段控件走完整 layout 守门，非等宽栏采用最窄栏保守测量作为主线交付策略；`issue-page-column-layout-policy`、`issue-page-columns-*`、`issue-header-footer-column-position`、`issue-1372-1200-image-surround` 等 TS-03 回归 36/36 通过。 |
| 2026-06-03 | TS-02 控件业务数据融合收口到已完成：新增 `controlCrossValidateRules` 声明式跨字段校验，覆盖 `equals/notEquals/requiredWhen/emptyWhen`，过滤校验单个控件时仍保留全量依赖字段上下文；数字控件 `Enter` 拦截补齐输入代理兜底，连续输入不再丢字符；`npm run type:check` 通过，控件初始化/跨字段 10/10、控件 API 回归 60/60、分栏控件回填 5/5 通过。 |
| 2026-06-03 | TS-01 专业公式能力收口到已完成：新增 MathML 反向解析和 `command.parseFormulaMathML(mathML, id?)`，MathML 可恢复内部 AST 并继续派生 LaTeX/displayText/MathML/OOXML；AST 到 LaTeX 备用文本生成进入通用 serializer；`npm run type:check` 通过，公式结构化 5/5、公式菜单/编辑 18/18、栏内公式 1/1、OOXML package/import 82/82 回归通过。 |
| 2026-06-03 | TS-00 去冗余和大文件拆分完成：`TypesettingLayoutStructureBuilder` 从约 540 行收口到页/栏/块组装职责，行内语义分片拆到 `TypesettingLayoutParagraphSegment`，段落块分组合并拆到 `TypesettingLayoutParagraphGroup`；继续清理未使用分组字段、重复类型别名和重复语义判断；`npm run type:check` 通过，`issue-typesetting-layout-snapshot.cy.ts` 回归 3/3 通过。 |
| 2026-06-03 | TS-00 段落块/栏/页排版中间层收口到已完成：`TypesettingLayoutStructureBuilder` 支持行内语义分片，标题后直接接普通文本时不强制换行但快照拆成独立 `title`/`paragraph` 块；标题、列表、普通段落紧邻时保持块顺序和语义隔离；`npm run type:check` 通过，`issue-typesetting-layout-snapshot.cy.ts` 回归 3/3 通过。 |
| 2026-06-03 | TS-10 表格内容裁剪一致性完成第一批：worker `pushClipRect` 和 SVG `clipPath` 均按 `tdPadding + contentInset` 收缩到单元格内容区，对齐主 Canvas 裁剪语义；`table-pagination-border.cy.ts` 回归扩展到 4/4 通过，`npm run type:check` 通过。 |
| 2026-06-03 | TS-10 表格 fragment worker 边框补画完成第一批：worker 后续 fragment 顶边补画按 `ALL/DASH/EMPTY/EXTERNAL/INTERNAL` 对齐主 Canvas，`EMPTY` 不再生成顶边命令，`DASH` 不再生成实心 `fillRect` 且保留虚线 `strokePath`；`table-pagination-border.cy.ts` 回归 2/2 通过，`npm run type:check` 通过。 |
| 2026-06-03 | TS-03-B/TS-11 环绕浮动图片继续收口：`SURROUND/TIGHT` 完成页级 rebalance、worker/SVG/canvas 绘制坐标、隐藏过滤、前景重叠命中和 DOM 输入稳定性回归；typing preview、chunk 局部测量和单行 patch 遇到环绕行会跳过不安全局部路径，由页级重排或完整 layout 接管。 |
| 2026-06-02 | TS-13-03 OOXML 块级公式反向导入完成第一批：正文段落和 body 直接子级均可识别 `m:oMathPara`，并恢复其中 `m:oMath` 为内部结构化公式元素；新增块级公式导入回归，`npm run type:check` 通过，DOCX import 回归 15/15 通过。 |
| 2026-06-02 | TS-13-03 高级字符样式 DOCX 反向导入完成第一批：run 级 `w:w/w:spacing/w:position/w:outline/w:shadow/w:eastAsianLayout` 可回导 `textScale/letterSpacing/textPosition/textOutline/textShadow/textCombine`；扩展导出后回导回归，`npm run type:check` 通过，DOCX import 回归 14/14 通过。 |
| 2026-06-02 | TS-13-03 段落语义 DOCX 反向导入完成第一批：`w:pStyle` 可回导 `Heading1-6` 标题层级和自定义 `styleId`，`w:numPr` 可回导列表层级和基于 `numId` 的稳定 `listId`；新增导出后回导回归，`npm run type:check` 通过，DOCX import 回归 14/14 通过。 |
| 2026-06-02 | TS-13-03 段落高级属性 DOCX 反向导入完成第一批：`w:pPr` 可回导对齐、左右/首行/悬挂缩进、段前段后、精确/倍数行距、段前分页、keepWithNext、keepLines、widowControl 和制表位；新增导出后回导回归，`npm run type:check` 通过，DOCX import 回归 13/13 通过。 |
| 2026-06-02 | TS-13-02 OOXML package 第二层拆分完成：`OoxmlPackage.ts` 进一步拆出 `OoxmlCommon.ts`、`OoxmlSeparatorExport.ts`、`OoxmlRunExport.ts`、`OoxmlParagraphExport.ts`，主文件从 1080 行收口到约 293 行，只保留部件组装和 DOCX 输出入口；原 `escapeOoxmlText/createOoxmlParagraph*/createOoxmlBodyContentXml/createOoxmlTable` 继续从 package 入口 re-export；`npm run type:check` 通过，OOXML/SVG package 回归 38/38 通过。 |
| 2026-06-02 | TS-13-02/03 OOXML 导入导出模块拆分完成：`OoxmlPackage.ts` 拆出控件、公式、水印、表格导出模块，`OoxmlDocumentImport.ts` 拆出图片、公式、表格导入模块；表格导出/导入均通过回调复用段落正文逻辑，保留原 `createOoxmlTable(element)` 入口；`npm run type:check` 通过，DOCX import 回归 12/12 通过，OOXML/SVG package 回归 38/38 通过。 |
| 2026-06-02 | TS-13-03 OOXML 公式反向导入完成第一批：`m:oMath` 可恢复内部 `ElementType.LATEX`、`formula.ast`、LaTeX 序列化文本和 displayText，覆盖文本、分式、根式、上下标和矩阵结构；`npm run type:check` 通过，DOCX import 回归 12/12 通过。 |
| 2026-06-02 | TS-13-03 图片媒体 DOCX 反向导入继续补齐：`parseOoxmlDocumentXmlToEditorData()` 支持传入 DOCX package parts，内联图片可按 relationship target 读取 `word/media/*` 字节并回填为 data URL；`npm run type:check` 通过，DOCX import 回归 11/11 通过。 |
| 2026-06-02 | TS-13-03 内联图片 DOCX 反向导入完成第一批：`w:drawing/wp:inline/a:blip r:embed` 结合 document relationships 恢复为内部 `ElementType.IMAGE`，保留 rId、media target 和 `wp:extent` 宽高；`npm run type:check` 通过，DOCX import 回归 10/10 通过。 |
| 2026-06-02 | TS-13-02/SVG 打印模块完成第二层拆分：`print.ts` 保留公开入口，`print/svg.ts` 只做导出，SVG 打印实现拆为 `types/core/inline/shape/decoration/table/document` 模块；`npm run type:check` 通过，OOXML/SVG package 回归 38/38 通过。 |
| 2026-06-02 | TS-13-02 修复 SVG 打印控件占位样式和起始坐标：展开式控件导出时按 `preText/value|placeholder/postText` 分段绘制，占位内容使用 `control.placeholderColor`，前置文本从自身坐标开始，不再出现“其他：”前多余空白；OOXML/SVG package 回归 38/38 通过。 |
| 2026-06-02 | TS-13-02 修复 OOXML 控件占位灰色污染：展开式控件导出不再把 `其他：内容。` 合并成一个 run，改为前置文本、占位/值、后置文本分别输出普通文本 run，只有占位提示继承灰色；`npm run type:check` 通过，OOXML/SVG package 回归 38/38 通过。 |
| 2026-06-02 | TS-13-02 修复公式 OOXML 原始 LaTeX 泄漏：旧公式 AST 若只是原始 LaTeX 文本包裹，导出前重新解析为结构化公式 AST，支持下标、上标、分式、根式和常用符号生成 `m:oMath`；OOXML/SVG package 回归 38/38 通过。 |
| 2026-06-02 | TS-13-02 打印链路切换 SVG 矢量页面：取消 HTML 转换主线，SVG 打印覆盖背景、水印、表格、页眉页脚、页码、页边框、图片、签章、公式、列表、分隔线和控件装饰，解决位图打印不清晰和 HTML 样式丢失问题；OOXML/SVG package 回归 38/38 通过。 |
| 2026-06-02 | TS-13-02/03 修正控件 DOCX 导出语义：网页业务控件不再导出为 Word `w:sdt` 内容控件，导出侧统一解析为普通文本 run，只保留用户看到的控件显示值、日期文本和勾选符号；外部 DOCX 的 `w:sdt` 反向导入能力保留，用于 Word 内容控件输入；更新导出/导入回归，`npm run type:check` 通过，package 回归 35/35 通过，DOCX import 回归 9/9 通过。 |
| 2026-06-02 | TS-13-03 日期/复选框/单选框 DOCX 反向导入完成第一批：日期 `w:sdt/w:date` 可恢复 `ElementType.DATE`、`dateId/dateFormat/externalId/valueList`；复选框和单选框可按 `w:tag` 与显示符号恢复 `checked/code/disabled`；新增日期和勾选类控件导出回导回归，`npm run type:check` 通过，DOCX import 回归 9/9 通过。 |
| 2026-06-02 | TS-13-03 控件 DOCX 反向导入完成第一批：`w:sdt` 解析支持业务控件 `w:tag`，可恢复 `controlId/conceptId/externalId/type/code/required/disabled`、显示值和选择控件 `valueSets` 下拉候选项；当前优先覆盖文本、数字、选择控件，日期/复选框/单选框专用控件后续单独扩展；新增选择控件导出回导回归，`npm run type:check` 通过，DOCX import 回归 8/8 通过。 |
| 2026-06-03 | TS-03/TS-11 多线程继续推进浮动图片排版：`FLOAT_TOP/BOTTOM` 的命中、预览、worker 和渲染继续优先使用 `floatPosition.position.coordinate` 当前布局坐标，避免多页/多栏场景回读陈旧 `imgFloatPosition`；`SURROUND/TIGHT` 的 canvas、worker、SVG 和命中统一使用环绕避让盒坐标，SVG 打印复用同一坐标解析策略并补显式浮动 display 白名单，避免图片绘制回正文起点导致文字重叠；TIGHT 已进入顶部浮动层、前景命中、环绕避让候选、图片选中、拖拽预览和右键“紧密型环绕”入口，并补 UI 菜单回归；隐藏浮动图片已从环绕候选、浮动缓存、canvas/worker/SVG 输出和命中过滤，动态 `executeUpdateElementById({ hide })` 后缓存、避让和命中同步刷新；重叠前景浮动图命中改为反向扫描，点击返回视觉最后绘制的图片；隐藏控件在非设计态测量宽度清零，避免继续推开后续文本；本轮图片/页眉组合回归 30/30 通过，control.hide 回归 17/17 通过。 |
| 2026-06-03 | TS-03-D 多线程继续推进复杂控件输入守门：带 `control/controlId/parentControlId/controlComponent` 的控件片段不再被当作普通文本走单行 patch；前后缀、多片段、value/placeholder 和 IME 输入返回明确 `line-control-*` 保守失败原因，完整 layout 回退后控件值、光标和折叠选区仍保持第二栏上下文。 |
| 2026-06-03 | TS-07/TS-13 多线程继续推进首页/奇偶页页眉页脚：`headerPageScopes/footerPageScopes` 已接入 runtime 按页读取、渲染、position、`getValue({ pageNo })`、打印数据过滤和 worker/SVG frame 数据；OOXML 正向导出支持 Word `default/first/even` 页眉页脚部件引用；同步补 TS-07 runtime 和 package 回归，本轮组合回归 92/92 通过。 |
| 2026-06-03 | TS-03-D 多线程继续补分栏控件真实输入基线：第二栏文本控件长文本输入扩行后，控件值 position、光标和折叠选区仍保持在第二栏；允许局部 patch 保守失败后完整 layout 回退，避免跨行输入破坏栏上下文。 |
| 2026-06-03 | TS-13-03/TS-02 多线程继续推进内容控件反向导入拆分：新增 `OoxmlControlImport.ts` 承接 `w:sdt` 业务控件、日期、复选框和单选框解析，通过 context 注入 run/paragraph 解析器避免循环依赖；未知内容控件回退普通文本并保留 ZERO；新增缺失 `word/document.xml` ZIP 错误回归；`npm run type:check` 通过，页面设置 + DOCX import 回归 42/42 通过。 |
| 2026-06-03 | TS-13-01/03 OOXML 映射文档状态同步：补齐 settings 反向导入、默认页眉页脚回导、内联图片媒体回填、OOXML 公式反向解析、外部内容控件导入和高层 `importOoxmlDocxBytesToEditorData()` 说明；外链/浮动图片、first/odd/even 页眉页脚、完整样式属性、内容控件组聚合和 WPS/ONLYOFFICE 往返对比仍保留为待补。 |
| 2026-06-03 | TS-05/TS-10/TS-12/TS-13 多线程继续补组合基线：新增段落 row layout policy 纯测、`keepWithNext + 表格` 同页/同栏回归、闭口标点行首禁则 policy 与布局回归，并补充表格字段级 DOCX round trip 守门，覆盖 `tableStyleId`、边框、重复表头、最小行高、单元格背景和单元格边框。 |
| 2026-06-03 | TS-03/TS-10/TS-13 多线程继续补守门：新增栏区服务 policy 级回归、局部分栏跨页承接与 `keepLines` 坐标回归、表格重复表头 fragment origin/尺寸守门，并补充高层 `importOoxmlDocxBytesToEditorData()` 一次返回正文/页眉/页脚/options 与复用 package relationships 的回归；能力路线图标注为历史盘点并链接最新进度文档。 |
| 2026-06-03 | TS-03/TS-04/TS-07/TS-13 多线程继续补对象和导入基线：分栏内文本控件真实输入的局部 patch 保留栏上下文，浮动图片补第二栏锚点/命中/拖动基线；页上下文边距补分栏测量 pageNo 透传和 SVG pageMetric 回归；TS-07 新增 first/odd/even/all 最小 pageScope 模型和 helper；OOXML 修订导入可恢复 `w:ins/w:del/w:delText` 为内部 trackChange。 |
| 2026-06-03 | TS-13-05 多线程继续推进 OOXML DOM helper 收口：新增 `OoxmlDom.ts`，页面设置和 settings 导入复用 localName、直接子元素、首个后代元素、parsererror 和属性读取 helper；分栏 `w:col` 读取继续避免 `Array.from` 物化 DOM 集合；`npm run type:check` 通过，页面设置回归 12/12 通过。 |
| 2026-06-03 | TS-12/TS-05/TS-10 多线程补齐排版策略基线：新增中文断行 policy 级回归，覆盖数字单位组合、开口标点和中西文间距；段落缩进/对齐偏移策略下沉到 `ParagraphRowLayoutPolicy`；新增表格内容 inset 和表格行 fragment 策略矩阵测试；`npm run type:check` 通过，中文断行 + 表格策略 + 缩进集成 + 菜单行处理回归 17/17 通过。 |
| 2026-06-03 | TS-09/TS-10/TS-12 多线程继续补齐排版策略基线：中文断行新增行尾悬挂标点 policy 入口；制表位测量拆出纯策略 helper；表格 fragment 快照补齐 `logicalTableId`，栏快照可按 table block 定位跨栏片段；新增上标/下标互斥和 worker 文本样式 policy 回归，为基础富文本导出/打印一致性提供守门。 |
| 2026-06-03 | TS-13-05 多线程继续推进 OOXML 模块拆分与热路径：新增 `OoxmlZipImport.ts` 承接 ZIP/parts/textParts/document.xml 提取，`OoxmlImport.ts` 收窄为高层 DOCX 回导组装；`createOoxmlParagraphModels` 拆出 ZERO 分段和隐式段落边界策略；settings 直接子元素判断和 package 行内关系存在性判断改为短路遍历；`npm run type:check` 通过，DOCX import + package parts + 页面设置回归 85/85 通过。 |
| 2026-06-03 | TS-13-03/性能 多线程继续推进导入热路径和大文档基线：页面设置导入首个元素/直接子元素查询不再 materialize DOM 集合；`w:drawing` 图片导入一次扫描收集 `blip/extent/ext`，data URL cache 命中提前；大文档 round trip 基线加入外部超链接和内联 SVG 图片断言；`npm run type:check` 通过，页面设置 + DOCX import + package parts + 大文档基线回归 86/86 通过。 |
| 2026-06-03 | TS-13-02/03 多线程继续推进 OOXML 性能和往返基线：`w:tblCellMar` 可反向恢复 `options.table.tdPadding` 且保留显式 0；表格/公式导入 first-child 热路径改为直接遍历；媒体 relationship XML 改用 descriptor 延迟解码，malformed data URL 不影响关系生成；新增大文档 DOCX round trip 完整性基线；`npm run type:check` 通过，OOXML/打印相关回归 85/85 通过。 |
| 2026-06-03 | TS-13-03/性能 多线程推进大文档导入导出低风险优化：DOCX 导入只把 `.xml/.rels/[Content_Types].xml` 解码为字符串，图片等媒体继续保留在 `parts` 二进制中，降低 200/500 页和多图片文档的字符串内存峰值；表格导出把列数推导提升到表级缓存，避免无 `colgroup` 大表格逐行重复全表扫描；`npm run type:check` 通过，DOCX import + package parts 回归 64/64 通过。 |
| 2026-06-03 | TS-13-02/03 性能继续推进：图片 data URL 导出新增请求级 decode cache，同一图片在正文、页眉、页脚重复出现时复用 `Uint8Array`，不合并关系 id 和 media 路径；公式导出新增模块级 LRU，只缓存最终 OOXML 字符串，重复公式和表格内公式不再反复派生 AST/OOXML；新增重复图片、重复/相邻公式回归，`npm run type:check` 通过，package parts 回归 43/43 通过。 |
| 2026-06-03 | TS-13-02/03 表格和图片继续推进：`options.table.tdPadding` 已映射到导出 `w:tblCellMar`，正文、页眉页脚和单元格内部段落导出均透传同一 options；外部表格缺少 `tblGrid/tcW` 时按 `tblW` 与最大列数等分兜底 colgroup，`pct/auto` 不误当 dxa；图片导入新增请求级 data URL cache，同一 `word/media/*` 多次引用只编码一次；`npm run type:check` 通过，package parts 回归 44/44、DOCX import 回归 28/28 通过。 |
| 2026-06-03 | TS-13-03 DOCX 导入性能继续推进：高层 `importOoxmlDocxBytesToEditorData()` 对 `word/document.xml` 只做一次 DOMParser，并把同一 `Document` 复用给正文解析、默认页眉页脚引用解析和页面设置解析；`getFirstChildElement()` 改为直接遍历 direct child，run/paragraph/control 导入热路径不再为 `[0]` 创建临时数组；`npm run type:check` 通过，OOXML 相关回归 77/77 通过。 |
| 2026-06-03 | TS-13-03 多线程推进页眉页脚 DOCX 回导回归：新增真实 package 用例验证 header/footer 图片使用各自 part-local `.rels`，同名 `rIdImage1` 不会串用 `document.xml.rels`；补齐页眉页脚共享块级解析器对表格和原生公式的回归覆盖；`npm run type:check` 通过，DOCX import 回归 25/25 通过。 |
| 2026-06-03 | TS-13-02/打印 多线程推进 SVG 打印资源等待：`printSvgDocument()` 在弹出打印框前等待 iframe 内 SVG `<image>`、HTML 图片和 `document.fonts.ready`，并保留 3 秒超时兜底，减少矢量打印首帧丢图和字体回退；`npm run type:check` 通过，package parts 回归 41/41 通过。 |
| 2026-06-03 | TS-13-03/TS-02 多线程推进 Word 内容控件反向导入：选择控件 valueSets 支持 `w:comboBox`，`w:listItem` 缺少 `w:value` 时使用 `w:displayText` 作为稳定 code；复选框/单选框缺少 checked 标记时可按 `☑/☒/✓/✔/◉/●/•` 等显示符号恢复勾选状态；`npm run type:check` 通过，DOCX import 回归 23/23 通过。 |
| 2026-06-03 | TS-13-03/TS-01 多线程推进 OOXML 公式 displayText 备用展示：装饰公式 `\boxed/\overbrace/\underbrace/\phantom` 不再把命令名泄露到正文展示文本，矩阵 `\begin{matrix}...\end{matrix}` 会压成单行可读展示值参与搜索、复制和备用排版；新增方程组/装饰公式回导断言，`npm run type:check` 通过，DOCX import 回归 23/23 通过。 |
| 2026-06-03 | TS-13-03/打印 多线程推进 SVG 打印自定义纸张尺寸：新增 `createPrintSvgPageCssSize()`，标准 A3/A4/A5 继续输出纸张名和方向，非标准尺寸直接输出 px 宽高，避免 `@page size` 为空导致浏览器按默认纸张缩放；`npm run type:check` 通过，package parts 回归 41/41 通过。 |
| 2026-06-03 | TS-13-03 多线程推进表格 OOXML 导入细节：导入 `w:tblBorders` 时区分外框和内线宽度，外框宽度与内线不同会恢复 `borderExternalWidth`；导入 `w:textDirection` 新增 `tbRlV`、`btLr` 竖排变体归一为内部 `vertical`；`npm run type:check` 通过，DOCX import 回归 21/21、package parts 回归 40/40 通过。 |
| 2026-06-03 | TS-13-02/03 多线程推进页眉页脚边距 OOXML 映射：`w:pgMar/@w:header` 与 `@w:footer` 已和 `options.header.top`、`options.footer.bottom` 双向映射，缺失属性不会导入为 0 覆盖默认配置；`npm run type:check` 通过，页面设置回归 9/9 通过。 |
| 2026-06-02 | TS-13-03 多线程推进表格宽度 OOXML 对齐：导出 `ElementType.TABLE.width` 在无 `colgroup` 时也会写入 `w:tblW`；导入外部 Word 表格缺少 `w:tblGrid` 时，可从首个完整非合并宽度行的 `w:tcW` 兜底推导 `colgroup`，同时保留 `tblW` 总宽；`npm run type:check` 通过，DOCX import 回归 19/19、package parts 回归 39/39 通过。 |
| 2026-06-02 | TS-13-03 多线程推进 OOXML 公式第二批结构导入：新增 `m:d` 分隔符、`m:eqArr` 方程组、`m:groupChr` 上/下花括号、`m:borderBox`、`m:box`、`m:phant` 支持，复用 group/matrix AST，保留 LaTeX 序列化文本和原始 OOXML；`npm run type:check` 通过，DOCX import 回归 18/18 通过。 |
| 2026-06-02 | TS-13-03 多线程推进 settings.xml 反向导入：新增 `OoxmlSettingsImport`，支持从 `word/settings.xml` 恢复 `mirrorMargins` 和 `gutterPosition: 'top'`；高层 `importOoxmlDocxBytesToEditorData()` 已合并 document.xml 页面设置与 settings.xml 全局设置；`npm run type:check` 通过，页面设置回归 9/9、DOCX import 回归 17/17 通过。 |
| 2026-06-02 | TS-13-03 高层 DOCX 回导入口补齐页面设置：`importOoxmlDocxBytesToEditorData()` 除 `data.main/header/footer` 外同步返回 `options` 子集，复用 `importOoxmlDocumentOptions()` 恢复页面尺寸、方向、页边距、分栏、页码、行号、页面边框和背景，调用方无需手动二次解析 document.xml；`npm run type:check` 通过，DOCX import 回归 17/17 通过。 |
| 2026-06-02 | TS-13-03 OOXML 原生公式反向导入继续补齐：`OoxmlFormulaImport` 新增 `m:nary` 大型运算符上下限、`m:limLow/limUpp`、`m:func`、`m:acc/m:bar` 解析，导入后继续保留结构化 AST、LaTeX 序列化文本和原始 OOXML 片段，求和、lim、函数和横线公式不再退化成普通文本；`npm run type:check` 通过，DOCX import 回归 17/17 通过。 |
| 2026-06-02 | TS-13-03 默认页眉页脚 DOCX 反向导入完成第一批：新增任意 package part 的 `.rels` 路径解析与 relationship target 归一化，`importOoxmlDocxBytesToEditorData()` 可从 `sectPr` 的 default `headerReference/footerReference` 找到 `word/header1.xml`、`word/footer1.xml` 并分别按自身关系表导入；页眉页脚复用正文块级解析，支持文本、超链接、图片、表格和块级公式基础回导，`npm run type:check` 通过，DOCX import 回归 16/16 通过。 |
| 2026-06-02 | TS-13-03 表格 DOCX 反向导入完成第一批：`parseOoxmlDocumentXmlToEditorData()` 开始识别 `w:tbl` 块级对象，可恢复 `ElementType.TABLE`、`tableStyleId`、`colgroup`、行高/重复表头、单元格文本、横向合并、纵向合并、背景色、垂直对齐、竖排文本和表格/单元格基础边框；新增导出表格回导回归，`npm run type:check` 通过，DOCX import 回归 7/7 通过。 |
| 2026-06-02 | TS-13-02 修复 DOCX 表格边框线颜色、宽度、样式未稳定映射：OOXML 导出把空 `borderType` 按内部默认全边框处理，补齐 `w:tblBorders` 的 single/dashed、颜色和宽度；单元格只有 `td.borderColor/td.borderWidth` 且无 `borderTypes` 时按四边直接格式写入 `w:tcBorders`，避免 WPS/Word 使用默认网格线覆盖业务样式；新增默认表格边框和单元格直接边框回归，`npm run type:check` 通过，package 回归 35/35 通过。 |
| 2026-06-02 | TS-13-02 修复 DOCX 文本水印尺寸比例严重错误：VML 水印不再把页面 px 直接当 pt 使用，改为 `px -> pt` 后按文字宽度估算 shape 尺寸，并关闭 textpath 强制拉伸；宽度限制在页面可视宽度内，长水印按可用宽度自动压缩字号；水印段落压成 1twip 精确行高，并补充 behind text、`w10:wrap type="none"`，避免页眉多出空行或对象参与环绕，补充水印尺寸回归，`npm run type:check` 通过，OOXML 回归 50/50 通过。 |
| 2026-06-02 | TS-13-02 继续修复页眉已有内容时水印仍额外占用顶部一行：真实页眉内容先输出，水印放入后置隐藏段落，不再在页眉标题前生成空水印段；新增“页眉标题优先、水印隐藏段落后置”回归，package 回归 33/33 通过。 |
| 2026-06-02 | TS-13-02 修复 OOXML 导出页眉/正文开头空占位导致的页眉多余行和第一页正文空行：段落生成器跳过开头空 ZERO 段和无值普通文本，仅保留公式、控件、图片等有结构意义的空元素；补充页眉/正文空占位回归，package 回归 33/33 通过，OOXML 回归 52/52 通过。 |
| 2026-06-02 | TS-13-02 修复 DOCX 表格导出分页和颜色/边框稳定性：表格写入 `w:tblW` 与 `w:tblLayout fixed` 固定总宽和列宽，行高改为 `w:hRule="atLeast"` 并显式 `w:cantSplit w:val="0"` 允许跨页拆行，避免固定行高导致下方大面积空白；表格边框、单元格背景色继续使用直接格式覆盖默认样式，package 回归 33/33 通过。 |
| 2026-06-02 | TS-13-02 继续修复 DOCX 表格跨页导出样式映射：表格属性补充 `w:tblCellMar` 映射默认单元格内边距，表头行补充 `w:tblHeader` 支持跨页重复表头；行高导出优先使用 `tr.minHeight`，避免把内容撑开的运行时 `tr.height` 写成 Word 最小行高后造成页底大空白；新增行高映射和表头/内边距回归，package 回归 34/34 通过，`npm run type:check` 通过。 |
| 2026-06-02 | TS-13-02 修复 DOCX 导出后字体丢失和文字发虚：新增 `word/fontTable.xml`，采集默认字体和显式 run 字体，补齐 fontTable content type 与 document relationship；`styles.xml` 的 docDefaults/Normal/Heading 增加 `w:hint="eastAsia"` 和中文 `w:lang`，让 WPS/Office 优先按中文字体渲染；`npm run type:check` 通过，OOXML 回归 50/50 通过。 |
| 2026-06-02 | TS-13-02 修复标题样式污染后续普通文本：OOXML 段落属性来源新增标题/显式样式语义校验，`ZERO` 上残留的 `level/styleId/titleId` 不再把普通文本导出为 Heading；标题标签后接普通文本保持同段不换行，但剥离整段 `Heading` 样式，避免普通文本变成大号标题；新增标题结束符污染和标题后普通文本同段回归，OOXML 回归 49/49 通过。 |
| 2026-06-02 | TS-13-02 继续修复列表后标题被并入上一条列表内容：OOXML 段落拆分新增列表段与非列表标题/正文的隐式边界识别，即使缺少显式 ZERO，也会在导出时强制切成独立 Word 段落；新增“列表前标题、列表后标题、再接列表”回归，OOXML 回归 47/47 通过。 |
| 2026-06-02 | TS-13-02 修复 DOCX 列表与标题相邻时编号串段：OOXML 段落拆分不再让携带 `listId` 的 ZERO 段落结束符把相邻标题导出为列表项，列表属性改为优先从当前段可见内容继承，空列表项保留结束符列表属性；新增标题上/下紧邻列表回归，OOXML 回归 46/46 通过。 |
| 2026-06-02 | TS-13-02/03 修复 DOCX 导出字号变大问题：OOXML `w:sz/w:position` 改为按 96DPI 使用 `1px=0.75pt=1.5 half-point` 换算，导入侧同步按互逆比例恢复内部字号，避免 WPS/ONLYOFFICE 中字体整体放大；OOXML 回归 45/45 通过。 |
| 2026-06-02 | TS-13-03 基础字符样式导入补齐：`w:rPr` 已支持字体、字号、加粗、斜体、下划线、删除线、上下标、颜色和高亮回导到内部元素字段，并补充导出后回导回归；OOXML 回归 45/45 通过。 |
| 2026-06-02 | TS-13-03/04 多线程推进 DOCX 反向解析：新增 `parseOoxmlDocumentXmlToEditorData()`、`importOoxmlDocumentOptions()` 和 document relationships 解析，支持正文文本/TAB/软换行/分页符/超链接、页面设置和 rId 关系表第一批导入；OOXML 回归 44/44 通过。 |
| 2026-06-02 | TS-13-03 DOCX 导入骨架完成第一批：新增 `parseOoxmlDocxParts()`、`parseOoxmlDocxTextParts()`、`extractOoxmlDocumentXml()` 和 `importOoxmlDocxBytes()`，可解析当前无压缩 DOCX ZIP 并提取 `word/document.xml`，新增导入骨架回归。 |
| 2026-06-02 | TS-13-02 多线程推进字符间距和文本水印 OOXML 映射：`letterSpacing` 导出为 run `w:spacing`，文本水印导出为默认页眉 VML shape，图片水印本批不误导出；合并导入骨架后总回归 39/39 通过。 |
| 2026-06-02 | TS-13-02 多线程推进背景和分隔线 OOXML 映射：`background.color` 导出为 document-level `w:background`，`ElementType.SEPARATOR` 导出为段落底边框并保留颜色、线宽和虚线样式；合并后总回归 36/36 通过。 |
| 2026-06-02 | TS-13-02 页面边框 OOXML 映射完成第一批：`pageBorder` 导出为 `w:pgBorders`，覆盖启用状态、颜色、线宽、常规线型和四边距离，并补充页面设置回归。 |
| 2026-06-02 | TS-13-02 行号设置 OOXML 映射完成第一批：`lineNumber.disabled/type/right` 导出为 `w:lnNumType` 的启用状态、连续/按页重启和距离，并补充页面设置回归。 |
| 2026-06-02 | TS-13-02 页码设置 OOXML 映射完成第一批：`pageNumber.startPageNo` 和 `numberType` 导出为 `w:pgNumType` 的 `w:start/w:fmt`，禁用页码时不输出，并补充页面设置回归。 |
| 2026-06-02 | TS-13-02 DOCX 标准属性部件完成第一批：新增 `docProps/core.xml` 与 `docProps/app.xml`，根关系补充 core-properties/extended-properties，content types 和 ZIP 打包同步覆盖，并补充属性部件回归。 |
| 2026-06-02 | TS-13-02 package 全局部件采集范围补齐：`styles.xml` 和 `numbering.xml` 同时扫描 main/header/footer，页眉自定义样式和页脚列表编号不会漏定义，并补充页眉页脚采集回归。 |
| 2026-06-02 | TS-13-01 映射表状态修正：`options.gutter` 已在 `w:pgMar/@w:gutter` 第一批导出中覆盖，文档从待扩展更新为最小子集，`gutterPosition` 继续归入 TS-04 度量上下文。 |
| 2026-06-02 | TS-13-02 表格样式和斜线边框 OOXML 映射补齐：`tableStyleId` 导出为 `w:tblStyle`，`td.slashTypes` 导出为 `w:tr2bl/w:tl2br` 对角边框，并复用单元格边框线型、颜色和宽度回归。 |
| 2026-06-02 | TS-13-02 表格纵向合并 continuation 完成第一批：导出按 `rowspan/colIndex` 生成后续行 `w:vMerge` continuation 单元格，避免只写起点导致 Word 表格结构不完整，并补充跨行合并回归。 |
| 2026-06-02 | TS-13-02 修订留痕 OOXML 映射完成第一批：内部 `trackChange` 导出为 run 级 `w:ins/w:del`，保留修订 id、作者和时间，并补充插入/删除结构回归。 |
| 2026-06-02 | TS-13-02 标题、日期和勾选类控件 OOXML 映射补齐：`titleId` 导出稳定书签；日期、复选框和单选框已在后续语义修正中改为普通文本导出，外部 `w:sdt` 只保留导入支持。 |
| 2026-06-02 | TS-13-02 选择控件 OOXML 映射补齐：选择控件的 `valueSets/code/required/disabled` 最初按内容控件设计，已在后续语义修正中改为普通文本导出；外部 `w:dropDownList/w:listItem` 只用于 DOCX 导入支持。 |
| 2026-06-02 | TS-13-02 控件 OOXML 映射完成第一批：控件导出方案已从 `w:sdt` 修正为普通文本 run，`controlId/conceptId/externalId/type` 不再写入导出 DOCX，避免网页业务控件污染 Word 文档语义。 |
| 2026-06-02 | TS-13-02 超链接 OOXML 映射完成第一批：`ElementType.HYPERLINK` 导出为 `w:hyperlink`，`.rels` 写入 external hyperlink relationship，并补充 URL 转义和 `TargetMode=External` 回归。 |
| 2026-06-02 | TS-13-02 字体和换行 OOXML 映射继续补齐：支持 `textScale`、`textPosition`、`textOutline.hollow`、`textShadow`、`textCombine` 和文本内 `\\n` 软换行导出，并补充 `w:w`、`w:position`、`w:outline`、`w:shadow`、`w:eastAsianLayout`、`w:br` 回归。 |
| 2026-06-02 | TS-13-02 字符高亮 OOXML 映射完成第一批：`highlight` 导出为 run `w:shd`，支持 HEX 和 rgb/rgba 颜色归一化，并补充高亮背景回归。 |
| 2026-06-02 | TS-13-02 settings 部件完成第一批：新增 `word/settings.xml`，支持 `options.mirrorMargins` 写入 `w:mirrorMargins`，并补齐 settings content type、document relationship 和回归。 |
| 2026-06-02 | TS-13-02 全局分栏 OOXML 映射完成第一批：页面设置导出支持 `options.columns.count/gap/widths` 写入 `w:cols` 和 `w:col`，覆盖等宽分栏和自定义栏宽回归。 |
| 2026-06-02 | TS-13-02 默认页眉页脚 OOXML 部件完成第一批：生成 `word/header1.xml` 和 `word/footer1.xml`，补齐 content type、document relationships、`w:headerReference`、`w:footerReference`，并覆盖页眉页脚 XML 和 package 引用回归。 |
| 2026-06-02 | TS-13-02 表格单元格属性 OOXML 映射完成第一批：单元格导出支持背景色、垂直对齐和竖排文本方向，颜色归一化补充 rgb/rgba 输入，并补充 `w:shd`、`w:vAlign`、`w:textDirection` 回归。 |
| 2026-06-02 | TS-13-02 段落高级属性 OOXML 映射完成第一批：导出支持缩进、段前段后、精确/倍数行距、分页控制和制表位，并补充 `w:ind`、`w:spacing`、`w:tabs`、`w:pageBreakBefore`、`w:keepNext`、`w:keepLines`、`w:widowControl` 回归。 |
| 2026-06-02 | TS-13-02 表格边框 OOXML 映射完成第一批：新增 `w:tblBorders` 和 `w:tcBorders` 输出，覆盖全边框、外边框、内边框、空边框、虚线边框、颜色、宽度和单元格显式边位，并补充表格边框回归。 |
| 2026-06-02 | TS-13-02 图片 media 部件完成第一批：支持 data URL 图片生成 `word/media/*` 二进制资源、image relationship 和 DrawingML 内联图片，并补充图片资源、尺寸 EMU 和关系回归。 |
| 2026-06-02 | TS-13-02 编号部件完成第一批：新增 `word/numbering.xml`，段落导出支持 `listId/listLevel` 写入 `w:numPr`，覆盖 decimal、bullet 和 checkbox 列表，并补充 content type、document rels 和列表回归。 |
| 2026-06-02 | TS-13-02 样式部件完成第一批：新增 `word/styles.xml`，内置 Normal 与 Heading1-6，段落导出支持 `styleId` 和标题层级写入 `w:pStyle`，并补充 content type、document rels 和自定义样式回归。 |
| 2026-06-02 | TS-13-02 demo 手动验证入口完成第一批：顶部工具栏新增 DOCX 导出按钮，点击后通过 `getOoxmlDocxBlob()` 下载当前文档，并补充工具栏下载链路回归。 |
| 2026-06-02 | TS-13-02 DOCX 最小 Blob 打包完成第一批：新增无压缩 ZIP 打包器、CRC32 校验、DOCX MIME Blob 输出和 `editor.command.getOoxmlDocxBlob()`，并补充 ZIP 签名、EOCD、Blob 类型和真实编辑器命令回归。 |
| 2026-06-02 | TS-13-02 OOXML 查询 API 完成第一批：新增 `editor.command.getOoxmlPackageParts()`，可从当前编辑器实例直接获取最小 package XML 部件，并补充真实 demo 编辑器命令回归。 |
| 2026-06-02 | TS-13-02 表格 OOXML 映射完成第一批：`ElementType.TABLE` 作为块级对象输出 `w:tbl`，覆盖表格网格、行高、单元格宽度、横向合并和纵向合并起点，并补充段落-表格-段落顺序回归。 |
| 2026-06-02 | TS-13-02 DOCX 导出最小部件完成第一批：新增 OOXML package parts 生成器，输出 `[Content_Types].xml`、根关系、`word/document.xml` 和正文关系，正文支持段落拆分、文本样式、空格保留、制表符、分页符和结构化公式 `m:oMath`，并补充 package parts 回归。 |
| 2026-06-02 | TS-13-02 页面设置映射完成第一批：新增 OOXML 单位与页面设置工具，覆盖 px 转 twip、字号 half-point、颜色归一化、`w:pgSz`、`w:pgMar` 和 `w:sectPr`，并补充页面设置回归。 |
| 2026-06-02 | TS-12-01 中文排版配置回归补齐：`typography.openingPunctuationList` 新增自定义开口标点覆盖，业务配置 `‹` 后可避免 `‹内` 被拆开。 |
| 2026-06-02 | TS-12-02 中西文间距完成第一批：新增 `typography.cjkLatinSpacing`，中文与英文/数字相邻时可追加配置间距，布局把间距落到前一个元素宽度中，并补充 `A中B` 混排宽度回归。 |
| 2026-06-01 | TS-12-01 中文排版配置完成第一批：新增 `typography.numberUnitSuffixList` 和 `typography.openingPunctuationList`，业务侧可扩展医院/工厂等专业单位和开口标点禁则，并补充 `12瓶` 不拆行回归。 |
| 2026-06-01 | TS-12-01 中文断行规则继续补齐：新增开口标点行尾禁则，开口标点会预读后续普通文本，空间不足时提前换行，避免 `（内` 被拆开，并补充开口标点回归。 |
| 2026-06-01 | TS-12-01 中文断行规则完成第一批：新增数字单位组合识别，数字后的单位后缀在行尾采用轻量悬挂策略，避免 `30℃`、`100kg` 等组合被拆开，并补充行尾单位回归。 |
| 2026-06-01 | TS-09-03 轻量标尺式制表位配置继续补齐：demo 标尺支持多枚手柄、空白点击新增、位置排序、手柄拖动更新和双击删除，手柄改为有实际命中区域，并补充多制表位增删回归。 |
| 2026-06-01 | TS-09-03 轻量标尺式制表位配置完成第一批：demo 顶部制表位菜单新增 0-240 标尺，点击位置可写入第一枚制表位位置，拖动处理链路复用同一套位置换算，并补充标尺位置回归。 |
| 2026-06-01 | TS-09-03 多段混合制表位回显完成第一批：rangeStyle 仅在选区内制表位完全一致时回显，不一致时返回空状态，顶部菜单不会误激活，并补充跨段混合回归。 |
| 2026-06-01 | TS-09-01 复杂混排制表位预读完成第一批：右/居中/小数点对齐预读扩展到公式文本控件、上标、下标、控件和普通文本，避免 TAB 后接复杂行内元素时对齐宽度少算，并补充公式+上标回归。 |
| 2026-06-01 | TS-09-03 制表位 UI 回显完成第一批：demo 顶部菜单新增制表位入口，支持左/右/居中/小数点/竖线快捷设置、自定义多行配置、清除和当前段落高亮回显，并补充工具栏回归。 |
| 2026-06-01 | TS-09-01 worker 快照竖线制表位完成：worker/offscreen 页面快照遇到 `alignment: 'bar'` 的 TAB 会输出竖线 `strokePath`，与主线程段落渲染坐标一致，并补充快照命令回归。 |
| 2026-06-01 | TS-09-01 竖线制表位渲染完成第一批：TAB 测量记录命中对齐方式，段落渲染器对 `alignment: 'bar'` 的制表位绘制竖线，并补充渲染坐标回归。 |
| 2026-06-01 | TS-09-01 制表位对齐测量继续补齐：TAB 支持右对齐、居中和小数点对齐的第一批宽度计算，预读后续连续文本并补充对齐回归。 |
| 2026-06-01 | TS-09-02 制表位命令/API 完成第一批：新增 `executeSetTabStops()`，支持段落级制表位设置、排序、非法值过滤、清空和 `getValue()` 序列化，并补充命令回归。 |
| 2026-06-01 | TS-09-01 制表位布局完成第一批：新增 `ITabStop` 模型，TAB 元素测量优先跳到下一个显式制表位，未命中时回退默认宽度，并补充显式制表位回归。 |
| 2026-06-01 | TS-06-02 目录消费标题树完成第一批：catalog worker 改为复用 `buildTitleTree()` 生成目录，移除重复标题扫描和层级插入逻辑，并通过目录 API 与标题树回归。 |
| 2026-06-01 | TS-06-02 标题树缓存完成第一批：`getTitleTree()` 按正文数据版本和布局版本缓存标题树，对外返回克隆结果避免业务修改污染缓存，并补充缓存隔离回归。 |
| 2026-06-01 | TS-04-03 局部输入排版完成第一批 pageNo 收口：typing 预览、单行 patch、chunk 测量、页级 rebalance 和行测量跨页高度切换按目标页读取边距与正文高度，并补充局部行测量回归。 |
| 2026-06-01 | TS-06-03 标题树定位补齐第一批：新增 `executeLocationTitle(titleId)` 和 `Editor.locationTitle(titleId)`，复用稳定目录定位逻辑但提供标题语义入口，并补充 Cypress 覆盖。 |
| 2026-06-01 | TS-06-03 标题树 API 查询继续补齐：新增 `getTitleTreeNodeList(titleIds)` 和 `getTitleTreeChildList(titleId)`，支持批量节点查询和直接子标题查询，并补充 Cypress 覆盖。 |
| 2026-06-01 | TS-06-03 标题树 API 查询补齐第一批：新增 `getTitleTreeNode(titleId)` 命令和 Editor 直通入口，业务侧可按标题 id 直接获取节点、父子关系、路径和顺序，并补充 Cypress 覆盖。 |
| 2026-06-01 | TS-04-03 页眉页脚分隔线完成 pageNo 收口：分隔线渲染链路透传当前页码，全宽分隔线左右端点和上下边距按当前页镜像边距计算，并补充直接渲染回归。 |
| 2026-06-01 | TS-04-03 分页高度计算完成第一批 pageNo 收口：`getMainHeight/getMainOuterHeight` 支持 pageNo，栏区高度和分页器换页后的基础占高按当前页重新读取，补充栏区高度回归。 |
| 2026-06-01 | TS-04-03 位置与交互层完成第一批 pageNo 收口：全量/局部 position 重算逐页读取边距和正文宽度，列表左侧命中、页边界空白命中、页眉页脚区域指示器按当前页边距处理。 |
| 2026-06-01 | TS-04-03 打印/图片导出一致性完成第一批绘制层收口：`drawPageToSurface`、页眉页脚主线程渲染和 worker 页眉页脚快照按目标页 pageNo 获取正文宽度与边距，镜像页边距下非首页导出装饰不再复用首页坐标。 |
| 2026-06-01 | TS-04-02 页边距 UI 与 worker 装饰继续收口：页码、行号、页边框、区域背景/边框和占位符命令按 pageNo 读取镜像页边距与正文宽度，并补充主线程页边框和 worker snapshot 回归。 |
| 2026-05-31 | TS-02-01 `controlSchema` 数据结构完成第一批：新增模板级 schema，支持声明业务绑定、入口元素属性、默认选项、必填/校验规则、扩展数据和默认值，实例级初始化值可覆盖 schema 默认值。 |
| 2026-05-31 | TS-02 控件校验 UI 提示完成第一批：`executeValidateControl()` 和异步校验入口支持 `isApplyHighlight`，失败控件复用覆盖层整控件高亮，通过后清理校验来源高亮且不覆盖业务自定义高亮。 |
| 2026-05-31 | TS-02-A 远程选项异步加载完成第二批：新增 `IEditorOption.controlRemoteOptionLoader`、`executeLoadControlRemoteOptions()` 和批量入口，支持按控件业务标识异步刷新候选项、写入远程状态，并返回未命中、类型不支持和加载失败项。 |
| 2026-05-31 | TS-02 控件异步业务校验完成第一批：新增 `IEditorOption.controlValidator` 和 `executeValidateControlAsync()`，业务侧可追加后端或跨字段校验失败项，并复用 `controlValidate` 事件。 |
| 2026-05-31 | TS-02 控件校验事件完成第一批：新增 `required`、`validateRules.pattern` 和 `executeValidateControl()`，校验结果返回失败项并派发 `controlValidate`，覆盖展开式文本控件真实值读取。 |
| 2026-05-31 | TS-02-A 级联和远程选项完成第一批：控件模型新增 `cascade`/`remote` 元数据，父控件通过 API 改值后会刷新子控件候选项，远程加载状态和错误可通过属性 API 写入并查询。 |
| 2026-05-31 | TS-03 自定义非等宽栏测量改为按最窄栏保守换行，避免第一栏较宽、后续栏较窄时行宽撑破窄栏，并补充 `[220, 120]` 栏宽回归。 |
| 2026-05-31 | TS-03-05 选中内容分栏补齐跨页续排：局部分栏小节超过当前页容量时，会按当前页各栏到下一页第一栏继续承接，行坐标不再撑出页面。 |
| 2026-05-31 | TS-03-B 图片栏内避让完成第一批回归：超宽内联图片在第二栏按当前栏宽等比缩放，占位宽度和渲染右边界不越过所在栏。 |
| 2026-05-31 | TS-03-D 控件栏内输入态完成第一批回归：文本控件落在第二栏时可通过 API 回填，控件值 position 保持在第二栏范围内，点击命中仍指向同一控件。 |
| 2026-05-31 | TS-03-C 公式栏内测量完成第一批落地：公式文本控件测量接入当前栏可用宽度，宽公式按结构化视觉盒等比缩放，不再撑破窄栏，并补充公式菜单全量回归。 |
| 2026-05-31 | TS-05-A 多栏分页控制组合补齐段距/行距跨栏回归：`exact` 精确行距和 `spaceBefore` 段前间距会参与栏高判断，当前栏放不下时换到下一栏。 |
| 2026-05-31 | TS-05-A 多栏分页控制组合继续补齐 `keepLines` 和 `widowControl` 跨栏回归：整段同栏会整体进入下一栏，孤行控制会把首两行一起带入下一栏，并验证段落块快照落栏。 |
| 2026-05-31 | TS-05-A 多栏分页控制组合补齐第一批回归：`keepWithNext` 标题在当前栏无法容纳下一段时，会与下一段一起进入下一栏，段落块快照同步落在第二栏。 |
| 2026-05-31 | TS-03-A 表格栏内排版完成第一批落地：块级表格按当前栏宽压缩列宽，超高表格 fragment 会先进入下一栏再分页，并新增 Cypress 覆盖表格 fragment 行宽不越过栏宽。 |
| 2026-05-31 | TS-01 公式菜单改为一级类目和二级公式下拉入口，通用、医院、化学、工厂、统计等类目悬停后展示具体公式，点击后直接插入光标位置；自定义公式打开专业面板，LaTeX 空白项直接插入可点击编辑的公式控件。 |
| 2026-05-31 | TS-01 新增页面内公式覆盖层编辑态，点击公式控件可直接修改上下标等 LaTeX 内容并回写结构化公式对象，补充 Cypress 覆盖。 |
| 2026-05-31 | TS-01 正文公式从图片化 `laTexSVG` 改为文本型公式控件，插入和格式化阶段写入 `formula.displayText`，行内测量、正文渲染和 worker 快照均按文本处理，图片命中/拖拽/偏移链路不再接管公式。 |
| 2026-05-31 | TS-01 页面内公式编辑从 LaTeX 源码输入改为正常公式文本输入，点击公式后显示 `x²`、`kg·d` 等展示文本，提交时再转换回内部公式表达。 |
| 2026-05-31 | TS-01 正文公式渲染新增 Canvas 公式盒模型，分式、根式、上下标不再用纯文本近似显示，继续保持非图片控件形态。 |
| 2026-05-31 | TS-01 页面内公式点击编辑改为 DOM 公式结构编辑，根式、分式和上下标在编辑态仍保持可视结构，用户直接编辑公式字段而不是 LaTeX 源码。 |
| 2026-05-31 | TS-01 修复公式编辑态上下标被压平成普通文本的问题，显式上移/下移脚标并支持求和上下限堆叠显示。 |
| 2026-05-30 | TS-01 补齐已有公式对象编辑入口，右键公式可打开专业公式面板回填并更新原公式，不再停留在一次性图片插入模式。 |
| 2026-05-30 | TS-01 修复公式菜单预览仍显示纯文本的问题，预览区改为复用 LaTeX SVG 渲染能力展示真实公式形态，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-01 扩充通用、医院和工厂公式符号库分类，覆盖基础结构、上下标、大型运算、生命体征、诊断试验、过程参数、质量和设备等场景，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-01 公式菜单从单一 LaTeX 文本框升级为专业公式面板，支持常用结构、医院/工厂符号库、搜索、预览和结构化公式写入，并补充 Cypress 覆盖。 |
| 2026-05-30 | 补充下一批开发任务池和实施批次，明确表格栏内排版、图片避让、公式测量、控件输入态、多栏分页组合和 DOCX 最小闭环的改造范围与验收条件。 |
| 2026-05-30 | 补充 P0 验收清单与测试矩阵，把排版推进从状态描述细化到必须完成能力、必须覆盖测试和当前缺口。 |
| 2026-05-30 | TS-03 收口选中内容分栏高度均衡和中间栏点击命中问题，更新分栏子项状态、统一开发约束和近期推进顺序。 |
| 2026-05-30 | TS-02 控件初始化与公开控件查询支持 `externalId/code` 业务字段匹配，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-02 批量控件值、扩展和属性写入返回 `successCount/failureList`，未匹配项以 `not_found` 返回，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-01 新增公式 AST 到 MathML/OOXML 的第一批派生序列化，覆盖分式、根式、上下标和矩阵，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-05 接入 `spaceBefore/spaceAfter` 段前段后间距，段落首行偏移和末行高度会进入布局产物，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-05 接入 `lineSpacingType: exact/multiple` 行距计算，精确行距和倍数行距会影响真实行盒高度，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-05 接入 `widowControl` 孤行/寡行分页控制，避免段落首行孤立在页底或末行孤立在下一页页顶，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-05 接入 `keepLines` 整段同页/同栏分页控制，当前栏剩余空间不足时可整体移动段落，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-05 接入 `keepWithNext` 第一批分页控制，标题或段落可与下一行保持同页，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-03 修复分栏 position 误覆盖页眉页脚起始坐标的问题，新增页眉页脚分栏回归用例，确认页眉撑开高度和页脚底部位置不受正文栏区影响。 |
| 2026-05-30 | TS-01 新增结构化公式模型、医院/工厂专业符号库查询 API，并补充 Cypress 覆盖；后续已收敛为只读取显式 `formula` 字段。 |
| 2026-05-30 | TS-03 新增页面栏区计算服务，完整布局按首栏宽度测行，分页器支持行流从第一栏进入第二栏，position 与排版快照按栏索引落位，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-05 接入 `pageBreakBefore` 段前分页控制，分页器可让目标段落从新页开始，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-04 新增页码上下文边距计算，支持镜像页边距、内侧/顶部装订线查询，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-02 新增控件初始化属性和值注入入口，创建编辑器时可完成选择项、禁用状态和业务值回填，并补充 Cypress 覆盖。 |
| 2026-05-30 | TS-13 新增内部模型到 OOXML 映射推进文档，完成完整映射框架和第一批最小子集范围归档。 |
| 2026-05-30 | TS-06 完成只读标题父子树构建与查询 API 第一批落地，新增标题树 Cypress 覆盖；标题树缓存、目录消费迁移和章节操作继续推进。 |
| 2026-05-30 | TS-00 完成段落块/栏/页只读快照第一批落地，新增公开查询入口和 Cypress 覆盖；真实分栏流动与分页规则迁移仍按后续子项推进。 |
| 2026-05-30 | 新建排版推进项开发功能与进度跟踪文档，初始化 TS-00 至 TS-14。 |
