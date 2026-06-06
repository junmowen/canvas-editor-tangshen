import { findParent } from '../../../../utils'
import { CanvasEvent } from '../../CanvasEvent'

export function shouldResolveDragoverPointer(
  evt: DragEvent | MouseEvent,
  host: CanvasEvent
): boolean {
  const draw = host.getDraw()
  if (draw.isReadonly()) return false
  evt.preventDefault()
  const pageContainer = draw.getPageCanvasHost().getPageContainer()
  return Boolean(
    findParent(
      evt.target as Element,
      (node: Element) => node === pageContainer,
      true
    )
  )
}
