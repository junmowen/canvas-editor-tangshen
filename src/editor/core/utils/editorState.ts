import type { Draw } from '../draw/Draw'

/** 判断编辑器是否处于禁止内容修改的只读或禁用状态。 */
export function isEditorDisabled(draw: Draw): boolean {
  return draw.isReadonly() || draw.isDisabled()
}
