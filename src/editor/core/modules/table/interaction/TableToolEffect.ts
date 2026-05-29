import { EditorMode } from '../../../../dataset/enum/Editor'
import { Draw } from '../../../draw/Draw'

/** 销毁dispose表格tool相关资源，解除事件监听并释放持有对象。 */
export function disposeTableTool(draw: Draw) {
  draw.getComponents().tableTool.dispose()
}

export function renderTableToolIfNeeded(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 是否处于表格结构内，用于选择表格专用处理逻辑。 */
  isTable: boolean
  /** 是否只读，用于阻止内容修改。 */
  isReadonly: boolean
}) {
  const { draw, isTable, isReadonly } = payload
  if (isTable && !isReadonly && draw.getMode() !== EditorMode.FORM) {
    draw.getComponents().tableTool.render()
  }
}
