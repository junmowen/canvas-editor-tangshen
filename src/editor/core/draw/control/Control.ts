import {
  ControlComponent,
  ControlState,
  ControlType
} from '../../../dataset/enum/Control'
import { EditorMode, EditorZone } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { DeepRequired } from '../../../interface/Common'
import {
  IControl,
  IControlChangeOption,
  IControlChangeResult,
  IControlContentChangeResult,
  IControlContext,
  IControlHighlight,
  IControlInitOption,
  IControlInstance,
  IControlOption,
  IControlRuleOption,
  IDestroyControlOption,
  IGetControlValueOption,
  IGetControlValueResult,
  IInitNextControlOption,
  INextControlContext,
  IRepaintControlOption,
  ISetControlExtensionOption,
  ISetControlProperties,
  ISetControlRowFlexOption,
  ISetControlValueOption
} from '../../../interface/Control'
import { IEditorData, IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { EventBusMap } from '../../../interface/EventBus'
import { IRange } from '../../../interface/Range'
import {
  deepClone,
  isArray,
  isString,
  omitObject,
  pickObject,
  splitText
} from '../../../utils'
import {
  formatElementContext,
  formatElementList,
  getControlInlineContentText,
  getControlInlineText,
  getNonHideElementIndex,
  getTextFromElementList,
  pickElementAttr,
  zipElementList
} from '../../../utils/element'
import { EventBus } from '../../event/eventbus/EventBus'
import { Listener } from '../../listener/Listener'
import { RangeManager } from '../../range/RangeManager'
import { Draw } from '../Draw'
import { CheckboxControl } from './checkbox/CheckboxControl'
import { RadioControl } from './radio/RadioControl'
import { ControlSearch } from './interactive/ControlSearch'
import { ControlBorder } from './richtext/Border'
import { SelectControl } from './select/SelectControl'
import { TextControl } from './text/TextControl'
import { DateControl } from './date/DateControl'
import { NumberControl } from './number/NumberControl'
import { MoveDirection } from '../../../dataset/enum/Observer'
import {
  CONTROL_CONTEXT_ATTR,
  CONTROL_STYLE_ATTR,
  LIST_CONTEXT_ATTR,
  TITLE_CONTEXT_ATTR
} from '../../../dataset/constant/Element'
import { IRowElement } from '../../../interface/Row'
import { RowFlex } from '../../../dataset/enum/Row'
import { ZERO } from '../../../dataset/constant/Common'

/**
 * 光标移动结果接口。
 */
interface IMoveCursorResult {
  /** 新的元素索引 */
  newIndex: number
  /** 新的元素 */
  newElement: IElement
}

/**
 * 控件管理器。
 *
 * 负责管理编辑器中的所有控件（文本、复选框、单选框、日期、下拉选择、数字等），
 * 提供控件的初始化、值设置、值获取、事件处理等功能。
 */
export class Control {
  /** 控件边框渲染器 */
  private controlBorder: ControlBorder
  /** Draw 门面对象 */
  private draw: Draw
  /** 范围管理器 */
  private range: RangeManager
  /** 监听器 */
  private listener: Listener
  /** 事件总线 */
  private eventBus: EventBus<EventBusMap>
  /** 控件搜索 */
  private controlSearch: ControlSearch
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>
  /** 控件选项 */
  private controlOptions: IControlOption
  /** 当前激活的控件实例 */
  private activeControl: IControlInstance | null
  /** 当前激活控件的值 */
  private activeControlValue: IElement[]
  /** 前一个元素（用于控件交互判断） */
  private preElement: IElement | null

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    // 初始化控件边框渲染器
    this.controlBorder = new ControlBorder(draw)

    // 初始化核心组件
    this.draw = draw
    this.range = draw.getRange()
    this.listener = draw.getListener()
    this.eventBus = draw.getEventBus()
    // 初始化控件搜索
    this.controlSearch = new ControlSearch(this)

    // 获取编辑器和控件选项
    this.options = draw.getOptions()
    this.controlOptions = this.options.control
    // 初始化状态
    this.activeControl = null
    this.activeControlValue = []
    this.preElement = null
  }

  /**
   * 设置控件搜索高亮列表。
   *
   * @param payload - 高亮配置列表
   */
  /**
   * 设置控件搜索高亮列表。
   *
   * @param payload - 高亮数据列表
   */
  public setHighlightList(payload: IControlHighlight[]) {
    this.controlSearch.setHighlightList(payload)
  }

  /**
   * 计算控件高亮列表。
   *
   * 如果有高亮匹配结果，则执行计算。
   */
  public computeHighlightList() {
    const highlightList = this.controlSearch.getHighlightList()
    // 如果有高亮列表，执行计算
    if (highlightList.length) {
      this.controlSearch.computeHighlightList()
    }
  }

  /**
   * 渲染控件高亮列表。
   *
   * @param ctx - 画布上下文
   * @param pageNo - 页码
   */
  public renderHighlightList(ctx: CanvasRenderingContext2D, pageNo: number) {
    const highlightMatchResult = this.controlSearch.getHighlightMatchResult()
    // 如果有高亮匹配结果，执行渲染
    if (highlightMatchResult.length) {
      this.controlSearch.renderHighlightList(ctx, pageNo)
    }
  }

  /**
   * 获取 Draw 门面对象。
   *
   * @returns Draw 门面对象
   */
  public getDraw(): Draw {
    return this.draw
  }

  /**
   * 过滤控件辅助元素。
   *
   * 移除控件的前缀、后缀和占位符等辅助元素，保留核心内容。
   *
   * @param elementList - 元素列表
   * @returns 过滤后的元素列表
   */
  public filterAssistElement(elementList: IElement[]): IElement[] {
    return elementList.filter((element, index) => {
      // 如果是表格元素，递归处理表格单元格
      if (element.type === ElementType.TABLE) {
        const trList = element.trList!
        for (let r = 0; r < trList.length; r++) {
          const tr = trList[r]
          for (let d = 0; d < tr.tdList.length; d++) {
            const td = tr.tdList[d]
            // 递归过滤单元格中的辅助元素
            td.value = this.filterAssistElement(td.value)
          }
        }
      }
      // 如果不是控件元素，保留
      if (!element.controlId) return true
      if (
        element.control?.underline &&
        element.controlComponent === ControlComponent.PLACEHOLDER
      ) {
        element.value = element.value ? ' ' : ''
        element.color = this.options.defaultColor
        return true
      }
      // 如果控件有最小宽度，处理前缀和后缀
      if (element.control?.minWidth) {
        if (
          element.controlComponent === ControlComponent.PREFIX ||
          element.controlComponent === ControlComponent.POSTFIX
        ) {
          // 清空前缀和后缀的值，但保留元素
          element.value = ''
          return true
        }
      } else {
        // 控件存在值时无需过滤前后文本
        // 处理前缀文本
        if (
          element.control?.preText &&
          element.controlComponent === ControlComponent.PRE_TEXT
        ) {
          // 检查后面是否有控件值
          let isExistValue = false
          let start = index + 1
          while (start < elementList.length) {
            const nextElement = elementList[start]
            if (element.controlId !== nextElement.controlId) break
            if (nextElement.controlComponent === ControlComponent.VALUE) {
              isExistValue = true
              break
            }
            start++
          }
          return isExistValue
        }
        // 处理后缀文本
        if (
          element.control?.postText &&
          element.controlComponent === ControlComponent.POST_TEXT
        ) {
          // 检查前面是否有控件值
          let isExistValue = false
          let start = index - 1
          while (start < elementList.length) {
            const preElement = elementList[start]
            if (element.controlId !== preElement.controlId) break
            if (preElement.controlComponent === ControlComponent.VALUE) {
              isExistValue = true
              break
            }
            start--
          }
          return isExistValue
        }
      }
      // 过滤掉前缀、后缀和占位符组件
      return (
        element.controlComponent !== ControlComponent.PREFIX &&
        element.controlComponent !== ControlComponent.POSTFIX &&
        element.controlComponent !== ControlComponent.PLACEHOLDER
      )
    })
  }

  /**
   * 判断选区是否可以被控件捕获事件。
   *
   * @returns 是否可以捕获事件
   */
  public getIsRangeCanCaptureEvent(): boolean {
    if (!this.activeControl) return false
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    // 如果没有有效的边界范围，返回 false
    if (!~startIndex && !~endIndex) return false
    const elementList = this.draw.getElementList()
    const startElement = elementList[startIndex]
    // 情况1：闭合光标在后缀处，可以捕获事件
    if (
      startIndex === endIndex &&
      startElement.controlComponent === ControlComponent.POSTFIX
    ) {
      return true
    }
    // 情况2：选区在控件内，可以捕获事件
    const endElement = elementList[endIndex]
    if (
      startElement.controlId &&
      startElement.controlId === endElement.controlId &&
      endElement.controlComponent !== ControlComponent.POSTFIX
    ) {
      return true
    }
    return false
  }

  /**
   * 判断当前选区是否命中了“表单模式下不可删除的控件结构”。
   *
   * 仅用于键盘删除分支的保护，避免直接 splice 绕过控件自身的删除校验。
   */
  public getIsRangeControlDeletionDisabled(
    context: IControlContext = {}
  ): boolean {
    if (
      this.draw.getMode() !== EditorMode.FORM ||
      !this.options.modeRule[EditorMode.FORM].controlDeletableDisabled
    ) {
      return false
    }
    const { startIndex, endIndex } =
      context.range || this.range.getEditBoundaryRange()
    if (startIndex === endIndex) return false
    const elementList = context.elementList || this.draw.getElementList()
    const startElement = elementList[startIndex]
    const endElement = elementList[endIndex]
    if (
      !startElement?.controlId ||
      startElement.controlId !== endElement?.controlId
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
   * 判断选区是否在控件后缀处。
   *
   * @returns 是否在后缀处
   */
  public getIsRangeInPostfix(): boolean {
    if (!this.activeControl) return false
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    // 如果是范围选择，不在后缀处
    if (startIndex !== endIndex) return false
    const elementList = this.draw.getElementList()
    const element = elementList[startIndex]
    // 检查元素是否为后缀组件
    return element.controlComponent === ControlComponent.POSTFIX
  }

  /**
   * 判断选区是否在控件内。
   *
   * @returns 是否在控件内
   */
  public getIsRangeWithinControl(): boolean {
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    // 如果没有有效的边界范围，返回 false
    if (!~startIndex && !~endIndex) return false
    const elementList = this.draw.getElementList()
    const startElement = elementList[startIndex]
    const endElement = elementList[endIndex]
    // 检查选区是否在同一个控件内，且不在后缀处
    if (
      startElement?.controlId &&
      startElement.controlId === endElement.controlId &&
      endElement.controlComponent !== ControlComponent.POSTFIX
    ) {
      return true
    }
    return false
  }

  /**
   * 仅选中当前控件的值区域，不把前后缀结构一起带入全选范围。
   */
  public selectAllValue(): boolean {
    if (!this.activeControl || !this.getIsRangeWithinControl()) return false

    const elementList = this.draw.getElementList()
    const { startIndex } = this.range.getEditBoundaryRange()
    const startElement = elementList[startIndex]
    const controlId = startElement?.controlId
    if (!controlId) return false

    let controlStartIndex = startIndex
    while (
      controlStartIndex > 0 &&
      elementList[controlStartIndex - 1]?.controlId === controlId
    ) {
      controlStartIndex -= 1
    }

    let controlEndIndex = startIndex
    while (
      controlEndIndex + 1 < elementList.length &&
      elementList[controlEndIndex + 1]?.controlId === controlId
    ) {
      controlEndIndex += 1
    }

    let selectionStartIndex = controlStartIndex
    while (selectionStartIndex <= controlEndIndex) {
      const element = elementList[selectionStartIndex]
      if (
        element.controlComponent !== ControlComponent.PREFIX &&
        element.controlComponent !== ControlComponent.PRE_TEXT
      ) {
        selectionStartIndex = Math.max(
          controlStartIndex,
          selectionStartIndex - 1
        )
        break
      }
      selectionStartIndex += 1
    }
    if (selectionStartIndex > controlEndIndex) {
      selectionStartIndex = controlStartIndex
    }

    let selectionEndIndex = controlEndIndex
    while (selectionEndIndex >= selectionStartIndex) {
      const element = elementList[selectionEndIndex]
      if (
        element.controlComponent !== ControlComponent.POSTFIX &&
        element.controlComponent !== ControlComponent.POST_TEXT
      ) {
        break
      }
      selectionEndIndex -= 1
    }
    if (selectionEndIndex < selectionStartIndex) {
      selectionEndIndex = selectionStartIndex
    }

    this.range.setRange(selectionStartIndex, selectionEndIndex)
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
    return true
  }

  /**
   * 判断元素列表是否包含完整的控件元素。
   *
   * @param elementList - 元素列表
   * @returns 是否包含完整控件
   */
  public getIsElementListContainFullControl(elementList: IElement[]): boolean {
    // 如果列表中没有控件元素，返回 false
    if (!elementList.some(element => element.controlId)) return false
    let prefixCount = 0
    let postfixCount = 0
    // 统计前缀和后缀数量
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.controlComponent === ControlComponent.PREFIX) {
        prefixCount++
      } else if (element.controlComponent === ControlComponent.POSTFIX) {
        postfixCount++
      }
    }
    // 如果前缀和后缀数量不匹配或为零，不完整
    if (!prefixCount || !postfixCount) return false
    // 前缀和后缀数量相等才认为完整
    return prefixCount === postfixCount
  }

  /**
   * 判断控件是否禁用。
   *
   * @param context - 控件上下文（可选）
   * @returns 是否禁用
   */
  public getIsDisabledControl(context: IControlContext = {}): boolean {
    // 设计模式或没有激活控件时不禁用
    if (this.draw.isDesignMode() || !this.activeControl) return false
    const { startIndex, endIndex } =
      context.range || this.range.getEditBoundaryRange()
    // 如果光标在后缀处，不认为是禁用状态
    if (startIndex === endIndex && ~startIndex && ~endIndex) {
      const elementList = context.elementList || this.draw.getElementList()
      const startElement = elementList[startIndex]
      if (startElement.controlComponent === ControlComponent.POSTFIX) {
        return false
      }
    }
    // 检查控件本身的禁用状态
    return !!this.activeControl.getElement()?.control?.disabled
  }

  /**
   * 判断控件是否禁用粘贴。
   *
   * @param context - 控件上下文（可选）
   * @returns 是否禁用粘贴
   */
  public getIsDisabledPasteControl(context: IControlContext = {}): boolean {
    // 设计模式或没有激活控件时不禁用
    if (this.draw.isDesignMode() || !this.activeControl) return false
    const { startIndex, endIndex } =
      context.range || this.range.getEditBoundaryRange()
    // 如果光标在后缀处，不认为是禁用粘贴状态
    if (startIndex === endIndex && ~startIndex && ~endIndex) {
      const elementList = context.elementList || this.draw.getElementList()
      const startElement = elementList[startIndex]
      if (startElement.controlComponent === ControlComponent.POSTFIX) {
        return false
      }
    }
    // 检查控件的禁用粘贴状态
    return !!this.activeControl.getElement()?.control?.pasteDisabled
  }

  /**
   * 通过元素列表索引判断控件是否存在值。
   *
   * @param elementList - 元素列表
   * @param index - 元素索引
   * @returns 是否存在值
   */
  public getIsExistValueByElementListIndex(
    elementList: IElement[],
    index: number
  ): boolean {
    const element = elementList[index]
    // 是否是控件
    if (!element.controlId) return false
    // 单选框、复选框仅需验证控件值
    if (
      element.control?.type === ControlType.CHECKBOX ||
      element.control?.type === ControlType.RADIO
    ) {
      return !!element.control?.code
    }
    // 其他控件需校验文本
    if (element.controlComponent === ControlComponent.VALUE) {
      return true
    }
    if (element.controlComponent === ControlComponent.PLACEHOLDER) {
      return false
    }
    // 向后查找值元素
    if (
      element.controlComponent === ControlComponent.PREFIX ||
      element.controlComponent === ControlComponent.PRE_TEXT
    ) {
      let i = index + 1
      while (i < elementList.length) {
        const nextElement = elementList[i]
        if (nextElement.controlId !== element.controlId) {
          return false
        }
        if (nextElement.controlComponent === ControlComponent.VALUE) {
          return true
        }
        if (nextElement.controlComponent === ControlComponent.PLACEHOLDER) {
          return false
        }
        i++
      }
    }
    // 向前查找值元素
    if (
      element.controlComponent === ControlComponent.POSTFIX ||
      element.controlComponent === ControlComponent.POST_TEXT
    ) {
      let i = index - 1
      while (i >= 0) {
        const preElement = elementList[i]
        if (preElement.controlId !== element.controlId) {
          return false
        }
        if (preElement.controlComponent === ControlComponent.VALUE) {
          return true
        }
        if (preElement.controlComponent === ControlComponent.PLACEHOLDER) {
          return false
        }
        i--
      }
    }
    return false
  }

  public getControlHighlight(elementList: IElement[], index: number) {
    return this.controlSearch.getControlHighlight(elementList, index)
  }

  public getContainer(): HTMLDivElement {
    return this.draw.getPageCanvasHost().getContainer()
  }

  public getElementList(): IElement[] {
    return this.draw.getElementList()
  }

  public getPosition(): IElementPosition | null {
    const positionList = this.draw.getPosition().getPositionList()
    const { endIndex } = this.range.getEditBoundaryRange()
    return positionList[endIndex] || null
  }

  public getPreY(): number {
    const pageNo = this.getPosition()?.pageNo ?? this.draw.getPageNo()
    return this.draw.getPageCanvasHost().getPageTop(pageNo)
  }

  public getEditBoundaryRange(): IRange {
    return this.range.getEditBoundaryRange()
  }

  public shrinkBoundary(context: IControlContext = {}) {
    this.range.shrinkBoundary(context)
  }

  public getActiveControl(): IControlInstance | null {
    return this.activeControl
  }

  public getControlElementList(context: IControlContext = {}): IElement[] {
    const elementList = context.elementList || this.draw.getElementList()
    const { startIndex } = context.range || this.range.getEditBoundaryRange()
    const startElement = elementList[startIndex]
    if (!startElement?.controlId) return []
    const data: IElement[] = []
    // 向左查找
    let preIndex = startIndex
    while (preIndex > 0) {
      const preElement = elementList[preIndex]
      if (preElement.controlId !== startElement.controlId) break
      data.unshift(preElement)
      preIndex--
    }
    // 向右查找
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      if (nextElement.controlId !== startElement.controlId) break
      data.push(nextElement)
      nextIndex++
    }
    return data
  }

  public updateActiveControlValue() {
    if (this.activeControl) {
      this.activeControlValue = this.getControlElementList()
    }
  }

  public emitControlChange(state: ControlState) {
    if (!this.activeControl) return
    const isSubscribeControlChange = this.eventBus.isSubscribe('controlChange')
    if (!this.listener.controlChange && !isSubscribeControlChange) return
    let control: IControl
    const value = this.activeControlValue
    const activeElement = this.activeControl.getElement()
    if (value?.length) {
      control =
        zipElementList(value)[0]?.control ||
        pickElementAttr(deepClone(activeElement)).control!
    } else {
      control = pickElementAttr(deepClone(activeElement)).control!
      control.value = []
    }
    const payload: IControlChangeResult = {
      state,
      control,
      controlId: activeElement.controlId!
    }
    this.listener.controlChange?.(payload)
    if (isSubscribeControlChange) {
      this.eventBus.emit('controlChange', payload)
    }
  }

  public initControl() {
    const elementList = this.draw.getElementList()
    const range = this.range.getEditBoundaryRange()
    const element = elementList[range.startIndex]
    // 判断控件是否已经激活
    if (this.activeControl) {
      // 弹窗类控件唤醒弹窗，后缀处移除弹窗
      if (
        this.activeControl instanceof SelectControl ||
        this.activeControl instanceof DateControl
      ) {
        if (element.controlComponent === ControlComponent.POSTFIX) {
          this.activeControl.destroy()
        } else {
          this.activeControl.awake()
        }
      }
      // 相同控件元素
      if (this.preElement?.controlId === element.controlId) {
        // 当前元素在尾部：控件失活事件
        if (element.controlComponent === ControlComponent.POSTFIX) {
          this.emitControlChange(ControlState.INACTIVE)
        } else if (
          // 之前元素在尾部 && 当前不在尾部：控件激活事件
          this.preElement?.controlComponent === ControlComponent.POSTFIX
        ) {
          this.emitControlChange(ControlState.ACTIVE)
        }
      }
      // 更新缓存控件数据
      const controlElement = this.activeControl.getElement()
      if (element.controlId === controlElement.controlId) {
        this.updateActiveControlValue()
        this.preElement = element
        return
      }
    }
    // 销毁旧激活控件
    this.destroyControl()
    // 激活控件
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const control = element.control!
    if (control.type === ControlType.TEXT) {
      this.activeControl = new TextControl(element, this)
    } else if (control.type === ControlType.SELECT) {
      const selectControl = new SelectControl(element, this)
      this.activeControl = selectControl
      selectControl.awake()
    } else if (control.type === ControlType.CHECKBOX) {
      this.activeControl = new CheckboxControl(element, this)
    } else if (control.type === ControlType.RADIO) {
      this.activeControl = new RadioControl(element, this)
    } else if (control.type === ControlType.DATE) {
      const dateControl = new DateControl(element, this)
      this.activeControl = dateControl
      dateControl.awake()
    } else if (control.type === ControlType.NUMBER) {
      this.activeControl = new NumberControl(element, this)
    }
    // 缓存控件数据
    this.updateActiveControlValue()
    this.preElement = element
    // 激活控件回调
    if (element.controlComponent !== ControlComponent.POSTFIX) {
      this.emitControlChange(ControlState.ACTIVE)
    }
  }

  public destroyControl(options: IDestroyControlOption = {}) {
    if (!this.activeControl) return
    const { isEmitEvent = true } = options
    if (
      this.activeControl instanceof SelectControl ||
      this.activeControl instanceof DateControl
    ) {
      this.activeControl.destroy()
    }
    // 销毁控件回调
    if (
      isEmitEvent &&
      this.preElement?.controlComponent !== ControlComponent.POSTFIX
    ) {
      this.emitControlChange(ControlState.INACTIVE)
    }
    // 清空变量
    this.preElement = null
    this.activeControl = null
    this.activeControlValue = []
  }

  public repaintControl(options: IRepaintControlOption = {}) {
    const {
      curIndex,
      isCompute = true,
      isSubmitHistory = true,
      isSetCursor = true
    } = options
    // 重新渲染
    if (curIndex === undefined) {
      this.range.clearRange()
      this.draw.render({
        isCompute,
        isSubmitHistory,
        isSetCursor: false,
        pageRenderScope: isCompute ? undefined : 'visible'
      })
    } else {
      this.range.setRange(curIndex, curIndex)
      this.draw.render({
        curIndex,
        isCompute,
        isSetCursor,
        isSubmitHistory,
        pageRenderScope: isCompute ? undefined : 'visible'
      })
    }
  }

  public emitControlContentChange(options?: IControlChangeOption) {
    const isSubscribeControlContentChange = this.eventBus.isSubscribe(
      'controlContentChange'
    )
    if (
      !isSubscribeControlContentChange &&
      !this.listener.controlContentChange
    ) {
      return
    }
    const controlElement =
      options?.controlElement || this.activeControl?.getElement()
    if (!controlElement) return
    // 控件被删除不触发事件
    const elementList =
      options?.context?.elementList || this.draw.getElementList()
    const { startIndex } =
      options?.context?.range || this.range.getEditBoundaryRange()
    if (!elementList[startIndex]?.controlId) return
    // 格式化回调数据
    const controlValue =
      options?.controlValue || this.getControlElementList(options?.context)
    let control: IControl
    if (controlValue?.length) {
      control = zipElementList(controlValue)[0].control!
    } else {
      control = controlElement.control!
      control.value = []
    }
    if (!control) return
    const payload: IControlContentChangeResult = {
      control,
      controlId: controlElement.controlId!
    }
    this.listener.controlContentChange?.(payload)
    if (isSubscribeControlContentChange) {
      this.eventBus.emit('controlContentChange', payload)
    }
  }

  public reAwakeControl() {
    if (!this.activeControl) return
    const elementList = this.draw.getElementList()
    const range = this.range.getEditBoundaryRange()
    const element = elementList[range.startIndex]
    this.activeControl.setElement(element)
    if (
      (this.activeControl instanceof DateControl ||
        this.activeControl instanceof SelectControl) &&
      this.activeControl.getIsPopup()
    ) {
      this.activeControl.destroy()
      this.activeControl.awake()
    }
  }

  public moveCursor(position: IControlInitOption): IMoveCursorResult {
    const { index, trIndex, tdIndex, tdValueIndex } = position
    let elementList = this.draw.getOriginalElementList()
    let element: IElement
    const newIndex = position.isTable ? tdValueIndex! : index
    if (position.isTable) {
      elementList = elementList[index!].trList![trIndex!].tdList[tdIndex!].value
      element = elementList[tdValueIndex!]
    } else {
      element = elementList[index]
    }
    // 隐藏元素移动光标
    if (element.hide || element.control?.hide || element.area?.hide) {
      const nonHideIndex = getNonHideElementIndex(elementList, newIndex)
      return {
        newIndex: nonHideIndex,
        newElement: elementList[nonHideIndex]
      }
    }
    // 控件内移动光标
    if (element.controlComponent === ControlComponent.VALUE) {
      // VALUE-无需移动
      return {
        newIndex,
        newElement: element
      }
    } else if (element.controlComponent === ControlComponent.POSTFIX) {
      // POSTFIX-移动到最后一个后缀字符后
      let startIndex = newIndex + 1
      while (startIndex < elementList.length) {
        const nextElement = elementList[startIndex]
        if (nextElement.controlId !== element.controlId) {
          return {
            newIndex: startIndex - 1,
            newElement: elementList[startIndex - 1]
          }
        }
        startIndex++
      }
    } else if (
      element.controlComponent === ControlComponent.PREFIX ||
      element.controlComponent === ControlComponent.PRE_TEXT
    ) {
      // PREFIX或前文本-移动到最后一个前缀字符后
      let startIndex = newIndex + 1
      while (startIndex < elementList.length) {
        const nextElement = elementList[startIndex]
        if (
          nextElement.controlId !== element.controlId ||
          (nextElement.controlComponent !== ControlComponent.PREFIX &&
            nextElement.controlComponent !== ControlComponent.PRE_TEXT)
        ) {
          return {
            newIndex: startIndex - 1,
            newElement: elementList[startIndex - 1]
          }
        }
        startIndex++
      }
    } else if (
      element.controlComponent === ControlComponent.PLACEHOLDER ||
      element.controlComponent === ControlComponent.POST_TEXT
    ) {
      // PLACEHOLDER或后文本-移动到第一个前缀或内容后
      let startIndex = newIndex - 1
      while (startIndex > 0) {
        const preElement = elementList[startIndex]
        if (
          preElement.controlId !== element.controlId ||
          preElement.controlComponent === ControlComponent.VALUE ||
          preElement.controlComponent === ControlComponent.PREFIX ||
          preElement.controlComponent === ControlComponent.PRE_TEXT
        ) {
          return {
            newIndex: startIndex,
            newElement: elementList[startIndex]
          }
        }
        startIndex--
      }
    }
    return {
      newIndex,
      newElement: element
    }
  }

  public removeControl(
    startIndex: number,
    context: IControlContext = {}
  ): number | null {
    const elementList = context.elementList || this.draw.getElementList()
    const startElement = elementList[startIndex]
    // 设计模式 || 元素隐藏 => 不验证删除权限
    if (
      !this.draw.isDesignMode() &&
      !startElement?.hide &&
      !startElement?.control?.hide &&
      !startElement?.area?.hide
    ) {
      const { deletable = true, disabled = false } = startElement.control!
      if (!deletable || disabled) return null
      // 表单模式控件删除权限验证
      const mode = this.draw.getMode()
      if (
        mode === EditorMode.FORM &&
        this.options.modeRule[mode].controlDeletableDisabled
      ) {
        return null
      }
    }
    let leftIndex = -1
    let rightIndex = -1
    // 向左查找
    let preIndex = startIndex
    while (preIndex > 0) {
      const preElement = elementList[preIndex]
      if (preElement.controlId !== startElement.controlId) {
        leftIndex = preIndex
        break
      }
      preIndex--
    }
    // 向右查找
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      if (nextElement.controlId !== startElement.controlId) {
        rightIndex = nextIndex - 1
        break
      }
      nextIndex++
    }
    // 控件在最后
    if (nextIndex === elementList.length) {
      rightIndex = nextIndex - 1
    }
    if (!~leftIndex && !~rightIndex) return startIndex
    leftIndex = ~leftIndex ? leftIndex : 0
    // 删除元素
    this.draw.spliceElementList(
      elementList,
      leftIndex + 1,
      rightIndex - leftIndex
    )
    return leftIndex
  }

  public removePlaceholder(startIndex: number, context: IControlContext = {}) {
    const elementList = context.elementList || this.draw.getElementList()
    const startElement = elementList[startIndex]
    const nextElement = elementList[startIndex + 1]
    if (
      startElement.controlComponent === ControlComponent.PLACEHOLDER ||
      nextElement.controlComponent === ControlComponent.PLACEHOLDER
    ) {
      let isHasSubmitHistory = false
      let index = startIndex
      while (index < elementList.length) {
        const curElement = elementList[index]
        if (curElement.controlId !== startElement.controlId) break
        if (curElement.controlComponent === ControlComponent.PLACEHOLDER) {
          // 删除占位符时替换前一个历史记录
          if (!isHasSubmitHistory) {
            isHasSubmitHistory = true
            this.draw.getHistoryManager().popUndo()
            this.draw.submitHistory(startIndex)
          }
          elementList.splice(index, 1)
        } else {
          index++
        }
      }
    }
  }

  public addPlaceholder(startIndex: number, context: IControlContext = {}) {
    const elementList = context.elementList || this.draw.getElementList()
    const startElement = elementList[startIndex]
    const control = startElement.control!
    if (!control.placeholder) return
    let scanIndex = startIndex
    while (scanIndex >= 0 && elementList[scanIndex]?.controlId === startElement.controlId) {
      if (elementList[scanIndex].controlComponent === ControlComponent.PLACEHOLDER) {
        return
      }
      scanIndex--
    }
    scanIndex = startIndex + 1
    while (
      scanIndex < elementList.length &&
      elementList[scanIndex]?.controlId === startElement.controlId
    ) {
      if (elementList[scanIndex].controlComponent === ControlComponent.PLACEHOLDER) {
        return
      }
      scanIndex++
    }
    const placeholderStrList = splitText(control.placeholder)
    // 优先使用默认控件样式
    const anchorElementStyleAttr = pickObject(startElement, CONTROL_STYLE_ATTR)
    for (let p = 0; p < placeholderStrList.length; p++) {
      const value = placeholderStrList[p]
      const newElement: IElement = {
        ...anchorElementStyleAttr,
        value: value === '\n' ? ZERO : value,
        controlId: startElement.controlId,
        type: ElementType.CONTROL,
        control: startElement.control,
        controlComponent: ControlComponent.PLACEHOLDER,
        color: this.controlOptions.placeholderColor
      }
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      this.draw.spliceElementList(elementList, startIndex + p + 1, 0, [
        newElement
      ])
    }
  }

  public setValue(data: IElement[]): number {
    if (!this.activeControl) {
      throw new Error('active control is null')
    }
    return this.activeControl.setValue(data)
  }

  public setControlProperties(
    properties: Partial<IControl>,
    context: IControlContext = {}
  ) {
    const elementList = context.elementList || this.draw.getElementList()
    const { startIndex } = context.range || this.range.getEditBoundaryRange()
    const startElement = elementList[startIndex]
    // 向左查找
    let preIndex = startIndex
    while (preIndex > 0) {
      const preElement = elementList[preIndex]
      if (preElement.controlId !== startElement.controlId) break
      preElement.control = {
        ...preElement.control!,
        ...properties
      }
      preIndex--
    }
    // 向右查找
    let nextIndex = startIndex + 1
    while (nextIndex < elementList.length) {
      const nextElement = elementList[nextIndex]
      if (nextElement.controlId !== startElement.controlId) break
      nextElement.control = {
        ...nextElement.control!,
        ...properties
      }
      nextIndex++
    }
  }

  public keydown(evt: KeyboardEvent): number | null {
    if (!this.activeControl) {
      throw new Error('active control is null')
    }
    return this.activeControl.keydown(evt)
  }

  public cut(): number {
    if (!this.activeControl) {
      throw new Error('active control is null')
    }
    return this.activeControl.cut()
  }

  private isNestedControlValueElement(element: IElement): boolean {
    return (
      element.type === ElementType.CONTROL &&
      element.controlComponent === ControlComponent.VALUE &&
      !!element.control
    )
  }

  private getStringControlValueElementList(
    element: IElement,
    value: ISetControlValueOption['value']
  ): IElement[] {
    if (!value || Array.isArray(value)) return []
    const elementStyle = pickObject(
      element,
      CONTROL_STYLE_ATTR as Array<keyof IElement>
    ) as Partial<IElement>
    const controlStyle = pickObject(
      element.control!,
      CONTROL_STYLE_ATTR as Array<keyof NonNullable<IElement['control']>>
    ) as unknown as Partial<IElement>
    return [
      {
        ...elementStyle,
        ...controlStyle,
        value
      }
    ]
  }

  private getNestedControlValueResult(
    element: IElement,
    zone: EditorZone
  ): IGetControlValueResult[number] {
    const control = element.control!
    const text = this.getControlDisplayText(control)
    const result: IGetControlValueResult[number] = {
      ...control,
      zone,
      value: text || null,
      innerText: text || null
    }
    if (
      control.type === ControlType.TEXT ||
      control.type === ControlType.DATE ||
      control.type === ControlType.NUMBER
    ) {
      result.elementList = Array.isArray(control.value)
        ? zipElementList(control.value)
        : []
    }
    return result
  }

  private setNestedControlValue(
    element: IElement,
    value: ISetControlValueOption['value'],
    elementList?: IElement[]
  ) {
    const control = element.control!
    if (
      control.type === ControlType.TEXT ||
      control.type === ControlType.DATE ||
      control.type === ControlType.NUMBER
    ) {
      const formatValue = Array.isArray(value)
        ? deepClone(value)
        : this.getStringControlValueElementList(element, value)
      if (formatValue.length) {
        formatElementList(formatValue, {
          isHandleFirstElement: false,
          editorOptions: this.options
        })
      }
      control.value = formatValue
    } else if (
      control.type === ControlType.SELECT ||
      control.type === ControlType.CHECKBOX ||
      control.type === ControlType.RADIO
    ) {
      control.code = Array.isArray(value) ? null : value
      control.value = null
    }
    element.value = this.getIsOnlyNestedControlValue(element, elementList)
      ? getControlInlineContentText(element, this.options)
      : getControlInlineText(element, this.options)
  }

  private setExpandedNestedControlValue(
    elementList: IElement[],
    prefixIndex: number,
    value: ISetControlValueOption['value']
  ): number {
    const prefixElement = elementList[prefixIndex]
    const controlId = prefixElement.controlId
    if (!controlId) return prefixIndex + 1
    const control = prefixElement.control!
    let endIndex = prefixIndex + 1
    while (endIndex < elementList.length) {
      const nextElement = elementList[endIndex]
      if (nextElement.controlId !== controlId) break
      endIndex++
    }
    if (
      control.type === ControlType.TEXT ||
      control.type === ControlType.DATE ||
      control.type === ControlType.NUMBER
    ) {
      const formatValue = Array.isArray(value)
        ? deepClone(value)
        : this.getStringControlValueElementList(prefixElement, value)
      if (formatValue.length) {
        formatElementList(formatValue, {
          isHandleFirstElement: false,
          editorOptions: this.options
        })
      }
      control.value = formatValue
      const valueElementList = formatValue.map(item => ({
        ...pickObject(prefixElement, [
          'parentControlId',
          'controlId',
          ...CONTROL_STYLE_ATTR
        ]),
        ...item,
        control,
        controlComponent: ControlComponent.VALUE
      }))
      elementList.splice(prefixIndex + 1, endIndex - prefixIndex - 2, ...valueElementList)
      return prefixIndex + valueElementList.length + 2
    }
    return endIndex
  }

  private getIsOnlyNestedControlValue(
    element: IElement,
    elementList?: IElement[]
  ): boolean {
    if (!elementList || !element.controlId) return false
    return (
      elementList.filter(
        item =>
          item.controlId === element.controlId &&
          item.controlComponent === ControlComponent.VALUE
      ).length === 1
    )
  }

  private getControlDisplayText(control: IControl): string {
    if (Array.isArray(control.value) && control.value.length) {
      return getTextFromElementList(control.value)
        .replace(new RegExp(`${ZERO}`, 'g'), '')
        .trim()
    }
    if (
      (control.type === ControlType.SELECT ||
        control.type === ControlType.CHECKBOX ||
        control.type === ControlType.RADIO) &&
      control.code !== undefined &&
      control.code !== null &&
      Array.isArray(control.valueSets)
    ) {
      return String(control.code)
        .split(',')
        .map(
          code =>
            control.valueSets?.find(
              valueSet => String(valueSet.code) === code
            )?.value
        )
        .filter(Boolean)
        .join(control.multiSelectDelimiter || '、')
    }
    return ''
  }

  public getValueById(payload: IGetControlValueOption): IGetControlValueResult {
    const { id, conceptId, areaId } = payload
    const result: IGetControlValueResult = []
    if (!id && !conceptId && !areaId) return result
    const getValue = (
      elementList: IElement[],
      zone: EditorZone,
      scopeAreaId?: string
    ) => {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        // 表格下钻处理
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              getValue(td.value, zone, scopeAreaId)
            }
          }
        }
        if (element.type === ElementType.AREA && element.valueList?.length) {
          getValue(element.valueList, zone, element.areaId || scopeAreaId)
        }
        const isControlEntry =
          element.controlComponent === ControlComponent.PREFIX ||
          (element.controlComponent === ControlComponent.VALUE &&
            !elementList[i - 2]?.controlId) ||
          (element.controlComponent === ControlComponent.PLACEHOLDER &&
            !elementList[i - 2]?.controlId)
        if (
          element.controlComponent &&
          !isControlEntry
        ) {
          continue
        }
        if (
          !element.control ||
          (id && element.controlId !== id) ||
          (conceptId && element.control.conceptId !== conceptId) ||
          (areaId && element.areaId !== areaId && scopeAreaId !== areaId)
        ) {
          continue
        }
        if (this.isNestedControlValueElement(element)) {
          result.push(this.getNestedControlValueResult(element, zone))
          continue
        }
        const { type, code, valueSets } = element.control
        let j = i
        let textControlValue = ''
        const textControlElementList = []
        if (
          (type === ControlType.TEXT ||
            type === ControlType.DATE ||
            type === ControlType.NUMBER) &&
          element.controlComponent === ControlComponent.VALUE
        ) {
          textControlValue += element.value
          textControlElementList.push(omitObject(element, CONTROL_CONTEXT_ATTR))
        }
        while (j < elementList.length) {
          const nextElement = elementList[j]
          if (nextElement.controlId !== element.controlId) break
          if (
            (type === ControlType.TEXT ||
              type === ControlType.DATE ||
              type === ControlType.NUMBER) &&
            nextElement.controlComponent === ControlComponent.VALUE
          ) {
            textControlValue += nextElement.value
            textControlElementList.push(
              omitObject(nextElement, CONTROL_CONTEXT_ATTR)
            )
          }
          j++
        }
        if (
          type === ControlType.TEXT ||
          type === ControlType.DATE ||
          type === ControlType.NUMBER
        ) {
          const textControlDisplayValue = textControlValue
            .replace(new RegExp(`${ZERO}`, 'g'), '')
            .trim()
          result.push({
            ...element.control,
            zone,
            value: textControlDisplayValue || null,
            innerText: textControlDisplayValue || null,
            elementList: zipElementList(textControlElementList)
          })
        } else if (
          type === ControlType.SELECT ||
          type === ControlType.CHECKBOX ||
          type === ControlType.RADIO
        ) {
          const innerText = (code !== undefined && code !== null
            ? String(code)
            : ''
          )
            .split(',')
            .map(
              selectCode =>
                valueSets?.find(valueSet => String(valueSet.code) === selectCode)
                  ?.value
            )
            .filter(Boolean)
            .join('')
          result.push({
            ...element.control,
            zone,
            value:
              code !== undefined && code !== null ? String(code) || null : null,
            innerText: innerText || null
          })
        }
        i = j
      }
    }
    const data = [
      {
        zone: EditorZone.HEADER,
        elementList: this.draw.getHeaderElementList()
      },
      {
        zone: EditorZone.MAIN,
        elementList: this.draw.getOriginalMainElementList()
      },
      {
        zone: EditorZone.FOOTER,
        elementList: this.draw.getFooterElementList()
      }
    ]
    for (const { zone, elementList } of data) {
      getValue(elementList, zone)
    }
    return result
  }

  public setValueListById(payload: ISetControlValueOption[]) {
    if (!payload.length) return
    let isExistSet = false
    let isExistSubmitHistory = false
    // 设置值
    const setValue = (elementList: IElement[], scopeAreaId?: string) => {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        // 表格下钻处理
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              setValue(td.value, scopeAreaId)
            }
          }
        }
        if (element.type === ElementType.AREA && element.valueList?.length) {
          setValue(element.valueList, element.areaId || scopeAreaId)
        }
        if (!element.control) continue
        const isControlEntry =
          element.controlComponent === ControlComponent.PREFIX ||
          (element.controlComponent === ControlComponent.VALUE &&
            !elementList[i - 2]?.controlId) ||
          (element.controlComponent === ControlComponent.PLACEHOLDER &&
            !elementList[i - 2]?.controlId)
        if (
          element.controlComponent &&
          !isControlEntry
        ) {
          continue
        }
        // 获取设置值优先id、conceptId、areaId
        const payloadItem = payload.find(
          p =>
            (p.id && element.controlId === p.id) ||
            (p.conceptId && element.control!.conceptId === p.conceptId) ||
            (p.areaId && (element.areaId === p.areaId || scopeAreaId === p.areaId))
        )
        if (!payloadItem) continue
        if (this.isNestedControlValueElement(element)) {
          this.setNestedControlValue(element, payloadItem.value, elementList)
          isExistSet = true
          if (payloadItem.isSubmitHistory !== false) {
            isExistSubmitHistory = true
          }
          continue
        }
        if (element.parentControlId) {
          isExistSet = true
          if (payloadItem.isSubmitHistory !== false) {
            isExistSubmitHistory = true
          }
          i = this.setExpandedNestedControlValue(
            elementList,
            i - 1,
            payloadItem.value
          )
          continue
        }
        const { value, isSubmitHistory = true } = payloadItem
        // 只要存在一次保存历史均记录
        isExistSet = true
        if (isSubmitHistory) {
          isExistSubmitHistory = true
        }
        const { type } = element.control!
        // 当前控件结束索引
        let currentEndIndex = i
        while (currentEndIndex < elementList.length) {
          const nextElement = elementList[currentEndIndex]
          if (nextElement.controlId !== element.controlId) break
          currentEndIndex++
        }
        // 模拟光标选区上下文
        const fakeRange = {
          startIndex: i - 1,
          endIndex: currentEndIndex - 2
        }
        const controlContext: IControlContext = {
          range: fakeRange,
          elementList
        }
        const controlRule: IControlRuleOption = {
          isIgnoreDisabledRule: true,
          isIgnoreDeletedRule: true
        }
        if (type === ControlType.TEXT) {
          const formatValue = Array.isArray(value)
            ? value
            : this.getStringControlValueElementList(element, value)
          if (formatValue.length) {
            formatElementList(formatValue, {
              isHandleFirstElement: false,
              editorOptions: this.options
            })
          }
          const text = new TextControl(element, this)
          this.activeControl = text
          if (formatValue.length) {
            text.setValue(formatValue, controlContext, controlRule)
          } else {
            text.clearValue(controlContext, controlRule)
          }
        } else if (type === ControlType.SELECT) {
          if (Array.isArray(value)) continue
          const select = new SelectControl(element, this)
          this.activeControl = select
          if (value) {
            select.setSelect(value, controlContext, controlRule)
          } else {
            select.clearSelect(controlContext, controlRule)
          }
        } else if (type === ControlType.CHECKBOX) {
          if (Array.isArray(value)) continue
          const checkbox = new CheckboxControl(element, this)
          this.activeControl = checkbox
          const codes = value ? value.split(',') : []
          checkbox.setSelect(codes, controlContext, controlRule)
        } else if (type === ControlType.RADIO) {
          if (Array.isArray(value)) continue
          const radio = new RadioControl(element, this)
          this.activeControl = radio
          const codes = value ? [value] : []
          radio.setSelect(codes, controlContext, controlRule)
        } else if (type === ControlType.DATE) {
          const date = new DateControl(element, this)
          this.activeControl = date
          if (isArray(value)) {
            if (value.length) {
              formatElementList(value, {
                isHandleFirstElement: false,
                editorOptions: this.options
              })
            }
            date.setValue(value, controlContext, controlRule)
          } else if (isString(value)) {
            date.setSelect(value, controlContext, controlRule)
          } else {
            date.clearSelect(controlContext, controlRule)
          }
        } else if (type === ControlType.NUMBER) {
          const formatValue = Array.isArray(value)
            ? value
            : this.getStringControlValueElementList(element, value)
          if (formatValue.length) {
            formatElementList(formatValue, {
              isHandleFirstElement: false,
              editorOptions: this.options
            })
          }
          const text = new NumberControl(element, this)
          this.activeControl = text
          if (formatValue.length) {
            text.setValue(formatValue, controlContext, controlRule)
          } else {
            text.clearValue(controlContext, controlRule)
          }
        }
        // 控件值变更事件
        this.emitControlContentChange({
          context: controlContext
        })
        // 模拟控件激活后销毁
        this.activeControl = null
        // 修改后控件结束索引
        let newEndIndex = i
        while (newEndIndex < elementList.length) {
          const nextElement = elementList[newEndIndex]
          if (nextElement.controlId !== element.controlId) break
          newEndIndex++
        }
        i = newEndIndex
      }
    }
    // 销毁旧控件
    this.destroyControl({
      isEmitEvent: false
    })
    // 页眉、内容区、页脚同时处理
    const data = [
      this.draw.getHeaderElementList(),
      this.draw.getOriginalMainElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
      setValue(elementList)
    }
    if (isExistSet) {
      // 不保存历史时需清空之前记录，避免还原
      if (!isExistSubmitHistory) {
        this.draw.getHistoryManager().recovery()
      }
      this.draw.render({
        isSubmitHistory: isExistSubmitHistory,
        isSetCursor: false
      })
    }
  }

  public setExtensionListById(payload: ISetControlExtensionOption[]) {
    if (!payload.length) return
    const setExtension = (elementList: IElement[]) => {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        // 表格下钻处理
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              setExtension(td.value)
            }
          }
        }
        if (!element.control) continue
        // 获取设置值优先id、conceptId、areaId
        const payloadItem = payload.find(
          p =>
            (p.id && element.controlId === p.id) ||
            (p.conceptId && element.control!.conceptId === p.conceptId) ||
            (p.areaId && element.areaId === p.areaId)
        )
        if (!payloadItem) continue
        const { extension } = payloadItem
        // 设置值
        this.setControlProperties(
          {
            extension
          },
          {
            elementList,
            range: { startIndex: i, endIndex: i }
          }
        )
        // 修改后控件结束索引
        let newEndIndex = i
        while (newEndIndex < elementList.length) {
          const nextElement = elementList[newEndIndex]
          if (nextElement.controlId !== element.controlId) break
          newEndIndex++
        }
        i = newEndIndex
      }
    }
    const data = [
      this.draw.getHeaderElementList(),
      this.draw.getOriginalMainElementList(),
      this.draw.getFooterElementList()
    ]
    for (const elementList of data) {
      setExtension(elementList)
    }
  }

  public setPropertiesListById(payload: ISetControlProperties[]) {
    if (!payload.length) return
    let isExistUpdate = false
    let isExistSubmitHistory = false
    const setProperties = (elementList: IElement[]) => {
      let i = 0
      while (i < elementList.length) {
        const element = elementList[i]
        i++
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              setProperties(td.value)
            }
          }
        }
        if (!element.control) continue
        // 获取设置值优先id、conceptId、areaId
        const payloadItem = payload.find(
          p =>
            (p.id && element.controlId === p.id) ||
            (p.conceptId && element.control!.conceptId === p.conceptId) ||
            (p.areaId && element.areaId === p.areaId)
        )
        if (!payloadItem) continue
        const { properties, isSubmitHistory = true } = payloadItem
        isExistUpdate = true
        if (isSubmitHistory) {
          isExistSubmitHistory = true
        }
        // 设置属性
        this.setControlProperties(
          {
            ...element.control,
            ...properties,
            value: element.control.value
          },
          {
            elementList,
            range: { startIndex: i, endIndex: i }
          }
        )
        // 控件默认样式
        const controlStartIndex = i - 1
        CONTROL_STYLE_ATTR.forEach(key => {
          const controlStyleProperty = properties[key]
          if (controlStyleProperty !== undefined) {
            let styleIndex = controlStartIndex
            while (styleIndex < elementList.length) {
              const styleElement = elementList[styleIndex]
              if (styleElement.controlId !== element.controlId) break
              Reflect.set(styleElement, key, controlStyleProperty)
              styleIndex++
            }
          }
        })
        // 修改后控件结束索引
        let newEndIndex = i
        while (newEndIndex < elementList.length) {
          const nextElement = elementList[newEndIndex]
          if (nextElement.controlId !== element.controlId) break
          newEndIndex++
        }
        i = newEndIndex
      }
    }
    // 页眉页脚正文启动搜索
    const pageComponentData: IEditorData = {
      header: this.draw.getHeaderElementList(),
      main: this.draw.getOriginalMainElementList(),
      footer: this.draw.getFooterElementList()
    }
    for (const key in pageComponentData) {
      const elementList = pageComponentData[<keyof IEditorData>key]!
      setProperties(elementList)
    }
    if (!isExistUpdate) return
    // 强制更新
    for (const key in pageComponentData) {
      const pageComponentKey = <keyof IEditorData>key
      const elementList = zipElementList(pageComponentData[pageComponentKey]!, {
        isClassifyArea: true,
        extraPickAttrs: ['id']
      })
      pageComponentData[pageComponentKey] = elementList
      formatElementList(elementList, {
        editorOptions: this.options,
        isForceCompensation: true
      })
    }
    this.draw.setEditorData(pageComponentData)
    // 不保存历史时需清空之前记录，避免还原
    if (!isExistSubmitHistory) {
      this.draw.getHistoryManager().recovery()
    }
    this.draw.render({
      isSubmitHistory: isExistSubmitHistory,
      isSetCursor: false
    })
  }

  public getList(): IElement[] {
    const controlElementMap = new Map<string, IElement[]>()
    const collectControlElement = (element: IElement) => {
      const controlId = element.controlId
      if (!controlId) return
      const controlElementList = controlElementMap.get(controlId) || []
      // 移除控件所在标题及列表上下文信息
      const controlElement = omitObject(element, [
        ...TITLE_CONTEXT_ATTR,
        ...LIST_CONTEXT_ATTR
      ])
      controlElementList.push(controlElement)
      controlElementMap.set(controlId, controlElementList)
    }
    function getControlElementList(elementList: IElement[]) {
      for (let e = 0; e < elementList.length; e++) {
        const element = elementList[e]
        if (element.type === ElementType.TABLE) {
          const trList = element.trList!
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            for (let d = 0; d < tr.tdList.length; d++) {
              const td = tr.tdList[d]
              const tdElement = td.value
              getControlElementList(tdElement)
            }
          }
        }
        collectControlElement(element)
      }
    }
    const data = [
      this.draw.getHeader().getElementList(),
      this.draw.getOriginalMainElementList(),
      this.draw.getFooter().getElementList()
    ]
    for (const elementList of data) {
      getControlElementList(elementList)
    }
    const result: IElement[] = []
    controlElementMap.forEach(elementList => {
      const controlElement = zipElementList(elementList, {
        extraPickAttrs: ['controlId']
      })[0]
      if (controlElement) {
        result.push(controlElement)
      }
    })
    return result
  }

  public recordBorderInfo(x: number, y: number, width: number, height: number) {
    this.controlBorder.recordBorderInfo(x, y, width, height)
  }

  public drawBorder(ctx: CanvasRenderingContext2D) {
    this.controlBorder.render(ctx)
  }

  public getPreControlContext(): INextControlContext | null {
    if (!this.activeControl) return null
    const position = this.draw.getPosition()
    const positionContext = position.getPositionContext()
    if (!positionContext) return null
    const controlElement = this.activeControl.getElement()
    // 获取上一个控件上下文本信息
    function getPreContext(
      elementList: IElement[],
      start: number
    ): INextControlContext | null {
      for (let e = start; e > 0; e--) {
        const element = elementList[e]
        // 表格元素
        if (element.type === ElementType.TABLE) {
          const trList = element.trList || []
          for (let r = trList.length - 1; r >= 0; r--) {
            const tr = trList[r]
            const tdList = tr.tdList
            for (let d = tdList.length - 1; d >= 0; d--) {
              const td = tdList[d]
              const context = getPreContext(td.value, td.value.length - 1)
              if (context) {
                return {
                  positionContext: {
                    isTable: true,
                    index: e,
                    trIndex: r,
                    tdIndex: d,
                    tdId: td.id,
                    trId: tr.id,
                    tableId: element.id
                  },
                  nextIndex: context.nextIndex
                }
              }
            }
          }
        }
        if (
          !element.controlId ||
          element.controlId === controlElement.controlId
        ) {
          continue
        }
        // 找到尾部第一个非占位符元素
        let nextIndex = e
        while (nextIndex > 0) {
          const nextElement = elementList[nextIndex]
          if (
            nextElement.controlComponent === ControlComponent.VALUE ||
            nextElement.controlComponent === ControlComponent.PREFIX ||
            nextElement.controlComponent === ControlComponent.PRE_TEXT
          ) {
            break
          }
          nextIndex--
        }
        return {
          positionContext: {
            isTable: false
          },
          nextIndex
        }
      }
      return null
    }
    // 当前上下文控件信息
    const { startIndex } = this.range.getEditBoundaryRange()
    const elementList = this.draw.getElementList()
    const context = getPreContext(elementList, startIndex)
    if (context) {
      return {
        positionContext: positionContext.isTable
          ? positionContext
          : context.positionContext,
        nextIndex: context.nextIndex
      }
    }
    // 控件在单元内时继续循环
    if (controlElement.tableId) {
      const originalElementList = this.draw.getOriginalElementList()
      const { index, trIndex, tdIndex } = positionContext
      const trList = originalElementList[index!].trList!
      for (let r = trIndex!; r >= 0; r--) {
        const tr = trList[r]
        const tdList = tr.tdList
        for (let d = tdList.length - 1; d >= 0; d--) {
          if (trIndex === r && d >= tdIndex!) continue
          const td = tdList[d]
          const context = getPreContext(td.value, td.value.length - 1)
          if (context) {
            return {
              positionContext: {
                isTable: true,
                index: positionContext.index,
                trIndex: r,
                tdIndex: d,
                tdId: td.id,
                trId: tr.id,
                tableId: controlElement.tableId
              },
              nextIndex: context.nextIndex
            }
          }
        }
      }
      // 跳出表格继续循环
      const context = getPreContext(originalElementList, index! - 1)
      if (context) {
        return {
          positionContext: {
            isTable: false
          },
          nextIndex: context.nextIndex
        }
      }
    }
    return null
  }

  public getNextControlContext(): INextControlContext | null {
    if (!this.activeControl) return null
    const position = this.draw.getPosition()
    const positionContext = position.getPositionContext()
    if (!positionContext) return null
    const controlElement = this.activeControl.getElement()
    // 获取下一个控件上下文本信息
    function getNextContext(
      elementList: IElement[],
      start: number
    ): INextControlContext | null {
      for (let e = start; e < elementList.length; e++) {
        const element = elementList[e]
        // 表格元素
        if (element.type === ElementType.TABLE) {
          const trList = element.trList || []
          for (let r = 0; r < trList.length; r++) {
            const tr = trList[r]
            const tdList = tr.tdList
            for (let d = 0; d < tdList.length; d++) {
              const td = tdList[d]
              const context = getNextContext(td.value!, 0)
              if (context) {
                return {
                  positionContext: {
                    isTable: true,
                    index: e,
                    trIndex: r,
                    tdIndex: d,
                    tdId: td.id,
                    trId: tr.id,
                    tableId: element.id
                  },
                  nextIndex: context.nextIndex
                }
              }
            }
          }
        }
        if (
          !element.controlId ||
          element.controlId === controlElement.controlId ||
          elementList[e + 1]?.controlComponent === ControlComponent.PREFIX ||
          elementList[e + 1]?.controlComponent === ControlComponent.PRE_TEXT
        ) {
          continue
        }
        return {
          positionContext: {
            isTable: false
          },
          nextIndex: e
        }
      }
      return null
    }
    // 当前上下文控件信息
    const { endIndex } = this.range.getEditBoundaryRange()
    const elementList = this.draw.getElementList()
    const context = getNextContext(elementList, endIndex)
    if (context) {
      return {
        positionContext: positionContext.isTable
          ? positionContext
          : context.positionContext,
        nextIndex: context.nextIndex
      }
    }
    // 控件在单元内时继续循环
    if (controlElement.tableId) {
      const originalElementList = this.draw.getOriginalElementList()
      const { index, trIndex, tdIndex } = positionContext
      const trList = originalElementList[index!].trList!
      for (let r = trIndex!; r < trList.length; r++) {
        const tr = trList[r]
        const tdList = tr.tdList
        for (let d = 0; d < tdList.length; d++) {
          if (trIndex === r && d <= tdIndex!) continue
          const td = tdList[d]
          const context = getNextContext(td.value, 0)
          if (context) {
            return {
              positionContext: {
                isTable: true,
                index: positionContext.index,
                trIndex: r,
                tdIndex: d,
                tdId: td.id,
                trId: tr.id,
                tableId: controlElement.tableId
              },
              nextIndex: context.nextIndex
            }
          }
        }
      }
      // 跳出表格继续循环
      const context = getNextContext(originalElementList, index! + 1)
      if (context) {
        return {
          positionContext: {
            isTable: false
          },
          nextIndex: context.nextIndex
        }
      }
    }
    return null
  }

  public initNextControl(option: IInitNextControlOption = {}) {
    const { direction = MoveDirection.DOWN } = option
    let context: INextControlContext | null = null
    if (direction === MoveDirection.UP) {
      context = this.getPreControlContext()
    } else {
      context = this.getNextControlContext()
    }
    if (!context) return
    const { nextIndex, positionContext } = context
    const position = this.draw.getPosition()
    // 设置上下文
    position.setPositionContext(positionContext)
    this.draw.getRange().replaceRange({
      startIndex: nextIndex,
      endIndex: nextIndex
    })
    // 重新渲染并定位
    this.draw.render({
      curIndex: nextIndex,
      isCompute: false,
      isSetCursor: true,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    })
    const positionList = position.getPositionList()
    this.draw.getCursor().moveCursorToVisible({
      cursorPosition: positionList[nextIndex],
      direction
    })
  }

  public setMinWidthControlInfo(option: ISetControlRowFlexOption) {
    const { row, rowElement, controlRealWidth, availableWidth } = option
    if (!rowElement.control?.minWidth) return
    const { scale } = this.options
    const controlMinWidth = rowElement.control.minWidth * scale
    // 设置首字符偏移量：如果控件内设置对齐方式&&存在设置最小宽度
    let controlFirstElement: IRowElement | null = null
    if (
      rowElement.control?.minWidth &&
      (rowElement.control?.rowFlex === RowFlex.CENTER ||
        rowElement.control?.rowFlex === RowFlex.RIGHT)
    ) {
      // 计算当前控件内容宽度是否超出最小宽度设置
      let controlContentWidth = rowElement.metrics.width
      let controlElementIndex = row.elementList.length - 1
      while (controlElementIndex >= 0) {
        const controlRowElement = row.elementList[controlElementIndex]
        controlContentWidth += controlRowElement.metrics.width
        // 找到首字符结束循环
        if (
          row.elementList[controlElementIndex - 1]?.controlComponent ===
          ControlComponent.PREFIX
        ) {
          controlFirstElement = controlRowElement
          break
        }
        controlElementIndex--
      }
      // 计算首字符偏移量
      if (controlFirstElement) {
        if (controlContentWidth < controlMinWidth) {
          if (rowElement.control.rowFlex === RowFlex.CENTER) {
            controlFirstElement.left =
              (controlMinWidth - controlContentWidth) / 2
          } else if (rowElement.control.rowFlex === RowFlex.RIGHT) {
            // 最小宽度 - 实际宽度 - 后缀元素宽度
            controlFirstElement.left =
              controlMinWidth - controlContentWidth - rowElement.metrics.width
          }
        }
      }
    }
    // 设置后缀偏移量：消费小于实际最小宽度
    const extraWidth = controlMinWidth - controlRealWidth
    if (extraWidth > 0) {
      const controlFirstElementLeft = controlFirstElement?.left || 0
      // 超出行宽时截断
      const rowRemainingWidth =
        availableWidth - row.width - rowElement.metrics.width
      const left = Math.min(rowRemainingWidth, extraWidth)
      // 后缀偏移量需减去首字符的偏移量，避免重复偏移
      rowElement.left = left - controlFirstElementLeft
      row.width += left - controlFirstElementLeft
    }
  }
}
