import { IElement } from '../../../interface/Element'
import {
  ITableFragmentCell,
  ITableFragmentDescriptor,
  ITableFragmentRow
} from '../../../interface/table/TableFragment'
import { deepClone, getUUID } from '../../../utils'
import { getTableCellContentInset } from '../../table/layout/TableCellContentInset'
import type { Draw } from '../Draw'

interface ISplitTableFragmentsPayload {
  sourceTable: IElement
  logicalTableId: string
  logicalTableIndex: number
  availableHeight: number
  pageContentHeight: number
  rowMargin: number
  pageStartOffsetY?: number
}

interface ISplitTableFragmentPayload {
  fragment: ITableFragmentDescriptor
  availableHeight: number
  pageContentHeight: number
  rowMargin: number
}

interface ISplitTableFragmentResult {
  head: ITableFragmentDescriptor
  tail: ITableFragmentDescriptor | null
  moveToNextPage: boolean
}

interface IFragmentCarryHeightItem {
  td: ITableFragmentCell
  reservedHeight: number
}

/**
 * 表格 fragment 拆分器。
 *
 * 负责把一个逻辑表格按当前可用高度拆成多个分页 fragment，
 * 并处理 repeatOnPageStart、rowspan / colspan 以及跨页续接单元格。
 */
export class TableFragmentSplitter {
  constructor(private readonly draw: Draw) {}

  /** 为 fragment 内的 tr / td 补齐 origin 元信息，保证跨页后仍能回溯逻辑来源。 */
  private ensureFragmentOriginMeta(trList: ITableFragmentRow[]) {
    for (let trIndex = 0; trIndex < trList.length; trIndex++) {
      const tr = trList[trIndex]
      tr.originId = tr.originId || tr.id
      for (let tdIndex = 0; tdIndex < tr.tdList.length; tdIndex++) {
        const td = tr.tdList[tdIndex]
        td.originId = td.originId || td.id
        td.cellOriginTrId = td.cellOriginTrId || tr.originId || tr.id
      }
    }
  }

  /** 按逻辑行列坐标回查当前 row/col 上真正覆盖它的单元格。 */
  private getCoveringCell(
    trList: ITableFragmentRow[],
    targetRowIndex: number,
    colIndex: number
  ): ITableFragmentCell | null {
    for (let rowIndex = targetRowIndex; rowIndex >= 0; rowIndex--) {
      const tr = trList[rowIndex]
      if (!tr?.tdList?.length) continue
      for (let cellIndex = 0; cellIndex < tr.tdList.length; cellIndex++) {
        const td = tr.tdList[cellIndex]
        const startRowIndex = td.rowIndex ?? rowIndex
        const endRowIndex = startRowIndex + td.rowspan - 1
        const startColIndex = td.colIndex ?? cellIndex
        const endColIndex = startColIndex + td.colspan - 1
        if (
          targetRowIndex >= startRowIndex &&
          targetRowIndex <= endRowIndex &&
          colIndex >= startColIndex &&
          colIndex <= endColIndex
        ) {
          return td
        }
      }
    }
    return null
  }

