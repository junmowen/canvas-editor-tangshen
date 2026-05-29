# Image Interaction 目录说明

`image/interaction/` 存放图片点击、拖拽、预览器和全局清理等交互副作用。

## 位置说明

- 所属业务：`image`
- 所属层级：业务交互层
- 上游调用：pointer intents、`GlobalEvent`
- 下游依赖：`ImageParticle`、`Previewer`、range 和 draw

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `GlobalImageEffects.ts` | 清理全局图片浮层和选中态。 |
| `handleImageSelectionStart.ts` | 图片选区开始和双击预览处理。 |
| `ImageDragInteraction.ts` | 图片拖拽、浮动图片移动和 resizer 刷新。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `GlobalImageEffects.ts` | `clearGlobalImageEffects(draw)` | 清理图片预览器、resizer 和浮动图副作用。 | `GlobalEvent.clearSideEffect()` |
| `handleImageSelectionStart.ts` | `handleImageSelectionStart()` | 处理图片点击后的选区和预览器状态。 | `SelectionStartIntent.ts` |
| `handleImageSelectionStart.ts` | `renderImagePreviewForDblclick()` | 双击图片时渲染预览器。 | `dblclick` 链路 |
| `ImageDragInteraction.ts` | `isImageLikeDragElement()` / `isFloatingImageElement()` / `isSurroundImageElement()` | 判断拖拽图片类型。 | drag-drop intents |
| `ImageDragInteraction.ts` | `dragFloatingImageOnHover()` / `moveDraggedImagePosition()` | 悬停或提交时移动浮动图片。 | drag hover / commit |
| `ImageDragInteraction.ts` | `showImageResizer()` / `repaintDraggedImageResizer()` | 显示或重绘图片 resizer。 | pointer drag 链路 |
