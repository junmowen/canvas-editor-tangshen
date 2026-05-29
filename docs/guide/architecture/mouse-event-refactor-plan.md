# 鼠标事件重构方案

## 目标

当前鼠标事件链已经具备较多能力，但主问题不是“功能缺失”，而是“职责堆叠”：

- `CanvasEvent` 同时承担事件注册、运行态缓存、点击计数、拖拽状态和对外调度职责
- `mousedown / mousemove / mouseup / click / dragover` 里混合了命中、选区、控件、图片、表格、超链接、日期、拖放收尾
- 同一类上下文在多个处理器里重复拼装，例如 `positionContext`
- 状态字段直接散落在 `CanvasEvent` 上，后续补丁只能继续往事件处理器里塞条件分支

这份文档的目标不是做一次“文件移动”，而是把鼠标交互拆成稳定的运行时域：

1. 事件接入层
2. Pointer 会话状态层
3. 命中解析层
4. 交互意图层
5. UI 副作用层
6. 统一鼠标坐标体系

最终效果是：新增行为时优先加模块，不再优先改 `mousedown.ts` 这种总入口文件。

如果这一条不先收口，后面仍然会持续出现：

- 命中位置不一致
- 跨页拖选抖动
- 浮动图片拖拽位移不稳定
- overlay / page / viewport 坐标互相混算

## 当前进度

截至当前仓库状态，这份方案里最核心的结构已经不是“待设计”，而是已部分落地：

- `CanvasEvent` 已退化为注册入口与少量门面
- 鼠标主链已进入 `PointerController`
- 鼠标运行态已进入 `PointerSession`
- 鼠标会话收尾已进入 `PointerSessionController`
- 输入链已拆为 `EditorInputController`
- 粘贴链已拆为 `EditorClipboardController`
- 键盘分发已进入 `KeyboardController`
- `pointer/intents` 与 `pointer/effects` 已经开始承接真实主逻辑
- `keyboard/intents` 与 `keyboard/shared` 已经开始承接键盘主逻辑

也就是说，当前文档里关于目录与职责的建议，已经有相当一部分变成了真实代码结构。

---

## 当前问题定位

### 1. 入口薄，但状态过厚

文件：

- `CanvasEvent.ts`

这曾经是当前主问题。  
现在这些状态已经从 `CanvasEvent` 主体迁到 `PointerSession`，这一节保留为问题背景，用于解释为什么要这样拆。

当时 `CanvasEvent` 直接维护了大量鼠标运行态：

- `isAllowSelection`
- `isAllowDrag`
- `isAllowDrop`
- `cacheRange`
- `cacheElementList`
- `cachePositionList`
- `cachePositionContext`
- `mouseDownStartPosition`
- `lastTableCellClickInfo`
- `lastTableCellDblclickInfo`
- `tableCellDblclickCount`

这些状态并不属于“事件总线”，而属于一次 pointer 会话。把它们直接挂在 `CanvasEvent` 上，会导致：

- 状态生命周期不清晰
- `mousedown` 和 `mouseup` 只能通过隐式约定配对
- 任意处理器都能读写状态，调试成本高

### 2. 单个处理器承担太多职责

文件：

- `mousedown.ts`
- `mousemove.ts`
- `mouseup.ts`
- `click.ts`
- `drag.ts`

典型症状：

- `mousedown.ts` 同时处理拖拽初始化、命中、选区起点、checkbox/radio、图片 resizer、table tool、hyperlink、date picker
- `mouseup.ts` 同时处理拖放完成、图片浮动定位、控件安全校验、元素搬移、历史提交、重绘恢复
- `mousemove.ts` 同时处理 drag hover、浮动图移动、选区扩展、跨页切换、table tool 收口、渲染策略

这不是简单的“代码长”，而是事件阶段和业务意图混在一起。

### 3. 命中结果和 UI 副作用耦合

例如以下逻辑在多个地方重复出现：

- `draw.getEventPagePoint(evt)`
- `tableHitTestService.resolve(...)`
- `position.setPositionContext(...)`
- `draw.setPageNo(...)`

这说明当前缺一个统一的 pointer context 解析层。  
现在每个 handler 都自己把“浏览器事件”翻译成“编辑器命中语义”。

### 3.1 坐标体系没有统一，属于当前最高风险点

当前代码里同时存在多套坐标来源：

