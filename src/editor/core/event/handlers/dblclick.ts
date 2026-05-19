import { CanvasEvent } from '../CanvasEvent'
import { debugDblclick } from '../debug/dblclick'
import { applyPointerPositionContext } from '../pointer/utils/applyPointerPositionContext'
import { resolvePointerHitIntent } from '../pointer/intents/ResolvePointerHitIntent'
import { resolveWordRangeIntent } from '../pointer/intents/selection/SelectionWordRangeIntent'
import { resolveTableCellDblclickIntent } from '../pointer/intents/table/TableCellMultiClickIntent'
import { renderSelectionRange } from '../pointer/effects/PointerRenderEffect'

/**
 * 处理双击事件。
 *
 * 双击会根据命中结果决定是图片预览、表格单元格选择还是词选区展开。
 */
export function dblclick(host: CanvasEvent, evt: MouseEvent): void {
  debugDblclick(evt, host)
  const draw = host.getDraw()
  const components = draw.getComponents()
  const session = host.getPointerSession()
  const hit = resolvePointerHitIntent({ host, evt })
  if (!hit) return

  const { pagePoint, hitTestResult } = hit
  const { positionResult: positionContext, boundary } = hitTestResult
  if (!positionContext) return

  applyPointerPositionContext(components.position, positionContext)
  const cursorIndex =
    boundary?.hitTargetIndex ??
    boundary?.absoluteIndex ??
    (positionContext.isTable ? positionContext.tdValueIndex! : positionContext.index)
  if (positionContext.cursorPosition) {
    components.position.setCursorPosition(positionContext.cursorPosition)
  } else if (~cursorIndex) {
    const positionList = components.position.getPositionList()
    components.position.setCursorPosition(positionList[cursorIndex] || null)
  }
  if (positionContext.isImage && positionContext.isDirectHit) {
    components.previewer.render()
    return
  }
  if (draw.getIsPagingMode() && !~positionContext.index && positionContext.zone) {
    draw.getZone().setZone(positionContext.zone)
    draw.clearSideEffect()
    components.position.setPositionContext({ isTable: false })
    return
  }
  if (
    (positionContext.isCheckbox || positionContext.isRadio) &&
    positionContext.isDirectHit
  ) {
    return
  }
  if (positionContext.isTable) {
    if (session.multiClick.tableCellClickResetTimer !== null) {
      window.clearTimeout(session.multiClick.tableCellClickResetTimer)
      session.multiClick.tableCellClickResetTimer = null
    }
    const tableDblclick = resolveTableCellDblclickIntent({
      host,
      positionContext,
      pageNo: Number(pagePoint.pageIndex)
    })
    if (tableDblclick.count === 1) {
      const wordRange = resolveWordRangeIntent(host)
      if (wordRange) {
        renderSelectionRange({
          draw,
          startIndex: wordRange.startIndex,
          endIndex: wordRange.endIndex
        })
      }
      return
    }
    const logicalTableIndex =
      tableDblclick.activeSlice?.logicalTableIndex ??
      (tableDblclick.tableCellDblclickInfo.logicalTableId
        ? draw
            .getTableLayoutSnapshotAccessor()
            .resolveLogicalTableIndex(tableDblclick.tableCellDblclickInfo.logicalTableId)
        : null)
    const logicalTrIndex =
      tableDblclick.tableCellDblclickInfo.logicalTrIndex ??
      tableDblclick.tableCellDblclickInfo.trIndex
    const logicalTdIndex =
      tableDblclick.tableCellDblclickInfo.logicalTdIndex ??
      tableDblclick.tableCellDblclickInfo.tdIndex
    const tableElement =
      logicalTableIndex !== null && logicalTableIndex !== undefined && ~logicalTableIndex
        ? draw.getOriginalElementList()[logicalTableIndex]
        : null
    const td = tableElement?.trList?.[logicalTrIndex!]?.tdList?.[logicalTdIndex!]
    if (!td?.value?.length) return
    const cellSliceList = draw
      .getTableLayoutSnapshotAccessor()
      .getCellSlicesByCellKey(tableDblclick.tableCellDblclickInfo.cellKey)
    const startIndex = cellSliceList.length
      ? Math.min(...cellSliceList.map(slice => slice.absoluteStart))
      : 0
    const endIndex = cellSliceList.length
      ? Math.max(...cellSliceList.map(slice => slice.absoluteEnd)) - 1
      : td.value.length - 1
    renderSelectionRange({
      draw,
      startIndex,
      endIndex,
      tableId:
        tableDblclick.tableCellDblclickInfo.logicalTableId ||
        tableDblclick.tableCellDblclickInfo.tableId
    })
    return
  }

  const wordRange = resolveWordRangeIntent(host)
  if (!wordRange) return
  renderSelectionRange({
    draw,
    startIndex: wordRange.startIndex,
    endIndex: wordRange.endIndex
  })
}
