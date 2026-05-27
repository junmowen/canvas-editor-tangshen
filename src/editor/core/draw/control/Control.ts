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
  CONTROL_STYLE_ATTR,
  LIST_CONTEXT_ATTR,
  TITLE_CONTEXT_ATTR
} from '../../../dataset/constant/Element'
import { IRowElement } from '../../../interface/Row'
import { RowFlex } from '../../../dataset/enum/Row'
import { ZERO } from '../../../dataset/constant/Common'
import { resolvePositionAtIndex } from '../../event/utils/resolvePositionAtIndex'
import {
  IControlMoveCursorResult,
  resolveControlMoveCursorResult
} from './controlCursor'
import {
  collectTextControlValueBlock,
  resolveControlCodeDisplayText
} from './controlRead'
import { resolveControlBlockEndIndex } from './controlScan'
import { createExpandedNestedControlValueElementList } from './controlNested'
import {
  isControlPlaceholderComponent,
  isControlPrefixComponent,
  isControlSuffixComponent,
  isControlValueComponent,
  hasControlValueAtIndex
} from './controlValue'
import { resolveAdjacentControlContext } from './controlNeighbor'
import {
  transformTableCellValueList,
  walkControlElementList
} from './controlTraversal'
import {
  findMatchedControlIdentity,
  isControlIdentityMatched
} from './controlMatch'
import { isChoiceControlType, isTextLikeControlType } from './controlType'

interface ITextLikeControlInstance extends IControlInstance {
  setValue(
    data: IElement[],
    context?: IControlContext,
    options?: IControlRuleOption
  ): number
  clearValue(context?: IControlContext, options?: IControlRuleOption): number
}

