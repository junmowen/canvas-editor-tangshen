import { EditorZone } from '../../../../dataset/enum/Editor'
import type { Draw } from '../../Draw'
import {
  IChunkLayoutMeasureResult,
  IChunkLayoutPatchContext,
  IChunkLayoutPatchResult
} from './ChunkLayoutTypes'
import { getRowsHeight } from './ChunkPatchAlgorithms'
import {
  applyChunkMeasureRowColumnContext,
  canUseChunkMeasureOldRows,
  getChunkMeasureRiskReason,
  isChunkColumnMeasureRowCountStable
} from './ChunkLayoutMeasurePolicy'

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
    if (!canUseChunkMeasureOldRows(context.oldChunkRows)) {
      return {
        measureResult: null,
        result: { patched: false, reason: 'chunk-surround-row' }
      }
    }
    if (!rowList || !positionList || nextHeight === undefined) {
      rowList = this.draw.computeRowList({
        startX: context.startX,
        startY: context.startY,
        pageHeight: this.draw.getHeight(),
        mainOuterHeight: this.draw.getMainOuterHeight(context.pageNo),
        startPageNo: context.pageNo,
        innerWidth: context.innerWidth,
        surroundElementList: [],
        elementList: context.chunkElementList,
        sourceStartIndex: context.chunk.startIndex
      })
      if (!isChunkColumnMeasureRowCountStable({
        oldRowList: context.oldChunkRows,
        rowList
      })) {
        return {
          measureResult: null,
          result: { patched: false, reason: 'chunk-column-row-count-changed' }
        }
      }
      applyChunkMeasureRowColumnContext({
        rowList,
        context
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
    const measureRisk = getChunkMeasureRiskReason({
      rowList,
      positionList,
      expectedElementCount: context.chunkElementList.length
    })
    if (measureRisk) {
      return {
        measureResult: null,
        result: { patched: false, reason: measureRisk }
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