  /** 按当前页可用高度拆分表格，返回从本页开始的全部 fragment。 */
  public split(payload: ISplitTableFragmentsPayload): {
    startOnNewPage: boolean
    fragments: ITableFragmentDescriptor[]
  } {
    const {
      sourceTable,
      logicalTableId,
      logicalTableIndex,
      availableHeight,
      pageContentHeight,
      rowMargin,
      pageStartOffsetY = 0
    } = payload

    let remainingHeight = availableHeight
    let currentPageContentHeight = pageContentHeight
    const pageStartAvailableHeight = Math.max(
      0,
      pageContentHeight - pageStartOffsetY
    )
    let workingFragment = this.createInitialFragment(
      sourceTable,
      logicalTableId,
      logicalTableIndex
    )
    let fragmentOrder = 0
    let startOnNewPage = false
    const fragments: ITableFragmentDescriptor[] = []
    const maxFragmentCount =
      (sourceTable.trList || []).reduce(
        (pre, tr) =>
          pre +
          tr.tdList.reduce(
            (tdPre, td) => tdPre + Math.max(1, td.rowList?.length || 1),
            0
          ),
        0
      ) + 1

    while (fragments.length < maxFragmentCount) {
      const workingHeight = workingFragment.height || 0
      const splitResult = this.splitFragmentByAvailableHeight({
        fragment: workingFragment,
        availableHeight: remainingHeight,
        pageContentHeight: currentPageContentHeight,
        rowMargin
      })

      if (splitResult.moveToNextPage) {
        if (!fragments.length) {
          startOnNewPage = true
        }
        remainingHeight = pageStartAvailableHeight
        currentPageContentHeight = pageStartAvailableHeight
        continue
      }

      const headFragment = this.decorateFragment(
        splitResult.head,
        logicalTableId,
        logicalTableIndex,
        fragmentOrder
      )
      const isPageStartFragment =
        (fragmentOrder === 0 && startOnNewPage) || fragmentOrder > 0
      if (isPageStartFragment) {
        headFragment.pageStartOffsetY = pageStartOffsetY
      }
      fragments.push(headFragment)

      if (!splitResult.tail) break

      fragmentOrder++
      if ((splitResult.tail.height || 0) >= workingHeight) {
        const tailFragment = this.decorateFragment(
          splitResult.tail,
          logicalTableId,
          logicalTableIndex,
          fragmentOrder
        )
        if (tailFragment.fragmentOrder > 0) {
          tailFragment.pageStartOffsetY = pageStartOffsetY
        }
        fragments.push(tailFragment)
        break
      }
      workingFragment = this.decorateFragment(
        splitResult.tail,
        logicalTableId,
        logicalTableIndex,
        fragmentOrder
      )
      remainingHeight = pageStartAvailableHeight
      currentPageContentHeight = pageStartAvailableHeight
    }

    return { startOnNewPage, fragments }
  }

  /** 从逻辑表格创建初始 fragment。第一页 fragment 与逻辑表格共享逻辑 tableId。 */
  private createInitialFragment(
    sourceTable: IElement,
    logicalTableId: string,
    logicalTableIndex: number
  ): ITableFragmentDescriptor {
    const trList = deepClone(sourceTable.trList || [])
    this.ensureFragmentOriginMeta(trList)
    return {
      tableId: sourceTable.id || logicalTableId,
      logicalTableId,
      logicalTableIndex,
      fragmentOrder: 0,
      colgroup: deepClone(sourceTable.colgroup || []),
      trList,
      borderType: sourceTable.borderType,
      borderColor: sourceTable.borderColor,
      borderWidth: sourceTable.borderWidth,
      borderExternalWidth: sourceTable.borderExternalWidth,
      width: sourceTable.width || 0,
      height: sourceTable.height || 0
    }
  }

