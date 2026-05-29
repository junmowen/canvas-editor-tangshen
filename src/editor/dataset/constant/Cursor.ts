import { ICursorOption } from '../../interface/Cursor'

/** CURSOR AGENT OFFSET HEIGHT 固定高度，用于保持绘制尺寸一致。 */
export const CURSOR_AGENT_OFFSET_HEIGHT = 12

export const defaultCursorOption: Readonly<Required<ICursorOption>> = {
  width: 1,
  color: '#000000',
  dragWidth: 2,
  dragColor: '#0000FF',
  dragFloatImageDisabled: false
}
