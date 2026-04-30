import { IElement } from '../../../../interface/Element'
import { formatElementContext } from '../../../../utils/element'
import { Draw } from '../../../draw/Draw'

export function formatInsertContext(payload: {
  draw: Draw
  elementList: IElement[]
  insertElementList: IElement[]
  startIndex: number
  isBreakWhenWrap?: boolean
}) {
  const {
    draw,
    elementList,
    insertElementList,
    startIndex,
    isBreakWhenWrap = false
  } = payload
  formatElementContext(elementList, insertElementList, startIndex, {
    isBreakWhenWrap,
    editorOptions: draw.getOptions()
  })
}
