import { pickSurroundElementList } from '../../../utils/element'
import { ZERO } from '../../../dataset/constant/Common'
import { IDrawLayoutPatch } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { EditorMode, PageMode } from '../../../dataset/enum/Editor'
import { resolveScaledFloatImageRect } from '../../modules/image/position/ImagePositionPolicy'
import { isUnsafeParagraphPatchElement } from '../../modules/paragraph/layout/ParagraphPatchLayoutPolicy'
import {
  hasTableElementInRow,
  visitTableCellValueList
} from '../../modules/table/layout/TableRowLayoutPolicy'
import type { Draw } from '../Draw'
import { PagePartitioner } from './PagePartitioner'

/**
 * Draw 布局总管线。
 *
 * 负责把一次完整的 layout 计算过程串起来：
 * - header/footer 计算
 * - rowList 计算
 * - pageRowList 分页
 * - positionList 计算
 * - table snapshot 重建
 * - area/search/control 高亮计算
 */
export interface IDrawLayoutResult {
  /** 行列表，包含所有行的布局信息 */
  rowList: IRow[]
  /** 分页行列表，每个数组代表一页的行 */
  pageRowList: IRow[][]
  /** 布局元素列表，经过布局计算后的元素 */
  layoutElementList: IElement[]
  /** 主元素列表，可能包含分页后的元素 */
  mainElementList: IElement[]
  /** 表格布局快照版本号 */
  tableLayoutSnapshotVersion: number
  /** 连续页面高度（连续模式使用） */
  continuousPageHeight?: number
}

/**
 * 布局流水线统计。
 *
 * 用于区分整篇布局里到底卡在行布局、分页、位置、快照还是高亮计算。
 */
export interface IDrawLayoutPipelineStats {
  /** 累计布局次数。 */
  computeCount: number
  /** 最近一次整篇布局总耗时。 */
  lastDuration: number
  /** 累计整篇布局总耗时。 */
  totalDuration: number
  /** 平均整篇布局耗时。 */
  averageDuration: number
  /** 最大整篇布局耗时。 */
  maxDuration: number
  /** 行布局阶段耗时。 */
  lastRowLayoutDuration: number
  /** 分页阶段耗时。 */
  lastPartitionDuration: number
  /** 位置列表阶段耗时。 */
  lastPositionDuration: number
  /** 表格快照阶段耗时。 */
  lastSnapshotDuration: number
  /** 区域与搜索 / 控件高亮阶段耗时。 */
  lastHighlightDuration: number
}

/**
 * 布局总管线实现。
 *
 * 与具体测量、分页拆分、表格 fragment 处理不同，
 * 这个类更偏“编排者”，负责把布局结果统一提交回运行时。
 */
export class DrawLayoutPipeline {
  /** 分页拆分器，负责将行列表按页拆分 */
  private readonly pagePartitioner: PagePartitioner
  /** 累计布局次数。 */
  private computeCount: number
  /** 最近一次整篇布局总耗时。 */
  private lastDuration: number
  /** 累计整篇布局总耗时。 */
  private totalDuration: number
  /** 最大整篇布局耗时。 */
  private maxDuration: number
  /** 最近一次行布局耗时。 */
  private lastRowLayoutDuration: number
  /** 最近一次分页耗时。 */
  private lastPartitionDuration: number
  /** 最近一次位置列表耗时。 */
  private lastPositionDuration: number
  /** 最近一次表格快照耗时。 */
  private lastSnapshotDuration: number
  /** 最近一次区域与高亮耗时。 */
  private lastHighlightDuration: number

  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {
    // 初始化分页拆分器
    this.pagePartitioner = new PagePartitioner(draw)
    this.computeCount = 0
    this.lastDuration = 0
    this.totalDuration = 0
    this.maxDuration = 0
    this.lastRowLayoutDuration = 0
    this.lastPartitionDuration = 0
    this.lastPositionDuration = 0
    this.lastSnapshotDuration = 0
    this.lastHighlightDuration = 0
  }

