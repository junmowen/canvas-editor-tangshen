import { ZERO } from '../../../dataset/constant/Common'
import { IDrawRowPayload } from '../../../interface/Draw'
import type { Draw } from '../../draw/Draw'
import { RowTableRenderHelper } from '../../modules/table/render/RowTableRenderHelper'

/** 行选区渲染器，封装普通字符选区和表格单元格递归选区绘制。 */
export class RowSelectionRenderer {
  constructor(
    private readonly draw: Draw,
    private readonly tableRenderHelper: RowTableRenderHelper
  ) {}

  public render(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    const rangeManager = this.draw.getRange()
    const rangeMinWidth = this.draw.getOptions().rangeMinWidth
    const { elementList, zone, tableCellContext } = payload
    const {
      isCrossRowCol,
      zone: rangeZone,
      startIndex: rangeStartIndex,
      endIndex: rangeEndIndex
    } = rangeManager.getEditBoundaryRange()
    if (
      isCrossRowCol &&
      !this.tableRenderHelper.renderCrossRowColSelection(ctx, payload, rangeZone)
    ) {
      return
    }
    const skipCurrentLayerSelection = !!(
      !tableCellContext &&
      this.draw.getCoordinate().getPositionContext().isTable &&
      !isCrossRowCol
    )
    const renderSelectionRange =
      !skipCurrentLayerSelection &&
      !isCrossRowCol &&
      rangeStartIndex !== rangeEndIndex
        ? rangeManager.getRenderSelectionRange({
            elementList,
            tableCellContext
          })
        : null
    if (renderSelectionRange && rangeZone === zone) {
      const effectiveRangeStartIndex =
        renderSelectionRange.startIndex ?? rangeStartIndex
      const effectiveRangeEndIndex =
        renderSelectionRange.endIndex ?? rangeEndIndex
      this.renderSelectionRange(
        ctx,
        payload,
        effectiveRangeStartIndex,
        effectiveRangeEndIndex,
        rangeMinWidth
      )
    }

    this.tableRenderHelper.forEachCellPayload(payload, tableCellPayload => {
      this.render(ctx, {
        ...tableCellPayload,
        selectionCtx: ctx
      })
    })
  }

  private renderSelectionRange(
    ctx: CanvasRenderingContext2D,
    payload: IDrawRowPayload,
    effectiveRangeStartIndex: number,
    effectiveRangeEndIndex: number,
    rangeMinWidth: number
  ) {
    const { elementList, startIndex } = payload
    const rangeManager = this.draw.getRange()
    let index = startIndex
    this.forEachRowPositionSlice(payload, (curRow, rowPositionList) => {
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const metrics = element.metrics
        const rowPosition = rowPositionList[j]
        if (!rowPosition) {
          index++
          continue
        }
        const {
          coordinate: {
            leftTop: [x, y]
          }
        } = rowPosition
        if (effectiveRangeStartIndex <= index && index <= effectiveRangeEndIndex) {
          if (element.value !== ZERO) {
            let rangeWidth = metrics.width
            if (rangeWidth === 0 && curRow.elementList.length === 1) {
              rangeWidth = rangeMinWidth
            }
            rangeManager.render(ctx, x, y, rangeWidth, curRow.height)
          } else if (effectiveRangeStartIndex === index) {
            const nextElement = elementList[effectiveRangeStartIndex + 1]
            if (nextElement && nextElement.value === ZERO) {
              rangeManager.render(
                ctx,
                x + metrics.width,
                y,
                rangeMinWidth,
                curRow.height
              )
            }
          }
        }
        index++
      }
    })
  }

  private forEachRowPositionSlice(
    payload: IDrawRowPayload,
    callback: (
      curRow: IDrawRowPayload['rowList'][number],
      rowPositionList: IDrawRowPayload['positionList']
    ) => void
  ) {
    let rowPositionOffset = 0
    for (let i = 0; i < payload.rowList.length; i++) {
      const curRow = payload.rowList[i]
      const rowPositionList = payload.positionList.slice(
        rowPositionOffset,
        rowPositionOffset + curRow.elementList.length
      )
      rowPositionOffset += curRow.elementList.length
      callback(curRow, rowPositionList)
    }
  }
}
