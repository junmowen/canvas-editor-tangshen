import { writeElementList } from '../../../utils/clipboard'
import { CanvasEvent } from '../CanvasEvent'

export function cut(host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const rangeManager = components.range
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  if (!~startIndex && !~startIndex) return
  if (draw.isReadonly() || !rangeManager.getIsCanInput()) return

  const elementList = draw.getElementList()
  let start = startIndex
  let end = endIndex
  // 无选区则剪切一行
  if (startIndex === endIndex) {
    const position = components.position
    const positionList = position.getPositionList()
    const startPosition = positionList[startIndex]
    const curRowNo = startPosition.rowNo
    const curPageNo = startPosition.pageNo
    const cutElementIndexList: number[] = []
    for (let p = 0; p < positionList.length; p++) {
      const position = positionList[p]
      if (position.pageNo > curPageNo) break
      if (position.pageNo === curPageNo && position.rowNo === curRowNo) {
        cutElementIndexList.push(p)
      }
    }
    const firstElementIndex = cutElementIndexList[0] - 1
    start = firstElementIndex < 0 ? 0 : firstElementIndex
    end = cutElementIndexList[cutElementIndexList.length - 1]
  }
  const options = draw.getOptions()
  // 写入粘贴板
  writeElementList(elementList.slice(start + 1, end + 1), options)
  const control = components.control
  let curIndex: number
  if (control.getActiveControl() && control.getIsRangeWithinControl()) {
    curIndex = control.cut()
    control.emitControlContentChange()
  } else {
    draw.spliceElementList(elementList, start + 1, end - start)
    curIndex = start
  }
  rangeManager.setRange(curIndex, curIndex)
  draw.render({ curIndex })
}
