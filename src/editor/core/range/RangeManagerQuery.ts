import { RangeManagerState } from './RangeManagerState'
import { ZERO } from '../../dataset/constant/Common'
import { EditorContext } from '../../dataset/enum/Editor'
import { IElement, IElementPosition } from '../../interface/Element'
import {
  IRange,
  IRangeParagraphInfo,
  RangeRowArray,
  RangeRowMap
} from '../../interface/Range'

/**
 * RangeManager 查询模块，负责行、段落、表格、关键词和命中范围等派生信息。
 */
export class RangeManagerQuery extends RangeManagerState {
  /** 获取当前选区覆盖的页面行号集合。 */
  public getRangeRow(): RangeRowMap | null {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return null
    const { startIndex, endIndex } = activeRange
    if (!~startIndex && !~endIndex) return null
    const positionList = this.coordinate.getPositionList()
    const elementList = this.draw.getObjectResolver().getElementList()
    if (!this.isValidPositionElementRange(activeRange, positionList, elementList)) {
      return null
    }
    const rangeRow: RangeRowMap = new Map()
    for (let p = startIndex; p < endIndex + 1; p++) {
      const { pageNo, rowNo } = positionList[p]
      const rowSet = rangeRow.get(pageNo)
      if (!rowSet) {
        rangeRow.set(pageNo, new Set([rowNo]))
      } else {
        if (!rowSet.has(rowNo)) {
          rowSet.add(rowNo)
        }
      }
    }
    return rangeRow
  }

  /** 获取当前选区覆盖的段落行号集合。 */
  public getRangeParagraph(): RangeRowArray | null {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return null
    const { startIndex, endIndex } = activeRange
    if (startIndex < 0 || endIndex < 0) return null
    const positionList = this.coordinate.getPositionList()
    const elementList = this.draw.getObjectResolver().getElementList()
    if (!this.isValidPositionElementRange(activeRange, positionList, elementList)) {
      return null
    }
    const rangeRow: RangeRowArray = new Map()

    let start = startIndex
    while (start >= 0) {
      const position = positionList[start]
      const element = elementList[start]
      if (!position || !element) break
      const { pageNo, rowNo } = position
      let rowArray = rangeRow.get(pageNo)
      if (!rowArray) {
        rowArray = []
        rangeRow.set(pageNo, rowArray)
      }
      if (!rowArray.includes(rowNo)) {
        rowArray.unshift(rowNo)
      }
      const preElement = elementList[start - 1]
      if (
        (element.value === ZERO && !element.listWrap) ||
        element.listId !== preElement?.listId ||
        element.titleId !== preElement?.titleId
      ) {
        break
      }
      start--
    }

    const isCollapsed = startIndex === endIndex
    if (!isCollapsed) {
      let middle = startIndex + 1
      while (middle < endIndex) {
        const position = positionList[middle]
        if (!position || !elementList[middle]) {
          middle++
          continue
        }
        const { pageNo, rowNo } = position
        let rowArray = rangeRow.get(pageNo)
        if (!rowArray) {
          rowArray = []
          rangeRow.set(pageNo, rowArray)
        }
        if (!rowArray.includes(rowNo)) {
          rowArray.push(rowNo)
        }
        middle++
      }
    }

    let end = endIndex
    const startElement = this.draw.getTargetResolver().resolveRangeElement({
      elementList
    })
    if (isCollapsed && startElement?.value === ZERO) {
      end += 1
    }
    while (end < positionList.length && end < elementList.length) {
      const position = positionList[end]
      const element = elementList[end]
      if (!position || !element) break
      const nextElement = elementList[end + 1]
      if (
        (element.value === ZERO && !element.listWrap) ||
        element.listId !== nextElement?.listId ||
        element.titleId !== nextElement?.titleId
      ) {
        break
      }
      const { pageNo, rowNo } = position
      let rowArray = rangeRow.get(pageNo)
      if (!rowArray) {
        rowArray = []
        rangeRow.set(pageNo, rowArray)
      }
      if (!rowArray.includes(rowNo)) {
        rowArray.push(rowNo)
      }
      end++
    }

    return rangeRow
  }

  // 获取光标所选位置元素列表

  /** 获取当前选区所在行的元素列表。 */
  public getRangeRowElementList(): IElement[] | null {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return null
    const { startIndex, endIndex } = activeRange
    const { isCrossRowCol } = this.range
    if (!~startIndex && !~endIndex) return null
    if (isCrossRowCol) {
      return this.getSelectionElementList()
    }
    // 选区行信息
    const rangeRow = this.getRangeRow()
    if (!rangeRow) return null
    const positionList = this.coordinate.getPositionList()
    const elementList = this.draw.getObjectResolver().getElementList()
    // 当前选区所在行
    const rowElementList: IElement[] = []
    for (let p = 0; p < positionList.length; p++) {
      const position = positionList[p]
      const rowSet = rangeRow.get(position.pageNo)
      if (!rowSet) continue
      if (rowSet.has(position.rowNo)) {
        rowElementList.push(elementList[p])
      }
    }
    return rowElementList
  }

