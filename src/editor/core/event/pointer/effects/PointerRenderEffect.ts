import { Draw } from '../../../draw/Draw'

export function renderSelectionStart(payload: {
  draw: Draw
  curIndex: number
  isSetCursor: boolean
  preserveCurrentCursor?: boolean
}) {
  const { draw, curIndex, isSetCursor, preserveCurrentCursor = false } = payload
  draw.render({
    curIndex,
    isCompute: false,
    isSubmitHistory: false,
    isSetCursor: preserveCurrentCursor ? false : isSetCursor,
    pageRenderScope: 'visible'
  })
  if (preserveCurrentCursor) {
    draw.getCursor().drawCursor()
  }
}

export function renderSelectionDrag(payload: {
  draw: Draw
  isCrossRowColSelection: boolean
}) {
  const { draw, isCrossRowColSelection } = payload
  if (isCrossRowColSelection) {
    draw.render({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  } else {
    draw.scheduleFrameRender({
      isSubmitHistory: false,
      isSetCursor: false,
      isCompute: false,
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }
}

export function renderSelectionRange(payload: {
  draw: Draw
  startIndex: number
  endIndex: number
  tableId?: string
}) {
  const { draw, startIndex, endIndex, tableId } = payload
  const rangeManager = draw.getComponents().range
  rangeManager.setRange(startIndex, endIndex, tableId)
  rangeManager.setRangeStyle()
  draw.render({
    isSubmitHistory: false,
    isSetCursor: false,
    isCompute: false,
    isLazy: false,
    pageRenderScope: 'visible'
  })
}

export function renderDragCommitRollback(payload: {
  draw: Draw
  isCompute: boolean
  isSubmitHistory: boolean
}) {
  const { draw, isCompute, isSubmitHistory } = payload
  draw.render({
    isCompute,
    isSubmitHistory,
    isSetCursor: false,
    pageRenderScope: isCompute ? undefined : 'visible'
  })
}

export function renderDragCommitBlocked(payload: { draw: Draw; curIndex: number }) {
  const { draw, curIndex } = payload
  draw.render({
    curIndex,
    isCompute: false,
    isSubmitHistory: false,
    pageRenderScope: 'visible'
  })
}

export function renderDragCommitFailed(payload: { draw: Draw }) {
  payload.draw.render({
    isSetCursor: false
  })
}

export function renderDragCommitApplied(payload: { draw: Draw }) {
  payload.draw.render({
    isSetCursor: false
  })
}
