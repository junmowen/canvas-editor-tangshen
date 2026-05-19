import { IRenderSurface } from '../types/RenderSurface'
import { IWorkerRenderSuccessResult } from './WorkerRenderProtocol'

/** worker bitmap 合成结果。 */
export interface IWorkerBitmapComposeResult {
  composed: boolean
  rejectReason?: string
}

/** 主线程 worker bitmap 合成器，负责版本校验和写回 base surface。 */
export class WorkerBitmapCompositor {
  /** 校验并合成 worker 返回的 ImageBitmap。 */
  public compose(
    surface: IRenderSurface,
    result: IWorkerRenderSuccessResult,
    expected: {
      layoutVersion: number
      baseVisualVersion: number
    }
  ): IWorkerBitmapComposeResult {
    const rejectReason = this.getRejectReason(surface, result, expected)
    if (rejectReason) {
      result.bitmap.close()
      return {
        composed: false,
        rejectReason
      }
    }
    const ctx = surface.ctx2d
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
    ctx.clearRect(0, 0, surface.canvas.width, surface.canvas.height)
    ctx.drawImage(result.bitmap, 0, 0, surface.canvas.width, surface.canvas.height)
    ctx.restore()
    return {
      composed: true
    }
  }

  /** 返回不能合成的原因；空字符串表示可合成。 */
  private getRejectReason(
    surface: IRenderSurface,
    result: IWorkerRenderSuccessResult,
    expected: {
      layoutVersion: number
      baseVisualVersion: number
    }
  ): string {
    if (surface.pageNo !== result.pageNo) return 'page-no'
    if (surface.layer !== result.layer) return 'layer'
    if (surface.width !== result.width || surface.height !== result.height) {
      return 'size'
    }
    if (surface.dpr !== result.dpr) return 'dpr'
    if (surface.canvas.width !== result.bitmap.width) return 'bitmap-size'
    if (surface.canvas.height !== result.bitmap.height) return 'bitmap-size'
    if (expected.layoutVersion !== result.layoutVersion) {
      return 'layout-version'
    }
    if (expected.baseVisualVersion !== result.baseVisualVersion) {
      return 'base-visual-version'
    }
    return ''
  }
}
