import { ElementType } from '../../../dataset/enum/Element'
import { PageMode } from '../../../dataset/enum/Editor'
import { MoveDirection } from '../../../dataset/enum/Observer'
import type { IElement } from '../../../interface/Element'
import { nextTick } from '../../../utils'
import { forEachTableCell } from '../../table/utils/TableCellTraversal'
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
    this.syncContinuousPageHeight()
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
    isTyping?: boolean
  }) {
    if (payload.isSetCursor) {
      const curIndex = this.draw.setCursor(payload.curIndex)
      this.scrollCursorIntoView(payload.isTyping)
      return curIndex
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
      this.scrollCursorIntoView(true)
    } else if (this.draw.getRange().getIsSelection()) {
      this.draw.getComponents().cursor.focus()
    }
  }

  private scrollCursorIntoView(isTyping?: boolean) {
    if (!isTyping) return
    const cursorPosition = this.draw.getCoordinate().getCursorPosition()
    if (!cursorPosition) return
    this.draw.getCursor().moveCursorToVisible({
      cursorPosition,
      direction: MoveDirection.DOWN
    })
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
      if (this.draw.getComponents().historyManager.isDisabledHistory()) return
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

  /** 连页模式下，根据当前 runtime 里的真实 bottom 同步第 0 页高度。 */
  public syncContinuousPageHeight() {
    if (this.draw.getOptions().pageMode !== PageMode.CONTINUITY) {
      return
    }
    const pageNo = 0
    const bottomMargin = this.draw.getMargins()[2]
    const rowListHeight = this.draw
      .getObjectResolver()
      .getRowList()
      .reduce((total, row) => total + row.height + (row.offsetY || 0), 0)
    let maxBottom = this.draw.getMainOuterHeight() + rowListHeight
    const visitElementList = (elementList: IElement[]) => {
      for (let i = 0; i < elementList.length; i++) {
        const element = elementList[i]
        if (element.type === ElementType.TABLE) {
          forEachTableCell({
            tableElement: element,
            tableIndex: i,
            visitor: ({ td }) => {
              td.positionList?.forEach((position: any) => {
                maxBottom = Math.max(
                  maxBottom,
                  position.coordinate.leftBottom[1] + bottomMargin,
                  position.coordinate.rightBottom[1] + bottomMargin
                )
              })
              visitElementList(td.value || [])
            }
          })
        }
      }
    }
    this.draw.getCoordinate().getLayoutMainPositionList().forEach(position => {
      maxBottom = Math.max(
        maxBottom,
        position.coordinate.leftBottom[1] + bottomMargin,
        position.coordinate.rightBottom[1] + bottomMargin
      )
    })
    visitElementList(this.draw.getObjectResolver().getLayoutMainElementList())
    this.draw.getCoordinate().getFloatPositionList().forEach(floatPosition => {
      const element = floatPosition.element
      if (!element.imgFloatPosition || !element.height) {
        return
      }
      maxBottom = Math.max(
        maxBottom,
        (element.imgFloatPosition.y + element.height) *
          this.draw.getOptions().scale +
          bottomMargin
      )
    })
    this.draw.getPageCanvasHost().resizeContinuousPage(
      pageNo,
      Math.ceil(maxBottom),
      this.draw.getHeight()
    )
    if (!this.draw.getOptions().footer.disabled) {
      this.draw.getFooter().syncPositionForPage(pageNo)
    }
  }
}
