
import { IDrawPagePayload } from '../../../interface/Draw'
import { ImageDisplay } from '../../../dataset/enum/Common'
import type { Draw } from '../../draw/Draw'
import { RenderLayer } from '../types/RenderLayer'
import { IRenderSurface } from '../types/RenderSurface'
import {
  IWorkerPageRenderSnapshot,
  IWorkerPaintCommand
} from './WorkerRenderProtocol'
import { PageRenderSnapshotValidator } from './PageRenderSnapshotValidator'

/** 快照构建参数。 */
export interface IBuildWorkerPageSnapshotPayload {
  jobId: number
  pagePayload: IDrawPagePayload
}

/** worker 快照构建器，只输出可结构化克隆的数据。 */
export class PageRenderSnapshotBuilder extends PageRenderSnapshotValidator {
  public constructor(draw: Draw) {
    super(draw)
  }

  /** 获取所属 Draw 实例，供 worker 合成统计回写使用。 */
  public getDraw(): Draw {
    return this.draw
  }

  /** 获取当前布局版本。 */
  public getLayoutVersion(): number {
    return this.draw.getTableLayoutSnapshotVersion()
  }

  /** 获取当前 base 视觉版本。 */
  public getBaseVisualVersion(): number {
    return this.draw
      .getServices()
      .renderInvalidationManager.getBaseBitmapContentVersion()
  }

  /** 将 worker bitmap 写入当前 surface 对应缓存。 */
  public cacheWorkerBitmap(
    surface: IRenderSurface,
    bitmap: ImageBitmap,
    contentVersion: number
  ) {
    this.draw.getPageCanvasHost().cacheImageBitmap(surface, bitmap, {
      contentVersion,
      source: 'worker-render'
    })
  }

  /** 构建单页 base worker 快照；不支持的内容会抛错并触发 Canvas2D fallback。 */
  public build(
    payload: IBuildWorkerPageSnapshotPayload
  ): IWorkerPageRenderSnapshot {
    const { jobId, pagePayload } = payload
    const pageNo = pagePayload.pageNo
    this.assertPageSupported(pagePayload)
    const options = this.draw.getRuntime().getOptions()
    const commandList: IWorkerPaintCommand[] = [
      {
        type: 'clear',
        rect: {
          x: 0,
          y: 0,
          width: this.draw.getWidth(),
          height: this.draw.getHeight()
        }
      },
      ...this.buildBackgroundCommands(pageNo),
      ...this.buildMarginCommands(),
      ...this.buildAreaCommands(pageNo),
      ...this.buildFloatingImageCommands(pageNo, [ImageDisplay.FLOAT_BOTTOM]),
      ...this.buildMainTextCommands(pagePayload),
      ...this.buildPlaceholderCommands(),
      ...this.buildPagingFrameCommands(pagePayload),
      ...this.buildFloatingImageCommands(pageNo, [
        ImageDisplay.FLOAT_TOP,
        ImageDisplay.SURROUND
      ]),
      ...this.buildLineNumberCommands(pagePayload),
      ...this.buildPageBorderCommands(),
      ...this.buildBadgeCommands(pagePayload),
      ...this.buildWatermarkCommands(pagePayload)
    ]
    return {
      jobId,
      pageNo,
      layer: RenderLayer.BASE,
      width: this.draw.getWidth(),
      height: this.draw.getHeight(),
      dpr: this.draw.getPagePixelRatio(),
      scale: options.scale,
      layoutVersion: this.getLayoutVersion(),
      baseVisualVersion: this.getBaseVisualVersion(),
      commandList
    }
  }
}
