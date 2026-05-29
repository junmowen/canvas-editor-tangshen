# Richtext Runtime

`runtime/` 存放文本装饰运行对象。

## 位置说明

- 所属业务：`richtext`
- 所属层级：文本装饰运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/richtext/render/RowHighlightRenderer.ts`、`modules/richtext/render/RowTextDecorationRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `AbstractRichText.ts` | 下划线、删除线和高亮共享的 fill rect 缓存与颜色切换逻辑 |
| `Underline.ts` | 单线、双线、虚线、点线、波浪线下划线绘制 |
| `Strikeout.ts` | 删除线绘制 |
| `Highlight.ts` | 文本高亮背景绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `AbstractRichText.ts` | `clearFillInfo()` / `recordFillInfo(...)` | 管理文本装饰待绘制矩形和颜色。 | `richtext/render/RowHighlightRenderer.ts`、`RowTextDecorationRenderer.ts` |
| `AbstractRichText.ts` | `render(ctx)` | 文本装饰绘制抽象入口，由具体装饰实现。 | `Underline.ts`、`Strikeout.ts`、`Highlight.ts` |
| `Underline.ts` | `render(ctx)` | 按下划线类型绘制单线、双线、虚线、点线或波浪线。 | `richtext/render/RowTextDecorationRenderer.ts`、`ScriptRowRenderer.ts` |
| `Strikeout.ts` | `render(ctx)` | 绘制删除线并清理缓存。 | `richtext/render/RowTextDecorationRenderer.ts` |
| `Highlight.ts` | `render(ctx)` | 绘制文本高亮背景并清理缓存。 | `richtext/render/RowHighlightRenderer.ts` |

## 维护规则

- 只放文本装饰运行对象。
- 控件内部边框等控件专属装饰继续放在 `modules/control/runtime/`。
