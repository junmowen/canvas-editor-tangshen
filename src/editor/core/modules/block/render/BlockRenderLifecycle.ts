import type { Draw } from '../../../draw/Draw'

/** block 渲染生命周期辅助，封装运行态 DOM host 的清理。 */
export class BlockRenderLifecycle {
  /** 初始化 BlockRenderLifecycle 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 清理 block 运行态渲染宿主，避免 base surface 重绘后残留旧 host。 */
  public clearRuntimeHosts() {
    this.draw.getBlockParticle().clear()
  }

  /** 清理指定页的 block 运行态渲染宿主。 */
  public clearPageRuntimeHosts(pageNo: number) {
    this.draw.getBlockParticle().clearPage(pageNo)
  }
}
