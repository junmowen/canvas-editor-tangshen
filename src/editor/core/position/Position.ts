import { ElementType, RowFlex, VerticalAlign } from '../..'
import { ZERO } from '../../dataset/constant/Common'
import {
  IComputePageRowPositionPayload,
  IComputePageRowPositionResult,
  IComputeRowPositionPayload,
  IFloatPosition,
  ISetSurroundPositionPayload
} from '../../interface/Position'
import { IEditorOption } from '../../interface/Editor'
import { IElement, IElementPosition } from '../../interface/Element'
import { IPositionContext } from '../../interface/Position'
import { Draw } from '../draw/Draw'
import { deepClone, isRectIntersect } from '../../utils'
import { ImageDisplay } from '../../dataset/enum/Common'
import { DeepRequired } from '../../interface/Common'
import { EventBus } from '../event/eventbus/EventBus'
import { EventBusMap } from '../../interface/EventBus'
import { getIsBlockElement } from '../../utils/element'
import { getTableCellContentInset } from '../table/layout/TableCellContentInset'
import { forEachTableCell } from '../table/utils/TableCellTraversal'
import { installPositionHitTestMethods } from './PositionHitTestMethods'

// 页内行带索引。用于把“按整页扫描位置列表”的命中过程
// 缩到“先定位行带，再在局部范围内继续判断”。
type TPageRowBand = {
  rowNo: number
  top: number
  bottom: number
  start: number
  end: number
}

/**
 * 基础位置服务。
 *
 * 职责边界：
 * 1. 管理布局态 / 原始态位置列表；
 * 2. 提供正文、浮动元素、页边界的基础命中；
 * 3. 不再承接复杂表格语义，表格主命中已下沉到 TableHitTestService。
 */
export class Position {
  private cursorPosition: IElementPosition | null
  private positionContext: IPositionContext
  private positionList: IElementPosition[]
  private floatPositionList: IFloatPosition[]
  private positionListPool: IElementPosition[]
  private poolIndex: number
  private isComputingAllPositions: boolean
  private positionLookupMapCache: WeakMap<IElementPosition[], Map<string, IElementPosition>>
  private pageRowBandsLookupMapCache: WeakMap<IElementPosition[], Map<number, TPageRowBand[]>>

  private draw: Draw
  private eventBus: EventBus<EventBusMap>
  private options: DeepRequired<IEditorOption>

  constructor(draw: Draw) {
    this.positionList = []
    this.floatPositionList = []
    this.positionListPool = []
    this.poolIndex = 0
    this.isComputingAllPositions = false
    this.cursorPosition = null
    this.positionContext = {
      isTable: false,
      isControl: false
    }
    this.positionLookupMapCache = new WeakMap()
    this.pageRowBandsLookupMapCache = new WeakMap()

    this.draw = draw
    this.eventBus = draw.getEventBus()
    this.options = draw.getOptions()
  }

  public getFloatPositionList(): IFloatPosition[] {
    return this.floatPositionList
  }

  private normalizeTablePositionList(
    positionList: IElementPosition[]
  ): IElementPosition[] {
    // 表格内部 positionList 在局部 cell 内通常从 0 开始重新编号，
    // 这里统一重排成连续局部索引，供 cell 内命中与导航使用。
    return positionList.map((position, index) => ({
      ...position,
      index
    }))
  }

