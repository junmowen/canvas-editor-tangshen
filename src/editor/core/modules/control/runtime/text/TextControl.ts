import { ControlComponent } from '../../../../../dataset/enum/Control'
import { ElementType } from '../../../../../dataset/enum/Element'
import { KeyMap } from '../../../../../dataset/enum/KeyMap'
import { DeepRequired } from '../../../../../interface/Common'
import {
  IControlContext,
  IControlInstance,
  IControlRuleOption
} from '../../../../../interface/Control'
import { IEditorOption } from '../../../../../interface/Editor'
import { IElement } from '../../../../../interface/Element'
import { Control } from '../Control'
import { resolveControlAnchorElement } from '../controlAnchor'
import { createNestedControlValueElementList } from '../controlNested'
import {
  collectControlValueElementList,
  isBackspaceRemoveControlStructure,
  isDeleteRemoveControlStructure,
  resolveStartPlaceholderOnlyControlRange
} from '../controlValue'

/**
 * 文本控件。
 *
 * 处理文本输入控件，支持文本的输入、删除、剪切等操作。
 */
export class TextControl implements IControlInstance {
  /** 控件元素 */
  private element: IElement
  /** 控件管理器 */
  private control: Control
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
    this.options = draw.getOptions()
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
   * 获取控件值。
   *
   * @param context - 控件上下文
   * @returns 控件值元素列表
   */
  public getValue(context: IControlContext = {}): IElement[] {
    const elementList = context.elementList || this.control.getDraw().getObjectResolver().getElementList()
    const { startIndex } = context.range || this.control.getDraw().getRange().getEditBoundaryRange()
    return collectControlValueElementList({
      elementList,
      startIndex,
      includeNestedParentControl: true
    })
  }

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
    const elementList = context.elementList || this.control.getDraw().getObjectResolver().getElementList()
    const range = context.range || this.control.getDraw().getRange().getEditBoundaryRange()
    // 收缩边界到Value内
    this.control.shrinkBoundary(context)
    const { startIndex, endIndex } = range
    const draw = this.control.getDraw()
    const targetResolver = draw.getTargetResolver()
    const { startElement } = targetResolver.resolveRangeBoundaryElements({
      range,
      elementList
    })
    if (!startElement) return -1
    const insertData = data.flatMap(item =>
      item.type === ElementType.CONTROL && item.control
        ? this.convertNestedControlToValueElementList(item, startElement)
        : item
    )
    const placeholderOnlyRange = resolveStartPlaceholderOnlyControlRange({
      elementList,
      startIndex
    })
    // 移除选区元素
    if (startIndex !== endIndex) {
      draw.spliceElementList(
        elementList,
        placeholderOnlyRange ? placeholderOnlyRange[0] : startIndex + 1,
        placeholderOnlyRange
          ? placeholderOnlyRange[1] - placeholderOnlyRange[0] + 1
          : endIndex - startIndex,
        [],
        {
          isIgnoreDeletedRule: options.isIgnoreDeletedRule
        }
      )
    } else {
      // 移除空白占位符
      this.control.removePlaceholder(startIndex, context)
    }
    // 非文本类元素或前缀过渡掉样式属性
    const anchorElement = resolveControlAnchorElement(startElement)
    const newIndex = this.control.insertControlValueElementList({
      elementList,
      startIndex,
      insertIndex: placeholderOnlyRange ? range.startIndex : range.startIndex + 1,
      data: insertData,
      anchorElement,
      isPreserveControlComponent: true
    })
    this.syncParentAffix(elementList, startElement.controlId)
    return newIndex
  }

  private syncParentAffix(elementList: IElement[], controlId?: string) {
    if (!controlId) return
    const valueElementList = elementList.filter(
      element =>
        element.controlId === controlId &&
        element.controlComponent === ControlComponent.VALUE
    )
    const childElementList = elementList.filter(
      element => element.parentControlId === controlId
    )
    const isOnlyNestedControlValue =
      !valueElementList.length &&
      !!childElementList.length &&
      new Set(childElementList.map(element => element.controlId)).size === 1
    const control = elementList.find(
      element => element.controlId === controlId && element.control
    )?.control
    const prefix = isOnlyNestedControlValue
      ? ''
      : control?.prefix ?? this.options.control.prefix
    const postfix = isOnlyNestedControlValue
      ? ''
      : control?.postfix ?? this.options.control.postfix
    this.setAffixValue(elementList, controlId, ControlComponent.PREFIX, prefix)
    this.setAffixValue(elementList, controlId, ControlComponent.POSTFIX, postfix)
  }

  private setAffixValue(
    elementList: IElement[],
    controlId: string,
    component: ControlComponent,
    value: string
  ) {
    const affixElementList = elementList.filter(
      element =>
        element.controlId === controlId && element.controlComponent === component
    )
    const valueList = value.split('')
    affixElementList.forEach((element, index) => {
      element.value = valueList[index] || ''
    })
  }

  private convertNestedControlToValueElementList(
    element: IElement,
    startElement: IElement
  ): IElement[] {
    return createNestedControlValueElementList({
      element,
      startElement,
      editorOptions: this.options
    })
  }

  /**
   * 清空控件值。
   *
   * @param context - 控件上下文
   * @param options - 控件规则选项
   * @returns 新的光标位置
   */
  public clearValue(
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
    const elementList = context.elementList || this.control.getDraw().getObjectResolver().getElementList()
    const range = context.range || this.control.getDraw().getRange().getEditBoundaryRange()
    const { startIndex, endIndex } = range
    return this.control.removeControlValueSegment({
      deleteIndex: startIndex + 1,
      deleteCount: endIndex - startIndex,
      placeholderIndex: startIndex,
      context: {
        ...context,
        elementList
      },
      options
    })
  }

  /**
   * 处理键盘按下事件。
   *
   * 处理退格键和删除键。
   *
   * @param evt - 键盘事件
   * @returns 新的光标位置，不支持的操作返回 null
   */
  public keydown(evt: KeyboardEvent): number | null {
    if (this.control.getIsDisabledControl()) {
      return null
    }
    const elementList = this.control.getDraw().getObjectResolver().getElementList()
    const range = this.control.getDraw().getRange().getEditBoundaryRange()
    // 收缩边界到Value内
    this.control.shrinkBoundary()
    const { startIndex, endIndex } = range
    const draw = this.control.getDraw()
    const targetResolver = draw.getTargetResolver()
    const { startElement, endElement } = targetResolver.resolveRangeBoundaryElements({
      range,
      elementList
    })
    if (!startElement || !endElement) return null
    // backspace
    if (evt.key === KeyMap.Backspace) {
      // 移除选区元素
      if (startIndex !== endIndex) {
        if (
          this.control.getIsRangeControlDeletionDisabled({
            range,
            elementList
          })
        ) {
          return startIndex
        }
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
        if (
          this.control.getIsRangeControlDeletionDisabled({
            range,
            elementList
          })
        ) {
          return startIndex
        }
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

  /**
   * 处理剪切事件。
   *
   * @returns 新的光标位置
   */
  public cut(): number {
    if (this.control.getIsDisabledControl()) {
      return -1
    }
    this.control.shrinkBoundary()
    const { startIndex, endIndex } = this.control.getDraw().getRange().getEditBoundaryRange()
    if (startIndex === endIndex) {
      return startIndex
    }
    const elementList = this.control.getDraw().getObjectResolver().getElementList()
    return this.control.removeControlValueSegment({
      deleteIndex: startIndex + 1,
      deleteCount: endIndex - startIndex,
      placeholderIndex: startIndex,
      context: { elementList }
    })
  }
}
