# Image Position 目录索引

`position/` 存放图片参与布局和位置计算的业务规则。

## 位置说明

- 所属业务：`image`
- 所属层级：position 策略层
- 上游调度：`position/Position.ts`、`draw/layout/InlineElementLayout.ts`
- 下游依赖：图片显示方式、元素 metrics 和缩放配置

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ImagePositionPolicy.ts` | 浮动图片位置缓存、图片偏移和浮动图片矩形计算策略 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ImagePositionPolicy.ts` | `shouldCacheFloatImagePosition(element)` | 判断图片元素是否需要缓存浮动位置。 | `position/Position.ts` |
| `ImagePositionPolicy.ts` | `shouldUseImageOffset(element)` | 判断图片是否需要使用行内垂直偏移。 | `draw/layout/InlineElementLayout.ts` |
| `ImagePositionPolicy.ts` | `ensureFloatImagePosition(payload)` | 在缺少浮动位置时根据当前 position 初始化浮动图片坐标。 | `position/Position.ts` |
| `ImagePositionPolicy.ts` | `resolveScaledFloatImageRect(payload)` | 根据浮动位置、图片尺寸和缩放计算绘制矩形。 | `position/Position.ts`、图片命中链路 |

## 维护规则

- 浮动图片位置缓存条件、图片垂直偏移规则放在这里。
- position 服务只负责套用策略和维护位置列表，不直接枚举图片展示模式。