- `evt.offsetX / evt.offsetY`
- `evt.clientX / evt.clientY`
- `evt.x / evt.y`
- `evt.movementX / evt.movementY`
- `draw.getEventPagePoint(evt)` 返回的 `pagePoint.x / pagePoint.y`

并且这些坐标被混用于不同场景：

- 命中测试：`pagePoint` 和 `offsetX/offsetY` 混用
- 拖拽选区：`pagePoint` 和 `offsetX/offsetY` 混用
- 浮动图拖动：`movementX/movementY`
- 浮动图落点提交：`offsetX/offsetY - mouseDownStartPosition`
- 预览器 / 表格工具：直接用 `evt.x / evt.y`
- 上下文菜单 / zone tip：直接用视口坐标

这会导致两个典型问题：

1. 同一帧里“命中坐标”和“视觉位移坐标”可能不在同一个参考系
2. 一旦事件目标不是 page canvas 本身，`offsetX/offsetY` 的语义就会变化

对当前仓库来说，坐标统一不是附属优化，而是鼠标重构的前置条件。

### 4. click / dblclick / threeClick 之间是补丁式关系

文件：

- `CanvasEvent.ts`
- `click.ts`

当前表格双击计数依赖：

- `lastTableCellClickInfo`
- `lastTableCellDblclickInfo`
- `tableCellDblclickCount`
- `setTimeout(250)`

这套逻辑能工作，但状态散在 `CanvasEvent` 和 `click.ts` 两边，不利于继续扩展长按、多击、拖选抑制 click 等规则。

### 5. 观察者和主处理链重复监听

文件：

- `MouseObserver.ts`
- `CanvasEvent.ts`

当前 `MouseObserver` 和 `CanvasEvent` 都直接绑定 `pageContainer` 鼠标事件。  
这会带来两个问题：

- 同一原生事件存在两个平行入口
- 之后如果需要统一节流、调试、事件屏蔽，会出现改一处漏一处

---

## 重构原则

### 1. 先拆状态，再拆 handler

不要先把 `mousedown.ts` 人工切成 10 个文件。  
如果状态仍然挂在 `CanvasEvent` 上，拆文件只会得到更多共享隐式状态的薄文件。

### 2. 区分“事件阶段”和“交互意图”

建议固定两层：

- 事件阶段：`pointerdown / pointermove / pointerup / click / dblclick / wheel / dragover`
- 交互意图：`selection / drag-drop / image-resize / table-tool / hyperlink / date-picker / control-toggle`

事件阶段只负责分发，交互意图才负责业务判断。

### 3. 命中解析必须单点收口

浏览器坐标转编辑器命中结果，应该统一走一个解析器，产出标准 `PointerContext`，避免每个 handler 重复组装：

- pagePoint
- pageNo
- hitTestResult
- positionResult
- boundary
- normalizedPositionContext
- target kind

### 4. UI 副作用单独收口

以下逻辑不该继续散在主 handler 内：

- `draw.render(...)`
- `draw.scheduleFrameRender(...)`
- `cursor.drawCursor(...)`
- `previewer.drawResizer(...)`
- `tableTool.render()/dispose()`
- `hyperlinkParticle.drawHyperlinkPopup()`
- `dateParticle.renderDatePicker()`

这些都应该归到 effect 层，避免主链到处直接操作视图对象。

---

## 推荐目录结构

建议把当前 `src/editor/core/event` 下的鼠标相关逻辑重组为：

```txt
src/editor/core/event/
  pointer/
    PointerController.ts
    PointerSession.ts
    PointerSessionStore.ts
    PointerTypes.ts
    PointerConstants.ts

    adapters/
      createPointerEventContext.ts
      normalizePointerButton.ts
      resolvePointerSource.ts
      normalizePointerCoordinates.ts

    coordinates/
      PointerCoordinateService.ts
      PointerCoordinateTypes.ts
      clampPointToPage.ts
      resolvePageFromViewportPoint.ts
      translateViewportToPagePoint.ts
      translateMovementDelta.ts

    resolver/
      PointerHitResolver.ts
      PointerTargetResolver.ts
      PointerContextResolver.ts
      createPositionContext.ts

    intents/
      selection/
        SelectionStartIntent.ts
        SelectionDragIntent.ts
        SelectionClickIntent.ts
        SelectionMultiClickIntent.ts
      drag-drop/
        DragStartIntent.ts
        DragHoverIntent.ts
        DragCommitIntent.ts
      controls/
        CheckboxIntent.ts
        RadioIntent.ts
      media/
        ImagePointerIntent.ts
        HyperlinkIntent.ts
        DatePointerIntent.ts
      table/
        TableToolIntent.ts
        TableCellMultiClickIntent.ts

    effects/
      PointerRenderEffect.ts
      CursorEffect.ts
      PreviewerEffect.ts
      TableToolEffect.ts
      OverlayEffect.ts

    policies/
      DragPolicy.ts
      ClickPolicy.ts
      TableSelectionPolicy.ts
      ControlDragPolicy.ts

    debug/
      logPointerEvent.ts

  handlers/
    pointerdown.ts
    pointermove.ts
    pointerup.ts
    click.ts
    dblclick.ts
    wheel.ts
    dragover.ts
```

