import { PUNCTUATION_REG } from '../../../../dataset/constant/Regular'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { RowFlex } from '../../../../dataset/enum/Row'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'
import { WhitespaceMarkerRenderer } from './WhitespaceMarkerRenderer'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]
type RowPosition = IDrawRowPayload['positionList'][number]

/** 普通段落文本 run 渲染器，封装 tab、对齐控制符、修订色和空格可视标记。 */
export class ParagraphTextRunRenderer {
  private readonly whitespaceMarkerRenderer = new WhitespaceMarkerRenderer()

  public render(payload: {
    ctx: CanvasRenderingContext2D
    element: RowElement
    rowPosition: RowPosition
    x: number
    y: number
    mode: EditorMode
    isPrintMode: boolean
    options: ReturnType<Draw['getOptions']>
    textParticle: ReturnType<Draw['getTextParticle']>
  }) {
    const {
      ctx,
      element,
      rowPosition,
      x,
      y,
      mode,
      isPrintMode,
      options,
      textParticle
    } = payload
    if (element.type === ElementType.TAB) {
      textParticle.complete()
      this.renderBarTabStop({
        ctx,
        element,
        rowPosition,
        x,
        options
      })
      return
    }
    if (
      element.rowFlex === RowFlex.ALIGNMENT ||
      element.rowFlex === RowFlex.JUSTIFY
    ) {
      textParticle.record(ctx, element, x, y)
      textParticle.complete()
      return
    }

    if (element.left) {
      textParticle.complete()
    }
    if (element.trackChange) {
      textParticle.complete()
      ctx.save()
      ctx.fillStyle =
        element.trackChange.color ||
        (element.trackChange.type === 'insert'
          ? options.trackChange.insertColor
          : options.trackChange.deleteColor)
    }
    textParticle.record(ctx, element, x, y)
    if (
      (element.value === ' ' || element.value === '\u00A0') &&
      !options.lineBreak.disabled &&
      mode !== EditorMode.CLEAN &&
      !isPrintMode
    ) {
      this.whitespaceMarkerRenderer.render(ctx, element, rowPosition, options)
    }
    if (element.width || element.letterSpacing || PUNCTUATION_REG.test(element.value)) {
      textParticle.complete()
    }
    if (element.trackChange) {
      textParticle.complete()
      ctx.restore()
    }
  }

  /** 绘制竖线制表位：TAB 自身不显示文本，只在命中的 bar 制表位落点画线。 */
  private renderBarTabStop(payload: {
    /** Canvas 2D 上下文。 */
    ctx: CanvasRenderingContext2D
    /** 当前 TAB 行内元素。 */
    element: RowElement
    /** TAB 对应的位置数据。 */
    rowPosition: RowPosition
    /** TAB 左侧横坐标。 */
    x: number
    /** 编辑器配置，用于读取缩放和默认颜色。 */
    options: ReturnType<Draw['getOptions']>
  }) {
    const { ctx, element, rowPosition, x, options } = payload
    if (element.metrics?.tabStopAlignment !== 'bar') {
      return
    }
    const lineX = x + element.metrics.width
    ctx.save()
    ctx.beginPath()
    ctx.lineWidth = Math.max(1, options.scale)
    ctx.strokeStyle = element.color || options.defaultColor
    ctx.moveTo(lineX, rowPosition.coordinate.leftTop[1])
    ctx.lineTo(lineX, rowPosition.coordinate.leftBottom[1])
    ctx.stroke()
    ctx.restore()
  }
}