  public getTablePositionList(
    sourceElementList: IElement[]
  ): IElementPosition[] {
    // 当前 positionContext 落在表格内时，优先尝试拿到“当前逻辑 cell 的连续位置列表”。
    // paged / fragment / pagingOriginId 等差异都在这里统一收口。
    const { index, trIndex, tdIndex, tableId, tdId } = this.positionContext
    const tableCell =
      index !== undefined && trIndex !== undefined && tdIndex !== undefined
        ? this.draw.getTargetResolver().resolveTableTdByIndex({
            elementList: sourceElementList,
            tableIndex: index,
            trIndex,
            tdIndex
          })
        : null
    const table = tableCell?.table || null
    const tr = tableCell?.tr || null
    const td = tableCell?.td || null

    const directPositionList = td?.positionList || []
    if (directPositionList.length && !table?.pagingId) {
      return this.normalizeTablePositionList(directPositionList)
    }

    const matchedPositionList: IElementPosition[] = []
    const expectedTableIds = new Set(
      [tableId, table?.id, (table as any)?.tableId].filter(Boolean)
    )
    const expectedTdIds = new Set(
      [tdId, td?.id, td?.pagingOriginId].filter(Boolean)
    )

    sourceElementList.forEach(element => {
      if (element.type !== ElementType.TABLE) return
      const tableIdMatched =
        !expectedTableIds.size ||
        expectedTableIds.has(element.id) ||
        expectedTableIds.has((element as any).tableId) ||
        (!!table?.pagingId && element.pagingId === table.pagingId)
      if (!tableIdMatched) return

      forEachTableCell({
        tableElement: element,
        tableIndex: -1,
        visitor: ({ td: fragmentTd }) => {
          const tdIdMatched =
            !expectedTdIds.size ||
            expectedTdIds.has(fragmentTd.id) ||
            expectedTdIds.has(fragmentTd.pagingOriginId)
          if (!tdIdMatched) return
          if (fragmentTd.positionList?.length) {
            matchedPositionList.push(...fragmentTd.positionList)
          }
        }
      })
    })

    if (matchedPositionList.length) {
      return this.normalizeTablePositionList(matchedPositionList)
    }

    const pageRowFragmentPositionList: IElementPosition[] = []
    if (table?.id && tr?.id && td?.id) {
      const sliceList = this.draw
        .getTargetResolver()
        .getCellSlicesByLogicalCell({
          tableId: table.id,
          trId: tr.id,
          tdId: td.id
        })
      const fragmentTableIds = new Set(sliceList.map(slice => slice.fragmentTableId))
      const fragmentTrIds = new Set(sliceList.map(slice => slice.fragmentTrId))
      const fragmentTdIds = new Set(sliceList.map(slice => slice.fragmentTdId))

      this.draw.getPageRowList().forEach(pageRows => {
        pageRows.forEach(row => {
          const fragmentTable = row.tableFragment
          if (!fragmentTable) {
            return
          }
          const rowTableElement = row.elementList.find(
            element => element.type === ElementType.TABLE
          ) as IElement | undefined
          const fragmentTableId =
            rowTableElement?.id ||
            (rowTableElement as any)?.tableId ||
            (fragmentTable as any).id ||
            (fragmentTable as any).tableId
          if (!fragmentTableId || !fragmentTableIds.has(fragmentTableId)) {
            return
          }

          fragmentTable.trList?.forEach(fragmentTr => {
            if (!fragmentTr.id || !fragmentTrIds.has(fragmentTr.id)) {
              return
            }
            fragmentTr.tdList.forEach(fragmentTd => {
              if (!fragmentTd.id || !fragmentTdIds.has(fragmentTd.id)) {
                return
              }
              if (fragmentTd.positionList?.length) {
                pageRowFragmentPositionList.push(...fragmentTd.positionList)
              }
            })
          })
        })
      })
    }

    if (pageRowFragmentPositionList.length) {
      return this.normalizeTablePositionList(pageRowFragmentPositionList)
    }

    if (table?.pagingId && td) {
      const originTdId = td.pagingOriginId || td.id
      const positionList: IElementPosition[] = []
      sourceElementList.forEach(element => {
        if (element.type !== ElementType.TABLE || element.pagingId !== table.pagingId) {
          return
        }
        forEachTableCell({
          tableElement: element,
          tableIndex: -1,
          visitor: ({ td: fragmentTd }) => {
            if (
              fragmentTd.id === originTdId ||
              fragmentTd.pagingOriginId === originTdId
            ) {
              positionList.push(...(fragmentTd.positionList || []))
            }
          }
        })
      })
      return this.normalizeTablePositionList(positionList)
    }

    return this.normalizeTablePositionList(directPositionList)
  }

  public getPositionList(): IElementPosition[] {
    if (!this.positionContext.isTable) {
      return this.getOriginalPositionList()
    }
    const originalPositionList = this.getTablePositionList(
      this.draw.getObjectResolver().getOriginalElementList()
    )
    if (originalPositionList.length) {
      return originalPositionList
    }
    return this.getTablePositionList(this.draw.getObjectResolver().getLayoutMainElementList())
  }

  /**
   * 兼容布局态调用方使用的主文档位置列表读取方法。
   */
  public getLayoutMainPositionList(): IElementPosition[] {
    return this.positionList
  }

  public getLayoutMainPositionListByPage(pageNo: number): IElementPosition[] {
    const positionList = this.positionList
    const pageRowBands =
      this.getPageRowBandsLookupMap(positionList).get(pageNo) || []
    if (!pageRowBands.length) {
      return []
    }
    const start = pageRowBands[0].start
    const end = pageRowBands[pageRowBands.length - 1].end
    return positionList.slice(start, end + 1)
  }

