import {
  CONTROL_STYLE_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR
} from '../../../../../dataset/constant/Element'
import { KeyMap } from '../../../../../dataset/enum/KeyMap'
import {
  IControlContext,
  IControlInstance,
  IControlRuleOption
} from '../../../../../interface/Control'
import { IElement } from '../../../../../interface/Element'
import {
  isArrayEqual,
  isNonValue,
  omitObject,
  pickObject,
  splitText
} from '../../../../../utils'
import { Control } from '../Control'
import { resolvePositionAtIndex } from '../../../../position/utils/resolvePositionAtIndex'
import { resolveControlAnchorElement } from '../controlAnchor'
import {
  collectControlValueElementList,
  isBackspaceRemoveControlStructure,
  isDeleteRemoveControlStructure,
  resolveControlValueBoundary
} from '../controlValue'
import { EDITOR_COMPONENT, EDITOR_PREFIX } from '../../../../../dataset/constant/Editor'
import { EditorComponent } from '../../../../../dataset/enum/Editor'

/**
 * 下拉选择控件。
 *
 * 提供下拉选择功能，支持单选和多选模式。
 */
export class SelectControl implements IControlInstance {
  /** 控件元素 */
  private element: IElement
  /** 控件管理器 */
  private control: Control
  /** 下拉框是否已弹出 */
  private isPopup: boolean
  /** 下拉框 DOM 元素 */
  private selectDom: HTMLDivElement | null
  /** 多选重绘时保留弹窗滚动位置 */
  private popupScrollTop: number
  /** 值分隔符 */
  private VALUE_DELIMITER = ','
  /** 默认多选分隔符 */
  private DEFAULT_MULTI_SELECT_DELIMITER = ','

