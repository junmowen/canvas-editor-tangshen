import { IChartGraphicFragmentDescriptor } from '../model/ChartGraphic'
import { IElementMetrics } from '../../../../interface/Element'
import { IRow, IRowElement } from '../../../../interface/Row'
import type { Draw } from '../../../draw/Draw'
import {
  isSingleChartGraphicElementRow,
  resolveChartGraphicTimeWindowList,
  resolveChartGraphicFragmentRenderState,
  resolveChartGraphicRowBoxPadding
} from './ChartGraphicFragmentPolicy'

interface ICreateFragmentRowsPayload {
  row: IRow
  availableHeight: number
  pageContentHeight: number
}

/** 图表分页布局引擎，负责把超高图表拆成可渲染的纵向片段。 */
export class ChartGraphicLayoutEngine {
  constructor(private readonly draw: Draw) {}

  /** 在分页模式下，把单个逻辑图表行转换成一个或多个分页 fragment 行。 */
  public createFragmentRows(payload: ICreateFragmentRowsPayload): {
    startOnNewPage: boolean
    rows: IRow[]
  } {
    const { row, availableHeight, pageContentHeight } = payload
    if (!isSingleChartGraphicElementRow(row)) {
      return {
        startOnNewPage: false,
        rows: [row]
      }
    }
    const sourceChart = row.elementList[0]
    const renderState = resolveChartGraphicFragmentRenderState({
      element: sourceChart,
      metrics: sourceChart.metrics
    })
    if (!renderState) {
      return {
        startOnNewPage: false,
        rows: [row]
      }
    }
    const { topPadding, bottomPadding } = resolveChartGraphicRowBoxPadding({
      row,
      fullHeight: renderState.fullHeight
    })
    const timeWindowList = resolveChartGraphicTimeWindowList(
      sourceChart.chartGraphic!
    )
    if (timeWindowList.length > 1) {
      const startOnNewPage =
        row.height + (row.offsetY || 0) > availableHeight
      return {
        startOnNewPage,
        rows: timeWindowList.map(window =>
          this.createFragmentRow({
            row,
            sourceChart,
            fragment: {
              fragmentIndex: window.fragmentIndex,
              fragmentCount: window.fragmentCount,
              fullWidth: renderState.fullWidth,
              fullHeight: renderState.fullHeight,
              offsetY: 0,
              fragmentHeight: renderState.fullHeight,
              mode: 'time-window',
              xMin: window.xMin,
              xMax: window.xMax,
              repeatedHeader: true,
              pageBreakBefore:
                window.fragmentIndex > 0 &&
                sourceChart.chartGraphic?.pagination
                  ?.pageBreakBetweenFragments !== false
            },
            topPadding,
            bottomPadding,
            keepOffsetY: window.fragmentIndex === 0 && !startOnNewPage,
            keepPageBreak: window.fragmentIndex === 0 && !startOnNewPage
          })
        )
      }
    }
    const currentFragmentCapacity = Math.max(
      0,
      availableHeight - topPadding - bottomPadding
    )
    const pageFragmentCapacity = Math.max(
      0,
      pageContentHeight - topPadding - bottomPadding
    )
    if (pageFragmentCapacity <= 0) {
      return {
        startOnNewPage: false,
        rows: [row]
      }
    }

    const startOnNewPage = currentFragmentCapacity < 1
    const fragmentList: IChartGraphicFragmentDescriptor[] = []
    let offsetY = 0
    let remainingHeight = renderState.fullHeight

    while (remainingHeight > 0) {
      const fragmentCapacity =
        fragmentList.length === 0 && !startOnNewPage
          ? currentFragmentCapacity
          : pageFragmentCapacity
      const fragmentHeight = Math.min(remainingHeight, fragmentCapacity)
      fragmentList.push({
        fragmentIndex: fragmentList.length,
        fullWidth: renderState.fullWidth,
        fullHeight: renderState.fullHeight,
        offsetY,
        fragmentHeight
      })
      offsetY += fragmentHeight
      remainingHeight -= fragmentHeight
    }

    return {
      startOnNewPage,
      rows: fragmentList.map((fragment, index) =>
        this.createFragmentRow({
          row,
          sourceChart,
          fragment,
          topPadding,
          bottomPadding,
          keepOffsetY: index === 0 && !startOnNewPage,
          keepPageBreak: index === 0 && !startOnNewPage
        })
      )
    }
  }

  /** 基于 fragment 结果创建真正写回 rowList 的分页行对象。 */
  private createFragmentRow(payload: {
    row: IRow
    sourceChart: IRowElement
    fragment: IChartGraphicFragmentDescriptor
    topPadding: number
    bottomPadding: number
    keepOffsetY: boolean
    keepPageBreak: boolean
  }): IRow {
    const {
      row,
      sourceChart,
      fragment,
      topPadding,
      bottomPadding,
      keepOffsetY,
      keepPageBreak
    } = payload
    const metrics: IElementMetrics = {
      width: fragment.fullWidth,
      height: fragment.fragmentHeight,
      boundingBoxAscent: 0,
      boundingBoxDescent: fragment.fragmentHeight
    }
    const fragmentElement = this.createFragmentAnchorElement(
      sourceChart,
      fragment,
      metrics
    )
    return {
      ...row,
      width: fragment.fullWidth,
      height: topPadding + fragment.fragmentHeight + bottomPadding,
      ascent: topPadding,
      offsetY: keepOffsetY ? row.offsetY : 0,
      isPageBreak: keepPageBreak ? row.isPageBreak : false,
      elementList: [fragmentElement]
    }
  }

  /** 为 fragment 行构造一个锚定元素，保持原始图表 id 与完整模型。 */
  private createFragmentAnchorElement(
    sourceChart: IRowElement,
    fragment: IChartGraphicFragmentDescriptor,
    metrics: IElementMetrics
  ): IRowElement {
    return {
      ...sourceChart,
      pagingId: sourceChart.id,
      pagingIndex: fragment.fragmentIndex,
      sourceIndex: sourceChart.sourceIndex,
      chartGraphicFragment: fragment,
      metrics,
      left: sourceChart.left || 0,
      style: this.draw.getElementFont(
        sourceChart,
        this.draw.getOptions().scale
      )
    }
  }
}
