import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'
import { PagePartitioner } from './PagePartitioner'
import { ITableMeasureResult } from './TableLocalRelayoutTypes'

/** 表格局部重分页测量器，复用主表格布局和分页规则。 */
export class TableLocalRelayoutMeasurer {
  private readonly pagePartitioner: PagePartitioner

  constructor(private readonly draw: Draw) {
    this.pagePartitioner = new PagePartitioner(draw)
  }

  /** 使用原表格布局和分页拆分器重新生成当前逻辑表的 fragment 页行。 */
  public measureTablePageRows(payload: {
    sourceTable: IElement
    tableIndex: number
    runtimeRowStart: number
    startRowIndex: number
  }): ITableMeasureResult {
    const margins = this.draw.getMargins()
    const rowList = this.draw.computeRowList({
      startX: margins[3],
      startY: margins[0] + this.draw.getHeader().getExtraHeight(),
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(),
      isPagingMode: true,
      innerWidth: this.draw.getInnerWidth(),
      surroundElementList: [],
      elementList: [payload.sourceTable]
    })
    const partitionResult = this.pagePartitioner.partitionRows(
      rowList,
      [payload.sourceTable]
    )
    this.normalizeRuntimeRows({
      rowList,
      tableIndex: payload.tableIndex,
      runtimeRowStart: payload.runtimeRowStart
    })
    this.normalizeMeasuredRows({
      pageRowList: partitionResult.pageRowList,
      tableIndex: payload.tableIndex,
      startRowIndex: payload.startRowIndex
    })
    return {
      rowList,
      pageRowList: partitionResult.pageRowList
    }
  }

  /** 把单表逻辑行测量结果转换为主文档 runtime rowList 可写回的坐标。 */
  private normalizeRuntimeRows(payload: {
    rowList: IRow[]
    tableIndex: number
    runtimeRowStart: number
  }) {
    payload.rowList.forEach((row, index) => {
      row.startIndex = payload.tableIndex
      row.rowIndex = payload.runtimeRowStart + index
    })
  }

  /** 把单表测量产生的局部索引转换回主文档索引和全局行号。 */
  private normalizeMeasuredRows(payload: {
    pageRowList: IRow[][]
    tableIndex: number
    startRowIndex: number
  }) {
    let rowIndex = payload.startRowIndex
    for (let pageOffset = 0; pageOffset < payload.pageRowList.length; pageOffset++) {
      const pageRows = payload.pageRowList[pageOffset]
      for (let rowNo = 0; rowNo < pageRows.length; rowNo++) {
        const row = pageRows[rowNo]
        row.startIndex = payload.tableIndex
        row.rowIndex = rowIndex
        ;(row as IRow & { rowNo: number }).rowNo = rowNo
        rowIndex++
      }
    }
  }
}
