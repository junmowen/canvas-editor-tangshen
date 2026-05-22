import {
  CONTROL_STYLE_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR,
  TEXTLIKE_ELEMENT_TYPE
} from '../../../../dataset/constant/Element'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { ElementType } from '../../../../dataset/enum/Element'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import { DeepRequired } from '../../../../interface/Common'
import {
  IControlContext,
  IControlInstance,
  IControlRuleOption
} from '../../../../interface/Control'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement } from '../../../../interface/Element'
import { omitObject, pickObject } from '../../../../utils'
import { formatElementContext } from '../../../../utils/element'
import { Draw } from '../../Draw'
import { DatePicker } from '../../particle/date/DatePicker'
import { Control } from '../Control'
import {
  collectControlValueElementList,
  resolveControlValueBoundary
} from '../controlValue'

/**
 * 日期控件。
 *
 * 提供日期选择功能，通过日期选择器弹出选择日期。
 */
export class DateControl implements IControlInstance {
  /** Draw 门面对象 */
  private draw: Draw
  /** 控件元素 */
  private element: IElement
  /** 控件管理器 */
  private control: Control
  /** 是否已弹出日期选择器 */
  private isPopup: boolean
  /** 日期选择器实例 */
  private datePicker: DatePicker | null
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>

  /**
   * 构造函数。
   *
   * @param element - 控件元素
   * @param control - 控件管理器
   */
  constructor(element: IElement, control: Control) {
    const draw = control.getDraw()
    this.draw = draw
    this.options = draw.getOptions()
    this.element = element
    this.control = control
    // 初始化状态
    this.isPopup = false
    this.datePicker = null
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
   * 判断日期选择器是否已弹出。
   *
   * @returns 是否已弹出
   */
  public getIsPopup(): boolean {
    return this.isPopup
  }

  /**
   * 获取控件值的范围索引。
   *
   * @param context - 控件上下文
   * @returns 控件值的起始和结束索引，不存在时返回 null
   */
  public getValueRange(context: IControlContext = {}): [number, number] | null {
    const elementList = context.elementList || this.control.getElementList()
    const { startIndex } =
      context.range || this.control.getEditBoundaryRange()
    return resolveControlValueBoundary({ elementList, startIndex })
  }

  /**
   * 获取控件值。
   *
   * @param context - 控件上下文
   * @returns 控件值元素列表
   */
  public getValue(context: IControlContext = {}): IElement[] {
    const elementList = context.elementList || this.control.getElementList()
    const { startIndex } =
      context.range || this.control.getEditBoundaryRange()
    return collectControlValueElementList({ elementList, startIndex })
  }

  /**
   * 设置控件值。
   *
   * @param data - 元素列表
   * @param context - 控件上下文
   * @param options - 控件规则选项
   * @returns 新的光标位置
   */
  public setValue(
    data: IElement[],
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ): number {
    // 校验是否可以设置
    if (
      !options.isIgnoreDisabledRule &&
      this.control.getIsDisabledControl(context)
    ) {
      return -1
    }
    const elementList = context.elementList || this.control.getElementList()
    const range = context.range || this.control.getEditBoundaryRange()
    // 收缩边界到Value内
    this.control.shrinkBoundary(context)
    const { startIndex, endIndex } = range
    const draw = this.control.getDraw()
    // 移除选区元素
    if (startIndex !== endIndex) {
      draw.spliceElementList(elementList, startIndex + 1, endIndex - startIndex)
    } else {
      // 移除空白占位符
      this.control.removePlaceholder(startIndex, context)
    }
    // 非文本类元素或前缀过渡掉样式属性
    const startElement = elementList[startIndex]
    const anchorElement =
      (startElement.type &&
        !TEXTLIKE_ELEMENT_TYPE.includes(startElement.type)) ||
      startElement.controlComponent === ControlComponent.PREFIX ||
      startElement.controlComponent === ControlComponent.PRE_TEXT
        ? pickObject(startElement, [
            'control',
            'controlId',
            ...CONTROL_STYLE_ATTR
          ])
        : omitObject(startElement, ['type'])
    // 插入起始位置
    const start = range.startIndex + 1
    for (let i = 0; i < data.length; i++) {
      const newElement: IElement = {
        ...anchorElement,
        ...data[i],
        controlComponent: ControlComponent.VALUE
      }
      // 格式化元素上下文
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      draw.spliceElementList(elementList, start + i, 0, [newElement])
    }
    return start + data.length - 1
  }

  /**
   * 清空选中状态。
   *
   * @param context - 控件上下文
   * @param options - 控件规则选项
   * @returns 新的光标位置
   */
  public clearSelect(
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ): number {
    const { isIgnoreDisabledRule = false, isAddPlaceholder = true } = options
    // 校验是否可以设置
    if (!isIgnoreDisabledRule && this.control.getIsDisabledControl(context)) {
      return -1
    }
    const range = this.getValueRange(context)
    if (!range) return -1
    const [leftIndex, rightIndex] = range
    if (!~leftIndex || !~rightIndex) return -1
    const elementList = context.elementList || this.control.getElementList()
    // 删除元素
    const draw = this.control.getDraw()
    draw.spliceElementList(
      elementList,
      leftIndex + 1,
      rightIndex - leftIndex,
      [],
      {
        isIgnoreDeletedRule: options.isIgnoreDeletedRule
      }
    )
    // 增加占位符
    if (isAddPlaceholder) {
      this.control.addPlaceholder(leftIndex, context)
    }
    return leftIndex
  }

  public setSelect(
    date: string,
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ) {
    // 校验是否可以设置
    if (
      !options.isIgnoreDisabledRule &&
      this.control.getIsDisabledControl(context)
    ) {
      return
    }
    const elementList = context.elementList || this.control.getElementList()
    const range = context.range || this.control.getEditBoundaryRange()
    // 样式赋值元素-默认值的第一个字符样式，否则取默认样式
    const valueElement = this.getValue(context)[0]
    const styleElement = valueElement
      ? pickObject(valueElement, EDITOR_ELEMENT_STYLE_ATTR)
      : pickObject(elementList[range.startIndex], CONTROL_STYLE_ATTR)
    // 清空选项
    const prefixIndex = this.clearSelect(context, {
      isAddPlaceholder: false,
      isIgnoreDeletedRule: options.isIgnoreDeletedRule
    })
    if (!~prefixIndex) return
    // 属性赋值元素-默认为前缀属性
    const propertyElement = omitObject(
      elementList[prefixIndex],
      EDITOR_ELEMENT_STYLE_ATTR
    )
    const start = prefixIndex + 1
    const draw = this.control.getDraw()
    for (let i = 0; i < date.length; i++) {
      const newElement: IElement = {
        ...styleElement,
        ...propertyElement,
        type: ElementType.TEXT,
        value: date[i],
        controlComponent: ControlComponent.VALUE
      }
      formatElementContext(elementList, [newElement], prefixIndex, {
        editorOptions: this.options
      })
      draw.spliceElementList(elementList, start + i, 0, [newElement])
    }
    // 重新渲染控件
    if (!context.range) {
      const newIndex = start + date.length - 1
      this.control.repaintControl({
        curIndex: newIndex
      })
      this.control.emitControlContentChange({
        context
      })
      this.destroy()
    }
  }

  public keydown(evt: KeyboardEvent): number | null {
    if (this.control.getIsDisabledControl()) {
      return null
    }
    const elementList = this.control.getElementList()
    const range = this.control.getEditBoundaryRange()
    // 收缩边界到Value内
    this.control.shrinkBoundary()
    const { startIndex, endIndex } = range
    const startElement = elementList[startIndex]
    const endElement = elementList[endIndex]
    const draw = this.control.getDraw()
    // backspace
    if (evt.key === KeyMap.Backspace) {
      // 移除选区元素
      if (startIndex !== endIndex) {
        draw.spliceElementList(
          elementList,
          startIndex + 1,
          endIndex - startIndex
        )
        const value = this.getValue()
        if (!value.length) {
          this.control.addPlaceholder(startIndex)
        }
        return startIndex
      } else {
        if (
          startElement.controlComponent === ControlComponent.PREFIX ||
          startElement.controlComponent === ControlComponent.PRE_TEXT ||
          endElement.controlComponent === ControlComponent.POSTFIX ||
          endElement.controlComponent === ControlComponent.POST_TEXT ||
          startElement.controlComponent === ControlComponent.PLACEHOLDER
        ) {
          // 前缀、后缀、占位符
          return this.control.removeControl(startIndex)
        } else {
          // 文本
          draw.spliceElementList(elementList, startIndex, 1)
          const value = this.getValue()
          if (!value.length) {
            this.control.addPlaceholder(startIndex - 1)
          }
          return startIndex - 1
        }
      }
    } else if (evt.key === KeyMap.Delete) {
      // 移除选区元素
      if (startIndex !== endIndex) {
        draw.spliceElementList(
          elementList,
          startIndex + 1,
          endIndex - startIndex
        )
        const value = this.getValue()
        if (!value.length) {
          this.control.addPlaceholder(startIndex)
        }
        return startIndex
      } else {
        const endNextElement = elementList[endIndex + 1]
        if (
          ((startElement.controlComponent === ControlComponent.PREFIX ||
            startElement.controlComponent === ControlComponent.PRE_TEXT) &&
            endNextElement.controlComponent === ControlComponent.PLACEHOLDER) ||
          endNextElement.controlComponent === ControlComponent.POSTFIX ||
          endNextElement.controlComponent === ControlComponent.POST_TEXT ||
          startElement.controlComponent === ControlComponent.PLACEHOLDER
        ) {
          // 前缀、后缀、占位符
          return this.control.removeControl(startIndex)
        } else {
          // 文本
          draw.spliceElementList(elementList, startIndex + 1, 1)
          const value = this.getValue()
          if (!value.length) {
            this.control.addPlaceholder(startIndex)
          }
          return startIndex
        }
      }
    }
    return endIndex
  }

  public cut(): number {
    if (this.control.getIsDisabledControl()) {
      return -1
    }
    this.control.shrinkBoundary()
    const { startIndex, endIndex } = this.control.getEditBoundaryRange()
    if (startIndex === endIndex) {
      return startIndex
    }
    const draw = this.control.getDraw()
    const elementList = this.control.getElementList()
    draw.spliceElementList(elementList, startIndex + 1, endIndex - startIndex)
    const value = this.getValue()
    if (!value.length) {
      this.control.addPlaceholder(startIndex)
    }
    return startIndex
  }

  public awake() {
    if (
      this.isPopup ||
      this.control.getIsDisabledControl() ||
      !this.control.getIsRangeWithinControl()
    ) {
      return
    }
    const positionList = this.control.getDraw().getPosition().getPositionList()
    const { endIndex } = this.control.getEditBoundaryRange()
    const position = positionList[endIndex] || null
    if (!position) return
    const elementList = this.draw.getElementList()
    const { startIndex } = this.control.getEditBoundaryRange()
    if (elementList[startIndex + 1]?.controlId !== this.element.controlId) {
      return
    }
    // 渲染日期控件
    this.datePicker = new DatePicker(this.draw, this.draw.getComponents().i18n, {
      onSubmit: this._setDate.bind(this)
    })
    const value =
      this.getValue()
        .map(el => el.value)
        .join('') || ''
    const dateFormat = this.element.control?.dateFormat
    this.datePicker.render({
      value,
      position,
      dateFormat
    })
    // 弹窗状态
    this.isPopup = true
  }

  public destroy() {
    if (!this.isPopup) return
    this.datePicker?.destroy()
    this.isPopup = false
  }

  private _setDate(date: string) {
    if (!date) {
      this.clearSelect()
    } else {
      this.setSelect(date)
    }
    this.destroy()
  }
}
