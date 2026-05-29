import { ControlComponent } from '../../../../../dataset/enum/Control'
import {
  IControlContext,
  IControlRuleOption
} from '../../../../../interface/Control'
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
    const controlBoundary = this.control.getDraw().getTargetResolver().resolveControlBoundaryElements({
      range: context.range,
      elementList
    })
    if (!controlBoundary) return
    for (let i = controlBoundary.startIndex; i <= controlBoundary.endIndex; i++) {
      const element = elementList[i]
      if (element.controlComponent === ControlComponent.RADIO) {
        const radio = element.radio!
        radio.value = codes.includes(String(radio.code))
      }
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
