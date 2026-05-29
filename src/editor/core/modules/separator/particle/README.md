# Separator Particle 目录索引

`separator/particle/` 存放分隔符业务元素的绘制能力。

## 位置说明

- 所属业务：`separator`
- 所属层级：分隔符粒子绘制层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/separator/render/SeparatorRowRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `SeparatorParticle.ts` | 分隔符线型、区域宽度适配和 Canvas 绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `SeparatorParticle.ts` | `render(ctx, element, x, y, zone)` | 根据分隔符配置、dashArray 和区域上下文绘制分隔线。 | `separator/render/SeparatorRowRenderer.ts` |

## 维护规则

- 分隔符元素创建和命令策略放在 `separator/command/`。
- 分隔符绘制、线型和区域适配放在这里。
