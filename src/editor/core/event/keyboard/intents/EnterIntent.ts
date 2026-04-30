import { ZERO } from '../../../../dataset/constant/Common'
import {
  AREA_CONTEXT_ATTR,
  EDITOR_ELEMENT_STYLE_ATTR,
  EDITOR_ROW_ATTR
} from '../../../../dataset/constant/Element'
import { ControlComponent } from '../../../../dataset/enum/Control'
import { IElement } from '../../../../interface/Element'
import { omitObject } from '../../../../utils'
import { CanvasEvent } from '../../CanvasEvent'
import { insertIntoActiveControl } from '../shared/insertIntoActiveControl'
import { insertWithContext } from '../shared/insertWithContext'

export function runEnterIntent(evt: KeyboardEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  if (draw.isReadonly()) return
  const rangeManager = draw.getRange()
  if (!rangeManager.getIsCanInput()) return
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  const isCollapsed = rangeManager.getIsCollapsed()
  const elementList = draw.getElementList()
  const startElement = elementList[startIndex]
  const endElement = elementList[endIndex]

  if (
    isCollapsed &&
    endElement.listId &&
    endElement.value === ZERO &&
    elementList[endIndex + 1]?.listId !== endElement.listId
  ) {
    draw.getListParticle().unsetList()
    evt.preventDefault()
    return
  }

  let enterText: IElement = {
    value: ZERO
  }
  if (evt.shiftKey && startElement.listId) {
    enterText.listWrap = true
  }
  if (
    evt.shiftKey &&
    endElement.areaId &&
    endElement.areaId !== elementList[endIndex + 1]?.areaId
  ) {
    enterText = omitObject(enterText, AREA_CONTEXT_ATTR)
  }
  if (
    !(
      endElement.titleId &&
      endElement.titleId !== elementList[endIndex + 1]?.titleId
    )
  ) {
    const copyElement = rangeManager.getRangeAnchorStyle(elementList, endIndex)
    if (copyElement) {
      const copyAttr = [...EDITOR_ROW_ATTR]
      if (copyElement.controlComponent !== ControlComponent.POSTFIX) {
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
  let curIndex: number
  const controlInsertIndex = insertIntoActiveControl(control, [enterText])
  if (controlInsertIndex !== null) {
    curIndex = controlInsertIndex
  } else {
    const cursorPosition = draw.getPosition().getCursorPosition()
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
    draw.render({ curIndex })
  }
  evt.preventDefault()
}
