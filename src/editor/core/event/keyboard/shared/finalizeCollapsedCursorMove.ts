import { Draw } from '../../../draw/Draw'

export function finalizeCollapsedCursorMove(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 当前元素索引，用于记录遍历或命中过程的位置。 */
  curIndex: number
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory?: boolean
}) {
  const { draw, curIndex, isSubmitHistory = false } = payload
  const rangeManager = draw.getComponents().range
  rangeManager.setRange(curIndex, curIndex)
  draw.render({
    curIndex,
    isSetCursor: true,
    isSubmitHistory,
    isCompute: false,
    pageRenderScope: 'visible'
  })
}
