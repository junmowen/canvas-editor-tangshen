import { nextTick } from '../../../utils'
import type { Draw } from '../Draw'

/** Draw render 流程的通用收尾动作。 */
export class DrawRenderFinalizeService {
  constructor(private readonly draw: Draw) {}

  /** 布局或局部 patch 后恢复运行时视觉状态并触发渲染。 */
  public refreshRuntime(payload: {
    isLazy: boolean
    pageRenderScope: 'all' | 'visible'
  }) {
    this.draw.getComponents().imageObserver.clearAll()
    this.draw.getComponents().cursor.recoveryCursor()
    this.draw.getPageCanvasHost().setPageCount(this.draw.getPageRowList().length)
    this.draw.getServices().renderPipeline.render({
      isLazy: payload.isLazy,
      pageRenderScope: payload.pageRenderScope
    })
  }

  /** 根据当前 render 选项恢复或聚焦光标。 */
  public finalizeCursor(payload: {
    curIndex?: number
    isSetCursor: boolean
  }) {
    if (payload.isSetCursor) {
      return this.draw.setCursor(payload.curIndex)
    }
    if (this.draw.getRange().getIsSelection()) {
      this.draw.getComponents().cursor.focus()
    }
    return payload.curIndex
  }

  /** 表格输入等固定需要 setCursor 的路径。 */
  public finalizeCursorWhenIndexAvailable(curIndex?: number) {
    if (curIndex !== undefined) {
      this.draw.setCursor(curIndex)
    } else if (this.draw.getRange().getIsSelection()) {
      this.draw.getComponents().cursor.focus()
    }
  }

  /** 提交输入或普通历史。 */
  public submitHistory(payload: {
    curIndex?: number
    isTyping: boolean
    isSubmitHistory: boolean
    isFirstRender: boolean
  }) {
    if (
      (payload.isSubmitHistory && !payload.isFirstRender) ||
      (payload.curIndex !== undefined &&
        this.draw.getComponents().historyManager.isStackEmpty())
    ) {
      if (payload.isTyping) {
        this.draw.getServices().historyBridge.submitTypingHistory(payload.curIndex)
      } else {
        this.draw.submitHistory(payload.curIndex)
      }
    }
  }

  /** 调度 render 后置副作用。 */
  public schedulePostRenderEffects(payload: {
    isCompute: boolean
    isSubmitHistory: boolean
    isSourceHistory: boolean
    isInit: boolean
    oldPageSize: number
  }) {
    nextTick(() => {
      this.draw.getServices().postRenderEffects.run(
        {
          isCompute: payload.isCompute,
          isSubmitHistory: payload.isSubmitHistory,
          isSourceHistory: payload.isSourceHistory,
          isInit: payload.isInit
        },
        payload.oldPageSize
      )
    })
  }
}
