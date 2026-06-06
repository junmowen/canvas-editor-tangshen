import { pickSurroundElementList } from '../../../utils/elementLayout'
import { IDrawLayoutPatch } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../Draw'
import { PagePartitioner } from './PagePartitioner'
import {
  DrawLayoutPipelineStats,
  IDrawLayoutPipelineStats
} from './DrawLayoutPipelineStats'
import { DrawLayoutPatchRunner } from './DrawLayoutPatchRunner'
import { syncHeaderFooterLayout } from './DrawLayoutHeaderFooterScheduler'
import { resolveContinuousPageHeight } from './ContinuousPageHeightResolver'
import { scanDrawLayoutFeaturePresence } from './DrawLayoutFeatureScanner'
import { commitFullDrawLayoutState } from './DrawLayoutCommitter'
import {
  rebuildFullLayoutChunkIndexes,
  rebuildFullLayoutTableSnapshot,
  refreshFullLayoutHighlights
} from './DrawLayoutPostProcessor'

/** Draw 布局总管线结果。 */
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
 * 布局总管线实现。
 *
 * 与具体测量、分页拆分、表格 fragment 处理不同，
 * 这个类更偏“编排者”，负责把布局结果统一提交回运行时。
 */
export class DrawLayoutPipeline {
  /** 分页拆分器，负责将行列表按页拆分 */
  private readonly pagePartitioner: PagePartitioner
  /** 输入态局部布局 patch 执行器。 */
  private readonly patchRunner: DrawLayoutPatchRunner
  /** 布局流水线耗时统计。 */
  private readonly stats = new DrawLayoutPipelineStats()

  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {
    // 初始化分页拆分器
    this.pagePartitioner = new PagePartitioner(draw)
    this.patchRunner = new DrawLayoutPatchRunner(draw)
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
      const patchResult = this.patchRunner.compute(layoutPatch)
      if (patchResult) {
        return patchResult
      }
    }
    // 获取主元素列表
    const mainElementList = this.draw.getObjectResolver().getOriginalMainElementList()
    const featurePresence = scanDrawLayoutFeaturePresence(mainElementList)
    // 获取内部宽度；多栏模式下完整布局先按测量栏宽测行，再由分页器完成栏间流动。
    const innerWidth = this.draw
      .getServices()
      .pageColumnLayoutService.getMeasurementColumnWidth(0)
    // 判断是否为分页模式
    const isPagingMode = this.draw.getIsPagingMode()
    // 计算下一个表格布局快照版本号
    const nextSnapshotVersion = this.draw.getTableLayoutSnapshotVersion() + 1

    // 清空浮动元素位置列表
    this.draw.getCoordinate().setFloatPositionList([])

    syncHeaderFooterLayout(this.draw)

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
      startPageNo: 0,
      isPagingPageMode: isPagingMode,
      innerWidth,
      surroundElementList,
      elementList: mainElementList
    })
    this.stats.recordRowLayout(performance.now() - rowLayoutStartTime)

    // 使用分页拆分器将行列表按页拆分
    const partitionStartTime = performance.now()
    const partitionResult = this.pagePartitioner.partitionRows(rowList, mainElementList)
    this.stats.recordPartition(performance.now() - partitionStartTime)

    const positionStartTime = performance.now()
    commitFullDrawLayoutState(this.draw, {
      rowList,
      partitionResult,
      tableLayoutSnapshotVersion: nextSnapshotVersion
    })
    this.stats.recordPosition(performance.now() - positionStartTime)
    const continuousPageHeight =
      partitionResult.continuousPageHeight !== undefined
        ? resolveContinuousPageHeight(
            this.draw,
            partitionResult.continuousPageHeight
          )
        : undefined
    // 重建表格布局快照
    const snapshotStartTime = performance.now()
    rebuildFullLayoutTableSnapshot({
      draw: this.draw,
      featurePresence,
      tableLayoutSnapshotVersion: nextSnapshotVersion
    })
    this.stats.recordSnapshot(performance.now() - snapshotStartTime)
    rebuildFullLayoutChunkIndexes(this.draw)
    // 计算区域高亮
    const highlightStartTime = performance.now()
    refreshFullLayoutHighlights({
      draw: this.draw,
      featurePresence
    })
    this.stats.recordHighlight(performance.now() - highlightStartTime)
    this.stats.recordCompute(performance.now() - totalStartTime)

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

  /** 获取布局流水线统计，用于排查整篇重算的耗时分布。 */
  public getStats(): IDrawLayoutPipelineStats {
    return this.stats.getStats()
  }

  /** 重置布局流水线统计，不影响当前布局结果。 */
  public resetStats() {
    this.stats.reset()
  }
}
