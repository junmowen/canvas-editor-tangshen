
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElementPosition } from '../../../interface/Element'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotTextStyleCommands } from './PageRenderSnapshotTextStyleCommands'

/** Row highlight and group background command generation. */
export abstract class PageRenderSnapshotRowBackgroundCommands extends PageRenderSnapshotTextStyleCommands {
  /** 写入行分组commands，追加后续渲染需要的命令数据。 */
  protected pushRowGroupCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    rowPositionList: IElementPosition[],
    alpha: number
  ) {
    const {
      group: { backgroundColor, opacity, activeBackgroundColor, activeOpacity }
    } = this.draw.getRuntime().getOptions()
    const activeGroupIds = this.getActiveGroupIds()
    const groupRectMap = new Map<
      string,
      { groupId: string; x: number; y: number; width: number; height: number }
    >()
    for (let i = 0; i < row.elementList.length; i++) {
      const element = row.elementList[i]
      const rowPosition = rowPositionList[i]
      if (!element.groupIds?.length || !rowPosition) continue
      const {
        coordinate: {
          leftTop: [x, y],
          leftBottom: [, bottomY]
        }
      } = rowPosition
      const height = row.height || bottomY - y
      for (const groupId of element.groupIds) {
        const rect = groupRectMap.get(groupId)
        if (!rect) {
          groupRectMap.set(groupId, {
            groupId,
            x,
            y,
            width: element.metrics.width,
            height
          })
        } else {
          rect.width += element.metrics.width
          rect.height = Math.max(rect.height, height)
        }
      }
    }
    groupRectMap.forEach(rect => {
      const isActiveGroup = activeGroupIds.includes(rect.groupId)
      commandList.push({
        type: 'fillRect',
        rect,
        fillStyle: isActiveGroup ? activeBackgroundColor : backgroundColor,
        alpha: (isActiveGroup ? activeOpacity : opacity) * alpha
      })
    })
  }

  /** 写入行highlightcommands，追加后续渲染需要的命令数据。 */
  protected pushRowHighlightCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    rowPositionList: IElementPosition[],
    alpha: number
  ) {
    const marginHeight = this.draw.getDefaultBasicRowMarginHeight()
    const highlightMarginHeight =
      this.draw.getServices().metricsService.getHighlightMarginHeight()
    const { highlightAlpha } = this.draw.getRuntime().getOptions()
    for (let i = 0; i < row.elementList.length; i++) {
      const element = row.elementList[i]
      const highlight = element.highlight
      const rowPosition = rowPositionList[i]
      if (!highlight || !rowPosition) continue
      const {
        coordinate: {
          leftTop: [x, y],
          rightTop: [rightX],
          leftBottom: [, bottomY]
        }
      } = rowPosition
      const offsetX = element.left || 0
      const elementWidth = element.metrics?.width || rightX - x
      const rowHeight = row.height || bottomY - y
      commandList.push({
        type: 'fillRect',
        rect: {
          x: x - offsetX,
          y: y + marginHeight - highlightMarginHeight,
          width: elementWidth + offsetX,
          height: rowHeight - 2 * marginHeight + 2 * highlightMarginHeight
        },
        fillStyle: highlight,
        alpha: highlightAlpha * alpha
      })
    }
  }
}
