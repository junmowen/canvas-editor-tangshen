# Image Previewer 目录说明

`image/particle/previewer/` 存放图片预览和 resize 操作浮层。

## 位置说明

- 所属业务：`image`
- 所属层级：图片粒子 / 预览器
- 上游调用：图片点击、双击和拖拽链路
- 下游依赖：图片 DOM、resizer DOM、draw 状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Previewer.ts` | 图片预览器渲染、resizer 绘制、更新和清理。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Previewer.ts` | `render()` | 渲染图片预览器。 | 图片点击和双击链路 |
| `Previewer.ts` | `drawResizer()` / `updateResizer()` | 绘制和更新 resize 控件。 | 图片选中和拖拽链路 |
| `Previewer.ts` | `clearResizer()` | 清理 resize 控件。 | 全局点击清理、生命周期 |
| `Previewer.ts` | `_setPreviewerTransform()` / `_updateResizerRect()` / `_updateResizerSizeView()` | 更新预览器和 resizer 位置尺寸。 | `Previewer` 内部和图片拖拽 |
