import { ElementType } from '../..'
import { ZERO } from '../../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../../dataset/constant/Element'
import { ControlComponent } from '../../dataset/enum/Control'
import { EditorContext } from '../../dataset/enum/Editor'
import { IControlContext } from '../../interface/Control'
import { IEditorOption } from '../../interface/Editor'
import { IElement, IElementPosition } from '../../interface/Element'
import { EventBusMap } from '../../interface/EventBus'
import { IRangeStyle } from '../../interface/Listener'
import {
  IRange,
  IRangeElementStyle,
  IRangeParagraphInfo,
  RangeRowArray,
  RangeRowMap
} from '../../interface/Range'
import { getAnchorElement } from '../../utils/element'
import { Draw } from '../draw/Draw'
import { EventBus } from '../event/eventbus/EventBus'
import { HistoryManager } from '../history/HistoryManager'
import { Listener } from '../listener/Listener'
import { Position } from '../position/Position'
import {
  resolveSelectionContentRange,
  sliceSelectionContent
} from './utils/resolveSelectionContent'
import {
  IGetTableSelectionRenderRangePayload,
  ITableSelectionRenderRange
} from '../table/selection/TableSelectionTypes'

/**
 * 表格选区投影服务。
 *
 * 当前以内嵌类形式存在于 RangeManager 内部，
 * 负责把内部 raw range 统一投影成公开 range / cursor / content range。
 */
class TableSelectionProjectionService {
  constructor(
    private readonly draw: Draw,
    private readonly hooks: {
      getRawRange: () => IRange
      resolveActiveTableLeadingOffset: () => number
      resolveActiveTableFragmentOffset: (
        leadingOffset: number,
        cursorPosition?: IElementPosition | null
      ) => number
    }
  ) {}

  public getSelectionContentRange() {
    // 统一把边界语义转换为真实内容切片范围。
    const { startIndex, endIndex } = this.hooks.getRawRange()
    return resolveSelectionContentRange(startIndex, endIndex)
  }

  public getPublicCursorPosition(): IElementPosition | null {
    // 表格闭合光标对外暴露时，需要扣掉 leading offset 与 fragment offset，
    // 保证对外 cursor 语义稳定落在逻辑单元格索引上。
    const positionContext = this.draw.getPosition().getPositionContext()
    const cursorPosition = this.draw.getPosition().getCursorPosition()
    if (!cursorPosition || !positionContext.isTable) {
      return cursorPosition
    }
    const leadingOffset = this.hooks.resolveActiveTableLeadingOffset()
    const fragmentOffset = 0
    return {
      ...cursorPosition,
      index: Math.max(0, cursorPosition.index - leadingOffset - fragmentOffset)
    }
  }

  public getPublicRange(): IRange {
    // 公开 range 与内部编辑边界不同：
    // 内部保留 fragment / leading 偏移，公开输出统一回到逻辑表格语义。
    const range = { ...this.hooks.getRawRange() }
    const positionContext = this.draw.getPosition().getPositionContext()
    const leadingOffset = positionContext.isTable
      ? this.hooks.resolveActiveTableLeadingOffset()
      : 0
    const normalizedRange = leadingOffset
      ? {
          ...range,
          startIndex: Math.max(0, range.startIndex - leadingOffset),
          endIndex: Math.max(0, range.endIndex - leadingOffset)
        }
      : range

    if (normalizedRange.startIndex === normalizedRange.endIndex) {
      const publicCursorPosition = this.draw.getPosition().getCursorPosition()
      if (publicCursorPosition && positionContext.isTable) {
        const activeSlice = this.draw
          .getTableLayoutSnapshotAccessor()
          .resolveSliceByPositionContext(positionContext)
        if (
          activeSlice &&
          normalizedRange.startIndex < activeSlice.absoluteStart
        ) {
          return normalizedRange
        }
        const fragmentOffset = this.hooks.resolveActiveTableFragmentOffset(
          leadingOffset,
          publicCursorPosition
        )
        return {
          ...normalizedRange,
          startIndex: Math.max(
            0,
            publicCursorPosition.index - leadingOffset - fragmentOffset
          ),
          endIndex: Math.max(
            0,
            publicCursorPosition.index - leadingOffset - fragmentOffset
          )
        }
      }

      const fragmentOffset = this.hooks.resolveActiveTableFragmentOffset(
        leadingOffset,
        this.draw.getPosition().getCursorPosition()
      )
      if (!fragmentOffset) {
        return normalizedRange
      }
      return {
        ...normalizedRange,
        startIndex: Math.max(0, normalizedRange.startIndex - fragmentOffset),
        endIndex: Math.max(0, normalizedRange.endIndex - fragmentOffset)
      }
    }

    const selectionContentRange = resolveSelectionContentRange(
      normalizedRange.startIndex,
      normalizedRange.endIndex
    )
    if (!selectionContentRange) {
      return normalizedRange
    }
    return {
      ...normalizedRange,
      startIndex: selectionContentRange.startIndex,
      endIndex: selectionContentRange.endIndex + 1
    }
  }

