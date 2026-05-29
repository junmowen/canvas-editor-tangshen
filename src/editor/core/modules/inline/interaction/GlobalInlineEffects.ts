import { Draw } from '../../../draw/Draw'

/** 清理编辑器外部点击触发的内联浮层副作用。 */
export function clearGlobalInlineEffects(draw: Draw) {
  const components = draw.getComponents()
  components.hyperlinkParticle.clearHyperlinkPopup()
  components.dateParticle.clearDatePicker()
}
