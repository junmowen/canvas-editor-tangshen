import { ZERO } from '../../dataset/constant/Common'
import { EditorZone } from '../../dataset/enum/Editor'
import { IElement, IElementPosition } from '../../interface/Element'
import { ICurrentPosition } from '../../interface/Position'
import { isElementInControl } from '../modules/control/hittest/ControlHitTest'
import {
  resolveListCheckboxHeadHit,
  resolveListCheckboxHeadStartX
} from '../modules/list/hittest/ListCheckboxHitTestPolicy'
import { createCollapsedLeftCursorPosition } from './utils/resolvePointerBoundaryAtPosition'

/** 页面行 band 类型，用于位置命中策略间共享行范围。 */
export type TPageRowBand = {
  rowNo: number
  top: number
  bottom: number
  left: number
  right: number
  start: number
  end: number
}

export interface IRowBandRange {
  left: number
  right: number
}

export function resolveBestPageRowBandByPointer(payload: {
  x: number
  y: number
  pageRowBands: TPageRowBand[]
  resolveRowBandRange: (rowBand: TPageRowBand) => IRowBandRange
}) {
  const { x, y, pageRowBands, resolveRowBandRange } = payload
  const sortedPageRowBands = [...pageRowBands].sort((pre, cur) => {
    if (pre.top !== cur.top) return pre.top - cur.top
    if (pre.bottom !== cur.bottom) return pre.bottom - cur.bottom
    return resolveRowBandRange(pre).left - resolveRowBandRange(cur).left
  })
  let activeRowBand: TPageRowBand | null = null
  let left = 0
  let right = sortedPageRowBands.length - 1
  let activeRowBandIndex = -1
  while (left <= right) {
    const middle = Math.floor((left + right) / 2)
    const rowBand = sortedPageRowBands[middle]
    if (y < rowBand.top) {
      right = middle - 1
    } else if (y > rowBand.bottom) {
      left = middle + 1
    } else {
      activeRowBand = rowBand
      activeRowBandIndex = middle
      break
    }
  }
  if (activeRowBandIndex < 0) return activeRowBand

  const candidateBands: TPageRowBand[] = [sortedPageRowBands[activeRowBandIndex]]
  for (let i = activeRowBandIndex - 1; i >= 0; i--) {
    const rowBand = sortedPageRowBands[i]
    if (rowBand.bottom < y) break
    if (rowBand.top <= y && y <= rowBand.bottom) {
      candidateBands.unshift(rowBand)
    }
  }
  for (let i = activeRowBandIndex + 1; i < sortedPageRowBands.length; i++) {
    const rowBand = sortedPageRowBands[i]
    if (rowBand.top > y) break
    if (rowBand.top <= y && y <= rowBand.bottom) {
      candidateBands.push(rowBand)
    }
  }

  let bestRowBand: TPageRowBand | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (const rowBand of candidateBands) {
    const { left: rowLeft, right: rowRight } = resolveRowBandRange(rowBand)
    const distance = x < rowLeft ? rowLeft - x : x > rowRight ? x - rowRight : 0
    if (distance < bestDistance) {
      bestDistance = distance
      bestRowBand = rowBand
    }
  }
  return bestRowBand
}

export function resolveHeaderFooterZoneHit(payload: {
  y: number
  isMainActive: boolean
  headerBottomY: number
  footerTopY: number
}) {
  const { y, isMainActive, headerBottomY, footerTopY } = payload
  if (isMainActive) {
    if (y < headerBottomY) {
      return {
        index: -1,
        zone: EditorZone.HEADER
      }
    }
    if (y > footerTopY) {
      return {
        index: -1,
        zone: EditorZone.FOOTER
      }
    }
  } else if (y <= footerTopY && y >= headerBottomY) {
    return {
      index: -1,
      zone: EditorZone.MAIN
    }
  }
  return null
}