核心变化：

- `handlers` 只保留浏览器事件入口
- 原 `utils` 中和鼠标运行态强相关的能力，迁入 `pointer/resolver` 或 `pointer/intents`
- `CanvasEvent` 只负责注册和转发到 `PointerController`

当前仓库里的实际结构已经更接近：

```txt
src/editor/core/event/
  CanvasEvent.ts
  GlobalEvent.ts
  PointerController.ts
  PointerSession.ts
  PointerSessionController.ts
  EditorInputController.ts
  EditorClipboardController.ts
  KeyboardController.ts
  clipboard/
  keyboard/
    intents/
    shared/
  pointer/
    coordinates/
    effects/
    intents/
    policies/
    utils/
  handlers/
    click.ts
    composition.ts
    copy.ts
    cut.ts
    drag.ts
    drop.ts
    input.ts
    mousedown.ts
    mouseleave.ts
    mousemove.ts
    mouseup.ts
```

其中 `handlers/keydown` 已不再是主结构，键盘主逻辑已迁往 `keyboard/intents`。

---

## 运行时模型

### PointerSession

建议新增 `PointerSession`，替代 `CanvasEvent` 上的散落字段。

```ts
interface PointerSession {
  phase: 'idle' | 'pressed' | 'selecting' | 'dragging' | 'dropping'
  pressedAt: number
  button: number
  startContext: PointerContext | null
  currentContext: PointerContext | null
  dragSnapshot: DragSnapshot | null
  multiClick: MultiClickState | null
}
```

对应关系：

- `mouseDownStartPosition` -> `session.startContext`
- `cacheRange/cacheElementList/cachePositionList/cachePositionContext` -> `session.dragSnapshot`
- `isAllowSelection/isAllowDrag/isAllowDrop` -> `session.phase`
- `lastTableCellClickInfo/tableCellDblclickCount` -> `session.multiClick`

这样可以把“状态是否合法”改成显式状态机判断，而不是多个布尔值交叉组合。

### PointerContext

建议统一命中上下文：

```ts
interface PointerContext {
  rawEvent: MouseEvent | DragEvent
  coordinates: PointerCoordinatePayload
  pagePoint: IPagePoint | null
  pageNo?: number
  positionResult: ICurrentPosition | null
  boundary: IHitBoundary | null
  positionContext: IPositionContext
  target: 'text' | 'table-text' | 'table-cell' | 'image' | 'checkbox' | 'radio' | 'hyperlink' | 'date' | 'blank'
}
```

后续所有 intent 都只吃 `PointerContext`，不再直接吃浏览器事件。

### PointerCoordinatePayload

建议把坐标显式建模，不再让调用方自己猜当前拿到的是哪种参考系：

```ts
interface PointerCoordinatePayload {
  viewport: { x: number; y: number }
  container: { x: number; y: number } | null
  page: { x: number; y: number; pageNo: number } | null
  deltaViewport: { x: number; y: number }
  source: 'mouse' | 'drag'
}
```

含义约束：

- `viewport`：统一等价于 `clientX/clientY`
- `container`：相对 `pageContainer` 的坐标
- `page`：相对具体 page canvas 的坐标，是命中唯一合法输入
- `deltaViewport`：本次事件相对上一帧的位移，不直接使用浏览器原生 `movementX/movementY`

后续规则必须固定：

- 命中、拖选、落点判断，只能使用 `page`
- 容器级浮层定位，可以使用 `container`
- 浏览器级弹层定位，可以使用 `viewport`
- 拖动位移计算，统一来自 `deltaViewport` 或显式两点差值

