import { ElementStyleKey } from '../../dataset/enum/ElementStyle'
import { TEXTLIKE_ELEMENT_TYPE } from '../../dataset/constant/Element'
import { NUMBER_LIKE_REG } from '../../dataset/constant/Regular'
import { Draw } from '../draw/Draw'
import type { DrawCoordinateService } from '../draw/coordinate/DrawCoordinateService'
import { RangeManager } from '../range/RangeManager'
import { isEditorDisabled } from '../shared/utils/editorState'
import { threeClick } from '../../utils'
import { IRangeElementStyle } from '../../interface/Range'
import { ICopyOption } from '../../interface/Event'
import {
  createDefaultPointerSession,
  IPointerSession
} from './pointer/PointerSession'
import { PointerController } from './pointer/PointerController'
import { PointerSessionController } from './pointer/PointerSessionController'
import { EditorClipboardController } from './EditorClipboardController'
import { EditorInputController } from './EditorInputController'

/** compositioninfo契约，用于约束内部流程中传递的数据结构。 */
export interface ICompositionInfo {
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string
  /** 默认样式配置，用于在元素缺省时提供基础显示效果。 */
  defaultStyle: IRangeElementStyle | null
}

export class CanvasEvent {
  public isComposing: boolean
  /** IME 组合输入状态，记录组合文本和范围以避免重复提交。 */
  public compositionInfo: ICompositionInfo | null
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 页面容器 DOM，用于承载页面、浮层或交互节点。 */
  private pageContainer: HTMLDivElement
  /** 选区管理器，用于读取和更新当前编辑范围。 */
  private range: RangeManager
  /** 坐标服务，用于读取元素位置、浮动元素和光标坐标。 */
  private coordinate: DrawCoordinateService
  /** 指针会话状态，保存一次鼠标按下到释放之间的交互上下文。 */
  private pointerSession: IPointerSession
  private pointerController: PointerController
  private pointerSessionController: PointerSessionController
  private inputController: EditorInputController
  private clipboardController: EditorClipboardController

  /** 初始化 CanvasEvent 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.pageContainer = draw.getPageCanvasHost().getPageContainer()
    this.range = draw.getRange()
    this.coordinate = draw.getCoordinate()

    this.isComposing = false
    this.compositionInfo = null
    this.pointerSession = createDefaultPointerSession()
    this.pointerController = new PointerController(this)
    this.pointerSessionController = new PointerSessionController(this)
    this.inputController = new EditorInputController(this)
    this.clipboardController = new EditorClipboardController(this)
  }

  public getDraw(): Draw {
    return this.draw
  }

  public getPointerSession(): IPointerSession {
    return this.pointerSession
  }

  public getPointerController(): PointerController {
    return this.pointerController
  }

  public getPointerSessionController(): PointerSessionController {
    return this.pointerSessionController
  }

  public getInputController(): EditorInputController {
    return this.inputController
  }

  public getClipboardController(): EditorClipboardController {
    return this.clipboardController
  }

  public register() {
    this.pageContainer.addEventListener('click', this.click.bind(this))
    this.pageContainer.addEventListener('mousedown', this.mousedown.bind(this))
    this.pageContainer.addEventListener('mouseup', this.mouseup.bind(this))
    this.pageContainer.addEventListener('contextmenu', this.contextmenu.bind(this))
    this.pageContainer.addEventListener(
      'mouseleave',
      this.mouseleave.bind(this)
    )
    this.pageContainer.addEventListener('mouseover', this.mouseover.bind(this))
    this.pageContainer.addEventListener('mouseenter', this.mouseenter.bind(this))
    this.pageContainer.addEventListener('mouseout', this.mouseout.bind(this))
    this.pageContainer.addEventListener('mousemove', this.mousemove.bind(this))
    this.pageContainer.addEventListener('dblclick', this.dblclick.bind(this))
    this.pageContainer.addEventListener('wheel', this.wheel.bind(this))
    this.pageContainer.addEventListener('drag', this.drag.bind(this))
    this.pageContainer.addEventListener('dragover', this.dragover.bind(this))
    this.pageContainer.addEventListener('drop', this.drop.bind(this))
    threeClick(this.pageContainer, this.threeClick.bind(this))
  }

  public clearPainterStyle() {
    this.draw.getPageCanvasHost().setBaseCursor('text')
    this.draw.setPainterStyle(null)
  }

  public applyPainterStyle() {
    const painterStyle = this.draw.getPainterStyle()
    if (!painterStyle) return
    if (isEditorDisabled(this.draw)) return
    const selection = this.range.getSelection() || this.resolvePainterWordSelection()
    if (!selection) return
    const painterStyleKeys = Object.keys(painterStyle)
    selection.forEach(s => {
      painterStyleKeys.forEach(pKey => {
        const key = pKey as keyof typeof ElementStyleKey
        s[key] = painterStyle[key] as any
      })
    })
    this.draw.render({ isSetCursor: false })
    // 清除格式状态。
    const painterOptions = this.draw.getPainterOptions()
    if (!painterOptions || !painterOptions.isDblclick) {
      this.clearPainterStyle()
    }
  }

  private resolvePainterWordSelection() {
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (startIndex !== endIndex || !~endIndex) return null
    const elementList = this.draw.getObjectResolver().getElementList()
    const cursorIndex = endIndex
    const cursorElement = elementList[cursorIndex]
    if (
      !cursorElement ||
      (cursorElement.type && !TEXTLIKE_ELEMENT_TYPE.includes(cursorElement.type))
    ) {
      return null
    }
    const cursorValue = cursorElement.value
    const isNumber = NUMBER_LIKE_REG.test(cursorValue)
    // 字母字符匹配正则，用于识别词级选择中的普通字符。
    const LETTER_REG = this.draw.getLetterReg()
    if (!isNumber && !LETTER_REG.test(cursorValue)) return null

    let wordStartIndex = cursorIndex
    while (wordStartIndex > 0) {
      const element = elementList[wordStartIndex - 1]
      if (
        !element ||
        (element.type && !TEXTLIKE_ELEMENT_TYPE.includes(element.type)) ||
        (isNumber
          ? !NUMBER_LIKE_REG.test(element.value)
          : !LETTER_REG.test(element.value))
      ) {
        break
      }
      wordStartIndex--
    }

    let wordEndIndex = cursorIndex
    while (wordEndIndex < elementList.length - 1) {
      const element = elementList[wordEndIndex + 1]
      if (
        !element ||
        (element.type && !TEXTLIKE_ELEMENT_TYPE.includes(element.type)) ||
        (isNumber
          ? !NUMBER_LIKE_REG.test(element.value)
          : !LETTER_REG.test(element.value))
      ) {
        break
      }
      wordEndIndex++
    }

    return elementList.slice(wordStartIndex, wordEndIndex + 1)
  }

  public selectAll() {
    const control = this.draw.getControl()
    if (control.selectAllValue()) {
      return
    }
    this.coordinate.setPositionContext({
      isTable: false,
      isControl: false
    })
    const position = this.coordinate.getPositionList()
    this.range.setRange(0, position.length - 1)
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  /** 处理mousemove事件，衔接指针交互和编辑器状态更新。 */
  public mousemove(evt: MouseEvent) {
    this.pointerController.mousemove(evt)
  }

