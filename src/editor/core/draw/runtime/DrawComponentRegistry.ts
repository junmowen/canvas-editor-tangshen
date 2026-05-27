import { Cursor } from '../../cursor/Cursor'
import { CanvasEvent } from '../../event/CanvasEvent'
import { GlobalEvent } from '../../event/GlobalEvent'
import { HistoryManager } from '../../history/HistoryManager'
import { Position } from '../../position/Position'
import { RangeManager } from '../../range/RangeManager'
import { Background } from '../frame/Background'
import { Highlight } from '../richtext/Highlight'
import { Margin } from '../frame/Margin'
import { Search } from '../interactive/Search'
import { Strikeout } from '../richtext/Strikeout'
import { Underline } from '../richtext/Underline'
import { ImageParticle } from '../particle/ImageParticle'
import { LaTexParticle } from '../particle/latex/LaTexParticle'
import { TextParticle } from '../particle/TextParticle'
import { PageNumber } from '../frame/PageNumber'
import { ScrollObserver } from '../../observer/ScrollObserver'
import { SelectionObserver } from '../../observer/SelectionObserver'
import { TableParticle } from '../particle/table/TableParticle'
import { TableTool } from '../particle/table/TableTool'
import { HyperlinkParticle } from '../particle/HyperlinkParticle'
import { Header } from '../frame/Header'
import { SuperscriptParticle } from '../particle/SuperscriptParticle'
import { SubscriptParticle } from '../particle/SubscriptParticle'
import { SeparatorParticle } from '../particle/SeparatorParticle'
import { PageBreakParticle } from '../particle/PageBreakParticle'
import { Watermark } from '../frame/Watermark'
import { Control } from '../control/Control'
import { CheckboxParticle } from '../particle/CheckboxParticle'
import { RadioParticle } from '../particle/RadioParticle'
import { WorkerManager } from '../../worker/WorkerManager'
import { Previewer } from '../particle/previewer/Previewer'
import { DateParticle } from '../particle/date/DateParticle'
import { BlockParticle } from '../particle/block/BlockParticle'
import { I18n } from '../../i18n/I18n'
import { ImageObserver } from '../../observer/ImageObserver'
import { Zone } from '../../zone/Zone'
import { Footer } from '../frame/Footer'
import { ListParticle } from '../particle/ListParticle'
import { Placeholder } from '../frame/Placeholder'
import { Group } from '../interactive/Group'
import { LineBreakParticle } from '../particle/LineBreakParticle'
import { MouseObserver } from '../../observer/MouseObserver'
import { LineNumber } from '../frame/LineNumber'
import { PageBorder } from '../frame/PageBorder'
import { Actuator } from '../../actuator/Actuator'
import { TableHitTestService } from '../../table/hittest/TableHitTestService'
import { TableNavigationService } from '../../table/navigation/TableNavigationService'
import type { Draw } from '../Draw'
import { Badge } from '../frame/Badge'
import { Area } from '../interactive/Area'
import { TableOperate } from '../particle/table/TableOperate'
import { IEditorData } from '../../../interface/Editor'

/**
 * Draw 重型组件注册表。
 *
 * 这个注册表专门负责"实例创建成本低、职责偏对象化、构造时存在明显依赖顺序"的组件统一装配。
 *
 * 与 `DrawServiceRegistry` 的分工：
 * 1. `DrawComponentRegistry` 负责真实组件对象、粒子对象、观察器、事件对象、管理器实例；
 * 2. `DrawServiceRegistry` 负责流程编排类、桥接类、管线类、状态同步类；
 * 3. `DrawRuntime` 只负责持有运行时主状态，不负责实例装配。
 *
 * 这个文件是当前整轮重构里"构造期链路"最敏感的部分，原因在于：
 * - 很多组件在构造时就会立即通过 `draw.getXxx()` 反查别的对象；
 * - 因此初始化顺序不是实现细节，而是架构约束；
 * - 为了避免构造期空引用，这里需要在关键节点把对象提前写入 bootstrap fallback。
 *
 * 换句话说，这个注册表不仅是"把对象 new 出来"，
 * 也是整个编辑器启动链的依赖拓扑落地点。
 */
