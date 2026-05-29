import { Draw } from '../../../draw/Draw'

/** 清理编辑器外部点击触发的图片全局副作用。 */
export function clearGlobalImageEffects(draw: Draw) {
  const components = draw.getComponents()
  components.previewer.clearResizer()
  components.imageParticle.destroyFloatImage()
}
