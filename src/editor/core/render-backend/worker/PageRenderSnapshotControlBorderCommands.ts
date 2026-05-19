
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElementPosition } from '../../../interface/Element'
import { IRowElement } from '../../../interface/Row'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotTextDecorationCommands } from './PageRenderSnapshotTextDecorationCommands'

/** Text-control border accumulation across inline fragments. */
export abstract class PageRenderSnapshotControlBorderCommands extends PageRenderSnapshotTextDecorationCommands {
  protected recordControlBorderCommand(
    commandList: IWorkerPaintCommand[],
    borderState: { x: number; y: number; width: number; height: number },
    row: IDrawPagePayload['rowList'][number],
    element: IRowElement,
    preElement: IRowElement | undefined,
    rowPosition: IElementPosition | undefined,
    alpha: number
  ) {
    if (!element.control?.border || !rowPosition) {
      if (preElement?.control?.border) {
        this.flushControlBorderCommand(commandList, borderState, alpha)
      }
      return
    }
    if (
      preElement?.control?.border &&
      preElement.controlId !== element.controlId
    ) {
      this.flushControlBorderCommand(commandList, borderState, alpha)
    }
    const rowMargin =
      this.draw.getServices().metricsService.getElementRowMargin(element)
    const x = rowPosition.coordinate.leftTop[0]
    const y = rowPosition.coordinate.leftTop[1] + rowMargin
    const width = element.metrics.width
    const height = row.height - 2 * rowMargin
    if (!borderState.width) {
      borderState.x = x
      borderState.y = y
      borderState.height = height
    }
    borderState.width += width
  }

  /** 输出并清空控件边框矩形。 */
  protected flushControlBorderCommand(
    commandList: IWorkerPaintCommand[],
    borderState: { x: number; y: number; width: number; height: number },
    alpha: number
  ) {
    if (!borderState.width) return
    const {
      scale,
      control: { borderWidth, borderColor }
    } = this.draw.getRuntime().getOptions()
    commandList.push({
      type: 'strokeRect',
      rect: {
        x: borderState.x,
        y: borderState.y,
        width: borderState.width,
        height: borderState.height
      },
      strokeStyle: borderColor,
      lineWidth: borderWidth * scale,
      alpha,
      translateY: 1 * scale
    })
    borderState.x = 0
    borderState.y = 0
    borderState.width = 0
    borderState.height = 0
  }
}