  /** 处理mousedown事件，衔接指针交互和编辑器状态更新。 */
  public mousedown(evt: MouseEvent) {
    this.pointerController.mousedown(evt)
  }

  /** 处理click事件，衔接指针交互和编辑器状态更新。 */
  public click(evt: MouseEvent) {
    this.pointerController.click(evt)
  }

  /** 处理mouseup事件，衔接指针交互和编辑器状态更新。 */
  public mouseup(evt: MouseEvent) {
    this.pointerController.mouseup(evt)
  }

  /** 处理mouseleave事件，衔接指针交互和编辑器状态更新。 */
  public mouseleave(evt: MouseEvent) {
    this.pointerController.mouseleave(evt)
  }

  /** 处理mouseover事件，衔接指针交互和编辑器状态更新。 */
  public mouseover(evt: MouseEvent) {
    this.pointerController.mouseover(evt)
  }

  /** 处理mouseenter事件，衔接指针交互和编辑器状态更新。 */
  public mouseenter(evt: MouseEvent) {
    this.pointerController.mouseenter(evt)
  }

  /** 处理mouseout事件，衔接指针交互和编辑器状态更新。 */
  public mouseout(evt: MouseEvent) {
    this.pointerController.mouseout(evt)
  }

  public contextmenu(evt: MouseEvent) {
    this.pointerController.contextmenu(evt)
  }

  /** 处理wheel事件，衔接指针交互和编辑器状态更新。 */
  public wheel(evt: WheelEvent) {
    this.pointerController.wheel(evt)
  }

  /** 处理键盘按下事件，执行快捷键、输入或控件拦截逻辑。 */
  public keydown(evt: KeyboardEvent) {
    this.inputController.keydown(evt)
  }

  public dblclick(evt: MouseEvent) {
    this.pointerController.dblclick(evt)
  }

  public threeClick(evt: MouseEvent) {
    this.pointerController.threeClick(evt)
  }

  /** 处理文本输入事件，把输入内容写入当前光标位置。 */
  public input(data: string) {
    this.inputController.input(data)
  }

  /** 处理剪切操作，复制选区内容后删除原文档范围。 */
  public cut() {
    this.inputController.cut()
  }

  /** 处理复制操作，把当前选区内容写入剪贴板。 */
  public copy(options?: ICopyOption) {
    this.inputController.copy(options)
  }

  /** 处理输入法组合开始事件，暂停普通输入提交。 */
  public compositionstart() {
    this.inputController.compositionstart()
  }

  /** 处理输入法组合结束事件，提交最终输入文本。 */
  public compositionend(evt: CompositionEvent) {
    this.inputController.compositionend(evt)
  }

  /** 处理drop事件，衔接指针交互和编辑器状态更新。 */
  public drop(evt: DragEvent) {
    this.pointerController.drop(evt)
  }

  /** 处理drag事件，衔接指针交互和编辑器状态更新。 */
  public drag(evt: DragEvent) {
    this.pointerController.drag(evt)
  }

  /** 处理dragover事件，衔接指针交互和编辑器状态更新。 */
  public dragover(evt: DragEvent | MouseEvent) {
    this.pointerController.dragover(evt)
  }
}
