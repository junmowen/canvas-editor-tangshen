import { ZERO } from '../../../dataset/constant/Common'
import { IElement } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { shouldUseImageOffset } from '../../modules/image/position/ImagePositionPolicy'

export function resolveLineHeightMetrics(payload: {
  element: IElement
  metrics: IRowElement['metrics']
  rowMargin: number
  scale: number
}) {
  const { element, metrics, rowMargin, scale } = payload
  const isImageOffset = shouldUseImageOffset(element)
  const baseAscent = isImageOffset ? metrics.height : metrics.boundingBoxAscent
  const baseContentHeight = isImageOffset
    ? metrics.height
    : metrics.boundingBoxAscent + metrics.boundingBoxDescent
  const contentHeight = resolveLineSpacingContentHeight({
    element,
    baseContentHeight,
    scale
  })
  const extraContentHeight = Math.max(0, contentHeight - baseContentHeight)
  return {
    ascent: rowMargin + baseAscent + extraContentHeight / 2,
    height: rowMargin + contentHeight + rowMargin
  }
}

function resolveLineSpacingContentHeight(payload: {
  element: IElement
  baseContentHeight: number
  scale: number
}) {
  const { element, baseContentHeight, scale } = payload
  const lineSpacing = element.lineSpacing
  if (!lineSpacing || lineSpacing <= 0) return baseContentHeight
  if (element.lineSpacingType === 'exact') {
    return Math.max(baseContentHeight, lineSpacing * scale)
  }
  if (element.lineSpacingType === 'multiple') {
    return Math.max(baseContentHeight, baseContentHeight * lineSpacing)
  }
  return baseContentHeight
}

export function applyParagraphSpacing(rowList: IRow[], scale: number) {
  let paragraphStartIndex = 0
  for (let rowIndex = 0; rowIndex <= rowList.length; rowIndex++) {
    const isEnd = rowIndex === rowList.length
    const isNextParagraph =
      !isEnd &&
      rowIndex > paragraphStartIndex &&
      rowList[rowIndex].elementList[0]?.value === ZERO
    if (!isEnd && !isNextParagraph) continue
    const paragraphRows = rowList.slice(paragraphStartIndex, rowIndex)
    applySingleParagraphSpacing(paragraphRows, scale)
    paragraphStartIndex = rowIndex
  }
}

function applySingleParagraphSpacing(paragraphRows: IRow[], scale: number) {
  if (!paragraphRows.length) return
  const paragraphElement = getFirstVisibleParagraphElement(paragraphRows)
  if (!paragraphElement) return
  const spaceBefore = Math.max(0, paragraphElement.spaceBefore || 0) * scale
  const spaceAfter = Math.max(0, paragraphElement.spaceAfter || 0) * scale
  if (spaceBefore) {
    const firstRow = paragraphRows[0]
    firstRow.offsetY = (firstRow.offsetY || 0) + spaceBefore
  }
  if (spaceAfter) {
    const lastRow = paragraphRows[paragraphRows.length - 1]
    lastRow.height += spaceAfter
  }
}

function getFirstVisibleParagraphElement(paragraphRows: IRow[]) {
  for (const row of paragraphRows) {
    const element = row.elementList.find(rowElement => rowElement.value !== ZERO)
    if (element) return element
  }
  return null
}
