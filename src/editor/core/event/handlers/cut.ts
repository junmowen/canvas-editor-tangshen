import { writeElementList } from '../../../utils/clipboard'
import { cutActiveControl } from '../../modules/control/interaction/cutActiveControl'
import { CanvasEvent } from '../CanvasEvent'
import { resolvePositionAtIndex } from '../../position/utils/resolvePositionAtIndex'

/** 处理剪切操作，复制选区内容后删除原文档范围。 */
export function cut(host: CanvasEvent) {
  const draw = host.getDraw()
  const components = draw.getComponents()
  const rangeManager = components.range
  const { startIndex, endIndex } = rangeManager.getEditBoundaryRange()
  if (!~startIndex && !~startIndex) return
  if (draw.isReadonly() || !rangeManager.getIsCanInput()) return

  const elementList = draw.getObjectResolver().getElementList()
  let start = startIndex
  let end = endIndex
  // 无选区则剪切一行
  if (startIndex === endIndex) {
    const coordinate = draw.getCoordinate()
    const positionList = coordinate.getPositionList()
    const startPosition = resolvePositionAtIndex(draw, startIndex, {
      fallbackToLast: true
    })
    if (!startPosition) return
    const curRowNo = startPosition.rowNo
    const curPageNo = startPosition.pageNo
    const cutElementIndexList: number[] = []
    // 剪切整行仍然要回到坐标列表里找出该行覆盖的元素区间。
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
  const activeControlCutIndex = cutActiveControl(control)
  if (activeControlCutIndex !== null) {
    curIndex = activeControlCutIndex
  } else {
    draw.spliceElementList(elementList, start + 1, end - start)
    curIndex = start
  }
  const deletedCount = Math.max(1, end - start)
  rangeManager.setRange(curIndex, curIndex)
  // 剪切后 chunk patch 会刷新坐标，先同步逻辑光标索引以支撑连续编辑。
  draw.getCoordinate().setCursorLogicalIndex(curIndex)
  draw.render({
    curIndex,
    isTyping: true,
    typingEditIndex: start + 1,
    typingInsertedCount: -deletedCount,
    // 剪切删除内容后直接运行 chunk patch，避免无意义的局部预览重画。
    isSkipTypingPreview: true,
    isLazy: false,
    pageRenderScope: 'visible'
  })
}
