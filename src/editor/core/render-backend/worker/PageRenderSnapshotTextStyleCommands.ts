
import { ElementType } from '../../../dataset/enum/Element'
import { RowFlex } from '../../../dataset/enum/Row'
import { IRowElement } from '../../../interface/Row'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotTableCommands } from './PageRenderSnapshotTableCommands'

/** Text style resolution and accumulated fillText flushing. */
export abstract class PageRenderSnapshotTextStyleCommands extends PageRenderSnapshotTableCommands {
  protected resolveTextPaintStyle(element: IRowElement): {
    font: string
    fillStyle: string
  } {
    const options = this.draw.getRuntime().getOptions()
    return {
      font: element.style || this.draw.getElementFont(element),
      fillStyle:
        element.color ||
        (element.type === ElementType.HYPERLINK
          ? options.defaultHyperlinkColor
          : options.defaultColor)
    }
  }

  /** 上标 / 下标使用独立基线偏移，匹配主线程粒子绘制。 */
  protected resolveInlineTextOffsetY(element: IRowElement): number {
    if (element.type === ElementType.SUPERSCRIPT) {
      return -element.metrics.height / 2
    }
    if (element.type === ElementType.SUBSCRIPT) {
      return element.metrics.height / 2
    }
    return 0
  }

  /** 不能参与连续文本合并的元素按自身 position 独立绘制。 */
  protected shouldDrawStandaloneText(element: IRowElement): boolean {
    return Boolean(
      element.width ||
        element.letterSpacing ||
        element.rowFlex === RowFlex.ALIGNMENT ||
        element.rowFlex === RowFlex.JUSTIFY ||
        element.type === ElementType.HYPERLINK ||
        element.type === ElementType.SUPERSCRIPT ||
        element.type === ElementType.SUBSCRIPT
    )
  }

  protected flushTextCommand(
    commandList: IWorkerPaintCommand[],
    text: string,
    x: number,
    y: number,
    font: string,
    fillStyle: string,
    alpha = 1
  ) {
    if (!text) return
    commandList.push({
      type: 'fillText',
      text,
      x,
      y,
      font,
      fillStyle,
      alpha
    })
  }
}
