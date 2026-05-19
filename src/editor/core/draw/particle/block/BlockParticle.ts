import { EDITOR_PREFIX } from '../../../../dataset/constant/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IRowElement } from '../../../../interface/Row'
import { RenderLayer } from '../../../render-backend'
import { Draw } from '../../Draw'
import { BaseBlock } from './modules/BaseBlock'

export class BlockParticle {
  private draw: Draw
  private container: HTMLDivElement
  private blockContainer: HTMLDivElement
  private blockMap: Map<string, BaseBlock>

  constructor(draw: Draw) {
    this.draw = draw
    this.container = draw.getPageCanvasHost().getContainer()
    this.blockMap = new Map()
    this.blockContainer = this._createBlockContainer()
    this.container.append(this.blockContainer)
  }

  private _createBlockContainer(): HTMLDivElement {
    const blockContainer = document.createElement('div')
    blockContainer.classList.add(`${EDITOR_PREFIX}-block-container`)
    return blockContainer
  }

  public getDraw(): Draw {
    return this.draw
  }

  public getBlockContainer(): HTMLDivElement {
    return this.blockContainer
  }

  public render(pageNo: number, element: IRowElement, x: number, y: number) {
    const surface = this.draw
      .getPageCanvasHost()
      .getSurface(pageNo, RenderLayer.BASE)
    if (!surface) return
    this.draw.getServices().renderBackendManager.render(surface, {
      pageNo,
      layer: RenderLayer.BASE,
      reason: 'svg-dom-block',
      priority: 'sync',
      isCurrentPage: pageNo === this.draw.getPageNo(),
      isInteractive: true,
      execute: () => {
        const id = element.id!
        const cacheBlock = this.blockMap.get(id)
        if (cacheBlock) {
          cacheBlock.setClientRects(pageNo, x, y)
        } else {
          const newBlock = new BaseBlock(this, element)
          newBlock.render()
          newBlock.setClientRects(pageNo, x, y)
          this.blockMap.set(id, newBlock)
        }
      }
    })
  }

  public clear() {
    if (!this.blockMap.size) return
    const elementList = this.draw.getElementList()
    const blockElementIds: string[] = []
    for (let e = 0; e < elementList.length; e++) {
      const element = elementList[e]
      if (element.type === ElementType.BLOCK) {
        blockElementIds.push(element.id!)
      }
    }
    this.blockMap.forEach(block => {
      const id = block.getBlockElement().id!
      if (!blockElementIds.includes(id)) {
        block.remove()
        this.blockMap.delete(id)
      }
    })
  }

  /** 清理指定页的 DOM/SVG block host，页面卸载或滚动回收时使用。 */
  public clearPage(pageNo: number) {
    if (!this.blockMap.size) return
    this.blockMap.forEach(block => {
      if (block.getPageNo() !== pageNo) return
      block.remove()
      this.blockMap.delete(block.getBlockElement().id!)
    })
  }
}
