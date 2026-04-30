import { EditorMode, EditorZone, PageMode, PaperDirection } from '../../../dataset/enum/Editor'
import { IMargin } from '../../../interface/Margin'
import type { Draw } from '../Draw'

export class DrawPageSetupService {
  constructor(private readonly draw: Draw) {}

  public setMode(payload: EditorMode) {
    if (this.draw.getMode() === payload) return
    if (payload === EditorMode.PRINT) {
      this.draw.setPrintData()
    }
    if (this.draw.getMode() === EditorMode.PRINT) {
      this.draw.clearPrintData()
    }
    this.draw.clearSideEffect()
    this.draw.getComponents().range.clearRange()
    this.draw.replaceRuntimeMode(payload)
    this.draw.render({
      isSetCursor: false,
      isSubmitHistory: false
    })
  }

  public setPageMode(payload: PageMode) {
    if (!payload || this.draw.getOptions().pageMode === payload) return
    this.draw.getOptions().pageMode = payload
    if (payload === PageMode.PAGING) {
      this.draw.getPageCanvasHost().syncPageMetrics()
    } else {
      this.draw.disconnectLazyRender()
      this.draw.getComponents().header.recovery()
      this.draw.getComponents().footer.recovery()
      this.draw.getComponents().zone.setZone(EditorZone.MAIN)
    }
    const { startIndex } = this.draw.getComponents().range.getEditBoundaryRange()
    const isCollapsed = this.draw.getComponents().range.getIsCollapsed()
    this.draw.render({
      isSetCursor: true,
      curIndex: startIndex,
      isSubmitHistory: false
    })
    if (!isCollapsed) {
      this.draw.getComponents().cursor.drawCursor({
        isShow: false
      })
    }
    setTimeout(() => {
      const pageModeChange = this.draw.getListener().pageModeChange
      if (pageModeChange) {
        pageModeChange(payload)
      }
      if (this.draw.getEventBus().isSubscribe('pageModeChange')) {
        this.draw.getEventBus().emit('pageModeChange', payload)
      }
    })
  }

  public setPageScale(payload: number) {
    this.draw.getOptions().scale = payload
    this.draw.getPageCanvasHost().syncPageMetrics()
    const cursorPosition = this.draw.getComponents().position.getCursorPosition()
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: !!cursorPosition,
      curIndex: cursorPosition?.index
    })
    const pageScaleChange = this.draw.getListener().pageScaleChange
    if (pageScaleChange) {
      pageScaleChange(payload)
    }
    if (this.draw.getEventBus().isSubscribe('pageScaleChange')) {
      this.draw.getEventBus().emit('pageScaleChange', payload)
    }
  }

  public setPageDevicePixel() {
    this.draw.getPageCanvasHost().syncPageMetrics()
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperSize(width: number, height: number) {
    this.draw.getOptions().width = width
    this.draw.getOptions().height = height
    this.draw.getPageCanvasHost().syncPageMetrics()
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperDirection(payload: PaperDirection) {
    this.draw.getOptions().paperDirection = payload
    this.draw.getPageCanvasHost().syncPageMetrics()
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }

  public setPaperMargin(payload: IMargin) {
    this.draw.getOptions().margins = payload
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false
    })
  }
}
