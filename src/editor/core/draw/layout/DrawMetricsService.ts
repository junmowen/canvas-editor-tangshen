import { IPadding } from '../../../interface/Common'
import { IElement } from '../../../interface/Element'
import { IMargin } from '../../../interface/Margin'
import { PaperDirection } from '../../../dataset/enum/Editor'
import { getTableCellContentInset } from '../../table/layout/TableCellContentInset'
import type { Draw } from '../Draw'

/**
 * Draw 度量服务。
 *
 * 负责所有“由配置 + 上下文推导出来”的页面尺寸、边距、字体、行距等计算，
 * 目标是把这些散落在 `Draw` 中的辅助计算收拢为一处。
 */
export class DrawMetricsService {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}
  private elementFontCache = new Map<string, string>()
  private readonly maxElementFontCacheSize = 2000

  public getOriginalWidth(): number {
    const { paperDirection, width, height } = this.draw.getRuntime().getOptions()
    return paperDirection === PaperDirection.VERTICAL ? width : height
  }

  public getOriginalHeight(): number {
    const { paperDirection, width, height } = this.draw.getRuntime().getOptions()
    return paperDirection === PaperDirection.VERTICAL ? height : width
  }

  public getWidth(): number {
    return Math.floor(this.getOriginalWidth() * this.draw.getRuntime().getOptions().scale)
  }

  public getHeight(): number {
    return Math.floor(this.getOriginalHeight() * this.draw.getRuntime().getOptions().scale)
  }

  public getMainHeight(): number {
    return this.getHeight() - this.getMainOuterHeight()
  }

  public getMainOuterHeight(): number {
    const margins = this.getMargins()
    const headerExtraHeight = this.draw.getComponents().header.getExtraHeight()
    const footerExtraHeight = this.draw.getComponents().footer.getExtraHeight()
    return margins[0] + margins[2] + headerExtraHeight + footerExtraHeight + this.getPageNumberExtraHeight()
  }

  /** 获取页码绘制区域超出底边距的额外占高，避免正文和表格 fragment 压到页码上。 */
  private getPageNumberExtraHeight(): number {
    const options = this.draw.getRuntime().getOptions()
    if (options.pageNumber.disabled) {
      return 0
    }
    const margins = this.getMargins()
    const pageNumberTop =
      this.getHeight() -
      this.getPageNumberBottom() -
      options.pageNumber.size * options.scale -
      6 * options.scale
    const mainBottom = this.getHeight() - margins[2]
    return Math.max(0, mainBottom - pageNumberTop)
  }

  public getInnerWidth(): number {
    const width = this.getWidth()
    const margins = this.getMargins()
    return width - margins[1] - margins[3]
  }

  public getOriginalInnerWidth(): number {
    const width = this.getOriginalWidth()
    const margins = this.getOriginalMargins()
    return width - margins[1] - margins[3]
  }

  public getContextInnerWidth(): number {
    const positionContext = this.draw.getCoordinate().getPositionContext()
    if (positionContext.isTable) {
      const tableCell = this.draw.getTargetResolver().resolveActiveLogicalTableTd({
        positionContext
      })
      const table = tableCell?.table
      const td = tableCell?.td
      if (!table || !td) return this.getOriginalInnerWidth()
      const tdPadding = this.getTdPadding()
      const contentInset = getTableCellContentInset(table, td)
      return Math.max(
        0,
        td!.width! -
          tdPadding[1] -
          tdPadding[3] -
          contentInset.left -
          contentInset.right
      )
    }
    return this.getOriginalInnerWidth()
  }

  public getMargins(): IMargin {
    return <IMargin>this.getOriginalMargins().map(
      m => m * this.draw.getRuntime().getOptions().scale
    )
  }

  public getOriginalMargins(): number[] {
    const { margins, paperDirection } = this.draw.getRuntime().getOptions()
    return paperDirection === PaperDirection.VERTICAL
      ? margins
      : [margins[1], margins[2], margins[3], margins[0]]
  }

  public getPageGap(): number {
    return this.draw.getRuntime().getOptions().pageGap *
      this.draw.getRuntime().getOptions().scale
  }

  public getOriginalPageGap(): number {
    return this.draw.getRuntime().getOptions().pageGap
  }

  public getPageNumberBottom(): number {
    const {
      pageNumber: { bottom },
      scale
    } = this.draw.getRuntime().getOptions()
    return bottom * scale
  }

  public getMarginIndicatorSize(): number {
    return this.draw.getRuntime().getOptions().marginIndicatorSize *
      this.draw.getRuntime().getOptions().scale
  }

  public getDefaultBasicRowMarginHeight(): number {
    return (
      this.draw.getRuntime().getOptions().defaultBasicRowMarginHeight *
      this.draw.getRuntime().getOptions().scale
    )
  }

  public getHighlightMarginHeight(): number {
    return this.draw.getRuntime().getOptions().highlightMarginHeight *
      this.draw.getRuntime().getOptions().scale
  }

  public getTdPadding(): IPadding {
    const {
      table: { tdPadding },
      scale
    } = this.draw.getRuntime().getOptions()
    return <IPadding>tdPadding.map(m => m * scale)
  }

  public getElementFont(el: IElement, scale = 1): string {
    const { defaultSize, defaultFont } = this.draw.getRuntime().getOptions()
    const font = el.font || defaultFont
    const size = el.actualSize || el.size || defaultSize
    const key = `${el.italic ? 1 : 0}|${el.bold ? 1 : 0}|${size}|${scale}|${font}`
    const cachedFont = this.elementFontCache.get(key)
    if (cachedFont) {
      return cachedFont
    }
    const nextFont = `${el.italic ? 'italic ' : ''}${el.bold ? 'bold ' : ''}${
      size * scale
    }px ${font}`
    this.elementFontCache.set(key, nextFont)
    if (this.elementFontCache.size > this.maxElementFontCacheSize) {
      this.elementFontCache.delete(this.elementFontCache.keys().next().value)
    }
    return nextFont
  }

  public getElementSize(el: IElement) {
    return el.actualSize || el.size || this.draw.getRuntime().getOptions().defaultSize
  }

  public getElementRowMargin(el: IElement) {
    const { defaultBasicRowMarginHeight, defaultRowMargin, scale } =
      this.draw.getRuntime().getOptions()
    return defaultBasicRowMarginHeight * (el.rowMargin ?? defaultRowMargin) * scale
  }
}
