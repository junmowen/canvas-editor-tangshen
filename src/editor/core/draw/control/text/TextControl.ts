import {
  CONTROL_STYLE_ATTR,
  EDITOR_ROW_ATTR,
  TEXTLIKE_ELEMENT_TYPE
} from '../../../../dataset/constant/Element'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { EditorMode } from '../../../../dataset/enum/Editor'
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
import {
  formatElementContext,
  formatElementList
} from '../../../../utils/element'
import { Control } from '../Control'
import { collectControlValueElementList } from '../controlValue'

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
    const elementList = context.elementList || this.control.getElementList()
    const { startIndex } = context.range || this.control.getEditBoundaryRange()
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
    const elementList = context.elementList || this.control.getElementList()
    const range = context.range || this.control.getEditBoundaryRange()
    // 收缩边界到Value内
    this.control.shrinkBoundary(context)
    const { startIndex, endIndex } = range
    const draw = this.control.getDraw()
    const startElement = elementList[startIndex]
    const insertData = data.flatMap(item =>
      item.type === ElementType.CONTROL && item.control
        ? this.convertNestedControlToValueElementList(item, startElement)
        : item
    )
    const isStartPlaceholderOnlyControl =
      startElement.controlComponent === ControlComponent.PLACEHOLDER &&
      !elementList[startIndex - 1]?.controlId
    // 移除选区元素
    if (startIndex !== endIndex) {
      let placeholderEndIndex = startIndex
      if (isStartPlaceholderOnlyControl) {
        while (
          placeholderEndIndex + 1 < elementList.length &&
          elementList[placeholderEndIndex + 1]?.controlId ===
            startElement.controlId &&
          elementList[placeholderEndIndex + 1]?.controlComponent ===
            ControlComponent.PLACEHOLDER
        ) {
          placeholderEndIndex++
        }
      }
      draw.spliceElementList(
        elementList,
        isStartPlaceholderOnlyControl ? startIndex : startIndex + 1,
        isStartPlaceholderOnlyControl
          ? placeholderEndIndex - startIndex + 1
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
    const start =
      isStartPlaceholderOnlyControl ? range.startIndex : range.startIndex + 1
    for (let i = 0; i < insertData.length; i++) {
      const newElement: IElement = {
        ...anchorElement,
        ...insertData[i],
        controlComponent: insertData[i].controlComponent || ControlComponent.VALUE
      }
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      draw.spliceElementList(elementList, start + i, 0, [newElement])
    }
    this.syncParentAffix(elementList, startElement.controlId)
    return start + insertData.length - 1
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
    const nestedElementList: IElement[] = [
      {
        ...pickObject(element, EDITOR_ROW_ATTR),
        ...pickObject(element.control!, CONTROL_STYLE_ATTR),
        ...element,
        control: {
          ...element.control!,
          value: element.control!.value ? [...element.control!.value] : null
        }
      } as IElement
    ]
    formatElementList(nestedElementList, {
      isHandleFirstElement: false,
      isForceCompensation: false,
      isFromControlValue: true,
      parentControlId: startElement.controlId,
      editorOptions: this.options
    })
    return nestedElementList
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
    const elementList = context.elementList || this.control.getElementList()
    const range = context.range || this.control.getEditBoundaryRange()
    const { startIndex, endIndex } = range
    this.control
      .getDraw()
      .spliceElementList(
        elementList,
        startIndex + 1,
        endIndex - startIndex,
        [],
        {
          isIgnoreDeletedRule: options.isIgnoreDeletedRule
        }
      )
    const value = this.getValue(context)
    if (!value.length) {
      this.control.addPlaceholder(startIndex, context)
    }
    return startIndex
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
        if (this.getIsDeleteControlStructure(startIndex, endIndex, elementList)) {
          return startIndex
        }
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
        if (this.getIsDeleteControlStructure(startIndex, endIndex, elementList)) {
          return startIndex
        }
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

  private getIsDeleteControlStructure(
    startIndex: number,
    endIndex: number,
    elementList: IElement[]
  ): boolean {
    const draw = this.control.getDraw()
    const options = draw.getOptions()
    if (
      draw.getMode() !== EditorMode.FORM ||
      !options.modeRule[EditorMode.FORM].controlDeletableDisabled
    ) {
      return false
    }
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const element = elementList[i]
      if (
        element?.controlId &&
        element.controlComponent !== ControlComponent.VALUE
      ) {
        return true
      }
    }
    return false
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
}
