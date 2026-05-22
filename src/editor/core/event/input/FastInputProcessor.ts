import { ZERO } from '../../../dataset/constant/Common'
import {
  EDITOR_ELEMENT_COPY_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR
} from '../../../dataset/constant/Element'
import { ElementType } from '../../../dataset/enum/Element'
import { IElement } from '../../../interface/Element'
import { IRangeElementStyle } from '../../../interface/Range'
import { splitText } from '../../../utils'
import { formatElementContext } from '../../../utils/element'
import { Draw } from '../../draw/Draw'
import { isEditorDisabled } from '../../utils/editorState'
import { InputBuffer, IInputAction } from './InputBuffer'
import { IncrementalRenderScheduler } from './IncrementalRenderScheduler'

export interface ICompositionInfo {
  elementList?: IElement[]
  startIndex: number
  endIndex: number
  value: string
  defaultStyle: IRangeElementStyle | null
}

export class FastInputProcessor {
  private inputBuffer: InputBuffer
  private renderScheduler: IncrementalRenderScheduler
  private isComposing = false
  private compositionInfo: ICompositionInfo | null = null
  private lastCompositionCommit: { value: string; timestamp: number } | null =
    null

  constructor(private readonly draw: Draw) {
    this.inputBuffer = new InputBuffer()
    this.renderScheduler = new IncrementalRenderScheduler(draw)
  }

  public getIsComposing(): boolean {
    return this.isComposing
  }

  public getCompositionInfo(): ICompositionInfo | null {
    return this.compositionInfo
  }

  public processInput(data: string): void {
    if (isEditorDisabled(this.draw)) return
    if (!data) return

    if (!this.isComposing && this.lastCompositionCommit) {
      const { value, timestamp } = this.lastCompositionCommit
      if (value === data && Date.now() - timestamp < 100) {
        this.lastCompositionCommit = null
        return
      }
      this.lastCompositionCommit = null
    }

    if (this.isComposing && this.compositionInfo?.value === data) return
    if (this.isComposing && this.compositionInfo) {
      this.renderScheduler.clear()
      this.removeComposingInput()
    }

    const components = this.draw.getComponents()
    const position = components.position
    const rangeManager = components.range
    const cursorPosition = position.getCursorPosition()

    if (!cursorPosition || !rangeManager.getIsCanInput()) return

    const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()

    const action: IInputAction = {
      type: this.isComposing ? 'composition' : 'insert',
      data,
      timestamp: Date.now(),
      startIndex,
      endIndex
    }

    this.executeInputAction(action, cursorPosition)
  }

  public compositionStart(): void {
    this.isComposing = true
    this.inputBuffer.clear()
  }

  public compositionEnd(data: string): void {
    this.isComposing = false

    if (!data) {
      this.removeComposingInput()
      const rangeManager = this.draw.getComponents().range
      const { endIndex: curIndex } = rangeManager.getEditBoundaryRange()
      this.renderScheduler.schedule({
        priority: 'high',
        payload: {
          curIndex,
          isSubmitHistory: false
        },
        timestamp: Date.now()
      })
    } else {
      if (this.compositionInfo) {
        this.renderScheduler.clear()
        this.removeComposingInput()
        this.processInput(data)
        this.lastCompositionCommit = {
          value: data,
          timestamp: Date.now()
        }
      }
    }

    const cursor = this.draw.getCursor()
    cursor.clearAgentDomValue()
  }

  public clear(): void {
    this.inputBuffer.clear()
    this.renderScheduler.clear()
    this.compositionInfo = null
  }

