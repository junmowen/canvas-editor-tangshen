import { ControlComponent, ControlType } from '../../../../dataset/enum/Control'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'
import { CheckboxControl } from '../runtime/checkbox/CheckboxControl'
import { RadioControl } from '../runtime/radio/RadioControl'

/** 表单模式下，checkbox/radio 即使只读也允许响应控件切换。 */
export function canToggleFormControl(payload: {
  /** 绘制核心实例，用于读取当前模式。 */
  draw: Draw
  /** 是否直接命中 checkbox。 */
  isDirectHitCheckbox: boolean
  /** 是否直接命中 radio。 */
  isDirectHitRadio: boolean
}) {
  const { draw, isDirectHitCheckbox, isDirectHitRadio } = payload
  return (
    draw.getMode() === EditorMode.FORM &&
    (isDirectHitCheckbox || isDirectHitRadio)
  )
}

/** 表单模式切换控件前先刷新选区渲染，避免光标和控件状态冲突。 */
export function renderBeforeFormControlToggle(payload: {
  /** 绘制核心实例，提供渲染入口。 */
  draw: Draw
  /** 当前控件索引。 */
  curIndex: number
}) {
  const { draw, curIndex } = payload
  if (draw.getMode() !== EditorMode.FORM) return
  draw.render({
    curIndex,
    isSetCursor: false,
    isCompute: false,
    isSubmitHistory: false,
    pageRenderScope: 'visible'
  })
}

export function applyCheckboxToggle(payload: { draw: Draw; element: IElement }) {
  const { draw, element } = payload
  const { checkbox, control } = element
  if (!control) {
    draw.getCheckboxParticle().setSelect(element)
    return
  }
  const codes =
    control.code !== undefined && control.code !== null
      ? String(control.code).split(',')
      : []
  if (checkbox?.value) {
    const codeIndex = codes.findIndex(c => c === String(checkbox.code))
    codes.splice(codeIndex, 1)
  } else if (checkbox?.code !== undefined && checkbox.code !== null) {
    codes.push(String(checkbox.code))
  }
  const controlManager = draw.getControl()
  if (!controlManager.getActiveControl()) {
    controlManager.initControl()
  }
  const activeControl = controlManager.getActiveControl()
  if (activeControl instanceof CheckboxControl) {
    activeControl.setSelect(codes)
  }
}

export function applyRadioToggle(payload: { draw: Draw; element: IElement }) {
  const { draw, element } = payload
  const { radio, control } = element
  if (!control) {
    draw.getRadioParticle().setSelect(element)
    return
  }
  const codes =
    radio?.code !== undefined && radio.code !== null ? [String(radio.code)] : []
  const controlManager = draw.getControl()
  if (!controlManager.getActiveControl()) {
    controlManager.initControl()
  }
  const activeControl = controlManager.getActiveControl()
  if (activeControl instanceof RadioControl) {
    activeControl.setSelect(codes)
  }
}

export function applyValueLinkedControlToggle(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 当前元素索引，用于记录遍历或命中过程的位置。 */
  curIndex: number
}) {
  const { draw, elementList, curIndex } = payload
  const curElement = elementList[curIndex]
  if (!curElement) {
    return false
  }
  if (
    curElement.controlComponent !== ControlComponent.VALUE ||
    (curElement.control?.type !== ControlType.CHECKBOX &&
      curElement.control?.type !== ControlType.RADIO)
  ) {
    return false
  }
  let preIndex = curIndex
  while (preIndex > 0) {
    const preElement = elementList[preIndex]
    if (!preElement) {
      preIndex--
      continue
    }
    if (preElement.controlComponent === ControlComponent.CHECKBOX) {
      applyCheckboxToggle({ draw, element: preElement })
      return true
    }
    if (preElement.controlComponent === ControlComponent.RADIO) {
      applyRadioToggle({ draw, element: preElement })
      return true
    }
    preIndex--
  }
  return false
}
