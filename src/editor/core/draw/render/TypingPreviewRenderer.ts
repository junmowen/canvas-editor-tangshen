import { ElementType } from '../../../dataset/enum/Element'
import { EditorZone } from '../../../dataset/enum/Editor'
import { IDrawPagePayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRenderSurface, RenderLayer } from '../../render-backend'
import type { Draw } from '../Draw'

/** 输入态局部重绘统计，用于验证段落 / chunk 级真实增量渲染是否命中。 */
export interface ITypingPreviewStats {
  /** 输入态局部重绘尝试次数。 */
  attemptCount: number
  /** chunk 级局部重绘成功次数。 */
  chunkSuccessCount: number
  /** 单行兜底局部重绘成功次数。 */
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

  constructor(private readonly draw: Draw) {}

  /**
   * 输入态 canvas 快速重绘。
   *
   * 优先做 chunk / 段落真实局部重排；如果 chunk 不安全，再兜底尝试单行重绘。
   * 失败时不做假预览，等待后台 layout。
   */
  public renderTypingChunkPreview(payload: {
    curIndex: number
    editIndex?: number
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
    curIndex: number
    editIndex?: number
    insertedCount: number
  }): { rendered: boolean; reason?: string } {
    const position = this.draw.getPosition()
    const positionContext = position.getPositionContext()
    const cursorPosition = position.getCursorPosition()
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
    if (
      chunk.startPageNo === null ||
      chunk.endPageNo === null ||
      chunk.startPageNo !== chunk.endPageNo
    ) {
      return { rendered: false, reason: 'chunk-cross-page' }
    }
    const pageNo = chunk.startPageNo
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.BASE)
    if (!surface) {
      return { rendered: false, reason: 'surface-miss' }
    }
    const elementList = this.draw.getElementList()
    const startIndex = chunk.startIndex
    const endIndex = Math.min(
      elementList.length - 1,
      chunk.endIndex + payload.insertedCount
    )
    const chunkElementList = elementList.slice(startIndex, endIndex + 1)
    if (!this.canPreviewRow(chunkElementList)) {
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
    const chunkStartPosition = position.getPositionList()[chunk.startIndex]
    if (!chunkStartPosition) {
      return { rendered: false, reason: 'chunk-position-miss' }
    }
    const margins = this.draw.getMargins()
    const innerWidth = this.draw.getInnerWidth()
    const startX = margins[3]
    const startY = chunkStartPosition.coordinate.leftTop[1]
    const cachePayload = {
      chunk,
      startIndex,
      endIndex,
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
        mainOuterHeight: this.draw.getMainOuterHeight(),
        isPagingMode: false,
        innerWidth,
        surroundElementList: [],
        elementList: chunkElementList,
        sourceStartIndex: startIndex
      })
      previewPositionList = []
      position.computePageRowPosition({
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
      nextHeight = this.getRowsHeight(rowList)
      // 输入预览测量结果写入 chunk 缓存，正式 runtime patch 会直接复用同一份布局结果。
      this.draw.getServices().chunkLayoutCache.set({
        ...cachePayload,
        rowList,
        positionList: previewPositionList,
        height: nextHeight
      })
    }
    const oldHeight = this.getRowsHeight(oldChunkRows)
    if (!rowList.length || nextHeight > oldHeight) {
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

  /** 输入态当前行 canvas 快速重绘兜底。 */
  private renderTypingLinePreviewInternal(payload: {
    curIndex: number
    insertedCount: number
  }): { rendered: boolean; reason?: string } {
    const position = this.draw.getPosition()
    const positionContext = position.getPositionContext()
    const cursorPosition = position.getCursorPosition()
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
    if (!this.canPreviewRow(sourceRow.elementList)) {
      return { rendered: false, reason: 'line-complex-element' }
    }
    const elementList = this.draw.getElementList()
    const startIndex = sourceRow.startIndex
    const endIndex = Math.min(
      elementList.length - 1,
      startIndex + sourceRow.elementList.length + payload.insertedCount
    )
    if (startIndex < 0 || endIndex < startIndex) {
      return { rendered: false, reason: 'line-range-invalid' }
    }
    const lineElementList = elementList.slice(startIndex, endIndex + 1)
    if (!this.canPreviewRow(lineElementList)) {
      return { rendered: false, reason: 'line-next-complex-element' }
    }
    const margins = this.draw.getMargins()
    const innerWidth = this.draw.getInnerWidth()
    const startX = margins[3]
    const startY = cursorPosition.coordinate.leftTop[1]
    const rowList = this.draw.computeRowList({
      startX,
      startY,
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(),
      isPagingMode: false,
      innerWidth,
      surroundElementList: [],
      elementList: lineElementList,
      sourceStartIndex: startIndex
    })
    if (rowList.length !== 1) {
      return { rendered: false, reason: 'line-expanded' }
    }
    const previewPositionList: IElementPosition[] = []
    position.computePageRowPosition({
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

  /** 判断当前行是否适合输入态局部 canvas 重绘。 */
  private canPreviewRow(elementList: Array<{ type?: ElementType; value?: string }>) {
    return elementList.every(element => {
      return (
        !element.type ||
        element.type === ElementType.TEXT ||
        element.type === ElementType.HYPERLINK ||
        element.type === ElementType.DATE ||
        element.type === ElementType.SUBSCRIPT ||
        element.type === ElementType.SUPERSCRIPT ||
        element.type === ElementType.TAB
      )
    })
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

  /** 计算一组行的占用高度，包含行级 offsetY。 */
  private getRowsHeight(rowList: Array<{ height: number; offsetY?: number }>) {
    return rowList.reduce((sum, row) => sum + row.height + (row.offsetY || 0), 0)
  }

  /** 清理旧局部区域并绘制新的局部行结果。 */
  private clearAndDrawPreviewRows(payload: {
    surface: IRenderSurface
    pageNo: number
    startX: number
    startY: number
    clearHeight: number
    elementList: IElement[]
    positionList: IElementPosition[]
    rowList: IDrawPagePayload['rowList']
    startIndex: number
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
      this.draw.getPosition().setCursorPosition(previewCursorPosition)
      this.draw.getComponents().cursor.drawCursor()
    }
  }
}