  /**
   * 构造函数。
   *
   * @param element - 控件元素
   * @param control - 控件管理器
   */
  constructor(element: IElement, control: Control) {
    this.element = element
    this.control = control
    // 初始化状态
    this.isPopup = false
    this.selectDom = null
    this.popupScrollTop = 0
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
   * 判断下拉框是否已弹出。
   *
   * @returns 是否已弹出
   */
  public getIsPopup(): boolean {
    return this.isPopup
  }

  /**
   * 获取选中的代码列表。
   *
   * @returns 代码数组
   */
  public getCodes(): string[] {
    return this.element?.control?.code !== undefined &&
      this.element.control.code !== null
      ? String(this.element.control.code).split(',')
      : []
  }

  /**
   * 根据代码列表获取对应的文本值。
   *
   * @param codes - 代码数组
   * @returns 文本值，使用分隔符连接，不存在时返回 null
   */
  public getText(codes: string[]): string | null {
    if (!this.element?.control) return null
    const control = this.element.control
    if (!control.valueSets?.length) return null
    // 获取多选分隔符
    const multiSelectDelimiter =
      control?.multiSelectDelimiter || this.DEFAULT_MULTI_SELECT_DELIMITER
    const valueSets = control.valueSets
    const valueList: string[] = []
    // 将代码转换为对应的值
    codes.forEach(code => {
      const valueSet = valueSets.find(v => String(v.code) === code)
      if (valueSet && !isNonValue(valueSet.value)) {
        valueList.push(valueSet.value)
      }
    })
    // 用分隔符连接值
    return valueList.join(multiSelectDelimiter) || null
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
    return collectControlValueElementList({ elementList, startIndex })
  }

  public setValue(
    data: IElement[],
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ): number {
    // 校验是否可以设置
    if (
      !this.element.control?.selectExclusiveOptions?.inputAble ||
      (!options.isIgnoreDisabledRule &&
        this.control.getIsDisabledControl(context))
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
    const startElement = this.control.getDraw().getTargetResolver().resolveRangeBoundaryElements({
      range,
      elementList
    }).startElement
    if (!startElement) return -1
    const anchorElement = resolveControlAnchorElement(startElement)
    return this.control.insertControlValueElementList({
      elementList,
      startIndex,
      data,
      anchorElement
    })
  }

  /** 处理键盘按下事件，执行快捷键、输入或控件拦截逻辑。 */
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
      // 清空选项
      if (startIndex !== endIndex) {
        if (this.element.control?.selectExclusiveOptions?.inputAble) {
          return this.control.removeControlValueSegment({
            deleteIndex: startIndex + 1,
            deleteCount: endIndex - startIndex,
            placeholderIndex: startIndex,
            context: { elementList }
          })
        }
        return this.clearSelect()
      } else {
        if (isBackspaceRemoveControlStructure({ startElement, endElement })) {
          // 前缀、后缀、占位符
          return this.control.removeControl(startIndex)
        } else {
          if (this.element.control?.selectExclusiveOptions?.inputAble) {
            return this.control.removeControlValueSegment({
              deleteIndex: startIndex,
              deleteCount: 1,
              placeholderIndex: startIndex - 1,
              context: { elementList }
            })
          }
          // 清空选项
          return this.clearSelect()
        }
      }
    } else if (evt.key === KeyMap.Delete) {
      // 移除选区元素
      if (startIndex !== endIndex) {
        if (this.element.control?.selectExclusiveOptions?.inputAble) {
          return this.control.removeControlValueSegment({
            deleteIndex: startIndex + 1,
            deleteCount: endIndex - startIndex,
            placeholderIndex: startIndex,
            context: { elementList }
          })
        }
        // 清空选项
        return this.clearSelect()
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
          if (this.element.control?.selectExclusiveOptions?.inputAble) {
            return this.control.removeControlValueSegment({
              deleteIndex: startIndex + 1,
              deleteCount: 1,
              placeholderIndex: startIndex,
              context: { elementList }
            })
          }
          // 清空选项
          return this.clearSelect()
        }
      }
    }
    return endIndex
  }

  /** 处理剪切操作，复制选区内容后删除原文档范围。 */
  public cut(): number {
    if (this.control.getIsDisabledControl()) {
      return -1
    }
    this.control.shrinkBoundary()
    const { startIndex, endIndex } = this.control.getEditBoundaryRange()
    if (startIndex === endIndex) {
      return startIndex
    }
    // 清空选项
    return this.clearSelect()
  }

  public clearSelect(
    context: IControlContext = {},
    options: IControlRuleOption = {}
  ): number {
    const { isIgnoreDisabledRule = false, isAddPlaceholder = true } = options
    // 校验是否可以设置
    if (!isIgnoreDisabledRule && this.control.getIsDisabledControl(context)) {
      return -1
    }
    const elementList = context.elementList || this.control.getElementList()
    const { startIndex } = context.range || this.control.getEditBoundaryRange()
    const boundary = resolveControlValueBoundary({
      elementList,
      startIndex,
      requireExplicitRightBoundary: true
    })
    // 如果边界无效，返回 -1
    if (!boundary) return -1
    const [leftIndex, rightIndex] = boundary
    this.control.clearControlValueRange({
      leftIndex,
      rightIndex,
      context: {
        ...context,
        elementList
      },
      options: {
        ...options,
        isAddPlaceholder
      }
    })
    // 清空选中代码
    this.control.setControlProperties(
      {
        code: null
      },
      {
        elementList,
        range: { startIndex: leftIndex, endIndex: leftIndex }
      }
    )
    return leftIndex
  }

  /**
   * 设置选中项。
   *
   * @param code - 选中的代码（多选时用逗号分隔）
   * @param context - 控件上下文
   * @param options - 控件规则选项
   */

  public setSelect(
    code: string | number,
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
    const control = this.element.control!
    const normalizedCode = String(code)
    const newCodes = normalizedCode.split(this.VALUE_DELIMITER)
    // 缓存旧值
    const oldCode = control.code
    const oldCodes =
      control.code !== undefined && control.code !== null
        ? String(control.code).split(this.VALUE_DELIMITER)
        : []
    // 选项相同时无需重复渲染
    const isMultiSelect = control.isMultiSelect
    if (
      (!isMultiSelect && normalizedCode === String(oldCode)) ||
      (isMultiSelect && isArrayEqual(oldCodes, newCodes))
    ) {
      this.control.repaintControl({
        curIndex: range.startIndex,
        isCompute: false,
        isSubmitHistory: false
      })
      this.destroy()
      return
    }
    const valueSets = control.valueSets
    if (!Array.isArray(valueSets) || !valueSets.length) return
    // 转换文本
    const text = this.getText(newCodes)
    if (!text) {
      // 之前存在内容时清空文本
      if (oldCode) {
        const prefixIndex = this.clearSelect(context, {
          isIgnoreDeletedRule: options.isIgnoreDeletedRule
        })
        if (~prefixIndex) {
          this.control.repaintControl({
            curIndex: prefixIndex
          })
          this.control.emitControlContentChange({
            controlValue: []
          })
        }
      }
      return
    }
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
    // 当前无值时清空占位符
    if (!oldCode) {
      this.control.removePlaceholder(prefixIndex, context)
    }
    // 属性赋值元素-默认为前缀属性
    const propertyElement = omitObject(
      elementList[prefixIndex],
      EDITOR_ELEMENT_STYLE_ATTR
    )
    const data = splitText(text)
    const newIndex = this.control.insertControlTextValueElementList({
      elementList,
      prefixIndex,
      valueList: data,
      styleElement,
      propertyElement
    })
    // 设置状态
    this.control.setControlProperties(
      {
        code: normalizedCode
      },
      {
        elementList,
        range: { startIndex: prefixIndex, endIndex: prefixIndex }
      }
    )
    // 重新渲染控件
    if (!context.range) {
      this.control.repaintControl({
        curIndex: newIndex
      })
      this.control.emitControlContentChange({
        context
      })
      if (!isMultiSelect) {
        this.destroy()
      }
    }
  }

  /** 创建selectpopupdom，组装后续流程需要的对象或 DOM 结构。 */
  private _createSelectPopupDom() {
    const control = this.element.control!
    const valueSets = control.valueSets
    if (!Array.isArray(valueSets) || !valueSets.length) return
    const range = this.control.getEditBoundaryRange()
    const draw = this.control.getDraw()
    const controlBoundary = draw.getTargetResolver().resolveControlBoundaryElements({
      range,
      elementList: this.control.getElementList()
    })
    const position =
      resolvePositionAtIndex(draw, range.endIndex) ||
      (controlBoundary
        ? resolvePositionAtIndex(draw, controlBoundary.endIndex)
        : null)
    if (!position) return
    // dom树：<div><ul><li>item</li></ul></div>
    const selectPopupContainer = document.createElement('div')
    selectPopupContainer.classList.add(`${EDITOR_PREFIX}-select-control-popup`)
    selectPopupContainer.setAttribute(EDITOR_COMPONENT, EditorComponent.POPUP)
    const ul = document.createElement('ul')
    for (let v = 0; v < valueSets.length; v++) {
      const valueSet = valueSets[v]
      const li = document.createElement('li')
      let codes = this.getCodes()
      const valueSetCode = String(valueSet.code)
      if (codes.includes(valueSetCode)) {
        li.classList.add('active')
      }
      li.onclick = () => {
        const codeIndex = codes.findIndex(code => code === valueSetCode)
        if (control.isMultiSelect) {
          if (~codeIndex) {
            codes.splice(codeIndex, 1)
          } else {
            codes.push(valueSetCode)
          }
        } else {
          if (~codeIndex) {
            codes = []
          } else {
            codes = [valueSetCode]
          }
        }
        this.setSelect(codes.join(this.VALUE_DELIMITER))
      }
      li.append(document.createTextNode(valueSet.value))
      ul.append(li)
    }
    selectPopupContainer.append(ul)
    // 定位
    const {
      coordinate: {
        leftTop: [left, top]
      },
      lineHeight
    } = position
    const preY = this.control.getPreY()
    selectPopupContainer.style.left = `${left}px`
    selectPopupContainer.style.top = `${top + preY + lineHeight}px`
    // 追加至container
    const container = this.control.getContainer()
    container.append(selectPopupContainer)
    selectPopupContainer.scrollTop = this.popupScrollTop
    this.selectDom = selectPopupContainer
  }
  /**
   * 激活下拉选择控件。
   *
   * 创建并显示下拉选择框。
   */
  public awake() {
    if (
      this.isPopup ||
      this.control.getIsDisabledControl() ||
      !this.control.getIsRangeWithinControl()
    ) {
      return
    }
    const { startIndex } = this.control.getEditBoundaryRange()
    const elementList = this.control.getElementList()
    // 用 resolver 统一判断当前光标是否还停留在同一个控件结构里。
    const controlBoundary = this.control.getDraw().getTargetResolver().resolveControlBoundaryElements({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!controlBoundary || startIndex >= controlBoundary.endIndex) {
      return
    }
    // 创建下拉框 DOM
    this._createSelectPopupDom()
    // 设置弹出状态
    this.isPopup = true
  }

  /** 销毁destroy相关资源，解除事件监听并释放持有对象。 */
  public destroy() {
    if (!this.isPopup) return
    this.popupScrollTop = this.selectDom?.scrollTop || 0
    this.selectDom?.remove()
    this.isPopup = false
  }
}
