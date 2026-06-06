
import { IDrawPagePayload } from '../../../interface/Draw'
import {
  getWorkerSnapshotBottomFloatImageLayerList,
  getWorkerSnapshotTopFloatImageLayerList
} from '../../modules/image/render/WorkerSnapshotImageRenderPolicy'
import type { Draw } from '../../draw/Draw'
import { RenderLayer } from '../types/RenderLayer'
import { IRenderSurface } from '../types/RenderSurface'
import {
  IWorkerPageRenderSnapshot,
  IWorkerPaintCommand
} from './WorkerRenderProtocol'
import { PageRenderSnapshotValidator } from './PageRenderSnapshotValidator'

/** build后台线程页面snapshot调用载荷，聚合执行该操作所需的输入数据。 */
export interface IBuildWorkerPageSnapshotPayload {
  /** 任务标识，用于关联异步渲染请求和响应。 */
  jobId: number
  pagePayload: IDrawPagePayload
}

/** worker 快照构建器，只输出可结构化克隆的数据。 */
export class PageRenderSnapshotBuilder extends PageRenderSnapshotValidator {
  /** 初始化 PageRenderSnapshotBuilder 实例并注入运行依赖。 */
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

  /** 构建单页 base worker 快照；不支持的内容会抛错并触发 Canvas2D 备用路径。 */
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
      ...this.buildMarginCommands(pageNo),
      ...this.buildAreaCommands(pageNo),
      ...this.buildFloatingImageCommands(
        pageNo,
        getWorkerSnapshotBottomFloatImageLayerList()
      ),
      ...this.buildMainTextCommands(pagePayload),
      ...this.buildPlaceholderCommands(pageNo),
      ...this.buildPagingFrameCommands(pagePayload),
      ...this.buildFloatingImageCommands(
        pageNo,
        getWorkerSnapshotTopFloatImageLayerList()
      ),
      ...this.buildLineNumberCommands(pagePayload),
      ...this.buildPageBorderCommands(pageNo),
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