export class DrawComponentRegistry {
  /**
   * 国际化实例。
   * 很多 UI / 粒子会在构造时立即读取文案，因此需要尽早可用。
   */
  public readonly i18n: I18n

  /**
   * 画布事件总入口，负责鼠标、键盘、拖拽等编辑交互。
   */
  public readonly canvasEvent: CanvasEvent

  /**
   * 全局事件协调器，负责 blur / wheel / visibility / dpr 等跨文档事件。
   */
  public readonly globalEvent: GlobalEvent

  /**
   * 光标对象，负责光标绘制、代理输入、可视区滚动等行为。
   */
  public readonly cursor: Cursor

  /**
   * 选区管理器，负责内部编辑边界、公开 range 投影和选区样式。
   */
  public readonly range: RangeManager

  /**
   * 页面边距装饰渲染器。
   */
  public readonly margin: Margin

  /**
   * 页面背景渲染器。
   */
  public readonly background: Background

  /**
   * 徽章/徽标渲染器。
   */
  public readonly badge: Badge

  /**
   * 查找替换交互对象。
   */
  public readonly search: Search

  /**
   * 分组渲染与分组信息维护对象。
   */
  public readonly group: Group

  /**
   * 区域对象，负责 area 结构的计算与渲染。
   */
  public readonly area: Area

  /**
   * 下划线富文本装饰对象。
   */
  public readonly underline: Underline

  /**
   * 删除线富文本装饰对象。
   */
  public readonly strikeout: Strikeout

  /**
   * 高亮富文本装饰对象。
   */
  public readonly highlight: Highlight

  /**
   * 历史管理器，负责 undo / redo 栈维护。
   */
  public readonly historyManager: HistoryManager

  /**
   * 图片预览与缩放控制对象。
   */
  public readonly previewer: Previewer

  /**
   * 图片粒子对象，负责图片测量、渲染、浮动图行为。
   */
  public readonly imageParticle: ImageParticle

  /**
   * LaTeX 粒子对象。
   */
  public readonly laTexParticle: LaTexParticle

  /**
   * 文本粒子对象。
   */
  public readonly textParticle: TextParticle

  /**
   * 表格粒子对象，负责表格渲染辅助与几何信息计算。
   */
  public readonly tableParticle: TableParticle

  /**
   * 表格工具对象，负责表格顶部/侧边交互工具的渲染与交互。
   */
  public readonly tableTool: TableTool

  /**
   * 表格结构操作对象，负责增删行列、拆并单元格等表格结构修改。
   */
  public readonly tableOperate: TableOperate

  /**
   * 页码渲染器。
   */
  public readonly pageNumber: PageNumber

  /**
   * 行号渲染器。
   */
  public readonly lineNumber: LineNumber

  /**
   * 水印渲染器。
   */
  public readonly waterMark: Watermark

  /**
   * 占位提示渲染器。
   */
  public readonly placeholder: Placeholder

  /**
   * 页眉对象。
   */
  public readonly header: Header

  /**
   * 页脚对象。
   */
  public readonly footer: Footer

  /**
   * 超链接粒子对象。
   */
  public readonly hyperlinkParticle: HyperlinkParticle

  /**
   * 日期粒子对象。
   */
  public readonly dateParticle: DateParticle

  /**
   * 分隔线粒子对象。
   */
  public readonly separatorParticle: SeparatorParticle

  /**
   * 分页符粒子对象。
   */
  public readonly pageBreakParticle: PageBreakParticle

  /**
   * 上标粒子对象。
   */
  public readonly superscriptParticle: SuperscriptParticle

  /**
   * 下标粒子对象。
   */
  public readonly subscriptParticle: SubscriptParticle

  /**
   * 复选框粒子对象。
   */
  public readonly checkboxParticle: CheckboxParticle

  /**
   * 单选框粒子对象。
   */
  public readonly radioParticle: RadioParticle

