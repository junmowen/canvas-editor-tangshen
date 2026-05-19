import { ZERO } from '../../../../dataset/constant/Common'
import { EditorMode, EditorZone } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import { IElement, IElementPosition } from '../../../../interface/Element'
import { IRow } from '../../../../interface/Row'
import type { Draw } from '../../../draw/Draw'

export interface IRowDragHandleBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface IResolvedRowDragHandle {
  bounds: IRowDragHandleBounds
  row: IRow
  startIndex: number
  endIndex: number
  cursorIndex: number
}

const HANDLE_WIDTH = 14
const HANDLE_HEIGHT = 22
const HANDLE_GAP = 4
const HANDLE_RADIUS = 4
const DOT_RADIUS = 1
const DOT_GAP_X = 4.5
const DOT_GAP_Y = 5
const HANDLE_FILL = '#F3F4F6'
const HANDLE_STROKE = '#D1D5DB'
const DOT_FILL = '#6B7280'

function getRowVisualBounds(
  row: IRow,
  rowPositionList: IElementPosition[]
) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let i = 0; i < rowPositionList.length; i++) {
    const position = rowPositionList[i]
    if (!position) continue
    minX = Math.min(minX, position.coordinate.leftTop[0] - (position.left || 0))
    minY = Math.min(minY, position.coordinate.leftTop[1])
    maxY = Math.max(maxY, position.coordinate.leftTop[1] + row.height)
  }
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return null
  }
  return {
    x: row.isList && row.offsetX ? minX - row.offsetX : minX,
    y: minY,
    height: maxY - minY
  }
}

export function getIsTitleRow(payload: {
  elementList: IElement[]
  rowPositionList: IElementPosition[]
  row?: IRow
}) {
  const { elementList, rowPositionList, row } = payload
  return (
    row?.elementList.some(element => getIsTitleElement(element)) ||
    rowPositionList.some(position => {
      const element = elementList[position.index]
      return getIsTitleElement(element)
    })
  )
}

export function getIsTitleElement(element?: IElement | null) {
  return !!element?.titleId || element?.type === ElementType.TITLE
}

export function getRowDragHandleBounds(payload: {
  row: IRow
  rowPositionList: IElementPosition[]
  scale: number
}): IRowDragHandleBounds | null {
  const { row, rowPositionList, scale } = payload
  const rowBounds = getRowVisualBounds(row, rowPositionList)
  if (!rowBounds) return null
  const width = HANDLE_WIDTH * scale
  const height = Math.min(HANDLE_HEIGHT * scale, Math.max(rowBounds.height, 12 * scale))
  return {
    x: rowBounds.x - HANDLE_GAP * scale - width,
    y: rowBounds.y + (rowBounds.height - height) / 2,
    width,
    height
  }
}

function shouldEnableRowDragHandle(payload: {
  draw: Draw
  row: IRow
  rowPositionList: IElementPosition[]
  tableCellContext?: IDrawRowPayload['tableCellContext']
}) {
  const { draw, row, rowPositionList, tableCellContext } = payload
  if (tableCellContext) return false
  if (draw.isReadonly() || draw.isDisabled()) return false
  const mode = draw.getMode()
  if (mode === EditorMode.CLEAN || mode === EditorMode.PRINT) return false
  if (!row.elementList.length || !rowPositionList.length) return false
  const elementList = draw.getLayoutMainElementList()
  if (getIsTitleRow({ elementList, rowPositionList, row })) {
    return false
  }
  if (row.startIndex > 0) {
    const preElement = elementList[row.startIndex - 1]
    const startElement = row.elementList[0]
    if (
      !(
        startElement.value === ZERO ||
        (preElement?.value === ZERO && !preElement.listWrap) ||
        startElement.listId !== preElement?.listId ||
        startElement.titleId !== preElement?.titleId
      )
    ) {
      return false
    }
  }
  if (row.elementList.some(element => element.type === ElementType.TABLE)) {
    return false
  }
  return true
}

export function resolveRowDragParagraphRange(payload: {
  elementList: IElement[]
  rowPositionList: IElementPosition[]
}) {
  const { elementList, rowPositionList } = payload
  const firstContentPosition =
    rowPositionList.find(position => {
      const element = elementList[position.index]
      return element && element.value !== ZERO
    }) || rowPositionList[0]
  if (!firstContentPosition) return null
  const paragraphRange = resolveParagraphRange(
    elementList,
    firstContentPosition.index
  )
  if (!paragraphRange) return null
  return {
    ...paragraphRange,
    cursorIndex: firstContentPosition.index,
    firstContentIndex: firstContentPosition.index
  }
}

function isParagraphFirstVisualRow(payload: {
  rowPositionList: IElementPosition[]
  paragraphRange: {
    startIndex: number
    endIndex: number
    firstContentIndex: number
  }
}) {
  const { rowPositionList, paragraphRange } = payload
  return rowPositionList.some(
    position => position.index === paragraphRange.firstContentIndex
  )
}

export function isRowDragHandleVisible(payload: {
  draw: Draw
  rowPositionList: IElementPosition[]
  zone?: EditorZone
}) {
  const { draw, rowPositionList, zone = EditorZone.MAIN } = payload
  const range = draw.getRange().getEditBoundaryRange()
  if (range.isCrossRowCol) {
    return false
  }
  if (range.zone && range.zone !== zone) {
    return false
  }
  const elementList = draw.getLayoutMainElementList()
  const rowParagraphRange = resolveRowDragParagraphRange({
    elementList,
    rowPositionList
  })
  if (!rowParagraphRange) return false
  if (
    !isParagraphFirstVisualRow({
      rowPositionList,
      paragraphRange: rowParagraphRange
    })
  ) {
    return false
  }
  if (range.startIndex === range.endIndex) {
    return (
      rowParagraphRange.startIndex <= range.startIndex &&
      range.startIndex <= rowParagraphRange.endIndex
    )
  }
  const startIndex = Math.min(range.startIndex, range.endIndex) + 1
  const endIndex = Math.max(range.startIndex, range.endIndex)
  return rowPositionList.some(position => {
    const index = position?.index
    return index !== undefined && startIndex <= index && index <= endIndex
  })
}

