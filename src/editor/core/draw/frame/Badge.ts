import { IAreaBadge, IBadge } from '../../../interface/Badge'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { Draw } from '../Draw'

/** 已解析到当前页坐标系的签章图片绘制项。 */
export interface IRenderableBadgeItem {
  x: number
  y: number
  width: number
  height: number
  value: string
}

export class Badge {
  private draw: Draw
  private options: DeepRequired<IEditorOption>
  private imageCache: Map<string, HTMLImageElement>
  private mainBadge: IBadge | null
  private areaBadgeMap: Map<string, IBadge>

  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.imageCache = new Map()
    this.mainBadge = null
    this.areaBadgeMap = new Map()
  }

  public setMainBadge(payload: IBadge | null) {
    this.mainBadge = payload
  }

  public setAreaBadgeMap(payload: IAreaBadge[]) {
    this.areaBadgeMap.clear()
    payload.forEach(areaBadge => {
      this.areaBadgeMap.set(areaBadge.areaId, areaBadge.badge)
    })
  }

  /** 当前是否存在会绘制到 base 层的签章图片。 */
  public hasRenderableBadge(): boolean {
    return Boolean(this.mainBadge) || this.areaBadgeMap.size > 0
  }

  /** 获取指定页可绘制的签章图片列表，供 Canvas2D 和 worker 快照复用同一坐标语义。 */
  public getRenderableBadgeList(pageNo: number): IRenderableBadgeItem[] {
    const result: IRenderableBadgeItem[] = []
    // 文档签章
    if (pageNo === 0 && this.mainBadge) {
      const { scale, badge } = this.options
      const { left, top, width, height, value } = this.mainBadge
      const headerTop =
        this.draw.getMargins()[0] + this.draw.getHeader().getExtraHeight()
      result.push({
        x: (left || badge.left) * scale,
        y: (top || badge.top) * scale + headerTop,
        width: width * scale,
        height: height * scale,
        value
      })
    }
    // 区域签章
    if (this.areaBadgeMap.size) {
      const areaInfo = this.draw.getArea().getAreaInfo()
      if (areaInfo.size) {
        const { scale, badge } = this.options
        for (const areaItem of areaInfo) {
          const { positionList } = areaItem[1]
          const firstPosition = positionList[0]
          if (firstPosition.pageNo !== pageNo) continue
          const badgeItem = this.areaBadgeMap.get(areaItem[0])
          if (!badgeItem) continue
          const { left, top, width, height, value } = badgeItem
          result.push({
            x: (left || badge.left) * scale,
            y: (top || badge.top) * scale + firstPosition.coordinate.leftTop[1],
            width: width * scale,
            height: height * scale,
            value
          })
        }
      }
    }
    return result
  }

  private _drawImage(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    value: string
  ) {
    if (this.imageCache.has(value)) {
      const img = this.imageCache.get(value)!
      ctx.drawImage(img, x, y, width, height)
    } else {
      const img = new Image()
      img.setAttribute('crossOrigin', 'Anonymous')
      img.src = value
      img.onload = () => {
        this.imageCache.set(value, img)
        ctx.drawImage(img, x, y, width, height)
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    this.getRenderableBadgeList(pageNo).forEach(item => {
      this._drawImage(ctx, item.x, item.y, item.width, item.height, item.value)
    })
  }
}
