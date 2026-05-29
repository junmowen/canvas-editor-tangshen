# Image HitTest 目录索引

`hittest/` 存放图片命中测试相关的业务规则。

## 位置说明

- 所属业务：`image`
- 所属层级：命中测试策略层
- 上游调度：`position/PositionHitTestMethods.ts`、`modules/table/hittest/*`
- 下游依赖：图片显示方式、元素坐标和浮动图片矩形

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ImageHitTestPolicy.ts` | 图片 / LaTeX 直击、浮动图片前后景命中和候选判断 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ImageHitTestPolicy.ts` | `getFrontFloatImageHitDisplays()` / `getBackFloatImageHitDisplays()` | 返回前景 / 背景浮动图片命中的显示模式集合。 | `position/PositionHitTestMethods.ts`、表格图片命中链路 |
| `ImageHitTestPolicy.ts` | `isImageDirectHitElement(element)` | 判断元素是否可按图片 / LaTeX 直接命中。 | `position/PositionHitTestMethods.ts` |
| `ImageHitTestPolicy.ts` | `isFloatImageHitCandidate(payload)` | 判断元素是否属于指定浮动层级的候选图片。 | `position/PositionHitTestMethods.ts` |
| `ImageHitTestPolicy.ts` | `isPointInFloatImageElement(payload)` | 判断坐标点是否落在浮动图片矩形内。 | `position/PositionHitTestMethods.ts` |

## 维护规则

- 图片/LaTeX 直击识别、浮动图片命中展示层级和命中候选判断放在这里。
- position 命中流程可以调用这里的策略，但不直接散写图片展示模式枚举。
- 浮动图片前景/背景命中优先级通过语义函数暴露，公共层不直接引用展示模式常量。
