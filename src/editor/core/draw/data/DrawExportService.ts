import { EditorMode, PageMode } from '../../../dataset/enum/Editor'
import { IEditorData } from '../../../interface/Editor'
import { IDrawPagePayload } from '../../../interface/Draw'
import { deepClone } from '../../../utils'
import { RenderLayer } from '../../render-backend'
import type { Draw } from '../Draw'

/**
 * Draw 导出服务。
 *
 * 负责打印模式数据切换与 dataURL 导出。
 * 这里承接的是典型“先改运行时再恢复现场”的流程型逻辑，
 * 因此单独抽出，避免 `Draw` 门面继续承担过多导出状态编排职责。
 */
export class DrawExportService {
  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {}

  /**
   * 设置打印模式数据。
   *
   * 备份当前数据并转换为适合打印的格式，过滤辅助元素后应用。
   */
  public setPrintData() {
    // 构建打印模式数据，包含页眉、正文和页脚元素
    const printModeData: Required<IEditorData> = {
      header: this.draw.getComponents().header.getElementList(),
      main: this.draw.getOriginalMainElementList(),
      footer: this.draw.getComponents().footer.getElementList()
    }
    // 备份打印模式数据到运行时，用于后续恢复
    this.draw.replacePrintModeData(printModeData)
    // 深度克隆打印模式数据
    const clonePrintModeData = deepClone(printModeData)
    const editorDataKeys: (keyof IEditorData)[] = ['header', 'main', 'footer']
    // 遍历所有区域，过滤掉辅助元素（如占位符等不适合打印的内容）
    editorDataKeys.forEach(key => {
      clonePrintModeData[key] = this.draw.getComponents().control.filterAssistElement(
        clonePrintModeData[key]
      )
    })
    // 将过滤后的数据设置为当前编辑器数据
    this.draw.setEditorData(clonePrintModeData)
  }

  /**
   * 清除打印模式数据。
   *
   * 从打印模式恢复到正常编辑模式，使用之前备份的数据。
   */
  public clearPrintData() {
    // 获取之前备份的打印模式数据
    const printModeData = this.draw.getRuntime().getPrintModeData()
    // 如果没有备份数据，直接返回
    if (!printModeData) return
    // 恢复为打印前的原始数据
    this.draw.setEditorData(printModeData)
    // 清除打印模式备份
    this.draw.replacePrintModeData(null)
  }

  /**
   * 导出为 dataURL。
   *
   * 将当前文档渲染为图片并返回 dataURL 数组，支持自定义像素比和导出模式。
   *
   * @param payload - 导出配置
   * @param payload.pixelRatio - 像素比，不指定时使用默认渲染状态值
   * @param payload.mode - 导出模式，不指定时使用当前编辑器模式
   * @returns 各页的 dataURL 数组
   */
  public async getDataURL(payload: {
    pixelRatio?: number
    mode?: EditorMode
  } = {}): Promise<string[]> {
    // 确定导出模式：使用传入参数或当前编辑器模式
    const exportMode = payload.mode || this.draw.getMode()
    // 获取导出数据（已根据模式过滤）
    const exportData = this.getExportData(exportMode)
    // 捕获当前渲染状态，用于后续恢复
    const exportState = this.draw.captureExportRenderState()
    // 确定导出像素比：使用传入参数或默认值
    const exportPixelRatio = payload.pixelRatio ?? exportState.pagePixelRatio

    try {
      // 设置导出像素比
      this.draw.replaceRuntimePagePixelRatio(exportPixelRatio)
      // 设置导出模式
      this.draw.replaceRuntimeMode(exportMode)
      // 重置页码为第一页
      this.draw.setPageNo(0)
      // 设置导出数据
      this.draw.setEditorData(exportData)
      // 先执行布局计算，导出链路直接消费布局结果，不再切换主编辑态的页面 surface。
      const layoutResult = this.draw.getServices().layoutPipeline.compute()
      // 等待所有图片加载完成
      await this.draw.getComponents().imageObserver.allSettled()
      const { background } = this.draw.getRuntime().getOptions()
      if (
        background.image &&
        !(
          exportMode === EditorMode.PRINT &&
          this.draw.getRuntime().getOptions().modeRule.print.backgroundDisabled
        )
      ) {
        await this.draw.getBackground().preloadImage()
      }

      const positionList = this.draw.getPosition().getLayoutMainPositionList()
      const elementList = this.draw.getLayoutMainElementList()
      const pageRowList = this.draw.getPageRowList()
      const pageMode = this.draw.getRuntime().getOptions().pageMode
      const pageHeight =
        pageMode === PageMode.CONTINUITY
          ? layoutResult.continuousPageHeight ?? this.draw.getHeight()
          : this.draw.getHeight()
      const dataUrlList: string[] = []
      const pageHost = this.draw.getPageCanvasHost()

      for (let pageNo = 0; pageNo < pageRowList.length; pageNo++) {
        const rowList = pageRowList[pageNo]
        if (!rowList?.length) continue

        const baseSurface = pageHost.createTransientSurface(
          pageNo,
          RenderLayer.EXPORT,
          this.draw.getWidth(),
          pageHeight,
          exportPixelRatio
        )
        const overlaySurface = pageHost.createTransientSurface(
          pageNo,
          RenderLayer.OVERLAY,
          this.draw.getWidth(),
          pageHeight,
          exportPixelRatio
        )

        try {
          this.draw.getServices().renderBackendManager.render(baseSurface, {
            pageNo,
            layer: RenderLayer.EXPORT,
            reason: 'export',
            priority: 'sync',
            execute: currentSurface => {
              const payload: IDrawPagePayload = {
                elementList,
                positionList,
                rowList,
                pageNo,
                isExport: true
              }
              this.draw.getServices().pageRenderer.drawPageToSurface(
                payload,
                currentSurface,
                overlaySurface.ctx2d
              )
            }
          })

          dataUrlList.push(baseSurface.canvas.toDataURL())
        } finally {
          pageHost.releaseTransientSurface(baseSurface)
          pageHost.releaseTransientSurface(overlaySurface)
        }
      }

      return dataUrlList
    } finally {
      // 无论成功与否，都恢复原始渲染状态
      this.draw.restoreExportRenderState(exportState)
    }
  }

  /**
   * 获取导出数据。
   *
   * 根据导出模式生成适合导出的数据，打印模式下会过滤辅助元素。
   *
   * @param mode - 导出模式
   * @returns 导出所需的完整编辑器数据
   */
  private getExportData(mode: EditorMode): Required<IEditorData> {
    // 深度克隆当前的页眉、正文和页脚数据
    const data: Required<IEditorData> = {
      header: deepClone(this.draw.getHeaderElementList()),
      main: deepClone(this.draw.getOriginalMainElementList()),
      footer: deepClone(this.draw.getFooterElementList())
    }
    // 非打印模式直接返回原始数据
    if (mode !== EditorMode.PRINT) {
      return data
    }
    // 打印模式下过滤辅助元素（如占位符等）
    return {
      header: this.draw.getComponents().control.filterAssistElement(data.header),
      main: this.draw.getComponents().control.filterAssistElement(data.main),
      footer: this.draw.getComponents().control.filterAssistElement(data.footer)
    }
  }
}
