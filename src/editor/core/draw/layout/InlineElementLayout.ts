import { ZERO } from '../../../dataset/constant/Common'
import { IElement, IElementMetrics } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { BlockElementLayout } from '../../modules/block/layout/BlockElementLayout'
import { CheckableControlElementLayout } from '../../modules/control/layout/CheckableControlElementLayout'
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
  private readonly checkableControlElementLayout: CheckableControlElementLayout
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
      // 继承前一个元素的高度和基线信息
      const preElement = curRow.elementList[curRow.elementList.length - 1]
      metrics.height =
        preElement?.metrics.height || this.draw.getOptions().defaultSize * scale
      metrics.boundingBoxAscent = preElement?.metrics.boundingBoxAscent || 0
      metrics.boundingBoxDescent = preElement?.metrics.boundingBoxDescent || 0
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
      defaultTabWidth
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

}
