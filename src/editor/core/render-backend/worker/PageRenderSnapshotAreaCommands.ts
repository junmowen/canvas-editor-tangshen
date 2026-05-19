
import { defaultPlaceholderOption } from '../../../dataset/constant/Placeholder'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotPageBaseCommands } from './PageRenderSnapshotPageBaseCommands'

/** Static area background, border and placeholder commands. */
export abstract class PageRenderSnapshotAreaCommands extends PageRenderSnapshotPageBaseCommands {
  protected buildAreaCommands(pageNo: number): IWorkerPaintCommand[] {
    const commandList: IWorkerPaintCommand[] = []
    const margins = this.draw.getMargins()
    const width = this.draw.getInnerWidth()
    const areaInfo = this.draw.getArea().getAreaInfo()
    areaInfo.forEach(({ area, positionList }) => {
      if (
        area?.hide ||
        (!area?.backgroundColor && !area?.borderColor && !area?.placeholder)
      ) {
        return
      }
      const pagePositionList = positionList.filter(p => p.pageNo === pageNo)
      if (!pagePositionList.length) return
      const firstPosition = pagePositionList[0]
      const lastPosition = pagePositionList[pagePositionList.length - 1]
      const x = margins[3]
      const y = Math.ceil(firstPosition.coordinate.leftTop[1])
      const height = Math.ceil(lastPosition.coordinate.rightBottom[1] - y)
      if (area.backgroundColor) {
        commandList.push({
          type: 'fillRect',
          rect: {
            x,
            y,
            width,
            height
          },
          fillStyle: area.backgroundColor,
          translateX: 0.5,
          translateY: 0.5
        })
      }
      if (area.borderColor) {
        commandList.push({
          type: 'strokeRect',
          rect: {
            x,
            y,
            width,
            height
          },
          strokeStyle: area.borderColor,
          lineWidth: 1,
          translateX: 0.5,
          translateY: 0.5
        })
      }
      if (area.placeholder && positionList.length <= 1) {
        commandList.push(
          ...this.buildPlaceholderTextCommands(
            {
              ...defaultPlaceholderOption,
              ...area.placeholder
            },
            firstPosition.coordinate.leftTop[1]
          )
        )
      }
    })
    return commandList
  }
}
