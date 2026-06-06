# 内部模型到 OOXML 映射推进文档

更新时间：2026-06-06

## 目标

建立 `canvas-editor` 内部模型到 OOXML 的完整映射框架，先落地最小可验证子集，再按排版能力推进完整 DOCX 导入导出。

原则：

- 先列完整映射范围，不用最小子集限制后续完整导入导出。
- 每个内部字段必须有 OOXML 映射、派生规则或不支持说明。
- 导出、导入、往返对比使用同一份映射表，不维护两套规则。
- 公式、控件、分栏、段落分页、标题树等增强能力完成后，要同步补充映射状态。

## 源码索引

| 方向 | 入口 | 说明 |
| --- | --- | --- |
| DOCX 导出 | `src/editor/core/export/ooxml/OoxmlPackage.ts` | 生成 `IOoxmlPackageParts`、DOCX bytes 和 DOCX Blob。 |
| DOCX 导入 | `src/editor/core/export/ooxml/OoxmlImport.ts` | 从 DOCX bytes 恢复 `IEditorData`、页面设置子集和 package 上下文。 |
| 主文档导入 | `src/editor/core/export/ooxml/OoxmlDocumentImport.ts` | 解析 `word/document.xml`、页眉页脚 XML 和正文元素流。 |
| 映射层文档 | `src/editor/core/export/ooxml/README.md` | 维护 OOXML 模块边界、导入/导出数据结构和 API 对应关系。 |
| 对外命令 | `editor.command.getOoxmlPackageParts()` / `editor.command.getOoxmlDocxBlob()` | 编辑器实例上的导出调试和 DOCX Blob API。 |

实现拆分约束：

- package 组装、XML 部件生成、ZIP 读写、DOM 解析、公式、表格、控件、图片关系分别在各自模块维护。
- 导入数据先落到当前内部模型，再由编辑器渲染和布局消费，不在排版主流程写格式判断。
- 新增 OOXML 字段时必须同步更新本映射表、`export/ooxml/README.md` 和对应回归。

## 状态说明

| 状态 | 含义 |
| --- | --- |
| 最小子集 | 第一批可导出/导入验证的核心字段。 |
| 待扩展 | 已有明确 OOXML 目标，但实现不在第一批。 |
| 依赖能力 | 需要先完成内部排版模型或业务模型。 |
| 暂不支持 | 暂无稳定内部模型或超出当前目标。 |

## Package 映射

