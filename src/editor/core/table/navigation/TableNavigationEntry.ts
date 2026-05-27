import { ElementType } from '../../../dataset/enum/Element'
import { ITableVerticalEntryNavigationResult } from './TableNavigationTypes'

export function resolveVerticalEntryNavigation(payload: {
  tableIndex: number
  cursorX: number
  direction: 'up' | 'down'
  getElement: (index: number) => any
  getOptions: () => any
  getMargins: () => number[]
}): ITableVerticalEntryNavigationResult | null {
  const { tableIndex, cursorX, direction, getElement, getOptions, getMargins } =
    payload
  const table = getElement(tableIndex)
  if (table?.type !== ElementType.TABLE || !table.trList?.length) {
    return null
  }

  const targetRowIndex = direction === 'up' ? table.trList.length - 1 : 0
  const tr = table.trList[targetRowIndex]
  if (!tr?.tdList?.length) {
    return null
  }

  for (let tdIndex = 0; tdIndex < tr.tdList.length; tdIndex++) {
    const td = tr.tdList[tdIndex]
    const tdX = (td.x || 0) * getOptions().scale + getMargins()[3]
    const tdWidth = (td.width || 0) * getOptions().scale
    if (cursorX < tdX || cursorX > tdX + tdWidth) {
      continue
    }

    const tdPositionList = td.positionList || []
    const targetRowNo =
      direction === 'up'
        ? tdPositionList[tdPositionList.length - 1]?.rowNo
        : tdPositionList[0]?.rowNo
    const targetRowPositions = tdPositionList.filter(
      (position: any) => position.rowNo === targetRowNo
    )
    let tdPositionIndex: number | null = null
    if (targetRowPositions.length) {
      tdPositionIndex = targetRowPositions[targetRowPositions.length - 1].index
      for (let i = 0; i < targetRowPositions.length; i++) {
        const nextPosition = targetRowPositions[i]
        const {
          coordinate: {
            leftTop: [nextLeftX],
            rightTop: [nextRightX]
          }
        } = nextPosition
        if (cursorX < nextLeftX || cursorX > nextRightX) {
          continue
        }
        tdPositionIndex = nextPosition.index
        break
      }
    }
    if (tdPositionIndex === null) {
      continue
    }

    return {
      nextPositionContext: {
        isTable: true,
        index: tableIndex,
        trIndex: targetRowIndex,
        tdIndex,
        tdId: td.id,
        trId: tr.id,
        tableId: table.id
      },
      nextIndex: tdPositionIndex
    }
  }

  return null
}
