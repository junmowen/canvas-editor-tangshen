# Richtext Particle

`particle/` 存放富文本装饰相关的粒子绘制。

## 位置说明

- 所属业务：`richtext`
- 所属层级：行内文字粒子绘制层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/richtext/render/ScriptRowRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `AbstractScriptParticle.ts` | 上下标绘制共享基类 |
| `SuperscriptParticle.ts` | 上标文字绘制偏移 |
| `SubscriptParticle.ts` | 下标文字绘制偏移 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `AbstractScriptParticle.ts` | `getOffsetY(element)` | 由上标 / 下标具体粒子实现纵向偏移。 | `AbstractScriptParticle.render()` |
| `AbstractScriptParticle.ts` | `render(ctx, element, x, y)` | 按偏移位置绘制上标或下标文本。 | `richtext/render/ScriptRowRenderer.ts` |
| `SuperscriptParticle.ts` | `getOffsetY(element)` | 返回上标文本向上的偏移量。 | `AbstractScriptParticle.render()` |
| `SubscriptParticle.ts` | `getOffsetY(element)` | 返回下标文本向下的偏移量。 | `AbstractScriptParticle.render()` |

## 维护规则

- 上下标属于富文本装饰粒子，不再放回 `draw/particle/`。
- 通用文本、换行等基础粒子继续保留在 `draw/particle/`。
