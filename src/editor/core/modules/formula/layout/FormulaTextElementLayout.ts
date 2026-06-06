import { ElementType } from '../../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../../interface/Element'
import type { Draw } from '../../../draw/Draw'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../debug/FormulaDebugLogger'
import { resolveFormulaDisplayText } from '../model/FormulaTextModel'
import { createFormulaVisualBox } from '../model/FormulaVisualModel'

/** 判断当前元素是否为文本型公式控件。 */
export function isFormulaTextElement(
  element: IElement | undefined
): element is IElement {
  return element?.type === ElementType.LATEX
}

/** 判断公式是否属于复杂行内公式，仅用于测量兜底和调试诊断。 */
export function isComplexFormulaTextElement(element: IElement | undefined) {
  if (!isFormulaTextElement(element)) return false
  const latex = (element.formula?.latex ?? element.value ?? '').trim()
  const structureCount = [
    /\\frac/g,
    /\\sqrt/g,
    /\\sum/g,
    /\\int/g,
    /\^/g,
    /_/g
  ].reduce((count, pattern) => {
    return count + (latex.match(pattern) || []).length
  }, 0)
  return structureCount >= 3 || latex.length >= 24
}

/** 判断当前元素是否需要在复杂公式边界处换行。 */
export function shouldBreakAtComplexFormulaBoundary(payload: {
  /** 当前正在排版的元素。 */
  element: IElement
  /** 当前元素前一个元素。 */
  preElement?: IElement
  /** 当前行是否还没有真实内容。 */
  isCurrentRowEmpty: boolean
}) {
  const { element, preElement, isCurrentRowEmpty } = payload
  // 复杂公式仍然是行内文本控件，不能因为结构复杂就强制独占一行。
  // 是否换行统一交给行宽判断处理，避免 WPS/OnlyOffice 语义下的行内公式被拆断。
  const shouldBreak = false
  if (
    isFormulaDebugEnabled() &&
    (isFormulaTextElement(element) || isFormulaTextElement(preElement))
  ) {
    logFormulaDebug('complex-boundary', {
      shouldBreak,
      isCurrentRowEmpty,
      elementId: element.id,
      elementType: element.type,
      elementValue: element.value,
      elementLatex: element.formula?.latex,
      elementComplex: isComplexFormulaTextElement(element),
      preElementId: preElement?.id,
      preElementType: preElement?.type,
      preElementValue: preElement?.value,
      preElementLatex: preElement?.formula?.latex,
      preElementComplex: isComplexFormulaTextElement(preElement)
    })
  }
  return shouldBreak
}

/** 公式文本控件行内测量器，让公式按文本宽高进入段落和分栏布局。 */
export class FormulaTextElementLayout {
  /** 初始化 FormulaTextElementLayout 实例并注入绘制门面。 */
  constructor(private readonly draw: Draw) {}

  /** 测量公式文本控件，避免继续走图片自适应和图片高度偏移。 */
  public measure(payload: {
    /** 画布上下文，用于测量公式展示文本。 */
    ctx: CanvasRenderingContext2D
    /** 公式元素。 */
    element: IElement
    /** 复用的元素 metrics。 */
    metrics: IElementMetrics
    /** 当前行剩余可用宽度，已经按缩放比例折算，用于多栏内约束公式宽度。 */
    availableWidth: number
    /** 缩放比例。 */
    scale: number
    /** 默认字号。 */
    defaultSize: number
  }) {
    const { ctx, element, metrics, availableWidth, scale, defaultSize } = payload
    if (!isFormulaTextElement(element)) return false
    const formulaElement = {
      ...element,
      type: ElementType.TEXT
    }
    const size = element.size || defaultSize
    const font = this.draw.getElementFont(formulaElement)
    if ((ctx as any)._currentFont !== font) {
      ctx.font = font
      ;(ctx as any)._currentFont = font
    }
    const latex = element.formula?.latex ?? element.value
    const displayText = resolveFormulaDisplayText(latex)
    const measuredText = this.draw.getTextParticle().measureText(ctx, {
      ...formulaElement,
      value: displayText
    })
    ctx.save()
    const visualBox = createFormulaVisualBox({
      ctx,
      latex,
      font,
      defaultSize: size,
      element,
      defaultColor: this.draw.getOptions().defaultColor,
      debugSource: 'layout-measure'
    })
    ctx.restore()
    const textAscent =
      measuredText.actualBoundingBoxAscent || size * 0.82
    const textDescent =
      measuredText.actualBoundingBoxDescent || size * 0.22
    const textHeight = Math.max(1, textAscent + textDescent)
    const visualHeight = Math.max(1, visualBox.ascent + visualBox.descent)
    // 公式宽度按结构化公式最终绘制宽度进入段落流，高度按结构化公式适度撑开。
    const maxFormulaHeight = size * 3.2
    const targetHeight = Math.max(
      textHeight,
      Math.min(visualHeight, maxFormulaHeight)
    )
    const maxFormulaWidth = Math.max(0, availableWidth / scale)
    // 公式仍以结构化视觉盒为宽度来源；当公式超过栏宽时只做等比缩放。
    const formulaScale = Math.min(
      1,
      targetHeight / visualHeight,
      maxFormulaWidth ? maxFormulaWidth / visualBox.width : 1
    )
    const targetWidth = visualBox.width * formulaScale
    const targetAscent = visualBox.ascent * formulaScale
    const targetDescent = visualBox.descent * formulaScale
    metrics.width = Math.max(targetWidth * scale, 1)
    metrics.height = targetHeight * scale
    metrics.boundingBoxAscent = targetAscent * scale
    metrics.boundingBoxDescent = targetDescent * scale
    if (isFormulaDebugEnabled()) {
      logFormulaDebug('measure', {
        id: element.id,
        latex,
        displayText,
        font,
        size,
        scale,
        textWidth: roundFormulaDebugNumber(measuredText.width),
        textAscent: roundFormulaDebugNumber(textAscent),
        textDescent: roundFormulaDebugNumber(textDescent),
        visualWidth: roundFormulaDebugNumber(visualBox.width),
        visualHeight: roundFormulaDebugNumber(visualHeight),
        maxFormulaWidth: roundFormulaDebugNumber(maxFormulaWidth),
        formulaScale: roundFormulaDebugNumber(formulaScale),
        targetWidth: roundFormulaDebugNumber(targetWidth),
        targetHeight: roundFormulaDebugNumber(targetHeight),
        metricsWidth: roundFormulaDebugNumber(metrics.width),
        metricsHeight: roundFormulaDebugNumber(metrics.height),
        metricsAscent: roundFormulaDebugNumber(metrics.boundingBoxAscent),
        metricsDescent: roundFormulaDebugNumber(metrics.boundingBoxDescent),
        isComplex: isComplexFormulaTextElement(element)
      })
    }
    return true
  }
}
