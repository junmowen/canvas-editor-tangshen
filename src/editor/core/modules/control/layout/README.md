# Control Layout

`layout/` 存放控件元素参与行内布局测量的业务规则。

## 位置说明

- 所属业务：`control`
- 所属层级：行内布局测量层
- 上游调度：`draw/layout/InlineElementLayout.ts`、`draw/layout/RowLayoutEngine.ts`
- 下游依赖：checkbox / radio 配置、控件 minWidth 状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `CheckableControlElementLayout.ts` | checkbox / radio 的行内尺寸、gap 测量和值联动列方向断行判断 |
| `ControlRowLayoutPolicy.ts` | 控件 minWidth、后缀偏移和 VALUE_START 换行缩进策略 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `CheckableControlElementLayout.ts` | `shouldBreakBeforeColumnCheckable(payload)` | 判断列方向 checkbox / radio 值联动控件是否需要在 VALUE 后强制换行。 | `draw/layout/RowLayoutEngine.ts` |
| `CheckableControlElementLayout.ts` | `constructor(draw)` | 注入 `Draw` 运行时，用于读取 checkbox / radio 尺寸配置。 | `draw/layout/InlineElementLayout.ts` 构造函数 |
| `CheckableControlElementLayout.ts` | `measure(payload)` | 识别 checkbox / radio 元素或控件组件，并写入行内 metrics。 | `draw/layout/InlineElementLayout.ts` 的行内测量流程 |
| `CheckableControlElementLayout.ts` | `applyMetrics(element, metrics, scale, option)` | 按控件配置写入元素宽度、测量宽度和测量高度。 | `CheckableControlElementLayout.measure()` |
| `ControlRowLayoutPolicy.ts` | `consumeMinWidthControlLayout(payload)` | 在控件后缀位置消费 minWidth 状态，计算并登记控件实际宽度。 | `draw/layout/RowLayoutEngine.ts` |
| `ControlRowLayoutPolicy.ts` | `resolveValueStartIndentOffset(payload)` | 解析 VALUE_START 缩进控件换行后应继承的横向偏移。 | `draw/layout/RowLayoutEngine.ts` |

## 维护规则

- 控件组件类型到行内尺寸的映射留在本目录，不内联回 `draw/layout/InlineElementLayout.ts`。
- 控件 flexDirection 影响断行的判断留在本目录，不内联回 `draw/layout/RowLayoutEngine.ts`。
- 控件 minWidth、PREFIX / POSTFIX 和 VALUE_START 缩进策略留在本目录，不内联回 `draw/layout/RowLayoutEngine.ts`。
