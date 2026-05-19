import { IElement } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotBase } from './PageRenderSnapshotBase'

/** Table cell background command generation. */
export abstract class PageRenderSnapshotTableBackgroundCommands extends PageRenderSnapshotBase {
  protected pushTableBackgroundCommands(
    commandList: IWorkerPaintCommand[],
    table: IElement | ITableFragmentDescriptor,
    startX: number,
    startY: number,
    alpha: number
  ) {
    const { scale } = this.draw.getRuntime().getOptions()
    const trList = table.trList || []
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (!td.backgroundColor) continue
        commandList.push({
          type: 'fillRect',
          rect: {
            x: Math.round(td.x! * scale + startX),
            y: Math.round(td.y! * scale + startY),
            width: td.width! * scale,
            height: td.height! * scale
          },
          fillStyle: td.backgroundColor,
          alpha
        })
      }
    }
  }
}
