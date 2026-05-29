import { ControlComponent } from '../../../../dataset/enum/Control'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { MoveDirection } from '../../../../dataset/enum/Observer'
import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

type TControlBoundaryDirection = 'prev' | 'next'

/** 在表单模式中，左右键抵达控件边界时切换到前后控件。 */
export function tryNavigateFormControlBoundary(payload: {
  /** 绘制核心实例，提供模式和控件访问能力。 */
  draw: Draw
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 当前光标所在元素索引。 */
  index: number
  /** 横向移动方向。 */
  direction: TControlBoundaryDirection
}) {
  const { draw, elementList, index, direction } = payload
  const control = draw.getControl()
  if (
    draw.getMode() !== EditorMode.FORM ||
    !control.getActiveControl()
  ) {
    return false
  }

  const isPrevBoundary =
    direction === 'prev' &&
    (elementList[index]?.controlComponent === ControlComponent.PREFIX ||
      elementList[index]?.controlComponent === ControlComponent.PRE_TEXT)
  const isNextBoundary =
    direction === 'next' &&
    (elementList[index + 1]?.controlComponent === ControlComponent.POSTFIX ||
      elementList[index + 1]?.controlComponent === ControlComponent.POST_TEXT)
  if (!isPrevBoundary && !isNextBoundary) return false

  control.initNextControl({
    direction: direction === 'prev' ? MoveDirection.UP : MoveDirection.DOWN
  })
  return true
}
