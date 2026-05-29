import { Control } from '../runtime/Control'
import { IElement } from '../../../../interface/Element'

/** 处理 Control Deletion 对应的交互或渲染流程。 */
export function handleControlDeletion(
  control: Control,
  evt: KeyboardEvent,
  guard: () => boolean
) {
  if (!guard()) return null
  const curIndex = control.keydown(evt)
  if (curIndex) {
    control.emitControlContentChange()
  }
  return curIndex
}

/** Backspace 在控件可捕获当前选区时交给控件处理。 */
export function handleBackspaceControlDeletion(
  control: Control,
  evt: KeyboardEvent
) {
  return handleControlDeletion(control, evt, () =>
    !!(control.getActiveControl() && control.getIsRangeCanCaptureEvent())
  )
}

/** Delete 在当前选区位于控件内时交给控件处理。 */
export function handleDeleteControlDeletion(
  control: Control,
  evt: KeyboardEvent
) {
  return handleControlDeletion(control, evt, () =>
    !!(control.getActiveControl() && control.getIsRangeWithinControl())
  )
}

/** Delete 命中后继控件结构时，整控件删除并返回删除索引。 */
export function removeNextControlForDelete(payload: {
  /** 控件管理器，负责整控件删除。 */
  control: Control
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 当前删除范围结束索引。 */
  endIndex: number
}) {
  const { control, elementList, endIndex } = payload
  if (!elementList[endIndex + 1]?.controlId) return null
  return control.removeControl(endIndex + 1)
}
