import { EditorZone } from '../../../../dataset/enum/Editor'
import type { Draw } from '../../Draw'
import {
  IChunkLayoutMeasureResult,
  IChunkLayoutPatchContext,
  IChunkLayoutPatchResult
} from './ChunkLayoutTypes'
import { getRowsHeight } from './ChunkPatchAlgorithms'

/** chunk 局部测量器，负责把 chunk 元素重新排成行和位置列表。 */
export class ChunkLayoutMeasurer {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  /**
   * 测量当前 chunk。
   *
   * @param context - patch 上下文
   * @returns 成功时返回测量结果，失败时返回原因
   */
  public measure(context: IChunkLayoutPatchContext): {
    /** measure结果，保存当前计算返回的数据。 */
    measureResult: IChunkLayoutMeasureResult | null
    /** 处理结果，用于返回本次计算产出的数据。 */
    result: IChunkLayoutPatchResult
  } {
    const cachePayload = {
      chunk: context.chunk,
      startIndex: context.chunk.startIndex,
      endIndex: context.endIndex,
      pageNo: context.pageNo,
      startX: context.startX,
      startY: context.startY,
      innerWidth: context.innerWidth
    }
    const layoutCache = this.draw
      .getServices()
      .chunkLayoutCache.get(cachePayload)
    let rowList = layoutCache?.rowList
    let positionList = layoutCache?.positionList
    let nextHeight = layoutCache?.height
    if (!rowList || !positionList || nextHeight === undefined) {
      rowList = this.draw.computeRowList({
        startX: context.startX,
        startY: context.startY,
        pageHeight: this.draw.getHeight(),
        mainOuterHeight: this.draw.getMainOuterHeight(),
        isPagingMode: false,
        innerWidth: context.innerWidth,
        surroundElementList: [],
        elementList: context.chunkElementList,
        sourceStartIndex: context.chunk.startIndex
      })
      positionList = []
      this.draw.getCoordinate().computePageRowPosition({
        positionList,
        rowList,
        pageNo: context.pageNo,
        startX: context.startX,
        startY: context.startY,
        startRowIndex: context.oldChunkRows[0].rowIndex,
        startIndex: context.chunk.startIndex,
        innerWidth: context.innerWidth,
        zone: EditorZone.MAIN
      })
      nextHeight = getRowsHeight(rowList)
      // chunk preview 与正式 patch 共用缓存，避免一次输入同步测量两遍同一段落。
      this.draw.getServices().chunkLayoutCache.set({
        ...cachePayload,
        rowList,
        positionList,
        height: nextHeight
      })
    }
    const oldHeight = getRowsHeight(context.oldChunkRows)
    if (!rowList.length) {
      return {
        measureResult: null,
        result: { patched: false, reason: 'empty-row' }
      }
    }
    const measuredElementCount = this.getMeasuredElementCount(rowList)
    if (
      measuredElementCount !== context.chunkElementList.length ||
      positionList.length !== context.chunkElementList.length
    ) {
      return {
        measureResult: null,
        result: { patched: false, reason: 'chunk-measure-count-mismatch' }
      }
    }
    this.normalizeRowIndexes(rowList, context.oldChunkRows[0].rowIndex)
    return {
      measureResult: {
        elementList: context.chunkElementList,
        rowList,
        positionList,
        nextHeight,
        oldHeight
      },
      result: { patched: true }
    }
  }

  /** 统计测量行内元素数量，确保局部排版没有吞掉或重复元素。 */
  private getMeasuredElementCount(rowList: IChunkLayoutMeasureResult['rowList']) {
    return rowList.reduce((count, row) => count + row.elementList.length, 0)
  }

  /** 把局部 rowIndex 调整到整篇文档行号。 */
  private normalizeRowIndexes(
    rowList: IChunkLayoutMeasureResult['rowList'],
    startRowIndex: number
  ) {
    for (let i = 0; i < rowList.length; i++) {
      rowList[i].rowIndex = startRowIndex + i
    }
  }
}
