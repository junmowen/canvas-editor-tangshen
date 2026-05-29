import { Control } from '../runtime/Control'

/** 当前选区在控件内时执行控件剪切，并触发内容变更事件。 */
export function cutActiveControl(control: Control) {
  const activeControl = control.getActiveControl()
  if (!activeControl || !control.getIsRangeWithinControl()) return null
  const curIndex = control.cut()
  control.emitControlContentChange()
  return curIndex
}