  // 获取选区段落信息

  /** 获取当前选区所在段落的元素列表和起始索引。 */
  public getRangeParagraphInfo(): IRangeParagraphInfo | null {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return null
    const { startIndex, endIndex } = activeRange
    if (!~startIndex && !~endIndex) return null
    /// 起始元素位置
    let startPositionIndex = -1
    // 需要改变的元素列表
    const rangeElementList: IElement[] = []
    // 选区行信息
    const rangeRow = this.getRangeParagraph()
    if (!rangeRow) return null
    const elementList = this.draw.getObjectResolver().getElementList()
    const positionList = this.coordinate.getPositionList()
    for (let p = 0; p < positionList.length; p++) {
      const position = positionList[p]
      const rowArray = rangeRow.get(position.pageNo)
      if (!rowArray) continue
      if (rowArray.includes(position.rowNo)) {
        const element = elementList[p]
        if (!element) continue
        if (!~startPositionIndex) {
          startPositionIndex = position.index
        }
        rangeElementList.push(element)
      }
    }
    if (!rangeElementList.length) return null
    return {
      elementList: rangeElementList,
      startIndex: startPositionIndex
    }
  }

  // 获取选区段落元素列表

  /** 获取当前选区所在段落的元素列表。 */
  public getRangeParagraphElementList(): IElement[] | null {
    return this.getRangeParagraphInfo()?.elementList || null
  }

  /**
   * 校验 range 是否能同时映射到位置列表和元素列表。
   *
   * 双击取词、表格分页碎片或懒渲染状态下，公开 range 可能是逻辑单元格索引，
   * 不一定能直接作为主文档 positionList / elementList 下标使用；此时必须返回 null，
   * 让上层取词逻辑降级，而不是继续读取 undefined.value。
   */

  private isValidPositionElementRange(
    range: IRange,
    positionList: IElementPosition[],
    elementList: IElement[]
  ): boolean {
    const { startIndex, endIndex } = range
    const maxIndex = Math.min(positionList.length, elementList.length) - 1
    return !!(
      maxIndex >= 0 &&
      startIndex >= 0 &&
      endIndex >= startIndex &&
      startIndex <= maxIndex &&
      endIndex <= maxIndex
    )
  }

  // 获取选区表格

  /** 获取当前表格选区对应的表格元素。 */
  public getRangeTableElement(): IElement | null {
    return (
      this.draw.getTargetResolver().resolveContextTable({
        positionContext: this.coordinate.getPositionContext(),
        range: this.range
      })?.element || null
    )
  }

  /** 判断当前选区是否选中了整个非表格编辑区域。 */
  public getIsSelectAll() {
    const elementList = this.draw.getObjectResolver().getElementList()
    const { startIndex, endIndex } = this.range
    return (
      startIndex === 0 &&
      elementList.length - 1 === endIndex &&
      !this.coordinate.getPositionContext().isTable
    )
  }

  /** 判断页面坐标是否落在当前选区矩形内。 */
  public getIsPointInRange(x: number, y: number): boolean {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return false
    const { startIndex, endIndex } = activeRange
    const positionList = this.coordinate.getPositionList()
    for (let p = startIndex; p <= endIndex; p++) {
      const position = positionList[p]
      if (!position) break
      const {
        coordinate: { leftTop, rightBottom }
      } = positionList[p]
      if (
        x >= leftTop[0] &&
        x <= rightBottom[0] &&
        y >= leftTop[1] &&
        y <= rightBottom[1]
      ) {
        return true
      }
    }
    return false
  }

  /** 获取关键词在文档中的 range 列表。 */
  public getKeywordRangeList(payload: string): IRange[] {
    const searchMatchList = this.draw
      .getSearch()
      .getMatchList(payload, this.draw.getObjectResolver().getOriginalElementList())
    const searchRangeMap: Map<string, IRange> = new Map()
    for (const searchMatch of searchMatchList) {
      const searchRange = searchRangeMap.get(searchMatch.groupId)
      if (searchRange) {
        searchRange.endIndex += 1
      } else {
        const { type, groupId, tableId, index, tdIndex, trIndex } = searchMatch
        const range: IRange = {
          startIndex: index,
          endIndex: index
        }
        if (type === EditorContext.TABLE) {
          range.tableId = tableId
          range.startTdIndex = tdIndex
          range.endTdIndex = tdIndex
          range.startTrIndex = trIndex
          range.endTrIndex = trIndex
        }
        searchRangeMap.set(groupId, range)
      }
    }
    const rangeList: IRange[] = []
    searchRangeMap.forEach(searchRange => {
      rangeList.push(searchRange)
    })
    return rangeList
  }
}
