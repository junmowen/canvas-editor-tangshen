import { ElementType } from '../../../../dataset/enum/Element'
import {
  IChartGraphic,
  IChartGraphicHitQueryPayload,
  IChartGraphicHitResult
} from '../../../../interface/ChartGraphic'
import { IElement } from '../../../../interface/Element'
import { findCommandElementList } from '../../../command/CommandElementTraversal'
import type { Draw } from '../../../draw/Draw'
import { hitTestChartGraphic } from '../hittest/ChartGraphicHitTest'
import {
  resolveChartGraphicFragmentChart,
  resolveChartGraphicFragmentLocalY,
  resolveChartGraphicFragmentRenderState
} from '../layout/ChartGraphicFragmentPolicy'

export interface IResolvedChartGraphicHitQueryResult {
  element: IElement & { chartGraphic: IChartGraphic }
  elementId?: string
  pageNo: number
  chart: IChartGraphic
  width: number
  height: number
  localX: number
  localY: number
  hit: IChartGraphicHitResult
}

/** 按元素 id 返回当前文档主模型里的实时图表元素引用。 */
export function findChartGraphicElementById(
  draw: Draw,
  elementId: string
): (IElement & { chartGraphic: IChartGraphic }) | null {
  for (const context of draw.getObjectResolver().getOriginalZoneElementList()) {
    const element = findCommandElementList<IElement & { chartGraphic: IChartGraphic }>({
      elementList: context.elementList,
      isIncludeValueList: true,
      visitor: ({ element }) => {
        if (
          element.id === elementId &&
          element.type === ElementType.CHART_GRAPHIC &&
          element.chartGraphic
        ) {
          return element as IElement & { chartGraphic: IChartGraphic }
        }
        return null
      }
    })
    if (element) {
      return element
    }
  }
  return null
}

/** 按文档或页内坐标命中图表内部对象，返回内部可复用的实时引用结果。 */
export function queryChartGraphicHitByPoint(
  draw: Draw,
  payload: IChartGraphicHitQueryPayload
): IResolvedChartGraphicHitQueryResult | null {
  const pageHeight = draw.getOriginalHeight()
  const pageGap = draw.getOriginalPageGap()
  const positionList = draw.getCoordinate().getOriginalPositionList()

  for (const position of positionList) {
    const element = position.element
    const chart = element?.chartGraphic
    if (element?.type !== ElementType.CHART_GRAPHIC || !chart) {
      continue
    }
    const {
      pageNo,
      coordinate: { leftTop }
    } = position
    if (payload.pageNo !== undefined && payload.pageNo !== pageNo) {
      continue
    }
    const top =
      payload.pageNo === undefined
        ? leftTop[1] + pageNo * (pageHeight + pageGap)
        : leftTop[1]
    const fragmentState = resolveChartGraphicFragmentRenderState({
      element,
      metrics: position.metrics
    })
    if (!fragmentState) {
      continue
    }
    const localX = payload.x - leftTop[0]
    const localY = payload.y - top
    if (
      localX < 0 ||
      localY < 0 ||
      localX > fragmentState.visibleWidth ||
      localY > fragmentState.visibleHeight
    ) {
      continue
    }
    const fullLocalY = resolveChartGraphicFragmentLocalY({
      element,
      localY
    })
    const hit = hitTestChartGraphic({
      chart: resolveChartGraphicFragmentChart(
        chart,
        fragmentState.fragment
      ),
      width: fragmentState.fullWidth,
      height: fragmentState.fullHeight,
      x: localX,
      y: fullLocalY,
      tolerance: payload.tolerance
    })
    if (!hit) continue
    const liveElement = element.id
      ? findChartGraphicElementById(draw, element.id)
      : null
    const resolvedElement = liveElement || (element as IElement & { chartGraphic: IChartGraphic })
    return {
      element: resolvedElement,
      elementId: resolvedElement.id,
      pageNo,
      chart: resolvedElement.chartGraphic,
      width: fragmentState.fullWidth,
      height: fragmentState.fullHeight,
      localX,
      localY: fullLocalY,
      hit
    }
  }
  return null
}
