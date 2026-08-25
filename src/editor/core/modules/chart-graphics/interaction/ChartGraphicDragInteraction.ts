import {
  IChartAnnotation,
  IChartDataPoint,
  IChartMark,
  IChartRegion
} from '../model/ChartGraphic'
import { CanvasEvent } from '../../../event/CanvasEvent'
import {
  applyChartGraphicAnnotationUpsert,
  applyChartGraphicMarkUpsert,
  applyChartGraphicRegionUpsert,
  applyChartGraphicSeriesPointPatch
} from '../command/ChartGraphicCommandPolicy'
import { queryChartGraphicHitByPoint } from '../hittest/ChartGraphicHitQueryPolicy'
import { resolveChartAxisPointValueFromLocalCoordinate } from '../render/ChartGraphicCoordinatePolicy'
import {
  resolveChartAxisValueNumber,
  toChartNumber
} from '../render/ChartGraphicSeriesPointPolicy'

function resolveChartSeriesPoint(payload: {
  chart: {
    series?: Array<{
      id: string
      data: Array<number | IChartDataPoint>
    }>
  }
  seriesId: string
  dataIndex: number
}) {
  const { chart, seriesId, dataIndex } = payload
  const series = chart.series?.find(item => item.id === seriesId)
  if (!series?.data || dataIndex < 0 || dataIndex >= series.data.length) {
    return null
  }
  return series.data[dataIndex]
}

function resolveChartMark(payload: {
  chart: {
    marks?: IChartMark[]
  }
  markId: string
}) {
  return payload.chart.marks?.find(mark => mark.id === payload.markId) || null
}

function resolveChartAnnotation(payload: {
  chart: {
    annotations?: IChartAnnotation[]
  }
  annotationId: string
}) {
  return (
    payload.chart.annotations?.find(
      annotation => annotation.id === payload.annotationId
    ) || null
  )
}

function resolveChartRegion(payload: {
  chart: {
    regions?: IChartRegion[]
  }
  regionId: string
}) {
  return (
    payload.chart.regions?.find(region => region.id === payload.regionId) ||
    null
  )
}

function resolveNumericRegionBoundary(payload: {
  value: number | string | undefined
  axis: 'x' | 'y'
  chart: any
}) {
  const { value, axis, chart } = payload
  if (value === undefined) return undefined
  if (axis === 'x') {
    return resolveChartAxisValueNumber(value, chart.coordinate?.xAxis, 0)
  }
  return toChartNumber(value, Number.NaN)
}

function offsetRegionBoundary(value: number | undefined, delta: number) {
  return value === undefined ? undefined : value + delta
}

function resolveDragAxisPoint(payload: {
  point: number | IChartDataPoint
  localX: number
  localY: number
  width: number
  height: number
  chart: any
}) {
  const { point, localX, localY, width, height, chart } = payload
  const nextPoint = resolveChartAxisPointValueFromLocalCoordinate({
    chart,
    width,
    height,
    localX,
    localY
  })
  if (typeof point === 'number') {
    return nextPoint.y
  }
  return {
    x: nextPoint.x,
    y: nextPoint.y
  }
}

function isUnchangedPoint(payload: {
  currentPoint: number | IChartDataPoint
  patch: number | Partial<IChartDataPoint>
}) {
  const { currentPoint, patch } = payload
  if (typeof currentPoint === 'number') {
    return typeof patch === 'number' && currentPoint === patch
  }
  if (typeof patch === 'number') {
    return currentPoint.y === patch
  }
  return currentPoint.x === patch.x && currentPoint.y === patch.y
}

function isUnchangedRegion(payload: {
  region: IChartRegion
  patch: Partial<IChartRegion>
}) {
  const { region, patch } = payload
  return (
    region.xStart === patch.xStart &&
    region.xEnd === patch.xEnd &&
    region.yStart === patch.yStart &&
    region.yEnd === patch.yEnd
  )
}

function isUnchangedAxisAnchor(payload: {
  currentX: number | string | undefined
  currentY: number | undefined
  nextX: number | string
  nextY: number
}) {
  const { currentX, currentY, nextX, nextY } = payload
  return currentX === nextX && currentY === nextY
}

