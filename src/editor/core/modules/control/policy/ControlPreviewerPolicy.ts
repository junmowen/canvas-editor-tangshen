import { EditorMode } from '../../../../dataset/enum/Editor'
import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'

/** 表单模式中非控件图片禁止拖拽；只读模式中所有图片禁止拖拽。 */
export function isControlPreviewerDragDisabled(payload: {
  /** 绘制核心实例，用于读取当前编辑模式。 */
  draw: Draw
  /** 当前命中的图片或公式元素。 */
  element: IElement
  /** 当前事件是否处于只读态。 */
  isReadonly: boolean
}) {
  const { draw, element, isReadonly } = payload
  return isReadonly || (!element.controlId && draw.getMode() === EditorMode.FORM)
}
