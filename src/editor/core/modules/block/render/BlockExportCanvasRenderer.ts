import { BlockType } from '../../../../dataset/enum/Block'
import { IDrawRowPayload } from '../../../../interface/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 导出时不挂载 DOM/SVG block host，改为在 Canvas 中固化稳定内容。 */
export class BlockExportCanvasRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    element: RowElement,
    x: number,
    y: number
  ) {
    const metrics = element.metrics
    const width = Math.max(1, metrics?.width || element.width || 1)
    const height = Math.max(1, metrics?.height || element.height || 1)
    const svgRasterImage = element.block?.svgBlock?.rasterImage
    if (element.block?.type === BlockType.SVG && svgRasterImage?.complete) {
      ctx.drawImage(svgRasterImage, x, y, width, height)
      return
    }
    const placeholderText = this.getPlaceholderText(element)
    ctx.save()
    ctx.fillStyle = '#f7f7f7'
    ctx.strokeStyle = '#d0d0d0'
    ctx.lineWidth = 1
    ctx.fillRect(x, y, width, height)
    ctx.strokeRect(
      x + 0.5,
      y + 0.5,
      Math.max(0, width - 1),
      Math.max(0, height - 1)
    )
    ctx.fillStyle = '#666666'
    ctx.font = '12px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(placeholderText, x + 8, y + height / 2)
    ctx.restore()
  }

  private getPlaceholderText(element: RowElement): string {
    if (element.block?.type === BlockType.HTML) {
      const text =
        element.block.htmlBlock?.text ||
        this.extractTextFromHtml(element.block.htmlBlock?.html || '')
      return text ? text.slice(0, 80) : 'HTML block'
    }
    return 'Embedded block'
  }

  private extractTextFromHtml(html: string): string {
    if (!html) return ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  }
}
