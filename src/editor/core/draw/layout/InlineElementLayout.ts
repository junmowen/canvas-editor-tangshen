import { ZERO } from '../../../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { BlockElementLayout } from '../../modules/block/layout/BlockElementLayout'
import { ChartGraphicElementLayout } from '../../modules/chart-graphics/layout/ChartGraphicElementLayout'
import { CheckableControlElementLayout } from '../../modules/control/layout/CheckableControlElementLayout'
import {
  FormulaTextElementLayout,
  isFormulaTextElement
} from '../../modules/formula/layout/FormulaTextElementLayout'
import { InlineImageElementLayout } from '../../modules/image/layout/InlineImageElementLayout'
import { PageBreakElementLayout } from '../../modules/page-break/layout/PageBreakElementLayout'
import { TabElementLayout } from '../../modules/paragraph/layout/TabElementLayout'
import { ScriptElementLayout } from '../../modules/richtext/layout/ScriptElementLayout'
import { SeparatorElementLayout } from '../../modules/separator/layout/SeparatorElementLayout'
import type { Draw } from '../Draw'

/**
 * 行内元素测量参数接口。
 */
interface IMeasureInlineElementPayload {
  /** 画布上下文 */
  ctx: CanvasRenderingContext2D
  /** 要测量的元素 */
  element: IElement
  /** 当前参与测量的元素列表。 */
  elementList: IElement[]
  /** 当前元素在元素列表中的索引。 */
  index: number
  /** 行列表 */
  rowList: IRow[]
  /** 可用宽度 */
  availableWidth: number
  /** 行边距 */
  rowMargin: number
  /** 缩放比例 */
  scale: number
  /** 默认字体大小 */
  defaultSize: number
  /** 默认制表符宽度 */
  defaultTabWidth: number
}

/**
 * 行内元素布局器。
 *
 * 负责测量图片、分隔符、控件与普通文本等单个元素的尺寸。
 */
export class InlineElementLayout {
  private readonly blockElementLayout: BlockElementLayout
  private readonly chartGraphicElementLayout = new ChartGraphicElementLayout()
  private readonly checkableControlElementLayout: CheckableControlElementLayout
  private readonly formulaTextElementLayout: FormulaTextElementLayout
  private readonly inlineImageElementLayout = new InlineImageElementLayout()
  private readonly pageBreakElementLayout = new PageBreakElementLayout()
  private readonly scriptElementLayout = new ScriptElementLayout()
  private readonly separatorElementLayout: SeparatorElementLayout
  private readonly tabElementLayout = new TabElementLayout()

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象，用于访问编辑器选项和方法
   */
  constructor(private readonly draw: Draw) {
    this.blockElementLayout = new BlockElementLayout(draw)
    this.checkableControlElementLayout = new CheckableControlElementLayout(draw)
    this.formulaTextElementLayout = new FormulaTextElementLayout(draw)
    this.separatorElementLayout = new SeparatorElementLayout(draw)
  }

