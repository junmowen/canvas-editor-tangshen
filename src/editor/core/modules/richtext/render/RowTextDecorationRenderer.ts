import { TEXTLIKE_ELEMENT_TYPE } from '../../../../dataset/constant/Element'
import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import { IElement } from '../../../../interface/Element'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

interface IRowTextDecorationRenderPayload {
  ctx: CanvasRenderingContext2D
  element: RowElement
  preElement?: RowElement
  x: number
  y: number
  offsetY: number
  rowHeight: number
  options: ReturnType<Draw['getOptions']>
  textParticle: ReturnType<Draw['getTextParticle']>
  underline: ReturnType<Draw['getComponents']>['underline']
  strikeout: ReturnType<Draw['getComponents']>['strikeout']
  subscriptParticle: ReturnType<Draw['getComponents']>['subscriptParticle']
  superscriptParticle: ReturnType<Draw['getComponents']>['superscriptParticle']
  getElementSize: (el: IElement) => number
  getElementFont: Draw['getElementFont']
  getElementRowMargin: (el: IElement) => number
}

/** 行内富文本装饰渲染器，封装下划线和删除线的分段 record/flush 规则。 */
export class RowTextDecorationRenderer {
  public flush(
    ctx: CanvasRenderingContext2D,
    underline: ReturnType<Draw['getComponents']>['underline'],
    strikeout: ReturnType<Draw['getComponents']>['strikeout']
  ) {
    underline.render(ctx)
    strikeout.render(ctx)
  }

  public render(payload: IRowTextDecorationRenderPayload) {
    this.recordUnderline(payload)
    this.recordStrikeout(payload)
  }

  private recordUnderline(payload: IRowTextDecorationRenderPayload) {
    const {
      ctx,
      element,
      preElement,
      x,
      y,
      rowHeight,
      options,
      underline,
      subscriptParticle,
      getElementRowMargin
    } = payload
    if (element.underline || element.control?.underline) {
      if (
        preElement?.type === ElementType.SUBSCRIPT &&
        element.type !== ElementType.SUBSCRIPT
      ) {
        underline.render(ctx)
      }
      const rowMargin = getElementRowMargin(element)
      const offsetLineX = element.left || 0
      let offsetLineY = 0
      if (element.type === ElementType.SUBSCRIPT) {
        offsetLineY = subscriptParticle.getOffsetY(element)
      }
      const color = element.control?.underline
        ? options.underlineColor
        : element.color
      underline.recordFillInfo(
        ctx,
        x - offsetLineX,
        y + rowHeight - rowMargin + offsetLineY,
        element.metrics.width + offsetLineX,
        0,
        color,
        element.textDecoration?.style
      )
    } else if (preElement?.underline || preElement?.control?.underline) {
      underline.render(ctx)
    }
  }

  private recordStrikeout(payload: IRowTextDecorationRenderPayload) {
    const {
      ctx,
      element,
      preElement,
      x,
      y,
      offsetY,
      options,
      textParticle,
      strikeout,
      subscriptParticle,
      superscriptParticle,
      getElementSize,
      getElementFont
    } = payload
    if (element.strikeout) {
      if (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)) {
        if (
          preElement &&
          ((preElement.type === ElementType.SUBSCRIPT &&
            element.type !== ElementType.SUBSCRIPT) ||
            (preElement.type === ElementType.SUPERSCRIPT &&
              element.type !== ElementType.SUPERSCRIPT) ||
            getElementSize(preElement) !== getElementSize(element))
        ) {
          strikeout.render(ctx)
        }
        const standardMetrics = textParticle.measureBasisWord(
          ctx,
          getElementFont(element)
        )
        let adjustY =
          y +
          offsetY +
          standardMetrics.actualBoundingBoxDescent * options.scale -
          element.metrics.height / 2
        if (element.type === ElementType.SUBSCRIPT) {
          adjustY += subscriptParticle.getOffsetY(element)
        } else if (element.type === ElementType.SUPERSCRIPT) {
          adjustY += superscriptParticle.getOffsetY(element)
        }
        strikeout.recordFillInfo(ctx, x, adjustY, element.metrics.width)
      }
    } else if (preElement?.strikeout) {
      strikeout.render(ctx)
    }
  }
}
