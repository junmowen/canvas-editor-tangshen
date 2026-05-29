
import { IRowElement } from '../../../interface/Row'
import {
  resolveWorkerSnapshotInlineTextOffsetY,
  resolveWorkerSnapshotTextFillStyle,
  shouldDrawWorkerSnapshotStandaloneText
} from '../../modules/richtext/render/WorkerSnapshotTextStylePolicy'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotTableCommands } from './PageRenderSnapshotTableCommands'

/** Text style resolution and accumulated fillText flushing. */
export abstract class PageRenderSnapshotTextStyleCommands extends PageRenderSnapshotTableCommands {
  protected resolveTextPaintStyle(element: IRowElement): {
    /** 字体声明，用于设置 Canvas 文本绘制样式。 */
    font: string
    /** 填充样式，用于设置 Canvas 填充颜色或图案。 */
    fillStyle: string
  } {
    const options = this.draw.getRuntime().getOptions()
    return {
      font: element.style || this.draw.getElementFont(element),
      fillStyle: resolveWorkerSnapshotTextFillStyle({
        element,
        defaultHyperlinkColor: options.defaultHyperlinkColor,
        defaultColor: options.defaultColor
      })
    }
  }

  /** 上标 / 下标使用独立基线偏移，匹配主线程粒子绘制。 */
  protected resolveInlineTextOffsetY(element: IRowElement): number {
    return resolveWorkerSnapshotInlineTextOffsetY(element)
  }

  /** 不能参与连续文本合并的元素按自身 position 独立绘制。 */
  protected shouldDrawStandaloneText(element: IRowElement): boolean {
    return shouldDrawWorkerSnapshotStandaloneText(element)
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
