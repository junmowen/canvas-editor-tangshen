import { CommandAdaptMedia } from './CommandAdaptMedia'
import { IReplaceOption, ISearchOption } from '../../interface/Search'
import { IPrintSvgDocumentPayload, printSvgDocument } from '../../utils/print'
import { INavigateInfo } from '../modules/search/runtime/Search'

/**
 * 搜索替换命令适配模块，负责全文搜索、结果导航和替换命令。
 */
export class CommandAdaptSearch extends CommandAdaptMedia {
  /** 打印/导出前按 refreshMode 执行图表数据源预刷新。 */
  protected async preparePrintChartGraphics() {
    this.draw.flushAsyncInsertTransaction('command-print-chart-graphics-refresh')
    return this.refreshChartGraphicSourcesInternal(
      {
        refreshMode: 'on-print'
      },
      {
        ignoreCommandDisabled: true
      }
    )
  }

  /** 执行关键词搜索并返回匹配结果。 */
  public search(payload: string | null, options?: ISearchOption) {
    this.draw.flushAsyncInsertTransaction('command-search')
    this.searchManager.setSearchKeyword(payload)
    if (payload) {
      this.searchManager.compute(payload, options)
    }
    this.draw.refreshVisibleOverlay({
      isSearchDirty: true
    })
  }

  /** 导航到上一个搜索结果。 */
  public searchNavigatePre() {
    this.draw.flushAsyncInsertTransaction('command-search-navigate-pre')
    const index = this.searchManager.searchNavigatePre()
    if (index === null) return
    this.draw.refreshVisibleOverlay({
      isSearchDirty: true
    })
  }

  /** 导航到下一个搜索结果。 */
  public searchNavigateNext() {
    this.draw.flushAsyncInsertTransaction('command-search-navigate-next')
    const index = this.searchManager.searchNavigateNext()
    if (index === null) return
    this.draw.refreshVisibleOverlay({
      isSearchDirty: true
    })
  }

  /** 获取当前搜索导航状态。 */
  public getSearchNavigateInfo(): null | INavigateInfo {
    return this.searchManager.getSearchNavigateInfo()
  }

  /** 替换当前或全部搜索结果。 */
  public replace(payload: string, option?: IReplaceOption) {
    this.draw.getSearch().replace(payload, option)
  }

  /** 创建 SVG 打印/导出共享载荷，确保 PDF 与浏览器打印消费同一套页面数据。 */
  protected createPrintSvgDocumentPayload(): IPrintSvgDocumentPayload {
    const pageCount = Math.max(1, this.draw.getPageRowList().length)
    return {
      mainPositionList: this.coordinate.getMainPositionList(),
      pageRowList: this.draw.getPageRowList(),
      headerRowListByPage: Array.from({ length: pageCount }, (_, pageNo) =>
        this.options.header.disabled
          ? []
          : this.draw.getHeader().getRowList(pageNo)
      ),
      headerPositionListByPage: Array.from({ length: pageCount }, (_, pageNo) =>
        this.options.header.disabled
          ? []
          : this.draw.getHeader().getPositionList(pageNo)
      ),
      footerRowListByPage: Array.from({ length: pageCount }, (_, pageNo) =>
        this.options.footer.disabled
          ? []
          : this.draw.getFooter().getRowList(pageNo)
      ),
      footerPositionListByPage: Array.from({ length: pageCount }, (_, pageNo) =>
        this.options.footer.disabled
          ? []
          : this.draw.getFooter().getPositionList(pageNo)
      ),
      floatPositionList: this.coordinate.getFloatPositionList(),
      badgeListByPage: Array.from({ length: pageCount }, (_, pageNo) =>
        this.draw.getBadge().getRenderableBadgeList(pageNo)
      ),
      editorOptions: this.options,
      pageMetricList: Array.from({ length: pageCount }, (_, pageNo) => ({
        margins: this.draw.getMargins(pageNo),
        innerWidth: this.draw.getInnerWidth(pageNo),
        headerExtraHeight: this.draw.getHeader().getExtraHeight(pageNo),
        footerExtraHeight: this.draw.getFooter().getExtraHeight(pageNo)
      })),
      pageCount,
      width: this.options.width,
      height: this.options.height,
      direction: this.options.paperDirection
    }
  }

  /** 打印当前文档，使用 SVG 矢量文本，避免 Canvas 图片打印导致文字发虚。 */
  public async print() {
    this.draw.flushAsyncInsertTransaction('command-print-svg')
    await this.preparePrintChartGraphics()
    printSvgDocument(this.createPrintSvgDocumentPayload())
  }
}
