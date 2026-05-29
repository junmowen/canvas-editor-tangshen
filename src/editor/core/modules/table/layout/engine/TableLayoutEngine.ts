import { ElementType } from '../../../../../dataset/enum/Element'
import { IComputeRowListPayload } from '../../../../../interface/Draw'
import { IElement, IElementMetrics } from '../../../../../interface/Element'
import { IRow, IRowElement } from '../../../../../interface/Row'
import { ITableFragmentDescriptor } from '../../../../../interface/table/TableFragment'
import type { Draw } from '../../../../draw/Draw'
import { getTableCellContentInset } from '../TableCellContentInset'
import { TableFragmentSplitter } from './TableFragmentSplitter'

/** 测量表格调用载荷，聚合执行该操作所需的输入数据。 */
interface IMeasureTablePayload {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 行外边距，用于控制段落上下留白。 */
  rowMargin: number
  /** 是否分页页面模式，用于选择分页或连续布局逻辑。 */
  isPagingPageMode: boolean
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale: number
  /** 单元格内边距，用于计算表格内容可用空间。 */
  tdPadding: number[]
}

/** 创建片段行调用载荷，聚合执行该操作所需的输入数据。 */
interface ICreateFragmentRowsPayload {
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 可用高度，用于判断当前页还能容纳多少内容。 */
  availableHeight: number
  /** 页面内容区高度，用于计算正文可排版空间。 */
  pageContentHeight: number
}

/**
 * 表格布局引擎。
 *
 * 负责测量逻辑表格高度，并在分页模式下把逻辑表格转换成可渲染的 fragment 行。
 */
export class TableLayoutEngine {
  /** 分页拆分器。负责把超出当前页高度的表格继续拆到后续页。 */
  private readonly tableFragmentSplitter: TableFragmentSplitter

  /** 初始化 TableLayoutEngine 实例并注入运行依赖。 */
  constructor(
    private readonly draw: Draw,
    private readonly computeRowList: (payload: IComputeRowListPayload) => IRow[]
  ) {
    this.tableFragmentSplitter = new TableFragmentSplitter(draw)
  }

