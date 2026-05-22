import { ElementStyleKey } from '../../dataset/enum/ElementStyle'
import { TEXTLIKE_ELEMENT_TYPE } from '../../dataset/constant/Element'
import { NUMBER_LIKE_REG } from '../../dataset/constant/Regular'
import { Draw } from '../draw/Draw'
import { Position } from '../position/Position'
import { RangeManager } from '../range/RangeManager'
import { isEditorDisabled } from '../utils/editorState'
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

export interface ICompositionInfo {
  startIndex: number
  endIndex: number
  value: string
  defaultStyle: IRangeElementStyle | null
}

export class CanvasEvent {
  public isComposing: boolean
  public compositionInfo: ICompositionInfo | null
  private draw: Draw
  private pageContainer: HTMLDivElement
  private range: RangeManager
  private position: Position
  private pointerSession: IPointerSession
  private pointerController: PointerController
  private pointerSessionController: PointerSessionController
  private inputController: EditorInputController
  private clipboardController: EditorClipboardController

  constructor(draw: Draw) {
    this.draw = draw
    this.pageContainer = draw.getPageCanvasHost().getPageContainer()
    this.range = draw.getRange()
    this.position = draw.getPosition()

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
    const elementList = this.draw.getElementList()
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
    this.position.setPositionContext({
      isTable: false,
      isControl: false
    })
    const position = this.position.getPositionList()
    this.range.setRange(0, position.length - 1)
    this.draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  public mousemove(evt: MouseEvent) {
    this.pointerController.mousemove(evt)
  }

  public mousedown(evt: MouseEvent) {
    this.pointerController.mousedown(evt)
  }

  public click(evt: MouseEvent) {
    this.pointerController.click(evt)
  }

  public mouseup(evt: MouseEvent) {
    this.pointerController.mouseup(evt)
  }

  public mouseleave(evt: MouseEvent) {
    this.pointerController.mouseleave(evt)
  }

  public mouseover(evt: MouseEvent) {
    this.pointerController.mouseover(evt)
  }

  public mouseenter(evt: MouseEvent) {
    this.pointerController.mouseenter(evt)
  }

  public mouseout(evt: MouseEvent) {
    this.pointerController.mouseout(evt)
  }

  public contextmenu(evt: MouseEvent) {
    this.pointerController.contextmenu(evt)
  }

  public wheel(evt: WheelEvent) {
    this.pointerController.wheel(evt)
  }

  public keydown(evt: KeyboardEvent) {
    this.inputController.keydown(evt)
  }

  public dblclick(evt: MouseEvent) {
    this.pointerController.dblclick(evt)
  }

  public threeClick(evt: MouseEvent) {
    this.pointerController.threeClick(evt)
  }

  public input(data: string) {
    this.inputController.input(data)
  }

  public cut() {
    this.inputController.cut()
  }

  public copy(options?: ICopyOption) {
    this.inputController.copy(options)
  }

  public compositionstart() {
    this.inputController.compositionstart()
  }

  public compositionend(evt: CompositionEvent) {
    this.inputController.compositionend(evt)
  }

  public drop(evt: DragEvent) {
    this.pointerController.drop(evt)
  }

  public drag(evt: DragEvent) {
    this.pointerController.drag(evt)
  }

  public dragover(evt: DragEvent | MouseEvent) {
    this.pointerController.dragover(evt)
  }
}
