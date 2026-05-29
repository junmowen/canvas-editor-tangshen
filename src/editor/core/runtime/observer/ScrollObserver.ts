import { IEditorOption } from '../../../interface/Editor'
import { debounce } from '../../../utils'
import { Draw } from '../../draw/Draw'

/** 元素可见info契约，用于约束内部流程中传递的数据结构。 */
export interface IElementVisibleInfo {
  /** 可视区域交集高度，用于选择当前主页面。 */
  intersectionHeight: number
}

/** 页面可见info契约，用于约束内部流程中传递的数据结构。 */
export interface IPageVisibleInfo {
  /** intersection页面no，用于定位对应页、行或序号。 */
  intersectionPageNo: number
  /** 可见页码列表，保存视口内当前可见页面。 */
  visiblePageNoList: number[]
}

export class ScrollObserver {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 编辑器选项快照，读取页面尺寸、样式和功能开关。 */
  private options: Required<IEditorOption>
  private scrollContainer: Element | Document

  /** 初始化 ScrollObserver 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.scrollContainer = this.getScrollContainer()
    // 监听滚轮
    setTimeout(() => {
      if (!window.scrollY) {
        this._observer()
      }
    })
    this._addEvent()
  }

  public getScrollContainer(): Element | Document {
    return this.options.scrollContainerSelector
      ? document.querySelector(this.options.scrollContainerSelector) || document
      : document
  }

  private _addEvent() {
    this.scrollContainer.addEventListener('scroll', this._observer)
  }

  public removeEvent() {
    this.scrollContainer.removeEventListener('scroll', this._observer)
  }

  public getElementVisibleInfo(element: Element): IElementVisibleInfo {
    const rect = element.getBoundingClientRect()
    const viewHeight =
      this.scrollContainer === document
        ? Math.max(document.documentElement.clientHeight, window.innerHeight)
        : (<Element>this.scrollContainer).clientHeight
    const visibleHeight =
      Math.min(rect.bottom, viewHeight) - Math.max(rect.top, 0)
    return {
      intersectionHeight: visibleHeight > 0 ? visibleHeight : 0
    }
  }

  public getPageVisibleInfo(): IPageVisibleInfo {
    const pageList = this.draw.getPageCanvasHost().getPageWrapperList()
    const visiblePageNoList: number[] = []
    let intersectionPageNo = 0
    let intersectionMaxHeight = 0
    for (let i = 0; i < pageList.length; i++) {
      const curPage = pageList[i]
      const { intersectionHeight } = this.getElementVisibleInfo(curPage)
      // 之前页存在交叉 && 当前页不交叉则后续均不交叉，结束循环
      if (intersectionMaxHeight && !intersectionHeight) break
      if (intersectionHeight) {
        visiblePageNoList.push(i)
      }
      if (intersectionHeight > intersectionMaxHeight) {
        intersectionMaxHeight = intersectionHeight
        intersectionPageNo = i
      }
    }
    return {
      intersectionPageNo,
      visiblePageNoList
    }
  }

  /** 滚动区域 ResizeObserver 实例，用于监听容器尺寸变化。 */
  private _observer = debounce(() => {
    const { intersectionPageNo, visiblePageNoList } = this.getPageVisibleInfo()
    this.draw.setIntersectionPageNo(intersectionPageNo)
    this.draw.setVisiblePageNoList(visiblePageNoList)
    this.draw.refreshVisiblePagesIfNeeded()
  }, 150)
}
