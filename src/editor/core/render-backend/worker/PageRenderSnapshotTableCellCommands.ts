
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { TableBorder } from '../../../dataset/enum/table/Table'
import { getTableCellContentInset } from '../../modules/table/layout/TableCellContentInset'
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
      /** 绘制行break开关，用于控制当前流程的判断分支。 */
      drawLineBreak?: boolean
    }
  ): void

  /** 写入片段上侧边框command，追加后续渲染需要的命令数据。 */
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
    if (!this.shouldDrawFragmentTableTopBorder(table.borderType)) {
      return
    }
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
    const targetResolver = this.draw.getTargetResolver()
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (!td.rowList?.length || !td.positionList?.length) continue
        const tableId = 'tableId' in table ? table.tableId : undefined
        const cellBounds =
          tableId && tr.id && td.id
            ? targetResolver
                .getFragmentCellBounds(tableId)
                .find(
                  bounds =>
                    bounds.fragmentTrId === tr.id &&
                    bounds.fragmentTdId === td.id
                )
            : null
        if (cellBounds) {
          const clipRect = this.resolveTableCellTextClipRect({
            table,
            td,
            bounds: cellBounds
          })
          commandList.push({
            type: 'pushClipRect',
            rect: clipRect
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
    const targetResolver = this.draw.getTargetResolver()
    const activeSlice = targetResolver.resolveTableSliceByFragmentContext({
      tableId,
      trId,
      tdId
    })
    if (!activeSlice) {
      return
    }
    const cellBounds = targetResolver
      .getFragmentCellBounds(activeSlice.fragmentTableId)
      .find(
        bounds =>
          bounds.fragmentTrId === activeSlice.fragmentTrId &&
          bounds.fragmentTdId === activeSlice.fragmentTdId
      )
    if (!cellBounds) {
      return
    }
    const tableElement = this.draw
      .getTargetResolver()
      .resolveOriginalTableByIndex(activeSlice.logicalTableIndex)?.element
    const isLaterFragment =
      activeSlice.fragmentTableId !== activeSlice.logicalTableId
    if (
      !isLaterFragment ||
      !this.shouldDrawFragmentCellTopBorder(tableElement?.borderType)
    ) {
      return
    }
    const {
      scale,
      table: { defaultBorderColor }
    } = this.draw.getRuntime().getOptions()
    const borderWidth = Math.max(1, (tableElement?.borderWidth || 1) * scale)
    const y = cellBounds.y + borderWidth / 2
    commandList.push({
      type: 'strokePath',
      segmentList: [
        {
          from: [cellBounds.x, y],
          to: [cellBounds.x + cellBounds.width, y]
        }
      ],
      lineWidth: borderWidth,
      strokeStyle: tableElement?.borderColor || defaultBorderColor,
      alpha,
      lineDash:
        tableElement?.borderType === TableBorder.DASH ? [3, 3] : undefined
    })
  }

  /** 表格 fragment 自身顶边只补全边框，避免 EMPTY/DASH/内外边框类型变成额外实线。 */
  private shouldDrawFragmentTableTopBorder(borderType = TableBorder.ALL) {
    return (
      borderType !== TableBorder.EMPTY &&
      borderType !== TableBorder.DASH &&
      borderType !== TableBorder.INTERNAL &&
      borderType !== TableBorder.EXTERNAL
    )
  }

  /** 单元格首行顶边匹配主 Canvas 后续 fragment 补线规则。 */
  private shouldDrawFragmentCellTopBorder(borderType = TableBorder.ALL) {
    return (
      borderType !== TableBorder.EMPTY &&
      borderType !== TableBorder.INTERNAL &&
      borderType !== TableBorder.EXTERNAL
    )
  }

  /** worker 单元格文本裁剪需要和主 Canvas 一样扣除单元格 padding 与边框 inset。 */
  private resolveTableCellTextClipRect(payload: {
    table: IElement | ITableFragmentDescriptor
    td: NonNullable<(IElement | ITableFragmentDescriptor)['trList']>[number]['tdList'][number]
    bounds: { x: number; y: number; width: number; height: number }
  }) {
    const {
      scale,
      table: { tdPadding }
    } = this.draw.getRuntime().getOptions()
    const contentInset = getTableCellContentInset(payload.table, payload.td)
    const left = (tdPadding[3] + contentInset.left) * scale
    const right = (tdPadding[1] + contentInset.right) * scale
    const top = (tdPadding[0] + contentInset.top) * scale
    const bottom = (tdPadding[2] + contentInset.bottom) * scale
    return {
      x: payload.bounds.x + left,
      y: payload.bounds.y + top,
      width: Math.max(0, payload.bounds.width - left - right),
      height: Math.max(0, payload.bounds.height - top - bottom)
    }
  }
}
