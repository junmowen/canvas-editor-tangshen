import type { Draw } from '../../../draw/Draw'

/** 页面搜索高亮渲染器。 */
export class PageSearchRenderer {
  constructor(private readonly draw: Draw) {}

  /** 判断当前是否有搜索关键字参与渲染调度。 */
  public hasActiveKeyword() {
    return !!this.draw.getSearch().getSearchKeyword()
  }

  /** 消费搜索模块标记的待重绘页。 */
  public consumeRenderPageNoList() {
    return this.draw.getSearch().consumeSearchRenderPageNoList()
  }

  public render(
    ctx: CanvasRenderingContext2D,
    pageNo: number,
    isPrintMode: boolean
  ) {
    if (!isPrintMode && this.hasActiveKeyword()) {
      this.draw.getSearch().render(ctx, pageNo)
    }
  }
}
