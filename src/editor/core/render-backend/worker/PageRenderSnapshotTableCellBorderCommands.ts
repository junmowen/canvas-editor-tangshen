import { TdBorder, TdSlash } from '../../../dataset/enum/table/Table'
import { IElement } from '../../../interface/Element'
import { ITd } from '../../../interface/table/Td'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import {
  IWorkerPaintCommand,
  IWorkerStrokeSegment
} from './WorkerRenderProtocol'
import { PageRenderSnapshotTableBackgroundCommands } from './PageRenderSnapshotTableBackgroundCommands'

/** Per-cell table border commands such as slashes and explicit td borders. */
export abstract class PageRenderSnapshotTableCellBorderCommands extends PageRenderSnapshotTableBackgroundCommands {
  /** 写入表格slashcommands，追加后续渲染需要的命令数据。 */
  protected pushTableSlashCommands(
    commandList: IWorkerPaintCommand[],
    td: ITd,
    startX: number,
    startY: number,
    borderColor: string,
    borderWidth: number,
    alpha: number,
    lineDash?: number[]
  ) {
    if (!td.slashTypes?.length) return
    const { scale } = this.draw.getRuntime().getOptions()
    const width = td.width! * scale
    const height = td.height! * scale
    const x = Math.round(td.x! * scale + startX)
    const y = Math.round(td.y! * scale + startY)
    const segmentList: IWorkerStrokeSegment[] = []
    if (td.slashTypes.includes(TdSlash.FORWARD)) {
      segmentList.push({
        from: [x + width, y],
        to: [x, y + height]
      })
    }
    if (td.slashTypes.includes(TdSlash.BACK)) {
      segmentList.push({
        from: [x, y],
        to: [x + width, y + height]
      })
    }
    if (!segmentList.length) return
    commandList.push({
      type: 'strokePath',
      segmentList,
      strokeStyle: borderColor,
      lineWidth: borderWidth,
      alpha,
      lineDash
    })
  }

  /** 写入explicittd边框commands，追加后续渲染需要的命令数据。 */
  protected pushExplicitTdBorderCommands(
    commandList: IWorkerPaintCommand[],
    td: ITd,
    table: IElement | ITableFragmentDescriptor,
    startX: number,
    startY: number,
    alpha: number
  ) {
    if (!td.borderTypes?.length) return
    const {
      scale,
      table: { defaultBorderColor }
    } = this.draw.getRuntime().getOptions()
    const width = td.width! * scale
    const height = td.height! * scale
    const x = Math.round(td.x! * scale + startX + width)
    const y = Math.round(td.y! * scale + startY)
    const segmentList: IWorkerStrokeSegment[] = []
    if (td.borderTypes.includes(TdBorder.TOP)) {
      segmentList.push({
        from: [x - width, y],
        to: [x, y]
      })
    }
    if (td.borderTypes.includes(TdBorder.RIGHT)) {
      segmentList.push({
        from: [x, y],
        to: [x, y + height]
      })
    }
    if (td.borderTypes.includes(TdBorder.BOTTOM)) {
      segmentList.push({
        from: [x, y + height],
        to: [x - width, y + height]
      })
    }
    if (td.borderTypes.includes(TdBorder.LEFT)) {
      segmentList.push({
        from: [x - width, y],
        to: [x - width, y + height]
      })
    }
    if (!segmentList.length) return
    commandList.push({
      type: 'strokePath',
      segmentList,
      strokeStyle: td.borderColor || table.borderColor || defaultBorderColor,
      lineWidth: (td.borderWidth || table.borderWidth || 1) * scale,
      alpha,
      translateX: 0.5,
      translateY: 0.5
    })
  }
}
