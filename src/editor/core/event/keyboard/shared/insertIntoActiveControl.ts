import { IElement } from '../../../../interface/Element'
import { Control } from '../../../draw/control/Control'

export function insertIntoActiveControl(
  control: Control,
  insertElementList: IElement[]
) {
  const activeControl = control.getActiveControl()
  if (!activeControl || !control.getIsRangeWithinControl()) return null
  const curIndex = control.setValue(insertElementList)
  control.emitControlContentChange()
  return curIndex
}
