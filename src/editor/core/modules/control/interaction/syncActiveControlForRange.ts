import { Draw } from '../../../draw/Draw'

/** range 变化后同步控件激活状态。 */
export function syncActiveControlForRange(payload: {
  /** 绘制核心实例，提供控件和目标解析能力。 */
  draw: Draw
  /** range 起始索引。 */
  startIndex: number
  /** range 结束索引。 */
  endIndex: number
}) {
  const { draw, startIndex, endIndex } = payload
  const control = draw.getControl()
  if (~startIndex && ~endIndex) {
    const element = draw.getTargetResolver().resolveRangeElement()
    if (element?.controlId) {
      control.initControl()
      return
    }
  }
  control.destroyControl()
}