---

## 坐标统一重构

### 当前混乱点

当前最危险的几处混用如下：

- `mousedown.ts`
  - `getIsPointInRange(evt.offsetX, evt.offsetY)`
  - `pagePoint?.x ?? evt.offsetX`
- `mousemove.ts`
  - 拖拽范围判断直接使用 `evt.offsetX / evt.offsetY`
  - 浮动图移动使用 `evt.movementX / evt.movementY`
  - 拖选命中使用 `pagePoint?.x ?? evt.offsetX`
- `mouseup.ts`
  - 图片位移提交使用 `evt.offsetX - mouseDownStartPosition.x`
- `drag.ts`
  - 命中使用 `pagePoint?.x ?? evt.offsetX`
- `DrawViewportService.ts`
  - 同时兼容 `clientX/clientY` 和 `offsetX/offsetY`
- `Previewer.ts`
  - 使用 `evt.x / evt.y`
- `TableTool.ts`
  - 使用 `evt.x / evt.y`

这些写法单独看都能工作，但组合起来就会不断制造边界 bug。

### 统一原则

建议明确规定只保留三种坐标语义：

1. `viewport point`
   - 基于 `clientX/clientY`
   - 只用于跨 DOM 层的原生定位
2. `container point`
   - 相对 `pageContainer`
   - 只用于编辑器容器内 overlay / 辅助 UI
3. `page point`
   - 相对某一页 canvas
   - 只用于命中、选区、表格、正文交互

禁止继续直接在业务 handler 中使用：

- `offsetX/offsetY`
- `evt.x/evt.y`
- `movementX/movementY`

它们只能出现在 `PointerCoordinateService` 内部，作为原始输入兼容层。

### 坐标服务建议

建议新增：

```ts
class PointerCoordinateService {
  resolve(evt: MouseEvent | DragEvent): PointerCoordinatePayload
  resolveViewportPoint(evt: MouseEvent | DragEvent): IPoint
  resolveContainerPoint(evt: MouseEvent | DragEvent): IPoint | null
  resolvePagePoint(evt: MouseEvent | DragEvent): IPagePoint | null
  resolveDelta(
    prev: PointerCoordinatePayload | null,
    next: PointerCoordinatePayload
  ): IPoint
}
```

职责：

- 统一读取原生事件坐标
- 基于 DOMRect 算出 container/page 坐标
- 负责跨页时的 nearest page 归属
- 统一 clamp 规则
- 统一 delta 计算

`DrawViewportService.getEventPagePoint()` 可以保留，但应降级为该 service 的薄代理，不再让事件层直接拼 fallback。

### 必须修改的行为约束

#### 1. 命中永远只吃 `pagePoint`

以下链路必须禁止再写 `pagePoint?.x ?? evt.offsetX`：

- `mousedown`
- `mousemove`
- `mouseup`
- `click`
- `dragover`
- `CommandAdapt.getPositionContextByEvent()`
- debug pointer log

规则改成：

- 能解析出 `pagePoint` 就继续
- 解析不出 `pagePoint` 就走显式空命中或 nearest-page 策略
- 不再 fallback 到 `offsetX/offsetY`

#### 2. 拖拽位移永远基于统一 delta

当前浮动图拖动一部分使用 `movementX/movementY`，落点提交又使用 `offsetX - startX`。  
这两套算法不应该并存。

统一改为：

- move 过程：使用 `current.viewport - previous.viewport`
- commit 过程：使用 `current.viewport - session.startContext.coordinates.viewport`

这样跨元素目标、跨层 DOM、drag 事件兼容性才稳定。

#### 3. `evt.x / evt.y` 全部归一到 viewport

`evt.x / evt.y` 在浏览器上通常等价于 `clientX/clientY`，但语义不够显式。  
`Previewer`、`TableTool`、`ContextMenu`、`ZoneTip` 这类模块都应改成显式读取：

- `viewport.x`
- `viewport.y`

### 坐标类型建议

建议新增：

```ts
interface IPoint {
  x: number
  y: number
}

interface IContainerPoint extends IPoint {}

interface IViewportPoint extends IPoint {}

interface IResolvedPagePoint extends IPoint {
  pageNo: number
  pageIndex: string
  isExactPage: boolean
}
```

重点不是类型花哨，而是防止继续把“看起来都是 x/y”的值随手混传。