  /**
   * 测量单个行内元素的尺寸信息。
   *
   * 根据元素类型（图片、文本、控件等）计算其宽度、高度和基线信息。
   *
   * @param payload - 测量参数
   * @returns 元素尺寸信息
   */
  public measure(payload: IMeasureInlineElementPayload) {
    // 解构参数
    const {
      ctx,
      element,
      elementList,
      index,
      rowList,
      availableWidth,
      rowMargin,
      scale,
      defaultSize,
      defaultTabWidth
    } = payload
    // 复用已有 metrics 对象，避免垃圾回收停顿
    const metrics = (element as any).metrics || this.createMetrics()
    const curRow = rowList[rowList.length - 1]

    // 非设计态下，隐藏元素不参与真实排版，但仍需继承前一个元素高度以维持行高稳定。
    if (
      (element.hide || element.control?.hide || element.area?.hide) &&
      !this.draw.isDesignMode()
    ) {
      metrics.width = 0
      // 继承前一个元素的高度和基线信息
      const preElement = curRow.elementList[curRow.elementList.length - 1]
      metrics.height =
        preElement?.metrics.height || this.draw.getOptions().defaultSize * scale
      metrics.boundingBoxAscent = preElement?.metrics.boundingBoxAscent || 0
      metrics.boundingBoxDescent = preElement?.metrics.boundingBoxDescent || 0
      return metrics
    }

    if (this.formulaTextElementLayout.measure({
      ctx,
      element,
      metrics,
      availableWidth,
      scale,
      defaultSize
    })) {
      return metrics
    }
    if (this.inlineImageElementLayout.measure({
      element,
      metrics,
      availableWidth,
      scale
    })) {
      return metrics
    }
    if (this.separatorElementLayout.measure({
      element,
      metrics,
      availableWidth,
      rowMargin,
      scale
    })) {
      return metrics
    }
    if (this.pageBreakElementLayout.measure({
      element,
      metrics,
      availableWidth,
      scale,
      defaultSize
    })) {
      return metrics
    }
    if (this.checkableControlElementLayout.measure({
      element,
      metrics,
      scale
    })) {
      return metrics
    }
    if (this.tabElementLayout.measure({
      element,
      metrics,
      scale,
      defaultSize,
      defaultTabWidth,
      currentRowWidth: curRow.width,
      availableWidth,
      nextRunWidth: this.measureNextTabRunWidth({
        ctx,
        elementList,
        startIndex: index + 1,
        availableWidth,
        scale,
        defaultSize,
        alignment: this.resolveNextTabStopAlignment({
          tabStops:
            element.tabStops ||
            curRow.elementList[curRow.elementList.length - 1]?.tabStops,
          currentRowWidth: curRow.width,
          availableWidth,
          scale
        })
      }),
      tabStops:
        element.tabStops ||
        curRow.elementList[curRow.elementList.length - 1]?.tabStops
    })) {
      return metrics
    }
    if (this.blockElementLayout.measure({
      element,
      metrics,
      availableWidth,
      scale
    })) {
      return metrics
    }
    if (this.chartGraphicElementLayout.measure({
      element,
      metrics,
      availableWidth,
      scale
    })) {
      return metrics
    }

    const size = element.size || defaultSize
    this.scriptElementLayout.applyActualSize(element, defaultSize)
    metrics.height = (element.actualSize || size) * scale
    // 设置字体（缓存避免频繁触发 DOM setter）
    const font = this.draw.getElementFont(element)
    if ((ctx as any)._currentFont !== font) {
      ctx.font = font
      ;(ctx as any)._currentFont = font
    }
    // 测量文本
    const fontMetrics = this.draw.getTextParticle().measureText(ctx, element)
    metrics.width = fontMetrics.width * scale
    // 添加字间距
    if (element.letterSpacing) {
      metrics.width += element.letterSpacing * scale
    }
    // 计算基线信息
    metrics.boundingBoxAscent =
      (element.value === ZERO
        ? element.size || defaultSize
        : fontMetrics.actualBoundingBoxAscent) * scale
    metrics.boundingBoxDescent =
      fontMetrics.actualBoundingBoxDescent * scale
    this.scriptElementLayout.adjustMetrics(element, metrics)
    return metrics
  }

  /**
   * 创建空白的元素测量结果对象。
   *
   * @returns 空白的元素尺寸信息
   */
  private createMetrics(): IElementMetrics {
    return {
      width: 0,
      height: 0,
      boundingBoxAscent: 0,
      boundingBoxDescent: 0
    }
  }

  /** 解析当前 TAB 即将命中的制表位对齐方式，供后续文本预读测量使用。 */
  private resolveNextTabStopAlignment(payload: {
    /** 当前段落可用制表位列表。 */
    tabStops?: Array<{ position: number; alignment?: string }>
    /** 当前行已占用宽度。 */
    currentRowWidth: number
    /** 当前行可用宽度。 */
    availableWidth: number
    /** 缩放比例。 */
    scale: number
  }) {
    const { tabStops, currentRowWidth, availableWidth, scale } = payload
    const sortedTabStops = (tabStops || [])
      .filter(tabStop => tabStop.position >= 0)
      .slice()
      .sort((a, b) => a.position - b.position)
    const nextTabStop = sortedTabStops.find(tabStop => {
      const stopX = tabStop.position * scale
      return stopX > currentRowWidth && stopX <= availableWidth
    })
    return nextTabStop?.alignment || 'left'
  }

