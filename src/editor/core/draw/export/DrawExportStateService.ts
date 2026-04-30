import { deepClone } from '../../../utils'
import type { Draw } from '../Draw'

/**
 * Draw 导出状态快照服务。
 *
 * 负责在导出前捕获当前渲染现场，并在导出完成后恢复现场。
 * 这是导出链中最关键的“现场保护层”，用于隔离离屏渲染对主编辑器状态的污染。
 */
export class DrawExportStateService {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  public captureExportRenderState() {
    return {
      pageCanvasHostState: this.draw.getPageCanvasHost().captureState(),
      pagePixelRatio: this.draw.getPagePixelRatio(),
      mode: this.draw.getMode(),
      optionMode: this.draw.getOptions().mode,
      pageNo: this.draw.getPageNo(),
      zone: this.draw.getComponents().zone.getZone(),
      positionContext: deepClone(this.draw.getComponents().position.getPositionContext()),
      range: deepClone(this.draw.getComponents().range.getEditBoundaryRange()),
      headerElementList: deepClone(this.draw.getComponents().header.getElementList()),
      footerElementList: deepClone(this.draw.getComponents().footer.getElementList()),
      elementList: deepClone(this.draw.getOriginalMainElementList())
    }
  }

  public restoreExportRenderState(
    state: ReturnType<Draw['captureExportRenderState']>
  ) {
    this.draw.getPageCanvasHost().restoreState(state.pageCanvasHostState)
    this.draw.getViewState().replacePagePixelRatio(state.pagePixelRatio)
    this.draw.getRuntime().replaceMode(state.mode)
    this.draw.setPageNo(state.pageNo)
    this.draw.getComponents().zone.replaceZone(state.zone)
    this.draw.getComponents().position.setPositionContext(deepClone(state.positionContext))
    this.draw.getComponents().header.setElementList(deepClone(state.headerElementList))
    this.draw.getComponents().footer.setElementList(deepClone(state.footerElementList))
    this.draw.replaceMainElementList(deepClone(state.elementList))
    this.draw.getComponents().range.replaceRange(deepClone(state.range))
    const isCollapsed = state.range.startIndex === state.range.endIndex
    this.draw.render({
      curIndex: isCollapsed ? state.range.startIndex : undefined,
      isSetCursor: isCollapsed,
      isSubmitHistory: false,
      isSourceHistory: true
    })
  }
}