  public getRenderSelectionRange(
    payload: IGetTableSelectionRenderRangePayload = {}
  ): ITableSelectionRenderRange | null {
    const rawRange = this.hooks.getRawRange()
    const { startIndex, endIndex, isCrossRowCol } = rawRange
    if (isCrossRowCol || startIndex === endIndex) return null

    const contentRange = this.getSelectionContentRange()
    if (!contentRange) return null

    const { elementList, tableCellContext } = payload
    const positionContext = this.draw.getPosition().getPositionContext()
    const snapshotAccessor = this.draw.getTableLayoutSnapshotAccessor()
    const activeFragmentCellKey =
      snapshotAccessor.resolveSliceByPositionContext(positionContext)?.cellKey || null

    if (tableCellContext) {
      const currentSlice =
        snapshotAccessor.resolveSliceByFragmentContext(tableCellContext)
      const currentFragmentCellKey = currentSlice?.cellKey || null
      const currentCellSlices =
        snapshotAccessor.getCellSlicesByCellKey(currentFragmentCellKey)
      if (
        activeFragmentCellKey &&
        currentFragmentCellKey &&
        currentFragmentCellKey !== activeFragmentCellKey
      ) {
        return null
      }
      const fragmentRange = snapshotAccessor.resolveCellLocalRange(
        tableCellContext,
        startIndex,
        endIndex
      )
      if (fragmentRange) {
        return {
          startIndex: fragmentRange.startIndex,
          endIndex: fragmentRange.endIndex
        }
      }
      if (currentCellSlices.length > 1) {
        return null
      }
      return {
        startIndex: contentRange.startIndex,
        endIndex: contentRange.endIndex
      }
    }

    if (elementList?.length) {
      const fragmentRange = snapshotAccessor.getSelectionRangeForElementList(
        elementList,
        startIndex,
        endIndex,
        activeFragmentCellKey
      )
      if (fragmentRange) {
        return {
          startIndex: fragmentRange.startIndex,
          endIndex: fragmentRange.endIndex
        }
      }
    }

    return {
      startIndex: contentRange.startIndex,
      endIndex: contentRange.endIndex
    }
  }
}