  /**
   * 执行完整的布局计算。
   *
   * 包括页眉/页脚计算、行列表计算、分页拆分、位置列表计算、表格快照重建和高亮计算。
   *
   * @returns 布局计算结果
   */
  public compute(layoutPatch?: IDrawLayoutPatch): IDrawLayoutResult {
    const totalStartTime = performance.now()
    if (layoutPatch) {
      const patchResult = this.computePatch(layoutPatch)
      if (patchResult) {
        return patchResult
      }
    }
    // 获取编辑器配置信息
    const { header, footer } = this.draw.getRuntime().getOptions()
    // 获取主元素列表
    const mainElementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const featurePresence = this.scanFeaturePresence(mainElementList)
    // 获取内部宽度
    const innerWidth = this.draw.getInnerWidth()
    // 判断是否为分页模式
    const isPagingMode = this.draw.getIsPagingMode()
    // 计算下一个表格布局快照版本号
    const nextSnapshotVersion = this.draw.getTableLayoutSnapshotVersion() + 1

    // 清空浮动元素位置列表
    this.draw.getCoordinate().setFloatPositionList([])

    // 如果是分页模式，计算页眉和页脚
    if (isPagingMode || this.draw.getOptions().pageMode === PageMode.CONTINUITY) {
      // 计算页眉（如果未禁用）
      if (!header.disabled) {
        this.draw.getComponents().header.compute()
      } else {
        this.draw.getComponents().header.recovery()
      }
      // 计算页脚（如果未禁用）
      if (!footer.disabled) {
        this.draw.getComponents().footer.compute()
      } else {
        this.draw.getComponents().footer.recovery()
      }
    }

    // 获取页面边距信息
    const margins = this.draw.getMargins()
    // 获取页面高度
    const pageHeight = this.draw.getHeight()
    // 获取页眉的额外高度
    const extraHeight = this.draw.getComponents().header.getExtraHeight()
    // 获取正文外部高度
    const mainOuterHeight = this.draw.getMainOuterHeight()
    // 计算起始 X 坐标（左边距）
    const startX = margins[3]
    // 计算起始 Y 坐标（上边距 + 页眉额外高度）
    const startY = margins[0] + extraHeight
    // 获取包围元素列表
    const surroundElementList = pickSurroundElementList(mainElementList)

    // 计算行列表
    const rowLayoutStartTime = performance.now()
    const rowList = this.draw.computeRowList({
      startX,
      startY,
      pageHeight,
      mainOuterHeight,
      isPagingMode,
      innerWidth,
      surroundElementList,
      elementList: mainElementList
    })
    this.lastRowLayoutDuration = performance.now() - rowLayoutStartTime

    // 使用分页拆分器将行列表按页拆分
    const partitionStartTime = performance.now()
    const partitionResult = this.pagePartitioner.partitionRows(rowList, mainElementList)
    this.lastPartitionDuration = performance.now() - partitionStartTime

    // 替换主元素列表为分页后的元素列表
    this.draw.replaceMainElementList(partitionResult.mainElementList)
    // 替换布局状态
    this.draw.replaceLayoutState({
      rowList,
      pageRowList: partitionResult.pageRowList,
      layoutElementList: partitionResult.layoutElementList,
      tableLayoutSnapshotVersion: nextSnapshotVersion,
      tableLayoutSnapshot: null
    })
    // 计算位置列表
    const positionStartTime = performance.now()
    this.draw.getCoordinate().computePositionList()
    this.lastPositionDuration = performance.now() - positionStartTime
    const continuousPageHeight =
      partitionResult.continuousPageHeight !== undefined
        ? this.resolveContinuousPageHeight(partitionResult.continuousPageHeight)
        : undefined
    // 重建表格布局快照
    const snapshotStartTime = performance.now()
    this.draw.replaceTableLayoutSnapshot(
      featurePresence.hasTable
        ? this.draw.getServices().tableLayoutSnapshotBuilder.build({
            version: nextSnapshotVersion
          })
        : null
    )
    this.lastSnapshotDuration = performance.now() - snapshotStartTime
    // 完整布局提交后重建 chunk 索引，后续输入只需标记命中的 chunk。
    this.draw.getServices().documentChunkIndex.rebuild('full-layout')
    // 完整布局提交后重建表格父子 chunk 范围，供页级 rebalance 只读索引做近邻同步。
    this.draw.getServices().tableChunkRangeIndex.rebuild('full-layout')
    // 完整布局提交后同步重建表格单元格子 chunk，保证 td 局部索引和行切块一致。
    this.draw.getServices().tableCellChunkIndex.rebuild('full-layout')
    // 计算区域高亮
    const highlightStartTime = performance.now()
    if (featurePresence.hasArea) {
      this.draw.getComponents().area.compute()
    }

    // 如果不是打印模式，计算搜索和控制高亮
    if (this.draw.getMode() !== EditorMode.PRINT) {
      // 获取搜索关键词
      const searchKeyword = this.draw.getComponents().search.getSearchKeyword()
      // 如果有搜索关键词，计算搜索高亮
      if (searchKeyword) {
        this.draw.getComponents().search.compute(searchKeyword)
      }
      // 计算控件高亮列表
      if (featurePresence.hasControl) {
        this.draw.getComponents().control.computeHighlightList()
      }
    }
    this.lastHighlightDuration = performance.now() - highlightStartTime
    this.computeCount++
    this.lastDuration = performance.now() - totalStartTime
    this.totalDuration += this.lastDuration
    this.maxDuration = Math.max(this.maxDuration, this.lastDuration)

    // 返回布局计算结果
    return {
      rowList,
      pageRowList: partitionResult.pageRowList,
      layoutElementList: partitionResult.layoutElementList,
      mainElementList: partitionResult.mainElementList,
      tableLayoutSnapshotVersion: nextSnapshotVersion,
      continuousPageHeight
    }
  }

