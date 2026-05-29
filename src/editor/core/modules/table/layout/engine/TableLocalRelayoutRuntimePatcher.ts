import { EditorZone } from '../../../../../dataset/enum/Editor'
import { IElementPosition } from '../../../../../interface/Element'
import { IRow } from '../../../../../interface/Row'
import type { Draw } from '../../../../draw/Draw'
import {
  ITableMeasureResult,
  ITableRuntimeRange
} from './TableLocalRelayoutTypes'

/** 表格局部重分页运行时写回器。 */
export class TableLocalRelayoutRuntimePatcher {
  /** 初始化 TableLocalRelayoutRuntimePatcher 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 把局部重分页结果写回运行时布局、位置列表、表格快照和 chunk 索引。 */
  public patch(payload: {
    /** 旧范围信息，用于和本次测量结果比较差异。 */
    oldRange: ITableRuntimeRange
    /** measure结果，保存当前计算返回的数据。 */
    measureResult: ITableMeasureResult
  }) {
    const { oldRange, measureResult } = payload
    const runtimeRowList = this.draw.getRuntime().getRuntimeRowList()
    const pageRowList = this.draw.getPageRowList()
    const startPagePrefixRows = pageRowList[oldRange.pageStart].slice(
      0,
      oldRange.pageStartRowOffset
    )
    const nextPageRowList = [
      [...startPagePrefixRows, ...measureResult.pageRowList[0]],
      ...measureResult.pageRowList.slice(1)
    ]

    runtimeRowList.splice(oldRange.runtimeRowStart, 1, ...measureResult.rowList)
    pageRowList.splice(oldRange.pageStart, oldRange.pageCount, ...nextPageRowList)

    const nextSnapshotVersion = this.draw.getTableLayoutSnapshotVersion() + 1
    this.draw.replaceLayoutState({
      rowList: runtimeRowList,
      pageRowList,
      layoutElementList: pageRowList.flatMap(pageRows =>
        pageRows.flatMap(row => row.elementList)
      ),
      tableLayoutSnapshotVersion: nextSnapshotVersion,
      tableLayoutSnapshot: null
    })

    this.patchPositionList({
      pageStart: oldRange.pageStart,
      pageRowList: nextPageRowList
    })
    this.draw.replaceTableLayoutSnapshot(
      this.draw.getServices().tableLayoutSnapshotBuilder.build({
        version: nextSnapshotVersion
      })
    )
    this.draw.getServices().documentChunkIndex.rebuildPageChunks()
    this.draw.getServices().tableChunkRangeIndex.rebuild('table-local-relayout')
    this.draw.getServices().tableCellChunkIndex.rebuild('table-local-relayout')
  }

  /** 重新计算表格页窗口位置，并替换主位置列表的尾部。 */
  private patchPositionList(payload: {
    /** 页面起始索引，用于定位当前页在文档元素列表中的起点。 */
    pageStart: number
    /** 页面行列表，保存当前页排版后的行信息。 */
    pageRowList: IRow[][]
  }) {
    const positionPrefix = this.draw
      .getCoordinate()
      .getLayoutMainPositionList()
      .filter(position => position.pageNo < payload.pageStart)
    const positionList = this.computeWindowPositionList(payload)
    this.draw.getCoordinate().setPositionList([...positionPrefix, ...positionList])
  }

  /** 使用原位置计算器重新生成表格 fragment 位置。 */
  private computeWindowPositionList(payload: {
    /** 页面起始索引，用于定位当前页在文档元素列表中的起点。 */
    pageStart: number
    /** 页面行列表，保存当前页排版后的行信息。 */
    pageRowList: IRow[][]
  }): IElementPosition[] {
    const positionList: IElementPosition[] = []
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const startY = margins[0] + this.draw.getHeader().getExtraHeight()
    const innerWidth = this.draw.getInnerWidth()
    for (let pageOffset = 0; pageOffset < payload.pageRowList.length; pageOffset++) {
      const rowList = payload.pageRowList[pageOffset]
      if (!rowList.length) {
        continue
      }
      this.draw.getCoordinate().computePageRowPosition({
        positionList,
        rowList,
        pageNo: payload.pageStart + pageOffset,
        startX,
        startY,
        startRowIndex: rowList[0].rowIndex,
        startIndex: rowList[0].startIndex,
        innerWidth,
        zone: EditorZone.MAIN
      })
    }
    return positionList
  }
}
