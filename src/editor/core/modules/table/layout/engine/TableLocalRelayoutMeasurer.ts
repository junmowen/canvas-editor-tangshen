import { IElement } from '../../../../../interface/Element'
import { IRow } from '../../../../../interface/Row'
import type { Draw } from '../../../../draw/Draw'
import { PagePartitioner } from '../../../../draw/layout/PagePartitioner'
import { ITableMeasureResult } from './TableLocalRelayoutTypes'

/** 表格局部重分页测量器，复用主表格布局和分页规则。 */
export class TableLocalRelayoutMeasurer {
  private readonly pagePartitioner: PagePartitioner

  /** 初始化 TableLocalRelayoutMeasurer 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {
    this.pagePartitioner = new PagePartitioner(draw)
  }

  /** 使用原表格布局和分页拆分器重新生成当前逻辑表的 fragment 页行。 */
  public measureTablePageRows(payload: {
    /** 来源表格对象，用于在拆分或合并时保留原始结构。 */
    sourceTable: IElement
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 运行态起始行索引，用于把局部表格行映射回全量行。 */
    runtimeRowStart: number
    /** 起始行索引，用于限定表格或页面行处理范围。 */
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
    /** 行列表，保存排版后的行结构。 */
    rowList: IRow[]
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 运行态起始行索引，用于把局部表格行映射回全量行。 */
    runtimeRowStart: number
  }) {
    payload.rowList.forEach((row, index) => {
      row.startIndex = payload.tableIndex
      row.rowIndex = payload.runtimeRowStart + index
    })
  }

  /** 把单表测量产生的局部索引转换回主文档索引和全局行号。 */
  private normalizeMeasuredRows(payload: {
    /** 页面行列表，保存当前页排版后的行信息。 */
    pageRowList: IRow[][]
    /** 表格元素索引，用于定位文档中的表格入口。 */
    tableIndex: number
    /** 起始行索引，用于限定表格或页面行处理范围。 */
    startRowIndex: number
  }) {
    let rowIndex = payload.startRowIndex
    for (let pageOffset = 0; pageOffset < payload.pageRowList.length; pageOffset++) {
      const pageRows = payload.pageRowList[pageOffset]
      for (let rowNo = 0; rowNo < pageRows.length; rowNo++) {
        const row = pageRows[rowNo]
        row.startIndex = payload.tableIndex
        row.rowIndex = rowIndex
        /** 行号，用于定位页面内的目标行。 */
        ;(row as IRow & { rowNo: number }).rowNo = rowNo
        rowIndex++
      }
    }
  }
}
