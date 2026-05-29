# Image 目录索引

`image/` 存放图片、LaTeX 图片化预览和浮动图片相关的业务交互。

## 维护规则

- 图片命中后的预览器 resizer、浮动图片创建、图片 mousedown 事件派发放在这里。
- 图片命令复用规则放在 `command/`。
- 图片右键菜单配置放在 `contextmenu/`。
- 剪贴板图片转编辑器图片元素的插入规则放在 `clipboard/`。
- 图片命中测试策略放在 `hittest/`，图片参与 position 计算的规则放在 `position/`。
- 图片和 LaTeX 参与行内布局测量的规则放在 `layout/`。
- 浮动图片渲染和页眉页脚浮动图过滤放在 `render/`。
- 编辑器外部点击触发的图片浮层/浮动图清理放在 `interaction/`。
- event intent 只传入 draw、元素、位置和事件，不直接判断图片展示模式。
- 控件只读态影响图片拖拽时，通过 control policy 提供判定，不把控件细节散落到 event。

## 位置说明

- 所属层级：业务模块层 / 图片
- 上游调用：clipboard、pointer、layout、render、command
- 下游依赖：`particle/`、`interaction/`、`hittest/`、`position/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `particle/` | 图片、LaTeX 和预览器运行对象。 |
| `interaction/` | 图片点击、拖拽、预览器和全局清理。 |
| `clipboard/` / `command/` / `contextmenu/` | 图片粘贴、命令和菜单。 |
| `hittest/` / `position/` / `layout/` / `render/` | 图片命中、position、测量和渲染策略。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `particle/ImageParticle.ts` | image particle 方法 | 图片绘制、加载、浮动图管理。 | row render、page render |
| `particle/latex/LaTexParticle.ts` | `convertLaTextToSVG()` / `render()` | LaTeX 转图片并绘制。 | image particle |
| `particle/previewer/Previewer.ts` | `render()` / `drawResizer()` / `clearResizer()` | 图片预览和 resize 浮层。 | pointer interaction |
| `interaction/ImageDragInteraction.ts` | 图片拖拽 helper | 处理浮动图片拖拽和 resizer 刷新。 | drag-drop intents |
| `clipboard/` / `command/` | image paste / command helper | 图片粘贴和命令创建。 | clipboard、command |
