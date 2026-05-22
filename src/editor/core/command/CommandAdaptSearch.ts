import { CommandAdaptMedia } from './CommandAdaptMedia'
import { EditorMode } from '../../dataset/enum/Editor'
import { IReplaceOption, ISearchOption } from '../../interface/Search'
import { printImageBase64 } from '../../utils/print'
import { INavigateInfo } from '../draw/interactive/Search'

/**
 * 搜索替换命令适配模块，负责全文搜索、结果导航和替换命令。
 */
export class CommandAdaptSearch extends CommandAdaptMedia {
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

  public async print() {
    const { scale, printPixelRatio, paperDirection, width, height } =
      this.options
    if (scale !== 1) {
      this.draw.setPageScale(1)
    }
    const base64List = await this.draw.getDataURL({
      pixelRatio: printPixelRatio,
      mode: EditorMode.PRINT
    })
    printImageBase64(base64List, {
      width,
      height,
      direction: paperDirection
    })
    if (scale !== 1) {
      this.draw.setPageScale(scale)
    }
  }
}
