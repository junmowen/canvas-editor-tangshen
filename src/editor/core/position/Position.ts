import { ZERO } from '../../dataset/constant/Common'
import { EditorZone } from '../../dataset/enum/Editor'
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
import { DeepRequired } from '../../interface/Common'
import { EventBus } from '../event/eventbus/EventBus'
import { EventBusMap } from '../../interface/EventBus'
import { getIsBlockElement } from '../../utils/elementLayout'
import { isSurroundRectInColumnRect } from '../../utils/elementLayout'
import {
  ensureFloatImagePosition,
  resolveScaledFloatImageRect,
  shouldCacheFloatImagePosition,
  shouldUseImageOffset
} from '../modules/image/position/ImagePositionPolicy'
import { resolveRowFlexOffsetX } from '../modules/paragraph/layout/ParagraphRowLayoutPolicy'
import { computeTableCellPositions } from '../modules/table/position/computeTableCellPositions'
import {
  hasInlineTableElement,
  isNonTableElementInInlineTableRow,
  resolveTableFragmentForPositionElement,
  shouldComputeTableCellPosition
} from '../modules/table/position/TablePositionPolicy'
import { resolveTablePositionList } from '../modules/table/position/resolveTablePositionList'
import { installPositionHitTestMethods } from './PositionHitTestMethods'

