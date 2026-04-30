import { pickSurroundElementList } from '../../../utils/element'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { EditorMode } from '../../../dataset/enum/Editor'
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
 * 布局总管线实现。
 *
 * 与具体测量、分页拆分、表格 fragment 处理不同，
 * 这个类更偏“编排者”，负责把布局结果统一提交回运行时。
 */
export class DrawLayoutPipeline {
  /** 分页拆分器，负责将行列表按页拆分 */
  private readonly pagePartitioner: PagePartitioner

  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {
    // 初始化分页拆分器
    this.pagePartitioner = new PagePartitioner(draw)
  }

  /**
   * 执行完整的布局计算。
   *
   * 包括页眉/页脚计算、行列表计算、分页拆分、位置列表计算、表格快照重建和高亮计算。
   *
   * @returns 布局计算结果
   */
  public compute(): IDrawLayoutResult {
    // 获取编辑器配置信息
    const { header, footer } = this.draw.getRuntime().getOptions()
    // 获取主元素列表
    const mainElementList = this.draw.getOriginalMainElementList()
    // 获取内部宽度
    const innerWidth = this.draw.getInnerWidth()
    // 判断是否为分页模式
    const isPagingMode = this.draw.getIsPagingMode()
    // 计算下一个表格布局快照版本号
    const nextSnapshotVersion = this.draw.getTableLayoutSnapshotVersion() + 1

    // 清空浮动元素位置列表
    this.draw.getComponents().position.setFloatPositionList([])

    // 如果是分页模式，计算页眉和页脚
    if (isPagingMode) {
      // 计算页眉（如果未禁用）
      if (!header.disabled) {
        this.draw.getComponents().header.compute()
      }
      // 计算页脚（如果未禁用）
      if (!footer.disabled) {
        this.draw.getComponents().footer.compute()
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

    // 使用分页拆分器将行列表按页拆分
    const partitionResult = this.pagePartitioner.partitionRows(rowList, mainElementList)

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
    this.draw.getComponents().position.computePositionList()
    // 重建表格布局快照
    this.draw.replaceTableLayoutSnapshot(
      this.draw.getServices().tableLayoutSnapshotBuilder.build({
        version: nextSnapshotVersion
      })
    )
    // 计算区域高亮
    this.draw.getComponents().area.compute()

    // 如果不是打印模式，计算搜索和控制高亮
    if (this.draw.getMode() !== EditorMode.PRINT) {
      // 获取搜索关键词
      const searchKeyword = this.draw.getComponents().search.getSearchKeyword()
      // 如果有搜索关键词，计算搜索高亮
      if (searchKeyword) {
        this.draw.getComponents().search.compute(searchKeyword)
      }
      // 计算控件高亮列表
      this.draw.getComponents().control.computeHighlightList()
    }

    // 返回布局计算结果
    return {
      rowList,
      pageRowList: partitionResult.pageRowList,
      layoutElementList: partitionResult.layoutElementList,
      mainElementList: partitionResult.mainElementList,
      tableLayoutSnapshotVersion: nextSnapshotVersion,
      continuousPageHeight: partitionResult.continuousPageHeight
    }
  }
}
