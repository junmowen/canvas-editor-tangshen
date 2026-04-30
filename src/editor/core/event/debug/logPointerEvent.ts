import { ICurrentPosition } from '../../../interface/Position'
import { Draw } from '../../draw/Draw'
import { CanvasEvent } from '../CanvasEvent'

export type TPointerDebugEvent = MouseEvent | WheelEvent | DragEvent

declare global {
  interface Window {
    __canvasEditorPointerDebugLogs?: Array<ReturnType<typeof resolvePointerDebugPayload>>
  }
}

interface ILoggedPointerObject {
  kind: 'table' | 'image' | 'checkbox' | 'radio' | 'control' | 'text' | 'unknown'
  position: ICurrentPosition | null
}

function getPointerObject(position: ICurrentPosition | null): ILoggedPointerObject {
  if (!position) {
    return {
      kind: 'unknown',
      position: null
    }
  }
  if (position.isTable) return { kind: 'table', position }
  if (position.isImage) return { kind: 'image', position }
  if (position.isCheckbox) return { kind: 'checkbox', position }
  if (position.isRadio) return { kind: 'radio', position }
  if (position.isControl) return { kind: 'control', position }
  return { kind: 'text', position }
}

function resolvePointerDebugPayload(
  name: string,
  draw: Draw,
  evt: TPointerDebugEvent,
  host: CanvasEvent
) {
  const coordinates = draw.getPointerCoordinates(evt)
  const session = host.getPointerSession()
  const pagePoint = coordinates.page
  const pageNo = pagePoint?.pageNo
  const hitTestResult =
    pagePoint && pageNo !== undefined
      ? draw.getTableHitTestService().resolve({
          x: pagePoint.x,
          y: pagePoint.y,
          pageNo,
          pagePoint,
          startPosition: null
        })
      : {
          positionResult: null,
          boundary: null
        }

  return {
    name,
    type: evt.type,
    button: 'button' in evt ? evt.button : undefined,
    buttons: 'buttons' in evt ? evt.buttons : undefined,
    clientX: evt.clientX,
    clientY: evt.clientY,
    pageX: evt.pageX,
    pageY: evt.pageY,
    viewport: coordinates.viewport,
    container: coordinates.container,
    pagePoint,
    object: getPointerObject(hitTestResult.positionResult),
    boundary: hitTestResult.boundary,
    selectionState: {
      mouseDownStartPosition: session.mouseDownStartPosition,
      range: draw.getRange().getRange()
    }
  }
}

export function logPointerEvent(
  name: string,
  evt: TPointerDebugEvent,
  host: CanvasEvent
) {
  const draw = host.getDraw()
  const payload = JSON.parse(
    JSON.stringify(resolvePointerDebugPayload(name, draw, evt, host))
  )
  window.__canvasEditorPointerDebugLogs ||= []
  window.__canvasEditorPointerDebugLogs.push(payload)
  // eslint-disable-next-line no-console
  // console.log(`[pointer-debug:${name}]`, JSON.stringify(payload))
}