  /** 计算表格尺寸、单元格内容高度以及最终的表格 metrics。 */
  public measure(payload: IMeasureTablePayload) {
    const {
      element,
      elementList,
      index,
      rowMargin,
      isPagingPageMode,
      scale,
      tdPadding
    } = payload
    const metrics = this.createMetrics()
    const tdPaddingHeight = tdPadding[0] + tdPadding[2]

    this.draw.getTableParticle().computeRowColInfo(element)

    const trList = element.trList!
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const contentInset = getTableCellContentInset(element, td)
        const tdHorizontalPadding =
          tdPadding[1] + tdPadding[3] + contentInset.left + contentInset.right
        const tdVerticalPadding =
          tdPaddingHeight + contentInset.top + contentInset.bottom
        const rowList = this.computeRowList({
          innerWidth: Math.max(0, td.width! - tdHorizontalPadding) * scale,
          elementList: td.value,
          isFromTable: true,
          isPagingPageMode
        })
        const rowHeight = rowList.reduce((pre, cur) => pre + cur.height, 0)
        td.rowList = rowList
        const curTdHeight = rowHeight / scale + tdVerticalPadding
        if (td.height! < curTdHeight) {
          const extraHeight = curTdHeight - td.height!
          const changeTr = trList[t + td.rowspan - 1]
          changeTr.height += extraHeight
          changeTr.tdList.forEach(changeTd => {
            changeTd.height! += extraHeight
            if (!changeTd.realHeight) {
              changeTd.realHeight = changeTd.height!
            } else {
              changeTd.realHeight! += extraHeight
            }
          })
        }
        let curTdMinHeight = 0
        let curTdRealHeight = 0
        let rowSpanIndex = 0
        while (rowSpanIndex < td.rowspan) {
          const curTr = trList[rowSpanIndex + t] || trList[t]
          curTdMinHeight += curTr.minHeight!
          curTdRealHeight += curTr.height!
          rowSpanIndex++
        }
        td.realMinHeight = curTdMinHeight
        td.realHeight = curTdRealHeight
        td.mainHeight = curTdHeight
      }
    }

    for (let t = 0; t < trList.length; t++) {
      const coverTdList = this.draw.getTableParticle().getTdListByRowIndex(
        trList,
        t
      )
      let reduceHeight = -1
      for (let d = 0; d < coverTdList.length; d++) {
        const td = coverTdList[d]
        const curTdRealHeight = td.realHeight!
        const curTdHeight = td.mainHeight!
        const curTdMinHeight = td.realMinHeight!
        const curReduceHeight =
          curTdHeight < curTdMinHeight
            ? curTdRealHeight - curTdMinHeight
            : curTdRealHeight - curTdHeight
        if (!~reduceHeight || curReduceHeight < reduceHeight) {
          reduceHeight = curReduceHeight
        }
      }
      if (reduceHeight > 0) {
        const changeTr = trList[t]
        changeTr.height -= reduceHeight
        coverTdList.forEach(changeTd => {
          changeTd.realHeight! -= reduceHeight
          if (changeTd.rowIndex === t) {
            changeTd.height! -= reduceHeight
          }
        })
      }
    }

    this.draw.getTableParticle().computeRowColInfo(element)
    const tableHeight = this.draw.getTableParticle().getTableHeight(element)
    const tableWidth = this.draw.getTableParticle().getTableWidth(element)
    element.width = tableWidth
    element.height = tableHeight

    const elementWidth = tableWidth * scale
    const elementHeight = tableHeight * scale
    metrics.width = elementWidth
    metrics.height = elementHeight
    metrics.boundingBoxDescent = elementHeight
    metrics.boundingBoxAscent = -rowMargin
    if (elementList[index + 1]?.type === ElementType.TABLE) {
      metrics.boundingBoxAscent -= rowMargin
    }

    return metrics
  }

  /** 若当前元素是表格，则计算表格 metrics；否则返回 null。 */
  public measureIfTable(payload: IMeasureTablePayload) {
    if (payload.element.type !== ElementType.TABLE) return null
    return this.measure(payload)
  }

  /** 在分页模式下，把单个逻辑表格行转换成一个或多个分页 fragment 行。 */
  public createFragmentRows(payload: ICreateFragmentRowsPayload): {
    /** 是否从新页开始，用于控制表格片段分页策略。 */
    startOnNewPage: boolean
    /** 行集合，保存需要拆分、移动或重排的表格行。 */
    rows: IRow[]
  } {
    const { row, availableHeight, pageContentHeight } = payload
    const sourceTableIndex = row.elementList.findIndex(
      element => element.type === ElementType.TABLE
    )
    const sourceTable = row.elementList[sourceTableIndex] as IRowElement | undefined
    if (!sourceTable || sourceTable.type !== ElementType.TABLE) {
      return {
        startOnNewPage: false,
        rows: [row]
      }
    }

    const logicalTableId = sourceTable.id!
    const logicalTableIndex = sourceTable.sourceIndex ?? row.startIndex
    const rowMargin = this.draw.getServices().metricsService.getElementRowMargin(sourceTable)
    const { startOnNewPage, fragments } = this.tableFragmentSplitter.split({
      sourceTable,
      logicalTableId,
      logicalTableIndex,
      availableHeight,
      pageContentHeight,
      rowMargin,
      pageStartOffsetY: this.getFragmentPageStartOffsetY(sourceTable)
    })

    return {
      startOnNewPage,
      rows: fragments.map((fragment, index) =>
        this.createFragmentRow({
          row,
          sourceTable,
          sourceTableIndex,
          fragment,
          keepOffsetY: index === 0 && !startOnNewPage,
          keepPageBreak: index === 0 && !startOnNewPage,
          keepInlinePeers:
            sourceTable.tableDisplay === 'inline' &&
            row.elementList.length > 1 &&
            index === 0 &&
            !startOnNewPage
        })
      )
    }
  }

  /** 基于 fragment 结果创建真正写回 rowList 的分页行对象。 */
  private createFragmentRow(payload: {
    /** 行布局对象，保存当前行的元素和坐标信息。 */
    row: IRow
    /** 来源表格对象，用于在拆分或合并时保留原始结构。 */
    sourceTable: IRowElement
    /** 来源表格索引，用于定位原始表格在文档中的位置。 */
    sourceTableIndex: number
    /** 分页片段信息，用于描述表格或页面切分后的局部结构。 */
    fragment: ITableFragmentDescriptor
    /** 是否保留纵向偏移，用于表格片段迁移后保持页内位置。 */
    keepOffsetY: boolean
    /** 是否保留分页标记，用于表格拆分时延续分页语义。 */
    keepPageBreak: boolean
    /** 是否保留同行相邻元素，用于表格分页时维持行内关系。 */
    keepInlinePeers: boolean
  }): IRow {
    const {
      row,
      sourceTable,
      sourceTableIndex,
      fragment,
      keepOffsetY,
      keepPageBreak,
      keepInlinePeers
    } = payload
    const scale = this.draw.getOptions().scale
    const rowMargin = this.draw.getServices().metricsService.getElementRowMargin(sourceTable)
    const fragmentHeight = fragment.height * scale
    const metrics: IElementMetrics = {
      width: fragment.width * scale,
      height: fragmentHeight,
      boundingBoxAscent: -rowMargin,
      boundingBoxDescent: fragmentHeight
    }
    const fragmentRowElement = this.createFragmentAnchorElement(
      sourceTable,
      fragment,
      metrics
    )
    const elementList = keepInlinePeers
      ? row.elementList.map((element, index) =>
          index === sourceTableIndex ? fragmentRowElement : element
        )
      : [fragmentRowElement]
    const width = keepInlinePeers
      ? Math.max(
          0,
          row.width - (sourceTable.metrics?.width || 0) + metrics.width
        )
      : metrics.width
    const height = keepInlinePeers
      ? Math.max(
          fragmentHeight + rowMargin,
          row.height - Math.max(0, (sourceTable.metrics?.height || 0) - fragmentHeight)
        )
      : fragmentHeight + rowMargin

    return {
      ...row,
      width,
      height,
      ascent: 0,
      offsetY: keepOffsetY ? row.offsetY : fragment.pageStartOffsetY || 0,
      isPageBreak: keepPageBreak ? row.isPageBreak : false,
      elementList,
      tableFragment: fragment
    }
  }

  private getFragmentPageStartOffsetY(sourceTable: IRowElement) {
    const rowMargin =
      this.draw.getServices().metricsService.getElementRowMargin(sourceTable)
    const header = this.draw.getHeader()
    const headerExtraHeight = header.getExtraHeight()
    const headerBottom = header.getHeaderTop() + header.getHeight()
    const mainTop = this.draw.getMargins()[0] + headerExtraHeight
    const headerTouchesMainTop = header.getHeight() > 0 && headerBottom >= mainTop - 1
    return headerTouchesMainTop ? rowMargin : 0
  }

  /** 为 fragment 行构造一个锚定元素，供正文布局主链继续消费。 */
  private createFragmentAnchorElement(
    sourceTable: IRowElement,
    fragment: ITableFragmentDescriptor,
    metrics: IElementMetrics
  ): IRowElement {
    return {
      ...sourceTable,
      id: fragment.tableId,
      sourceIndex: fragment.logicalTableIndex,
      width: fragment.width,
      height: fragment.height,
      colgroup: undefined,
      trList: undefined,
      metrics,
      left: sourceTable.left || 0,
      style: this.draw.getElementFont(sourceTable, this.draw.getOptions().scale)
    }
  }

  /** 创建空 metrics，占位后续表格测量结果。 */
  private createMetrics(): IElementMetrics {
    return {
      width: 0,
      height: 0,
      boundingBoxAscent: 0,
      boundingBoxDescent: 0
    }
  }
}
