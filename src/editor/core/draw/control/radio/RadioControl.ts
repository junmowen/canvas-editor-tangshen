import { ControlComponent } from '../../../../dataset/enum/Control'
import {
  IControlContext,
  IControlRuleOption
} from '../../../../interface/Control'
import { CheckboxControl } from '../checkbox/CheckboxControl'

/**
 * 单选框控件。
 *
 * 继承复选框控件，但实现单选逻辑，即同一组中只能选中一个选项。
 */
export class RadioControl extends CheckboxControl {
  /**
   * 设置选中状态。
   *
   * 重写父类方法，实现单选逻辑。
   *
   * @param codes - 选中项的代码列表（单选时只应有一个）
   * @param context - 控件上下文
   * @param options - 控件规则选项
   */
  public setSelect(
    codes: string[],
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ) {
    // 校验是否可以设置（控件未禁用或忽略禁用规则）
    if (
      !options.isIgnoreDisabledRule &&
      this.control.getIsDisabledControl(context)
    ) {
      return
    }
    const { control } = this.element
    const elementList = context.elementList || this.control.getElementList()
    const { startIndex } = context.range || this.control.getEditBoundaryRange()
    const startElement = elementList[startIndex]
    // 向左查找单选项
    let preIndex = startIndex
    while (preIndex > 0) {
      const preElement = elementList[preIndex]
      // 遇到前缀或前文本时停止
      if (
        preElement.controlId !== startElement.controlId ||
        preElement.controlComponent === ControlComponent.PREFIX ||
        preElement.controlComponent === ControlComponent.PRE_TEXT
      ) {
        break
      }
      // 更新单选框值
      if (preElement.controlComponent === ControlComponent.RADIO) {
        const radio = preElement.radio!
        radio.value = codes.includes(radio.code!)
      }
      preIndex--
    }
    // 向右查找单选项
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      // 遇到后缀或后文本时停止
      if (
        nextElement.controlId !== startElement.controlId ||
        nextElement.controlComponent === ControlComponent.POSTFIX ||
        nextElement.controlComponent === ControlComponent.POST_TEXT
      ) {
        break
      }
      // 更新单选框值
      if (nextElement.controlComponent === ControlComponent.RADIO) {
        const radio = nextElement.radio!
        radio.value = codes.includes(radio.code!)
      }
      nextIndex++
    }
    // 更新控件代码
    control!.code = codes.join(',')
    // 重新绘制控件
    this.control.repaintControl({
      curIndex: startIndex,
      isSetCursor: false
    })
    // 触发控件内容变更事件
    this.control.emitControlContentChange({
      context
    })
  }
}
