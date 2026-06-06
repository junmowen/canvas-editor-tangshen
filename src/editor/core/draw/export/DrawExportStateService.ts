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

  /** 捕获 Export Render State 对应的当前状态。 */
  public captureExportRenderState() {
    const { headerPageScopes, main, footerPageScopes } = this.draw
      .getObjectResolver()
      .getOriginalEditorData()
    return {
      pagePixelRatio: this.draw.getPagePixelRatio(),
      mode: this.draw.getMode(),
      pageNo: this.draw.getPageNo(),
      zone: this.draw.getComponents().zone.getZone(),
      positionContext: deepClone(this.draw.getCoordinate().getPositionContext()),
      range: deepClone(this.draw.getComponents().range.getEditBoundaryRange()),
      headerPageScopes: deepClone(headerPageScopes || []),
      footerPageScopes: deepClone(footerPageScopes || []),
      elementList: deepClone(main)
    }
  }

  /** 恢复 Export Render State 对应的快照状态。 */
  public restoreExportRenderState(
    state: ReturnType<Draw['captureExportRenderState']>
  ) {
    this.draw.getViewState().replacePagePixelRatio(state.pagePixelRatio)
    this.draw.getRuntime().replaceMode(state.mode)
    this.draw.setPageNo(state.pageNo)
    this.draw.getComponents().zone.replaceZone(state.zone)
    this.draw.getCoordinate().setPositionContext(deepClone(state.positionContext))
    this.draw.getComponents().header.setPageScopes(deepClone(state.headerPageScopes))
    this.draw.getComponents().footer.setPageScopes(deepClone(state.footerPageScopes))
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
