import { IRowElement } from '../../../../../interface/Row'

export class HtmlBlock {
  /** 当前处理的元素数据。 */
  private element: IRowElement

  /** 初始化 HtmlBlock 实例并注入运行依赖。 */
  constructor(element: IRowElement) {
    this.element = element
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = this.element.block!
    const htmlWrap = document.createElement('div')
    htmlWrap.setAttribute('data-id', this.element.id!)
    htmlWrap.setAttribute('data-type', 'html-block')
    htmlWrap.style.width = '100%'
    htmlWrap.style.height = '100%'
    htmlWrap.style.overflow = 'hidden'
    htmlWrap.innerHTML = block.htmlBlock?.html || ''
    blockItemContainer.append(htmlWrap)
  }
}
