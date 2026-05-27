import {
  CONTROL_STYLE_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR
} from '../../../../dataset/constant/Element'
import { KeyMap } from '../../../../dataset/enum/KeyMap'
import {
  IControlContext,
  IControlInstance,
  IControlRuleOption
} from '../../../../interface/Control'
import { IElement } from '../../../../interface/Element'
import { omitObject, pickObject } from '../../../../utils'
import { Draw } from '../../Draw'
import { DatePicker } from '../../particle/date/DatePicker'
import { Control } from '../Control'
import { resolvePositionAtIndex } from '../../../event/utils/resolvePositionAtIndex'
import {
  collectControlValueElementList,
  resolveControlValueBoundary
} from '../controlValue'
import {
  isBackspaceRemoveControlStructure,
  isDeleteRemoveControlStructure
} from '../controlValue'
import { resolveControlAnchorElement } from '../controlAnchor'

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

  /**
   * 构造函数。
   *
   * @param element - 控件元素
   * @param control - 控件管理器
   */
  constructor(element: IElement, control: Control) {
    const draw = control.getDraw()
    this.draw = draw
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
    const targetResolver = this.draw.getTargetResolver()
    // 收缩边界到Value内
    this.control.shrinkBoundary(context)
    const { startIndex, endIndex } = range
    const draw = this.control.getDraw()
    const startElement = targetResolver.resolveRangeElement({
      range,
      elementList
    })
    if (!startElement) return -1
    // 移除选区元素
    if (startIndex !== endIndex) {
      draw.spliceElementList(elementList, startIndex + 1, endIndex - startIndex)
    } else {
      // 移除空白占位符
      this.control.removePlaceholder(startIndex, context)
    }
    // 非文本类元素或前缀过渡掉样式属性
    const anchorElement = resolveControlAnchorElement(startElement)
    return this.control.insertControlValueElementList({
      elementList,
      startIndex,
      data,
      anchorElement
    })
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
    return this.control.clearControlValueRange({
      leftIndex,
      rightIndex,
      context,
      options: {
        ...options,
        isAddPlaceholder
      }
    })
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
    const startElement = this.draw.getTargetResolver().resolveRangeElement({
      range,
      elementList
    })
    if (!startElement) return
    const styleElement = valueElement
      ? pickObject(valueElement, EDITOR_ELEMENT_STYLE_ATTR)
      : pickObject(startElement, CONTROL_STYLE_ATTR)
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
    const newIndex = this.control.insertControlTextValueElementList({
      elementList,
      prefixIndex,
      valueList: date.split(''),
      styleElement,
      propertyElement
    })
    // 重新渲染控件
    if (!context.range) {
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
    const targetResolver = this.control.getDraw().getTargetResolver()
    const { startElement, endElement } = targetResolver.resolveRangeBoundaryElements({
      range,
      elementList
    })
    if (!startElement || !endElement) return null
    // backspace
    if (evt.key === KeyMap.Backspace) {
      // 移除选区元素
      if (startIndex !== endIndex) {
        return this.control.removeControlValueSegment({
          deleteIndex: startIndex + 1,
          deleteCount: endIndex - startIndex,
          placeholderIndex: startIndex,
          context: { elementList }
        })
      } else {
        if (isBackspaceRemoveControlStructure({ startElement, endElement })) {
          // 前缀、后缀、占位符
          return this.control.removeControl(startIndex)
        } else {
          // 文本
          return this.control.removeControlValueSegment({
            deleteIndex: startIndex,
            deleteCount: 1,
            placeholderIndex: startIndex - 1,
            context: { elementList }
          })
        }
      }
    } else if (evt.key === KeyMap.Delete) {
      // 移除选区元素
      if (startIndex !== endIndex) {
        return this.control.removeControlValueSegment({
          deleteIndex: startIndex + 1,
          deleteCount: endIndex - startIndex,
          placeholderIndex: startIndex,
          context: { elementList }
        })
      } else {
        const endNextElement = targetResolver.resolveRangeElement({
          range,
          elementList,
          anchor: 'end',
          offset: 1
        })
        if (isDeleteRemoveControlStructure({ startElement, endNextElement })) {
          // 前缀、后缀、占位符
          return this.control.removeControl(startIndex)
        } else {
          // 文本
          return this.control.removeControlValueSegment({
            deleteIndex: startIndex + 1,
            deleteCount: 1,
            placeholderIndex: startIndex,
            context: { elementList }
          })
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
    const elementList = this.control.getElementList()
    return this.control.removeControlValueSegment({
      deleteIndex: startIndex + 1,
      deleteCount: endIndex - startIndex,
      placeholderIndex: startIndex,
      context: { elementList }
    })
  }

  public awake() {
    if (
      this.isPopup ||
      this.control.getIsDisabledControl() ||
      !this.control.getIsRangeWithinControl()
    ) {
      return
    }
    const { endIndex } = this.control.getEditBoundaryRange()
    const position = resolvePositionAtIndex(this.control.getDraw(), endIndex)
    if (!position) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const { startIndex } = this.control.getEditBoundaryRange()
    // 日期弹窗只在当前光标仍属于同一控件结构时才打开。
    const controlBoundary = this.draw.getTargetResolver().resolveControlBoundaryElements({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!controlBoundary || startIndex >= controlBoundary.endIndex) {
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
