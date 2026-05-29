# Image Clipboard 目录索引

`clipboard/` 存放剪贴板图片转编辑器图片元素的业务规则。

## 位置说明

- 所属业务：`image`
- 所属层级：剪贴板输入规则层
- 上游调度：`event/clipboard/pasteByClipboardEvent.ts`
- 下游依赖：FileReader、图片尺寸探测和 `draw.insertElementList()`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `pasteImageFile.ts` | 将剪贴板 File / Blob 读取为图片元素并插入文档 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `pasteImageFile.ts` | `pasteImageFile(draw, file)` | 读取剪贴板图片文件，探测尺寸后构造图片元素并插入文档。 | `event/clipboard/pasteByClipboardEvent.ts` |

## 维护规则

- File/Blob 读取、图片尺寸探测和 `ElementType.IMAGE` 构造放在这里。
- event clipboard 只负责识别剪贴板来源并调用图片插入能力。
