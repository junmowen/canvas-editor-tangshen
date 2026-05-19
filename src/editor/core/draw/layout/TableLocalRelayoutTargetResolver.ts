import { ElementType } from '../../../dataset/enum/Element'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'
import {
  ITableLocalRelayoutTargetResult,
  ITableRuntimeRange,
  ITableRuntimeRangeScanStats
} from './TableLocalRelayoutTypes'

/** 解析当前输入命中的逻辑表和旧 fragment 运行时范围。 */
export class TableLocalRelayoutTargetResolver {
  constructor(private readonly draw: Draw) {}

  /** 解析当前表格输入的局部重分页目标。 */
  public resolveCurrentTarget(): ITableLocalRelayoutTargetResult {
    const positionContext = this.draw.getPosition().getPositionContext()
    if (!positionContext.isTable || positionContext.index === undefined) {
      return { target: null, reason: 'not-table-context' }
    }

    const tableIndex = positionContext.index
    const sourceTable = this.draw.getOriginalMainElementList()[tableIndex]
    if (!sourceTable || sourceTable.type !== ElementType.TABLE || !sourceTable.id) {
      return { target: null, reason: 'logical-table-miss' }
    }
    if (sourceTable.tableDisplay === 'inline') {
      return {
        target: null,
        reason: 'inline-table-unsupported',
        logicalTableId: sourceTable.id
      }
    }

    const rangeResult = this.resolveRuntimeTableRange({
      logicalTableId: sourceTable.id,
      tableIndex
    })
    if (!rangeResult.range) {
      return {
        target: null,
        reason: 'runtime-table-range-miss',
        logicalTableId: sourceTable.id,
        scanStats: rangeResult.scanStats
      }
    }
    const safeReason = this.validateSafePatchRange(rangeResult.range)
    if (safeReason) {
      return {
        target: null,
        reason: safeReason,
        logicalTableId: sourceTable.id,
        scanStats: rangeResult.scanStats
      }
    }

    return {
      target: {
        sourceTable,
        tableIndex,
        oldRange: rangeResult.range
      },
      logicalTableId: sourceTable.id,
      scanStats: rangeResult.scanStats
    }
  }

  /** 解析当前逻辑表在旧运行时中的 fragment 行范围。 */
  private resolveRuntimeTableRange(payload: {
    logicalTableId: string
    tableIndex: number
  }): { range: ITableRuntimeRange | null; scanStats: ITableRuntimeRangeScanStats } {
    const pageRowList = this.draw.getPageRowList()
    const snapshot = this.draw.getTableLayoutSnapshot()
    const fragmentTableIdSet = new Set(
      snapshot.sliceList
        .filter(slice => slice.logicalTableId === payload.logicalTableId)
        .map(slice => slice.fragmentTableId)
    )
    let scannedTableRowCount = 0
    const matchedPageRowList: Array<{ pageNo: number; row: IRow }> = []
    for (let pageNo = 0; pageNo < pageRowList.length; pageNo++) {
      const pageRows = pageRowList[pageNo] || []
      for (let rowNo = 0; rowNo < pageRows.length; rowNo++) {
        const row = pageRows[rowNo]
        const rowTableElement = row.elementList.find(
          element => element.type === ElementType.TABLE
        )
        if (rowTableElement) {
          scannedTableRowCount++
        }
        const fragmentTableId =
          row.tableFragment?.tableId || rowTableElement?.id || rowTableElement?.tableId
        if (
          row.tableFragment?.logicalTableId === payload.logicalTableId ||
          (fragmentTableId && fragmentTableIdSet.has(fragmentTableId))
        ) {
          matchedPageRowList.push({ pageNo, row })
        }
      }
    }
    const scanStats = {
      snapshotSliceCount: snapshot.sliceList.length,
      matchedFragmentTableCount: fragmentTableIdSet.size,
      scannedTableRowCount
    }
    if (!matchedPageRowList.length) {
      return { range: null, scanStats }
    }

    const firstMatched = matchedPageRowList[0]
    const lastMatched = matchedPageRowList[matchedPageRowList.length - 1]
    const firstRow = firstMatched.row
    const lastRow = lastMatched.row
    const pageRange = this.resolvePageRangeByRows(firstRow, lastRow)
    if (!pageRange) {
      return { range: null, scanStats }
    }
    const runtimeRowStart = this.resolveRuntimeRowStart({
      logicalTableId: payload.logicalTableId,
      tableIndex: payload.tableIndex
    })
    if (runtimeRowStart < 0) {
      return { range: null, scanStats }
    }

    return {
      range: {
        runtimeRowStart,
        pageStart: pageRange.pageStart,
        pageStartRowOffset: pageRange.pageStartRowOffset,
        pageCount: pageRange.pageCount,
        firstRow,
        lastRow
      },
      scanStats
    }
  }

  /** 根据首尾行对象反查旧 fragment 占用的页范围。 */
  private resolvePageRangeByRows(firstRow: IRow, lastRow: IRow) {
    const pageRowList = this.draw.getPageRowList()
    let pageStart = -1
    let pageEnd = -1
    for (let pageNo = 0; pageNo < pageRowList.length; pageNo++) {
      const pageRows = pageRowList[pageNo]
      if (pageRows.includes(firstRow)) {
        pageStart = pageNo
      }
      if (pageRows.includes(lastRow)) {
        pageEnd = pageNo
      }
    }
    if (pageStart < 0 || pageEnd < pageStart) {
      return null
    }
    return {
      pageStart,
      pageStartRowOffset:
        pageStart >= 0 ? pageRowList[pageStart].indexOf(firstRow) : -1,
      pageCount: pageEnd - pageStart + 1
    }
  }

  /** 校验第一版局部重分页的安全边界，避免影响表格后的正文排版。 */
  private validateSafePatchRange(oldRange: ITableRuntimeRange): string | null {
    const runtimeRowList = this.draw.getRuntime().getRuntimeRowList()
    const pageRowList = this.draw.getPageRowList()
    const endPageRows =
      pageRowList[oldRange.pageStart + oldRange.pageCount - 1] || []
    if (oldRange.pageStartRowOffset < 0) {
      return 'table-page-offset-miss'
    }
    if (!this.isOnlyBlankPrefixRows(oldRange)) {
      return 'table-has-content-prefix'
    }
    if (endPageRows[endPageRows.length - 1] !== oldRange.lastRow) {
      return 'table-not-page-tail'
    }
    if (oldRange.runtimeRowStart + 1 !== runtimeRowList.length) {
      return 'table-not-document-tail'
    }
    return null
  }

  /** 判断表格起始页前缀是否只有空白占位行；有真实正文时暂不局部接管，避免表格不能自然整体下移。 */
  private isOnlyBlankPrefixRows(oldRange: ITableRuntimeRange): boolean {
    const pageRows = this.draw.getPageRowList()[oldRange.pageStart] || []
    const prefixRows = pageRows.slice(0, oldRange.pageStartRowOffset)
    return prefixRows.every(row =>
      row.elementList.every(element => !element.value || element.value === '\u200B')
    )
  }

  /** 解析逻辑表在未分页 runtime rowList 中的行位置。 */
  private resolveRuntimeRowStart(payload: {
    logicalTableId: string
    tableIndex: number
  }): number {
    const runtimeRowList = this.draw.getRuntime().getRuntimeRowList()
    return runtimeRowList.findIndex(
      row =>
        row.startIndex === payload.tableIndex ||
        row.elementList.some(
          element =>
            element.type === ElementType.TABLE &&
            (element.id === payload.logicalTableId ||
              element.sourceIndex === payload.tableIndex)
        )
    )
  }
}
