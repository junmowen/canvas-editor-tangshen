# Image Layout

`layout/` 存放图片元素参与行内布局测量的业务规则。

## 位置说明

- 上游调用：`draw/layout/InlineElementLayout.ts`、`RowLayoutEngine.ts`、`render-backend/worker/PageRenderSnapshotRowElementCommands.ts`、`PageRenderSnapshotValidator.ts`
- 下游依赖：图片元素和图片展示模式
- 迁移目的：公共布局和 worker 快照只调用图片布局策略，不直接判断图片类型或展示模式。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `InlineImageElementLayout.ts` | 图片元素识别、行内占位尺寸测量、浮动图片零占位策略和内联展示判断 |

## 函数说明

| 文件 | 函数 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `InlineImageElementLayout.ts` | `isInlineImageElement(element)` | 判断图片是否以内联模式展示 | `RowLayoutEngine` |
| `InlineImageElementLayout.ts` | `isImageElement(element)` | 判断元素是否是图片 | `PageRenderSnapshotRowElementCommands`、`PageRenderSnapshotValidator` |
| `InlineImageElementLayout.ts` | `InlineImageElementLayout.measure(payload)` | 测量图片行内占位；浮动/环绕图片在行内布局中置零占位 | `InlineElementLayout.measureElement()` |

## 维护规则

- 图片展示模式影响行内占位的判断留在本目录，不内联回 `draw/layout/InlineElementLayout.ts`。
- 图片展示模式影响断行的判断留在本目录，不内联回 `draw/layout/RowLayoutEngine.ts`。
