import { EditorZone } from '../../../../dataset/enum/Editor'
import { IElementPosition } from '../../../../interface/Element'
import { IRange } from '../../../../interface/Range'
import { Draw } from '../../../draw/Draw'
import {
  getIsTitleElement,
  getIsTitleRow,
  resolveRowDragParagraphRange
} from './RowDragHandle'

export interface IResolvedRowDragDropTarget {
  range: IRange
  cursorPosition: IElementPosition
}

export function resolveRowDragDropTarget(payload: {
  draw: Draw
  x: number
  y: number
  pageNo: number
  sourceRange?: IRange | null
}): IResolvedRowDragDropTarget | null {
  const { draw, x, y, pageNo, sourceRange } = payload
  const rowList = draw.getPageRowList()[pageNo] || []
  const positionList = draw.getCoordinate().getLayoutMainPositionListByPage(pageNo)
  const elementList = draw.getObjectResolver().getLayoutMainElementList()
  const sourceFirstElement =
    sourceRange && sourceRange.startIndex + 1 < elementList.length
      ? elementList[sourceRange.startIndex + 1]
      : null
  if (getIsTitleElement(sourceFirstElement)) return null
  let rowPositionOffset = 0
  for (let i = 0; i < rowList.length; i++) {
    const row = rowList[i]
    const rowPositionList = positionList.slice(
      rowPositionOffset,
      rowPositionOffset + row.elementList.length
    )
    rowPositionOffset += row.elementList.length
    if (!rowPositionList.length) continue
    if (getIsTitleRow({ elementList, rowPositionList, row })) {
      continue
    }
    const firstPosition = rowPositionList[0]
    const lastPosition = rowPositionList[rowPositionList.length - 1]
    if (
      !firstPosition ||
      !lastPosition ||
      y < firstPosition.coordinate.leftTop[1] ||
      y > lastPosition.coordinate.leftBottom[1]
    ) {
      continue
    }
    const paragraphRange = resolveRowDragParagraphRange({
      elementList,
      rowPositionList
    })
    if (!paragraphRange) continue
    if (
      sourceFirstElement?.listId &&
      !rowPositionList.some(position => {
        const element = elementList[position.index]
        return (
          element?.listId === sourceFirstElement.listId &&
          element?.listLevel === sourceFirstElement.listLevel
        )
      })
    ) {
      continue
    }
    const rowMiddleY =
      (firstPosition.coordinate.leftTop[1] + lastPosition.coordinate.leftBottom[1]) /
      2
    const isDropBefore = y < rowMiddleY
    const boundaryIndex = isDropBefore
      ? paragraphRange.startIndex
      : paragraphRange.endIndex
    return {
      range: {
        startIndex: boundaryIndex,
        endIndex: boundaryIndex,
        zone: EditorZone.MAIN
      },
      cursorPosition: createRowDragDropCursorPosition({
        rowPositionList,
        x,
        y: isDropBefore
          ? firstPosition.coordinate.leftTop[1]
          : lastPosition.coordinate.leftBottom[1],
        index: boundaryIndex
      })
    }
  }
  return null
}

function createRowDragDropCursorPosition(payload: {
  rowPositionList: IElementPosition[]
  x: number
  y: number
  index: number
}): IElementPosition {
  const { rowPositionList, x, y, index } = payload
  const firstPosition = rowPositionList[0]
  const lastPosition = rowPositionList[rowPositionList.length - 1]
  const left = Math.min(...rowPositionList.map(position => position.coordinate.leftTop[0]))
  const right = Math.max(
    ...rowPositionList.map(position => position.coordinate.rightTop[0])
  )
  const basePosition = firstPosition || lastPosition
  return {
    ...basePosition,
    index,
    metrics: {
      ...basePosition.metrics,
      width: Math.max(right - left, 1),
      height: Math.max(basePosition.metrics.height, 1),
      boundingBoxAscent: 0,
      boundingBoxDescent: 0
    },
    coordinate: {
      leftTop: [Math.min(left, x), y],
      leftBottom: [Math.min(left, x), y],
      rightTop: [Math.max(right, x), y],
      rightBottom: [Math.max(right, x), y]
    }
  }
}