| 内部对象 | OOXML 部件 | 状态 | 说明 |
| --- | --- | --- | --- |
| `IEditorData.main` | `word/document.xml` | 最小子集 | 已完成第一批 XML 生成和反向解析：正文段落、文本 run、基础字符样式、制表符、分页符、结构化公式 `m:oMath` 和基础表格。 |
| `IEditorData.headerPageScopes` | `word/header*.xml` | 最小子集 | 已实现 TS-07 `all/first/even` scoped 页眉正向导出，生成 content type、document relationship、part relationship 和 `w:headerReference default/first/even`；`IEditorData.header` 不再作为 scoped 页眉运行时或导出兜底。 |
| `IEditorData.footerPageScopes` | `word/footer*.xml` | 最小子集 | 已实现 TS-07 `all/first/even` scoped 页脚正向导出，生成 content type、document relationship、part relationship 和 `w:footerReference default/first/even`；`IEditorData.footer` 不再作为 scoped 页脚运行时或导出兜底。 |
| `IEditorOption` | `word/settings.xml`、`word/document.xml/w:sectPr`、`word/document.xml/w:background` | 最小子集 | 已完成第一批 XML 生成和反向解析：页面大小、方向、边距、全局分栏、页码起始设置、行号设置、页面边框、文档背景色、镜像页边距和顶部装订线设置。 |
| 文档属性 | `docProps/core.xml`、`docProps/app.xml` | 最小子集 | 已实现核心属性和扩展属性部件、content type 与根关系，提供标准 DOCX 元数据入口。 |
| 样式集合 | `word/styles.xml` | 最小子集 | 已实现 Normal、Heading1-6，以及 TS-08 `IEditorData.styles` 显式样式定义；只在元素上出现但未进入 `styles` 的自定义 `styleId` 不再自动生成占位样式；默认字体/字号已写入 docDefaults 和 Normal，文档样式可输出 `basedOn/next`、段落属性和字符属性。 |
| 字体表 | `word/fontTable.xml` | 最小子集 | 已实现默认字体和显式 run 字体采集，写入 fontTable 并建立 document relationship，减少 WPS/Office 打开时字体替换和中文文字发虚。 |
| 列表集合 | `word/numbering.xml` | 最小子集 | 已实现 decimal、bullet、checkbox 列表，采集范围覆盖正文、页眉和页脚；多级高级格式待扩展。 |
| 图片资源 | `word/media/*`、`word/_rels/*.rels` | 最小子集 | 已实现 data URL 图片抽取、media 二进制资源、image relationship、内联 DrawingML 和浮动/环绕 `wp:anchor`；导入侧可结合 part-local relationships 从 `word/media/*` 回填 data URL，并可从 `wp:anchor` 恢复 `imgDisplay` 与 `imgFloatPosition`；外链图片下载属于后续网络资源增强。 |
| 公式资源 | `m:oMath` / `m:oMathPara` | 最小子集 | 已复用 TS-01 结构化公式模型生成 `m:oMath`；导入侧已支持 `m:oMath`、`m:oMathPara`、分式、根式、上下标、矩阵、方程组、分隔符和装饰公式第一批结构恢复。 |
| 批注 | `word/comments.xml` | 暂不支持 | 当前批注线程模型未完整落地。 |
| 修订 | `w:ins`、`w:del`、`w:delText` | 最小子集 | 已实现 run 级 `trackChange` 正向导出和第一批反向导入，保留修订 id、作者和时间；`w:delText` 可作为删除文本恢复，复杂删除节点继续扩展。 |

## 页面设置映射

| 内部字段 | OOXML 路径 | 状态 | 规则 |
| --- | --- | --- | --- |
| `options.width` / `options.height` | `w:sectPr/w:pgSz/@w:w`、`@w:h` | 最小子集 | 已实现 px/twip 双向映射并写入/读取 `w:pgSz`。 |
| `options.paperDirection` | `w:sectPr/w:pgSz/@w:orient` | 最小子集 | 已实现横向写入/读取 `landscape`，纵向不额外写 orient。 |
| `options.margins` | `w:sectPr/w:pgMar` | 最小子集 | 已实现上、右、下、左分别映射 `top/right/bottom/left`，支持反向恢复内部四元组。 |
| `options.gutter` | `w:sectPr/w:pgMar/@w:gutter` | 最小子集 | 已实现装订线宽度按 px/twip 双向映射；`gutterPosition: 'top'` 可从 `word/settings.xml` 反向恢复，镜像页码上下文由 TS-04 度量继续承接。 |
| `options.mirrorMargins` | `w:settings/w:mirrorMargins` | 最小子集 | 已实现镜像页边距开关写入和从 `word/settings.xml` 反向恢复。 |
| `options.columns.count` | `w:sectPr/w:cols/@w:num` | 最小子集 | 已实现全局分栏数量双向映射；段落级局部分栏依赖连续分节导出。 |
| `options.columns.gap` / `widths` | `w:sectPr/w:cols`、`w:col` | 最小子集 | 已实现等宽栏 `w:space` 和自定义栏宽 `w:col` 双向映射，自定义栏间距可从首个 `w:col/@w:space` 恢复。 |
| `options.pageNumber.startPageNo` / `numberType` | `w:sectPr/w:pgNumType` | 最小子集 | 已实现起始页码和阿拉伯/中文数字格式双向映射；`fromPageNo/maxPageNo` 这类范围控制依赖后续分节。 |
| `options.lineNumber` | `w:sectPr/w:lnNumType` | 最小子集 | 已实现启用状态、连续/按页重启和行号距离双向映射；完整行号字体颜色仍由渲染层控制，OOXML 第一批只处理 section 行号规则。 |
| `options.pageBorder` | `w:sectPr/w:pgBorders` | 最小子集 | 已实现页面边框启用状态、颜色、线宽、solid/dashed/dotted/double 样式和四边距离双向映射；艺术边框素材待扩展。 |
| `options.background.color` | `w:document/w:background/@w:color` | 最小子集 | 已实现全局文档背景色双向映射；背景图和按页应用范围没有稳定同构节点，暂不导出。 |
| `options.watermark` | 默认页眉 VML shape | 最小子集 | 已实现文本水印第一批导出，通过默认页眉承载 VML textpath；水印字号按 `px -> pt` 换算，VML 高度按文字尺寸约束，宽度限制在页面可视宽度内，长水印按可用宽度自动压缩字号；存在真实页眉内容时先输出页眉内容，再把水印放入隐藏段落，没有页眉内容时生成 1twip 兜底段落，并使用 behind text 和 `w10:wrap type="none"`，避免导出后按整页比例拉伸、横向过窄、越界裁切或撑出页眉顶部空行；图片水印、重复平铺和复杂范围待扩展。 |
| 页眉页脚作用域 | `w:headerReference`、`w:footerReference` | 最小子集 | TS-07 正向导出已支持 default/first/even；`all/odd` 按 default 语义输出，scoped 反向导入待补。 |

