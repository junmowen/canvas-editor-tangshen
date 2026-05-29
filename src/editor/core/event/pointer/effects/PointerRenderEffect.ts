import { Draw } from '../../../draw/Draw'

export function renderSelectionStart(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 当前元素索引，用于记录遍历或命中过程的位置。 */
  curIndex: number
  /** 是否同步设置光标，用于控制操作完成后的焦点位置。 */
  isSetCursor: boolean
  /** preserve当前光标开关，用于控制当前流程的判断分支。 */
  preserveCurrentCursor?: boolean
}) {
  const { draw, curIndex, isSetCursor, preserveCurrentCursor = false } = payload
  draw.render({
    curIndex,
    isCompute: false,
    isSubmitHistory: false,
    isSetCursor: preserveCurrentCursor ? false : isSetCursor,
    pageRenderScope: 'visible'
  })
  if (preserveCurrentCursor) {
    draw.getCursor().drawCursor()
  }
}

export function renderSelectionDrag(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 是否跨行列选区，用于启用表格范围选择逻辑。 */
  isCrossRowColSelection: boolean
}) {
  const { draw, isCrossRowColSelection } = payload
  if (isCrossRowColSelection) {
    draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  } else {
    draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false,
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }
}

export function renderSelectionRange(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
}) {
  const { draw, startIndex, endIndex, tableId } = payload
  const rangeManager = draw.getComponents().range
  rangeManager.setRange(startIndex, endIndex, tableId)
  rangeManager.setRangeStyle()
  draw.render({
    isSubmitHistory: false,
    isSetCursor: false,
    isCompute: false,
    isLazy: false,
    pageRenderScope: 'visible'
  })
}

export function renderDragCommitRollback(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 是否执行计算流程，用于控制布局或统计是否重新生成。 */
  isCompute: boolean
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory: boolean
}) {
  const { draw, isCompute, isSubmitHistory } = payload
  draw.render({
    isCompute,
    isSubmitHistory,
    isSetCursor: false,
    pageRenderScope: isCompute ? undefined : 'visible'
  })
}

export function renderDragCommitBlocked(payload: { draw: Draw; curIndex: number }) {
  const { draw, curIndex } = payload
  draw.render({
    curIndex,
    isCompute: false,
    isSubmitHistory: false,
    pageRenderScope: 'visible'
  })
}

export function renderDragCommitFailed(payload: { draw: Draw }) {
  payload.draw.render({
    isSetCursor: false
  })
}

export function renderDragCommitApplied(payload: { draw: Draw }) {
  payload.draw.render({
    isSetCursor: false
  })
}
