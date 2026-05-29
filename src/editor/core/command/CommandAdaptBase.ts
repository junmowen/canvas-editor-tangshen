import { DeepRequired } from '../../interface/Common'
import { IEditorOption } from '../../interface/Editor'
import { Control } from '../modules/control/runtime/Control'
import { Draw } from '../draw/Draw'
import { Search } from '../modules/search/runtime/Search'
import { TableOperate } from '../modules/table/particle/TableOperate'
import { CanvasEvent } from '../event/CanvasEvent'
import { HistoryManager } from '../runtime/history/HistoryManager'
import { I18n } from '../extension/i18n/I18n'
import { RangeManager } from '../range/RangeManager'
import { isEditorDisabled } from '../shared/utils/editorState'
import { WorkerManager } from '../runtime/worker/WorkerManager'
import { Zone } from '../runtime/zone/Zone'
import type { DrawCoordinateService } from '../draw/coordinate/DrawCoordinateService'

/**
 * 命令适配层基础上下文。
 *
 * 负责缓存编辑器主链组件，具体命令实现按职责拆到各个 CommandAdapt* 模块。
 */
export class CommandAdaptBase {
  /** 编辑器绘制主对象，提供数据访问、渲染和服务入口。 */
  protected draw: Draw
  /** 选区管理器，维护当前编辑范围。 */
  protected range: RangeManager
  /** 坐标服务，维护光标、元素位置和表格上下文。 */
  protected coordinate: DrawCoordinateService
  /** 历史管理器，负责撤销重做栈。 */
  protected historyManager: HistoryManager
  /** 画布事件门面，承接剪贴板、选区等事件命令。 */
  protected canvasEvent: CanvasEvent
  /** 运行时编辑器配置。 */
  protected options: DeepRequired<IEditorOption>
  /** 控件管理器，负责控件值、属性和状态同步。 */
  protected control: Control
  /** Worker 管理器，负责异步文档能力。 */
  protected workerManager: WorkerManager
  /** 搜索管理器，负责搜索结果和导航状态。 */
  protected searchManager: Search
  /** 国际化实例，负责语言文案转换。 */
  protected i18n: I18n
  /** 区域管理器，记录当前编辑区域。 */
  protected zone: Zone
  /** 表格操作对象，封装表格结构和样式变更。 */
  protected tableOperate: TableOperate
  /** 程序化连续退格批次，合并同一事件循环内的多次删除渲染。 */
  protected pendingProgrammaticBackspaceBatch: {
    /** 当前元素索引，用于记录遍历或命中过程的位置。 */
    curIndex: number
    /** 编辑索引，用于定位本次修改发生的位置。 */
    editIndex: number
    /** 已删除数量，用于累加实际删除的元素个数。 */
    deletedCount: number
    /** 分页块对象，保存一段可复用的页面布局结果。 */
    chunk: unknown
    /** flushtimer数值，用于当前布局、统计或索引计算。 */
    flushTimer: number | null
  } | null = null

  /** 从绘制主对象中提取命令层需要复用的组件引用。 */
  constructor(draw: Draw) {
    const components = draw.getComponents()
    this.draw = draw
    this.range = components.range
    this.coordinate = draw.getCoordinate()
    this.historyManager = components.historyManager
    this.canvasEvent = components.canvasEvent
    this.options = draw.getRuntime().getOptions()
    this.control = components.control
    this.workerManager = components.workerManager
    this.searchManager = components.search
    this.i18n = components.i18n
    this.zone = components.zone
    this.tableOperate = components.tableOperate
  }

  /** 判断当前编辑器是否处于只读或禁用状态。 */
  protected isEditorDisabled(): boolean {
    return isEditorDisabled(this.draw)
  }

  /** 判断当前命令是否应被只读/禁用规则拦截。 */
  protected isCommandDisabled(options?: {
    /** 是否忽略禁用规则，用于允许特殊场景绕过控件限制。 */
    isIgnoreDisabledRule?: boolean
  }): boolean {
    return !options?.isIgnoreDisabledRule && this.isEditorDisabled()
  }
}
