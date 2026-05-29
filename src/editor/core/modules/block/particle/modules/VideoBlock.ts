import { IRowElement } from '../../../../../interface/Row'

export class VideoBlock {
  /** 当前处理的元素数据。 */
  private element: IRowElement

  /** 初始化 VideoBlock 实例并注入运行依赖。 */
  constructor(element: IRowElement) {
    this.element = element
  }

  public render(blockItemContainer: HTMLDivElement) {
    const block = this.element.block!
    const video = document.createElement('video')
    video.style.width = '100%'
    video.style.height = '100%'
    video.style.objectFit = 'contain'
    video.src = block.videoBlock?.src || ''
    video.controls = true
    blockItemContainer.append(video)
  }
}
