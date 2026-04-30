import { LocationPosition } from '../../../../dataset/enum/Common'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { EditorMode } from '../../../../dataset/enum/Editor'
import { MoveDirection } from '../../../../dataset/enum/Observer'
import { getNonHideElementIndex } from '../../../../utils/element'
import { isMod } from '../../../../utils/hotkey'
import { CanvasEvent } from '../../CanvasEvent'
import { applyTableToolState } from './applyTableToolState'

type THorizontalDirection = 'prev' | 'next'

export function runHorizontalMove(
  evt: KeyboardEvent,
  host: CanvasEvent,
  direction: THorizontalDirection
) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  if (draw.isReadonly()) return

  const tableNavigationService = components.tableNavigationService
  const position = components.position
  const cursorPosition = position.getCursorPosition()
  if (!cursorPosition) return

  const rangeManager = components.range
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  const isCollapsed = rangeManager.getIsCollapsed()
  const positionContext = position.getPositionContext()
  const positionList = position.getPositionList()
  let elementList = draw.getElementList()
  const { index } = cursorPosition

  if (direction === 'prev') {
    if (index <= 0 && !positionContext.isTable) return
  } else if (index > positionList.length - 1 && !positionContext.isTable) {
    return
  }

  const control = components.control
  if (
    draw.getMode() === EditorMode.FORM &&
    control.getActiveControl() &&
    ((direction === 'prev' &&
      (elementList[index]?.controlComponent === ControlComponent.PREFIX ||
        elementList[index]?.controlComponent === ControlComponent.PRE_TEXT)) ||
      (direction === 'next' &&
        (elementList[index + 1]?.controlComponent === ControlComponent.POSTFIX ||
          elementList[index + 1]?.controlComponent === ControlComponent.POST_TEXT)))
  ) {
    control.initNextControl({
      direction: direction === 'prev' ? MoveDirection.UP : MoveDirection.DOWN
    })
    return
  }

  let moveCount = 1
  if (isMod(evt)) {
    const LETTER_REG = draw.getLetterReg()
    const moveStartIndex =
      evt.shiftKey && !isCollapsed && startIndex === cursorPosition.index
        ? endIndex
        : startIndex
    const testIndex = direction === 'prev' ? moveStartIndex : moveStartIndex + 1
    if (LETTER_REG.test(elementList[testIndex]?.value)) {
      let i = direction === 'prev' ? moveStartIndex - 1 : moveStartIndex + 2
      while (direction === 'prev' ? i > 0 : i < elementList.length) {
        const element = elementList[i]
        if (!LETTER_REG.test(element.value)) {
          break
        }
        moveCount++
        direction === 'prev' ? i-- : i++
      }
    }
  }

  const curIndex =
    direction === 'prev' ? startIndex - moveCount : endIndex + moveCount
  let anchorStartIndex = curIndex
  let anchorEndIndex = curIndex
  if (evt.shiftKey) {
    if (startIndex !== endIndex) {
      if (startIndex === cursorPosition.index) {
        anchorStartIndex = startIndex
        anchorEndIndex =
          direction === 'prev' ? endIndex - moveCount : curIndex
      } else {
        anchorStartIndex =
          direction === 'prev' ? curIndex : startIndex + moveCount
        anchorEndIndex = endIndex
      }
    } else if (direction === 'prev') {
      anchorEndIndex = endIndex
    } else {
      anchorStartIndex = startIndex
    }
  }

  if (!evt.shiftKey) {
    const navigationResult =
      tableNavigationService.resolveHorizontalBoundaryNavigation({
        positionContext,
        range: rangeManager.getEditBoundaryRange(),
        direction
      })
    if (navigationResult?.nextPositionContext) {
      position.setPositionContext(navigationResult.nextPositionContext)
      anchorStartIndex = navigationResult.nextIndex
      anchorEndIndex = anchorStartIndex
      if (navigationResult.disposeTableTool && direction === 'next') {
        elementList = draw.getElementList()
      }
      applyTableToolState(draw, !!navigationResult.disposeTableTool)
    }
  }

  if (!~anchorStartIndex || !~anchorEndIndex) return
  if (
    direction === 'next' &&
    (anchorStartIndex > elementList.length - 1 || anchorEndIndex > elementList.length - 1)
  ) {
    return
  }

  const newElementList = draw.getElementList()
  const location = direction === 'next' ? LocationPosition.AFTER : undefined
  anchorStartIndex = getNonHideElementIndex(newElementList, anchorStartIndex, location)
  anchorEndIndex = getNonHideElementIndex(newElementList, anchorEndIndex, location)
  rangeManager.setRange(anchorStartIndex, anchorEndIndex)
  const isAnchorCollapsed = anchorStartIndex === anchorEndIndex
  draw.render({
    curIndex: isAnchorCollapsed ? anchorStartIndex : undefined,
    isSetCursor: isAnchorCollapsed,
    isSubmitHistory: false,
    isCompute: false,
    pageRenderScope: 'visible'
  })
  evt.preventDefault()
}
