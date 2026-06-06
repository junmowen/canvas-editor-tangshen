# OOXML 导入导出目录索引

`export/ooxml/` 存放 DOCX / OOXML 的 package、document、styles、numbering、media、公式、控件、表格、页眉页脚和页面设置映射。

## 位置说明

- 所属层级：导入导出格式映射层
- 对外入口：`OoxmlImport.ts`、`OoxmlPackage.ts`
- DOM 工具：`OoxmlDom.ts`
- ZIP 工具：`OoxmlZip.ts`、`OoxmlZipImport.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `OoxmlPackage.ts` | 组装 DOCX package、relationship、media 和核心 XML 部件 |
| `OoxmlImport.ts` | DOCX 导入总入口 |
| `OoxmlDocumentImport.ts` | 主文档、页眉、页脚的元素流导入入口 |
| `OoxmlBlockContainerImport.ts` | 块级容器分派，处理段落、表格和块级公式 |
| `OoxmlHyperlinkImport.ts` | 段落内 hyperlink run 解析 |
| `OoxmlDocumentElementFactory.ts` | 文本、TAB、分页符和段落结束符工厂 |
| `OoxmlTrackChangeImport.ts` | 修订元信息解析和元素修订上下文写入 |
| `OoxmlXmlDocumentImport.ts` | XML 字符串/DOM 解析和根节点校验 |
| `OoxmlRunImportStyle.ts` | run 字符样式导入 |
| `OoxmlParagraphImportStyle.ts` | 段落样式导入 |
| `OoxmlTableImport.ts` / `OoxmlTableExport.ts` | 表格导入导出映射 |
| `OoxmlFormulaImport.ts` / `OoxmlFormulaExport.ts` | 公式导入导出入口 |
| `OoxmlFormulaNodeImport.ts` | OOXML 公式节点分派和基础结构解析 |
| `OoxmlFormulaCompositeNodeImport.ts` | 公式复合节点解析，如 delimiter、matrix、eqArr、accent、bar、groupChr |
| `OoxmlFormulaLatexAdapter.ts` | 公式 AST 到 LaTeX 的序列化 |
| `OoxmlFormulaSymbolMap.ts` | OOXML 符号到内部 LaTeX 命令映射 |
| `OoxmlControlImport.ts` / `OoxmlControlExport.ts` | 内容控件导入导出映射 |
| `OoxmlImageImport.ts` / `OoxmlMedia.ts` | 图片媒体关系和 data URL 回填 |

## 导入数据结构

| 数据结构 | 字段 | 说明 |
| --- | --- | --- |
| `IOoxmlImportedEditorDataResult` | `data` | 高层 DOCX 导入后可直接写入编辑器的 `IEditorData`。 |
| `IOoxmlImportedEditorDataResult` | `options` | 从 OOXML 页面设置和 settings 中恢复出的 `IEditorOption` 子集。 |
| `IOoxmlImportedEditorDataResult` | `parts` / `textParts` | ZIP package 解析后的原始部件和文本部件，保留给调试和二次解析。 |
| `IOoxmlDocumentImportResult` | `elementList` | 从 `word/document.xml` 或页眉页脚 XML 中解析出的内部元素流。 |
| `IOoxmlDocumentImportResult` | `data.main` | 可直接写入编辑器的正文数据。 |
| `IOoxmlDocumentImportOption` | `relationships` | 当前 XML 部件对应的 relationship 映射，用于恢复 hyperlink、media 等外部引用。 |
| `IOoxmlDocumentImportOption` | `packageParts` | DOCX package 原始部件字节，用于图片等二进制资源回填。 |
| `IOoxmlDocumentImportOption` | `imageDataUrlCache` | 单次导入内共享的图片 data URL 缓存。 |
| `IOoxmlDocumentImportOption` | `trackChange` | 当前修订上下文，由 `w:ins` / `w:del` 向子 run 透传。 |
| `IOoxmlHeaderFooterImportOption` | `rootLocalName` | 页眉页脚根节点类型，取值为 `hdr` 或 `ftr`。 |

## 导出数据结构

| 数据结构 | 字段 | 说明 |
| --- | --- | --- |
| `IOoxmlPackageParts` | `[Content_Types].xml` | package 内容类型声明。 |
| `IOoxmlPackageParts` | `_rels/.rels` | package 根关系。 |
| `IOoxmlPackageParts` | `word/document.xml` | 正文 XML。 |
| `IOoxmlPackageParts` | `word/_rels/document.xml.rels` | 正文 relationship，包含 media、hyperlink、页眉页脚引用等。 |
| `IOoxmlPackageParts` | `word/styles.xml` / `word/fontTable.xml` / `word/numbering.xml` / `word/settings.xml` | 样式、字体表、编号和全局设置部件。 |
| `IOoxmlPackageParts` | `word/header*.xml` / `word/footer*.xml` | scoped 页眉页脚部件，按 `headerPageScopes/footerPageScopes` 生成。 |
| `IOoxmlPackageParts` | `word/media/*` | 图片等二进制媒体资源。 |

## 公式数据结构

| 数据结构 | 字段 | 说明 |
| --- | --- | --- |
| `IFormulaNode` | `type` | 公式 AST 节点类型，如 `fraction`、`sqrt`、`subscript`、`matrix`。 |
| `IFormulaNode` | `children` | group/root 等复合节点的子节点。 |
| `IFormulaNode` | `numerator` / `denominator` | 分式上下结构。 |
| `IFormulaNode` | `base` / `subscript` / `superscript` | 上下标结构。 |
| `IFormulaNode` | `rows` | 矩阵或方程组行列结构。 |

## API 入口

| API | 输入 | 输出 | 说明 |
| --- | --- | --- | --- |
| `createOoxmlPackageParts(data, options)` | `IEditorData` / `IEditorOption` | `IOoxmlPackageParts` | 生成 DOCX package 部件集合，适合调试 XML 或交给 ZIP 打包器。 |
| `createOoxmlDocxBytes(data, options)` | `IEditorData` / `IEditorOption` | `Uint8Array` | 生成 DOCX 字节。 |
| `createOoxmlDocxPackageBlob(data, options)` | `IEditorData` / `IEditorOption` | `Blob` | 浏览器侧生成可下载或打印链路消费的 DOCX Blob。 |
| `importOoxmlDocxBytesToEditorData(bytes)` | `Uint8Array` | `IOoxmlImportedEditorDataResult` | 高层 DOCX 导入入口，返回编辑器数据、页面设置和 package 上下文。 |
| `parseOoxmlDocumentXmlToEditorData(documentXml, options?)` | `string | Document` | `IOoxmlDocumentImportResult` | 解析主文档 XML，输出内部正文元素流和 `IEditorData.main`。 |
| `parseOoxmlHeaderFooterXmlToElementList(xml, options)` | `string` | `IElement[]` | 解析页眉或页脚 XML。 |
| `parseOoxmlMathElement(mathElement)` | `Element` | `IElement` | 解析单个 `m:oMath` 为结构化公式元素。 |
| `parseOoxmlMathParagraphElement(mathParagraphElement)` | `Element` | `IElement[]` | 解析 `m:oMathPara` 中的公式元素。 |

## Command API 对应关系

| 编辑器命令 | 内部入口 | 说明 |
| --- | --- | --- |
| `editor.command.getOoxmlPackageParts()` | `createOoxmlPackageParts()` | 返回当前文档的 OOXML package 部件，用于调试导出 XML。 |
| `editor.command.getOoxmlDocxBlob()` | `createOoxmlDocxPackageBlob()` | 返回当前文档 DOCX Blob。 |

## 维护约束

- 主导入链路只保留当前模型字段，不在主流程保留旧字段兼容分支。
- XML 属性解析必须明确当前支持的 OOXML 字段，新增字段时同步更新映射文档和回归样例。
- 公式导入必须先落到结构化 AST，再派生 LaTeX/displayText/OOXML，避免只保存展示文本。
- 导出字段缺失时应在对应 export adapter 中明确不支持范围，不在 import 主流程补临时判断。