  public getOriginalPositionList(): IElementPosition[] {
    const zoneManager = this.draw.getZone()
    if (zoneManager.isHeaderActive()) {
      const header = this.draw.getHeader()
      return header.getPositionList()
    }
    if (zoneManager.isFooterActive()) {
      const footer = this.draw.getFooter()
      return footer.getPositionList()
    }
    return this.positionList
  }

  public setPositionList(payload: IElementPosition[]) {
    this.positionLookupMapCache = new WeakMap()
    this.pageRowBandsLookupMapCache = new WeakMap()
    this.positionList = payload
  }

  public setFloatPositionList(payload: IFloatPosition[]) {
    this.floatPositionList = payload
  }

  public computePageRowPosition(
    payload: IComputePageRowPositionPayload
  ): IComputePageRowPositionResult {
    const {
      positionList,
      rowList,
      pageNo,
      startX,
      startY,
      startRowIndex,
      startIndex,
      innerWidth,
      zone
    } = payload
    const {
      scale,
      table: { tdPadding }
    } = this.options
    let x = startX
    let y = startY
    let index = startIndex
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      if (!curRow?.elementList?.length) continue
      // 行存在环绕的可能性均不设置行布局
      if (!curRow.isSurround) {
        // 计算行偏移量（行居中、居右）
        const curRowWidth =
          curRow.width +
          (curRow.rowFlexOffsetX || 0) +
          (curRow.rightOffsetX || 0)
        if (curRow.rowFlex === RowFlex.CENTER) {
          x += (innerWidth - curRowWidth) / 2
        } else if (curRow.rowFlex === RowFlex.RIGHT) {
          x += innerWidth - curRowWidth
        }
      }
      // 当前行X/Y轴偏移量
      x += curRow.offsetX || 0
      y += curRow.offsetY || 0
      const isInlineTableRow = curRow.elementList.some(
        element =>
          element.type === ElementType.TABLE && element.tableDisplay === 'inline'
      )
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const metrics = element.metrics
        const offsetY = this.computeElementOffsetY({
          element,
          metrics,
          rowAscent: curRow.ascent,
          isInlineTableRow
        })
        // 偏移量
        if (element.left) {
          x += element.left
        }
        const elementPreX = x
        const elementPreY = y
        
        let positionItem: IElementPosition
        if (this.isComputingAllPositions) {
          const pooledItem = this.positionListPool[this.poolIndex]
          if (pooledItem) {
            positionItem = pooledItem
            positionItem.pageNo = pageNo
            positionItem.index = index
            positionItem.value = element.value
            positionItem.element = element
            positionItem.tableFragment = element.type === ElementType.TABLE ? curRow.tableFragment : undefined
            positionItem.rowIndex = startRowIndex + i
            positionItem.rowNo = i
            positionItem.metrics = metrics
            positionItem.left = element.left || 0
            positionItem.ascent = offsetY
            positionItem.lineHeight = curRow.height
            positionItem.isFirstLetter = j === 0
            positionItem.isLastLetter = j === curRow.elementList.length - 1
            
            positionItem.coordinate.leftTop[0] = x
            positionItem.coordinate.leftTop[1] = y
            positionItem.coordinate.leftBottom[0] = x
            positionItem.coordinate.leftBottom[1] = y + curRow.height
            positionItem.coordinate.rightTop[0] = x + metrics.width
            positionItem.coordinate.rightTop[1] = y
            positionItem.coordinate.rightBottom[0] = x + metrics.width
            positionItem.coordinate.rightBottom[1] = y + curRow.height
          } else {
            positionItem = {
              pageNo,
              index,
              value: element.value,
              element,
              tableFragment:
                element.type === ElementType.TABLE ? curRow.tableFragment : undefined,
              rowIndex: startRowIndex + i,
              rowNo: i,
              metrics,
              left: element.left || 0,
              ascent: offsetY,
              lineHeight: curRow.height,
              isFirstLetter: j === 0,
              isLastLetter: j === curRow.elementList.length - 1,
              coordinate: {
                leftTop: [x, y],
                leftBottom: [x, y + curRow.height],
                rightTop: [x + metrics.width, y],
                rightBottom: [x + metrics.width, y + curRow.height]
              }
            }
            this.positionListPool.push(positionItem)
          }
          this.poolIndex++
        } else {
          positionItem = {
            pageNo,
            index,
            value: element.value,
            element,
            tableFragment:
              element.type === ElementType.TABLE ? curRow.tableFragment : undefined,
            rowIndex: startRowIndex + i,
            rowNo: i,
            metrics,
            left: element.left || 0,
            ascent: offsetY,
            lineHeight: curRow.height,
            isFirstLetter: j === 0,
            isLastLetter: j === curRow.elementList.length - 1,
            coordinate: {
              leftTop: [x, y],
              leftBottom: [x, y + curRow.height],
              rightTop: [x + metrics.width, y],
              rightBottom: [x + metrics.width, y + curRow.height]
            }
          }
        }
        // 缓存浮动元素信息
        if (
          element.imgDisplay === ImageDisplay.SURROUND ||
          element.imgDisplay === ImageDisplay.TIGHT ||
          element.imgDisplay === ImageDisplay.FLOAT_TOP ||
          element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
        ) {
          // 浮动元素使用上一位置信息
          const prePosition = positionList[positionList.length - 1]
          if (prePosition) {
            positionItem.metrics = prePosition.metrics
            positionItem.coordinate = prePosition.coordinate
          }
          // 兼容浮动元素初始坐标为空的情况-默认使用左上坐标
          if (!element.imgFloatPosition) {
            element.imgFloatPosition = {
              x,
              y,
              pageNo
            }
          }
          this.floatPositionList.push({
            pageNo,
            element,
            position: positionItem,
            isTable: payload.isTable,
            index: payload.index,
            tdIndex: payload.tdIndex,
            trIndex: payload.trIndex,
            tdValueIndex: index,
            zone
          })
        }
        positionList.push(positionItem)
        index++
        x += metrics.width
        // 计算表格内元素位置
        if (element.type === ElementType.TABLE && !element.hide) {
          const tablePreX = elementPreX
          const tablePreY = elementPreY
          const tableNextX = x
          const tableNextY = y
          const tableSource = curRow.tableFragment || element
          if (!tableSource.trList?.length) {
            continue
          }
          const tdPaddingHeight = tdPadding[0] + tdPadding[2]
          for (let t = 0; t < tableSource.trList.length; t++) {
            const tr = tableSource.trList[t]
            for (let d = 0; d < tr.tdList!.length; d++) {
              const td = tr.tdList[d]
              td.positionList = []
              const rowList = td.rowList!
              const contentInset = getTableCellContentInset(tableSource, td)
              const tdHorizontalPadding =
                tdPadding[1] +
                tdPadding[3] +
                contentInset.left +
                contentInset.right
              const drawRowResult = this.computePageRowPosition({
                positionList: td.positionList,
                rowList,
                pageNo,
                startRowIndex: 0,
                startIndex: 0,
                startX:
                  (td.x! + tdPadding[3] + contentInset.left) * scale +
                  tablePreX,
                startY:
                  (td.y! + tdPadding[0] + contentInset.top) * scale +
                  tablePreY,
                innerWidth: Math.max(0, td.width! - tdHorizontalPadding) * scale,
                isTable: true,
                index: index - 1,
                tdIndex: d,
                trIndex: t,
                zone
              })
              // 垂直对齐方式
              if (
                td.verticalAlign === VerticalAlign.MIDDLE ||
                td.verticalAlign === VerticalAlign.BOTTOM
              ) {
                const rowsHeight = rowList.reduce(
                  (pre, cur) => pre + cur.height,
                  0
                )
                const blankHeight =
                  (td.height! -
                    tdPaddingHeight -
                    contentInset.top -
                    contentInset.bottom) *
                    scale -
                  rowsHeight
                const offsetHeight =
                  td.verticalAlign === VerticalAlign.MIDDLE
                    ? blankHeight / 2
                    : blankHeight
                if (Math.floor(offsetHeight) > 0) {
                  td.positionList.forEach(tdPosition => {
                    const {
                      coordinate: { leftTop, leftBottom, rightBottom, rightTop }
                    } = tdPosition
                    leftTop[1] += offsetHeight
                    leftBottom[1] += offsetHeight
                    rightBottom[1] += offsetHeight
                    rightTop[1] += offsetHeight
                  })
                }
              }
              x = drawRowResult.x
              y = drawRowResult.y
            }
          }
          // 恢复初始x、y
          x = tableNextX
          y = tableNextY
        }
      }
      x = startX
      y += curRow.height
    }
    return { x, y, index }
  }

  private computeElementOffsetY(payload: {
    element: IElement
    metrics: IElementPosition['metrics']
    rowAscent: number
    isInlineTableRow: boolean
  }) {
    const { element, metrics, rowAscent, isInlineTableRow } = payload
    if (isInlineTableRow && element.type !== ElementType.TABLE) {
      const rowMargin =
        this.options.defaultBasicRowMarginHeight *
        (element.rowMargin ?? this.options.defaultRowMargin)
      return Math.max(0, metrics.boundingBoxAscent + rowMargin)
    }
    return !element.hide &&
      ((element.imgDisplay !== ImageDisplay.INLINE &&
        element.type === ElementType.IMAGE) ||
        element.type === ElementType.LATEX)
      ? rowAscent - metrics.height
      : rowAscent
  }

  public computePositionList() {
    this.isComputingAllPositions = true
    this.poolIndex = 0
    // 置空原位置信息
    this.positionLookupMapCache = new WeakMap()
    this.pageRowBandsLookupMapCache = new WeakMap()
    this.positionList = []
    // 按每页行计算
    const innerWidth = this.draw.getInnerWidth()
    const pageRowList = this.draw.getPageRowList()
    const margins = this.draw.getMargins()
    const startX = margins[3]
    // 起始位置受页眉影响
    const header = this.draw.getHeader()
    const extraHeight = header.getExtraHeight()
    const startY = margins[0] + extraHeight
    let startRowIndex = 0
    for (let i = 0; i < pageRowList.length; i++) {
      const rowList = pageRowList[i]
      const startIndex = rowList[0]?.startIndex
      this.computePageRowPosition({
        positionList: this.positionList,
        rowList,
        pageNo: i,
        startRowIndex,
        startIndex,
        startX,
        startY,
        innerWidth
      })
      startRowIndex += rowList.length
    }
    this.isComputingAllPositions = false
  }

  public computePositionListFromPage(startPageNo: number) {
    const pageRowList = this.draw.getPageRowList()
    if (!pageRowList.length || startPageNo <= 0) {
      this.computePositionList()
      return
    }
    this.positionLookupMapCache = new WeakMap()
    this.pageRowBandsLookupMapCache = new WeakMap()
    const nextPositionList = this.positionList.filter(
      position => position.pageNo < startPageNo
    )
    const innerWidth = this.draw.getInnerWidth()
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const header = this.draw.getHeader()
    const extraHeight = header.getExtraHeight()
    const startY = margins[0] + extraHeight
    let startRowIndex = 0
    for (let pageNo = 0; pageNo < startPageNo; pageNo++) {
      startRowIndex += pageRowList[pageNo]?.length || 0
    }
    for (let pageNo = startPageNo; pageNo < pageRowList.length; pageNo++) {
      const rowList = pageRowList[pageNo]
      const startIndex = rowList[0]?.startIndex
      this.computePageRowPosition({
        positionList: nextPositionList,
        rowList,
        pageNo,
        startRowIndex,
        startIndex,
        startX,
        startY,
        innerWidth
      })
      startRowIndex += rowList.length
    }
    this.positionList = nextPositionList
  }

  public computeRowPosition(
    payload: IComputeRowPositionPayload
  ): IElementPosition[] {
    const { row, innerWidth } = payload
    const positionList: IElementPosition[] = []
    this.computePageRowPosition({
      positionList,
      innerWidth,
      rowList: [deepClone(row)],
      pageNo: 0,
      startX: 0,
      startY: 0,
      startIndex: 0,
      startRowIndex: 0
    })
    return positionList
  }

  public setCursorPosition(position: IElementPosition | null) {
    this.cursorPosition = position
  }

  /** 更新光标的逻辑索引，用于输入态 chunk patch 前保持删除、回车等操作读取最新索引。 */
  public setCursorLogicalIndex(index: number | null) {
    if (index === null || index < 0) {
      this.cursorPosition = null
      return
    }
    // 表格上下文中的 index 是 td 局部索引，不能直接读取主文档 positionList；
    // 否则会把光标误定位到正文第一页，输入代理 focus 后触发整页滚动回顶部。
    const activePositionList = this.getPositionList()
    const currentPosition = activePositionList[index]
    if (currentPosition) {
      this.cursorPosition = currentPosition
      return
    }
    if (!this.cursorPosition) {
      return
    }
    const element = this.draw.getObjectResolver().getElement(index)
    // 位置坐标会在 chunk patch 后刷新；这里仅修正索引和值，保证同步编辑语义正确。
    this.cursorPosition = {
      ...this.cursorPosition,
      index,
      value: element?.value || ZERO,
      element
    }
  }

  public getCursorPosition(): IElementPosition | null {
    return this.cursorPosition
  }

  private getPositionLookupMap(positionList: IElementPosition[]) {
    const cachedMap = this.positionLookupMapCache.get(positionList)
    if (cachedMap) {
      return cachedMap
    }
    const positionMap = new Map<string, IElementPosition>()
    for (let i = 0; i < positionList.length; i++) {
      const position = positionList[i]
      if (!position) continue
      positionMap.set(
        `${position.pageNo}_${position.index}`,
        position
      )
    }
    this.positionLookupMapCache.set(positionList, positionMap)
    return positionMap
  }

  private getPageRowBandsLookupMap(positionList: IElementPosition[]) {
    const cachedMap = this.pageRowBandsLookupMapCache.get(positionList)
    if (cachedMap) {
      return cachedMap
    }
    const pageRowBandsMap = new Map<number, TPageRowBand[]>()
    for (let cursor = 0; cursor < positionList.length; cursor++) {
      const position = positionList[cursor]
      if (!position) continue
      const pageRowBands = pageRowBandsMap.get(position.pageNo)
      const top = position.coordinate.leftTop[1]
      const bottom = position.coordinate.leftBottom[1]
      if (!pageRowBands) {
        pageRowBandsMap.set(position.pageNo, [
          {
            rowNo: position.rowNo,
            top,
            bottom,
            start: cursor,
            end: cursor
          }
        ])
        continue
      }
      const currentBand = pageRowBands[pageRowBands.length - 1]
      if (currentBand.rowNo === position.rowNo) {
        currentBand.top = Math.min(currentBand.top, top)
        currentBand.bottom = Math.max(currentBand.bottom, bottom)
        currentBand.end = cursor
      } else {
        pageRowBands.push({
          rowNo: position.rowNo,
          top,
          bottom,
          start: cursor,
          end: cursor
        })
      }
    }
    this.pageRowBandsLookupMapCache.set(positionList, pageRowBandsMap)
    return pageRowBandsMap
  }

  public getPositionByPageAndIndex(
    pageNo: number,
    index: number,
    positionList?: IElementPosition[]
  ): IElementPosition | null {
    const targetPositionList = positionList || this.getPositionList()
    return (
      this.getPositionLookupMap(targetPositionList).get(
        `${pageNo}_${index}`
      ) || null
    )
  }

  public getPositionContext(): IPositionContext {
    return this.positionContext
  }

  public setPositionContext(payload: IPositionContext) {
    this.eventBus.emit('positionContextChange', {
      value: payload,
      oldValue: this.positionContext
    })
    this.positionContext = payload
  }

  public setSurroundPosition(payload: ISetSurroundPositionPayload) {
    const { scale } = this.options
    const {
      pageNo,
      row,
      rowElement,
      rowElementRect,
      surroundElementList,
      availableWidth
    } = payload
    let x = rowElementRect.x
    let rowIncreaseWidth = 0
    if (
      surroundElementList.length &&
      !getIsBlockElement(rowElement) &&
      !rowElement.control?.minWidth
    ) {
      for (let s = 0; s < surroundElementList.length; s++) {
        const surroundElement = surroundElementList[s]
        const floatPosition = surroundElement.imgFloatPosition!
        if (floatPosition.pageNo !== pageNo) continue
        const surroundRect = {
          ...floatPosition,
          x: floatPosition.x * scale,
          y: floatPosition.y * scale,
          width: surroundElement.width! * scale,
          height: surroundElement.height! * scale
        }
        if (isRectIntersect(rowElementRect, surroundRect)) {
          row.isSurround = true
          // 需向左移动距离：浮动元素宽度 + 浮动元素左上坐标 - 元素左上坐标
          const translateX =
            surroundRect.width + surroundRect.x - rowElementRect.x
          rowElement.left = translateX
          // 增加行宽
          row.width += translateX
          rowIncreaseWidth += translateX
          // 下个元素起始位置：浮动元素右坐标 - 元素宽度
          x = surroundRect.x + surroundRect.width
          // 检测宽度是否足够，不够则移动到下一行，并还原状态
          if (row.width + rowElement.metrics.width > availableWidth) {
            rowElement.left = 0
            row.width -= rowIncreaseWidth
            break
          }
        }
      }
    }
    return { x, rowIncreaseWidth }
  }
}

installPositionHitTestMethods(Position)
