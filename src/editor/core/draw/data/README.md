# Draw Data 目录说明

`data/` 是 draw 层的数据读写和文档值转换区域，集中处理元素列表、异步插入、目标解析、导出值和 mutation。

## 位置说明

- 所属层级：公共绘制层 / 数据访问与 mutation 层
- 上游调用：`Draw.ts`、业务模块、事件输入链路
- 下游依赖：运行时状态、历史、布局、表格快照

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawDataAccess.ts` | 只读数据访问门面，读取正文、页眉页脚、表格和行数据。 |
| `DrawMutationService.ts` | 文档插入、追加、删除替换和 setValue 的统一 mutation 服务。 |
| `DrawObjectResolverService.ts` | 按索引或上下文解析元素、行、表格、页眉页脚对象。 |
| `DrawTargetResolverService.ts` | 解析 range、control、table、cell slice 等复杂目标。 |
| `DrawValueService.ts` | 编辑器数据导入导出与 `IEditorResult` 生成。 |
| `DrawExportService.ts` | 打印模式和图片导出服务。 |
| `DrawInsertBatcher.ts` | 大批量插入拆批权重计算。 |
| `AsyncInsertTransactionManager.ts` | 异步插入事务状态、调度和统计。 |
| `DocumentTextStore.ts` | 正文元素存储抽象和数组实现。 |
| `ProgrammaticTypingBatcher.ts` | 程序化连续输入合并。 |
| `DrawTargetResolverTypes.ts` | target resolver 使用的表格、range、control 类型。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawDataAccess.ts` | `getElementList()` / `getMainElementList()` / `getRowList()` / `getPageRowList()` | 读取当前正文和布局行数据。 | `Draw.ts`、layout、render |
| `DrawMutationService.ts` | `insertElementList()` / `appendElementList()` / `spliceElementList()` | 对正文元素执行增删插操作并触发布局刷新。 | 输入、粘贴、业务模块 |
| `DrawMutationService.ts` | `setValue()` / `flushAsyncInsertTransaction()` | 写入整篇文档或刷新异步插入事务。 | 外部 API、批量导入 |
| `AsyncInsertTransactionManager.ts` | `start()` / `schedule()` / `flush()` / `cancel()` | 管理大文档异步插入生命周期。 | `DrawMutationService.ts` |
| `DocumentTextStore.ts` | `splice()` / `insert()` / `delete()` / `replaceAll()` | 维护正文元素数组和版本统计。 | `DrawRuntime.ts`、`DrawMutationService.ts` |
| `DocumentTextStore.ts` | `createDocumentTextStoreElementSignature()` | 生成元素签名用于外部 mutation 统计。 | `Draw.ts`、`DocumentTextStore` |
| `DrawInsertBatcher.ts` | `getRawInsertWeight()` / `createRawInsertBatchList()` | 计算插入权重并拆分批次。 | `DrawMutationService.ts` |
| `DrawObjectResolverService.ts` | `getElement()` / `getMainElement()` / `getOriginalMainElement()` | 按索引读取不同视图中的元素。 | range、table、event |
| `DrawTargetResolverService.ts` | `resolveRangeBoundaryElements()` / `resolveRangeElement()` | 解析选区边界和 range 目标元素。 | range、copy、delete |
| `DrawTargetResolverService.ts` | `resolveTableTarget()` / `resolveActiveLogicalTableCell()` / `getCellSlicesByLogicalCell()` | 解析表格、单元格和分页片段。 | table 模块、命中链路 |
| `DrawValueService.ts` | `getOriginValue()` / `getValue()` / `setEditorData()` | 导出原始值、编辑器结果或写入数据。 | 外部 API、`Draw.ts` |
| `DrawExportService.ts` | `setPrintData()` / `clearPrintData()` / `getDataURL()` | 切换打印数据并导出页面图片。 | `Draw.ts`、导出 API |
| `ProgrammaticTypingBatcher.ts` | `tryQueue()` / `flush()` | 合并连续程序化输入以减少重复布局。 | `DrawMutationService.ts` |
