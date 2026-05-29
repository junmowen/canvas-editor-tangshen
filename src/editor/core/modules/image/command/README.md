# Image Command 目录索引

`command/` 存放图片命令复用的业务规则。

## 位置说明

- 所属业务：`image`
- 所属层级：命令适配业务规则层
- 上游调度：`command/CommandAdaptMedia.ts`
- 下游依赖：文档元素数据、图片下载工具、图片位置列表

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ImageCommandPolicy.ts` | 图片元素创建、资源替换、资源保存和显示方式切换策略 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ImageCommandPolicy.ts` | `createCommandImageElement(payload, imageId)` | 将插入图片 payload 转换为带 id 和 `ElementType.IMAGE` 的文档元素。 | `command/CommandAdaptMedia.ts` 的 `executeImage()` |
| `ImageCommandPolicy.ts` | `replaceImageElementValue(element, value)` | 当前元素为图片时替换图片资源值，并返回是否成功。 | `command/CommandAdaptMedia.ts` 的 `replaceImage()` |
| `ImageCommandPolicy.ts` | `saveImageElement(element)` | 当前元素为图片时按元素 id 导出图片资源文件。 | `command/CommandAdaptMedia.ts` 的 `saveImage()` |
| `ImageCommandPolicy.ts` | `applyImageDisplayChange(payload)` | 切换图片显示方式，并为浮动显示同步初始页码和坐标。 | `command/CommandAdaptMedia.ts` 的 `changeImageDisplay()` |
| `ImageCommandPolicy.ts` | `isFloatingImageDisplay(display)` | 判断目标显示方式是否需要浮动图片位置。 | `applyImageDisplayChange()` |

## 维护规则

- 图片元素创建、替换、保存和显示方式切换的具体规则放在这里。
- command 适配层只负责校验命令状态、调用图片命令规则并触发渲染。
