import { IMAGE_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { MoveDirection } from '../../../dataset/enum/Observer'
import type { Draw } from '../Draw'

/**
 * Draw 光标服务。
 *
 * 负责：
 * - 普通上下文下的光标定位
 * - 表格上下文下的光标定位
 * - 图片 direct-hit 时的 resizer 切换
 */
export class DrawCursorService {
  /** 关联的 Draw 门面。 */
  constructor(private readonly draw: Draw) {}

  /**
   * 设置光标位置。
   *
   * 根据位置上下文（表格/非表格）设置对应的光标位置，如果是图片的直接命中，
   * 则隐藏光标并更新 resizer。
   *
   * @param curIndex 光标索引，undefined 时在表格上下文中自动定位到最后一个位置
   * @returns 处理后的光标索引
   */
  public setCursor(curIndex: number | undefined) {
    // 获取组件、位置上下文和位置列表
    const components = this.draw.getComponents()
    const coordinate = this.draw.getCoordinate()
    const positionContext = coordinate.getPositionContext()
    const positionList = coordinate.getPositionList()

    // 根据上下文设置光标位置
    if (positionContext.isTable) {
      // 表格上下文：未指定索引时自动定位到末尾
      if (curIndex === undefined && positionList.length) {
        curIndex = positionList.length - 1
      }
      const tablePosition = positionList[curIndex!]
      coordinate.setCursorPosition(tablePosition || null)
    } else {
      // 普通上下文：直接使用索引定位
      coordinate.setCursorPosition(
        curIndex !== undefined ? positionList[curIndex] : null
      )
    }

    // 处理图片 direct-hit：隐藏光标并更新 resizer
    let isShowCursor = true
    if (
      curIndex !== undefined &&
      positionContext.isImage &&
      positionContext.isDirectHit
    ) {
      const elementList = this.draw.getObjectResolver().getElementList()
      const element = elementList[curIndex]
      if (IMAGE_ELEMENT_TYPE.includes(element.type!)) {
        isShowCursor = false
        const position = coordinate.getCursorPosition()
        components.previewer.updateResizer(element, position)
      }
    }

    // 绘制光标并返回处理后的索引
    components.cursor.drawCursor({
      isShow: isShowCursor
    })
    const cursorPosition = coordinate.getCursorPosition()
    if (cursorPosition && isShowCursor) {
      this.draw.getCursor().moveCursorToVisible({
        cursorPosition,
        direction: MoveDirection.DOWN
      })
    }
    return curIndex
  }
}
