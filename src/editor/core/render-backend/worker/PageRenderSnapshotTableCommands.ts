
import { IElement, IElementPosition } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotTableCellCommands } from './PageRenderSnapshotTableCellCommands'

/** Table command entry point used by inline row rendering. */
export abstract class PageRenderSnapshotTableCommands extends PageRenderSnapshotTableCellCommands {
  /** 写入表格commands，追加后续渲染需要的命令数据。 */
  protected pushTableCommands(
    commandList: IWorkerPaintCommand[],
    table: IElement | ITableFragmentDescriptor,
    rowPosition: IElementPosition,
    alpha: number
  ) {
    const [startX, startY] = rowPosition.coordinate.leftTop
    this.pushTableBackgroundCommands(commandList, table, startX, startY, alpha)
    this.pushTableBorderCommands(commandList, table, startX, startY, alpha)
    if ('logicalTableId' in table) {
      this.pushFragmentTopBorderCommand(commandList, table, startX, startY, alpha)
    }
    this.pushTableCellTextCommands(commandList, table, alpha)
  }
}