function resolveParagraphRange(elementList: IElement[], cursorIndex: number) {
  if (!elementList[cursorIndex]) return null
  let contentStartIndex = cursorIndex
  while (contentStartIndex > 0) {
    const element = elementList[contentStartIndex]
    const preElement = elementList[contentStartIndex - 1]
    if (
      (element.value === ZERO && !element.listWrap) ||
      element.listId !== preElement?.listId ||
      element.titleId !== preElement?.titleId
    ) {
      break
    }
    contentStartIndex--
  }
  let endIndex = cursorIndex
  while (endIndex < elementList.length - 1) {
    const element = elementList[endIndex]
    const nextElement = elementList[endIndex + 1]
    if (
      (element.value === ZERO && !element.listWrap) ||
      element.listId !== nextElement?.listId ||
      element.titleId !== nextElement?.titleId
    ) {
      break
    }
    endIndex++
  }
  if (elementList[endIndex]?.value === ZERO && endIndex > contentStartIndex) {
    endIndex--
  }
  const startIndex = Math.max(0, contentStartIndex - 1)
  if (startIndex > endIndex) return null
  return {
    startIndex,
    endIndex
  }
}

export function resolveRowDragHandleAtPoint(payload: {
  draw: Draw
  x: number
  y: number
  pageNo: number
}): IResolvedRowDragHandle | null {
  const { draw, x, y, pageNo } = payload
  const rowList = draw.getPageRowList()[pageNo] || []
  const positionList = draw.getPosition().getLayoutMainPositionListByPage(pageNo)
  const elementList = draw.getLayoutMainElementList()
  const { scale } = draw.getOptions()
  let rowPositionOffset = 0
  for (let i = 0; i < rowList.length; i++) {
    const row = rowList[i]
    const rowPositionList = positionList.slice(
      rowPositionOffset,
      rowPositionOffset + row.elementList.length
    )
    rowPositionOffset += row.elementList.length
    if (!shouldEnableRowDragHandle({ draw, row, rowPositionList })) continue
    if (!isRowDragHandleVisible({ draw, rowPositionList })) continue
    const bounds = getRowDragHandleBounds({ row, rowPositionList, scale })
    if (!bounds) continue
    if (
      x < bounds.x ||
      x > bounds.x + bounds.width ||
      y < bounds.y ||
      y > bounds.y + bounds.height
    ) {
      continue
    }
    const paragraphRange = resolveRowDragParagraphRange({
      elementList,
      rowPositionList
    })
    if (!paragraphRange) continue
    if (
      !isParagraphFirstVisualRow({
        rowPositionList,
        paragraphRange
      })
    ) {
      continue
    }
    return {
      bounds,
      row,
      cursorIndex: paragraphRange.cursorIndex,
      startIndex: paragraphRange.startIndex,
      endIndex: paragraphRange.endIndex
    }
  }
  return null
}

export function renderRowDragHandle(payload: {
  ctx: CanvasRenderingContext2D
  draw: Draw
  row: IRow
  rowPositionList: IElementPosition[]
  zone?: EditorZone
  tableCellContext?: IDrawRowPayload['tableCellContext']
}) {
  const { ctx, draw, row, rowPositionList, zone, tableCellContext } = payload
  if (!shouldEnableRowDragHandle({ draw, row, rowPositionList, tableCellContext })) {
    return
  }
  if (!isRowDragHandleVisible({ draw, rowPositionList, zone })) {
    return
  }
  const { scale } = draw.getOptions()
  const bounds = getRowDragHandleBounds({ row, rowPositionList, scale })
  if (!bounds) return
  const radius = HANDLE_RADIUS * scale
  ctx.save()
  ctx.fillStyle = HANDLE_FILL
  ctx.strokeStyle = HANDLE_STROKE
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(bounds.x + radius, bounds.y)
  ctx.lineTo(bounds.x + bounds.width - radius, bounds.y)
  ctx.quadraticCurveTo(
    bounds.x + bounds.width,
    bounds.y,
    bounds.x + bounds.width,
    bounds.y + radius
  )
  ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - radius)
  ctx.quadraticCurveTo(
    bounds.x + bounds.width,
    bounds.y + bounds.height,
    bounds.x + bounds.width - radius,
    bounds.y + bounds.height
  )
  ctx.lineTo(bounds.x + radius, bounds.y + bounds.height)
  ctx.quadraticCurveTo(
    bounds.x,
    bounds.y + bounds.height,
    bounds.x,
    bounds.y + bounds.height - radius
  )
  ctx.lineTo(bounds.x, bounds.y + radius)
  ctx.quadraticCurveTo(bounds.x, bounds.y, bounds.x + radius, bounds.y)
  ctx.fill()
  ctx.stroke()

  const dotRadius = DOT_RADIUS * scale
  const dotGapX = DOT_GAP_X * scale
  const dotGapY = DOT_GAP_Y * scale
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  ctx.fillStyle = DOT_FILL
  for (let column = 0; column < 2; column++) {
    for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
      ctx.beginPath()
      ctx.arc(
        centerX + (column - 0.5) * dotGapX,
        centerY + (rowIndex - 1) * dotGapY,
        dotRadius,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }
  ctx.restore()
}