### 坐标相关迁移顺序

坐标这条线建议插到整体重构最前面：

1. 新增 `PointerCoordinateService`
2. 把 `DrawViewportService.getEventPagePoint()` 改成走新 service
3. 替换事件层所有 `pagePoint?.x ?? evt.offsetX` 写法
4. 替换 `evt.x / evt.y` 直读写法
5. 替换 `movementX / movementY` 为统一 delta
6. 再开始拆 `PointerSession / PointerController / intents`

原因很简单：  
如果坐标体系不先统一，后面的 session、intent、effect 只是把旧 bug 迁移到新目录。

---

## 事件拆分建议

### 1. `pointerdown`

职责只保留四件事：

1. 建立 `PointerContext`
2. 更新 `PointerSession`
3. 按优先级分发 intent
4. 触发必要 effect

推荐优先级：

1. `DragStartIntent`
2. `SelectionStartIntent`
3. `CheckboxIntent / RadioIntent`
4. `ImagePointerIntent`
5. `TableToolIntent`
6. `HyperlinkIntent`
7. `DatePointerIntent`

### 2. `pointermove`

拆成两条互斥主链：

- `session.phase === 'dragging'` -> `DragHoverIntent`
- `session.phase === 'pressed' || 'selecting'` -> `SelectionDragIntent`

这样 `mousemove.ts` 不再自己判断所有业务情况。

### 3. `pointerup`

只负责根据 session 收尾：

- `dragging` -> `DragCommitIntent`
- `selecting` -> `SelectionFinishEffect`
- `pressed` -> `ClickPolicy` 决定是否透传 click

`mouseup.ts` 现在那条超长拖放提交链，应整体下沉到 `drag-drop/DragCommitIntent.ts`。

### 4. `click / dblclick / threeClick`

建议把“多击识别”抽成独立策略：

- `ClickPolicy.ts`
- `MultiClickState`

再把业务处理拆开：

- 单击：光标/选区确认
- 双击：词选择 / 表格单元格内词选择
- 三击：段落选择 / 单元格全文选择

不要再让 `click.ts` 自己维护多击计数状态。

---

## 关键模块职责

### `PointerController`

职责：

- 接收 `CanvasEvent` 转发
- 维护 `PointerSessionStore`
- 调用 `PointerContextResolver`
- 按阶段路由到 intent

它是新的鼠标事件总入口，但不直接写渲染细节。

### `PointerContextResolver`

职责：

- 从原生事件构建 `pagePoint/pageNo`
- 调用 `tableHitTestService`
- 统一生成 `positionContext`
- 归一化 target 类型

当前散落在 `mousedown.ts`、`click.ts`、`drag.ts` 的命中转换逻辑，都应迁到这里。

### `DragCommitIntent`

职责：

- 校验拖拽合法性
- 处理控件安全边界
- 生成 replace payload
- 执行元素搬移
- 恢复 range / positionContext
- 触发历史与重绘

这部分基本就是把当前 `mouseup.ts` 的拖放主链整体收口成单职责模块。

### `PointerRenderEffect`

职责：

- 封装 `render` / `scheduleFrameRender`
- 根据交互类型选择 `visible`、全量、立即、RAF 合并

这样渲染策略就不会再散落在每个 handler 内部。

---

## 建议迁移步骤

### 第一阶段：坐标体系收口

1. 新增 `pointer/coordinates/PointerCoordinateService.ts`
2. 定义 `viewport / container / page / delta` 四类标准坐标
3. 替换事件层中所有 `offsetX/offsetY` fallback
4. 替换 `movementX/movementY` 和 `evt.x/evt.y` 的直接业务消费

这一阶段优先级最高，因为它会直接决定后续命中和拖拽是否稳定。

### 第二阶段：状态收口，不改行为

1. 新增 `pointer/PointerSession.ts`
2. 把 `CanvasEvent` 上的鼠标状态迁到 session
3. 保持现有 `mousedown/mousemove/mouseup` 文件不变，只改为读写 session

这一步完成后，风险最低，但能先消掉“状态四处裸露”的问题。

### 第三阶段：命中解析收口

1. 新增 `PointerContextResolver`
2. 抽出 `createPositionContext`
3. 替换 `mousedown/click/drag` 中重复的命中和 `positionContext` 拼装

这一步完成后，事件主链会明显变短。