  private resolveContinuousPageHeight(baseHeight: number): number {
    if (this.draw.getIsPagingMode()) {
      return baseHeight
    }
    const bottomMargin = this.draw.getMargins()[2]
    let maxBottom = 0
    const visitPositionList = (positionList?: IElementPosition[]) => {
      if (!positionList?.length) {
        return
      }
      for (let i = 0; i < positionList.length; i++) {
        const position = positionList[i]
        if (!position) continue
        maxBottom = Math.max(
          maxBottom,
          position.coordinate.leftBottom[1],
          position.coordinate.rightBottom[1]
        )
      }
    }
    const visitElementList = (elementList: IElement[]) => {
      for (let i = 0; i < elementList.length; i++) {
        const element = elementList[i]
        visitTableCellValueList({
          element,
          tableIndex: i,
          visitor: ({ td }) => {
            visitPositionList(td.positionList)
            visitElementList(td.value || [])
          }
        })
      }
    }
    visitPositionList(this.draw.getCoordinate().getLayoutMainPositionList())
    visitElementList(this.draw.getObjectResolver().getLayoutMainElementList())
    const { scale } = this.draw.getRuntime().getOptions()
    this.draw.getCoordinate().getFloatPositionList().forEach(floatPosition => {
      const floatRect = resolveScaledFloatImageRect({
        element: floatPosition.element,
        scale
      })
      if (floatRect) {
        maxBottom = Math.max(
          maxBottom,
          floatRect.y + floatRect.height
        )
      }
    })
    return Math.max(baseHeight, Math.ceil(maxBottom + bottomMargin))
  }

  private scanFeaturePresence(elementList: IElement[]) {
    const result = {
      hasTable: false,
      hasArea: false,
      hasControl: false
    }
    const visit = (payload: IElement[]) => {
      for (let i = 0; i < payload.length; i++) {
        const element = payload[i]
        if (visitTableCellValueList({
          element,
          tableIndex: i,
          visitor: ({ td }) => visit(td.value || [])
        })) {
          result.hasTable = true
        }
        if (element.areaId) {
          result.hasArea = true
        }
        if (element.controlId) {
          result.hasControl = true
        }
        if (result.hasTable && result.hasArea && result.hasControl) {
          return
        }
      }
    }
    visit(elementList)
    return result
  }