export class RangeManager {
  private draw: Draw
  private options: Required<IEditorOption>
  private range: IRange
  private listener: Listener
  private eventBus: EventBus<EventBusMap>
  private position: Position
  private historyManager: HistoryManager
  private defaultStyle: IRangeElementStyle | null
  private selectionProjectionService: TableSelectionProjectionService

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.listener = draw.getListener()
    this.eventBus = draw.getEventBus()
    this.position = draw.getPosition()
    this.historyManager = draw.getHistoryManager()
    this.range = {
      startIndex: -1,
      endIndex: -1
    }
    this.defaultStyle = null
    this.selectionProjectionService = new TableSelectionProjectionService(draw, {
      getRawRange: () => this.range,
      resolveActiveTableLeadingOffset: () => this.getActiveTableLeadingOffset(),
      resolveActiveTableFragmentOffset: (leadingOffset, cursorPosition) =>
        this.getActiveTableFragmentOffset(leadingOffset, cursorPosition)
    })
  }

  /**
   * 统一的范围状态管理器。
   *
   * 职责边界：
   * 1. 持有当前内部编辑边界；
   * 2. 通过 projection service 输出公开 range / cursor / content range；
   * 3. 为渲染、复制、命令提供同一套范围基础设施。
   */
  public getRange(): IRange {
    return this.range
  }

  public getEditBoundaryRange(): IRange {
    return this.range
  }

  public clearRange() {
    this.setRange(-1, -1)
  }

  public setDefaultStyle(style: IRangeElementStyle | null) {
    if (!style) {
      this.defaultStyle = null
    } else {
      this.defaultStyle = {
        ...this.defaultStyle,
        ...style
      }
    }
  }

  public getDefaultStyle(): IRangeElementStyle | null {
    return this.defaultStyle
  }

  public getRangeAnchorStyle(
    elementList: IElement[],
    anchorIndex: number
  ): IElement | null {
    const anchorElement = getAnchorElement(elementList, anchorIndex)
    if (!anchorElement) return null
    return {
      ...anchorElement,
      ...this.defaultStyle
    }
  }

  public getIsRangeChange(
    startIndex: number,
    endIndex: number,
    tableId?: string,
    startTdIndex?: number,
    endTdIndex?: number,
    startTrIndex?: number,
    endTrIndex?: number
  ): boolean {
    return (
      this.range.startIndex !== startIndex ||
      this.range.endIndex !== endIndex ||
      this.range.tableId !== tableId ||
      this.range.startTdIndex !== startTdIndex ||
      this.range.endTdIndex !== endTdIndex ||
      this.range.startTrIndex !== startTrIndex ||
      this.range.endTrIndex !== endTrIndex
    )
  }

  public getIsCollapsed(): boolean {
    const { startIndex, endIndex } = this.range
    return startIndex === endIndex
  }

  public getIsSelection(): boolean {
    const { startIndex, endIndex } = this.range
    if (!~startIndex && !~endIndex) return false
    return startIndex !== endIndex
  }

  public getSelectionContentRange() {
    // 复制、剪切、选区位置列表都走这条内容范围主链。
    return this.selectionProjectionService.getSelectionContentRange()
  }

  private resolveActiveLogicalTableCell() {
    const activeSlice = this.draw
      .getTableLayoutSnapshotAccessor()
      .resolveSliceByPositionContext(this.position.getPositionContext())
    if (activeSlice) {
      return {
        tableIndex: activeSlice.logicalTableIndex,
        trIndex: activeSlice.logicalTrIndex,
        tdIndex: activeSlice.logicalTdIndex
      }
    }

    const positionContext = this.position.getPositionContext()
    if (
      positionContext.isTable &&
      positionContext.index !== undefined &&
      positionContext.trIndex !== undefined &&
      positionContext.tdIndex !== undefined
    ) {
      return {
        tableIndex: positionContext.index,
        trIndex: positionContext.trIndex,
        tdIndex: positionContext.tdIndex
      }
    }

    const { tableId, startTrIndex, startTdIndex } = this.range
    if (
      tableId &&
      startTrIndex !== undefined &&
      startTdIndex !== undefined
    ) {
      const tableIndex =
        this.draw.getTableLayoutSnapshotAccessor().resolveLogicalTableIndex(tableId) ?? -1
      if (~tableIndex) {
        return {
          tableIndex,
          trIndex: startTrIndex,
          tdIndex: startTdIndex
        }
      }
    }

    return null
  }

  private getActiveTableLeadingOffset(): number {
    const logicalCell = this.resolveActiveLogicalTableCell()
    if (!logicalCell) {
      return 0
    }
    const td =
      this.draw.getOriginalElementList()[logicalCell.tableIndex]?.trList?.[
        logicalCell.trIndex
      ]?.tdList?.[logicalCell.tdIndex]
    return td?.value?.[0]?.value === ZERO && td.value[1] ? 1 : 0
  }

  private getActiveTableFragmentOffset(
    leadingOffset: number,
    cursorPosition?: IElementPosition | null
  ): number {
    const activeSlice = this.draw
      .getTableLayoutSnapshotAccessor()
      .resolveSliceByPositionContext(this.position.getPositionContext())
    const positionContext = this.position.getPositionContext()
    const { tableId, startTrIndex, startTdIndex } = this.range
    const logicalCell = activeSlice
      ? {
          tableIndex: activeSlice.logicalTableIndex,
          trIndex: activeSlice.logicalTrIndex,
          tdIndex: activeSlice.logicalTdIndex
        }
      : positionContext.isTable &&
          positionContext.index !== undefined &&
          positionContext.trIndex !== undefined &&
          positionContext.tdIndex !== undefined
        ? {
            tableIndex: positionContext.index,
            trIndex: positionContext.trIndex,
            tdIndex: positionContext.tdIndex
          }
        : tableId &&
            startTrIndex !== undefined &&
            startTdIndex !== undefined
          ? (() => {
              const tableIndex =
                this.draw
                  .getTableLayoutSnapshotAccessor()
                  .resolveLogicalTableIndex(tableId) ?? -1
              return ~tableIndex
                ? {
                    tableIndex,
                    trIndex: startTrIndex,
                    tdIndex: startTdIndex
                  }
                : null
            })()
          : null
    if (!logicalCell || !cursorPosition) {
      return 0
    }
    const td =
      this.draw.getOriginalElementList()[logicalCell.tableIndex]?.trList?.[
        logicalCell.trIndex
      ]?.tdList?.[logicalCell.tdIndex]
    if (!td || td.rowspan > 1 || td.colspan > 1) {
      return 0
    }
    const table = this.draw.getOriginalElementList()[logicalCell.tableIndex]
    const tr = table?.trList?.[logicalCell.trIndex]
    const logicalTd = tr?.tdList?.[logicalCell.tdIndex]
    const sliceList =
      table?.id && tr?.id && logicalTd?.id
        ? this.draw
            .getTableLayoutSnapshotAccessor()
            .getCellSlicesByLogicalCell({
              tableId: table.id,
              trId: tr.id,
              tdId: logicalTd.id
            })
        : []
    if (sliceList.length <= 1) {
      return 0
    }
    const resolvedActiveSlice =
      (table?.id && tr?.id && logicalTd?.id
        ? this.draw.getTableLayoutSnapshotAccessor().resolveCellSliceByAbsoluteIndex({
            tableId: table.id,
            trId: tr.id,
            tdId: logicalTd.id,
            absoluteIndex: cursorPosition.index
          })
        : null) ||
      (table?.id && tr?.id && logicalTd?.id
        ? this.draw.getTableLayoutSnapshotAccessor().resolveCellSliceByPageNo({
            tableId: table.id,
            trId: tr.id,
            tdId: logicalTd.id,
            pageNo: cursorPosition.pageNo
          })
        : null) ||
      activeSlice ||
      null
    if (!resolvedActiveSlice) {
      return 0
    }
    return Math.max(0, resolvedActiveSlice.absoluteStart - leadingOffset)
  }

  public getPublicCursorPosition(): IElementPosition | null {
    // 对外公开光标统一从投影层读取，
    // 避免命令层和渲染层各自解释 collapsed table cursor。
    return this.selectionProjectionService.getPublicCursorPosition()
  }

  public getPublicRange(): IRange {
    // 对外公开的 command.getRange() 统一从投影层读取。
    return this.selectionProjectionService.getPublicRange()
  }

  public getRenderSelectionRange(
    payload: IGetTableSelectionRenderRangePayload = {}
  ): ITableSelectionRenderRange | null {
    return this.selectionProjectionService.getRenderSelectionRange(payload)
  }

  public getSelection(): IElement[] | null {
    const selectionContentRange = this.getSelectionContentRange()
    if (!selectionContentRange) return null
    const elementList = this.draw.getElementList()
    return sliceSelectionContent(elementList, selectionContentRange)
  }

  public getSelectionElementList(): IElement[] | null {
    if (this.range.isCrossRowCol) {
      const rowCol = this.draw.getTableParticle().getRangeRowCol()
      if (!rowCol) return null
      const elementList: IElement[] = []
      for (let r = 0; r < rowCol.length; r++) {
        const row = rowCol[r]
        for (let c = 0; c < row.length; c++) {
          const col = row[c]
          elementList.push(...col.value)
        }
      }
      return elementList
    }
    return this.getSelection()
  }

  public getTextLikeSelection(): IElement[] | null {
    const selection = this.getSelection()
    if (!selection) return null
    return selection.filter(
      s => !s.type || TEXTLIKE_ELEMENT_TYPE.includes(s.type)
    )
  }

  private getProjectedActiveRange(): IRange | null {
    const publicRange = this.getPublicRange()
    const { startIndex, endIndex } = publicRange
    if (!~startIndex && !~endIndex) {
      return null
    }
    const selectionContentRange = this.getSelectionContentRange()
    if (!selectionContentRange) {
      return publicRange
    }
    return {
      ...publicRange,
      startIndex: selectionContentRange.startIndex,
      endIndex: selectionContentRange.endIndex
    }
  }

  public getTextLikeSelectionElementList(): IElement[] | null {
    const selection = this.getSelectionElementList()
    if (!selection) return null
    return selection.filter(
      s => !s.type || TEXTLIKE_ELEMENT_TYPE.includes(s.type)
    )
  }

  // 获取光标所选位置行信息
  public getRangeRow(): RangeRowMap | null {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return null
    const { startIndex, endIndex } = activeRange
    if (!~startIndex && !~endIndex) return null
    const positionList = this.position.getPositionList()
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

  public getRangeParagraph(): RangeRowArray | null {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return null
    const { startIndex, endIndex } = activeRange
    if (!~startIndex && !~endIndex) return null
    const positionList = this.position.getPositionList()
    const elementList = this.draw.getElementList()
    const rangeRow: RangeRowArray = new Map()

    let start = startIndex
    while (start >= 0) {
      const { pageNo, rowNo } = positionList[start]
      let rowArray = rangeRow.get(pageNo)
      if (!rowArray) {
        rowArray = []
        rangeRow.set(pageNo, rowArray)
      }
      if (!rowArray.includes(rowNo)) {
        rowArray.unshift(rowNo)
      }
      const element = elementList[start]
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
        const { pageNo, rowNo } = positionList[middle]
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
    if (isCollapsed && elementList[startIndex].value === ZERO) {
      end += 1
    }
    while (end < positionList.length) {
      const element = elementList[end]
      const nextElement = elementList[end + 1]
      if (
        (element.value === ZERO && !element.listWrap) ||
        element.listId !== nextElement?.listId ||
        element.titleId !== nextElement?.titleId
      ) {
        break
      }
      const { pageNo, rowNo } = positionList[end]
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
    const positionList = this.position.getPositionList()
    const elementList = this.draw.getElementList()
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
    const elementList = this.draw.getElementList()
    const positionList = this.position.getPositionList()
    for (let p = 0; p < positionList.length; p++) {
      const position = positionList[p]
      const rowArray = rangeRow.get(position.pageNo)
      if (!rowArray) continue
      if (rowArray.includes(position.rowNo)) {
        if (!~startPositionIndex) {
          startPositionIndex = position.index
        }
        rangeElementList.push(elementList[p])
      }
    }
    if (!rangeElementList.length) return null
    return {
      elementList: rangeElementList,
      startIndex: startPositionIndex
    }
  }

  // 获取选区段落元素列表
  public getRangeParagraphElementList(): IElement[] | null {
    return this.getRangeParagraphInfo()?.elementList || null
  }

  // 获取选区表格
  public getRangeTableElement(): IElement | null {
    const positionContext = this.position.getPositionContext()
    if (!positionContext.isTable) return null
    const originalElementList = this.draw.getOriginalElementList()
    return originalElementList[positionContext.index!]
  }

  public getIsSelectAll() {
    const elementList = this.draw.getElementList()
    const { startIndex, endIndex } = this.range
    return (
      startIndex === 0 &&
      elementList.length - 1 === endIndex &&
      !this.position.getPositionContext().isTable
    )
  }

  public getIsPointInRange(x: number, y: number): boolean {
    const activeRange = this.getProjectedActiveRange()
    if (!activeRange) return false
    const { startIndex, endIndex } = activeRange
    const positionList = this.position.getPositionList()
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

  public getKeywordRangeList(payload: string): IRange[] {
    const searchMatchList = this.draw
      .getSearch()
      .getMatchList(payload, this.draw.getOriginalElementList())
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

  public getIsCanInput(): boolean {
    const { startIndex, endIndex } = this.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return false
    const elementList = this.draw.getElementList()
    const startElement = elementList[startIndex]
    if (startIndex === endIndex) {
      return (
        (startElement.controlComponent !== ControlComponent.PRE_TEXT ||
          elementList[startIndex + 1]?.controlComponent !==
            ControlComponent.PRE_TEXT) &&
        startElement.controlComponent !== ControlComponent.POST_TEXT
      )
    }
    const endElement = elementList[endIndex]
    // 选区前后不是控件 || 选区前不是控件或是后缀&&选区后不是控件或是后缀 || 选区在控件内
    return (
      (!startElement.controlId && !endElement.controlId) ||
      ((!startElement.controlId ||
        startElement.controlComponent === ControlComponent.POSTFIX) &&
        (!endElement.controlId ||
          endElement.controlComponent === ControlComponent.POSTFIX)) ||
      (!!startElement.controlId &&
        endElement.controlId === startElement.controlId &&
        endElement.controlComponent !== ControlComponent.PRE_TEXT &&
        endElement.controlComponent !== ControlComponent.POST_TEXT &&
        endElement.controlComponent !== ControlComponent.POSTFIX)
    )
  }

  public setRange(
    startIndex: number,
    endIndex: number,
    tableId?: string,
    startTdIndex?: number,
    endTdIndex?: number,
    startTrIndex?: number,
    endTrIndex?: number
  ) {
    // 判断光标是否改变
    const isChange = this.getIsRangeChange(
      startIndex,
      endIndex,
      tableId,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    )
    if (isChange) {
      this.range.startIndex = startIndex
      this.range.endIndex = endIndex
      this.range.tableId = tableId
      this.range.startTdIndex = startTdIndex
      this.range.endTdIndex = endTdIndex
      this.range.startTrIndex = startTrIndex
      this.range.endTrIndex = endTrIndex
      this.range.isCrossRowCol = !!(
        startTdIndex ||
        endTdIndex ||
        startTrIndex ||
        endTrIndex
      )
      this.setDefaultStyle(null)
    }
    this.range.zone = this.draw.getZone().getZone()
    // 激活控件
    const control = this.draw.getControl()
    if (~startIndex && ~endIndex) {
      const elementList = this.draw.getElementList()
      const element = elementList[startIndex]
      if (element?.controlId) {
        control.initControl()
        return
      }
    }
    control.destroyControl()
  }

  public replaceRange(range: IRange) {
    this.setRange(
      range.startIndex,
      range.endIndex,
      range.tableId,
      range.startTdIndex,
      range.endTdIndex,
      range.startTrIndex,
      range.endTrIndex
    )
  }

  public shrinkRange() {
    const { startIndex, endIndex } = this.range
    if (startIndex === endIndex || (!~startIndex && !~endIndex)) return
    this.replaceRange({
      ...this.range,
      startIndex: endIndex
    })
  }

  public setRangeStyle() {
    const rangeStyleChangeListener = this.listener.rangeStyleChange
    const isSubscribeRangeStyleChange =
      this.eventBus.isSubscribe('rangeStyleChange')
    if (!rangeStyleChangeListener && !isSubscribeRangeStyleChange) return
    // 结束光标位置
    const { startIndex, endIndex, isCrossRowCol } = this.range
    if (!~startIndex && !~endIndex) return
    let curElement: IElement | null
    if (isCrossRowCol) {
      // 单元格选择以当前表格定位
      const originalElementList = this.draw.getOriginalElementList()
      const positionContext = this.position.getPositionContext()
      curElement = originalElementList[positionContext.index!]
    } else {
      const index = ~endIndex ? endIndex : 0
      // 行首以第一个非换行符元素定位
      const elementList = this.draw.getElementList()
      curElement = this.getRangeAnchorStyle(elementList, index)
    }
    if (!curElement) return
    // 选取元素列表
    const curElementList = this.getSelection() || [curElement]
    // 类型
    const type = curElement.type || ElementType.TEXT
    // 富文本
    const font = curElement.font || this.options.defaultFont
    const size = curElement.size || this.options.defaultSize
    const bold = !~curElementList.findIndex(el => !el.bold)
    const italic = !~curElementList.findIndex(el => !el.italic)
    const underline = !~curElementList.findIndex(
      el => !el.underline && !el.control?.underline
    )
    const strikeout = !~curElementList.findIndex(el => !el.strikeout)
    const color = curElement.color || null
    const highlight = curElement.highlight || null
    const rowFlex = curElement.rowFlex || null
    const rowMargin = curElement.rowMargin ?? this.options.defaultRowMargin
    const dashArray = curElement.dashArray || []
    const level = curElement.level || null
    const listType = curElement.listType || null
    const listStyle = curElement.listStyle || null
    const listLevel = curElement.listLevel ?? null
    const textDecoration = underline ? curElement.textDecoration || null : null
    // 菜单
    const painter = !!this.draw.getPainterStyle()
    const undo = this.historyManager.isCanUndo()
    const redo = this.historyManager.isCanRedo()
    // 组信息
    const groupIds = curElement.groupIds || null
    // 扩展字段
    const extension = curElement.extension ?? null
    const rangeStyle: IRangeStyle = {
      type,
      undo,
      redo,
      painter,
      font,
      size,
      bold,
      italic,
      underline,
      strikeout,
      color,
      highlight,
      rowFlex,
      rowMargin,
      dashArray,
      level,
      listType,
      listStyle,
      listLevel,
      groupIds,
      textDecoration,
      extension
    }
    if (rangeStyleChangeListener) {
      rangeStyleChangeListener(rangeStyle)
    }
    if (isSubscribeRangeStyleChange) {
      this.eventBus.emit('rangeStyleChange', rangeStyle)
    }
  }

  public recoveryRangeStyle() {
    const rangeStyleChangeListener = this.listener.rangeStyleChange
    const isSubscribeRangeStyleChange =
      this.eventBus.isSubscribe('rangeStyleChange')
    if (!rangeStyleChangeListener && !isSubscribeRangeStyleChange) return
    const font = this.options.defaultFont
    const size = this.options.defaultSize
    const rowMargin = this.options.defaultRowMargin
    const painter = !!this.draw.getPainterStyle()
    const undo = this.historyManager.isCanUndo()
    const redo = this.historyManager.isCanRedo()
    const rangeStyle: IRangeStyle = {
      type: null,
      undo,
      redo,
      painter,
      font,
      size,
      bold: false,
      italic: false,
      underline: false,
      strikeout: false,
      color: null,
      highlight: null,
      rowFlex: null,
      rowMargin,
      dashArray: [],
      level: null,
      listType: null,
      listStyle: null,
      listLevel: null,
      groupIds: null,
      textDecoration: null,
      extension: null
    }
    if (rangeStyleChangeListener) {
      rangeStyleChangeListener(rangeStyle)
    }
    if (isSubscribeRangeStyleChange) {
      this.eventBus.emit('rangeStyleChange', rangeStyle)
    }
  }

  public shrinkBoundary(context: IControlContext = {}) {
    const elementList = context.elementList || this.draw.getElementList()
    const range = context.range || this.getEditBoundaryRange()
    const { startIndex, endIndex } = range
    if (!~startIndex && !~endIndex) return
    const startElement = elementList[startIndex]
    const endElement = elementList[endIndex]
    if (startIndex === endIndex) {
      if (startElement.controlComponent === ControlComponent.PLACEHOLDER) {
        // 找到第一个placeholder字符
        let index = startIndex - 1
        while (index > 0) {
          const preElement = elementList[index]
          if (
            preElement.controlId !== startElement.controlId ||
            preElement.controlComponent === ControlComponent.PREFIX ||
            preElement.controlComponent === ControlComponent.PRE_TEXT
          ) {
            range.startIndex = index
            range.endIndex = index
            break
          }
          index--
        }
      }
    } else {
      // 首、尾为占位符时，收缩到最后一个前缀字符后
      if (
        startElement.controlComponent === ControlComponent.PLACEHOLDER ||
        endElement.controlComponent === ControlComponent.PLACEHOLDER
      ) {
        let index = endIndex - 1
        while (index > 0) {
          const preElement = elementList[index]
          if (
            preElement.controlId !== endElement.controlId ||
            preElement.controlComponent === ControlComponent.PREFIX ||
            preElement.controlComponent === ControlComponent.PRE_TEXT
          ) {
            range.startIndex = index
            range.endIndex = index
            return
          }
          index--
        }
      }
      // 向右查找到第一个Value
      if (startElement.controlComponent === ControlComponent.PREFIX) {
        let index = startIndex + 1
        while (index < elementList.length) {
          const nextElement = elementList[index]
          if (
            nextElement.controlId !== startElement.controlId ||
            nextElement.controlComponent === ControlComponent.VALUE
          ) {
            range.startIndex = index - 1
            break
          } else if (
            nextElement.controlComponent === ControlComponent.PLACEHOLDER
          ) {
            range.startIndex = index - 1
            range.endIndex = index - 1
            return
          }
          index++
        }
      }
      // 向左查找到第一个Value
      if (endElement.controlComponent !== ControlComponent.VALUE) {
        let index = startIndex - 1
        while (index > 0) {
          const preElement = elementList[index]
          if (
            preElement.controlId !== startElement.controlId ||
            preElement.controlComponent === ControlComponent.VALUE
          ) {
            range.startIndex = index
            break
          } else if (
            preElement.controlComponent === ControlComponent.PLACEHOLDER
          ) {
            range.startIndex = index
            range.endIndex = index
            return
          }
          index--
        }
      }
    }
  }

  public render(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    ctx.save()
    ctx.globalAlpha = this.options.rangeAlpha
    ctx.fillStyle = this.options.rangeColor
    ctx.fillRect(x, y, width, height)
    ctx.restore()
  }

  public toString(): string {
    const selection = this.getTextLikeSelectionElementList()
    if (!selection) return ''
    return selection
      .map(s => s.value)
      .join('')
      .replace(new RegExp(ZERO, 'g'), '')
  }
}
