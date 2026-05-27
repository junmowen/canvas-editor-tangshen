import { ElementType } from '../../../dataset/enum/Element'
import { TableBorder } from '../../../dataset/enum/table/Table'
import { IDrawRowPayload } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { getTableCellContentInset } from '../../table/layout/TableCellContentInset'
import type { Draw } from '../Draw'

interface ITableCellClipState {
  clippedMain: boolean
  clippedSelection: boolean
}

interface ITableRangePaintPayload {
  tableRangePaintQueue: Array<{
    tableRangeElement: IElement | ITableFragmentDescriptor
    x: number
    y: number
  }>
  tableRangeElement: IElement | ITableFragmentDescriptor | null
  rowPositionList: IDrawRowPayload['positionList']
  isPrintMode: boolean
  isCrossRowCol: boolean
  tableId?: string
}

/** RowRenderer 的表格特例绘制 helper。 */
export class RowTableRenderHelper {
  constructor(private readonly draw: Draw) {}

  /** 表格单元格裁剪状态，确保递归绘制后能成对恢复 canvas 状态。 */
  public applyCellClip(
    ctx: CanvasRenderingContext2D,
    selectionCtx: CanvasRenderingContext2D,
    payload: IDrawRowPayload
  ): ITableCellClipState {
    const bounds = this.resolveTableCellRenderBounds(payload)
    if (!bounds) {
      return {
        clippedMain: false,
        clippedSelection: false
      }
    }
    ctx.save()
    ctx.beginPath()
    ctx.rect(bounds.x, bounds.y, bounds.width, bounds.height)
    ctx.clip()
    if (selectionCtx !== ctx) {
      selectionCtx.save()
      selectionCtx.beginPath()
      selectionCtx.rect(bounds.x, bounds.y, bounds.width, bounds.height)
      selectionCtx.clip()
    }
    return {
      clippedMain: true,
      clippedSelection: selectionCtx !== ctx
    }
  }

  /** 恢复表格单元格裁剪状态。 */
  public restoreCellClip(
    ctx: CanvasRenderingContext2D,
    selectionCtx: CanvasRenderingContext2D,
    clipState: ITableCellClipState
  ) {
    if (clipState.clippedSelection) {
      selectionCtx.restore()
    }
    if (clipState.clippedMain) {
      ctx.restore()
    }
  }

