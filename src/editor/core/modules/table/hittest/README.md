# Table Hittest 目录说明

`table/hittest/` 存放表格 pointer 命中和浮动图片命中解析。

## 位置说明

- 所属业务：`table`
- 所属层级：业务命中层
- 上游调用：`PositionHitTestMethods.ts`、pointer hit intent
- 下游依赖：表格布局快照、positionList、cell slice

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableHitTestService.ts` | 表格命中统一服务。 |
| `resolveTablePointerHit.ts` | 表格 pointer 命中入口。 |
| `resolveTableFloatImageHit.ts` | 表格上下文中的浮动图片命中。 |
| `TableHitTestTypes.ts` | 表格命中请求和结果类型。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TableHitTestService.ts` | `resolve(payload)` | 解析表格 fragment、cell、glyph box 和 public position。 | `resolveTablePointerHit.ts` |
| `resolveTablePointerHit.ts` | `resolveTablePointerHit()` | 根据指针位置解析表格命中结果。 | pointer hit intent、Position |
| `resolveTableFloatImageHit.ts` | `resolveTableFloatImageHit()` | 解析表格单元格内浮动图片命中。 | `PositionHitTestMethods.ts` |
