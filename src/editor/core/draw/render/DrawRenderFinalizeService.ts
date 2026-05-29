import { PageMode } from '../../../dataset/enum/Editor'
import { MoveDirection } from '../../../dataset/enum/Observer'
import type { IElement } from '../../../interface/Element'
import { nextTick } from '../../../utils'
import { resolveScaledFloatImageRect } from '../../modules/image/position/ImagePositionPolicy'
import { visitTableCellValueList } from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'

/** Draw render 流程的通用收尾动作。 */
export class DrawRenderFinalizeService {
  /** 初始化 DrawRenderFinalizeService 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 布局或局部 patch 后恢复运行时视觉状态并触发渲染。 */
  public refreshRuntime(payload: {
    /** 是否延迟执行，用于把计算或渲染推迟到合适时机。 */
    isLazy: boolean
    /** 页面渲染范围，用于限制本次刷新涉及的页码区间。 */
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
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex?: number
    /** 是否同步设置光标，用于控制操作完成后的焦点位置。 */
    isSetCursor: boolean
    /** 是否输入态渲染，用于选择更轻量的刷新路径。 */
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
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex?: number
    /** 是否输入态渲染，用于选择更轻量的刷新路径。 */
    isTyping: boolean
    /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
    isSubmitHistory: boolean
    /** 是否首次渲染，用于区分初始化和增量刷新。 */
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
    /** 是否执行计算流程，用于控制布局或统计是否重新生成。 */
    isCompute: boolean
    /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
    isSubmitHistory: boolean
    /** 是否来自历史记录，用于区分撤销重做和普通编辑。 */
    isSourceHistory: boolean
    /** 是否初始化阶段，用于区分首次构建和后续更新。 */
    isInit: boolean
    /** 旧分页数量，用于判断分页变化范围。 */
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
        visitTableCellValueList({
          element,
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
    this.draw.getCoordinate().getLayoutMainPositionList().forEach(position => {
      maxBottom = Math.max(
        maxBottom,
        position.coordinate.leftBottom[1] + bottomMargin,
        position.coordinate.rightBottom[1] + bottomMargin
      )
    })
    visitElementList(this.draw.getObjectResolver().getLayoutMainElementList())
    this.draw.getCoordinate().getFloatPositionList().forEach(floatPosition => {
      const floatRect = resolveScaledFloatImageRect({
        element: floatPosition.element,
        scale: this.draw.getOptions().scale
      })
      if (!floatRect) return
      maxBottom = Math.max(
        maxBottom,
        floatRect.y + floatRect.height + bottomMargin
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
