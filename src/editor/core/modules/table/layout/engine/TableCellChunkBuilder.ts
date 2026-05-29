import { IRow } from '../../../../../interface/Row'
import { ITd } from '../../../../../interface/table/Td'
import {
  getTableLayoutLogicalCellKey,
  ITableLayoutCellSlice
} from '../TableLayoutSnapshotTypes'
import {
  getChunkPageCount,
  ITableCellChunk,
  TTableCellChunkKind
} from '../../../../draw/layout/ChunkDataTypes'

/** 表格单元格分块build调用载荷，聚合执行该操作所需的输入数据。 */
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
    /** 分页块列表，保存当前窗口内可复用的布局块。 */
    chunkList: ITableCellChunk[]
    /** 切片信息，用于描述表格或元素列表中的局部范围。 */
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
    /** 分页块列表，保存当前窗口内可复用的布局块。 */
    chunkList: ITableCellChunk[]
    /** 调用载荷，保存事件或命令传入的数据。 */
    payload: ITableCellChunkBuildPayload
    /** 单元格键名，用于在表格缓存或映射中定位单元格。 */
    cellKey: string
    /** 行布局对象，保存当前行的元素和坐标信息。 */
    row: IRow
    /** 行号，用于定位页面内的目标行。 */
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
    /** 分页块列表，保存当前窗口内可复用的布局块。 */
    chunkList: ITableCellChunk[]
    /** 调用载荷，保存事件或命令传入的数据。 */
    payload: ITableCellChunkBuildPayload
    /** 单元格键名，用于在表格缓存或映射中定位单元格。 */
    cellKey: string
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 结束元素索引，用于确定处理范围的右边界。 */
    endIndex: number
    /** 行号，用于定位页面内的目标行。 */
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
    /** 唯一标识，用于关联、查找或更新对应数据。 */
    id: number
    /** 调用载荷，保存事件或命令传入的数据。 */
    payload: ITableCellChunkBuildPayload
    /** 单元格键名，用于在表格缓存或映射中定位单元格。 */
    cellKey: string
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 结束元素索引，用于确定处理范围的右边界。 */
    endIndex: number
    kind: TTableCellChunkKind
    /** 行号，用于定位页面内的目标行。 */
    rowNo: number | null
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo?: number | null
    /** 分页片段表格标识，用于关联拆分后的表格片段。 */
    fragmentTableId?: string | null
    /** 分页片段行标识，用于关联拆分后的表格行片段。 */
    fragmentTrId?: string | null
    /** 分页片段单元格标识，用于关联拆分后的单元格片段。 */
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
