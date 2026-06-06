import { IElement } from '../../../../interface/Element'
import { formatElementContext } from '../../../../utils/elementContext'
import { Draw } from '../../../draw/Draw'

export function formatInsertContext(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  insertElementList: IElement[]
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 是否在换行时强制断开，用于控制行布局边界。 */
  isBreakWhenWrap?: boolean
}) {
  const {
    draw,
    elementList,
    insertElementList,
    startIndex,
    isBreakWhenWrap = false
  } = payload
  formatElementContext(elementList, insertElementList, startIndex, {
    isBreakWhenWrap,
    editorOptions: draw.getOptions()
  })
}
