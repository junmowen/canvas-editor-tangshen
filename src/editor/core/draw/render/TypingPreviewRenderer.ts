import { EditorZone } from '../../../dataset/enum/Editor'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRenderSurface, RenderLayer } from '../../render-backend'
import type { Draw } from '../Draw'
import {
  applyPreviewRowColumnContext,
  canFitTypingPreviewHeight,
  canPreviewTypingRow,
  canUseTypingLinePreviewResult,
  canUseTypingPreviewRows,
  getTypingPreviewRowsHeight,
  isTypingPreviewColumnRowCountStable,
  resolveTypingPreviewElementRange,
  resolveTypingPreviewChunkPageNo
} from './TypingPreviewPolicy'

/** typing预览stats契约，用于约束内部流程中传递的数据结构。 */
export interface ITypingPreviewStats {
  /** 输入态局部重绘尝试次数。 */
  attemptCount: number
  /** chunk 级局部重绘成功次数。 */
  chunkSuccessCount: number
  /** 单行局部重绘成功次数。 */
  lineSuccessCount: number
  /** 局部重绘失败次数。 */
  failCount: number
  /** 最近一次局部重绘结果。 */
  lastResult: 'chunk' | 'line' | 'fail' | null
  /** 最近一次失败原因。 */
  lastFailReason: string | null
}

/** 输入态 canvas 快速重绘器。 */
export class TypingPreviewRenderer {
  /** 输入态局部重绘统计。 */
  private stats: ITypingPreviewStats = this.createEmptyStats()

  /** 初始化 TypingPreviewRenderer 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /**
   * 输入态 canvas 快速重绘。
   *
   * 优先做 chunk / 段落真实局部重排；如果 chunk 不安全，再尝试单行重绘。
   * 失败时不做假预览，等待后台 layout。
   */
  public renderTypingChunkPreview(payload: {
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex: number
    /** 编辑索引，用于定位本次修改发生的位置。 */
    editIndex?: number
    /** 已插入数量，用于累加本次写入的元素个数。 */
    insertedCount: number
  }): boolean {
    this.stats.attemptCount++
    const chunkResult = this.renderTypingChunkPreviewInternal(payload)
    if (chunkResult.rendered) {
      this.stats.chunkSuccessCount++
      this.stats.lastResult = 'chunk'
      this.stats.lastFailReason = null
      return true
    }
    const lineResult = this.renderTypingLinePreviewInternal(payload)
    if (lineResult.rendered) {
      this.stats.lineSuccessCount++
      this.stats.lastResult = 'line'
      this.stats.lastFailReason = null
      return true
    }
    this.stats.failCount++
    this.stats.lastResult = 'fail'
    this.stats.lastFailReason =
      lineResult.reason || chunkResult.reason || 'unknown'
    return false
  }

  /** 获取输入态局部重绘统计。 */
  public getStats(): ITypingPreviewStats {
    return { ...this.stats }
  }

  /** 重置输入态局部重绘统计。 */
  public resetStats() {
    this.stats = this.createEmptyStats()
  }

  private createEmptyStats(): ITypingPreviewStats {
    return {
      attemptCount: 0,
      chunkSuccessCount: 0,
      lineSuccessCount: 0,
      failCount: 0,
      lastResult: null,
      lastFailReason: null
    }
  }

