import { IRowElement } from '../../../../../interface/Row'

export class HtmlBlock {
  private element: IRowElement

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
