import { MoveDirection } from '../../../../dataset/enum/Observer'
import { Control } from '../runtime/Control'

type TControlNavigationOrder = 'prev' | 'next'

/** 当前选区在控件内时，切换到前后控件。 */
export function tryNavigateActiveControl(
  control: Control,
  order: TControlNavigationOrder
) {
  const activeControl = control.getActiveControl()
  if (!activeControl || !control.getIsRangeWithinControl()) return false
  control.initNextControl({
    direction: order === 'prev' ? MoveDirection.UP : MoveDirection.DOWN
  })
  return true
}
