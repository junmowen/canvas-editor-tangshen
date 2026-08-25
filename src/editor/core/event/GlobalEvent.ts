import { EDITOR_COMPONENT } from '../../dataset/constant/Editor'
import { IEditorOption } from '../../interface/Editor'
import { findParent } from '../../utils'
import { Cursor } from '../runtime/cursor/Cursor'
import { Control } from '../modules/control/runtime/Control'
import { Draw } from '../draw/Draw'
import { clearGlobalImageEffects } from '../modules/image/interaction/GlobalImageEffects'
import { clearGlobalInlineEffects } from '../modules/inline/interaction/GlobalInlineEffects'
import { TableTool } from '../modules/table/particle/TableTool'
import { RangeManager } from '../range/RangeManager'
import { CanvasEvent } from './CanvasEvent'
import { commitChartGraphicDragInteraction } from '../modules/chart-graphics/interaction/ChartGraphicDragInteraction'
import { INTERNAL_SHORTCUT_KEY } from '../../dataset/constant/Shortcut'
import { RenderLayer } from '../render-backend'

export class GlobalEvent {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: Required<IEditorOption>
  /** Cursor 实例，负责光标显示、移动或输入代理。 */
  private cursor: Cursor | null
  /** 画布事件控制器实例，用于统一派发键盘、鼠标、剪贴板和输入事件。 */
  private canvasEvent: CanvasEvent
  /** 选区管理器，用于读取和更新当前编辑范围。 */
  private range: RangeManager
  /** 表格工具条实例，用于处理行列选择、拖拽和快捷插入。 */
  private tableTool: TableTool
  private control: Control
  private dprMediaQueryList: MediaQueryList

  /** 初始化 GlobalEvent 实例并注入运行依赖。 */
  constructor(
    draw: Draw,
    canvasEvent: CanvasEvent,
    deps: {
      /** 选区范围，记录起止索引和方向信息。 */
      range: RangeManager
      tableTool: TableTool
      /** 控件配置对象，描述当前控件的行为和取值规则。 */
      control: Control
    }
  ) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
    this.canvasEvent = canvasEvent
    this.cursor = null
    this.range = deps.range
    this.tableTool = deps.tableTool
    this.control = deps.control
    this.dprMediaQueryList = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    )
  }

  public register() {
    this.cursor = this.draw.getCursor()
    this.addEvent()
  }

  /** 绑定编辑器全局 DOM 事件，接入键鼠与窗口交互。 */
  private addEvent() {
    window.addEventListener('blur', this.clearSideEffect)
    document.addEventListener('mousedown', this.clearSideEffect)
    document.addEventListener('mouseup', this.setCanvasEventAbility)
    document.addEventListener('wheel', this.setPageScale, { passive: false })
    document.addEventListener('visibilitychange', this._handleVisibilityChange)
    this.dprMediaQueryList.addEventListener('change', this._handleDprChange)
  }

  public removeEvent() {
    window.removeEventListener('blur', this.clearSideEffect)
    document.removeEventListener('mousedown', this.clearSideEffect)
    document.removeEventListener('mouseup', this.setCanvasEventAbility)
    document.removeEventListener('wheel', this.setPageScale)
    document.removeEventListener(
      'visibilitychange',
      this._handleVisibilityChange
    )
    this.dprMediaQueryList.removeEventListener('change', this._handleDprChange)
  }

  /** 全局事件副作用清理函数，用于在交互结束后恢复临时状态。 */
  public clearSideEffect = (evt: Event) => {
    if (!this.cursor) return
    // 编辑器内部 DOM。
    const target = <Element>(evt?.composedPath()[0] || evt.target)
    // 只用已挂载 base surface 的 canvas 判断是否点击在编辑器页面内部。
    const pageList = this.draw
      .getPageCanvasHost()
      .getSurfaceList(RenderLayer.BASE)
      .map(surface => surface?.canvas)
    const innerEditorDom = findParent(
      target,
      (node: any) => pageList.includes(node),
      true
    )
    if (innerEditorDom) return
    // 编辑器外部但仍属于组件体系的 DOM。
    const outerEditorDom = findParent(
      target,
      (node: Node & Element) =>
        !!node && node.nodeType === 1 && !!node.getAttribute(EDITOR_COMPONENT),
      true
    )
    if (outerEditorDom) {
      this.watchCursorActive()
      return
    }
    this.cursor.recoveryCursor()
    this.range.recoveryRangeStyle()
    clearGlobalImageEffects(this.draw)
    this.tableTool.dispose()
    clearGlobalInlineEffects(this.draw)
    this.control.destroyControl()
  }

  /** 画布事件能力开关函数，用于按场景启用或禁用交互。 */
  public setCanvasEventAbility = (evt?: Event) => {
    if (evt instanceof MouseEvent) {
      commitChartGraphicDragInteraction({
        host: this.canvasEvent,
        evt
      })
    }
    const pointerSessionController = this.canvasEvent.getPointerSessionController()
    pointerSessionController.clearDrag()
    pointerSessionController.clearSelection()
  }

  /** 监听光标活动，在状态变化时触发对应更新。 */
  public watchCursorActive() {
    // 仅在选区闭合时，才需要校验光标代理是否仍处于激活状态。
    if (!this.range.getIsCollapsed()) return
    setTimeout(() => {
      // 当代理输入框失活后，将光标切换为非聚焦显示状态。
      if (!this.cursor?.getAgentIsActive()) {
        this.cursor?.drawCursor({
          isFocus: false,
          isBlink: false
        })
      }
    })
  }

  /** 页面缩放设置函数，用于同步滚轮缩放后的比例。 */
  public setPageScale = (evt: WheelEvent) => {
    // 若页面缩放快捷键被禁用，则直接忽略本次滚轮事件。
    if (
      this.options.shortcutDisableKeys.includes(
        INTERNAL_SHORTCUT_KEY.PAGE_SCALE
      )
    ) {
      return
    }
    // 仅在按住 Ctrl 时启用滚轮缩放。
    if (!evt.ctrlKey) return
    evt.preventDefault()
    const { scale } = this.options
    if (evt.deltaY < 0) {
      // 放大。
      const nextScale = scale * 10 + 1
      if (nextScale <= 30) {
        this.draw.setPageScale(nextScale / 10)
      }
    } else {
      // 缩小。
      const nextScale = scale * 10 - 1
      if (nextScale >= 5) {
        this.draw.setPageScale(nextScale / 10)
      }
    }
  }

  /** handle Visibility Change 回调入口，用于通知外部或响应对应事件。 */
  private _handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // 页面重新可见时，按当前选区重新渲染激活页。
      const range = this.range.getEditBoundaryRange()
      const isSetCursor =
        !!~range.startIndex &&
        !!~range.endIndex &&
        range.startIndex === range.endIndex
      this.range.replaceRange(range)
      this.draw.render({
        isSetCursor,
        isCompute: false,
        isSubmitHistory: false,
        curIndex: range.startIndex,
        pageRenderScope: 'visible'
      })
    }
  }

  /** handle Dpr Change 回调入口，用于通知外部或响应对应事件。 */
  private _handleDprChange = () => {
    this.draw.setPageDevicePixel()
  }
}