## 段落与字符映射

| 内部字段 | OOXML 路径 | 状态 | 规则 |
| --- | --- | --- | --- |
| 普通文本元素 `value` | `w:p/w:r/w:t` | 最小子集 | 已实现按 ZERO 拆段，文本 XML 转义，首尾空格或连续空格写 `xml:space="preserve"`。 |
| `bold` | `w:rPr/w:b` | 最小子集 | 已实现布尔值开关节点双向映射。 |
| `italic` | `w:rPr/w:i` | 最小子集 | 已实现布尔值开关节点双向映射。 |
| `underline` | `w:rPr/w:u` | 最小子集 | 已实现默认 `single` 正向导出和非 `none` 下划线反向导入。 |
| `strikeout` | `w:rPr/w:strike` | 最小子集 | 已实现布尔值开关节点双向映射。 |
| `font` | `w:rPr/w:rFonts` | 最小子集 | 已实现同一字体写入 `ascii/hAnsi/eastAsia`，导入优先读取 `eastAsia/ascii/hAnsi`。 |
| `size` | `w:rPr/w:sz` | 最小子集 | 已实现内部字号与 OOXML half-point 双向换算；按 96DPI 使用 `1px = 0.75pt = 1.5 half-point`，避免导出到 WPS/ONLYOFFICE 后字号放大。 |
| `options.defaultFont` / `options.defaultSize` | `word/styles.xml/w:docDefaults`、`Normal`、`Heading1-6`、`word/fontTable.xml` | 最小子集 | 已实现全局默认字体/字号写入 docDefaults 和 Normal；`w:rFonts` 增加 `eastAsia/cs/hint`，`w:lang` 设置中文环境；字体名同步进入 fontTable，避免无显式 run 字体时被 Office 替换。 |
| `IEditorData.styles[].id/name/type/basedOn/next` | `word/styles.xml/w:style` | 最小子集 | TS-08 已实现文档样式集合正向导出：段落样式写 `w:type="paragraph"`，字符样式写 `character`，表格样式写 `table`，列表样式写 `numbering`；`basedOn` 和 `next` 会按样式 id 归一化后写入。 |
| `IEditorData.styles[].paragraph` | `word/styles.xml/w:style/w:pPr` | 最小子集 | TS-08 已实现段落样式属性导出：`rowFlex`、缩进、段前段后、行距、分页控制和 `tabStops` 复用正文段落同一套 px/twip 映射规则。 |
| `IEditorData.styles[].text` | `word/styles.xml/w:style/w:rPr` | 最小子集 | TS-08 已实现字符样式属性导出：字体、字号、粗斜体、下划线、删除线、颜色、高亮、字距、横向缩放、基线偏移、空心、阴影和纵横混排；直接 run 格式仍优先覆盖样式继承结果。 |
| `color` | `w:rPr/w:color/@w:val` | 最小子集 | 已实现去掉 `#` 并转大写 HEX 正向导出，导入侧恢复为内部 `#RRGGBB`。 |
| `highlight` | `w:rPr/w:shd`、`w:rPr/w:highlight` | 最小子集 | 已实现任意 HEX/rgb/rgba 背景色写入 run shading；导入侧支持 `w:shd/@w:fill` 和 Word 预设 `w:highlight` 颜色。 |
| 文本内 `\n` | `w:r/w:br` | 最小子集 | 已实现文本值中的软换行导出为 `<w:br/>`，不拆成新段落。 |
| `letterSpacing` | `w:rPr/w:spacing` | 最小子集 | 已实现字符间距按 px 转 twip 写入 run spacing。 |
| `textScale` | `w:rPr/w:w` | 最小子集 | 已实现字符横向缩放百分比映射。 |
| `textPosition` | `w:rPr/w:position` | 最小子集 | 已实现字符基线偏移按 half-point 写入，单位换算同字号。 |
| `textOutline.hollow` | `w:rPr/w:outline` | 最小子集 | 已实现空心文字开关映射；描边颜色和宽度待扩展。 |
| `textShadow` | `w:rPr/w:shadow` | 最小子集 | 已实现阴影开关映射；阴影颜色、模糊和偏移待扩展。 |
| `textCombine` | `w:rPr/w:eastAsianLayout` | 最小子集 | 已实现纵横混排开关映射。 |
| `ElementType.SUPERSCRIPT` / `ElementType.SUBSCRIPT` | `w:rPr/w:vertAlign` | 最小子集 | 已实现上标/下标到 `superscript/subscript` 的双向映射。 |
| `rowFlex` | `w:pPr/w:jc` | 最小子集 | 已实现中、右、两端对齐映射，左对齐不额外写节点。 |
| `rowIndent*` | `w:pPr/w:ind` | 最小子集 | 已实现左右缩进、首行缩进和悬挂缩进按 px 转 twip 写入；OOXML 互斥的 `firstLine/hanging` 按首行与后续行偏移差值换算。 |
| `lineSpacing` / `lineSpacingType` | `w:pPr/w:spacing` | 最小子集 | 已实现 `exact` 精确行距按 twip 写入，`multiple` 倍数行距按 240 倍数写入 `auto`。 |
| `spaceBefore` / `spaceAfter` | `w:pPr/w:spacing` | 最小子集 | 已实现段前段后按 px 转 twip 写入 `before/after`。 |
| `pageBreakBefore` | `w:pPr/w:pageBreakBefore` | 最小子集 | 已实现布尔开关映射。 |
| `keepWithNext` | `w:pPr/w:keepNext` | 最小子集 | 已实现布尔开关映射。 |
| `keepLines` | `w:pPr/w:keepLines` | 最小子集 | 已实现布尔开关映射。 |
| `widowControl` | `w:pPr/w:widowControl` | 最小子集 | 已实现布尔开关映射。 |
| `tabStops` | `w:pPr/w:tabs/w:tab` | 最小子集 | 已实现 left/right/center/decimal/bar 制表位按位置排序后写入。 |

