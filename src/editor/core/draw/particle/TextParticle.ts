import { ElementType, IEditorOption, IElement, RenderMode } from '../../..'
import {
  PUNCTUATION_LIST,
  METRICS_BASIS_TEXT
} from '../../../dataset/constant/Common'
import { DeepRequired } from '../../../interface/Common'
import { IRowElement } from '../../../interface/Row'
import { ITextMetrics } from '../../../interface/Text'
import { Draw } from '../Draw'

/**
 * 单词测量结果接口。
 */
export interface IMeasureWordResult {
  /** 单词总宽度 */
  width: number
  /** 单词结束元素 */
  endElement: IElement
}

/**
 * 文本粒子。
 *
 * 负责文本的测量、缓存和渲染，支持批处理渲染以提高性能。
 */
export class TextParticle {
  /** Draw 门面对象 */
  private draw: Draw
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>

  /** 画布上下文 */
  private ctx: CanvasRenderingContext2D
  /** 当前 X 坐标 */
  private curX: number
  /** 当前 Y 坐标 */
  private curY: number
  /** 待渲染的文本 */
  private text: string
  /** 当前样式 */
  private curStyle: string
  /** 当前颜色 */
  private curColor?: string
  /** 文本测量缓存 */
  public cacheMeasureText: Map<string, TextMetrics>

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    // 尝试获取当前页的画布上下文
    let pageCtx = draw.getPageCanvasHost().getCtxList()[draw.getPageNo()]
    if (!pageCtx) {
      // 虚拟化渲染模式下，如果该页未渲染，则创建一个离线 canvas 提供 measureText 专用 context
      const offlineCanvas = document.createElement('canvas')
      pageCtx = offlineCanvas.getContext('2d')!
    }
    this.ctx = pageCtx
    // 初始化状态
    this.curX = -1
    this.curY = -1
    this.text = ''
    this.curStyle = ''
    // 初始化文本测量缓存
    this.cacheMeasureText = new Map()
  }

  /**
   * 测量基础文本的尺寸。
   *
   * 使用固定文本测量基线文本的尺寸。
   *
   * @param ctx - 画布上下文
   * @param font - 字体字符串
   * @returns 文本尺寸信息
   */
  public measureBasisWord(
    ctx: CanvasRenderingContext2D,
    font: string
  ): ITextMetrics {
    // 保存当前上下文状态
    ctx.save()
    ctx.font = font
    // 测量基础文本
    const textMetrics = this.measureText(ctx, {
      value: METRICS_BASIS_TEXT
    })
    // 恢复上下文状态
    ctx.restore()
    return textMetrics
  }

  /**
   * 测量单词宽度。
   *
   * 从指定索引开始测量连续的字母组合的宽度。
   *
   * @param ctx - 画布上下文
   * @param elementList - 元素列表
   * @param curIndex - 当前索引
   * @returns 单词测量结果
   */
  public measureWord(
    ctx: CanvasRenderingContext2D,
    elementList: IElement[],
    curIndex: number
  ): IMeasureWordResult {
    // 获取字母正则表达式
    const LETTER_REG = this.draw.getLetterReg()
    let width = 0
    let endElement: IElement = elementList[curIndex]
    let i = curIndex
    // 遍历后续元素，直到遇到非字母或非文本元素
    while (i < elementList.length) {
      const element = elementList[i]
      if (
        (element.type && element.type !== ElementType.TEXT) ||
        !LETTER_REG.test(element.value)
      ) {
        endElement = element
        break
      }
      // 累加元素宽度
      width += this.measureText(ctx, element).width
      i++
    }
    return {
      width,
      endElement
    }
  }

  /**
   * 测量标点符号宽度。
   *
   * @param ctx - 画布上下文
   * @param element - 元素
   * @returns 标点符号宽度，非标点符号返回 0
   */
  public measurePunctuationWidth(
    ctx: CanvasRenderingContext2D,
    element: IElement
  ): number {
    // 如果不是标点符号，返回 0
    if (!element || !PUNCTUATION_LIST.includes(element.value)) return 0
    // 返回标点符号宽度
    return this.measureText(ctx, element).width
  }

  /**
   * 测量文本尺寸。
   *
   * 支持自定义字宽和缓存机制，提高测量性能。
   *
   * @param ctx - 画布上下文
   * @param element - 元素
   * @returns 文本尺寸信息
   */
  public measureText(
    ctx: CanvasRenderingContext2D,
    element: IElement
  ): ITextMetrics {
    // 优先使用自定义字宽设置
    if (element.width) {
      const textMetrics = ctx.measureText(element.value)
      // TextMetrics是类无法解构
      return {
        width: element.width,
        actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent,
        actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent,
        actualBoundingBoxLeft: textMetrics.actualBoundingBoxLeft,
        actualBoundingBoxRight: textMetrics.actualBoundingBoxRight,
        fontBoundingBoxAscent: textMetrics.fontBoundingBoxAscent,
        fontBoundingBoxDescent: textMetrics.fontBoundingBoxDescent
      }
    }
    // 生成缓存键
    const id = `${element.value}${ctx.font}`
    // 尝试从缓存获取
    const cacheTextMetrics = this.cacheMeasureText.get(id)
    if (cacheTextMetrics) {
      return cacheTextMetrics
    }
    // 测量文本并缓存
    const textMetrics = ctx.measureText(element.value)
    this.cacheMeasureText.set(id, textMetrics)
    return textMetrics
  }

  /**
   * 完成文本渲染。
   *
   * 绘制累积的文本并清空缓冲区。
   */
  public complete() {
    // 渲染累积的文本
    this._render()
    // 清空文本缓冲区
    this.text = ''
  }

  /**
   * 记录文本元素。
   *
   * 在兼容模式下立即绘制，否则累积文本待批量渲染。
   *
   * @param ctx - 画布上下文
   * @param element - 行元素
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  public record(
    ctx: CanvasRenderingContext2D,
    element: IRowElement,
    x: number,
    y: number
  ) {
    this.ctx = ctx
    // 兼容模式立即绘制
    if (this.options.renderMode === RenderMode.COMPATIBILITY) {
      this._setCurXY(x, y)
      this.text = element.value
      this.curStyle = element.style
      this.curColor = element.color
      this.complete()
      return
    }
    // 主动完成时重设起始点
    if (!this.text) {
      this._setCurXY(x, y)
    }
    // 样式发生改变时，先完成之前的渲染
    if (
      (this.curStyle && element.style !== this.curStyle) ||
      element.color !== this.curColor
    ) {
      this.complete()
      this._setCurXY(x, y)
    }
    // 累积文本
    this.text += element.value
    this.curStyle = element.style
    this.curColor = element.color
  }

  /**
   * 设置当前坐标。
   *
   * @param x - X 坐标
   * @param y - Y 坐标
   */
  private _setCurXY(x: number, y: number) {
    this.curX = x
    this.curY = y
  }

  /**
   * 渲染文本。
   *
   * 将累积的文本绘制到画布上。
   */
  private _render() {
    // 如果没有文本或坐标无效，直接返回
    if (!this.text || !~this.curX || !~this.curX) return
    // 保存上下文状态
    this.ctx.save()
    // 设置字体
    this.ctx.font = this.curStyle
    // 设置颜色
    this.ctx.fillStyle = this.curColor || this.options.defaultColor
    // 绘制文本
    this.ctx.fillText(this.text, this.curX, this.curY)
    // 恢复上下文状态
    this.ctx.restore()
  }
}