function updateChartGraphicDragPreview(payload: {
  host: CanvasEvent
  evt: MouseEvent
}) {
  const { host, evt } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
  const dragSession = session.chartGraphicDrag
  const coordinates = draw
    .getCoordinate()
    .getPointerCoordinates(evt, session.lastPointerCoordinates)
  session.lastPointerCoordinates = coordinates
  if (!dragSession || !coordinates.page) return false

  const hit = queryChartGraphicHitByPoint(draw, {
    pageNo: coordinates.page.pageNo,
    x: coordinates.page.x,
    y: coordinates.page.y,
    tolerance: 0
  })
  if (!hit || hit.elementId !== dragSession.elementId) {
    return true
  }
  if (
    dragSession.target === 'series-point' &&
    dragSession.seriesId &&
    dragSession.dataIndex !== undefined
  ) {
    const currentPoint = resolveChartSeriesPoint({
      chart: hit.chart,
      seriesId: dragSession.seriesId,
      dataIndex: dragSession.dataIndex
    })
    if (currentPoint === null) {
      return true
    }
    const patch = resolveDragAxisPoint({
      point: currentPoint,
      localX: hit.localX,
      localY: hit.localY,
      width: hit.width,
      height: hit.height,
      chart: hit.chart
    })
    if (!patch || isUnchangedPoint({ currentPoint, patch })) {
      return true
    }
    if (
      !applyChartGraphicSeriesPointPatch(
        hit.element,
        dragSession.seriesId,
        dragSession.dataIndex,
        patch
      )
    ) {
      return true
    }
  } else if (dragSession.target === 'mark' && dragSession.markId) {
    const mark = resolveChartMark({
      chart: hit.chart,
      markId: dragSession.markId
    })
    if (!mark) {
      return true
    }
    const nextPoint = resolveChartAxisPointValueFromLocalCoordinate({
      chart: hit.chart,
      width: hit.width,
      height: hit.height,
      localX: hit.localX,
      localY: hit.localY
    })
    if (
      isUnchangedAxisAnchor({
        currentX: mark.x,
        currentY: mark.y,
        nextX: nextPoint.x,
        nextY: nextPoint.y
      })
    ) {
      return true
    }
    if (
      !applyChartGraphicMarkUpsert(hit.element, {
        ...mark,
        x: nextPoint.x,
        y: nextPoint.y
      })
    ) {
      return true
    }
  } else if (dragSession.target === 'region' && dragSession.regionId) {
    const region = resolveChartRegion({
      chart: hit.chart,
      regionId: dragSession.regionId
    })
    if (
      !region ||
      dragSession.dragStartX === undefined ||
      dragSession.dragStartY === undefined ||
      !dragSession.originalRegion
    ) {
      return true
    }
    const nextPoint = resolveChartAxisPointValueFromLocalCoordinate({
      chart: hit.chart,
      width: hit.width,
      height: hit.height,
      localX: hit.localX,
      localY: hit.localY
    })
    const nextX = resolveChartAxisValueNumber(
      nextPoint.x,
      hit.chart.coordinate?.xAxis,
      dragSession.dragStartX
    )
    const deltaX = nextX - dragSession.dragStartX
    const deltaY = nextPoint.y - dragSession.dragStartY
    const patch = {
      xStart: offsetRegionBoundary(
        dragSession.originalRegion.xStart,
        deltaX
      ),
      xEnd: offsetRegionBoundary(dragSession.originalRegion.xEnd, deltaX),
      yStart: offsetRegionBoundary(
        dragSession.originalRegion.yStart,
        deltaY
      ),
      yEnd: offsetRegionBoundary(dragSession.originalRegion.yEnd, deltaY)
    }
    if (isUnchangedRegion({ region, patch })) {
      return true
    }
    if (
      !applyChartGraphicRegionUpsert(hit.element, {
        ...region,
        ...patch
      })
    ) {
      return true
    }
  } else if (
    dragSession.target === 'annotation' &&
    dragSession.annotationId
  ) {
    const annotation = resolveChartAnnotation({
      chart: hit.chart,
      annotationId: dragSession.annotationId
    })
    if (!annotation) {
      return true
    }
    const nextPoint = resolveChartAxisPointValueFromLocalCoordinate({
      chart: hit.chart,
      width: hit.width,
      height: hit.height,
      localX: hit.localX,
      localY: hit.localY
    })
    if (
      isUnchangedAxisAnchor({
        currentX: annotation.x,
        currentY: annotation.y,
        nextX: nextPoint.x,
        nextY: nextPoint.y
      })
    ) {
      return true
    }
    if (
      !applyChartGraphicAnnotationUpsert(hit.element, {
        ...annotation,
        x: nextPoint.x,
        y: nextPoint.y
      })
    ) {
      return true
    }
  } else {
    return true
  }
  dragSession.isDirty = true
  draw.render({
    isSetCursor: false,
    isSubmitHistory: false,
    isCompute: false,
    pageRenderScope: 'visible'
  })
  return true
}

