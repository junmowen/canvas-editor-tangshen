# Event Clipboard 目录说明

`clipboard/` 存放粘贴链路，负责从 Clipboard API 或 ClipboardEvent 读取内容，并按 HTML、纯文本、图片和编辑器内部数据落到文档。

## 位置说明

- 所属层级：事件层 / 剪贴板输入
- 上游调用：`EditorClipboardController.ts`、`EditorInputController.ts`
- 下游依赖：`CanvasEvent`、`draw/data/**`、粘贴解析工具

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `applyPasteElements.ts` | 将解析后的元素列表插入编辑器。 |
| `pasteByClipboardApi.ts` | 通过浏览器 Clipboard API 主动读取并粘贴。 |
| `pasteByClipboardEvent.ts` | 通过原生 paste 事件读取并粘贴。 |
| `pasteClipboardCommon.ts` | 粘贴前置校验、编辑器内部数据和类型判断公共函数。 |
| `pasteHtml.ts` | HTML 文本粘贴解析。 |
| `pastePlainText.ts` | 纯文本粘贴解析。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `applyPasteElements.ts` | `applyPasteElements(host, elementList)` | 将粘贴解析后的元素插入当前位置并触发渲染。 | `pasteHtml.ts`、`pastePlainText.ts`、图片粘贴链路 |
| `pasteByClipboardEvent.ts` | `pasteByClipboardEvent(host, evt)` | 处理原生 paste 事件中的 HTML、文本、图片和内部数据。 | `EditorClipboardController.pasteByEvent()` |
| `pasteClipboardCommon.ts` | `canRunPaste()` | 判断当前状态是否允许粘贴。 | `pasteByClipboardEvent.ts`、`pasteByClipboardApi.ts` |
| `pasteClipboardCommon.ts` | `tryApplyEditorClipboardData()` | 优先尝试应用编辑器内部剪贴板数据。 | 粘贴入口 |
| `pasteClipboardCommon.ts` | `hasClipboardHtmlType()` / `getClipboardTextType()` / `getClipboardImageType()` | 判断剪贴板类型。 | 粘贴入口 |
| `pasteHtml.ts` | `pasteHtml(host, htmlText)` | 将 HTML 转成元素并插入。 | `pasteByClipboardEvent.ts`、`pasteByClipboardApi.ts` |
| `pastePlainText.ts` | `pastePlainText(host, plainText)` | 将纯文本转成元素并插入。 | `pasteByClipboardEvent.ts`、`pasteByClipboardApi.ts` |