  /** 预读 TAB 后面的连续文本宽度，用于右对齐、居中和小数点制表位测量。 */
  private measureNextTabRunWidth(payload: {
    /** 画布上下文，用于复用当前测量 surface。 */
    ctx: CanvasRenderingContext2D
    /** 当前参与测量的元素列表。 */
    elementList: IElement[]
    /** TAB 后第一个元素索引。 */
    startIndex: number
    /** 当前行可用宽度，用于临时测量公式控件。 */
    availableWidth: number
    /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
    scale: number
    /** 默认字号，用于临时测量公式控件和上下标。 */
    defaultSize: number
    /** 当前制表位对齐方式。 */
    alignment: string
  }) {
    const { ctx, elementList, startIndex, alignment } = payload
    if (!['right', 'center', 'decimal'].includes(alignment)) {
      return 0
    }
    let width = 0
    for (let index = startIndex; index < elementList.length; index++) {
      const element = elementList[index]
      if (!this.isTabAlignmentTextElement(element)) {
        break
      }
      const value =
        alignment === 'decimal'
          ? this.getDecimalAlignmentText(element.value)
          : element.value
      width += this.measureTabAlignmentElementWidth({
        ctx,
        element,
        value,
        availableWidth: payload.availableWidth,
        scale: payload.scale,
        defaultSize: payload.defaultSize
      })
      if (alignment === 'decimal' && element.value.includes('.')) {
        break
      }
    }
    return width
  }

  /** 判断元素是否可以参与制表位对齐预读。 */
  private isTabAlignmentTextElement(element: IElement | undefined) {
    if (!element || element.value === ZERO || element.type === ElementType.TAB) {
      return false
    }
    return (
      element.type === ElementType.LATEX ||
      !element.type ||
      TEXTLIKE_ELEMENT_TYPE.includes(element.type)
    )
  }

  /** 小数点对齐只预读小数点前的文本。 */
  private getDecimalAlignmentText(value: string) {
    const decimalIndex = value.indexOf('.')
    return decimalIndex >= 0 ? value.slice(0, decimalIndex) : value
  }

  /** 测量制表位预读元素宽度，复杂行内对象必须复用真实布局测量器。 */
  private measureTabAlignmentElementWidth(payload: {
    /** 画布上下文，用于复用当前测量 surface。 */
    ctx: CanvasRenderingContext2D
    /** 当前被预读的元素。 */
    element: IElement
    /** 预读文本，小数点对齐时可能只是元素值的一部分。 */
    value: string
    /** 当前行可用宽度，用于公式等复杂控件临时测量。 */
    availableWidth: number
    /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
    scale: number
    /** 默认字号，用于公式和上下标临时测量。 */
    defaultSize: number
  }) {
    const { ctx, element, value, availableWidth, scale, defaultSize } = payload
    if (isFormulaTextElement(element)) {
      const metrics = this.createMetrics()
      this.formulaTextElementLayout.measure({
        ctx,
        element,
        metrics,
        availableWidth,
        scale,
        defaultSize
      })
      return metrics.width
    }
    return this.measureTextElementWidth(ctx, element, value, defaultSize)
  }

  /** 测量制表位预读文本宽度，保持和普通文本测量的字体、字距一致。 */
  private measureTextElementWidth(
    ctx: CanvasRenderingContext2D,
    element: IElement,
    value: string,
    defaultSize: number
  ) {
    if (!value) return 0
    const measureElement = { ...element, value }
    this.scriptElementLayout.applyActualSize(measureElement, defaultSize)
    const font = this.draw.getElementFont(measureElement)
    if ((ctx as any)._currentFont !== font) {
      ctx.font = font
      ;(ctx as any)._currentFont = font
    }
    const fontMetrics = this.draw.getTextParticle().measureText(ctx, measureElement)
    return (
      fontMetrics.width * this.draw.getOptions().scale +
      (element.letterSpacing || 0) * this.draw.getOptions().scale
    )
  }
}