  /** 把单个 fragment 按当前页剩余高度继续拆成 head / tail。 */
  private splitFragmentByAvailableHeight(
    payload: ISplitTableFragmentPayload
  ): ISplitTableFragmentResult {
    const { fragment, availableHeight, pageContentHeight, rowMargin } = payload
    const scale = this.draw.getOptions().scale
    const tdPadding = this.draw.getOptions().table.tdPadding
    const tdPaddingHeight = tdPadding[0] + tdPadding[2]
    const rowMarginHeight = rowMargin * 2
    const firstTrHeight = fragment.trList?.[0]?.height
      ? fragment.trList[0].height * scale
      : 0

    if ((fragment.height || 0) * scale + rowMarginHeight <= availableHeight) {
      return { head: fragment, tail: null, moveToNextPage: false }
    }

    if (
      availableHeight < firstTrHeight + rowMarginHeight &&
      availableHeight < pageContentHeight &&
      !this.canFitFirstRowMinimum(fragment, availableHeight, rowMargin, scale)
    ) {
      return { head: fragment, tail: null, moveToNextPage: true }
    }

    const trList = fragment.trList || []
    let splitTrIndex = -1
    let splitTrPreHeight = availableHeight - rowMargin
    let consumedHeight = 0

    for (let r = 0; r < trList.length; r++) {
      const tr = trList[r]
      if (!tr.repeatOnPageStart && consumedHeight + tr.height * scale > splitTrPreHeight) {
        splitTrIndex = r
        splitTrPreHeight -= consumedHeight
        break
      }
      consumedHeight += tr.height * scale
    }

    if (!~splitTrIndex) {
      return { head: fragment, tail: null, moveToNextPage: false }
    }

    const defaultTrMinHeight = this.draw.getOptions().table.defaultTrMinHeight
    if (
      splitTrIndex > 0 &&
      splitTrPreHeight < defaultTrMinHeight * scale &&
      !this.hasCarryCellAtSplitRow(trList, splitTrIndex, fragment)
    ) {
      return this.splitFragmentBeforeRow({
        fragment,
        splitTrIndex
      })
    }

    const splitTr = trList[splitTrIndex]
    const tailCarryTr: ITableFragmentRow = {
      id: getUUID(),
      originId: splitTr.originId || splitTr.id,
      height: 0,
      tdList: []
    }

    const processedCellIdSet = new Set<string>()
    const headCarryHeightList: IFragmentCarryHeightItem[] = []
    const tailCarryHeightList: IFragmentCarryHeightItem[] = []

    const colCount = this.getFragmentColumnCount(fragment)
    for (let c = 0; c < colCount; c++) {
      const splitTd = this.getCoveringCell(trList, splitTrIndex, c)
      if (!splitTd) continue
      const processedCellId = splitTd.originId || splitTd.id
      if (!processedCellId || processedCellIdSet.has(processedCellId)) continue
      processedCellIdSet.add(processedCellId)

      const originalStartRowIndex = splitTd.rowIndex ?? splitTrIndex
      const originalEndRowIndex = originalStartRowIndex + splitTd.rowspan - 1
      const headRowspan = splitTrIndex - originalStartRowIndex + 1
      const tailRowspan = originalEndRowIndex - splitTrIndex + 1
      const tailCarryTd: ITableFragmentCell = {
        ...deepClone(splitTd),
        id: getUUID(),
        originId: splitTd.originId || splitTd.id,
        cellOriginTrId:
          splitTd.cellOriginTrId ||
          trList[originalStartRowIndex].originId ||
          trList[originalStartRowIndex].id,
        rowspan: Math.max(1, tailRowspan),
        value: [],
        rowList: []
      }

      let splitTdPreHeight = splitTrPreHeight
      for (let s = originalStartRowIndex; s < splitTrIndex; s++) {
        splitTdPreHeight += trList[s].height * scale
      }
      const splitTdInset = getTableCellContentInset(fragment, splitTd)
      const splitTdVerticalPadding =
        tdPaddingHeight + splitTdInset.top + splitTdInset.bottom
      let splitTdPreRowHeight = 0
      let splitTdRowIndex = -1
      for (let r = 0; r < (splitTd.rowList?.length || 0); r++) {
        const row = splitTd.rowList![r]
        if (
          row.height + splitTdPreRowHeight + splitTdVerticalPadding * scale >
          splitTdPreHeight
        ) {
          splitTdRowIndex = r
          break
        }
        splitTdPreRowHeight += row.height
      }
      if (~splitTdRowIndex) {
        const movedRowList = splitTd.rowList!.splice(splitTdRowIndex)
        tailCarryTd.rowList = movedRowList
        tailCarryTd.value = movedRowList.map(row => row.elementList).flat()
        splitTd.value = splitTd.rowList!.map(row => row.elementList).flat()
        const movedHeight = movedRowList.reduce((pre, cur) => pre + cur.height / scale, 0)
        tailCarryTd.mainHeight = movedHeight
          ? movedHeight + splitTdVerticalPadding
          : 0
        splitTd.mainHeight! -= movedHeight
      }
      splitTd.rowspan = Math.max(1, headRowspan)
      headCarryHeightList.push({
        td: splitTd,
        reservedHeight: this.getRowHeightRange(trList, originalStartRowIndex, splitTrIndex - 1)
      })
      tailCarryHeightList.push({
        td: tailCarryTd,
        reservedHeight: this.getRowHeightRange(trList, splitTrIndex + 1, originalEndRowIndex)
      })
      tailCarryTr.tdList.push(tailCarryTd)
    }

    const headTrHeight = this.computeFragmentCarryRowHeight(
      fragment,
      headCarryHeightList,
      tdPaddingHeight,
      scale,
      defaultTrMinHeight
    )
    const tailTrHeight = this.computeFragmentCarryRowHeight(
      fragment,
      tailCarryHeightList,
      tdPaddingHeight,
      scale,
      defaultTrMinHeight
    )

    splitTr.height = headTrHeight
    splitTr.tdList.forEach(td => {
      td.realHeight = headTrHeight
      td.height = headTrHeight
    })
    tailCarryTr.originHeight = tailTrHeight
    tailCarryTr.height = tailTrHeight

    const tailTrList = trList.splice(splitTrIndex + 1)
    tailTrList.unshift(tailCarryTr)
    fragment.height = this.computeFragmentHeight(trList)

    return this.createSplitResult(fragment, tailTrList)
  }