## 标题、列表、表格和对象映射

| 内部对象 | OOXML 路径 | 状态 | 规则 |
| --- | --- | --- | --- |
| `titleId` / `level` | `w:pPr/w:pStyle`、`w:bookmarkStart`、`w:bookmarkEnd` | 最小子集 | 已实现 `level` 到 Heading1-6 的 `w:pStyle` 映射，`titleId` 导出为稳定书签；目录域待扩展。 |
| 标题与相邻普通文本边界 | `w:pPr/w:pStyle`、`w:bookmarkStart` | 最小子集 | 已修复 ZERO 段落结束符携带 `level/styleId/titleId` 时的串段问题；标题/显式样式只从当前段可见内容继承；同一段内标题标签后接普通文本时不强制换行，而是剥离整段 `Heading` 样式，避免后续普通文本继承大号标题样式。 |
| `ITitleTree` | `word/document.xml` 段落顺序、目录域 | 待扩展 | 可用于导出目录、章节书签和按章定位。 |
| `listId/listLevel/listStyle` | `w:pPr/w:numPr` | 最小子集 | 已实现稳定 `numId`、`ilvl` 和 numbering.xml 定义。 |
| 列表与相邻标题段落边界 | `w:pPr/w:numPr` | 最小子集 | 已修复 ZERO 段落结束符携带列表属性时的串段问题；列表编号只从当前段可见内容继承，空列表项除外；列表段与非列表标题/正文相邻且缺少显式 ZERO 时会强制切段，避免标题被并入上一条列表内容或变成列表项。 |
| `ElementType.HYPERLINK` / `url` | `w:hyperlink`、`.rels` | 最小子集 | 已实现外部超链接 relationship、`TargetMode=External` 和正文 `w:hyperlink` 包裹；导入侧已可结合 document relationships 把文本 run 恢复为内部超链接元素和 URL。 |
| `ElementType.DATE` | 普通文本 run；外部 `w:sdt/w:date` 导入支持 | 最小子集 | 导出时日期控件属于网页业务交互层，只把用户看到的日期文本写入普通 `w:t`；导入侧支持外部 DOCX 的日期内容控件，可恢复 `dateId/dateFormat/externalId/valueList`。 |
| `ElementType.CHECKBOX` / `ElementType.RADIO` | 普通文本 run；外部 `w:sdt` 导入支持 | 最小子集 | 导出时复选框和单选框只写入可读勾选符号，不写入 Word 内容控件；导入侧支持外部 DOCX 的勾选类内容控件，可恢复 `type/code/checked/disabled`。 |
| `ElementType.SEPARATOR` | `w:pPr/w:pBdr/w:bottom` | 最小子集 | 已实现分隔线导出为可见段落底边框，颜色、线宽和虚线样式按内部元素与全局 separator 选项映射。 |
| `ElementType.TABLE` | `w:tbl` | 最小子集 | 已实现块级表格输出和第一批反向导入，避免表格被包进普通段落；导出写入 `w:tblW`、`w:tblLayout fixed` 和 `w:tblCellMar`，导入可恢复 `colgroup/trList/tdList` 基础结构。 |
| `tableStyleId` | `w:tblPr/w:tblStyle` | 最小子集 | 已实现表格样式 id 双向映射；TS-08 已提供 `IEditorData.styles` 表格样式定义承载和 `styles.xml` table style 节点，表格内部条件样式细项后续扩展。 |
| `colgroup.width` | `w:tblGrid/w:gridCol`、`w:tblPr/w:tblW`、`w:tblPr/w:tblLayout` | 最小子集 | 已实现列宽按 px/twip 双向映射；导出按列宽汇总表格总宽、固定布局，避免默认表格样式重算宽度。 |
| `tr.minHeight` / `tr.height` | `w:trPr/w:trHeight`、`w:trPr/w:cantSplit` | 最小子集 | 已实现优先按 `minHeight` 写入 `atLeast` 最小行高，没有 `minHeight` 时回退 `height`；导入可从 `w:trHeight` 恢复 `height/minHeight`；显式 `cantSplit=false`，避免把内容撑开的运行时行高导出成整行最小高度后导致分页大面积空白。 |
| `tr.repeatOnPageStart` / `tr.pagingRepeat` / `tr.extension.trType` | `w:trPr/w:tblHeader` | 最小子集 | 已实现重复表头双向映射，`repeatOnPageStart`、`pagingRepeat`、`extension.trType=title/header` 会导出为 `w:tblHeader`，导入时恢复 `repeatOnPageStart`。 |
| `td.colspan/rowspan` | `w:gridSpan`、`w:vMerge` | 最小子集 | 已实现横向合并、纵向合并起点和基于 `rowspan/colIndex` 的 continuation 单元格补齐；导入时可把 `gridSpan/vMerge restart/continue` 恢复为内部 `colspan/rowspan`。 |
| 表格边框 | `w:tblBorders`、`w:tcBorders` | 最小子集 | 已实现表级全边框、外边框、内边框、空边框、虚线边框，以及单元格显式边位的线型、颜色和宽度双向映射；`borderType` 为空时按内部默认全边框导出，只有 `td.borderColor/borderWidth` 的单元格按四边直接格式写入。 |
| `td.slashTypes` | `w:tcBorders/w:tr2bl`、`w:tcBorders/w:tl2br` | 最小子集 | 已实现正斜线和反斜线表头边框导出，线型、颜色和宽度复用单元格边框配置。 |
| `td.backgroundColor` | `w:tcPr/w:shd` | 最小子集 | 已实现 HEX 和 rgb/rgba 背景色归一化后写入 `w:fill`，并支持从 `w:fill` 反向恢复；透明度第一批不导出。 |
| `td.verticalAlign` | `w:tcPr/w:vAlign` | 最小子集 | 已实现 top/middle/bottom 与 top/center/bottom 双向映射。 |
| `td.textDirection` | `w:tcPr/w:textDirection` | 最小子集 | 已实现 vertical 与 `tbRl` 双向映射，horizontal 默认不额外写节点。 |
| 图片元素 | `w:drawing`、`a:blip`、`wp:inline`、`wp:anchor` | 最小子集 | 已实现 data URL 图片导出为内联 DrawingML，浮动/环绕图片导出为 `wp:anchor`，尺寸和锚点坐标按 px/EMU 双向换算；导入可恢复内联图片尺寸、媒体 data URL、浮动显示方式和页面相对浮动坐标。 |
| `ElementType.LATEX` | `m:oMath` 或文本兜底 | 最小子集 | 已实现带 AST 的结构化公式优先输出 `m:oMath`，无 AST 的公式输入按展示文本导出，不在导出阶段临时补结构。 |
| 控件元素 | 普通文本 run；外部 `w:sdt` 导入支持 | 最小子集 | 导出时控件属于网页业务交互层，不写入 Word 内容控件，只把最终显示值导出为普通 `w:t`；导入侧支持外部 DOCX 的 `w:sdt/w:tag/w:dropDownList`，可恢复文本/数字/选择控件的业务标识、显示值和候选项，也可恢复日期、复选框、单选框专用元素的 id、格式、code、checked 和 disabled。 |

