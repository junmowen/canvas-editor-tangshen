import { ControlComponent, ControlState, ControlType } from '../../../../dataset/enum/Control'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { ZERO } from '../../../../dataset/constant/Common'
import { CONTROL_STYLE_ATTR } from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'
import {
  IControl,
  IControlChangeOption,
  IControlContentChangeResult,
  IControlContext,
  IControlInitOption,
  IControlRuleOption,
  IDestroyControlOption,
  IRepaintControlOption
} from '../../../../interface/Control'
import { pickObject, splitText } from '../../../../utils'
import { zipElementList } from '../../../../utils/elementZip'
import { formatElementContext } from '../../../../utils/elementContext'
import { CheckboxControl } from './checkbox/CheckboxControl'
import { RadioControl } from './radio/RadioControl'
import { SelectControl } from './select/SelectControl'
import { TextControl } from './text/TextControl'
import { DateControl } from './date/DateControl'
import { NumberControl } from './number/NumberControl'
import { IControlMoveCursorResult, resolveControlMoveCursorResult } from './controlCursor'
import { isControlPlaceholderComponent } from './controlValue'
import type { Control } from './Control'

/** 控件内部访问契约，用于在拆分模块间共享受控能力。 */
type ControlInternal = Record<string, any>

declare module './Control' {
  /** 控件契约，用于约束内部流程中传递的数据结构。 */
  interface Control {
    initControl(): void
    /** 销毁destroy控件相关资源，解除事件监听并释放持有对象。 */
    destroyControl(options?: IDestroyControlOption): void
    repaintControl(options?: IRepaintControlOption): void
    emitControlContentChange(options?: IControlChangeOption): void
    reAwakeControl(): void
    moveCursor(position: IControlInitOption): IControlMoveCursorResult
    removeControl(payload?: any): number
    removePlaceholder(...args: any[]): number
    addPlaceholder(...args: any[]): number
    addPlaceholderIfEmpty(...args: any[]): number
    clearControlValueRange(payload: any): number
    removeControlValueSegment(payload: any): number
    insertControlValueElementList(payload: any): number
    insertControlTextValueElementList(payload: any): number
    setValue(data: IElement[]): number
    setControlProperties(properties: Partial<IControl>, context?: IControlContext): void
    /** 处理键盘按下事件，执行快捷键、输入或控件拦截逻辑。 */
    keydown(evt: KeyboardEvent): number | null
    /** 处理剪切操作，复制选区内容后删除原文档范围。 */
    cut(): number
  }
}

const controlLifecycleMethods = {
  initControl(this: ControlInternal) {
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
      this.activeControl = new TextControl(element, this as any)
    } else if (control.type === ControlType.SELECT) {
      // 创建 select Control 实例。
      const selectControl = new SelectControl(element, this as any)
      this.activeControl = selectControl
      selectControl.awake()
    } else if (control.type === ControlType.CHECKBOX) {
      this.activeControl = new CheckboxControl(element, this as any)
    } else if (control.type === ControlType.RADIO) {
      this.activeControl = new RadioControl(element, this as any)
    } else if (control.type === ControlType.DATE) {
      // 创建 date Control 实例。
      const dateControl = new DateControl(element, this as any)
      this.activeControl = dateControl
      dateControl.awake()
    } else if (control.type === ControlType.NUMBER) {
      this.activeControl = new NumberControl(element, this as any)
    }
    // 缓存控件数据
    this.updateActiveControlValue()
    this.preElement = element
    // 激活控件回调
    if (element.controlComponent !== ControlComponent.POSTFIX) {
      this.emitControlChange(ControlState.ACTIVE)
    }
  },

  /** 销毁destroy控件相关资源，解除事件监听并释放持有对象。 */
  destroyControl(this: ControlInternal, options: IDestroyControlOption = {}) {
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
  },

  repaintControl(this: ControlInternal, options: IRepaintControlOption = {}) {
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
  },

  emitControlContentChange(this: ControlInternal, options?: IControlChangeOption) {
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
  },

  reAwakeControl(this: ControlInternal) {
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
  },

  moveCursor(this: ControlInternal, position: IControlInitOption): IControlMoveCursorResult {
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
  },

  removeControl(
    this: ControlInternal,
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
  },

  removePlaceholder(this: ControlInternal, startIndex: number, context: IControlContext = {}) {
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
  },

  addPlaceholder(this: ControlInternal, startIndex: number, context: IControlContext = {}) {
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
  },

  addPlaceholderIfEmpty(
    this: ControlInternal,
    startIndex: number,
    context: IControlContext = {}
  ) {
    if (!this.activeControl) return
    const value = this.activeControl.getValue(context)
    if (!value.length) {
      this.addPlaceholder(startIndex, context)
    }
  },

  clearControlValueRange(this: ControlInternal, payload: {
    /** 左侧边界索引，用于描述控件或选区的起点。 */
    leftIndex: number
    /** 右侧边界索引，用于描述控件或选区的终点。 */
    rightIndex: number
    /** 当前操作上下文，汇总本次处理需要共享的状态。 */
    context?: IControlContext
    /** 操作配置项，用于调整当前流程的可选行为。 */
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
  },

  removeControlValueSegment(this: ControlInternal, payload: {
    /** 删除起始索引，用于定位需要移除的元素。 */
    deleteIndex: number
    /** 删除数量，用于描述从起点移除的元素个数。 */
    deleteCount: number
    /** 占位元素索引，用于定位控件删除后的占位位置。 */
    placeholderIndex: number
    /** 当前操作上下文，汇总本次处理需要共享的状态。 */
    context?: IControlContext
    /** 操作配置项，用于调整当前流程的可选行为。 */
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
  },

  insertControlValueElementList(this: ControlInternal, payload: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 插入索引，用于定位新元素写入位置。 */
    insertIndex?: number
    /** 业务数据载荷，供当前操作读取或提交。 */
    data: IElement[]
    /** 锚点元素，用于继承插入内容的上下文位置。 */
    anchorElement: Partial<IElement>
    /** 是否保留控件组件节点，用于插入时维持控件结构。 */
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
  },

  insertControlTextValueElementList(this: ControlInternal, payload: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 前缀索引，用于定位控件或插入内容的左侧边界。 */
    prefixIndex: number
    /** 值列表，保存控件或批量操作的候选值。 */
    valueList: string[]
    /** 样式来源元素，用于继承插入内容的文字样式。 */
    styleElement: Partial<IElement>
    /** 属性来源元素，用于继承插入内容的业务属性。 */
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
  },

  setValue(this: ControlInternal, data: IElement[]): number {
    if (!this.activeControl) {
      throw new Error('active control is null')
    }
    return this.activeControl.setValue(data)
  },

  setControlProperties(
    this: ControlInternal,
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
  },

  /** 处理键盘按下事件，执行快捷键、输入或控件拦截逻辑。 */
  keydown(this: ControlInternal, evt: KeyboardEvent): number | null {
    if (!this.activeControl) {
      throw new Error('active control is null')
    }
    return this.activeControl.keydown(evt)
  },

  /** 处理剪切操作，复制选区内容后删除原文档范围。 */
  cut(this: ControlInternal): number {
    if (!this.activeControl) {
      throw new Error('active control is null')
    }
    return this.activeControl.cut()
  }
}

/** 安装控件lifecyclemethods，把拆分方法挂载到目标原型。 */
export function installControlLifecycleMethods(ControlClass: typeof Control) {
  Object.assign(ControlClass.prototype, controlLifecycleMethods)
}
