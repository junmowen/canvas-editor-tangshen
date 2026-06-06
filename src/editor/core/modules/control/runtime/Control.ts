import {
  ControlComponent,
  ControlState,
  ControlType
} from '../../../../dataset/enum/Control'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { DeepRequired } from '../../../../interface/Common'
import {
  IControl,
  IControlChangeResult,
  IControlContext,
  IControlHighlight,
  IControlInstance,
  IControlOption,
  IInitNextControlOption,
  INextControlContext,
  ISetControlRowFlexOption
} from '../../../../interface/Control'
import { IEditorOption } from '../../../../interface/Editor'
import { IElement } from '../../../../interface/Element'
import { EventBusMap } from '../../../../interface/EventBus'
import { deepClone } from '../../../../utils'
import { pickElementAttr, zipElementList } from '../../../../utils/elementZip'
import { EventBus } from '../../../event/eventbus/EventBus'
import { Listener } from '../../../runtime/listener/Listener'
import { RangeManager } from '../../../range/RangeManager'
import { Draw } from '../../../draw/Draw'
import { ControlSearch } from './interactive/ControlSearch'
import { ControlBorder } from './richtext/Border'
import { MoveDirection } from '../../../../dataset/enum/Observer'
import { IRowElement } from '../../../../interface/Row'
import { RowFlex } from '../../../../dataset/enum/Row'
import {
  isControlPlaceholderComponent,
  isControlPrefixComponent,
  isControlSuffixComponent,
  isControlValueComponent,
  hasControlValueAtIndex
} from './controlValue'
import { resolveAdjacentControlContext } from './controlNeighbor'
import { transformTableCellValueList } from './controlTraversal'
import { installControlValueMethods } from './ControlValueMethods'
import { installControlLifecycleMethods } from './ControlLifecycleMethods'

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
  public controlOptions: IControlOption
  /** 当前激活的控件实例 */
  private activeControl: IControlInstance | null
  /** 当前激活控件的值 */
  private activeControlValue: IElement[]
  /** 前一个元素（用于控件交互判断） */
  public preElement: IElement | null

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

  /** 记录边框info，把当前命中结果写入缓存或统计。 */
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

installControlLifecycleMethods(Control)
installControlValueMethods(Control)
