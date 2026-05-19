
import { IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotInlineMarkerCommands } from './PageRenderSnapshotInlineMarkerCommands'

/** Inline media commands for normal images and LaTeX SVG paths. */
export abstract class PageRenderSnapshotInlineMediaCommands extends PageRenderSnapshotInlineMarkerCommands {
  protected pushImageCommand(
    commandList: IWorkerPaintCommand[],
    element: IRowElement,
    rowPosition: IElementPosition,
    alpha: number
  ) {
    const { scale } = this.draw.getRuntime().getOptions()
    commandList.push({
      type: 'drawImage',
      src: element.value,
      rect: {
        x: rowPosition.coordinate.leftTop[0],
        y: rowPosition.coordinate.leftTop[1] + rowPosition.ascent,
        width: element.width! * scale,
        height: element.height! * scale
      },
      alpha
    })
  }

  /** 输出 LaTeX SVG 绘制命令。 */
  protected pushLaTexCommand(
    commandList: IWorkerPaintCommand[],
    element: IRowElement,
    rowPosition: IElementPosition,
    alpha: number
  ) {
    const { scale } = this.draw.getRuntime().getOptions()
    const path = this.extractLaTexSvgPath(element.laTexSVG!)
    commandList.push({
      type: 'strokeSvgPath',
      path,
      strokeStyle: 'black',
      lineWidth: scale,
      alpha,
      translateX: rowPosition.coordinate.leftTop[0],
      translateY: rowPosition.coordinate.leftTop[1] + rowPosition.ascent,
      scaleX: scale,
      scaleY: scale
    })
  }

  /** 从 LaTeX 生成的 SVG data URL 中提取 path d。 */
  protected extractLaTexSvgPath(src: string): string {
    const prefix = 'data:image/svg+xml;base64,'
    const svg = src.startsWith(prefix) ? atob(src.slice(prefix.length)) : src
    const match = svg.match(/<path[^>]*\sd="([^"]+)"/)
    if (!match?.[1]) {
      throw new Error('worker snapshot does not support latex path')
    }
    return match[1]
  }
}
