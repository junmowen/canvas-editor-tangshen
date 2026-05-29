import { ControlComponent } from '../../../../../dataset/enum/Control'
import { KeyMap } from '../../../../../dataset/enum/KeyMap'
import {
  IControlContext,
  IControlInstance,
  IControlRuleOption
} from '../../../../../interface/Control'
import { IElement } from '../../../../../interface/Element'
import { Control } from '../Control'

/**
 * 复选框控件。
 *
 * 实现复选框的选中状态管理和交互逻辑。
 */
export class CheckboxControl implements IControlInstance {
  /** 控件元素 */
  protected element: IElement
  /** 控件管理器 */
  protected control: Control

  /**
   * 构造函数。
   *
   * @param element - 控件元素
   * @param control - 控件管理器
   */
  constructor(element: IElement, control: Control) {
    this.element = element
    this.control = control
  }

  /**
   * 设置控件元素。
   *
   * @param element - 新的控件元素
   */
  public setElement(element: IElement) {
    this.element = element
  }

  /**
   * 获取控件元素。
   *
   * @returns 控件元素
   */
  public getElement(): IElement {
    return this.element
  }

  /**
   * 获取控件代码。
   *
   * @returns 控件代码，不存在时返回 null
   */
  public getCode(): string | null {
    const code = this.element.control?.code
    return code !== undefined && code !== null ? String(code) : null
  }

  /**
   * 获取控件值。
   *
   * 收集复选框控件的所有值元素。
   *
   * @returns 控件元素列表
   */
  public getValue(): IElement[] {
    const elementList = this.control.getElementList()
    const { startIndex } = this.control.getEditBoundaryRange()
    const controlBoundary = this.control.getDraw().getTargetResolver().resolveControlBoundaryElements({
      elementList,
      range: {
        startIndex,
        endIndex: startIndex
      }
    })
    if (!controlBoundary) return []
    // 初始化 data 列表。
    const data: IElement[] = []
    for (let i = controlBoundary.startIndex; i <= controlBoundary.endIndex; i++) {
      const element = elementList[i]
      if (element.controlComponent === ControlComponent.VALUE) {
        data.push(element)
      }
    }
    return data
  }

  /**
   * 设置控件值。
   *
   * 复选框控件通过 setSelect 方法设置值，此方法不实现。
   *
   * @returns -1
   */
  public setValue(): number {
    return -1
  }

  /**
   * 设置选中状态。
   *
   * 根据传入的代码列表设置复选框的选中状态。
   *
   * @param codes - 选中项的代码列表
   * @param context - 控件上下文
   * @param options - 控件规则选项
   */
  public setSelect(
    codes: string[],
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ) {
    // 如果控件被禁用且不忽略禁用规则，直接返回
    if (
      !options.isIgnoreDisabledRule &&
      this.control.getIsDisabledControl(context)
    ) {
      return
    }
    const { control } = this.element
    const elementList = context.elementList || this.control.getElementList()
    const { startIndex } = context.range || this.control.getEditBoundaryRange()
    const targetResolver = this.control.getDraw().getTargetResolver()
    const controlBoundary = targetResolver.resolveControlBoundaryElements({
      range: context.range,
      elementList
    })
    if (!controlBoundary) return
    for (let i = controlBoundary.startIndex; i <= controlBoundary.endIndex; i++) {
      const element = elementList[i]
      if (element.controlComponent === ControlComponent.CHECKBOX) {
        const checkbox = element.checkbox!
        checkbox.value = codes.includes(String(checkbox.code))
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

  /**
   * 处理键盘按下事件。
   *
   * @param evt - 键盘事件
   * @returns 新的光标位置，不支持的操作返回 null
   */
  public keydown(evt: KeyboardEvent): number | null {
    // 如果控件被禁用，不处理键盘事件
    if (this.control.getIsDisabledControl()) {
      return null
    }
    const range = this.control.getEditBoundaryRange()
    const { startIndex, endIndex } = range
    // 处理删除键：删除控件
    if (evt.key === KeyMap.Backspace || evt.key === KeyMap.Delete) {
      return this.control.removeControl(startIndex)
    }
    // 其他按键返回结束位置
    return endIndex
  }

  /**
   * 处理剪切事件。
   *
   * 复选框控件不支持剪切。
   *
   * @returns -1
   */
  public cut(): number {
    return -1
  }
}
