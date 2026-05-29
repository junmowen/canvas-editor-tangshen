
import { TableBorder, TdBorder } from '../../../dataset/enum/table/Table'
import { IElement } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import {
  IWorkerPaintCommand,
  IWorkerStrokeSegment
} from './WorkerRenderProtocol'
import { PageRenderSnapshotTableCellBorderCommands } from './PageRenderSnapshotTableCellBorderCommands'

/** Table external and internal border traversal. */
export abstract class PageRenderSnapshotTableBorderCommands extends PageRenderSnapshotTableCellBorderCommands {
  /** 写入表格边框commands，追加后续渲染需要的命令数据。 */
  protected pushTableBorderCommands(
    commandList: IWorkerPaintCommand[],
    table: IElement | ITableFragmentDescriptor,
    startX: number,
    startY: number,
    alpha: number
  ) {
    const { colgroup, trList } = table
    if (!colgroup || !trList) return
    const {
      scale,
      table: { defaultBorderColor }
    } = this.draw.getRuntime().getOptions()
    const borderType = table.borderType || TableBorder.ALL
    const rawBorderWidth = table.borderWidth || 1
    const rawExternalBorderWidth = table.borderExternalWidth
    const borderWidth = rawBorderWidth * scale
    const borderColor = table.borderColor || defaultBorderColor
    const borderExternalWidth = rawExternalBorderWidth
    const tableWidth = table.width! * scale
    const tableHeight = table.height! * scale
    const isEmptyBorderType = borderType === TableBorder.EMPTY
    const isExternalBorderType = borderType === TableBorder.EXTERNAL
    const isInternalBorderType = borderType === TableBorder.INTERNAL
    const lineDash = borderType === TableBorder.DASH ? [3, 3] : undefined
    const hasCustomExternalBorder =
      Boolean(rawExternalBorderWidth) && rawExternalBorderWidth !== rawBorderWidth
    if (!isEmptyBorderType && !isInternalBorderType) {
      const externalLineWidth = borderExternalWidth
        ? borderExternalWidth * scale
        : borderWidth
      commandList.push({
        type: 'strokePath',
        segmentList: isExternalBorderType
          ? [
              {
                from: [Math.round(startX), Math.round(startY)],
                to: [Math.round(startX + tableWidth), Math.round(startY)]
              },
              {
                from: [Math.round(startX + tableWidth), Math.round(startY)],
                to: [
                  Math.round(startX + tableWidth),
                  Math.round(startY + tableHeight)
                ]
              },
              {
                from: [
                  Math.round(startX + tableWidth),
                  Math.round(startY + tableHeight)
                ],
                to: [Math.round(startX), Math.round(startY + tableHeight)]
              },
              {
                from: [Math.round(startX), Math.round(startY + tableHeight)],
                to: [Math.round(startX), Math.round(startY)]
              }
            ]
          : [
              {
                from: [Math.round(startX), Math.round(startY + tableHeight)],
                to: [Math.round(startX), Math.round(startY)]
              },
              {
                from: [Math.round(startX), Math.round(startY)],
                to: [Math.round(startX + tableWidth), Math.round(startY)]
              }
            ],
        strokeStyle: borderColor,
        lineWidth: externalLineWidth,
        alpha,
        translateX: 0.5,
        translateY: 0.5,
        lineDash
      })
    }
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        this.pushTableSlashCommands(
          commandList,
          td,
          startX,
          startY,
          borderColor,
          borderWidth,
          alpha,
          lineDash
        )
        if (
          !td.borderTypes?.length &&
          (isEmptyBorderType || isExternalBorderType)
        ) {
          continue
        }
        const width = td.width! * scale
        const height = td.height! * scale
        const x = Math.round(td.x! * scale + startX + width)
        const y = Math.round(td.y! * scale + startY)
        const segmentList: IWorkerStrokeSegment[] = []
        const externalSegmentList: IWorkerStrokeSegment[] = []
        if (
          'logicalTableId' in table &&
          t === 0 &&
          !isEmptyBorderType &&
          !isInternalBorderType &&
          !td.borderTypes?.includes(TdBorder.TOP)
        ) {
          segmentList.push({
            from: [x - width, y],
            to: [x, y]
          })
        }
        if (!isEmptyBorderType && !isExternalBorderType) {
          if (
            !isInternalBorderType ||
            td.colIndex! + td.colspan < colgroup.length
          ) {
            const segment = {
              from: [x, y],
              to: [x, y + height]
            } as IWorkerStrokeSegment
            if (
              hasCustomExternalBorder &&
              td.colIndex! + td.colspan === colgroup.length
            ) {
              externalSegmentList.push(segment)
            } else {
              segmentList.push(segment)
            }
          }
          if (
            !isInternalBorderType ||
            td.rowIndex! + td.rowspan < trList.length
          ) {
            const segment = {
              from: [x, y + height],
              to: [x - width, y + height]
            } as IWorkerStrokeSegment
            if (
              hasCustomExternalBorder &&
              td.rowIndex! + td.rowspan === trList.length
            ) {
              externalSegmentList.push(segment)
            } else {
              segmentList.push(segment)
            }
          }
        }
        if (segmentList.length) {
          commandList.push({
            type: 'strokePath',
            segmentList,
            strokeStyle: borderColor,
            lineWidth: borderWidth,
            alpha,
            translateX: 0.5,
            translateY: 0.5,
            lineDash
          })
        }
        if (externalSegmentList.length) {
          commandList.push({
            type: 'strokePath',
            segmentList: externalSegmentList,
            strokeStyle: borderColor,
            lineWidth: (rawExternalBorderWidth || rawBorderWidth) * scale,
            alpha,
            translateX: 0.5,
            translateY: 0.5,
            lineDash
          })
        }
      }
    }
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        this.pushExplicitTdBorderCommands(
          commandList,
          td,
          table,
          startX,
          startY,
          alpha
        )
      }
    }
  }

}