  private splitFragmentBeforeRow(payload: {
    fragment: ITableFragmentDescriptor
    splitTrIndex: number
  }): ISplitTableFragmentResult {
    const { fragment, splitTrIndex } = payload
    const trList = fragment.trList || []
    const tailTrList = trList.splice(splitTrIndex)
    fragment.height = this.computeFragmentHeight(trList)

    return this.createSplitResult(fragment, tailTrList)
  }

  private createSplitResult(
    fragment: ITableFragmentDescriptor,
    tailTrList: ITableFragmentRow[]
  ): ISplitTableFragmentResult {
    this.prependRepeatedPageStartRows(fragment.trList || [], tailTrList)
    const tailFragment = this.createTailFragment(fragment, tailTrList)

    this.draw.getTableParticle().computeRowColInfo(fragment as unknown as IElement)
    this.draw.getTableParticle().computeRowColInfo(tailFragment as unknown as IElement)

    return { head: fragment, tail: tailFragment, moveToNextPage: false }
  }

  private prependRepeatedPageStartRows(
    sourceTrList: ITableFragmentRow[],
    tailTrList: ITableFragmentRow[]
  ) {
    const repeatTrList = sourceTrList.filter(tr => tr.repeatOnPageStart)
    if (repeatTrList.length) {
      const repeatedHeadTrList = deepClone(repeatTrList)
      repeatedHeadTrList.forEach(tr => (tr.id = getUUID()))
      this.ensureFragmentOriginMeta(repeatedHeadTrList)
      tailTrList.unshift(...repeatedHeadTrList)
    }
  }

  private createTailFragment(
    fragment: ITableFragmentDescriptor,
    tailTrList: ITableFragmentRow[]
  ): ITableFragmentDescriptor {
    return {
      tableId: getUUID(),
      logicalTableId: fragment.logicalTableId,
      logicalTableIndex: fragment.logicalTableIndex,
      fragmentOrder: fragment.fragmentOrder + 1,
      colgroup: fragment.colgroup,
      trList: tailTrList,
      borderType: fragment.borderType,
      borderColor: fragment.borderColor,
      borderWidth: fragment.borderWidth,
      borderExternalWidth: fragment.borderExternalWidth,
      width: fragment.width,
      height: this.computeFragmentHeight(tailTrList)
    }
  }

  /** 为拆分后的 fragment 补齐逻辑 table 元信息与 fragment 顺序。 */
  private decorateFragment(
    fragment: ITableFragmentDescriptor,
    logicalTableId: string,
    logicalTableIndex: number,
    fragmentOrder: number
  ) {
    this.ensureFragmentOriginMeta(fragment.trList || [])
    fragment.logicalTableId = logicalTableId
    fragment.logicalTableIndex = logicalTableIndex
    fragment.fragmentOrder = fragmentOrder
    fragment.tableId = fragmentOrder === 0 ? logicalTableId : fragment.tableId || getUUID()
    return fragment
  }

