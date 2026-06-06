import { Draw } from '../../../draw/Draw'
import { Control } from '../../../modules/control/runtime/Control'
import { shouldPreventEnterInActiveControl } from '../../../modules/control/policy/ControlEnterPolicy'

export function tryRecoverPreventedControlEnter(payload: {
  draw: Draw
  control: Control
  endIndex: number
}): boolean {
  const { draw, control, endIndex } = payload
  if (!shouldPreventEnterInActiveControl(control)) return false
  const rangeManager = draw.getRange()
  const cursor = draw.getCursor()
  rangeManager.setRange(endIndex, endIndex)
  draw.getCoordinate().setCursorLogicalIndex(endIndex)
  cursor.clearAgentDomValue()
  draw.render({
    curIndex: endIndex,
    isSubmitHistory: false,
    isImmediateTypingCompute: true,
    isLazy: false,
    pageRenderScope: 'visible'
  })
  cursor.focus()
  cursor.clearAgentDomValue()
  return true
}
