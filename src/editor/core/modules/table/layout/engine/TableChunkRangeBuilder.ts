import { ElementType } from '../../../../../dataset/enum/Element'
import { IRow } from '../../../../../interface/Row'
import type { Draw } from '../../../../draw/Draw'
import { getChunkPageCount, ITableChunkRange } from '../../../../draw/layout/ChunkDataTypes'

/** 构建表格父 chunk、fragment chunk 和 td 子 chunk 的范围缓存。 */
export class TableChunkRangeBuilder {
  /** 初始化 TableChunkRangeBuilder 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 按当前分页结果和表格快照构建逻辑表格范围。 */
  public build() {
    const rangeByTableIdMap = new Map<string, ITableChunkRange>()
    this.collectFragmentRanges(rangeByTableIdMap)
    this.collectCellRanges(rangeByTableIdMap)
    return rangeByTableIdMap
  }

  /** 从 pageRowList 收集表格 fragment 的页/行覆盖范围。 */
  private collectFragmentRanges(
    rangeByTableIdMap: Map<string, ITableChunkRange>
  ) {
    const pageRowList = this.draw.getPageRowList()
    for (let pageNo = 0; pageNo < pageRowList.length; pageNo++) {
      const rowList = pageRowList[pageNo] || []
      rowList.forEach((row, rowNo) => {
        const fragment = row.tableFragment
        const rowTableElement = row.elementList.find(
          element => element.type === ElementType.TABLE
        )
        const logicalTableId =
          fragment?.logicalTableId || rowTableElement?.id || ''
        const fragmentTableId =
          fragment?.tableId || rowTableElement?.id || logicalTableId
        const logicalTableIndex = fragment?.logicalTableIndex ?? row.startIndex
        if (!logicalTableId) {
          return
        }
        const range = this.ensureRange({
          rangeByTableIdMap,
          logicalTableId,
          logicalTableIndex
        })
        this.extendRangeWithRow({
          range,
          row,
          pageNo,
          rowNo
        })
        this.extendFragmentRange({
          range,
          logicalTableId,
          fragmentTableId,
          pageNo,
          rowNo,
          row
        })
      })
    }
  }

  /** 从表格快照补齐 td 子 chunk 的 slice 覆盖范围。 */
  private collectCellRanges(rangeByTableIdMap: Map<string, ITableChunkRange>) {
    const snapshot = this.draw.getRuntime().getTableLayoutSnapshot()
    if (!snapshot?.sliceList.length) {
      return
    }
    snapshot.sliceList.forEach(slice => {
      const range = this.ensureRange({
        rangeByTableIdMap,
        logicalTableId: slice.logicalTableId,
        logicalTableIndex: slice.logicalTableIndex
      })
      range.cellRangeList.push({
        isChild: true,
        cellKey: slice.cellKey,
        logicalTableId: slice.logicalTableId,
        fragmentTableId: slice.fragmentTableId,
        fragmentTrId: slice.fragmentTrId,
        fragmentTdId: slice.fragmentTdId,
        pageNo: slice.pageNo,
        pageCount: 1,
        absoluteStart: slice.absoluteStart,
        absoluteEnd: slice.absoluteEnd,
        startRowNo: slice.rowBands[0]?.rowNo ?? null,
        endRowNo: slice.rowBands[slice.rowBands.length - 1]?.rowNo ?? null
      })
      range.startPageNo = Math.min(range.startPageNo, slice.pageNo)
      range.endPageNo = Math.max(range.endPageNo, slice.pageNo)
      range.pageCount = getChunkPageCount(range.startPageNo, range.endPageNo)
      range.parentId = range.startPageNo
      range.childChunkList.push({
        scope: 'table-cell',
        kind: 'table-cell',
        id: slice.cellKey,
        pageNo: slice.pageNo,
        startIndex: slice.absoluteStart,
        endIndex: Math.max(slice.absoluteStart, slice.absoluteEnd - 1)
      })
    })
  }

  /** 获取或创建逻辑表格父范围。 */
  private ensureRange(payload: {
    /** 范围by表格idmap，用于按键快速查找对应数据。 */
    rangeByTableIdMap: Map<string, ITableChunkRange>
    /** 逻辑表格标识，用于把分页片段关联回原始表格。 */
    logicalTableId: string
    /** 逻辑表格索引，用于定位原始表格在文档中的位置。 */
    logicalTableIndex: number
  }): ITableChunkRange {
    const current = payload.rangeByTableIdMap.get(payload.logicalTableId)
    if (current) {
      current.logicalTableIndex = Math.min(
        current.logicalTableIndex,
        payload.logicalTableIndex
      )
      return current
    }
    const range: ITableChunkRange = {
      isChild: true,
      parentScope: 'document',
      parentKind: 'page',
      parentId: null,
      childChunkList: [],
      logicalTableId: payload.logicalTableId,
      logicalTableIndex: payload.logicalTableIndex,
      startPageNo: Number.POSITIVE_INFINITY,
      endPageNo: Number.NEGATIVE_INFINITY,
      pageCount: 0,
      startRowNo: Number.POSITIVE_INFINITY,
      endRowNo: Number.NEGATIVE_INFINITY,
      startRowIndex: Number.POSITIVE_INFINITY,
      endRowIndex: Number.NEGATIVE_INFINITY,
      fragmentRangeList: [],
      cellRangeList: []
    }
    payload.rangeByTableIdMap.set(payload.logicalTableId, range)
    return range
  }