interface IChoiceControlInstance extends IControlInstance {
  setSelect(
    value: string[] | string,
    context?: IControlContext,
    options?: IControlRuleOption
  ): number | void
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
      transformTableCellValueList(element, value => this.filterAssistElement(value))
      // 如果不是控件元素，保留
      if (!element.controlId) return true
      if (
        element.control?.underline &&
        isControlPlaceholderComponent(element.controlComponent)
      ) {
        element.value = element.value ? ' ' : ''
        element.color = this.options.defaultColor
        return true
      }
      // 如果控件有最小宽度，处理前缀和后缀
      if (element.control?.minWidth) {
        if (
          isControlPrefixComponent(element.controlComponent) ||
          isControlSuffixComponent(element.controlComponent)
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
          isControlPrefixComponent(element.controlComponent)
        ) {
          return hasControlValueAtIndex({ elementList, index })
        }
        // 处理后缀文本
        if (
          element.control?.postText &&
          isControlSuffixComponent(element.controlComponent)
        ) {
          return hasControlValueAtIndex({ elementList, index })
        }
      }
      // 过滤掉前缀、后缀和占位符组件
      return (
        !isControlPrefixComponent(element.controlComponent) &&
        !isControlSuffixComponent(element.controlComponent) &&
        !isControlPlaceholderComponent(element.controlComponent)
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
    const { range, startElement, endElement } = this.draw
      .getTargetResolver()
      .resolveRangeBoundaryElements()
    const { startIndex, endIndex } = range
    // 如果没有有效的边界范围，返回 false
    if (!~startIndex && !~endIndex) return false
    // 情况1：闭合光标在后缀处，可以捕获事件
    if (startIndex === endIndex && isControlSuffixComponent(startElement?.controlComponent)) {
      return true
    }
    // 情况2：选区在控件内，可以捕获事件
    if (
      startElement?.controlId &&
      startElement.controlId === endElement?.controlId &&
      !isControlSuffixComponent(endElement?.controlComponent)
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
    const { elementList, startElement, endElement } = this.draw
      .getTargetResolver()
      .resolveRangeBoundaryElements({
        range: { startIndex, endIndex },
        elementList: context.elementList
      })
    if (
      !startElement?.controlId ||
      startElement.controlId !== endElement?.controlId
    ) {
      return false
    }
    for (let i = startIndex + 1; i <= endIndex; i++) {
      const element = elementList[i]
      if (element?.controlId && !isControlValueComponent(element.controlComponent)) {
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
    const { range, startElement } = this.draw
      .getTargetResolver()
      .resolveRangeBoundaryElements()
    const { startIndex, endIndex } = range
    // 如果是范围选择，不在后缀处
    if (startIndex !== endIndex) return false
    // 检查元素是否为后缀组件
    return startElement?.controlComponent === ControlComponent.POSTFIX
  }

  /**
   * 判断选区是否在控件内。
   *
   * @returns 是否在控件内
   */
  public getIsRangeWithinControl(): boolean {
    const { range, startElement, endElement } = this.draw
      .getTargetResolver()
      .resolveRangeBoundaryElements()
    const { startIndex, endIndex } = range
    // 如果没有有效的边界范围，返回 false
    if (!~startIndex && !~endIndex) return false
    // 检查选区是否在同一个控件内，且不在后缀处
    if (
      startElement?.controlId &&
      startElement.controlId === endElement?.controlId &&
      endElement?.controlComponent !== ControlComponent.POSTFIX
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

    const { range, elementList, startElement } = this.draw
      .getTargetResolver()
      .resolveRangeBoundaryElements()
    const { startIndex } = range
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
    const targetResolver = this.draw.getTargetResolver()
    const { startIndex, endIndex } =
      context.range || this.range.getEditBoundaryRange()
    // 如果光标在后缀处，不认为是禁用状态
    if (startIndex === endIndex && ~startIndex && ~endIndex) {
      const { startElement } = targetResolver.resolveRangeBoundaryElements({
        range: context.range,
        elementList: context.elementList
      })
      if (!startElement) return false
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
    const targetResolver = this.draw.getTargetResolver()
    const { startIndex, endIndex } =
      context.range || this.range.getEditBoundaryRange()
    // 如果光标在后缀处，不认为是禁用粘贴状态
    if (startIndex === endIndex && ~startIndex && ~endIndex) {
      const { startElement } = targetResolver.resolveRangeBoundaryElements({
        range: context.range,
        elementList: context.elementList
      })
      if (!startElement) return false
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
    // 单选框、复选框仅需验证控件值
    if (
      element?.control?.type === ControlType.CHECKBOX ||
      element?.control?.type === ControlType.RADIO
    ) {
      return !!element.control?.code
    }
    return hasControlValueAtIndex({
      elementList,
      index
    })
  }

  public getControlHighlight(elementList: IElement[], index: number) {
    return this.controlSearch.getControlHighlight(elementList, index)
  }

  public getContainer(): HTMLDivElement {
    return this.draw.getPageCanvasHost().getContainer()
  }

  public getElementList(): IElement[] {
    return this.draw.getObjectResolver().getElementList()
  }

  public getPosition(): IElementPosition | null {
    const { endIndex } = this.range.getEditBoundaryRange()
    return resolvePositionAtIndex(this.draw, endIndex)
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
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    // 这里直接拿 resolver 算出的控件完整边界，避免业务层重复判断前后缀。
    const controlBoundary = this.draw.getTargetResolver().resolveControlBoundaryElements({
      range: context.range,
      elementList
    })
    if (!controlBoundary) return []
    return elementList.slice(controlBoundary.startIndex, controlBoundary.endIndex + 1)
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
    const elementList = this.draw.getObjectResolver().getElementList()
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
      options?.context?.elementList || this.draw.getObjectResolver().getElementList()
    const startElement = this.draw.getTargetResolver().resolveRangeElement({
      range: options?.context?.range,
      elementList
    })
    if (!startElement?.controlId) return
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
    const elementList = this.draw.getObjectResolver().getElementList()
    const range = this.range.getEditBoundaryRange()
    const element = this.draw.getTargetResolver().resolveRangeElement({
      range,
      elementList
    })
    if (!element) return
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

  public moveCursor(position: IControlInitOption): IControlMoveCursorResult {
    const { index, trIndex, tdIndex, tdValueIndex } = position
    let elementList = this.draw.getObjectResolver().getOriginalElementList()
    let element: IElement
    const newIndex = position.isTable ? tdValueIndex! : index
    if (position.isTable) {
      const tableTd = this.draw.getTargetResolver().resolveOriginalTableTdByIndex({
        tableIndex: index!,
        trIndex: trIndex!,
        tdIndex: tdIndex!
      })
      elementList = tableTd?.td.value || []
      element = elementList[tdValueIndex!]
    } else {
      element = elementList[index]
    }
    return resolveControlMoveCursorResult({ elementList, element, newIndex })
  }

  public removeControl(
    startIndex: number,
    context: IControlContext = {}
  ): number | null {
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    const targetResolver = this.draw.getTargetResolver()
    const startElement = targetResolver.resolveRangeElement({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!startElement) return null
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
    const controlBoundary = targetResolver.resolveControlBoundaryElements({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!controlBoundary) return startIndex
    const leftIndex = controlBoundary.startIndex > 0
      ? controlBoundary.startIndex - 1
      : 0
    const rightIndex = controlBoundary.endIndex
    // 删除元素
    this.draw.spliceElementList(
      elementList,
      leftIndex + 1,
      rightIndex - leftIndex
    )
    return leftIndex
  }

  public removePlaceholder(startIndex: number, context: IControlContext = {}) {
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    const targetResolver = this.draw.getTargetResolver()
    const startElement = targetResolver.resolveRangeElement({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!startElement) return
    const controlBoundary = targetResolver.resolveControlBoundaryElements({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!controlBoundary) return
    let isHasSubmitHistory = false
    let index = controlBoundary.startIndex
    let controlEndIndex = controlBoundary.endIndex
    while (index <= controlEndIndex) {
      const curElement = elementList[index]
      if (curElement.controlId !== controlBoundary.controlId) break
      if (isControlPlaceholderComponent(curElement.controlComponent)) {
        // 删除占位符时替换前一个历史记录
        if (!isHasSubmitHistory) {
          isHasSubmitHistory = true
          this.draw.getHistoryManager().popUndo()
          this.draw.submitHistory(startIndex)
        }
        elementList.splice(index, 1)
        controlEndIndex--
      } else {
        index++
      }
    }
  }

  public addPlaceholder(startIndex: number, context: IControlContext = {}) {
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    const targetResolver = this.draw.getTargetResolver()
    const startElement = targetResolver.resolveRangeElement({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!startElement) return
    const controlBoundary = targetResolver.resolveControlBoundaryElements({
      range: {
        startIndex,
        endIndex: startIndex
      },
      elementList
    })
    if (!controlBoundary) return
    const control = startElement.control!
    if (!control.placeholder) return
    let scanIndex = controlBoundary.startIndex
    while (scanIndex <= controlBoundary.endIndex) {
      if (isControlPlaceholderComponent(elementList[scanIndex].controlComponent)) {
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

  public addPlaceholderIfEmpty(
    startIndex: number,
    context: IControlContext = {}
  ) {
    if (!this.activeControl) return
    const value = this.activeControl.getValue(context)
    if (!value.length) {
      this.addPlaceholder(startIndex, context)
    }
  }

  public clearControlValueRange(payload: {
    leftIndex: number
    rightIndex: number
    context?: IControlContext
    options?: IControlRuleOption
  }): number {
    const { leftIndex, rightIndex, context = {}, options = {} } = payload
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    this.draw.spliceElementList(
      elementList,
      leftIndex + 1,
      rightIndex - leftIndex,
      [],
      {
        isIgnoreDeletedRule: options.isIgnoreDeletedRule
      }
    )
    // 清空后由统一入口补占位符，避免各控件重复拼 placeholder 结构。
    if (options.isAddPlaceholder !== false) {
      this.addPlaceholder(leftIndex, {
        ...context,
        elementList
      })
    }
    return leftIndex
  }

  public removeControlValueSegment(payload: {
    deleteIndex: number
    deleteCount: number
    placeholderIndex: number
    context?: IControlContext
    options?: IControlRuleOption
  }): number {
    const {
      deleteIndex,
      deleteCount,
      placeholderIndex,
      context = {},
      options = {}
    } = payload
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    this.draw.spliceElementList(elementList, deleteIndex, deleteCount, [], {
      isIgnoreDeletedRule: options.isIgnoreDeletedRule
    })
    this.addPlaceholderIfEmpty(placeholderIndex, {
      ...context,
      elementList
    })
    return placeholderIndex
  }

  public insertControlValueElementList(payload: {
    elementList: IElement[]
    startIndex: number
    insertIndex?: number
    data: IElement[]
    anchorElement: Partial<IElement>
    isPreserveControlComponent?: boolean
  }): number {
    const {
      elementList,
      startIndex,
      insertIndex = startIndex + 1,
      data,
      anchorElement,
      isPreserveControlComponent = false
    } = payload
    for (let i = 0; i < data.length; i++) {
      const newElement: IElement = {
        ...anchorElement,
        ...data[i],
        controlComponent: isPreserveControlComponent
          ? data[i].controlComponent || ControlComponent.VALUE
          : ControlComponent.VALUE
      }
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      this.draw.spliceElementList(elementList, insertIndex + i, 0, [
        newElement
      ])
    }
    return insertIndex + data.length - 1
  }

  public insertControlTextValueElementList(payload: {
    elementList: IElement[]
    prefixIndex: number
    valueList: string[]
    styleElement: Partial<IElement>
    propertyElement: Partial<IElement>
  }): number {
    const {
      elementList,
      prefixIndex,
      valueList,
      styleElement,
      propertyElement
    } = payload
    const insertIndex = prefixIndex + 1
    for (let i = 0; i < valueList.length; i++) {
      const newElement: IElement = {
        ...styleElement,
        ...propertyElement,
        type: ElementType.TEXT,
        value: valueList[i],
        controlComponent: ControlComponent.VALUE
      }
      formatElementContext(elementList, [newElement], prefixIndex, {
        editorOptions: this.options
      })
      this.draw.spliceElementList(elementList, insertIndex + i, 0, [
        newElement
      ])
    }
    return insertIndex + valueList.length - 1
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
    const elementList = context.elementList || this.draw.getObjectResolver().getElementList()
    const targetResolver = this.draw.getTargetResolver()
    const controlBoundary = targetResolver.resolveControlBoundaryElements({
      range: context.range,
      elementList
    })
    if (!controlBoundary) return
    for (let i = controlBoundary.startIndex; i <= controlBoundary.endIndex; i++) {
      const element = elementList[i]
      element.control = {
        ...element.control!,
        ...properties
      }
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

  private getNormalizedControlValueList(
    element: IElement,
    value: ISetControlValueOption['value']
  ): IElement[] {
    return Array.isArray(value)
      ? deepClone(value)
      : this.getStringControlValueElementList(element, value)
  }

  private applyNestedTextLikeControlValue(
    element: IElement,
    value: ISetControlValueOption['value']
  ): IElement[] {
    const formatValue = this.getNormalizedControlValueList(element, value)
    if (formatValue.length) {
      formatElementList(formatValue, {
        isHandleFirstElement: false,
        editorOptions: this.options
      })
    }
    element.control!.value = formatValue
    return formatValue
  }

  private applyTextLikeControlValueById(
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption,
    ControlClass: new (
      element: IElement,
      control: Control
    ) => ITextLikeControlInstance
  ) {
    const control = new ControlClass(element, this)
    this.activeControl = control
    const formatValue = this.getNormalizedControlValueList(element, value)
    if (formatValue.length) {
      formatElementList(formatValue, {
        isHandleFirstElement: false,
        editorOptions: this.options
      })
      control.setValue(formatValue, controlContext, controlRule)
    } else {
      control.clearValue(controlContext, controlRule)
    }
  }

  private applySelectControlValueById(
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption
  ) {
    if (Array.isArray(value)) return
    const control = new SelectControl(element, this)
    this.activeControl = control
    if (value) {
      control.setSelect(value, controlContext, controlRule)
    } else {
      control.clearSelect(controlContext, controlRule)
    }
  }

  private applyCodeControlValueById(
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption,
    ControlClass: new (element: IElement, control: Control) => IChoiceControlInstance,
    isMultiValue: boolean
  ) {
    if (Array.isArray(value)) return
    const control = new ControlClass(element, this)
    this.activeControl = control
    const codes = value
      ? isMultiValue
        ? String(value).split(',')
        : [String(value)]
      : []
    control.setSelect(codes, controlContext, controlRule)
  }

  private applyDateControlValueById(
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption
  ) {
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
  }

  private applyControlValueById(
    element: IElement,
    value: ISetControlValueOption['value'],
    controlContext: IControlContext,
    controlRule: IControlRuleOption
  ) {
    const { type } = element.control!
    if (type === ControlType.TEXT) {
      this.applyTextLikeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        TextControl
      )
    } else if (type === ControlType.SELECT) {
      this.applySelectControlValueById(
        element,
        value,
        controlContext,
        controlRule
      )
    } else if (type === ControlType.CHECKBOX) {
      this.applyCodeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        CheckboxControl,
        true
      )
    } else if (type === ControlType.RADIO) {
      this.applyCodeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        RadioControl,
        false
      )
    } else if (type === ControlType.DATE) {
      this.applyDateControlValueById(
        element,
        value,
        controlContext,
        controlRule
      )
    } else if (type === ControlType.NUMBER) {
      this.applyTextLikeControlValueById(
        element,
        value,
        controlContext,
        controlRule,
        NumberControl
      )
    }
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
    if (isTextLikeControlType(control.type)) {
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
    if (isTextLikeControlType(control.type)) {
      this.applyNestedTextLikeControlValue(element, value)
    } else if (isChoiceControlType(control.type)) {
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
    if (isTextLikeControlType(control.type)) {
      const formatValue = this.applyNestedTextLikeControlValue(
        prefixElement,
        value
      )
      const valueElementList = createExpandedNestedControlValueElementList({
        prefixElement,
        control,
        valueElementList: formatValue
      })
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
    if (isChoiceControlType(control.type)) {
      return resolveControlCodeDisplayText({
        code: control.code,
        valueSets: control.valueSets,
        delimiter: control.multiSelectDelimiter || '、'
      })
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
      walkControlElementList({
        elementList,
        zone,
        scopeAreaId,
        isIncludeArea: true,
        isOnlyControlEntry: true,
        visitor: ({
          element,
          elementList,
          index,
          zone,
          scopeAreaId
        }): number | void => {
          const control = element.control!
          if (
            !isControlIdentityMatched({
              element,
              option: payload,
              scopeAreaId,
              isIncludeScopeArea: true
            })
          ) {
            return
          }
          if (this.isNestedControlValueElement(element)) {
            result.push(this.getNestedControlValueResult(element, zone!))
            return
          }
          const { type, code, valueSets } = control
          if (isTextLikeControlType(type)) {
            const {
              textControlValue,
              textControlElementList,
              endIndex
            } = collectTextControlValueBlock({
              elementList,
              startIndex: index,
              controlId: element.controlId!,
              controlType: type
            })
            result.push({
              ...control,
              zone: zone!,
              value: textControlValue || null,
              innerText: textControlValue || null,
              elementList: zipElementList(textControlElementList)
            })
            return endIndex
          } else if (isChoiceControlType(type)) {
            const innerText = resolveControlCodeDisplayText({
              code,
              valueSets
            })
            result.push({
              ...control,
              zone: zone!,
              value:
                code !== undefined && code !== null ? String(code) || null : null,
              innerText: innerText || null
            })
          }
        }
      })
    }
    for (const { zone, elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
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
      walkControlElementList({
        elementList,
        scopeAreaId,
        isIncludeArea: true,
        isOnlyControlEntry: true,
        visitor: ({
          element,
          elementList,
          index,
          cursorIndex,
          scopeAreaId
        }): number | void => {
          // 获取设置值优先id、conceptId、areaId
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload,
            scopeAreaId,
            isIncludeScopeArea: true
          })
          if (!payloadItem) return
          if (this.isNestedControlValueElement(element)) {
            this.setNestedControlValue(element, payloadItem.value, elementList)
            isExistSet = true
            if (payloadItem.isSubmitHistory !== false) {
              isExistSubmitHistory = true
            }
            return
          }
          if (element.parentControlId) {
            isExistSet = true
            if (payloadItem.isSubmitHistory !== false) {
              isExistSubmitHistory = true
            }
            return this.setExpandedNestedControlValue(
              elementList,
              index,
              payloadItem.value
            )
          }
          const { value, isSubmitHistory = true } = payloadItem
          // 只要存在一次保存历史均记录
          isExistSet = true
          if (isSubmitHistory) {
            isExistSubmitHistory = true
          }
          // 当前控件结束索引
          const currentEndIndex = resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
          // 模拟光标选区上下文
          const fakeRange = {
            startIndex: index,
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
          this.applyControlValueById(element, value, controlContext, controlRule)
          // 控件值变更事件
          this.emitControlContentChange({
            context: controlContext
          })
          // 模拟控件激活后销毁
          this.activeControl = null
          // 修改后控件结束索引
          return resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
        }
      })
    }
    // 销毁旧控件
    this.destroyControl({
      isEmitEvent: false
    })
    // 页眉、内容区、页脚同时处理
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
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
      walkControlElementList({
        elementList,
        visitor: ({ element, elementList, cursorIndex }): number | void => {
          // 获取设置值优先id、conceptId、areaId
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload
          })
          if (!payloadItem) return
          const { extension } = payloadItem
          // 设置值
          this.setControlProperties(
            {
              extension
            },
            {
              elementList,
              range: { startIndex: cursorIndex, endIndex: cursorIndex }
            }
          )
          // 修改后控件结束索引
          return resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
        }
      })
    }
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      setExtension(elementList)
    }
  }

  public setPropertiesListById(payload: ISetControlProperties[]) {
    if (!payload.length) return
    let isExistUpdate = false
    let isExistSubmitHistory = false
    const setProperties = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        visitor: ({ element, elementList, index, cursorIndex }): number | void => {
          const control = element.control!
          // 获取设置值优先id、conceptId、areaId
          const payloadItem = findMatchedControlIdentity({
            element,
            optionList: payload
          })
          if (!payloadItem) return
          const { properties, isSubmitHistory = true } = payloadItem
          isExistUpdate = true
          if (isSubmitHistory) {
            isExistSubmitHistory = true
          }
          // 设置属性
          this.setControlProperties(
            {
              ...control,
              ...properties,
              value: control.value
            },
            {
              elementList,
              range: { startIndex: cursorIndex, endIndex: cursorIndex }
            }
          )
          // 控件默认样式
          const controlStartIndex = index
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
          return resolveControlBlockEndIndex({
            elementList,
            startIndex: cursorIndex,
            controlId: element.controlId!
          })
        }
      })
    }
    // 页眉页脚正文启动搜索
    const pageComponentData: IEditorData = this.draw
      .getObjectResolver()
      .getOriginalEditorData()
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
    const getControlElementList = (elementList: IElement[]) => {
      walkControlElementList({
        elementList,
        isRequireControl: false,
        visitor: ({ element }) => {
          collectControlElement(element)
        }
      })
    }
    for (const { elementList } of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
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
    const positionContext = this.draw.getCoordinate().getPositionContext()
    if (!positionContext) return null
    const controlElement = this.activeControl.getElement()
    // 当前上下文控件信息
    const { startIndex } = this.range.getEditBoundaryRange()
    return resolveAdjacentControlContext({
      direction: 'pre',
      currentControlId: controlElement.controlId!,
      currentElementList: this.draw.getObjectResolver().getElementList(),
      currentBoundaryIndex: startIndex,
      currentPositionContext: positionContext,
      originalElementList: this.draw.getObjectResolver().getOriginalElementList(),
      tableId: controlElement.tableId
    })
  }

  public getNextControlContext(): INextControlContext | null {
    if (!this.activeControl) return null
    const positionContext = this.draw.getCoordinate().getPositionContext()
    if (!positionContext) return null
    const controlElement = this.activeControl.getElement()
    // 当前上下文控件信息
    const { endIndex } = this.range.getEditBoundaryRange()
    return resolveAdjacentControlContext({
      direction: 'next',
      currentControlId: controlElement.controlId!,
      currentElementList: this.draw.getObjectResolver().getElementList(),
      currentBoundaryIndex: endIndex,
      currentPositionContext: positionContext,
      originalElementList: this.draw.getObjectResolver().getOriginalElementList(),
      tableId: controlElement.tableId
    })
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
    // 设置上下文
    this.draw.getCoordinate().setPositionContext(positionContext)
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
    const positionList = this.draw.getCoordinate().getPositionList()
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
