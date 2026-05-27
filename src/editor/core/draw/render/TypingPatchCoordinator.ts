import type { Draw } from '../Draw'
import {
  isChunkDebugEnabled,
  logChunkDebug
} from '../layout/chunk/ChunkDebugLogger'
import { IChunkLayoutPatchResult } from '../layout/chunk/ChunkLayoutTypes'

export interface ITypingPatchResult {
  /** chunk 或 line patch 的最终结果。 */
  finalPatchResult: IChunkLayoutPatchResult
  /** 本轮是否要求完整 layout 回退。 */
  requiresFullLayout: boolean
}

/** 输入态 chunk / line patch 决策协调器。 */
export class TypingPatchCoordinator {
  constructor(private readonly draw: Draw) {}

  /** 执行输入态 chunk patch，并在 chunk 未命中时尝试单行 patch。 */
  public patchAroundEdit(payload: {
    curIndex?: number
    editIndex: number | undefined
    insertedCount: number
  }): ITypingPatchResult {
    const patchResult =
      this.draw
        .getServices()
        .chunkLayoutPipeline.patchAroundIndex(
          payload.editIndex,
          payload.insertedCount
        )
    const finalPatchResult = patchResult.patched
      ? patchResult
      : this.draw.getServices().typingLinePatchPipeline.patchAroundCursor({
          curIndex: payload.curIndex,
          editIndex: payload.editIndex,
          insertedCount: payload.insertedCount
        })
    return {
      finalPatchResult,
      requiresFullLayout: Boolean(patchResult.requiresFullLayout)
    }
  }

  /** 输出输入态 patch debug 信息。 */
  public logPatchResult(finalPatchResult: IChunkLayoutPatchResult) {
    if (!isChunkDebugEnabled()) {
      return
    }
    const affectedPageNoList =
      finalPatchResult.affectedPageNoList ||
      (finalPatchResult.pageNo !== undefined ? [finalPatchResult.pageNo] : [])
    logChunkDebug('render-facade:typing-patch-result', {
      patched: finalPatchResult.patched,
      pageNo: finalPatchResult.pageNo,
      affectedPageNoList,
      requiresSurfaceClear: finalPatchResult.requiresSurfaceClear,
      patchReason: finalPatchResult.reason,
      pageCount: this.draw.getPageRowList().length,
      positionCount: this.draw.getCoordinate().getLayoutMainPositionList().length,
      layoutElementCount: this.draw.getObjectResolver().getLayoutMainElementList().length
    })
  }
}
