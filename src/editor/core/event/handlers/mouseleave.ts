import { CanvasEvent } from '../CanvasEvent'

/** 处理mouseleave事件，衔接指针交互和编辑器状态更新。 */
export function mouseleave(evt: MouseEvent, host: CanvasEvent) {
  const draw = host.getDraw()
  // 鼠标移出页面时选区禁用
  if (!draw.getOptions().pageOuterSelectionDisable) return
  // 是否还在canvas内部
  const pageContainer = draw.getPageCanvasHost().getPageContainer()
  const { x, y, width, height } = pageContainer.getBoundingClientRect()
  if (
    evt.clientX >= x &&
    evt.clientX <= x + width &&
    evt.clientY >= y &&
    evt.clientY <= y + height
  ) {
    return
  }
  host.getPointerSessionController().clearSelection()
}
