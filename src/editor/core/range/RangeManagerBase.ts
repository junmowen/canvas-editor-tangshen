import { TableSelectionProjectionService } from './TableSelectionProjectionService'
import { IEditorOption } from '../../interface/Editor'
import { IElementPosition } from '../../interface/Element'
import { EventBusMap } from '../../interface/EventBus'
import { IRange, IRangeElementStyle } from '../../interface/Range'
import { Draw } from '../draw/Draw'
import { EventBus } from '../event/eventbus/EventBus'
import { HistoryManager } from '../history/HistoryManager'
import { Listener } from '../listener/Listener'
import type { DrawCoordinateService } from '../draw/coordinate/DrawCoordinateService'

/**
 * RangeManager 基础上下文，集中缓存范围管理依赖的编辑器组件。
 */
export abstract class RangeManagerBase {
  /** 编辑器绘制主对象，提供文档数据、渲染和运行时服务。 */
  protected draw: Draw
  /** 编辑器运行配置。 */
  protected options: Required<IEditorOption>
  /** 内部原始编辑范围。 */
  protected range: IRange
  /** 外部监听器集合。 */
  protected listener: Listener
  /** 编辑器事件总线。 */
  protected eventBus: EventBus<EventBusMap>
  /** 坐标服务，提供光标、元素位置和表格上下文。 */
  protected coordinate: DrawCoordinateService
  /** 历史管理器，提供撤销重做状态。 */
  protected historyManager: HistoryManager
  /** 当前输入默认样式。 */
  protected defaultStyle: IRangeElementStyle | null
  /** 表格选区投影服务，负责内部 range 到公开语义的转换。 */
  protected selectionProjectionService: TableSelectionProjectionService

  /** 从绘制主对象中初始化 range 管理依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.options = draw.getOptions()
    this.listener = draw.getListener()
    this.eventBus = draw.getEventBus()
    this.coordinate = draw.getCoordinate()
    this.historyManager = draw.getHistoryManager()
    this.range = {
      startIndex: -1,
      endIndex: -1
    }
    this.defaultStyle = null
    this.selectionProjectionService = new TableSelectionProjectionService(draw, {
      getRawRange: () => this.range,
      resolveActiveTableLeadingOffset: () => this.getActiveTableLeadingOffset(),
      resolveActiveTableFragmentOffset: (leadingOffset, cursorPosition) =>
        this.getActiveTableFragmentOffset(leadingOffset, cursorPosition)
    })
  }

  /** 解析当前表格单元格的前置占位偏移。 */
  protected abstract getActiveTableLeadingOffset(): number

  /** 解析当前表格分页碎片相对逻辑单元格的偏移。 */
  protected abstract getActiveTableFragmentOffset(
    leadingOffset: number,
    cursorPosition?: IElementPosition | null
  ): number
}
