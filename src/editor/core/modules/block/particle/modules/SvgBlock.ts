import { IRowElement } from '../../../../../interface/Row'

export class SvgBlock {
  /** 当前处理的元素数据。 */
  private element: IRowElement

  /** 初始化 SvgBlock 实例并注入运行依赖。 */
  constructor(element: IRowElement) {
    this.element = element
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = this.element.block!
    const svg = block.svgBlock?.svg || ''
    const svgWrap = document.createElement('div')
    svgWrap.setAttribute('data-id', this.element.id!)
    svgWrap.setAttribute('data-type', 'svg-block')
    svgWrap.style.width = '100%'
    svgWrap.style.height = '100%'
    svgWrap.innerHTML = svg
    const svgElement = svgWrap.querySelector('svg')
    if (svgElement) {
      svgElement.setAttribute('width', '100%')
      svgElement.setAttribute('height', '100%')
      svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet')
    }
    blockItemContainer.append(svgWrap)
  }
}