## 第一批最小子集

第一批只做可验证闭环：

- DOCX package 基础结构：`[Content_Types].xml`、`_rels/.rels`、`docProps/core.xml`、`docProps/app.xml`、`word/document.xml`、`word/_rels/document.xml.rels`、`word/styles.xml`、`word/fontTable.xml`、`word/numbering.xml`、`word/settings.xml`、默认 `word/header1.xml`、默认 `word/footer1.xml`（已实现 XML 部件生成和无压缩 ZIP 打包）。
- 页面设置：纸张宽高、方向、四边距、装订线、全局分栏、行号、页码、页面边框和背景色（已实现第一批双向映射）。
- 正文：普通段落、文本 run、换行拆段、制表符、分页符、外部超链接正向导出，以及普通段落/文本/制表符/软换行/分页符/外部超链接第一批反向导入（已实现）。
- 文档背景和分隔线：全局背景色导出 `w:background`，分隔线导出段落底边框（已实现第一批）。
- 文档样式集合：`IEditorData.styles` 可导出为 `word/styles.xml` 显式样式定义，支持样式 id/name/type/basedOn/next、段落属性和字符属性；只在元素上出现但未进入样式库的 `styleId` 不再自动生成占位样式。
- 字符样式：字体、字号、默认字体表、加粗、斜体、下划线、删除线、上下标、颜色和高亮背景已实现第一批双向映射/声明；横向缩放、基线偏移、空心、阴影、纵横混排和文本软换行已实现正向导出；文档字符样式可在 `styles.xml/w:rPr` 中声明。
- 段落样式：左/中/右/两端对齐、缩进、段距、行距、分页控制、制表位（已实现第一批；左对齐默认）；文档段落样式可在 `styles.xml/w:pPr` 中声明。
- 列表：decimal、bullet、checkbox 第一批正向导出（已实现）。
- 公式：结构化公式输出 `m:oMath`（已实现第一批正向序列化）。
- 图片：data URL 图片抽取为 `word/media/*`，内联图片输出 `wp:inline`，浮动/环绕图片输出 `wp:anchor`，导入可恢复尺寸、媒体 data URL、`imgDisplay` 和 `imgFloatPosition`（已实现第一批双向映射）。
- 标题：`level` 映射到 Heading1-6，`titleId` 导出稳定书签，目录域后续扩展。
- 表格：基础表格、行、单元格、表格样式 id、总宽、固定布局、列宽、默认单元格内边距、最小行高、跨页拆行开关、重复表头、横向合并、纵向合并 continuation、表级边框、默认全边框、单元格显式边框、单元格直接格式边框、单元格斜线边框、单元格背景、垂直对齐和竖排文本（已实现第一批双向映射，复杂跨页表格合并待扩展）。
- 控件：导出按普通文本处理，文本/数字/选择控件导出最终显示值，日期导出显示日期，复选框/单选框导出可读勾选符号；导入侧支持外部 `w:sdt`，选择控件 `valueSets` 可从下拉项恢复，日期、复选框、单选框可从内容控件恢复（控件组聚合待扩展）。
- 修订：`trackChange` 可导出为 `w:ins/w:del`，导入侧可把 `w:ins/w:del/w:delText` 恢复为内部修订元数据（复杂删除节点待扩展）。

