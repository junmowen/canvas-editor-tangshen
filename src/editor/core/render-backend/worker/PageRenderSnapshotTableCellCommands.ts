
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { IWorkerPaintCommand } from './WorkerRenderProtocol'
import { PageRenderSnapshotTableBorderCommands } from './PageRenderSnapshotTableBorderCommands'

/** Table fragment guards and recursive table cell text commands. */
export abstract class PageRenderSnapshotTableCellCommands extends PageRenderSnapshotTableBorderCommands {
  protected abstract buildRowTextCommands(
    commandList: IWorkerPaintCommand[],
    rowList: IDrawPagePayload['rowList'],
    positionList: IElementPosition[],
    alpha: number,
    options?: {
      drawLineBreak?: boolean
    }
  ): void

  protected pushFragmentTopBorderCommand(
    commandList: IWorkerPaintCommand[],
    table: ITableFragmentDescriptor,
    startX: number,
    startY: number,
    alpha: number
  ) {
    const {
      scale,
      table: { defaultBorderColor }
    } = this.draw.getRuntime().getOptions()
    const borderHeight = Math.max(1, Math.ceil((table.borderWidth || 1) * scale))
    commandList.push({
      type: 'fillRect',
      rect: {
        x: startX,
        y: startY,
        width: table.width * scale,
        height: borderHeight
      },
      fillStyle: table.borderColor || defaultBorderColor,
      alpha
    })
  }

  /** 输出单元格递归文本内容。 */
  protected pushTableCellTextCommands(
    commandList: IWorkerPaintCommand[],
    table: IElement | ITableFragmentDescriptor,
    alpha: number
  ) {
    const trList = table.trList || []
    const snapshotAccessor = this.draw.getTableLayoutSnapshotAccessor()
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (!td.rowList?.length || !td.positionList?.length) continue
        const tableId = 'tableId' in table ? table.tableId : undefined
        const cellBounds =
          tableId && tr.id && td.id
            ? snapshotAccessor
                .getFragmentCellBounds(tableId)
                .find(
                  bounds =>
                    bounds.fragmentTrId === tr.id &&
                    bounds.fragmentTdId === td.id
                )
            : null
        if (cellBounds) {
          commandList.push({
            type: 'pushClipRect',
            rect: {
              x: cellBounds.x,
              y: cellBounds.y,
              width: cellBounds.width,
              height: cellBounds.height
            }
          })
        }
        this.buildRowTextCommands(
          commandList,
          td.rowList as IDrawPagePayload['rowList'],
          td.positionList,
          alpha
        )
        if (cellBounds) {
          commandList.push({
            type: 'popState'
          })
        }
      }
    }
  }

  /** 递归单元格首行补画 fragment 顶边，匹配 RowTableRenderHelper 的视觉安全网。 */
  protected pushTableFragmentCellTopBorderCommands(
    commandList: IWorkerPaintCommand[],
    row: IDrawPagePayload['rowList'][number],
    rowPositionList: IElementPosition[],
    alpha: number
  ) {
    const firstPosition = rowPositionList[0]
    if (!firstPosition || firstPosition.rowNo !== 0) {
      return
    }
    const tableId = row.elementList[0]?.tableId
    const trId = row.elementList[0]?.trId
    const tdId = row.elementList[0]?.tdId
    if (!tableId || !trId || !tdId) {
      return
    }
    const snapshotAccessor = this.draw.getTableLayoutSnapshotAccessor()
    const activeSlice = snapshotAccessor.resolveSliceByFragmentContext({
      tableId,
      trId,
      tdId
    })
    if (!activeSlice) {
      return
    }
    const cellBounds = snapshotAccessor
      .getFragmentCellBounds(activeSlice.fragmentTableId)
      .find(
        bounds =>
          bounds.fragmentTrId === activeSlice.fragmentTrId &&
          bounds.fragmentTdId === activeSlice.fragmentTdId
      )
    if (!cellBounds) {
      return
    }
    const tableElement =
      this.draw.getOriginalElementList()[activeSlice.logicalTableIndex]
    const {
      scale,
      table: { defaultBorderColor }
    } = this.draw.getRuntime().getOptions()
    const borderWidth = (tableElement?.borderWidth || 1) * scale
    commandList.push({
      type: 'fillRect',
      rect: {
        x: cellBounds.x,
        y: cellBounds.y,
        width: cellBounds.width,
        height: Math.max(1, Math.ceil(borderWidth))
      },
      fillStyle: tableElement?.borderColor || defaultBorderColor,
      alpha
    })
  }
}
