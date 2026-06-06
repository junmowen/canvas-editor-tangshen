import { DeepRequired } from '../../../interface/Common'
import {
  IEditorData,
  IEditorOption,
  IRuntimeEditorData
} from '../../../interface/Editor'
import { IElement, IElementStyle } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { ITypesettingLayoutSnapshot } from '../../../interface/TypesettingLayout'
import { ITableLayoutSnapshot } from '../../modules/table/layout/TableLayoutSnapshotTypes'
import { EditorMode } from '../../../dataset/enum/Editor'
import { IPainterOption } from '../../../interface/Draw'
import { deepClone } from '../../../utils'
import {
  ArrayDocumentTextStore,
  IDocumentTextStore
} from '../data/DocumentTextStore'

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
  /** 正文主数据存储，当前仍由数组实现托管。 */
  private documentTextStore: IDocumentTextStore
  /** 最近一次布局计算后的原始行列表。 */
  private rowList: IRow[]
  /** 最近一次分页后的页行列表。 */
  private pageRowList: IRow[][]
  /** 当前布局所使用的扁平元素列表，通常来自分页后的展开结果。 */
  private layoutElementList: IElement[]
  /** 段落块/栏/页排版中间层快照，供后续规则和调试读取。 */
  private typesettingLayoutSnapshot: ITypesettingLayoutSnapshot | null
  /** 表格布局快照版本号，用于标识缓存是否失效。 */
  private tableLayoutSnapshotVersion: number
  /** 表格布局快照缓存。 */
  private tableLayoutSnapshot: ITableLayoutSnapshot | null
  /** 当前画笔样式状态，用于格式刷等特性。 */
  private painterStyle: IElementStyle | null
  /** 当前画笔附加选项。 */
  private painterOptions: IPainterOption | null
  /** 打印模式下缓存的 header/main/footer 原始数据。 */
  private printModeData: IRuntimeEditorData | null
  /** 新底层文档树快照，作为后续替换布局和渲染的统一数据源。 */
  private editor2DocumentTree: IEditorData

  /**
   * 初始化运行时主状态。
   *
   * @param options 已合并并补齐默认值的编辑器配置
   * @param data 初始文档数据
   */
  constructor(options: DeepRequired<IEditorOption>, data: IEditorData) {
    this.mode = options.mode
    this.options = options
    this.documentTextStore = new ArrayDocumentTextStore(data.main)
    this.rowList = []
    this.pageRowList = []
    this.layoutElementList = []
    this.typesettingLayoutSnapshot = null
    this.tableLayoutSnapshotVersion = 0
    this.tableLayoutSnapshot = null
    this.painterStyle = null
    this.painterOptions = null
    this.printModeData = null
    this.editor2DocumentTree = deepClone(data)
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
    return this.documentTextStore.toElementList()
  }

  /** 替换正文主元素列表。 */
  public replaceMainElementList(payload: IElement[]) {
    this.documentTextStore.replaceAll(payload)
  }

  /** 替换文档样式集合。 */
  public replaceDocumentStyles(payload: IEditorData['styles']) {
    if (payload?.length) {
      this.editor2DocumentTree.styles = deepClone(payload)
    } else {
      delete this.editor2DocumentTree.styles
    }
  }

  /** 获取正文数据存储适配器，用于后续数据结构 mirror 和统计。 */
  public getDocumentTextStore(): IDocumentTextStore {
    return this.documentTextStore
  }

  /** 获取正文数据存储统计，供压测和后续 mirror 对比读取。 */
  public getDocumentTextStoreStats() {
    return this.documentTextStore.getStats()
  }

  /** 重置正文数据 store 观测统计，不修改正文内容。 */
  public resetDocumentTextStoreStats() {
    this.documentTextStore.resetStats()
  }

  /** 获取新底层文档树快照。 */
  public getEditor2DocumentTree(): IEditorData {
    return this.editor2DocumentTree
  }

  /**
   * 用旧编辑器数据同步新底层文档树。
   *
   * 这里只同步数据结构，不掺入旧渲染状态。
   */
  public syncEditor2DocumentTree(payload: IEditorData): void {
    this.editor2DocumentTree = deepClone(payload)
  }

  /** 获取最近一次布局后的原始行列表。 */
  public getRuntimeRowList(): IRow[] {
    return this.rowList
  }

  /** 获取分页后的页行列表。 */
  public getPageRowList(): IRow[][] {
    return this.pageRowList
  }

  /** 获取最近一次布局生成的段落块/栏/页排版中间层快照。 */
  public getTypesettingLayoutSnapshot(): ITypesettingLayoutSnapshot | null {
    return this.typesettingLayoutSnapshot
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
      : this.getOriginalMainElementList()
  }

  /**
   * 批量替换布局相关状态。
   *
   * 这是布局流水线提交结果的统一入口，
   * 用来避免在 `Draw` 上分散写入多个字段。
   */
  public replaceLayoutState(payload: {
    /** 行列表，保存排版后的行结构。 */
    rowList: IRow[]
    /** 页面行列表，保存当前页排版后的行信息。 */
    pageRowList: IRow[][]
    /** 布局元素列表，保存参与本轮排版的元素序列。 */
    layoutElementList: IElement[]
    /** 段落块/栏/页排版中间层快照。 */
    typesettingLayoutSnapshot?: ITypesettingLayoutSnapshot | null
    /** 表格布局snapshotversion数值，用于当前布局、统计或索引计算。 */
    tableLayoutSnapshotVersion: number
    tableLayoutSnapshot: ITableLayoutSnapshot | null
  }) {
    this.rowList = payload.rowList
    this.pageRowList = payload.pageRowList
    this.layoutElementList = payload.layoutElementList
    this.typesettingLayoutSnapshot =
      payload.typesettingLayoutSnapshot === undefined
        ? this.typesettingLayoutSnapshot
        : payload.typesettingLayoutSnapshot
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
  public getPrintModeData(): IRuntimeEditorData | null {
    return this.printModeData
  }

  /** 替换打印模式缓存数据。 */
  public replacePrintModeData(payload: IRuntimeEditorData | null) {
    this.printModeData = payload
  }
}
