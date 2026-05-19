import { ZERO } from '../../../dataset/constant/Common'
import { ImageDisplay } from '../../../dataset/enum/Common'
import { BlockType } from '../../../dataset/enum/Block'
import { ControlComponent } from '../../../dataset/enum/Control'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement, IElementMetrics } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { convertStringToBase64 } from '../../../utils'
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
  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象，用于访问编辑器选项和方法
   */
  constructor(private readonly draw: Draw) {}

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

    // 处理图片和 LaTeX 元素
    if (
      element.type === ElementType.IMAGE ||
      element.type === ElementType.LATEX
    ) {
      // 浮动图片不占用行内空间
      if (
        element.imgDisplay === ImageDisplay.SURROUND ||
        element.imgDisplay === ImageDisplay.TIGHT ||
        element.imgDisplay === ImageDisplay.FLOAT_TOP ||
        element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
      ) {
        metrics.width = 0
        metrics.height = 0
        metrics.boundingBoxDescent = 0
      } else {
        // 处理自适应宽度的图片
        const elementWidth = element.width! * scale
        const elementHeight = element.height! * scale
        if (elementWidth > availableWidth) {
          // 计算自适应高度
          const adaptiveHeight = (elementHeight * availableWidth) / elementWidth
          element.width = availableWidth / scale
          element.height = adaptiveHeight / scale
          metrics.width = availableWidth
          metrics.height = adaptiveHeight
          metrics.boundingBoxDescent = adaptiveHeight
        } else {
          metrics.width = elementWidth
          metrics.height = elementHeight
          metrics.boundingBoxDescent = elementHeight
        }
      }
      metrics.boundingBoxAscent = 0
      return metrics
    }

    // 处理分隔符元素
    if (element.type === ElementType.SEPARATOR) {
      const {
        separator: { lineWidth }
      } = this.draw.getOptions()
      // 分隔符占满可用宽度
      element.width = availableWidth / scale
      metrics.width = availableWidth
      metrics.height = lineWidth * scale
      metrics.boundingBoxAscent = -rowMargin
      metrics.boundingBoxDescent = -rowMargin + metrics.height
      return metrics
    }

    // 处理分页符元素
    if (element.type === ElementType.PAGE_BREAK) {
      element.width = availableWidth / scale
      metrics.width = availableWidth
      metrics.height = defaultSize
      return metrics
    }

    // 处理单选框元素
    if (
      element.type === ElementType.RADIO ||
      element.controlComponent === ControlComponent.RADIO
    ) {
      const { width, height, gap } = this.draw.getOptions().radio
      const elementWidth = width + gap * 2
      element.width = elementWidth
      metrics.width = elementWidth * scale
      metrics.height = height * scale
      return metrics
    }

    // 处理复选框元素
    if (
      element.type === ElementType.CHECKBOX ||
      element.controlComponent === ControlComponent.CHECKBOX
    ) {
      const { width, height, gap } = this.draw.getOptions().checkbox
      const elementWidth = width + gap * 2
      element.width = elementWidth
      metrics.width = elementWidth * scale
      metrics.height = height * scale
      return metrics
    }

    // 处理制表符元素
    if (element.type === ElementType.TAB) {
      metrics.width = defaultTabWidth * scale
      metrics.height = defaultSize * scale
      metrics.boundingBoxDescent = 0
      metrics.boundingBoxAscent = metrics.height
      return metrics
    }

    // 处理块级元素
    if (element.type === ElementType.BLOCK) {
      if (!element.width) {
        metrics.width = availableWidth
      } else {
        const elementWidth = element.width * scale
        metrics.width = Math.min(elementWidth, availableWidth)
      }
      metrics.height = element.height! * scale
      metrics.boundingBoxDescent = metrics.height
      metrics.boundingBoxAscent = 0
      this.preloadSvgBlockRasterImage(element)
      return metrics
    }

    // 处理文本元素（包括上标、下标）
    const size = element.size || defaultSize
    if (
      element.type === ElementType.SUPERSCRIPT ||
      element.type === ElementType.SUBSCRIPT
    ) {
      // 上标和下标使用较小的字号
      element.actualSize = Math.ceil(size * 0.6)
    }
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
    // 上标向上偏移
    if (element.type === ElementType.SUPERSCRIPT) {
      metrics.boundingBoxAscent += metrics.height / 2
    } else if (element.type === ElementType.SUBSCRIPT) {
      // 下标向下偏移
      metrics.boundingBoxDescent += metrics.height / 2
    }
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

  /** Preload SVG block as an image so export can synchronously rasterize it into Canvas2D. */
  private preloadSvgBlockRasterImage(element: IElement) {
    const svgBlock = element.block?.svgBlock
    if (element.block?.type !== BlockType.SVG || !svgBlock?.svg || svgBlock.rasterImage) {
      return
    }
    const image = new Image()
    const loadPromise = new Promise((resolve, reject) => {
      image.onload = () => {
        svgBlock.rasterImage = image
        resolve(element)
      }
      image.onerror = reject
    })
    image.src = `data:image/svg+xml;base64,${convertStringToBase64(svgBlock.svg)}`
    this.draw.getComponents().imageObserver.add(loadPromise)
  }
}
