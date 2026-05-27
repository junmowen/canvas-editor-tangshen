import { ImageDisplay } from '../../../../../dataset/enum/Common'
import { EditorMode } from '../../../../../dataset/enum/Editor'
import { ElementType } from '../../../../../dataset/enum/Element'
import { IPreviewerDrawOption } from '../../../../../interface/Previewer'
import { CanvasEvent } from '../../../CanvasEvent'
import { captureDragSnapshot } from '../drag-drop/CaptureDragSnapshotIntent'
import {
  applyCheckboxToggle,
  applyRadioToggle,
  applyValueLinkedControlToggle
} from '../controls/ControlToggleIntent'
import {
  applyDateEffect,
  applyHyperlinkEffect,
  clearDateEffect,
  clearHyperlinkEffect,
  emitImageMousedownEffect
} from '../../effects/PointerAuxiliaryEffect'
import {
  clearPreviewerResizer,
  hideCursorForPreviewer,
  showImageResizer
} from '../../effects/PreviewerEffect'
import {
  renderSelectionStart
} from '../../effects/PointerRenderEffect'
import {
  disposeTableTool,
  renderTableToolIfNeeded
} from '../../effects/TableToolEffect'
import { resolvePositionAtIndex } from '../../../utils/resolvePositionAtIndex'

function resolveDisabledControlCursorIndex(
  elementList: any[],
  targetElementIndex: number
) {
  const targetElement = elementList[targetElementIndex]
  const controlId = targetElement?.controlId
  if (!controlId) return targetElementIndex

  let controlStartIndex = targetElementIndex
  while (
    controlStartIndex > 0 &&
    elementList[controlStartIndex - 1]?.controlId === controlId
  ) {
    controlStartIndex--
  }

  let controlEndIndex = targetElementIndex
  while (
    controlEndIndex + 1 < elementList.length &&
    elementList[controlEndIndex + 1]?.controlId === controlId
  ) {
    controlEndIndex++
  }

  if (controlStartIndex > 0) {
    return controlStartIndex - 1
  }
  if (controlEndIndex + 1 < elementList.length) {
    return controlEndIndex + 1
  }
  return targetElementIndex
}

export function runSelectionStartIntent(payload: {
  host: CanvasEvent
  evt: MouseEvent
  oldPositionContextTdId?: string
  isReadonly: boolean
  positionResult: any
}) {
  const { host, evt, oldPositionContextTdId, isReadonly, positionResult } = payload
  const draw = host.getDraw()
  const components = draw.getComponents()
  const coordinate = draw.getCoordinate()
  const rangeManager = components.range
  const { index, isDirectHit, isCheckbox, isRadio, isImage, isTable, tdValueIndex } =
    positionResult
  const elementList = draw.getObjectResolver().getElementList()
  const curIndex = isTable ? tdValueIndex! : index
  const targetElementIndex = isTable
    ? tdValueIndex!
    : (positionResult.hitTargetIndex ?? index)
  const targetPosition = resolvePositionAtIndex(draw, targetElementIndex)
  const curElement = elementList[targetElementIndex]
  const isDirectHitImage = !!(isDirectHit && isImage)
  const isDirectHitCheckbox = !!(isDirectHit && isCheckbox)
  const isDirectHitRadio = !!(isDirectHit && isRadio)
  const isDisabledControl = !!curElement?.control?.disabled
  const resolvedCursorIndex = isDisabledControl
    ? resolveDisabledControlCursorIndex(elementList, targetElementIndex)
    : curIndex
  const canToggleFormControl =
    draw.getMode() === EditorMode.FORM &&
    (isDirectHitCheckbox || isDirectHitRadio)

  if (~resolvedCursorIndex) {
    let startIndex = resolvedCursorIndex
    let endIndex = resolvedCursorIndex
    if (evt.shiftKey) {
      const { startIndex: oldStartIndex } = rangeManager.getEditBoundaryRange()
      if (~oldStartIndex) {
        const newPositionContext = coordinate.getPositionContext()
        if (newPositionContext.tdId === oldPositionContextTdId) {
          if (curIndex > oldStartIndex) {
            startIndex = oldStartIndex
          } else {
            endIndex = oldStartIndex
          }
        }
      }
    }

    rangeManager.setRange(startIndex, endIndex)
    // 点击当前视觉行左侧空白时，命中边界可能仍是上一逻辑边界，
    // 但光标必须画在“当前行最前面”的显式位置。
    const nextCursorPosition =
      isDisabledControl
        ? resolvePositionAtIndex(draw, resolvedCursorIndex)
        : positionResult.cursorPosition || resolvePositionAtIndex(draw, curIndex)
    coordinate.setCursorPosition(nextCursorPosition)

    if (isDirectHitCheckbox && (!isReadonly || canToggleFormControl)) {
      if (draw.getMode() === EditorMode.FORM) {
        draw.render({
          curIndex,
          isSetCursor: false,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
      }
      applyCheckboxToggle({ draw, element: curElement })
    } else if (isDirectHitRadio && (!isReadonly || canToggleFormControl)) {
      if (draw.getMode() === EditorMode.FORM) {
        draw.render({
          curIndex,
          isSetCursor: false,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
      }
      applyRadioToggle({ draw, element: curElement })
    } else {
      const isHandledLinkedControl = applyValueLinkedControlToggle({
        draw,
        elementList,
        curIndex: targetElementIndex
      })
      if (!isHandledLinkedControl) {
        renderSelectionStart({
          draw,
          curIndex: resolvedCursorIndex,
          isSetCursor: !isDirectHitImage && !isDirectHitCheckbox && !isDirectHitRadio,
          preserveCurrentCursor:
            !!positionResult.cursorPosition && !isDisabledControl
        })
      }
    }
  }

  clearPreviewerResizer(draw)
  if (isDirectHitImage) {
    const previewerDrawOption: IPreviewerDrawOption = {
      dragDisable:
        isReadonly || (!curElement.controlId && draw.getMode() === EditorMode.FORM)
    }
    if (curElement.type === ElementType.LATEX) {
      previewerDrawOption.mime = 'svg'
      previewerDrawOption.srcKey = 'laTexSVG'
    }
    showImageResizer({
      draw,
      element: curElement,
      position: targetPosition,
      options: previewerDrawOption
    })
    hideCursorForPreviewer(draw)
    captureDragSnapshot(host)
    if (
      curElement.imgDisplay === ImageDisplay.SURROUND ||
      curElement.imgDisplay === ImageDisplay.FLOAT_TOP ||
      curElement.imgDisplay === ImageDisplay.FLOAT_BOTTOM
    ) {
      components.imageParticle.createFloatImage(curElement)
    }
    emitImageMousedownEffect({ draw, evt, element: curElement })
  }

  disposeTableTool(draw)
  renderTableToolIfNeeded({ draw, isTable, isReadonly })

  clearHyperlinkEffect(draw)
  applyHyperlinkEffect({
    draw,
    evt,
    element: curElement,
    position: targetPosition!
  })

  clearDateEffect(draw)
  applyDateEffect({
    draw,
    element: curElement,
    position: targetPosition!,
    isReadonly
  })
}