  /**
   * 块级扩展粒子对象。
   */
  public readonly blockParticle: BlockParticle

  /**
   * 列表粒子对象。
   */
  public readonly listParticle: ListParticle

  /**
   * 换行粒子对象。
   */
  public readonly lineBreakParticle: LineBreakParticle

  /**
   * 控件总协调对象。
   */
  public readonly control: Control

  /**
   * 页面边框渲染器。
   */
  public readonly pageBorder: PageBorder

  /**
   * Worker 协调器。
   */
  public readonly workerManager: WorkerManager

  /**
   * 滚动观察器。
   */
  public readonly scrollObserver: ScrollObserver

  /**
   * 原生 Selection 观察器。
   */
  public readonly selectionObserver: SelectionObserver

  /**
   * 图片异步加载观察器。
   */
  public readonly imageObserver: ImageObserver

  /**
   * 位置计算与定位上下文对象。
   */
  public readonly position: Position

  /**
   * 页眉/正文/页脚区域对象。
   */
  public readonly zone: Zone

  /**
   * 表格命中测试服务。
   */
  public readonly tableHitTestService: TableHitTestService

  /**
   * 表格导航服务。
   */
  public readonly tableNavigationService: TableNavigationService

  /**
   * 构造所有重型组件实例。
   *
   * 这里最重要的不是“创建了哪些对象”，而是“按什么顺序创建”：
   *
   * 1. 先创建最基础的上下文对象，例如 `HistoryManager`、`Position`、`Zone`；
   * 2. 在某些对象创建后，立刻调用 `draw.setBootstrapXxx(...)` 写回 bootstrap fallback；
   * 3. 再创建那些会在构造时通过 `draw.getXxx()` 反查依赖的对象；
   * 4. 最后再挂接观察器、事件对象、worker 等外围设施。
   *
   * 这套顺序不是为了“好看”，而是为了保证：
   * - 在 `DrawComponentRegistry` 还未整体赋值给 `draw.components` 之前，
   *   构造链内部仍然可以通过 facade getter 安全拿到已创建好的关键对象。
   *
   * @param draw 当前 Draw 门面
   * @param data 初始文档数据，主要用于 header/footer 初始化
   * @param i18n 已经在 Draw 构造早期创建好的国际化实例
   */
  constructor(
    draw: Draw,
    data: IEditorData,
    i18n: I18n
  ) {
    // i18n 最先落位，因为 Zone / DatePicker / PageBreak 等对象会立即消费文案。
    this.i18n = i18n

    // 历史与定位是后续大部分对象的基础依赖，因此优先初始化。
    this.historyManager = new HistoryManager(draw)
    // 立刻写回 bootstrap，确保 RangeManager 等后续对象构造时能拿到它。
    draw.setBootstrapHistoryManager(this.historyManager)
    this.position = new Position(draw)
    draw.setBootstrapPosition(this.position)

    // Zone 依赖 i18n 与容器信息，且会影响 header/footer/selection 等后续逻辑。
    this.zone = new Zone(draw, i18n)
    draw.setBootstrapZone(this.zone)

    // header/footer 在构造链中需要尽早可见，因为 Zone、Position、Metrics 等都可能引用它们。
    this.header = new Header(draw, data.header)
    draw.setBootstrapHeader(this.header)
    this.footer = new Footer(draw, data.footer)
    draw.setBootstrapFooter(this.footer)

    // RangeManager 会在构造时反查 Position / HistoryManager，因此必须放在二者之后。
    this.range = new RangeManager(draw)
    draw.setBootstrapRange(this.range)

    // 以下对象大多是渲染相关组件，依赖已经逐渐收敛到稳定状态，可以顺序创建。
    this.margin = new Margin(draw)
    this.background = new Background(draw)
    this.badge = new Badge(draw)
    this.search = new Search(draw)
    this.group = new Group(draw)
    this.area = new Area(draw)
    this.underline = new Underline(draw)
    this.strikeout = new Strikeout(draw)
    this.highlight = new Highlight(draw)

    // Previewer 需要在 GlobalEvent 之前初始化，因为 GlobalEvent 会直接持有它。
    this.previewer = new Previewer(draw)

    // 图片粒子需要 bootstrap，是因为 GlobalEvent / 某些拖拽链路会在构造期用到它。
    this.imageParticle = new ImageParticle(draw)
    draw.setBootstrapImageParticle(this.imageParticle)
    this.laTexParticle = new LaTexParticle(draw)
    this.textParticle = new TextParticle(draw)

    // 表格相关对象顺序必须保持：
    // 1. TableParticle
    // 2. TableTool
    // 3. TableOperate
    // 否则构造时的相互引用会出现空依赖。
    this.tableParticle = new TableParticle(draw)
    draw.setBootstrapTableParticle(this.tableParticle)
    this.tableTool = new TableTool(draw)
    this.tableOperate = new TableOperate(draw, {
      range: this.range,
      tableTool: this.tableTool,
      tableParticle: this.tableParticle,
      options: draw.getRuntime().getOptions()
    })

    // 下面继续初始化页面装饰与粒子对象。
    this.pageNumber = new PageNumber(draw)
    this.lineNumber = new LineNumber(draw)
    this.waterMark = new Watermark(draw)
    this.placeholder = new Placeholder(draw)

    // 超链接 / 日期粒子在部分构造链和全局事件里也会被立刻消费，因此保留 bootstrap。
    this.hyperlinkParticle = new HyperlinkParticle(draw)
    draw.setBootstrapHyperlinkParticle(this.hyperlinkParticle)
    this.dateParticle = new DateParticle(draw, i18n)
    this.separatorParticle = new SeparatorParticle(draw)
    this.pageBreakParticle = new PageBreakParticle(draw, i18n)
    this.superscriptParticle = new SuperscriptParticle()
    this.subscriptParticle = new SubscriptParticle()
    this.checkboxParticle = new CheckboxParticle(draw)
    this.radioParticle = new RadioParticle(draw)
    this.blockParticle = new BlockParticle(draw)
    this.listParticle = new ListParticle(draw)
    this.lineBreakParticle = new LineBreakParticle(draw)

    // Control 需要较早可见，因为很多输入、粘贴、全局事件都依赖它。
    this.control = new Control(draw)
    draw.setBootstrapControl(this.control)
    this.pageBorder = new PageBorder(draw)

    // 命中测试服务也保留 bootstrap，因为运行期某些事件工具会直接查询它。
    this.tableHitTestService = new TableHitTestService(draw)
    draw.setBootstrapTableHitTestService(this.tableHitTestService)
    this.tableNavigationService = new TableNavigationService(draw)

    // 观察器通常放在核心对象之后创建，避免它们提早监听到尚未稳定的上下文。
    this.scrollObserver = new ScrollObserver(draw)
    this.selectionObserver = new SelectionObserver(draw)
    this.imageObserver = new ImageObserver()
    new MouseObserver(draw)

    // CanvasEvent / Cursor / GlobalEvent 是事件链的核心，
    // 三者之间存在显式依赖，因此统一放在最后一组初始化。
    this.canvasEvent = new CanvasEvent(draw)
    this.cursor = new Cursor(
      draw,
      this.canvasEvent.getInputController(),
      this.canvasEvent.getClipboardController()
    )
    draw.setBootstrapCursor(this.cursor)
    // CanvasEvent 在 GlobalEvent 注册之前先挂接 canvas 级事件。
    this.canvasEvent.register()
    this.globalEvent = new GlobalEvent(draw, this.canvasEvent, {
      range: this.range,
      previewer: this.previewer,
      tableTool: this.tableTool,
      hyperlinkParticle: this.hyperlinkParticle,
      control: this.control,
      dateParticle: this.dateParticle,
      imageParticle: this.imageParticle
    })
    // GlobalEvent 负责 document/window 级别事件，最后再注册。
    this.globalEvent.register()

    // Worker 与执行器属于更外围的设施，放在所有核心组件之后最稳妥。
    this.workerManager = new WorkerManager(draw)
    new Actuator(draw)
  }
}