  /** 计算 Patch 对应的布局或状态。 */
  private computePatch(layoutPatch: IDrawLayoutPatch): IDrawLayoutResult | null {
    if (layoutPatch.type !== 'text-input') {
      return null
    }
    const mainElementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const oldRowList = this.draw.getObjectResolver().getRowList()
    const oldPageRowList = this.draw.getPageRowList()
    if (
      !this.draw.getComponents().zone.isMainActive() ||
      !this.draw.getIsPagingMode() ||
      !mainElementList.length ||
      !oldRowList.length ||
      !oldPageRowList.length ||
      layoutPatch.insertCount !== 1
    ) {
      return null
    }
    const patchRow = oldRowList[layoutPatch.rowIndex]
    const oldPatchPageRows = oldPageRowList[layoutPatch.pageNo]
    if (
      !patchRow ||
      !oldPatchPageRows ||
      hasTableElementInRow(patchRow)
    ) {
      return null
    }
    const paragraphRange = this.getParagraphRange(mainElementList, layoutPatch.insertIndex)
    if (!paragraphRange) {
      return null
    }
    if (this.hasUnsafePatchElement(mainElementList, paragraphRange.start, paragraphRange.end)) {
      return null
    }
    const patchRowStartIndex = oldRowList.findIndex(
      row => row.startIndex >= paragraphRange.start
    )
    if (!~patchRowStartIndex) {
      return null
    }
    let patchRowEndIndex = patchRowStartIndex
    while (
      patchRowEndIndex < oldRowList.length &&
      oldRowList[patchRowEndIndex].startIndex <= paragraphRange.end
    ) {
      patchRowEndIndex++
    }
    const oldPatchRows = oldRowList.slice(patchRowStartIndex, patchRowEndIndex)
    if (!oldPatchRows.length) {
      return null
    }
    const {
      header,
      footer
    } = this.draw.getRuntime().getOptions()
    const isPagingMode = this.draw.getIsPagingMode()
    if (isPagingMode || this.draw.getOptions().pageMode === PageMode.CONTINUITY) {
      if (!header.disabled) {
        this.draw.getComponents().header.compute()
      } else {
        this.draw.getComponents().header.recovery()
      }
      if (!footer.disabled) {
        this.draw.getComponents().footer.compute()
      } else {
        this.draw.getComponents().footer.recovery()
      }
    }
    const margins = this.draw.getMargins()
    const startX = margins[3]
    const startY = margins[0] + this.draw.getComponents().header.getExtraHeight()
    const patchRows = this.draw.computeRowList({
      startX,
      startY,
      pageHeight: this.draw.getHeight(),
      mainOuterHeight: this.draw.getMainOuterHeight(),
      isPagingMode: false,
      isPagingPageMode: false,
      innerWidth: this.draw.getInnerWidth(),
      surroundElementList: [],
      elementList: mainElementList.slice(paragraphRange.start, paragraphRange.end + 1)
    })
    if (
      patchRows.length !== oldPatchRows.length ||
      patchRows.some((row, index) => {
        const oldRow = oldPatchRows[index]
        return (
          Math.abs(row.height - oldRow.height) > 0.01 ||
          Math.abs((row.offsetY || 0) - (oldRow.offsetY || 0)) > 0.01
        )
      })
    ) {
      return null
    }
    for (let rowIndex = 0; rowIndex < patchRows.length; rowIndex++) {
      const row = patchRows[rowIndex]
      const oldRow = oldPatchRows[rowIndex]
      row.startIndex += paragraphRange.start
      row.rowIndex = oldRow.rowIndex
      row.offsetY = oldRow.offsetY
      row.isPageBreak = oldRow.isPageBreak
      row.elementList.forEach(element => {
        element.left = element.left || 0
      })
    }
    const nextRowList = oldRowList.slice()
    nextRowList.splice(patchRowStartIndex, oldPatchRows.length, ...patchRows)
    const nextPageRowList = oldPageRowList.map(pageRows => pageRows.slice())
    let pageRowCursor = 0
    for (let pageNo = 0; pageNo < nextPageRowList.length; pageNo++) {
      const pageRows = nextPageRowList[pageNo]
      if (
        patchRowStartIndex >= pageRowCursor &&
        patchRowStartIndex < pageRowCursor + pageRows.length
      ) {
        const pagePatchStart = patchRowStartIndex - pageRowCursor
        pageRows.splice(pagePatchStart, oldPatchRows.length, ...patchRows)
        break
      }
      pageRowCursor += pageRows.length
    }
    const nextSnapshotVersion = this.draw.getTableLayoutSnapshotVersion() + 1
    this.draw.replaceLayoutState({
      rowList: nextRowList,
      pageRowList: nextPageRowList,
      layoutElementList: nextPageRowList.flatMap(pageRows =>
        pageRows.flatMap(row => row.elementList)
      ),
      tableLayoutSnapshotVersion: nextSnapshotVersion,
      tableLayoutSnapshot: null
    })
    this.draw.getCoordinate().computePositionListFromPage(layoutPatch.pageNo)
    this.draw.replaceTableLayoutSnapshot(null)
    return {
      rowList: nextRowList,
      pageRowList: nextPageRowList,
      layoutElementList: this.draw.getObjectResolver().getLayoutMainElementList(),
      mainElementList,
      tableLayoutSnapshotVersion: nextSnapshotVersion
    }
  }

