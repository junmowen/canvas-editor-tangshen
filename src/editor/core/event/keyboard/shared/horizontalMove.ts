import { LocationPosition } from '../../../../dataset/enum/Common'
import { getNonHideElementIndex } from '../../../../utils/elementLayout'
import { isMod } from '../../../../utils/hotkey'
import { resolveHiddenControlHorizontalMove } from '../../../modules/control/navigation/resolveHiddenControlHorizontalMove'
import { tryNavigateFormControlBoundary } from '../../../modules/control/navigation/tryNavigateFormControlBoundary'
import { resolveTableHorizontalKeyboardMove } from '../../../modules/table/navigation/resolveTableHorizontalKeyboardMove'
import { CanvasEvent } from '../../CanvasEvent'

/** horizontaldirection，限定移动、遍历或绘制时允许的方向取值。 */
type THorizontalDirection = 'prev' | 'next'

export function runHorizontalMove(
  evt: KeyboardEvent,
  host: CanvasEvent,
  direction: THorizontalDirection
) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  if (draw.isReadonly()) return

  const coordinate = draw.getCoordinate()
  const cursorPosition = coordinate.getCursorPosition()
  if (!cursorPosition) return

  const rangeManager = components.range
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  const isCollapsed = rangeManager.getIsCollapsed()
  const positionContext = coordinate.getPositionContext()
  const positionList = coordinate.getPositionList()
  let elementList = draw.getObjectResolver().getElementList()
  const { index } = cursorPosition

  if (direction === 'prev') {
    if (index <= 0 && !positionContext.isTable) return
  } else if (index > positionList.length - 1 && !positionContext.isTable) {
    return
  }

  if (
    tryNavigateFormControlBoundary({
      draw,
      elementList,
      index,
      direction
    })
  ) {
    return
  }

  let moveCount = 1
  if (isMod(evt)) {
    // 字母字符匹配正则，用于识别词级选择中的普通字符。
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
    const tableNavigation = resolveTableHorizontalKeyboardMove({
      draw,
      direction
    })
    if (tableNavigation) {
      anchorStartIndex = tableNavigation.nextIndex
      anchorEndIndex = anchorStartIndex
      if (tableNavigation.shouldRefreshElementList && tableNavigation.elementList) {
        elementList = tableNavigation.elementList
      }
    }
  }

  if (!~anchorStartIndex || !~anchorEndIndex) return
  if (
    direction === 'next' &&
    (anchorStartIndex > elementList.length - 1 || anchorEndIndex > elementList.length - 1)
  ) {
    return
  }

  const newElementList = draw.getObjectResolver().getElementList()
  const location = direction === 'next' ? LocationPosition.AFTER : undefined
  const hiddenControlMoveIndex = resolveHiddenControlHorizontalMove({
    elementList: newElementList,
    startIndex,
    endIndex,
    direction
  })
  if (hiddenControlMoveIndex !== null) {
    rangeManager.setRange(hiddenControlMoveIndex, hiddenControlMoveIndex)
    coordinate.setPositionContext({
      ...coordinate.getPositionContext()
    })
    components.control.initControl()
    evt.preventDefault()
    return
  } else {
    anchorStartIndex = getNonHideElementIndex(newElementList, anchorStartIndex, location)
    anchorEndIndex = getNonHideElementIndex(newElementList, anchorEndIndex, location)
  }
  rangeManager.setRange(anchorStartIndex, anchorEndIndex)
  coordinate.setPositionContext({
    ...coordinate.getPositionContext()
  })
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
