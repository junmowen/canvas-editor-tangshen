import { DeepRequired } from '../../interface/Common'
import { IEditorOption } from '../../interface/Editor'
import { Control } from '../draw/control/Control'
import { Draw } from '../draw/Draw'
import { Search } from '../draw/interactive/Search'
import { TableOperate } from '../draw/particle/table/TableOperate'
import { CanvasEvent } from '../event/CanvasEvent'
import { HistoryManager } from '../history/HistoryManager'
import { I18n } from '../i18n/I18n'
import { Position } from '../position/Position'
import { RangeManager } from '../range/RangeManager'
import { isEditorDisabled } from '../utils/editorState'
import { WorkerManager } from '../worker/WorkerManager'
import { Zone } from '../zone/Zone'

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
  /** 位置管理器，维护光标、元素和表格上下文。 */
  protected position: Position
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
    curIndex: number
    editIndex: number
    deletedCount: number
    chunk: unknown
    flushTimer: number | null
  } | null = null

  /** 从绘制主对象中提取命令层需要复用的组件引用。 */
  constructor(draw: Draw) {
    const components = draw.getComponents()
    this.draw = draw
    this.range = components.range
    this.position = components.position
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
    isIgnoreDisabledRule?: boolean
  }): boolean {
    return !options?.isIgnoreDisabledRule && this.isEditorDisabled()
  }
}
