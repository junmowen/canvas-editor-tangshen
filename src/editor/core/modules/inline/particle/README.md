# Inline Particle 目录索引

`inline/particle/` 存放内联业务元素的绘制和浮层运行时。

## 位置说明

- 所属业务：`inline`
- 所属层级：内联粒子绘制层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/inline/render/InlineRowElementRenderer.ts`、`modules/inline/interaction/*`、`draw/runtime/DrawLifecycleService.ts`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `HyperlinkParticle.ts` | 超链接文本绘制、弹层提示、打开链接和清理 |
| `date/` | 日期内联元素绘制和日期选择浮层 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `HyperlinkParticle.ts` | `drawHyperlinkPopup(element, position)` | 在超链接命中位置绘制跳转提示浮层。 | `inline/interaction/applyInlinePointerEffects.ts` |
| `HyperlinkParticle.ts` | `clearHyperlinkPopup()` | 清理超链接提示浮层。 | `draw/runtime/DrawLifecycleService.ts`、`command/CommandAdaptMedia.ts`、`inline/interaction/GlobalInlineEffects.ts` |
| `HyperlinkParticle.ts` | `openHyperlink(element)` | 打开超链接地址。 | 超链接指针交互链路 |
| `HyperlinkParticle.ts` | `render(ctx, element, x, y)` | 绘制超链接文本并补齐默认下划线状态。 | `inline/render/InlineRowElementRenderer.ts` |

## 维护规则

- 超链接弹层、跳转提示和内联元素绘制相关能力放在这里。
- 日期控件的业务绘制与日期选择浮层放在 `date/`，避免回落到通用绘制目录。
- 通用文本绘制仍归属 `core/draw/particle/`。