  /** 用单行表格 fragment 扩展逻辑表格父范围。 */
  private extendRangeWithRow(payload: {
    /** 选区范围，记录起止索引和方向信息。 */
    range: ITableChunkRange
    /** 行布局对象，保存当前行的元素和坐标信息。 */
    row: IRow
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo: number
    /** 行号，用于定位页面内的目标行。 */
    rowNo: number
  }) {
    const previousStartPageNo = payload.range.startPageNo
    const previousEndPageNo = payload.range.endPageNo
    payload.range.startPageNo = Math.min(previousStartPageNo, payload.pageNo)
    payload.range.endPageNo = Math.max(previousEndPageNo, payload.pageNo)
    payload.range.pageCount = getChunkPageCount(
      payload.range.startPageNo,
      payload.range.endPageNo
    )
    payload.range.parentId = payload.range.startPageNo
    payload.range.startRowIndex = Math.min(
      payload.range.startRowIndex,
      payload.row.rowIndex
    )
    payload.range.endRowIndex = Math.max(
      payload.range.endRowIndex,
      payload.row.rowIndex
    )
    if (payload.pageNo < previousStartPageNo) {
      payload.range.startRowNo = payload.rowNo
    } else if (payload.pageNo === payload.range.startPageNo) {
      payload.range.startRowNo = Math.min(payload.range.startRowNo, payload.rowNo)
    }
    if (payload.pageNo > previousEndPageNo) {
      payload.range.endRowNo = payload.rowNo
    } else if (payload.pageNo === payload.range.endPageNo) {
      payload.range.endRowNo = Math.max(payload.range.endRowNo, payload.rowNo)
    }
  }

  /** 用单行表格 fragment 扩展 fragment 范围。 */
  private extendFragmentRange(payload: {
    /** 选区范围，记录起止索引和方向信息。 */
    range: ITableChunkRange
    /** 逻辑表格标识，用于把分页片段关联回原始表格。 */
    logicalTableId: string
    /** 分页片段表格标识，用于关联拆分后的表格片段。 */
    fragmentTableId: string
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo: number
    /** 行号，用于定位页面内的目标行。 */
    rowNo: number
    /** 行布局对象，保存当前行的元素和坐标信息。 */
    row: IRow
  }) {
    let fragmentRange = payload.range.fragmentRangeList.find(
      range => range.fragmentTableId === payload.fragmentTableId
    )
    if (!fragmentRange) {
      fragmentRange = {
        isChild: true,
        logicalTableId: payload.logicalTableId,
        fragmentTableId: payload.fragmentTableId,
        pageNo: payload.pageNo,
        pageCount: 1,
        startRowNo: payload.rowNo,
        endRowNo: payload.rowNo,
        startRowIndex: payload.row.rowIndex,
        endRowIndex: payload.row.rowIndex
      }
      payload.range.fragmentRangeList.push(fragmentRange)
      payload.range.childChunkList.push({
        scope: 'table',
        kind: 'table-fragment',
        id: payload.fragmentTableId,
        pageNo: payload.pageNo,
        startIndex: payload.row.startIndex,
        endIndex:
          payload.row.startIndex +
          Math.max(0, payload.row.elementList.length - 1)
      })
      return
    }
    fragmentRange.startRowNo = Math.min(fragmentRange.startRowNo, payload.rowNo)
    fragmentRange.endRowNo = Math.max(fragmentRange.endRowNo, payload.rowNo)
    fragmentRange.startRowIndex = Math.min(
      fragmentRange.startRowIndex,
      payload.row.rowIndex
    )
    fragmentRange.endRowIndex = Math.max(
      fragmentRange.endRowIndex,
      payload.row.rowIndex
    )
    const childRef = payload.range.childChunkList.find(child => {
      return child.scope === 'table' && child.id === payload.fragmentTableId
    })
    if (childRef) {
      childRef.startIndex = Math.min(childRef.startIndex, payload.row.startIndex)
      childRef.endIndex = Math.max(
        childRef.endIndex,
        payload.row.startIndex +
          Math.max(0, payload.row.elementList.length - 1)
      )
    }
  }
}