  /** 输入态当前 chunk / 段落 canvas 快速重绘。 */
  private renderTypingChunkPreviewInternal(payload: {
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex: number
    /** 编辑索引，用于定位本次修改发生的位置。 */
    editIndex?: number
    /** 已插入数量，用于累加本次写入的元素个数。 */
    insertedCount: number
  }): { rendered: boolean; reason?: string } {
    const coordinate = this.draw.getCoordinate()
    const positionContext = coordinate.getPositionContext()
    const cursorPosition = coordinate.getCursorPosition()
    if (!cursorPosition || positionContext.isTable) {
      return { rendered: false, reason: 'no-cursor-or-table' }
    }
    const documentChunkIndex = this.draw.getServices().documentChunkIndex
    // 插入后的光标可能已经越过旧 chunk，预览命中必须使用编辑锚点。
    const chunk = documentChunkIndex.getChunkByIndex(
      payload.editIndex ?? payload.curIndex
    )
    if (!chunk) {
      return { rendered: false, reason: 'chunk-miss' }
    }
    const pageNo = resolveTypingPreviewChunkPageNo(chunk)
    if (pageNo === null) {
      return { rendered: false, reason: 'chunk-cross-page' }
    }
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.BASE)
    if (!surface) {
      return { rendered: false, reason: 'surface-miss' }
    }
    const elementList = this.draw.getObjectResolver().getElementList()
    const startIndex = chunk.startIndex
    const previewRange = resolveTypingPreviewElementRange({
      elementCount: elementList.length,
      startIndex,
      endIndex: chunk.endIndex + payload.insertedCount
    })
    if (!previewRange) {
      return { rendered: false, reason: 'chunk-range-invalid' }
    }
    const chunkElementList = elementList.slice(
      previewRange.startIndex,
      previewRange.endIndex + 1
    )
    if (!canPreviewTypingRow(chunkElementList)) {
      return { rendered: false, reason: 'chunk-complex-element' }
    }
    const oldChunkRows = this.getPageRowsByIndexRange(
      pageNo,
      chunk.startIndex,
      chunk.endIndex
    )
    if (!oldChunkRows.length) {
      return { rendered: false, reason: 'chunk-row-miss' }
    }
    if (!canUseTypingPreviewRows(oldChunkRows)) {
      return { rendered: false, reason: 'chunk-surround-row' }
    }
    const chunkStartPosition = coordinate.getPositionList()[chunk.startIndex]
    if (!chunkStartPosition) {
      return { rendered: false, reason: 'chunk-position-miss' }
    }
    const sourceColumn = this.draw
      .getServices()
      .pageColumnLayoutService.getColumn(
        pageNo,
        oldChunkRows[0].columnIndex || 0,
        oldChunkRows[0].columns
      )
    const innerWidth = this.draw
      .getServices()
      .pageColumnLayoutService.getMeasurementColumnWidth(
        pageNo,
        oldChunkRows[0].columns
      )
    const startX = sourceColumn.rect.x
    const startY = chunkStartPosition.coordinate.leftTop[1]
    const cachePayload = {
      chunk,
      startIndex,
      endIndex: previewRange.endIndex,
      pageNo,
      startX,
      startY,
      innerWidth
    }
    const layoutCache = this.draw.getServices().chunkLayoutCache.get(cachePayload)
    let rowList = layoutCache?.rowList
    let previewPositionList = layoutCache?.positionList
    let nextHeight = layoutCache?.height
    if (!rowList || !previewPositionList || nextHeight === undefined) {
      rowList = this.draw.computeRowList({
        startX,
        startY,
        pageHeight: this.draw.getHeight(),
        mainOuterHeight: this.draw.getMainOuterHeight(pageNo),
        startPageNo: pageNo,
        innerWidth,
        surroundElementList: [],
        elementList: chunkElementList,
        sourceStartIndex: startIndex
      })
      if (!isTypingPreviewColumnRowCountStable({
        oldRowList: oldChunkRows,
        rowList
      })) {
        return { rendered: false, reason: 'chunk-column-row-count-changed' }
      }
      applyPreviewRowColumnContext({
        rowList,
        oldRowList: oldChunkRows,
        startY
      })
      previewPositionList = []
      coordinate.computePageRowPosition({
        positionList: previewPositionList,
        rowList,
        pageNo,
        startX,
        startY,
        startRowIndex: oldChunkRows[0].rowIndex,
        startIndex,
        innerWidth,
        zone: EditorZone.MAIN
      })
      nextHeight = getTypingPreviewRowsHeight(rowList)
      // 输入预览测量结果写入 chunk 缓存，正式 runtime patch 会直接复用同一份布局结果。
      this.draw.getServices().chunkLayoutCache.set({
        ...cachePayload,
        rowList,
        positionList: previewPositionList,
        height: nextHeight
      })
    }
    const oldHeight = getTypingPreviewRowsHeight(oldChunkRows)
    if (!canFitTypingPreviewHeight({
      rowList,
      oldRowList: oldChunkRows,
      nextHeight
    })) {
      return { rendered: false, reason: 'chunk-height-expanded' }
    }
    this.clearAndDrawPreviewRows({
      surface,
      pageNo,
      startX,
      startY,
      clearHeight: Math.max(oldHeight, nextHeight),
      elementList,
      positionList: previewPositionList,
      rowList,
      startIndex,
      innerWidth
    })
    this.applyPreviewCursor(previewPositionList, payload.curIndex, startIndex)
    return { rendered: true }
  }

  /** 输入态当前行 canvas 快速重绘。 */
  private renderTypingLinePreviewInternal(payload: {
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex: number
    /** 已插入数量，用于累加本次写入的元素个数。 */
    insertedCount: number
  }): { rendered: boolean; reason?: string } {
    const coordinate = this.draw.getCoordinate()
    const positionContext = coordinate.getPositionContext()
    const cursorPosition = coordinate.getCursorPosition()
    if (!cursorPosition || positionContext.isTable) {
      return { rendered: false, reason: 'no-cursor-or-table' }
    }
    const pageNo = cursorPosition.pageNo
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.BASE)
    const pageRowList = this.draw.getPageRowList()[pageNo]
    const sourceRow = pageRowList?.[cursorPosition.rowNo]
    if (!surface || !sourceRow?.elementList?.length) {
      return { rendered: false, reason: 'line-row-miss' }
    }
    if (!canPreviewTypingRow(sourceRow.elementList)) {
      return { rendered: false, reason: 'line-complex-element' }
    }
    const elementList = this.draw.getObjectResolver().getElementList()
    const startIndex = sourceRow.startIndex
    const previewRange = resolveTypingPreviewElementRange({
      elementCount: elementList.length,
      startIndex,
      endIndex: startIndex + sourceRow.elementList.length + payload.insertedCount
    })
    if (!previewRange) {
      return { rendered: false, reason: 'line-range-invalid' }
    }
    const lineElementList = elementList.slice(
      previewRange.startIndex,
      previewRange.endIndex + 1
    )
    if (!canPreviewTypingRow(lineElementList)) {
      return { rendered: false, reason: 'line-next-complex-element' }
    }
    const sourceColumn = this.draw
      .getServices()
      .pageColumnLayoutService.getColumn(
        pageNo,
        sourceRow.columnIndex || 0,
        sourceRow.columns
      )
    const innerWidth = this.draw
      .getServices()
      .pageColumnLayoutService.getMeasurementColumnWidth(
        pageNo,
        sourceRow.columns
      )
    const startX = sourceColumn.rect.x
    const startY = cursorPosition.coordinate.leftTop[1]
    if (!canUseTypingPreviewRows([sourceRow])) {
      return { rendered: false, reason: 'line-surround-row' }
    }
    const rowList = this.draw.computeRowList({
      startX,
      startY,
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(pageNo),
      startPageNo: pageNo,
      innerWidth,
      surroundElementList: [],
      elementList: lineElementList,
      sourceStartIndex: startIndex
    })
    if (!canUseTypingLinePreviewResult(rowList)) {
      return { rendered: false, reason: 'line-expanded' }
    }
    applyPreviewRowColumnContext({
      rowList,
      oldRowList: [sourceRow],
      startY
    })
    const previewPositionList: IElementPosition[] = []
    coordinate.computePageRowPosition({
      positionList: previewPositionList,
      rowList,
      pageNo,
      startX,
      startY,
      startRowIndex: cursorPosition.rowIndex,
      startIndex,
      innerWidth,
      zone: EditorZone.MAIN
    })
    this.clearAndDrawPreviewRows({
      surface,
      pageNo,
      startX,
      startY,
      clearHeight: Math.max(
        sourceRow.height,
        rowList[0].height,
        cursorPosition.lineHeight
      ),
      elementList,
      positionList: previewPositionList,
      rowList,
      startIndex,
      innerWidth
    })
    this.applyPreviewCursor(previewPositionList, payload.curIndex, startIndex)
    return { rendered: true }
  }

  /** 获取某页中落在索引范围内的旧行。 */
  private getPageRowsByIndexRange(pageNo: number, startIndex: number, endIndex: number) {
    const pageRowList = this.draw.getPageRowList()[pageNo] || []
    return pageRowList.filter(row => {
      const rowStartIndex = row.startIndex
      const rowEndIndex = row.startIndex + row.elementList.length - 1
      return rowStartIndex <= endIndex && rowEndIndex >= startIndex
    })
  }

  /** 清理旧局部区域并绘制新的局部行结果。 */
  private clearAndDrawPreviewRows(payload: {
    surface: IRenderSurface
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo: number
    /** 起始横坐标，用于记录拖拽、绘制或选择的起点。 */
    startX: number
    /** 起始纵坐标，用于记录拖拽、绘制或选择的起点。 */
    startY: number
    /** 需要清理的预览区域高度。 */
    clearHeight: number
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 布局位置列表，保存元素分页后的坐标结果。 */
    positionList: IElementPosition[]
    /** 行列表，保存排版后的行结构。 */
    rowList: IDrawPagePayload['rowList']
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 内部可用宽度，用于排版时扣除边距或缩进。 */
    innerWidth: number
  }) {
    const ctx = payload.surface.ctx2d
    // 先清掉旧局部正文区域，避免新旧 canvas 文本叠加。
    ctx.clearRect(
      Math.max(0, payload.startX - 2),
      Math.max(0, payload.startY - 2),
      payload.innerWidth + 4,
      payload.clearHeight + 4
    )
    this.draw.drawRow(ctx, {
      elementList: payload.elementList,
      positionList: payload.positionList,
      rowList: payload.rowList,
      pageNo: payload.pageNo,
      startIndex: payload.startIndex,
      innerWidth: payload.innerWidth,
      zone: EditorZone.MAIN
    })
  }

  /** 使用局部位置列表同步光标坐标。 */
  private applyPreviewCursor(
    positionList: IElementPosition[],
    curIndex: number,
    startIndex: number
  ) {
    const previewCursorPosition = positionList[curIndex - startIndex]
    if (previewCursorPosition) {
      this.draw.getCoordinate().setCursorPosition(previewCursorPosition)
      this.draw.getComponents().cursor.drawCursor()
    }
  }
}
