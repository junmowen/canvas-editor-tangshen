import { DeepRequired } from '../../../interface/Common'
import { IEditorData, IEditorOption } from '../../../interface/Editor'
import { IElement, IElementStyle } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { ITableLayoutSnapshot } from '../../table/layout/TableLayoutSnapshotTypes'
import { EditorMode } from '../../../dataset/enum/Editor'
import { IPainterOption } from '../../../interface/Draw'

/**
 * Draw 运行时主状态容器。
 *
 * 设计目标：
 * 1. 把原本直接散落在 `Draw` 类上的可变状态集中托管；
 * 2. 让 `Draw` 本身逐步退化为门面，而不是再承担大而杂的状态持有职责；
 * 3. 为后续继续削减 facade getter 提供稳定的内部状态来源。
 *
 * 这里存放的都是“主文档运行时状态”，而不是重型对象实例：
 * - 编辑模式
 * - 编辑器配置
 * - 主元素列表
 * - 布局结果
 * - 表格快照缓存
 * - 画笔状态
 * - 打印态数据
 */
export class DrawRuntime {
  /** 当前编辑器运行模式，例如设计模式、只读模式、打印模式等。 */
  private mode: EditorMode
  /** 合并后的完整编辑器配置。 */
  private options: DeepRequired<IEditorOption>
  /** 正文主元素列表，是编辑器最核心的数据源。 */
  private elementList: IElement[]
  /** 最近一次布局计算后的原始行列表。 */
  private rowList: IRow[]
  /** 最近一次分页后的页行列表。 */
  private pageRowList: IRow[][]
  /** 当前布局所使用的扁平元素列表，通常来自分页后的展开结果。 */
  private layoutElementList: IElement[]
  /** 表格布局快照版本号，用于标识缓存是否失效。 */
  private tableLayoutSnapshotVersion: number
  /** 表格布局快照缓存。 */
  private tableLayoutSnapshot: ITableLayoutSnapshot | null
  /** 当前画笔样式状态，用于格式刷等特性。 */
  private painterStyle: IElementStyle | null
  /** 当前画笔附加选项。 */
  private painterOptions: IPainterOption | null
  /** 打印模式下缓存的 header/main/footer 原始数据。 */
  private printModeData: Required<IEditorData> | null

  /**
   * 初始化运行时主状态。
   *
   * @param options 已合并并补齐默认值的编辑器配置
   * @param data 初始文档数据
   */
  constructor(options: DeepRequired<IEditorOption>, data: IEditorData) {
    this.mode = options.mode
    this.options = options
    this.elementList = data.main
    this.rowList = []
    this.pageRowList = []
    this.layoutElementList = []
    this.tableLayoutSnapshotVersion = 0
    this.tableLayoutSnapshot = null
    this.painterStyle = null
    this.painterOptions = null
    this.printModeData = null
  }

  /** 获取当前运行模式。 */
  public getMode(): EditorMode {
    return this.mode
  }

  /**
   * 替换运行模式。
   *
   * 注意这里会同时同步 `options.mode`，
   * 因为很多下游逻辑仍通过配置对象读取模式信息。
   */
  public replaceMode(payload: EditorMode) {
    this.mode = payload
    this.options.mode = payload
  }

  /** 获取完整配置。 */
  public getOptions(): DeepRequired<IEditorOption> {
    return this.options
  }

  /** 获取正文主元素列表。 */
  public getOriginalMainElementList(): IElement[] {
    return this.elementList
  }

  /** 替换正文主元素列表。 */
  public replaceMainElementList(payload: IElement[]) {
    this.elementList = payload
  }

  /** 获取最近一次布局后的原始行列表。 */
  public getRuntimeRowList(): IRow[] {
    return this.rowList
  }

  /** 获取分页后的页行列表。 */
  public getPageRowList(): IRow[][] {
    return this.pageRowList
  }

  /**
   * 获取当前布局所使用的主元素列表。
   *
   * 如果分页布局已经产出扁平展开后的 `layoutElementList`，
   * 优先返回该结果；否则回退到原始主元素列表。
   */
  public getLayoutMainElementList(): IElement[] {
    return this.layoutElementList.length
      ? this.layoutElementList
      : this.elementList
  }

  /**
   * 批量替换布局相关状态。
   *
   * 这是布局流水线提交结果的统一入口，
   * 用来避免在 `Draw` 上分散写入多个字段。
   */
  public replaceLayoutState(payload: {
    rowList: IRow[]
    pageRowList: IRow[][]
    layoutElementList: IElement[]
    tableLayoutSnapshotVersion: number
    tableLayoutSnapshot: ITableLayoutSnapshot | null
  }) {
    this.rowList = payload.rowList
    this.pageRowList = payload.pageRowList
    this.layoutElementList = payload.layoutElementList
    this.tableLayoutSnapshotVersion = payload.tableLayoutSnapshotVersion
    this.tableLayoutSnapshot = payload.tableLayoutSnapshot
  }

  /** 获取当前表格快照版本。 */
  public getTableLayoutSnapshotVersion(): number {
    return this.tableLayoutSnapshotVersion
  }

  /** 获取表格布局快照缓存。 */
  public getTableLayoutSnapshot(): ITableLayoutSnapshot | null {
    return this.tableLayoutSnapshot
  }

  /** 替换表格布局快照缓存。 */
  public replaceTableLayoutSnapshot(payload: ITableLayoutSnapshot | null) {
    this.tableLayoutSnapshot = payload
  }

  /** 获取当前画笔样式。 */
  public getPainterStyle(): IElementStyle | null {
    return this.painterStyle
  }

  /** 获取当前画笔附加选项。 */
  public getPainterOptions(): IPainterOption | null {
    return this.painterOptions
  }

  /**
   * 替换画笔状态。
   *
   * 通常由格式刷或样式复制相关功能调用。
   */
  public replacePainterState(
    painterStyle: IElementStyle | null,
    painterOptions: IPainterOption | null
  ) {
    this.painterStyle = painterStyle
    this.painterOptions = painterOptions
  }

  /** 获取打印模式缓存数据。 */
  public getPrintModeData(): Required<IEditorData> | null {
    return this.printModeData
  }

  /** 替换打印模式缓存数据。 */
  public replacePrintModeData(payload: Required<IEditorData> | null) {
    this.printModeData = payload
  }
}
