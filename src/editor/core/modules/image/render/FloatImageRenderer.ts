import { ImageDisplay } from '../../../../dataset/enum/Common'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawFloatPayload, IDrawPagePayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

/** 浮动图片渲染器，负责按页、zone 和展示模式筛选并绘制图片。 */
export class FloatImageRenderer {
  /** 初始化 FloatImageRenderer 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** 绘制当前页的浮动图片与浮动元素。 */
  public drawFloat(ctx: CanvasRenderingContext2D, payload: IDrawFloatPayload) {
    const { scale } = this.draw.getOptions()
    const floatPositionList = this.draw.getCoordinate().getFloatPositionList()
    const {
      imgDisplays,
      pageNo,
      zoneList,
      includeHeaderFooter = !zoneList
    } = payload
    for (let e = 0; e < floatPositionList.length; e++) {
      const floatPosition = floatPositionList[e]
      const element = floatPosition.element
      const shouldRenderByZone = zoneList
        ? zoneList.includes(floatPosition.zone!)
        : pageNo === floatPosition.pageNo ||
          (includeHeaderFooter &&
            (floatPosition.zone === EditorZone.HEADER ||
              floatPosition.zone === EditorZone.FOOTER))
      if (
        shouldRenderByZone &&
        element.imgDisplay &&
        imgDisplays.includes(element.imgDisplay) &&
        element.type === ElementType.IMAGE
      ) {
        const imgFloatPosition = element.imgFloatPosition!
        this.draw.getImageParticle().render(
          ctx,
          element,
          imgFloatPosition.x * scale,
          imgFloatPosition.y * scale,
          {
            isExport: payload.isExport
          }
        )
      }
    }
  }

  /** 绘制正文内容下方的底层浮动图片。 */
  public drawPageBottomFloatLayer(
    ctx: CanvasRenderingContext2D,
    payload: Omit<IDrawFloatPayload, 'imgDisplays'>
  ) {
    this.drawFloat(ctx, {
      ...payload,
      imgDisplays: [ImageDisplay.FLOAT_BOTTOM]
    })
  }

  /** 绘制正文内容上方的顶层浮动图片。 */
  public drawPageTopFloatLayer(
    ctx: CanvasRenderingContext2D,
    payload: Omit<IDrawFloatPayload, 'imgDisplays'>
  ) {
    this.drawFloat(ctx, {
      ...payload,
      imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND, ImageDisplay.TIGHT]
    })
  }

  /** 绘制页眉页脚内的浮动图片。 */
  public renderHeaderFooterFloatList(
    ctx: CanvasRenderingContext2D,
    payload: IDrawPagePayload,
    imgDisplays: ImageDisplay[]
  ) {
    this.drawFloat(ctx, {
      pageNo: payload.pageNo,
      imgDisplays,
      zoneList: [EditorZone.HEADER, EditorZone.FOOTER],
      isExport: payload.isExport
    })
  }
}