  public forEachCellPayload(
    payload: IDrawRowPayload,
    callback: (payload: IDrawRowPayload) => void
  ) {
    // 当当前行里包含表格元素时，把 fragment 内部每个 td 的绘制上下文继续递归展开。
    const options = this.draw.getOptions()
    const {
      scale,
      table: { tdPadding }
    } = options
    const { pageNo, zone, isDrawLineBreak } = payload

    for (let i = 0; i < payload.rowList.length; i++) {
      const curRow = payload.rowList[i]
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        if (element.type !== ElementType.TABLE || element.hide) {
          continue
        }
        const tableSource = curRow.tableFragment || element
        if (!tableSource.trList?.length) {
          continue
        }
        for (let t = 0; t < tableSource.trList.length; t++) {
          const tr = tableSource.trList[t]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            const contentInset = getTableCellContentInset(tableSource, td)
            const tdHorizontalPadding =
              tdPadding[1] +
              tdPadding[3] +
              contentInset.left +
              contentInset.right
            const cellTableId =
              'tableId' in tableSource ? tableSource.tableId : tableSource.id
            const trId = tr.id
            const tdId = td.id
            if (!cellTableId || !trId || !tdId) {
              continue
            }
            callback({
              elementList: td.value,
              positionList: td.positionList!,
              rowList: td.rowList!,
              pageNo,
              startIndex: 0,
              innerWidth: Math.max(0, td.width! - tdHorizontalPadding) * scale,
              zone,
              isDrawLineBreak,
              tableCellContext: {
                tableId: cellTableId,
                trId,
                tdId,
                trIndex: t,
                tdIndex: d
              }
            })
          }
        }
      }
    }
  }

  /** 跨行列表格选择不再按字符范围画，而是直接按 cell bounds 渲染整格高亮。 */
  public renderCrossRowColSelection(
    ctx: CanvasRenderingContext2D,
    payload: IDrawRowPayload,
    rangeZone: IDrawRowPayload['zone']
  ) {
    const { tableCellContext, zone, pageNo } = payload
    if (!tableCellContext) {
      return true
    }
    const rangeManager = this.draw.getRange()
    const targetResolver = this.draw.getTargetResolver()
    const {
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex,
      tableId: rangeTableId
    } = rangeManager.getEditBoundaryRange()
    const activeSlice = targetResolver.resolveTableSliceByFragmentContext(
      tableCellContext
    )
    const currentTableId = activeSlice?.logicalTableId || tableCellContext.tableId
    if (
      rangeTableId &&
      currentTableId &&
      currentTableId !== rangeTableId &&
      !targetResolver.isSameLogicalTable(currentTableId, rangeTableId)
    ) {
      return true
    }
    const logicalTrIndex =
      activeSlice?.logicalTrIndex ?? tableCellContext.trIndex ?? -1
    const logicalTdIndex =
      activeSlice?.logicalTdIndex ?? tableCellContext.tdIndex ?? -1
    const minTrIndex = Math.min(
      startTrIndex ?? logicalTrIndex,
      endTrIndex ?? logicalTrIndex
    )
    const maxTrIndex = Math.max(
      startTrIndex ?? logicalTrIndex,
      endTrIndex ?? logicalTrIndex
    )
    const minTdIndex = Math.min(
      startTdIndex ?? logicalTdIndex,
      endTdIndex ?? logicalTdIndex
    )
    const maxTdIndex = Math.max(
      startTdIndex ?? logicalTdIndex,
      endTdIndex ?? logicalTdIndex
    )
    if (
      logicalTrIndex < minTrIndex ||
      logicalTrIndex > maxTrIndex ||
      logicalTdIndex < minTdIndex ||
      logicalTdIndex > maxTdIndex
    ) {
      return true
    }

    const fragmentTableId = activeSlice?.fragmentTableId || tableCellContext.tableId
    const fragmentTrId = activeSlice?.fragmentTrId || tableCellContext.trId
    const fragmentTdId = activeSlice?.fragmentTdId || tableCellContext.tdId
    const cellBounds = this.resolveCrossRowColCellBounds({
      fragmentTableId,
      fragmentTrId,
      fragmentTdId,
      tableCellContext,
      logicalTableId: activeSlice?.logicalTableId || tableCellContext.tableId,
      logicalTrIndex,
      logicalTdIndex,
      pageNo
    })
    if (cellBounds && rangeZone === zone) {
      rangeManager.render(
        ctx,
        cellBounds.x,
        cellBounds.y,
        cellBounds.width,
        cellBounds.height
      )
    }
    return false
  }

  public drawFragmentCellTopBorder(
    ctx: CanvasRenderingContext2D,
    payload: IDrawRowPayload,
    rowPositionList: IDrawRowPayload['positionList']
  ) {
    // later fragment 首行的 top border 需要在正文行绘制后补一层，
    // 避免被 fragment 内部递归绘制链覆盖掉。
    if (!payload.tableCellContext || rowPositionList[0]?.rowNo !== 0) {
      return
    }
    const targetResolver = this.draw.getTargetResolver()
    const activeSlice = targetResolver.resolveTableSliceByFragmentContext(
      payload.tableCellContext
    )
    if (!activeSlice) {
      return
    }
    const cellBounds = targetResolver
      .getFragmentCellBounds(activeSlice.fragmentTableId)
      .find(
        bounds =>
          bounds.fragmentTrId === activeSlice.fragmentTrId &&
          bounds.fragmentTdId === activeSlice.fragmentTdId
      )
    if (!cellBounds) {
      return
    }
    const originalElementList = this.draw.getObjectResolver().getOriginalElementList()
    const tableElement = originalElementList[activeSlice.logicalTableIndex]
    const isLaterFragment =
      activeSlice.fragmentTableId !== activeSlice.logicalTableId
    if (
      !isLaterFragment ||
      tableElement?.borderType === TableBorder.EMPTY ||
      tableElement?.borderType === TableBorder.INTERNAL ||
      tableElement?.borderType === TableBorder.EXTERNAL
    ) {
      return
    }
    const options = this.draw.getOptions()
    const {
      scale,
      table: { defaultBorderColor }
    } = options
    const borderWidth = (tableElement?.borderWidth || 1) * scale
    const borderColor = tableElement?.borderColor || defaultBorderColor

    ctx.save()
    ctx.strokeStyle = borderColor
    ctx.lineWidth = borderWidth
    if (tableElement?.borderType === TableBorder.DASH) {
      ctx.setLineDash([3, 3])
    }
    ctx.beginPath()
    ctx.moveTo(cellBounds.x, cellBounds.y + borderWidth / 2)
    ctx.lineTo(cellBounds.x + cellBounds.width, cellBounds.y + borderWidth / 2)
    ctx.stroke()
    ctx.restore()
  }

  public enqueueRangePaint(payload: ITableRangePaintPayload) {
    // 跨行列表格 range 的边框/外框绘制延后到整行正文都完成之后统一入队处理。
    const {
      tableRangePaintQueue,
      tableRangeElement,
      rowPositionList,
      isPrintMode,
      isCrossRowCol,
      tableId
    } = payload
    if (isPrintMode || !isCrossRowCol || !tableRangeElement) {
      return
    }
    const currentTableId =
      'tableId' in tableRangeElement ? tableRangeElement.tableId : tableRangeElement.id
    const isSameTableRange =
      !!tableId &&
      !!currentTableId &&
      (currentTableId === tableId ||
        this.draw.getTargetResolver().isSameLogicalTable(currentTableId, tableId))
    if (!isSameTableRange) {
      return
    }
    const tableRangePosition = rowPositionList.find(rowPosition => {
      const positionTable = rowPosition.tableFragment || rowPosition.element
      if (!positionTable) {
        return false
      }
      const positionTableId =
        'tableId' in positionTable ? positionTable.tableId : positionTable.id
      return !!(
        positionTableId &&
        currentTableId &&
        (positionTableId === currentTableId ||
          this.draw
            .getTargetResolver()
            .isSameLogicalTable(positionTableId, currentTableId))
      )
    })
    if (!tableRangePosition) {
      return
    }
    const {
      coordinate: {
        leftTop: [x, y]
      }
    } = tableRangePosition
    tableRangePaintQueue.push({
      tableRangeElement,
      x,
      y
    })
  }

  /** 解析当前递归表格单元格的页面 bounds，作为文本绘制硬裁剪边界。 */
  private resolveTableCellRenderBounds(payload: IDrawRowPayload) {
    if (!payload.tableCellContext) {
      return null
    }
    const targetResolver = this.draw.getTargetResolver()
    const activeSlice = targetResolver.resolveTableSliceByFragmentContext(
      payload.tableCellContext
    )
    const fragmentTableId =
      activeSlice?.fragmentTableId || payload.tableCellContext.tableId
    const fragmentTrId =
      activeSlice?.fragmentTrId || payload.tableCellContext.trId
    const fragmentTdId =
      activeSlice?.fragmentTdId || payload.tableCellContext.tdId
    const bounds =
      targetResolver
        .getFragmentCellBounds(fragmentTableId)
        .find(
          bounds =>
            bounds.fragmentTrId === fragmentTrId &&
            bounds.fragmentTdId === fragmentTdId
        ) || null
    if (!bounds) {
      return null
    }
    const activeTable =
      payload.rowList
        .flatMap(row =>
          row.elementList
            .filter(element => element.type === ElementType.TABLE)
            .map(element => row.tableFragment || element)
        )
        .find(table => {
          const tableId = 'tableId' in table ? table.tableId : table.id
          return tableId === fragmentTableId
        }) || null
    const activeTd = activeTable?.trList
      ?.flatMap(tr => tr.tdList)
      .find(td => td.id === fragmentTdId)
    if (!activeTable || !activeTd) {
      return bounds
    }
    const options = this.draw.getOptions()
    const {
      scale,
      table: { tdPadding }
    } = options
    const contentInset = getTableCellContentInset(activeTable, activeTd)
    const left = (tdPadding[3] + contentInset.left) * scale
    const right = (tdPadding[1] + contentInset.right) * scale
    const top = (tdPadding[0] + contentInset.top) * scale
    const bottom = (tdPadding[2] + contentInset.bottom) * scale
    return {
      ...bounds,
      x: bounds.x + left,
      y: bounds.y + top,
      width: Math.max(0, bounds.width - left - right),
      height: Math.max(0, bounds.height - top - bottom)
    }
  }

  // 跨行列选择时，优先直接读取稳定的 cell bounds；
  // 若当前 fragment 里找不到，再按逻辑 cell 在同页 fragment 中回查。
  private resolveCrossRowColCellBounds(payload: {
    fragmentTableId: string
    fragmentTrId?: string
    fragmentTdId?: string
    tableCellContext?: IDrawRowPayload['tableCellContext']
    logicalTableId?: string
    logicalTrIndex: number
    logicalTdIndex: number
    pageNo: number
  }) {
    const {
      fragmentTableId,
      fragmentTrId,
      fragmentTdId,
      tableCellContext,
      logicalTableId,
      logicalTrIndex,
      logicalTdIndex,
      pageNo
    } = payload
    const targetResolver = this.draw.getTargetResolver()
    const directBounds = targetResolver
      .getFragmentCellBounds(fragmentTableId)
      .find(
        bounds =>
          ((fragmentTrId &&
            fragmentTdId &&
            bounds.fragmentTrId === fragmentTrId &&
            bounds.fragmentTdId === fragmentTdId) ||
            (tableCellContext?.trIndex !== undefined &&
              tableCellContext?.tdIndex !== undefined &&
              bounds.trIndex === tableCellContext.trIndex &&
              bounds.tdIndex === tableCellContext.tdIndex))
      )
    if (directBounds) {
      return directBounds
    }

    const pageFragmentPositions = targetResolver.getPageFragmentPositions(pageNo)
    for (let i = 0; i < pageFragmentPositions.length; i++) {
      const fragmentTable = pageFragmentPositions[i].tableFragment
      const candidateTableId =
        fragmentTable?.tableId || pageFragmentPositions[i].element?.id
      if (!candidateTableId) {
        continue
      }
      if (
        logicalTableId &&
        !targetResolver.isSameLogicalTable(candidateTableId, logicalTableId)
      ) {
        continue
      }
      const candidateBoundsList =
        targetResolver.getFragmentCellBounds(candidateTableId)
      for (let j = 0; j < candidateBoundsList.length; j++) {
        const candidateBounds = candidateBoundsList[j]
        const candidateSlice = targetResolver.resolveTableSliceByFragmentContext({
          tableId: candidateTableId,
          trId: candidateBounds.fragmentTrId,
          tdId: candidateBounds.fragmentTdId,
          trIndex: candidateBounds.trIndex,
          tdIndex: candidateBounds.tdIndex
        })
        if (
          candidateSlice?.logicalTrIndex === logicalTrIndex &&
          candidateSlice?.logicalTdIndex === logicalTdIndex
        ) {
          return candidateBounds
        }
      }
    }

    return null
  }
}