// 页内行带索引。用于把“按整页扫描位置列表”的命中过程
// 缩到“先定位行带，再在局部范围内继续判断”。
type TPageRowBand = {
  /** 行号，用于定位页面内的目标行。 */
  rowNo: number
  /** 上侧偏移或边距，用于计算区域边界。 */
  top: number
  /** 下侧偏移或边距，用于计算区域边界。 */
  bottom: number
  /** 左侧边界，用于多栏同高行命中时按横坐标选择目标栏。 */
  left: number
  /** 右侧边界，用于多栏同高行命中时按横坐标选择目标栏。 */
  right: number
  /** 起始位置，用于描述范围、拖拽或扫描的入口。 */
  start: number
  /** 结束数值，用于当前布局、统计或索引计算。 */
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
  /** 当前光标位置缓存，包含元素索引、页码和坐标信息。 */
  private cursorPosition: IElementPosition | null
  /** 当前光标上下文，记录是否处于表格、页眉、页脚等特殊区域。 */
  private positionContext: IPositionContext
  private positionList: IElementPosition[]
  private floatPositionList: IFloatPosition[]
  private positionListPool: IElementPosition[]
  private poolIndex: number
  private isComputingAllPositions: boolean
  private positionLookupMapCache: WeakMap<IElementPosition[], Map<string, IElementPosition>>
  private pageRowBandsLookupMapCache: WeakMap<IElementPosition[], Map<number, TPageRowBand[]>>

  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 事件总线实例，用于发布和订阅编辑器内部事件。 */
  private eventBus: EventBus<EventBusMap>
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: DeepRequired<IEditorOption>

  /** 初始化 Position 实例并注入运行依赖。 */
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

  public getTablePositionList(
    sourceElementList: IElement[]
  ): IElementPosition[] {
    return resolveTablePositionList({
      draw: this.draw,
      positionContext: this.positionContext,
      sourceElementList
    })
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

  /** 读取主文档布局位置列表。 */
  public getMainPositionList(): IElementPosition[] {
    return this.positionList
  }

  public getMainPositionListByPage(pageNo: number): IElementPosition[] {
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

  /** 计算 Page Row Position 对应的布局或状态。 */
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
    // 只有正文排版消费分页器写入的 columnIndex；页眉、页脚和表格必须保留调用方传入的区域坐标。
    const isMainColumnPosition =
      !payload.isTable && payload.zone === EditorZone.MAIN
    // 当前栏索引用于在多栏页面内切换行起点和纵向游标。
    let currentColumnIndex = 0
    if (isMainColumnPosition && rowList[0]) {
      const initialColumn = this.draw
        .getServices()
        .pageColumnLayoutService.getColumn(
          pageNo,
          rowList[0].columnIndex || 0,
          rowList[0].columns
        )
      currentColumnIndex = initialColumn.index
      x = initialColumn.rect.x
      y = rowList[0].columnStartY ?? initialColumn.rect.y
    }
    let index = startIndex
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      if (!curRow?.elementList?.length) continue
      // 行级栏索引由分页器写入，position 阶段只消费最终落位。
      const rowColumnIndex = curRow.columnIndex || 0
      if (isMainColumnPosition && rowColumnIndex !== currentColumnIndex) {
        const column = this.draw
          .getServices()
          .pageColumnLayoutService.getColumn(
            pageNo,
            rowColumnIndex,
            curRow.columns
          )
        currentColumnIndex = rowColumnIndex
        x = column.rect.x
        y = curRow.columnStartY ?? column.rect.y
      }
      // 当前行起点和可用宽度必须跟随所在栏，否则居中/右对齐会按整页偏移。
      const rowStartX = isMainColumnPosition
        ? this.draw
            .getServices()
            .pageColumnLayoutService.getColumn(
              pageNo,
              rowColumnIndex,
              curRow.columns
            ).rect.x
        : startX
      const rowInnerWidth = isMainColumnPosition
        ? this.draw
            .getServices()
            .pageColumnLayoutService.getColumn(
              pageNo,
              rowColumnIndex,
              curRow.columns
            ).rect.width
        : innerWidth
      x += resolveRowFlexOffsetX({ row: curRow, innerWidth: rowInnerWidth })
      // 当前行X/Y轴偏移量
      x += curRow.offsetX || 0
      y += curRow.offsetY || 0
      const isInlineTableRow = hasInlineTableElement(curRow.elementList)
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
            positionItem.tableFragment = resolveTableFragmentForPositionElement(
              element,
              curRow
            )
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
              tableFragment: resolveTableFragmentForPositionElement(
                element,
                curRow
              ),
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
            tableFragment: resolveTableFragmentForPositionElement(
              element,
              curRow
            ),
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
        if (shouldCacheFloatImagePosition(element)) {
          // 浮动元素使用上一位置信息
          const prePosition = positionList[positionList.length - 1]
          if (prePosition) {
            positionItem.metrics = prePosition.metrics
            positionItem.coordinate = prePosition.coordinate
          }
          ensureFloatImagePosition({ element, x, y, pageNo })
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
        if (shouldComputeTableCellPosition(element)) {
          const tablePositionResult = computeTableCellPositions({
            tableSource: curRow.tableFragment || element,
            tablePreX: elementPreX,
            tablePreY: elementPreY,
            tableNextX: x,
            tableNextY: y,
            scale,
            tdPadding,
            pageNo,
            tableIndex: index - 1,
            zone,
            computePageRowPosition: rowPayload =>
              this.computePageRowPosition(rowPayload)
          })
          x = tablePositionResult.x
          y = tablePositionResult.y
        }
      }
      x = rowStartX
      y += curRow.height
    }
    return { x, y, index }
  }

  /** 计算 Element Offset Y 对应的布局或状态。 */
  private computeElementOffsetY(payload: {
    /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
    element: IElement
    /** 统计指标集合，用于暴露渲染或布局运行状态。 */
    metrics: IElementPosition['metrics']
    /** 行ascent数值，用于当前布局、统计或索引计算。 */
    rowAscent: number
    /** 是否行内表格行，用于命中时区分普通行和表格行。 */
    isInlineTableRow: boolean
  }) {
    const { element, metrics, rowAscent, isInlineTableRow } = payload
    if (isNonTableElementInInlineTableRow({ element, isInlineTableRow })) {
      const rowMargin =
        this.options.defaultBasicRowMarginHeight *
        (element.rowMargin ?? this.options.defaultRowMargin)
      return Math.max(0, metrics.boundingBoxAscent + rowMargin)
    }
    return shouldUseImageOffset(element)
      ? rowAscent - metrics.height
      : rowAscent
  }

  /** 计算 Position List 对应的布局或状态。 */
  public computePositionList() {
    this.isComputingAllPositions = true
    this.poolIndex = 0
    // 置空原位置信息
    this.positionLookupMapCache = new WeakMap()
    this.pageRowBandsLookupMapCache = new WeakMap()
    this.positionList = []
    // 按每页行计算
    const pageRowList = this.draw.getPageRowList()
    let startRowIndex = 0
    for (let i = 0; i < pageRowList.length; i++) {
      const rowList = pageRowList[i]
      const startIndex = rowList[0]?.startIndex
      // 整篇 position 重算也逐页读取边距，避免非首页增量和全量路径不一致。
      const margins = this.draw.getMargins(i)
      const startX = margins[3]
      const header = this.draw.getHeader()
      const extraHeight = header.getExtraHeight()
      const startY = margins[0] + extraHeight
      const innerWidth = this.draw.getInnerWidth(i)
      this.computePageRowPosition({
        positionList: this.positionList,
        rowList,
        pageNo: i,
        startRowIndex,
        startIndex,
        startX,
        startY,
        innerWidth,
        zone: EditorZone.MAIN
      })
      startRowIndex += rowList.length
    }
    this.isComputingAllPositions = false
  }

  /** 计算 Position List From Page 对应的布局或状态。 */
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
    let startRowIndex = 0
    for (let pageNo = 0; pageNo < startPageNo; pageNo++) {
      startRowIndex += pageRowList[pageNo]?.length || 0
    }
    for (let pageNo = startPageNo; pageNo < pageRowList.length; pageNo++) {
      const rowList = pageRowList[pageNo]
      const startIndex = rowList[0]?.startIndex
      // 局部重算从目标页读取边距，避免后续页增量 position 回退到首页边距。
      const margins = this.draw.getMargins(pageNo)
      const startX = margins[3]
      const header = this.draw.getHeader()
      const extraHeight = header.getExtraHeight()
      const startY = margins[0] + extraHeight
      const innerWidth = this.draw.getInnerWidth(pageNo)
      this.computePageRowPosition({
        positionList: nextPositionList,
        rowList,
        pageNo,
        startRowIndex,
        startIndex,
        startX,
        startY,
        innerWidth,
        zone: EditorZone.MAIN
      })
      startRowIndex += rowList.length
    }
    this.positionList = nextPositionList
  }

  /** 计算 Row Position 对应的布局或状态。 */
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
      const left = position.coordinate.leftTop[0] - (position.left || 0)
      const right = position.coordinate.rightTop[0]
      if (!pageRowBands) {
        pageRowBandsMap.set(position.pageNo, [
          {
            rowNo: position.rowNo,
            top,
            bottom,
            left,
            right,
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
        currentBand.left = Math.min(currentBand.left, left)
        currentBand.right = Math.max(currentBand.right, right)
        currentBand.end = cursor
      } else {
        pageRowBands.push({
          rowNo: position.rowNo,
          top,
          bottom,
          left,
          right,
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
        const surroundRect = resolveScaledFloatImageRect({
          element: surroundElement,
          scale
        })
        if (!surroundRect || surroundRect.pageNo !== pageNo) continue
        const columnCount = Math.max(
          1,
          Math.floor(row.columns?.count || this.options.columns.count || 1)
        )
        if (columnCount > 1) {
          const column = this.draw
            .getServices()
            .pageColumnLayoutService.getColumn(
              pageNo,
              row.columnIndex || 0,
              row.columns
            )
          if (!isSurroundRectInColumnRect(surroundRect, column.rect)) continue
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
