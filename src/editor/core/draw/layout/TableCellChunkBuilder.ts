import { IRow } from '../../../interface/Row'
import { ITd } from '../../../interface/table/Td'
import {
  getTableLayoutLogicalCellKey,
  ITableLayoutCellSlice
} from '../../table/layout/TableLayoutSnapshotTypes'
import {
  getChunkPageCount,
  ITableCellChunk,
  TTableCellChunkKind
} from './ChunkDataTypes'

export interface ITableCellChunkBuildPayload {
  /** 逻辑表 id。 */
  tableId: string
  /** 逻辑表在主文档中的索引。 */
  tableIndex: number
  /** 逻辑行 id。 */
  trId: string
  /** 逻辑单元格 id。 */
  tdId: string
  /** 逻辑行索引。 */
  trIndex: number
  /** 逻辑单元格索引。 */
  tdIndex: number
  /** 单元格数据。 */
  td: ITd
}

/** 表格单元格子 chunk 构建器，专管 row / hard-slice / snapshot slice 三类构建。 */
export class TableCellChunkBuilder {
  /** 单个子 chunk 的最大元素数量，避免超长单元格行继续形成巨型 chunk。 */
  private readonly maxElementCountPerChunk = 600

  /** 创建单元格内的子 chunk 列表，优先按 rowList，缺少行时按内容硬切。 */
  public createCellChunkList(
    payload: ITableCellChunkBuildPayload
  ): ITableCellChunk[] {
    const chunkList: ITableCellChunk[] = []
    const cellKey = getTableLayoutLogicalCellKey(
      payload.tableId,
      payload.trId,
      payload.tdId
    )
    const rowList = payload.td.rowList || []
    if (rowList.length) {
      rowList.forEach((row, rowNo) => {
        this.pushRowChunks({
          chunkList,
          payload,
          cellKey,
          row,
          rowNo
        })
      })
    } else {
      this.pushHardSliceChunks({
        chunkList,
        payload,
        cellKey,
        startIndex: 0,
        endIndex: Math.max(0, (payload.td.value || []).length - 1),
        rowNo: null
      })
    }
    if (!chunkList.length) {
      chunkList.push(
        this.createChunk({
          id: 0,
          payload,
          cellKey,
          startIndex: 0,
          endIndex: 0,
          kind: 'cell-row',
          rowNo: 0
        })
      )
    }
    return chunkList
  }

  /** 把一个分页 slice 拆成一个或多个绑定父 fragment 的 td 子 chunk。 */
  public appendSliceChunks(payload: {
    chunkList: ITableCellChunk[]
    slice: ITableLayoutCellSlice
  }) {
    const { chunkList, slice } = payload
    if (slice.absoluteEnd <= slice.absoluteStart) {
      return
    }
    const payloadMeta = {
      tableId: slice.logicalTableId,
      tableIndex: slice.logicalTableIndex,
      trId: slice.logicalTrId,
      tdId: slice.logicalTdId,
      trIndex: slice.logicalTrIndex,
      tdIndex: slice.logicalTdIndex,
      td: {} as ITd
    }
    for (
      let startIndex = slice.absoluteStart;
      startIndex < slice.absoluteEnd;
      startIndex += this.maxElementCountPerChunk
    ) {
      const endIndex = Math.min(
        slice.absoluteEnd - 1,
        startIndex + this.maxElementCountPerChunk - 1
      )
      chunkList.push(
        this.createChunk({
          id: chunkList.length,
          payload: payloadMeta,
          cellKey: slice.cellKey,
          startIndex,
          endIndex,
          kind:
            endIndex - startIndex + 1 >= this.maxElementCountPerChunk
              ? 'hard-slice'
              : 'cell-row',
          rowNo: slice.rowBands[0]?.rowNo ?? null,
          pageNo: slice.pageNo,
          fragmentTableId: slice.fragmentTableId,
          fragmentTrId: slice.fragmentTrId,
          fragmentTdId: slice.fragmentTdId
        })
      )
    }
  }

  /** 按单元格行创建一个或多个子 chunk，超长行继续硬切。 */
  private pushRowChunks(payload: {
    chunkList: ITableCellChunk[]
    payload: ITableCellChunkBuildPayload
    cellKey: string
    row: IRow
    rowNo: number
  }) {
    const startIndex = payload.row.startIndex
    const endIndex =
      payload.row.startIndex + Math.max(0, payload.row.elementList.length - 1)
    this.pushHardSliceChunks({
      chunkList: payload.chunkList,
      payload: payload.payload,
      cellKey: payload.cellKey,
      startIndex,
      endIndex,
      rowNo: payload.rowNo
    })
  }

  /** 在指定索引范围内按阈值追加硬切片。 */
  private pushHardSliceChunks(payload: {
    chunkList: ITableCellChunk[]
    payload: ITableCellChunkBuildPayload
    cellKey: string
    startIndex: number
    endIndex: number
    rowNo: number | null
  }) {
    if (payload.endIndex < payload.startIndex) {
      return
    }
    for (
      let startIndex = payload.startIndex;
      startIndex <= payload.endIndex;
      startIndex += this.maxElementCountPerChunk
    ) {
      const endIndex = Math.min(
        payload.endIndex,
        startIndex + this.maxElementCountPerChunk - 1
      )
      payload.chunkList.push(
        this.createChunk({
          id: payload.chunkList.length,
          payload: payload.payload,
          cellKey: payload.cellKey,
          startIndex,
          endIndex,
          kind:
            endIndex - startIndex + 1 >= this.maxElementCountPerChunk
              ? 'hard-slice'
              : 'cell-row',
          rowNo: payload.rowNo
        })
      )
    }
  }

  /** 创建单个表格子 chunk 描述。 */
  private createChunk(payload: {
    id: number
    payload: ITableCellChunkBuildPayload
    cellKey: string
    startIndex: number
    endIndex: number
    kind: TTableCellChunkKind
    rowNo: number | null
    pageNo?: number | null
    fragmentTableId?: string | null
    fragmentTrId?: string | null
    fragmentTdId?: string | null
  }): ITableCellChunk {
    return {
      id: payload.id,
      scope: 'table-cell',
      tableId: payload.payload.tableId,
      tableIndex: payload.payload.tableIndex,
      trId: payload.payload.trId,
      tdId: payload.payload.tdId,
      trIndex: payload.payload.trIndex,
      tdIndex: payload.payload.tdIndex,
      cellKey: payload.cellKey,
      startIndex: payload.startIndex,
      endIndex: payload.endIndex,
      elementCount: Math.max(0, payload.endIndex - payload.startIndex + 1),
      kind: payload.kind,
      rowNo: payload.rowNo,
      pageNo: payload.pageNo ?? null,
      startPageNo: payload.pageNo ?? null,
      endPageNo: payload.pageNo ?? null,
      pageCount: getChunkPageCount(
        payload.pageNo ?? null,
        payload.pageNo ?? null
      ),
      fragmentTableId: payload.fragmentTableId ?? null,
      fragmentTrId: payload.fragmentTrId ?? null,
      fragmentTdId: payload.fragmentTdId ?? null,
      isChild: true,
      parentScope: payload.fragmentTableId ? 'table' : null,
      parentKind: payload.fragmentTableId ? 'table-fragment' : null,
      parentId: payload.fragmentTableId ?? null,
      childChunkList: [],
      dirty: false
    }
  }
}
