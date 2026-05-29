# Control Runtime 目录索引

`control/runtime/` 存放控件运行实现，包含控件管理器、具体控件类型、控件值读写、生命周期和渲染辅助。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行对象和具体控件实现层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`control/interaction/`、`control/navigation/`、`control/policy/`、`control/render/`、`draw/data/DrawTargetResolverService.ts`

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `checkbox/` | 复选框控件运行实现 |
| `date/` | 日期控件运行实现和日期选择器接入 |
| `interactive/` | 控件搜索高亮等运行期交互辅助 |
| `number/` | 数字控件运行实现 |
| `radio/` | 单选框控件运行实现 |
| `richtext/` | 控件边框等富文本渲染辅助 |
| `select/` | 下拉控件运行实现 |
| `text/` | 文本控件运行实现 |

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `Control.ts` | 控件管理器入口，聚合控件高亮、边界、生命周期、值读写、导航和边框 |
| `ControlLifecycleMethods.ts` | 控件初始化、激活、光标和生命周期方法挂载 |
| `ControlValueMethods.ts` | 控件值设置、读取、序列化和反序列化方法挂载 |
| `controlAnchor.ts` / `controlCursor.ts` | 控件锚点和控件内光标移动结果解析 |
| `controlMatch.ts` / `controlNeighbor.ts` | 控件身份匹配和相邻控件上下文解析 |
| `controlNested.ts` / `controlTraversal.ts` | 嵌套控件值展开和控件元素遍历 |
| `controlRead.ts` / `controlScan.ts` / `controlType.ts` / `controlValue.ts` | 控件读取、范围扫描、类型判断和值域边界工具 |
| `checkbox/` / `radio/` / `text/` / `number/` / `select/` / `date/` | 具体控件类型实现 |
| `interactive/ControlSearch.ts` | 控件搜索高亮计算和绘制 |
| `richtext/Border.ts` | 控件边框记录和绘制 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Control.ts` | `setHighlightList()` / `computeHighlightList()` / `renderHighlightList()` | 管理控件搜索高亮数据并按页绘制。 | `control/render/PageControlHighlightRenderer.ts`、搜索计算链路 |
| `Control.ts` | `filterAssistElement(elementList)` | 过滤控件辅助元素，得到业务值元素。 | 控件取值和命令查询链路 |
| `Control.ts` | `getIsRangeCanCaptureEvent()` / `getIsRangeWithinControl()` / `getIsRangeInPostfix()` | 判断当前 range 是否可被控件捕获、是否处于控件内或后缀内。 | `control/interaction/*`、键盘输入链路 |
| `Control.ts` | `getIsRangeControlDeletionDisabled()` / `getIsDisabledControl()` / `getIsDisabledPasteControl()` | 判断控件删除、禁用和粘贴限制。 | `control/policy/*`、键盘和剪贴板链路 |
| `Control.ts` | `selectAllValue()` / `getIsElementListContainFullControl()` | 处理控件值域全选和整控件覆盖判断。 | 控件选择、删除和复制链路 |
| `Control.ts` | `getContainer()` / `getElementList()` / `getPosition()` / `getEditBoundaryRange()` | 暴露控件运行容器、元素、位置和编辑边界。 | 具体控件实现、导航和渲染链路 |
| `Control.ts` | `shrinkBoundary()` / `getControlElementList()` / `updateActiveControlValue()` | 收缩控件边界、读取控件元素列表并同步 active control 值。 | range、输入和控件生命周期链路 |
| `Control.ts` | `emitControlChange()` / `recordBorderInfo()` / `drawBorder()` | 派发控件变更事件并记录 / 绘制控件边框。 | `control/render/*`、具体控件实现 |
| `Control.ts` | `getPreControlContext()` / `getNextControlContext()` / `initNextControl()` | 解析并切换前后控件。 | `control/navigation/*` |
| `Control.ts` | `setMinWidthControlInfo(option)` | 缓存 minWidth 控件行布局信息。 | `control/layout/ControlRowLayoutPolicy.ts` |
| `ControlLifecycleMethods.ts` | `installControlLifecycleMethods(ControlClass)` | 将初始化、激活、销毁、keydown、cut 等生命周期方法挂载到 `Control`。 | `Control.ts` 模块初始化 |
| `ControlValueMethods.ts` | `installControlValueMethods(ControlClass)` | 将控件取值、设值、序列化和反序列化方法挂载到 `Control`。 | `Control.ts` 模块初始化 |
| `checkbox/CheckboxControl.ts` | `getValue()` / `setValue()` / `setSelect()` / `keydown()` / `cut()` | 实现 checkbox 控件值读写、选择、键盘和剪切。 | `Control.ts`、`control/interaction/ControlToggleInteraction.ts` |
| `radio/RadioControl.ts` | `setSelect()` | 实现 radio 单选值更新。 | `ControlToggleInteraction.ts` |
| `text/TextControl.ts` | `getValue()` / `setValue()` / `clearValue()` / `keydown()` / `cut()` | 实现文本控件值读写、清空、键盘和剪切。 | `Control.ts`、输入 / 删除链路 |
| `select/SelectControl.ts` | `getCodes()` / `getText()` / `getValue()` / `setValue()` / `setSelect()` / `awake()` / `destroy()` | 实现下拉控件值转换、选择浮层和生命周期。 | `Control.ts`、指针和键盘链路 |
| `date/DateControl.ts` | `getValueRange()` / `getValue()` / `setValue()` / `setSelect()` / `awake()` / `destroy()` | 实现日期控件值域、日期选择器和生命周期。 | `Control.ts`、日期控件交互链路 |
| `interactive/ControlSearch.ts` | `setHighlightList()` / `computeHighlightList()` / `renderHighlightList()` | 计算控件命中高亮并按页绘制。 | `Control.ts` |
| `richtext/Border.ts` | `clearBorderInfo()` / `recordBorderInfo()` / `render(ctx)` | 记录并绘制控件边框。 | `Control.ts`、`control/render/RowControlBorderRenderer.ts` |
| `controlValue.ts` | `isControl*Component()` / `resolveControlValueBoundary()` / `resolveStartPlaceholderOnlyControlRange()` | 判断控件组件类型并解析控件值域边界。 | `Control.ts`、具体控件实现、`control/selection/*` |
| `controlTraversal.ts` | `walkControlElementList(payload)` / `transformTableCellValueList(...)` | 遍历控件元素列表并处理表格单元格内控件值。 | `ControlValueMethods.ts` |
| `controlRead.ts` / `controlScan.ts` | `collectTextControlValueBlock()` / `resolveControlCodeDisplayText()` / `resolveControlBlockEndIndex()` | 读取控件文本块、选项展示文本和控件块结束位置。 | `ControlValueMethods.ts`、`ControlSearch.ts` |

## 维护规则

- 控件运行实现统一放在这里，`draw/` 不再承载控件业务目录。
- 事件、键盘、指针等入口应通过 `modules/control/interaction`、`policy`、`navigation`、`selection` 或本目录入口访问控件能力。