## 当前 API

| API | 状态 | 说明 |
| --- | --- | --- |
| `editor.command.getOoxmlPackageParts()` | 最小子集 | 返回当前文档的 content types、根关系、docProps、document、styles、fontTable、numbering、settings、页眉页脚和 media 等 package 部件。 |
| `editor.command.getOoxmlDocxBlob()` | 最小子集 | 返回当前文档的最小 DOCX Blob，内部使用无压缩 ZIP package；正文、页眉页脚、样式、编号、媒体、表格、公式、控件普通文本、修订、页面设置和浮动图片锚点已进入当前可验收范围。 |

## 当前导入 API

| API | 状态 | 说明 |
| --- | --- | --- |
| `parseOoxmlDocxParts(bytes)` | 最小子集 | 解析当前导出器生成的无压缩 DOCX ZIP，返回 package parts 字节映射。 |
| `parseOoxmlDocxTextParts(bytes)` | 最小子集 | 把 DOCX 部件按 UTF-8 解码为文本映射，供 XML 解析前置使用。 |
| `extractOoxmlDocumentXml(bytes)` | 最小子集 | 从 DOCX 字节中提取 `word/document.xml`。 |
| `importOoxmlDocxBytes(bytes)` | 最小子集 | 返回最小导入包 `{ parts, textParts, documentXml }`，作为文本、页面设置、关系表和后续对象导入的统一前置入口。 |
| `importOoxmlDocxBytesToEditorData(bytes)` | 最小子集 | 高层 DOCX 回导入口，一次返回 `data.main/header/footer` 和页面设置 `options` 子集，内部复用同一 `Document`、package parts、relationships 和 settings 解析结果。 |
| `parseOoxmlDocumentXmlToEditorData(documentXml, options?)` | 最小子集 | 把 `w:body/w:p/w:r` 的 `w:t`、`w:tab`、`w:br`、分页符导入为内部 `IEditorData.main`；支持字体、字号、粗斜体、下划线、删除线、上下标、颜色、高亮；传入 relationships 后可恢复 `w:hyperlink` 的 URL；`w:drawing` 可恢复内联图片和 `wp:anchor` 浮动图片；`w:tbl` 可恢复为基础内部表格元素；`w:sdt` 可恢复为文本/数字/选择/日期/复选框/单选框控件。 |
| `importOoxmlDocumentOptions(documentXml)` | 最小子集 | 从 `word/document.xml` 反向解析页面大小、方向、边距、装订线、分栏、行号、页码、页面边框和背景色。 |
| `resolveOoxmlDocumentRelationships(textParts)` | 最小子集 | 解析 `word/_rels/document.xml.rels`，提供 rId 到 hyperlink/image 等关系的查询表。 |

## 后续验收

| 验收项 | 标准 |
| --- | --- |
| 导出打开 | 最小子集 DOCX 可被 WPS、ONLYOFFICE、Microsoft Word 打开。 |
| 导入恢复 | 导入后内部 `IEditorData` 字段可恢复到映射表定义的范围。 |
| 往返对比 | 内部 JSON -> DOCX -> 内部 JSON 差异可输出字段级报告。 |
| 排版对比 | 页面大小、边距、段落对齐、表格基础几何保持稳定。 |