  private getParagraphRange(elementList: IElement[], index: number) {
    if (!elementList[index]) {
      return null
    }
    let start = index
    while (start > 0) {
      const element = elementList[start]
      const preElement = elementList[start - 1]
      if (
        (element.value === ZERO && !element.listWrap) ||
        element.listId !== preElement?.listId ||
        element.titleId !== preElement?.titleId
      ) {
        break
      }
      start--
    }
    let end = index
    while (end < elementList.length - 1) {
      const element = elementList[end]
      const nextElement = elementList[end + 1]
      if (
        (element.value === ZERO && !element.listWrap) ||
        element.listId !== nextElement?.listId ||
        element.titleId !== nextElement?.titleId
      ) {
        break
      }
      end++
    }
    return { start, end }
  }

  private hasUnsafePatchElement(elementList: IElement[], start: number, end: number) {
    for (let index = start; index <= end; index++) {
      const element = elementList[index]
      if (isUnsafeParagraphPatchElement(element)) {
        return true
      }
    }
    return false
  }

  /** 获取布局流水线统计，用于排查整篇重算的耗时分布。 */
  public getStats(): IDrawLayoutPipelineStats {
    return {
      computeCount: this.computeCount,
      lastDuration: this.lastDuration,
      totalDuration: this.totalDuration,
      averageDuration: this.computeCount ? this.totalDuration / this.computeCount : 0,
      maxDuration: this.maxDuration,
      lastRowLayoutDuration: this.lastRowLayoutDuration,
      lastPartitionDuration: this.lastPartitionDuration,
      lastPositionDuration: this.lastPositionDuration,
      lastSnapshotDuration: this.lastSnapshotDuration,
      lastHighlightDuration: this.lastHighlightDuration
    }
  }

  /** 重置布局流水线统计，不影响当前布局结果。 */
  public resetStats() {
    this.computeCount = 0
    this.lastDuration = 0
    this.totalDuration = 0
    this.maxDuration = 0
    this.lastRowLayoutDuration = 0
    this.lastPartitionDuration = 0
    this.lastPositionDuration = 0
    this.lastSnapshotDuration = 0
    this.lastHighlightDuration = 0
  }
}
