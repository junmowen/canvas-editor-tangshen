# Command 目录索引

`command/` 存放对外命令门面和命令适配入口。

## 位置说明

- 所属层级：命令适配公共层
- 主要下钻：`CommandAdaptBase.ts`、`CommandAdaptCore.ts`、`CommandAdaptDomain.ts`、`CommandAdaptMedia.ts`、`CommandAdaptQuery.ts`、`CommandAdaptRichText.ts`、`CommandAdaptSearch.ts`、`CommandAdaptTable.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Command.ts` | 对外命令门面 |
| `CommandAdapt*.ts` | 按能力拆分的命令实现 |
| `CommandRichTextElementPolicy.ts` | 富文本命令的元素级公共流程，包括格式刷样式采集、清除直接样式、段落命令上下文和 render 参数生成 |
| `CommandParagraphStylePolicy.ts` | 段落样式数据写入策略，包括标题、对齐、行距、缩进、分栏和制表位归一化 |
| `CommandTextStyleCommandPolicy.ts` | 字体、字号、颜色、加粗、斜体、下划线、删除线等文字样式命令策略 |
| `CommandDocumentStyleCommandPolicy.ts` | 文档样式集合、段落样式应用和直接格式保留策略 |
| `CommandPageNumberPolicy.ts` | 页码继续、重启和应用范围的数据结构生成策略 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Command.ts` | 构造和对外 `execute*` / `get*` 方法 | 将命令门面绑定到具体 adapt 实现。 | 外部 API |
| `CommandAdaptDomain.ts` | 分组、区域和页面结构相关命令 | 处理 group / area / page element。 | `Command` 门面 |
| `CommandAdaptMedia.ts` | 图片、超链接、分页符和水印命令 | 处理媒体类命令。 | `Command` 门面 |
| `CommandAdaptRichText.ts` | 富文本装饰、列表和页码命令 | 处理 richtext 命令。 | `Command` 门面 |
| `CommandAdaptTable.ts` | 表格插入、编辑和格式命令 | 处理表格命令。 | `Command` 门面 |
| `CommandRichTextElementPolicy.ts` | `executeParagraphElementCommand(payload)` | 统一段落命令的只读检查、选区解析、段落元素解析和渲染提交。 | `CommandAdaptRichText.ts` |
| `CommandRichTextElementPolicy.ts` | `getCommandParagraphElementList(range)` | 根据当前选区是否跨行/跨列返回段落命令作用元素。 | `CommandAdaptRichText.ts` |
| `CommandRichTextElementPolicy.ts` | `createParagraphCommandRenderOption(startIndex, endIndex)` | 生成段落命令完成后的光标恢复参数。 | `CommandAdaptRichText.ts` |
| `CommandParagraphStylePolicy.ts` | `normalizeTabStops(payload)` | 清理非法制表位、按位置排序并保留对齐方式。 | `CommandRichTextElementPolicy.ts` |

## 富文本命令数据结构

| 数据结构 | 字段 | 说明 |
| --- | --- | --- |
| 段落命令上下文 | `startIndex` / `endIndex` | 当前命令执行前的编辑区间，用于命令后恢复光标或选区。 |
| 段落命令上下文 | `paragraphElementList` | 当前命令实际修改的段落入口元素集合。跨行/跨列时来自选区，否则来自当前段落。 |
| 制表位 | `position` | 段落内制表位横向位置，必须是非负有限数。 |
| 制表位 | `alignment` | 制表位对齐方式，按输入保留。 |

## 对外 API 关系

`Command.ts` 暴露的 `execute*` 方法仍是唯一对外入口。`CommandAdaptRichText.ts` 只负责命令编排，具体数据写入和公共流程必须下沉到 `Command*Policy.ts` 文件，避免命令类继续膨胀。
