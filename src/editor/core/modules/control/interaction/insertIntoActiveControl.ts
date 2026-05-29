import { IElement } from '../../../../interface/Element'
import { Control } from '../runtime/Control'

/** 插入到当前激活控件内，返回控件内部写入后的光标索引。 */
export function insertIntoActiveControl(
  control: Control,
  insertElementList: IElement[],
  options: {
    /** 是否触发控件内容变更事件，输入法组合阶段会延后触发。 */
    isEmitChange?: boolean
  } = {}
) {
  const { isEmitChange = true } = options
  const activeControl = control.getActiveControl()
  if (!activeControl || !control.getIsRangeWithinControl()) return null
  const curIndex = control.setValue(insertElementList)
  if (isEmitChange) {
    control.emitControlContentChange()
  }
  return curIndex
}
