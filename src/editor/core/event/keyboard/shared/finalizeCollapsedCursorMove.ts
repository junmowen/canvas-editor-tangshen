import { Draw } from '../../../draw/Draw'

export function finalizeCollapsedCursorMove(payload: {
  draw: Draw
  curIndex: number
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