  private executeInputAction(action: IInputAction, cursorPosition: any): void {
    const components = this.draw.getComponents()
    const rangeManager = components.range
    const control = components.control

    const defaultStyle =
      rangeManager.getDefaultStyle() || this.compositionInfo?.defaultStyle || null

    this.removeComposingInput()

    if (!this.isComposing) {
      const cursor = components.cursor
      cursor.clearAgentDomValue()
    }

    const text = action.data.replaceAll(`\n`, ZERO)
    const elementList = this.draw.getElementList()
    const copyElement = rangeManager.getRangeAnchorStyle(
      elementList,
      action.endIndex
    )

    if (!copyElement) return

    const inputData = this.createInputElements(
      text,
      copyElement,
      elementList,
      action.endIndex,
      defaultStyle
    )

    let curIndex: number

    if (control.getActiveControl() && control.getIsRangeWithinControl()) {
      curIndex = control.setValue(inputData)
      if (!this.isComposing) {
        control.emitControlContentChange()
      }
    } else {
      const start = action.startIndex + 1
      if (action.startIndex !== action.endIndex) {
        this.draw.spliceElementList(
          elementList,
          start,
          action.endIndex - action.startIndex
        )
      }
      formatElementContext(elementList, inputData, action.startIndex, {
        editorOptions: this.draw.getOptions()
      })
      this.draw.spliceElementList(elementList, start, 0, inputData)
      curIndex = action.startIndex + inputData.length
    }

    if (~curIndex) {
      rangeManager.setRange(curIndex, curIndex)
      components.position.setCursorLogicalIndex(curIndex)

      const shouldUseLayoutPatch =
        !this.isComposing &&
        !control.getActiveControl() &&
        this.draw.getZone().isMainActive() &&
        this.draw.getIsPagingMode() &&
        action.startIndex === action.endIndex &&
        inputData.length === 1 &&
        !components.position.getPositionContext().isTable &&
        cursorPosition.rowIndex !== undefined

      this.renderScheduler.schedule({
        priority: this.isComposing ? 'high' : 'normal',
        payload: {
          curIndex,
          isSubmitHistory: !this.isComposing,
          isTyping: true,
          typingEditIndex: action.startIndex + 1,
          typingInsertedCount: inputData.length,
          isLazy: false,
          pageRenderScope: 'visible',
          layoutPatch: shouldUseLayoutPatch
            ? {
                type: 'text-input',
                insertIndex: action.startIndex + 1,
                insertCount: inputData.length,
                rowIndex: cursorPosition.rowIndex,
                pageNo: cursorPosition.pageNo ?? this.draw.getPageNo()
              }
            : undefined
        },
        timestamp: action.timestamp
      })
    }

    if (this.isComposing) {
      this.compositionInfo = {
        value: text,
        startIndex: curIndex - inputData.length,
        endIndex: curIndex,
        defaultStyle
      }
    }
  }

  private createInputElements(
    text: string,
    copyElement: IElement,
    elementList: IElement[],
    endIndex: number,
    defaultStyle: IRangeElementStyle | null
  ): IElement[] {
    const { TEXT, HYPERLINK, SUBSCRIPT, SUPERSCRIPT, DATE, TAB } = ElementType
    const isDesignMode = this.draw.isDesignMode()

    return splitText(text).map(value => {
      const newElement: IElement = { value }

      if (
        isDesignMode ||
        (!copyElement.title?.disabled && !copyElement.control?.disabled)
      ) {
        const nextElement = elementList[endIndex + 1]

        if (
          !copyElement.type ||
          copyElement.type === TEXT ||
          (copyElement.type === HYPERLINK && nextElement?.type === HYPERLINK) ||
          (copyElement.type === DATE && nextElement?.type === DATE) ||
          (copyElement.type === SUBSCRIPT && nextElement?.type === SUBSCRIPT) ||
          (copyElement.type === SUPERSCRIPT && nextElement?.type === SUPERSCRIPT)
        ) {
          EDITOR_ELEMENT_COPY_ATTR.forEach(attr => {
            if (attr === 'groupIds' && !nextElement?.groupIds) return
            const value = copyElement[attr] as never
            if (value !== undefined) {
              newElement[attr] = value
            }
          })
        }

        if (defaultStyle || copyElement.type === TAB) {
          EDITOR_ELEMENT_STYLE_ATTR.forEach(attr => {
            const value =
              defaultStyle?.[attr as keyof IRangeElementStyle] ||
              copyElement[attr]
            if (value !== undefined) {
              newElement[attr] = value as never
            }
          })
        }

        if (this.isComposing) {
          newElement.underline = true
        }
      }

      return newElement
    })
  }

  private removeComposingInput(): void {
    if (!this.compositionInfo) return

    const { startIndex, endIndex } = this.compositionInfo
    const elementList = this.draw.getElementList()

    if (startIndex >= 0 && endIndex > startIndex && endIndex <= elementList.length) {
      elementList.splice(startIndex + 1, endIndex - startIndex)
    }

    const rangeManager = this.draw.getComponents().range
    rangeManager.setRange(startIndex, startIndex)
    this.draw.getComponents().position.setCursorLogicalIndex(startIndex)
    this.compositionInfo = null
  }
}