/** 在直接命中图表对象时启动拖拽会话。 */
export function startChartGraphicDragInteraction(payload: {
  host: CanvasEvent
  evt: MouseEvent
  pageNo: number
  x: number
  y: number
}) {
  const { host, evt, pageNo, x, y } = payload
  const draw = host.getDraw()
  const session = host.getPointerSession()
  if (evt.button !== 0 || draw.isReadonly()) {
    return false
  }
  const hit = queryChartGraphicHitByPoint(draw, {
    pageNo,
    x,
    y
  })
  if (
    !hit?.elementId ||
    hit.chart.interaction?.readonly ||
    (hit.hit.target !== 'series-point' &&
      hit.hit.target !== 'mark' &&
      hit.hit.target !== 'region' &&
      hit.hit.target !== 'annotation')
  ) {
    return false
  }
  if (
    hit.hit.target === 'series-point' &&
    hit.hit.seriesId &&
    hit.hit.dataIndex !== undefined
  ) {
    const point = resolveChartSeriesPoint({
      chart: hit.chart,
      seriesId: hit.hit.seriesId,
      dataIndex: hit.hit.dataIndex
    })
    if (point === null) {
      return false
    }
    session.chartGraphicDrag = {
      target: 'series-point',
      elementId: hit.elementId,
      seriesId: hit.hit.seriesId,
      dataIndex: hit.hit.dataIndex,
      width: hit.width,
      height: hit.height,
      isDirty: false
    }
    return true
  }
  if (hit.hit.target === 'mark' && hit.hit.markId) {
    const mark = resolveChartMark({
      chart: hit.chart,
      markId: hit.hit.markId
    })
    if (!mark) {
      return false
    }
    session.chartGraphicDrag = {
      target: 'mark',
      elementId: hit.elementId,
      markId: hit.hit.markId,
      width: hit.width,
      height: hit.height,
      isDirty: false
    }
    return true
  }
  if (hit.hit.target === 'region' && hit.hit.regionId) {
    const region = resolveChartRegion({
      chart: hit.chart,
      regionId: hit.hit.regionId
    })
    if (!region) {
      return false
    }
    const dragStartPoint = resolveChartAxisPointValueFromLocalCoordinate({
      chart: hit.chart,
      width: hit.width,
      height: hit.height,
      localX: hit.localX,
      localY: hit.localY
    })
    session.chartGraphicDrag = {
      target: 'region',
      elementId: hit.elementId,
      regionId: hit.hit.regionId,
      width: hit.width,
      height: hit.height,
      dragStartX: resolveChartAxisValueNumber(
        dragStartPoint.x,
        hit.chart.coordinate?.xAxis,
        0
      ),
      dragStartY: dragStartPoint.y,
      originalRegion: {
        xStart: resolveNumericRegionBoundary({
          value: region.xStart,
          axis: 'x',
          chart: hit.chart
        }),
        xEnd: resolveNumericRegionBoundary({
          value: region.xEnd,
          axis: 'x',
          chart: hit.chart
        }),
        yStart: resolveNumericRegionBoundary({
          value: region.yStart,
          axis: 'y',
          chart: hit.chart
        }),
        yEnd: resolveNumericRegionBoundary({
          value: region.yEnd,
          axis: 'y',
          chart: hit.chart
        })
      },
      isDirty: false
    }
    return true
  }
  if (hit.hit.target === 'annotation' && hit.hit.annotationId) {
    const annotation = resolveChartAnnotation({
      chart: hit.chart,
      annotationId: hit.hit.annotationId
    })
    if (!annotation) {
      return false
    }
    session.chartGraphicDrag = {
      target: 'annotation',
      elementId: hit.elementId,
      annotationId: hit.hit.annotationId,
      width: hit.width,
      height: hit.height,
      isDirty: false
    }
    return true
  }
  return false
}

/** 在图表对象拖拽过程中更新拖拽预览。 */
export function runChartGraphicDragInteraction(payload: {
  host: CanvasEvent
  evt: MouseEvent
}) {
  return updateChartGraphicDragPreview(payload)
}

/** 提交图表对象拖拽；释放时只补交一次历史快照。 */
export function commitChartGraphicDragInteraction(payload: {
  host: CanvasEvent
  evt: MouseEvent
}) {
  const { host, evt } = payload
  const draw = host.getDraw()
  const dragSession = host.getPointerSession().chartGraphicDrag
  if (!dragSession) return false
  updateChartGraphicDragPreview({ host, evt })
  const isDirty = dragSession.isDirty
  host.getPointerSessionController().clearChartGraphicDrag()
  if (isDirty) {
    draw.submitHistory(undefined)
  }
  return true
}

export const startChartGraphicDragIntent = startChartGraphicDragInteraction
export const runChartGraphicDragIntent = runChartGraphicDragInteraction
export const commitChartGraphicDragIntent = commitChartGraphicDragInteraction
