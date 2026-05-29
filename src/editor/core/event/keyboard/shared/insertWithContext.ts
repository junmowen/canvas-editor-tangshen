import { IElement } from '../../../../interface/Element'
import { Draw } from '../../../draw/Draw'
import { formatInsertContext } from './formatInsertContext'

export function insertWithContext(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  insertElementList: IElement[]
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
  /** 选区是否折叠，用于区分光标和范围选择。 */
  isCollapsed: boolean
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
  /** 是否在换行时强制断开，用于控制行布局边界。 */
  isBreakWhenWrap?: boolean
}) {
  const {
    draw,
    elementList,
    insertElementList,
    startIndex,
    endIndex,
    isCollapsed,
    cursorIndex,
    isBreakWhenWrap = false
  } = payload
  formatInsertContext({
    draw,
    elementList,
    insertElementList,
    startIndex,
    isBreakWhenWrap
  })
  if (isCollapsed) {
    draw.spliceElementList(elementList, cursorIndex + 1, 0, insertElementList)
  } else {
    draw.spliceElementList(
      elementList,
      startIndex + 1,
      endIndex - startIndex,
      insertElementList
    )
  }
  return cursorIndex + insertElementList.length
}
