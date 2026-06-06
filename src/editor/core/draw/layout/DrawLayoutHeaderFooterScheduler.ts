import { PageMode } from '../../../dataset/enum/Editor'
import type { Draw } from '../Draw'

/** 同步页眉页脚布局状态，完整布局和输入态 patch 共用。 */
export function syncHeaderFooterLayout(draw: Draw) {
  const {
    header,
    footer
  } = draw.getRuntime().getOptions()
  if (draw.getIsPagingMode() || draw.getOptions().pageMode === PageMode.CONTINUITY) {
    if (!header.disabled) {
      draw.getComponents().header.compute()
    } else {
      draw.getComponents().header.recovery()
    }
    if (!footer.disabled) {
      draw.getComponents().footer.compute()
    } else {
      draw.getComponents().footer.recovery()
    }
  }
}