### 第四阶段：拖选和拖放拆 intent

1. `resolveSelectionStartState` -> `selection/SelectionStartIntent`
2. `resolveSelectionDragRange` -> `selection/SelectionDragIntent`
3. `mouseup` 拖放提交链 -> `drag-drop/DragCommitIntent`

这一步是收益最大的阶段，能把最长的几个 handler 直接瘦下来。

### 第五阶段：副作用下沉

把以下视图调用迁到 effect 层：

- cursor
- previewer
- tableTool
- hyperlink popup
- date picker
- render / scheduleFrameRender

### 第六阶段：统一原生监听入口

收口 `MouseObserver` 和 `CanvasEvent` 的重复监听，建议最终只保留一套 DOM 监听，再由内部总线广播。

---

## 风险点

### 0. 坐标统一如果不先做，后续拆分会把 bug 固化

当前最核心的隐患不是文件大小，而是“不同 handler 对同一鼠标位置的解释不同”。  
如果在这之前先引入新的 controller / intent 目录，等于把旧的坐标混算行为重新封装一遍。

### 1. 不能直接把 `mousedown` 机械拆文件

如果不先引入 session 和 context，拆完后只会得到一组强耦合的小文件，问题不会减少。

### 2. `click` 与 `mouseup` 的先后关系要保留

当前表格多击识别和拖拽结束逻辑依赖浏览器事件顺序。  
重构时必须明确哪些逻辑在 `pointerup` 完成，哪些逻辑在 `click` 完成。

### 3. 表格与普通文本的命中语义不同

现在 `resolveSelectionStartState.ts` 和 `resolveSelectionDragRange.ts` 已经把一部分差异沉下去了。  
新结构里不要把这部分“重新抹平”为一套过度抽象的通用逻辑，否则很容易把分页表格边界问题重新引回来。

---

## 建议的落地结果

重构完成后，理想形态应当是：

- `CanvasEvent` 只做注册和转发
- 鼠标运行态只存在于 `PointerSession`
- 原生事件到编辑器上下文的转换只走 `PointerContextResolver`
- 业务行为以 intent 为单位组织
- 渲染与浮层操作统一走 effect 层
- 新增鼠标行为时，优先新增 intent/policy/effect，而不是继续改总 handler

这套结构比“继续在现有 handler 上打补丁”更适合当前仓库，因为你现在已经有：

- `tableHitTestService`
- `resolveSelectionStartState`
- `resolveSelectionDragRange`
- `Draw` runtime / component / service 分层

也就是说，底层抽象已经足够，当前欠缺的主要是“鼠标交互域自己的目录和运行时边界”。

---

## 本次建议的直接执行顺序

如果下一步要真正开始改代码，建议按这个顺序开工：

1. 新建 `src/editor/core/event/pointer/coordinates/` 目录
2. 实现 `PointerCoordinateService`，统一 `viewport/container/page/delta`
3. 先替换事件主链里的 `offsetX/offsetY`、`evt.x/evt.y`、`movementX/movementY`
4. 再实现 `PointerSession` 和 `PointerSessionStore`
5. 让 `CanvasEvent` 持有 `PointerController`，不再直接暴露大量鼠标状态字段
6. 把 `mousedown/mousemove/mouseup` 改成 controller 路由
7. 优先先拆 `DragCommitIntent`，因为当前 `mouseup.ts` 风险最高、收益最大

这一步做完后，再拆 `SelectionStartIntent` 和 `SelectionDragIntent`，整体风险会低很多。

---

## 当前实况

以下事项已经实际完成：

- 坐标入口已统一到 `PointerCoordinateService`
- `offsetX/offsetY`、`evt.x/evt.y`、`movementX/movementY` 已从鼠标主链移除
- `PointerSession` / `PointerSessionController` 已落地
- `PointerController` 已接管鼠标分发
- `click / mousedown / mousemove / mouseup / dragover` 主链已拆入 `pointer/intents`
- `KeyboardController` 已接管键盘分发
- `backspace / delete / enter / tab / updown / left / right` 的旧重逻辑已迁到 `keyboard/intents` / `keyboard/shared`
- 原 `handlers/paste.ts` 已删除，粘贴链已迁到 `event/clipboard`

当前仍未完成的主要是：

- `MouseObserver` 与主事件链的统一监听入口收口
- 文档中其他针对旧 `handlers/keydown/*` 文件的引用更新
