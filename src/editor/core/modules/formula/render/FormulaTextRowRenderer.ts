import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../debug/FormulaDebugLogger'
import { resolveFormulaDisplayText } from '../model/FormulaTextModel'
import { createFormulaVisualBox } from '../model/FormulaVisualModel'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 公式文本控件行内渲染器，使用 Canvas 文本而不是图片绘制公式。 */
export class FormulaTextRowRenderer {
  /** 初始化公式行渲染器。 */
  constructor(private readonly draw: Draw) {}

  /** 判断当前元素是否由公式文本控件渲染器处理。 */
  public canRender(element: RowElement) {
    return element.type === ElementType.LATEX
  }

  /** 绘制公式文本控件，并保持它作为单个公式对象参与命中和编辑。 */
  public render(payload: {
    /** Canvas 上下文。 */
    ctx: CanvasRenderingContext2D
    /** 公式行元素。 */
    element: RowElement
    /** 横坐标。 */
    x: number
    /** 纵坐标。 */
    y: number
    /** 文本粒子，用于复用普通文本绘制批处理。 */
    textParticle: ReturnType<Draw['getTextParticle']>
  }) {
    const { ctx, element, x, y, textParticle } = payload
    const latex = element.formula?.latex ?? element.value
    const displayText = resolveFormulaDisplayText(latex)
    textParticle.complete()
    const font = element.style || this.draw.getElementFont(element)
    ctx.save()
    const visualBox = createFormulaVisualBox({
      ctx,
      latex,
      font,
      defaultSize:
        element.actualSize || element.size || this.draw.getOptions().defaultSize,
      element,
      defaultColor: this.draw.getOptions().defaultColor,
      debugSource: 'row-render'
    })
    const metricsWidth = Math.max(1, element.metrics?.width || visualBox.width)
    const metricsHeight = Math.max(
      1,
      (element.metrics?.boundingBoxAscent || 0) +
        (element.metrics?.boundingBoxDescent || 0)
    )
    const visualHeight = Math.max(1, visualBox.ascent + visualBox.descent)
    const scale = Math.min(1, metricsWidth / visualBox.width, metricsHeight / visualHeight)
    const renderWidth = visualBox.width * scale
    const renderAscent = visualBox.ascent * scale
    const renderDescent = visualBox.descent * scale
    const renderX = x + Math.max(0, (metricsWidth - renderWidth) / 2)
    const renderBaselineY =
      y + Math.max(0, (metricsHeight - renderAscent - renderDescent) / 2)
    // 公式排版占位按结构化公式宽度，实际显示也使用同一个结构化公式盒。
    ctx.translate(renderX, renderBaselineY)
    ctx.scale(scale, scale)
    visualBox.render(ctx, 0, 0)
    ctx.restore()
    if (isFormulaDebugEnabled()) {
      logFormulaDebug('row-render', {
        id: element.id,
        latex,
        displayText,
        x: roundFormulaDebugNumber(x),
        baselineY: roundFormulaDebugNumber(y),
        metricsWidth: roundFormulaDebugNumber(element.metrics?.width),
        metricsHeight: roundFormulaDebugNumber(element.metrics?.height),
        metricsAscent: roundFormulaDebugNumber(
          element.metrics?.boundingBoxAscent
        ),
        metricsDescent: roundFormulaDebugNumber(
          element.metrics?.boundingBoxDescent
        ),
        visualWidth: roundFormulaDebugNumber(visualBox.width),
        visualAscent: roundFormulaDebugNumber(visualBox.ascent),
        visualDescent: roundFormulaDebugNumber(visualBox.descent),
        renderScale: roundFormulaDebugNumber(scale),
        renderX: roundFormulaDebugNumber(renderX),
        renderBaselineY: roundFormulaDebugNumber(renderBaselineY)
      })
    }
  }
}
