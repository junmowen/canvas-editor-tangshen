import { EDITOR_COMPONENT } from '../../dataset/constant/Editor'
import { IEditorOption } from '../../interface/Editor'
import { findParent } from '../../utils'
import { Cursor } from '../cursor/Cursor'
import { Control } from '../draw/control/Control'
import { Draw } from '../draw/Draw'
import { HyperlinkParticle } from '../draw/particle/HyperlinkParticle'
import { DateParticle } from '../draw/particle/date/DateParticle'
import { Previewer } from '../draw/particle/previewer/Previewer'
import { TableTool } from '../draw/particle/table/TableTool'
import { RangeManager } from '../range/RangeManager'
import { CanvasEvent } from './CanvasEvent'
import { ImageParticle } from '../draw/particle/ImageParticle'
import { INTERNAL_SHORTCUT_KEY } from '../../dataset/constant/Shortcut'

export class GlobalEvent {
  private draw: Draw
  private options: Required<IEditorOption>
  private cursor: Cursor | null
  private canvasEvent: CanvasEvent
  private range: RangeManager
  private previewer: Previewer
  private tableTool: TableTool
  private hyperlinkParticle: HyperlinkParticle
  private control: Control
  private dateParticle: DateParticle
  private imageParticle: ImageParticle
  private dprMediaQueryList: MediaQueryList

  constructor(
    draw: Draw,
    canvasEvent: CanvasEvent,
    deps: {
      range: RangeManager
      previewer: Previewer
      tableTool: TableTool
      hyperlinkParticle: HyperlinkParticle
      control: Control
      dateParticle: DateParticle
      imageParticle: ImageParticle
    }
  ) {
    this.draw = draw
    this.options = draw.getRuntime().getOptions()
    this.canvasEvent = canvasEvent
    this.cursor = null
    this.range = deps.range
    this.previewer = deps.previewer
    this.tableTool = deps.tableTool
    this.hyperlinkParticle = deps.hyperlinkParticle
    this.dateParticle = deps.dateParticle
    this.imageParticle = deps.imageParticle
    this.control = deps.control
    this.dprMediaQueryList = window.matchMedia(
      `(resolution: ${window.devicePixelRatio}dppx)`
    )
  }

  public register() {
    this.cursor = this.draw.getCursor()
    this.addEvent()
  }

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

  public clearSideEffect = (evt: Event) => {
    if (!this.cursor) return
    // 编辑器内部 DOM。
    const target = <Element>(evt?.composedPath()[0] || evt.target)
    const pageList = this.draw.getPageList()
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
    this.previewer.clearResizer()
    this.tableTool.dispose()
    this.hyperlinkParticle.clearHyperlinkPopup()
    this.control.destroyControl()
    this.dateParticle.clearDatePicker()
    this.imageParticle.destroyFloatImage()
  }

  public setCanvasEventAbility = () => {
    const pointerSessionController = this.canvasEvent.getPointerSessionController()
    pointerSessionController.clearDrag()
    pointerSessionController.clearSelection()
  }

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

  private _handleDprChange = () => {
    this.draw.setPageDevicePixel()
  }
}
