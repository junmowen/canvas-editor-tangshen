import { DrawMutationService } from '../data/DrawMutationService'
import { DrawExportService } from '../data/DrawExportService'
import { DrawDataAccess } from '../data/DrawDataAccess'
import { DrawHistoryBridge } from '../history/DrawHistoryBridge'
import { DrawPageSetupService } from '../setup/DrawPageSetupService'
import { DrawValueService } from '../data/DrawValueService'
import { DrawCursorService } from '../cursor/DrawCursorService'
import { DrawViewportService } from '../viewport/DrawViewportService'
import { DrawExportStateService } from '../export/DrawExportStateService'
import { DrawStateQueryService } from '../query/DrawStateQueryService'
import { DrawMetricsService } from '../layout/DrawMetricsService'
import { DrawRenderFacadeService } from '../render/DrawRenderFacadeService'
import { DrawPainterService } from './DrawPainterService'
import { DrawLifecycleService } from './DrawLifecycleService'
import { TableLayoutSnapshotBuilder } from '../../table/layout/TableLayoutSnapshotBuilder'
import { TableLayoutSnapshotAccessor } from '../../table/layout/TableLayoutSnapshotAccessor'
import { RowLayoutEngine } from '../layout/RowLayoutEngine'
import { DrawLayoutPipeline } from '../layout/DrawLayoutPipeline'
import { RowRenderer } from '../render/RowRenderer'
import { PageRenderer } from '../render/PageRenderer'
import { DrawRenderPipeline } from '../render/DrawRenderPipeline'
import { DrawPostRenderEffects } from '../render/DrawPostRenderEffects'
import { RenderInvalidationManager } from '../../table/render/RenderInvalidationManager'
import { TableOverlayRenderer } from '../../table/render/TableOverlayRenderer'
import type { Draw } from '../Draw'

/**
 * Draw 内部 service / pipeline 注册表。
 *
 * 这个注册表只负责“流程型对象”的统一创建与持有，
 * 与 `DrawComponentRegistry` 形成分工：
 * - ComponentRegistry：偏重型对象、UI对象、粒子对象、事件对象
 * - ServiceRegistry：偏编排对象、桥接对象、流程管线、缓存/失效管理
 *
 * 这样做的价值：
 * 1. 降低 `Draw` 构造函数的装配噪音；
 * 2. 让内部 service 可以逐步通过 `draw.getServices()` 直接互访；
 * 3. 为后续继续缩小 `Draw` facade 表面积提供基础。
 */
export class DrawServiceRegistry {
  /** 表格快照构建器：负责从布局和位置数据生成表格逻辑快照。 */
  public readonly tableLayoutSnapshotBuilder: TableLayoutSnapshotBuilder
  /** 表格快照访问器：负责从快照中查询分页片段、逻辑单元格等信息。 */
  public readonly tableLayoutSnapshotAccessor: TableLayoutSnapshotAccessor
  /** 行布局引擎：负责把元素流排版成行。 */
  public readonly rowLayoutEngine: RowLayoutEngine
  /** 布局总管线：负责布局、分页、区域计算、搜索计算等流程编排。 */
  public readonly layoutPipeline: DrawLayoutPipeline
  /** 行渲染器：负责逐行绘制正文、控件、装饰效果等。 */
  public readonly rowRenderer: RowRenderer
  /** 页渲染器：负责分页模式下的整页渲染调度。 */
  public readonly pageRenderer: PageRenderer
  /** 渲染分发管线：负责 lazy/visible/immediate 三类渲染策略切换。 */
  public readonly renderPipeline: DrawRenderPipeline
  /** 渲染后副作用管线：负责选区样式、表格工具、事件回调等。 */
  public readonly postRenderEffects: DrawPostRenderEffects
  /** 渲染失效管理器：负责脏标记与帧渲染节流。 */
  public readonly renderInvalidationManager: RenderInvalidationManager
  /** 表格 overlay 渲染器：负责分页 overlay 层绘制。 */
  public readonly tableOverlayRenderer: TableOverlayRenderer
  /** 文档写操作服务。 */
  public readonly mutationService: DrawMutationService
  /** 导出服务。 */
  public readonly exportService: DrawExportService
  /** 数据访问服务。 */
  public readonly dataAccess: DrawDataAccess
  /** 历史桥接服务。 */
  public readonly historyBridge: DrawHistoryBridge
  /** 页面/模式设置服务。 */
  public readonly pageSetupService: DrawPageSetupService
  /** 值读写服务。 */
  public readonly valueService: DrawValueService
  /** 光标服务。 */
  public readonly cursorService: DrawCursorService
  /** 视口相关服务。 */
  public readonly viewportService: DrawViewportService
  /** 导出状态快照/恢复服务。 */
  public readonly exportStateService: DrawExportStateService
  /** 只读/禁用/模式状态判断服务。 */
  public readonly stateQueryService: DrawStateQueryService
  /** 尺寸、边距、字体、行距等度量服务。 */
  public readonly metricsService: DrawMetricsService
  /** render 门面服务：负责把主渲染流程从 `Draw` 中抽离。 */
  public readonly renderFacadeService: DrawRenderFacadeService
  /** 画笔相关服务。 */
  public readonly painterService: DrawPainterService
  /** 生命周期相关服务。 */
  public readonly lifecycleService: DrawLifecycleService

  /**
   * 统一初始化所有流程型 service。
   *
   * 注意：
   * 这些对象理论上都属于“运行时编排层”，
   * 因此放在同一个注册表中有助于后续减少 `Draw` 自己的字段数量。
   */
  constructor(draw: Draw) {
    this.tableLayoutSnapshotBuilder = new TableLayoutSnapshotBuilder(draw)
    this.tableLayoutSnapshotAccessor = new TableLayoutSnapshotAccessor(draw)
    this.rowLayoutEngine = new RowLayoutEngine(draw)
    this.layoutPipeline = new DrawLayoutPipeline(draw)
    this.rowRenderer = new RowRenderer(draw)
    this.pageRenderer = new PageRenderer(draw)
    this.renderPipeline = new DrawRenderPipeline(draw)
    this.postRenderEffects = new DrawPostRenderEffects(draw)
    this.renderInvalidationManager = new RenderInvalidationManager(draw)
    this.tableOverlayRenderer = new TableOverlayRenderer(draw)
    this.mutationService = new DrawMutationService(draw)
    this.exportService = new DrawExportService(draw)
    this.dataAccess = new DrawDataAccess(draw)
    this.historyBridge = new DrawHistoryBridge(draw)
    this.pageSetupService = new DrawPageSetupService(draw)
    this.valueService = new DrawValueService(draw)
    this.cursorService = new DrawCursorService(draw)
    this.viewportService = new DrawViewportService(draw)
    this.exportStateService = new DrawExportStateService(draw)
    this.stateQueryService = new DrawStateQueryService(draw)
    this.metricsService = new DrawMetricsService(draw)
    this.renderFacadeService = new DrawRenderFacadeService(draw)
    this.painterService = new DrawPainterService(draw)
    this.lifecycleService = new DrawLifecycleService(draw)
  }
}
