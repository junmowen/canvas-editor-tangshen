# Page Break Particle 目录索引

`page-break/particle/` 存放分页符业务元素的绘制能力。

## 位置说明

- 所属业务：`page-break`
- 所属层级：分页符粒子绘制层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/page-break/render/PageBreakRowRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageBreakParticle.ts` | 分页符可视标记绘制和文案读取 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `PageBreakParticle.ts` | `render(ctx, element, x, y)` | 绘制分页符可视标记。 | `page-break/render/PageBreakRowRenderer.ts` |

## 维护规则

- 分页符元素创建和命令策略放在 `page-break/command/`。
- 分页符绘制和文案读取放在这里。
