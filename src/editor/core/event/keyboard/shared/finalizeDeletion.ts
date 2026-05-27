import { Draw } from '../../../draw/Draw'

export function finalizeDeletion(payload: {
  draw: Draw
  startIndex: number
  curIndex: number | null
  deletedCount?: number
  editIndex?: number
}) {
  const { draw, startIndex, curIndex, deletedCount = 1, editIndex } = payload
  const components = draw.getComponents()
  const rangeManager = components.range
  components.globalEvent.setCanvasEventAbility()
  if (curIndex === null) {
    rangeManager.setRange(startIndex, startIndex)
    // 删除后的排版会延迟执行，先把同步键盘链路需要的逻辑光标索引更新到最新。
    draw.getCoordinate().setCursorLogicalIndex(startIndex)
    if (draw.getTrackChange().isEnabled()) {
      // 留痕删除没有真实减少元素数量，跳过删除类 typing patch，避免索引增量误判。
      // 删除痕迹本身是文档变更，需要提交历史并触发 contentChange 刷新右侧审阅卡片。
      draw.render({
        curIndex: startIndex,
        isSubmitHistory: true,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    } else {
      draw.render({
        curIndex: startIndex,
        isSubmitHistory: false,
        isTyping: true,
        typingEditIndex: editIndex ?? startIndex,
        typingInsertedCount: -deletedCount,
        // 删除链路不需要先画预览，正式 chunk patch 会同步刷新坐标。
        isSkipTypingPreview: true,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    }
  } else {
    rangeManager.setRange(curIndex, curIndex)
    // 删除后的排版会延迟执行，先把同步键盘链路需要的逻辑光标索引更新到最新。
    draw.getCoordinate().setCursorLogicalIndex(curIndex)
    if (draw.getTrackChange().isEnabled()) {
      // 留痕删除没有真实减少元素数量，跳过删除类 typing patch，避免索引增量误判。
      // 删除痕迹本身是文档变更，需要提交历史并触发 contentChange 刷新右侧审阅卡片。
      draw.render({
        curIndex,
        isSubmitHistory: true,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    } else {
      draw.render({
        curIndex,
        isTyping: true,
        typingEditIndex: editIndex ?? curIndex,
        typingInsertedCount: -deletedCount,
        // 删除链路不需要先画预览，正式 chunk patch 会同步刷新坐标。
        isSkipTypingPreview: true,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    }
  }
}