function resolveBoundaryRowPosition(payload: {
  x: number
  leftMargin: number
  rowBand: TPageRowBand | null
  positionList: IElementPosition[]
}) {
  const { x, leftMargin, rowBand, positionList } = payload
  if (!rowBand) return null
  for (let cursor = rowBand.start; cursor <= rowBand.end; cursor++) {
    const position = positionList[cursor]
    if (!position) continue
    const { leftTop, rightTop } = position.coordinate
    if (
      x <= leftMargin ||
      (x >= leftTop[0] && x <= rightTop[0]) ||
      cursor === rowBand.end
    ) {
      return position
    }
  }
  return null
}

export function resolvePageBoundaryHitIndex(payload: {
  x: number
  y: number
  margins: number[]
  pageRowBands: TPageRowBand[]
  positionList: IElementPosition[]
}) {
  const { x, y, margins, pageRowBands, positionList } = payload
  const rowPosition =
    y <= margins[0]
      ? resolveBoundaryRowPosition({
          x,
          leftMargin: margins[3],
          rowBand: pageRowBands[0] || null,
          positionList
        })
      : resolveBoundaryRowPosition({
          x,
          leftMargin: margins[3],
          rowBand: pageRowBands[pageRowBands.length - 1] || null,
          positionList
        })
  return rowPosition?.index ?? null
}

export function resolveActiveRowBandBlankHit(payload: {
  x: number
  curPageLeftMargin: number
  activeRowBand: TPageRowBand | null
  elementList: IElement[]
  positionList: IElementPosition[]
  resolvePreviousLogicalIndex: (
    positionCursor: number,
    boundaryIndex: number
  ) => number
  resolveLogicalControlElement: (logicalIndex: number) => IElement | undefined
}): (ICurrentPosition & { hitTargetIndex?: number }) | null {
  const {
    x,
    curPageLeftMargin,
    activeRowBand,
    elementList,
    positionList,
    resolvePreviousLogicalIndex,
    resolveLogicalControlElement
  } = payload
  if (!activeRowBand) return null
  const headIndex = activeRowBand.start
  const tailIndex = activeRowBand.end
  const headElement = elementList[headIndex]
  const headPosition = positionList[headIndex]
  const tailPosition = positionList[tailIndex]
  if (!headElement || !headPosition || !tailPosition) return null

  const headStartX = resolveListCheckboxHeadStartX({
    headElement,
    defaultStartX: headPosition.coordinate.leftTop[0],
    leftMargin: curPageLeftMargin
  })
  if (x < headStartX) {
    const lineStartBoundaryIndex =
      headPosition.value === ZERO
        ? headPosition.index
        : resolvePreviousLogicalIndex(headIndex, headPosition.index)
    return {
      index: lineStartBoundaryIndex,
      hitTargetIndex: headPosition.index,
      cursorPosition: createCollapsedLeftCursorPosition(
        headPosition,
        lineStartBoundaryIndex
      ),
      isLeftSideBlank: true,
      isControl: isElementInControl(
        resolveLogicalControlElement(lineStartBoundaryIndex)
      )
    }
  }

  const listCheckboxHeadHit = resolveListCheckboxHeadHit({
    headElement,
    headPosition,
    x
  })
  if (listCheckboxHeadHit) return listCheckboxHeadHit

  const tailIndexValue = tailPosition.index
  return {
    index: tailIndexValue,
    isControl: isElementInControl(resolveLogicalControlElement(tailIndexValue))
  }
}

export function resolveLastPageRowBoundaryIndex(payload: {
  pageRowBands: TPageRowBand[]
  positionList: IElementPosition[]
}) {
  const { pageRowBands, positionList } = payload
  const lastRowBand = pageRowBands[pageRowBands.length - 1]
  return (
    (lastRowBand ? positionList[lastRowBand.end]?.index : undefined) ||
    positionList[positionList.length - 1]?.index ||
    positionList.length - 1
  )
}
