import { ZERO } from '../../../../dataset/constant/Common'
import {
  EDITOR_ELEMENT_STYLE_ATTR,
  EDITOR_ROW_ATTR
} from '../../../../dataset/constant/Element'
import { IElement } from '../../../../interface/Element'
import { insertIntoActiveControl } from '../../../modules/control/interaction/insertIntoActiveControl'
import { shouldCopyStyleForEnterAnchor } from '../../../modules/control/policy/ControlEnterPolicy'
import {
  applyListWrapForShiftEnter,
  tryUnsetEmptyListOnEnter
} from '../../../modules/list/interaction/ListKeyboardInteraction'
import { normalizeAreaContextForEnter } from '../../../modules/area/interaction/AreaEnterPolicy'
import { shouldCopyEnterAnchorAcrossTitleBoundary } from '../../../modules/title/interaction/TitleEnterPolicy'
import { CanvasEvent } from '../../CanvasEvent'
import { tryRecoverPreventedControlEnter } from '../policy/EnterControlRecoveryPolicy'
import { insertWithContext } from '../shared/insertWithContext'

export function runEnterIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly()) return
  const rangeManager = draw.getRange()
  if (!rangeManager.getIsCanInput()) return
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  const isCollapsed = rangeManager.getIsCollapsed()
  const elementList = draw.getObjectResolver().getElementList()
  const startElement = elementList[startIndex]
  const endElement = elementList[endIndex]

  if (tryUnsetEmptyListOnEnter({
    draw,
    isCollapsed,
    endElement,
    nextElement: elementList[endIndex + 1]
  })) {
    evt.preventDefault()
    return
  }

  let enterText: IElement = {
    value: ZERO
  }
  applyListWrapForShiftEnter({
    enterText,
    isShiftKey: evt.shiftKey,
    startElement
  })
  enterText = normalizeAreaContextForEnter({
    enterText,
    isShiftKey: evt.shiftKey,
    endElement,
    nextElement: elementList[endIndex + 1]
  })
  if (shouldCopyEnterAnchorAcrossTitleBoundary({
    endElement,
    nextElement: elementList[endIndex + 1]
  })) {
    const copyElement = rangeManager.getRangeAnchorStyle(elementList, endIndex)
    if (copyElement) {
      // 初始化 copy Attr 列表。
      const copyAttr = [...EDITOR_ROW_ATTR]
      if (shouldCopyStyleForEnterAnchor(copyElement)) {
        copyAttr.push(...EDITOR_ELEMENT_STYLE_ATTR)
      }
      copyAttr.forEach(attr => {
        const value = copyElement[attr] as never
        if (value !== undefined) {
          enterText[attr] = value
        }
      })
    }
  }

  const control = draw.getControl()
  if (tryRecoverPreventedControlEnter({ draw, control, endIndex })) {
    evt.preventDefault()
    return
  }
  let curIndex: number
  const controlInsertIndex = insertIntoActiveControl(control, [enterText])
  if (controlInsertIndex !== null) {
    curIndex = controlInsertIndex
  } else {
    const cursorPosition = draw.getCoordinate().getCursorPosition()
    const cursorIndex = cursorPosition?.index ?? endIndex
    curIndex = insertWithContext({
      draw,
      elementList,
      insertElementList: [enterText],
      startIndex,
      endIndex,
      isCollapsed,
      cursorIndex,
      isBreakWhenWrap: true
    })
  }
  if (~curIndex) {
    rangeManager.setRange(curIndex, curIndex)
    // 回车后的实际坐标由立即布局刷新，这里先同步逻辑索引给连续键盘操作。
    draw.getCoordinate().setCursorLogicalIndex(curIndex)
    draw.render({
      curIndex,
      isTyping: true,
      // 回车会改变段落结构和输入代理位置，需要立即排版以保证后续连续输入可用。
      isImmediateTypingCompute: true,
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }
  evt.preventDefault()
}