  /** 计算跨页续接行在当前 fragment 中应保留的高度。 */
  private computeFragmentCarryRowHeight(
    fragment: ITableFragmentDescriptor,
    carryHeightList: IFragmentCarryHeightItem[],
    tdPaddingHeight: number,
    scale: number,
    fallbackMinHeight = 0
  ) {
    let rowHeight = fallbackMinHeight
    for (let d = 0; d < carryHeightList.length; d++) {
      const { td, reservedHeight } = carryHeightList[d]
      const tdRowListHeight = td.rowList?.reduce((pre, cur) => pre + cur.height, 0) || 0
      const tdInset = getTableCellContentInset(fragment, td)
      const tdVerticalPadding = tdPaddingHeight + tdInset.top + tdInset.bottom
      const tdContentHeight = tdRowListHeight > 0 ? tdRowListHeight / scale + tdVerticalPadding : td.mainHeight || 0
      const tdCarryRowHeight = Math.max(fallbackMinHeight, tdContentHeight - reservedHeight)
      if (tdCarryRowHeight > rowHeight) rowHeight = tdCarryRowHeight
    }
    return rowHeight
  }

  /** 判断首行虽然整体放不下，但当前页是否至少能容纳首行的最小高度。 */
  private canFitFirstRowMinimum(
    fragment: ITableFragmentDescriptor,
    availableHeight: number,
    rowMargin: number,
    scale: number
  ) {
    const firstTr = fragment.trList?.[0]
    if (!firstTr) return false
    const minHeight = this.draw.getOptions().table.defaultTrMinHeight * scale
    return availableHeight >= minHeight + rowMargin
  }

  /** 计算若干连续行的总高度。 */
  private getRowHeightRange(
    trList: ITableFragmentRow[],
    startRowIndex: number,
    endRowIndex: number
  ) {
    if (endRowIndex < startRowIndex) return 0
    let height = 0
    for (let rowIndex = startRowIndex; rowIndex <= endRowIndex; rowIndex++) {
      height += trList[rowIndex]?.height || 0
    }
    return height
  }

  /** 计算整个 fragment 的总高度。 */
  private computeFragmentHeight(trList: ITableFragmentRow[]) {
    return trList.reduce((pre, cur) => pre + (cur.originHeight || cur.height), 0)
  }

  /** 判断当前拆分行是否被上方 rowspan 单元格覆盖。 */
  private hasCarryCellAtSplitRow(
    trList: ITableFragmentRow[],
    splitTrIndex: number,
    fragment: ITableFragmentDescriptor
  ) {
    const colCount = this.getFragmentColumnCount(fragment)
    for (let colIndex = 0; colIndex < colCount; colIndex++) {
      const coveringCell = this.getCoveringCell(trList, splitTrIndex, colIndex)
      if (!coveringCell) continue
      const startRowIndex = coveringCell.rowIndex ?? splitTrIndex
      if (startRowIndex < splitTrIndex) {
        return true
      }
    }
    return false
  }

  /** 获取 fragment 的逻辑列数；缺省 colgroup 时从单元格覆盖范围兜底推导。 */
  private getFragmentColumnCount(fragment: ITableFragmentDescriptor) {
    const colgroupLength = fragment.colgroup?.length || 0
    if (colgroupLength > 0) {
      return colgroupLength
    }

    return (fragment.trList || []).reduce((max, tr, trIndex) => {
      const rowMax = tr.tdList.reduce((tdMax, td, tdIndex) => {
        const colIndex = td.colIndex ?? tdIndex
        return Math.max(tdMax, colIndex + td.colspan)
      }, 0)
      return Math.max(max, rowMax, trIndex === 0 ? tr.tdList.length : 0)
    }, 0)
  }
}
