# Control Particle 目录索引

`control/particle/` 存放控件业务元素的绘制和状态切换能力。

## 位置说明

- 所属业务：`control`
- 所属层级：控件粒子绘制层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/control/render/CheckableControlRenderer.ts`、`modules/list/particle/ListParticle.ts`、`modules/control/interaction/ControlToggleInteraction.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `checkableParticle.ts` | checkbox / radio 通用选中状态和绘制状态解析 |
| `CheckboxParticle.ts` | checkbox 绘制和独立状态切换 |
| `RadioParticle.ts` | radio 绘制和独立状态切换 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `checkableParticle.ts` | `toggleCheckableElement(element)` | 切换 checkable 元素的选中状态。 | `CheckboxParticle.setSelect()`、`RadioParticle.setSelect()` |
| `checkableParticle.ts` | `resolveCheckableRenderState(payload)` | 解析 checkbox / radio 绘制所需状态。 | `CheckboxParticle.render()`、`RadioParticle.render()` |
| `CheckboxParticle.ts` | `setSelect(element)` | 切换独立 checkbox 元素状态。 | `control/interaction/ControlToggleInteraction.ts` |
| `CheckboxParticle.ts` | `render(payload)` | 绘制 checkbox 控件或列表 checkbox 标记。 | `control/render/CheckableControlRenderer.ts`、`list/particle/ListParticle.ts` |
| `RadioParticle.ts` | `setSelect(element)` | 切换独立 radio 元素状态。 | `control/interaction/ControlToggleInteraction.ts` |
| `RadioParticle.ts` | `render(payload)` | 绘制 radio 控件。 | `control/render/CheckableControlRenderer.ts` |

## 维护规则

- checkbox、radio 等控件粒子的绘制和选中状态切换放在这里。
- 控件命中、导航、输入和选区规则分别放在 `control/hittest`、`control/navigation`、`control/interaction`、`control/selection`。
- 通用文本绘制仍归属 `core/draw/particle/`。
