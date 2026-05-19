import { EditorZone } from '../../../dataset/enum/Editor'
import { IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'
import {
  ITableMeasureResult,
  ITableRuntimeRange
} from './TableLocalRelayoutTypes'

/** 表格局部重分页运行时写回器。 */
export class TableLocalRelayoutRuntimePatcher {
  constructor(private readonly draw: Draw) {}

  /** 把局部重分页结果写回运行时布局、位置列表、表格快照和 chunk 索引。 */
  public patch(payload: {
    oldRange: ITableRuntimeRange
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
    pageStart: number
    pageRowList: IRow[][]
  }) {
    const positionPrefix = this.draw
      .getPosition()
      .getLayoutMainPositionList()
      .filter(position => position.pageNo < payload.pageStart)
    const positionList = this.computeWindowPositionList(payload)
    this.draw.getPosition().setPositionList([...positionPrefix, ...positionList])
  }

  /** 使用原位置计算器重新生成表格 fragment 位置。 */
  private computeWindowPositionList(payload: {
    pageStart: number
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
      this.draw.getPosition().computePageRowPosition({
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
