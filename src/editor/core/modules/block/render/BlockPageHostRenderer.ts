import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawPagePayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

/** 页级 block host 重放器，用于 base bitmap cache 命中后的 DOM/SVG host 恢复。 */
export class BlockPageHostRenderer {
  /** 初始化 BlockPageHostRenderer 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {}

  /** base bitmap cache 命中时重放 DOM/SVG block host。 */
  public render(payload: IDrawPagePayload) {
    const pagePositionList =
      this.draw.getCoordinate().getLayoutMainPositionListByPage(payload.pageNo)
    let rowPositionOffset = 0
    for (let i = 0; i < payload.rowList.length; i++) {
      const row = payload.rowList[i]
      const rowPositionList = pagePositionList.slice(
        rowPositionOffset,
        rowPositionOffset + row.elementList.length
      )
      rowPositionOffset += row.elementList.length
      for (let j = 0; j < row.elementList.length; j++) {
        const element = row.elementList[j]
        const rowPosition = rowPositionList[j]
        if (element.type !== ElementType.BLOCK || !rowPosition) continue
        const {
          ascent,
          coordinate: {
            leftTop: [x, y]
          }
        } = rowPosition
        this.draw.getBlockParticle().render(payload.pageNo, element, x, y + ascent)
      }
    }
  }
}
