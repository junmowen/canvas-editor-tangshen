import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

/** 行内高亮渲染器，封装富文本高亮和控件高亮的合并绘制规则。 */
export class RowHighlightRenderer {
  constructor(private readonly draw: Draw) {}

  public render(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    const { elementList } = payload
    const draw = this.draw
    const marginHeight = draw.getDefaultBasicRowMarginHeight()
    const highlightMarginHeight = draw
      .getServices()
      .metricsService.getHighlightMarginHeight()
    const highlight = draw.getComponents().highlight
    const control = draw.getControl()
    const sourceElementList = payload.tableCellContext
      ? elementList
      : draw.getObjectResolver().getOriginalMainElementList()
    this.forEachRowPositionSlice(payload, (curRow, rowPositionList) => {
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const preElement = curRow.elementList[j - 1]
        const controlHighlightIndex = curRow.startIndex + j
        const sourceElement = sourceElementList[controlHighlightIndex]
        const preSourceElement = sourceElementList[controlHighlightIndex - 1]
        const controlHighlight = elementList[controlHighlightIndex]
          ? control.getControlHighlight(elementList, controlHighlightIndex)
          : undefined
        const activeHighlight =
          element.highlight || sourceElement?.highlight || controlHighlight
        const preHighlight = preElement?.highlight || preSourceElement?.highlight
        if (activeHighlight) {
          if (preHighlight && preHighlight !== activeHighlight) {
            highlight.render(ctx)
          }
          const rowPosition = rowPositionList[j]
          if (!rowPosition) {
            continue
          }
          const {
            coordinate: {
              leftTop: [x, y],
              rightTop: [rightX],
              leftBottom: [, bottomY]
            }
          } = rowPosition
          const offsetX = element.left || 0
          const elementWidth = element.metrics?.width || rightX - x
          const rowHeight = curRow.height || bottomY - y
          highlight.recordFillInfo(
            ctx,
            x - offsetX,
            y + marginHeight - highlightMarginHeight,
            elementWidth + offsetX,
            rowHeight - 2 * marginHeight + 2 * highlightMarginHeight,
            activeHighlight
          )
        } else if (preHighlight) {
          highlight.render(ctx)
        }
      }
      highlight.render(ctx)
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
