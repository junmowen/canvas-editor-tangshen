import { IElement } from '../../../../interface/Element'
import { Control } from '../runtime/Control'

/** 隐藏元素清理流程中，命中控件结构时交给控件执行整控件删除。 */
export function removeHiddenControlAtIndex(payload: {
  /** 控件管理器，负责整控件删除。 */
  control: Control
  /** 当前待清理元素。 */
  element: IElement
  /** 当前待清理元素索引。 */
  index: number
}) {
  const { control, element, index } = payload
  if (!element.controlId) {
    return {
      isControl: false,
      newIndex: null
    }
  }
  return {
    isControl: true,
    newIndex: control.removeControl(index)
  }
}
