import { ElementType } from '../../../../dataset/enum/Element'
import {
  IChartAnnotation,
  IChartGraphic,
  IChartMark,
  IChartRegion,
  IChartSeries
} from '../model/ChartGraphic'
import { IDrawRowPayload } from '../../../../interface/Draw'
import {
  DENTAL_STATUS_VISUAL_LIST,
  IDentalStatusVisual,
  resolveDentalStatusVisualList,
  resolveDentalToothPathGeometry,
  resolveDentalToothFill
} from './DentalChartRenderPolicy'
import {
  downsampleChartSeriesPoints,
  IResolvedChartSeriesPoint,
  resolveChartSeriesDataPoints
} from './ChartGraphicSeriesPointPolicy'
import { resolveChartSmoothBezierSegmentList } from './ChartGraphicSeriesGeometryPolicy'
import {
  resolveChartMedicalBandLayout,
  resolveChartMedicalHeaderText,
  resolveChartMedicalMarkCoordinate
} from './ChartGraphicMedicalRenderPolicy'
import {
  filterChartGraphicPointsToVisibleWindow,
  resolveChartGraphicFragmentChart,
  resolveChartGraphicFragmentRenderState
} from '../layout/ChartGraphicFragmentPolicy'
import {
  IChartAxisTick,
  IChartBarRect,
  IChartLegendItemLayout,
  IChartPoint,
  IChartRenderContext,
  resolveChartBarRect,
  resolveChartAxisTickList,
  resolveChartLegendLayout,
  resolveChartPointCoordinate,
  resolveChartRawAnnotationPoint,
  resolveChartRawMarkPoint,
  resolveChartRegionRect,
  resolveChartRenderContext
} from './ChartGraphicCoordinatePolicy'
import { drawChartVitalSigns } from './ChartGraphicVitalSignsPolicy'
import {
  isEcgChart,
  resolveEcgCalibrationPulse,
  resolveEcgLeadLayoutList,
  resolveEcgMetadataText,
  resolveEcgPaperGridLineList,
  resolveEcgSeriesRenderContext
} from './ChartGraphicEcgRenderPolicy'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 图表图形行级 Canvas2D 渲染器。 */
export class ChartGraphicRowRenderer {
  public canRender(element: RowElement) {
    return element.type === ElementType.CHART_GRAPHIC && !!element.chartGraphic
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: RowElement,
    x: number,
    y: number
  ) {
    const sourceChart = element.chartGraphic
    if (!sourceChart) return
    const fragmentState = resolveChartGraphicFragmentRenderState({
      element,
      metrics: element.metrics
    })
    if (!fragmentState) return
    const chart = resolveChartGraphicFragmentChart(
      sourceChart,
      fragmentState.fragment
    )
    const width = fragmentState.fullWidth
    const height = fragmentState.fullHeight
    ctx.save()
    ctx.translate(x, y)
    if (
      fragmentState.fragment &&
      fragmentState.fragment.mode !== 'time-window'
    ) {
      ctx.beginPath()
      ctx.rect(0, 0, fragmentState.visibleWidth, fragmentState.visibleHeight)
      ctx.clip()
      ctx.translate(0, -fragmentState.offsetY)
    }
    if (chart.kind === 'dental') {
      this.drawDentalChart(ctx, chart, width, height)
      ctx.restore()
      return
    }
    if (chart.kind === 'vital-signs') {
      drawChartVitalSigns(ctx, chart, width, height)
      ctx.restore()
      return
    }
    this.drawFrame(ctx, chart, width, height)
    const renderContext = this.resolveRenderContext(chart, width, height)
    this.drawRegions(ctx, chart, renderContext)
    this.drawSeries(ctx, chart, renderContext)
    this.drawMarks(ctx, chart, renderContext)
    this.drawAnnotations(ctx, chart, renderContext)
    ctx.restore()
  }

  private drawFrame(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    width: number,
    height: number
  ) {
    const theme = chart.theme || {}
    const renderContext = this.resolveRenderContext(chart, width, height)
    ctx.fillStyle = theme.backgroundColor || '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#d1d5db'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, Math.max(1, width - 1), Math.max(1, height - 1))
    const { plot } = renderContext
    if (isEcgChart(chart)) {
      this.drawEcgFrame(ctx, chart, renderContext, width)
      return
    }
    ctx.strokeStyle = theme.gridColor || '#e5e7eb'
    ctx.lineWidth = 1
    const xTickList = this.resolveAxisTickList({
      chart,
      renderContext,
      axis: 'x'
    })
    const yTickList = this.resolveAxisTickList({
      chart,
      renderContext,
      axis: 'y'
    })
    xTickList.forEach((tick, index) => {
      const gridX = tick.position
      ctx.strokeStyle =
        chart.kind === 'ecg' && index % 5 !== 0
          ? '#fee2e2'
          : theme.gridColor || '#e5e7eb'
      ctx.beginPath()
      ctx.moveTo(gridX, plot.y)
      ctx.lineTo(gridX, plot.y + plot.height)
      ctx.stroke()
    })
    yTickList.forEach((tick, index) => {
      const gridY = tick.position
      ctx.strokeStyle =
        chart.kind === 'ecg' && index % 5 !== 0
          ? '#fee2e2'
          : theme.gridColor || '#e5e7eb'
      ctx.beginPath()
      ctx.moveTo(plot.x, gridY)
      ctx.lineTo(plot.x + plot.width, gridY)
      ctx.stroke()
    })
    ctx.strokeStyle = '#6b7280'
    ctx.beginPath()
    ctx.moveTo(plot.x, plot.y)
    ctx.lineTo(plot.x, plot.y + plot.height)
    ctx.lineTo(plot.x + plot.width, plot.y + plot.height)
    ctx.stroke()
    if (chart.title) {
      ctx.fillStyle = theme.textColor || '#1f2937'
      ctx.font = `12px ${theme.fontFamily || 'Arial, sans-serif'}`
      ctx.textBaseline = 'top'
      ctx.fillText(chart.title, renderContext.padding.left, 8)
    }
    this.drawMedicalBands(ctx, chart, renderContext)
    this.drawAxisLabels(ctx, chart, renderContext, xTickList, yTickList)
    this.drawLegend(ctx, chart, width, height)
  }

  private drawSeries(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext
  ) {
    const seriesList = chart.series || []
    if (!seriesList.length) return
    if (isEcgChart(chart)) {
      this.drawEcgSeries(ctx, chart, renderContext)
      return
    }
    const palette = chart.theme?.palette || ['#2563eb', '#dc2626', '#16a34a']
    const orderedSeriesList = [
      ...seriesList.filter(series => series.type === 'bar'),
      ...seriesList.filter(series => series.type !== 'bar')
    ]
    orderedSeriesList.forEach(series => {
      const paletteIndex = Math.max(
        0,
        seriesList.findIndex(item => item.id === series.id)
      )
      const rawPoints = this.resolveSeriesPoints(series, chart)
      const points = downsampleChartSeriesPoints({
        series,
        points: rawPoints,
        xMin: renderContext.xRange.min,
        xSpan: renderContext.xRange.span,
        plotWidth: renderContext.plot.width
      })
      if (!points.length) return
      const color = series.color || palette[paletteIndex % palette.length]
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 2
      if (series.type === 'bar') {
        this.drawBarSeries(ctx, chart, series, points, renderContext)
        return
      }
      if (series.type !== 'scatter') {
        this.drawSeriesLine(ctx, series, points, renderContext)
      }
      if (series.symbol !== 'none') {
        points.forEach(point => {
          const coordinate = this.resolvePointCoordinate(point, renderContext)
          this.drawPointSymbol(ctx, series.symbol || 'circle', coordinate.x, coordinate.y)
        })
      }
    })
  }

  private drawBarSeries(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    series: IChartSeries,
    points: IChartPoint[],
    renderContext: IChartRenderContext
  ) {
    points.forEach(point => {
      const rect = this.resolveBarRect(chart, series, point, renderContext)
      if (!rect) return
      ctx.save()
      ctx.globalAlpha = 0.84
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      ctx.restore()
    })
  }

  private drawEcgFrame(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext,
    width: number
  ) {
    const theme = chart.theme || {}
    const { plot } = renderContext
    resolveEcgPaperGridLineList(renderContext).forEach(line => {
      ctx.strokeStyle = line.major ? theme.gridColor || '#fecaca' : '#fee2e2'
      ctx.lineWidth = line.major ? 1 : 0.5
      ctx.beginPath()
      ctx.moveTo(line.x1, line.y1)
      ctx.lineTo(line.x2, line.y2)
      ctx.stroke()
    })
    ctx.strokeStyle = '#6b7280'
    ctx.lineWidth = 1
    ctx.strokeRect(plot.x, plot.y, plot.width, plot.height)
    ctx.fillStyle = theme.textColor || '#1f2937'
    ctx.font = `12px ${theme.fontFamily || 'Arial, sans-serif'}`
    ctx.textBaseline = 'top'
    ctx.fillText(chart.title || '心电图', renderContext.padding.left, 8)
    ctx.textAlign = 'right'
    ctx.fillText(resolveEcgMetadataText(chart), width - renderContext.padding.right, 8)
    ctx.textAlign = 'start'
    ctx.font = `11px ${theme.fontFamily || 'Arial, sans-serif'}`
    resolveEcgLeadLayoutList(chart, renderContext).forEach(layout => {
      ctx.fillText(layout.label, layout.labelPoint.x, layout.labelPoint.y)
    })
    const pulse = resolveEcgCalibrationPulse(renderContext)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 1.5
    ctx.stroke(new Path2D(pulse.path))
    ctx.fillStyle = theme.textColor || '#4b5563'
    ctx.font = `10px ${theme.fontFamily || 'Arial, sans-serif'}`
    ctx.fillText(pulse.label, pulse.labelPoint.x, pulse.labelPoint.y)
  }

  private drawEcgSeries(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext
  ) {
    const palette = chart.theme?.palette || ['#111827']
    const seriesList = chart.series || []
    seriesList.forEach((series, seriesIndex) => {
      const { context: leadContext } = resolveEcgSeriesRenderContext(
        chart,
        renderContext,
        series,
        seriesIndex
      )
      const rawPoints = this.resolveSeriesPoints(series, chart)
      const points = downsampleChartSeriesPoints({
        series,
        points: rawPoints,
        xMin: leadContext.xRange.min,
        xSpan: leadContext.xRange.span,
        plotWidth: leadContext.plot.width
      })
      if (!points.length) return
      ctx.save()
      ctx.beginPath()
      ctx.rect(
        leadContext.plot.x,
        leadContext.plot.y,
        leadContext.plot.width,
        leadContext.plot.height
      )
      ctx.clip()
      ctx.strokeStyle = series.color || palette[seriesIndex % palette.length]
      ctx.lineWidth = 1.2
      this.drawSeriesLine(ctx, series, points, leadContext)
      ctx.restore()
    })
  }

  private drawSeriesLine(
    ctx: CanvasRenderingContext2D,
    series: IChartSeries,
    points: IChartPoint[],
    renderContext: IChartRenderContext
  ) {
    ctx.beginPath()
    const coordinateList = points.map(point =>
      this.resolvePointCoordinate(point, renderContext)
    )
    const firstPoint = coordinateList[0]
    if (!firstPoint) return
    ctx.moveTo(firstPoint.x, firstPoint.y)
    if (series.type === 'smoothLine') {
      resolveChartSmoothBezierSegmentList(coordinateList).forEach(segment => {
        ctx.bezierCurveTo(
          segment.control1.x,
          segment.control1.y,
          segment.control2.x,
          segment.control2.y,
          segment.end.x,
          segment.end.y
        )
      })
    } else {
      coordinateList.slice(1).forEach((coordinate, index) => {
        if (series.type === 'stepLine') {
          const previous = coordinateList[index]
          ctx.lineTo(coordinate.x, previous.y)
        }
        ctx.lineTo(coordinate.x, coordinate.y)
      })
    }
    ctx.stroke()
  }

  private drawPointSymbol(
    ctx: CanvasRenderingContext2D,
    symbol: NonNullable<IChartSeries['symbol']>,
    x: number,
    y: number
  ) {
    ctx.beginPath()
    if (symbol === 'square') {
      ctx.rect(x - 3, y - 3, 6, 6)
    } else if (symbol === 'triangle') {
      ctx.moveTo(x, y - 4)
      ctx.lineTo(x + 4, y + 3)
      ctx.lineTo(x - 4, y + 3)
      ctx.closePath()
    } else {
      ctx.arc(x, y, symbol === 'dot' ? 2 : 3, 0, Math.PI * 2)
    }
    ctx.fill()
  }

  private drawRegions(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext
  ) {
    const regions = chart.regions || []
    if (!regions.length) return
    regions.forEach(region => {
      const rect = this.resolveRegionRect(region, renderContext)
      if (!rect) return
      ctx.save()
      ctx.globalAlpha = 0.36
      ctx.fillStyle = region.color || this.resolveRegionColor(region)
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height)
      ctx.restore()
      if (region.label) {
        ctx.fillStyle = chart.theme?.textColor || '#374151'
        ctx.font = `11px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`
        ctx.textBaseline = 'top'
        ctx.fillText(region.label, rect.x + 4, rect.y + 4)
      }
    })
  }

  private drawMarks(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext
  ) {
    const marks = chart.marks || []
    if (!marks.length) return
    marks.forEach(mark => {
      const point = this.resolveMarkPoint(mark, renderContext)
      if (!point) return
      ctx.fillStyle = this.resolveMarkColor(mark)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(point.x, point.y - 5)
      ctx.lineTo(point.x + 5, point.y + 5)
      ctx.lineTo(point.x - 5, point.y + 5)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      if (mark.label) {
        ctx.fillStyle = chart.theme?.textColor || '#1f2937'
        ctx.font = `11px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`
        ctx.textBaseline = 'bottom'
        ctx.fillText(mark.label, point.x + 6, point.y - 2)
      }
    })
  }

  private drawAnnotations(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext
  ) {
    const annotations = chart.annotations || []
    if (!annotations.length) return
    annotations.forEach(annotation => {
      const point = this.resolveAnnotationPoint(annotation, renderContext)
      if (!point) return
      ctx.fillStyle = chart.theme?.textColor || '#1f2937'
      ctx.font = `11px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`
      ctx.textBaseline = 'middle'
      ctx.fillText(annotation.text, point.x + 4, point.y)
    })
  }

  private resolveRenderContext(
    chart: IChartGraphic,
    width: number,
    height: number
  ): IChartRenderContext {
    return resolveChartRenderContext(chart, width, height)
  }

  private resolveSeriesPoints(
    series: IChartSeries,
    chart: IChartGraphic
  ): IResolvedChartSeriesPoint[] {
    return filterChartGraphicPointsToVisibleWindow(
      resolveChartSeriesDataPoints(series, chart.coordinate?.xAxis),
      chart
    )
  }

  private resolvePointCoordinate(
    point: IChartPoint,
    renderContext: IChartRenderContext
  ) {
    return resolveChartPointCoordinate(point, renderContext)
  }

  private resolveBarRect(
    chart: IChartGraphic,
    series: IChartSeries,
    point: IChartPoint,
    renderContext: IChartRenderContext
  ): IChartBarRect | null {
    return resolveChartBarRect({
      chart,
      series,
      point,
      context: renderContext
    })
  }

  private resolveMarkPoint(
    mark: IChartMark,
    renderContext: IChartRenderContext
  ) {
    const medicalPoint = resolveChartMedicalMarkCoordinate(
      renderContext.chart,
      mark,
      renderContext
    )
    if (medicalPoint) return medicalPoint
    const rawPoint = resolveChartRawMarkPoint(
      mark,
      renderContext.xAxis,
      renderContext.yAxis
    )
    return rawPoint ? this.resolvePointCoordinate(rawPoint, renderContext) : null
  }

  private drawMedicalBands(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext
  ) {
    const layout = resolveChartMedicalBandLayout(chart, renderContext)
    if (!layout) return
    ctx.save()
    ctx.fillStyle = chart.kind === 'vital-signs' ? '#eff6ff' : '#f3f4f6'
    ctx.fillRect(
      renderContext.plot.x,
      renderContext.plot.y - layout.headerHeight,
      renderContext.plot.width,
      layout.headerHeight
    )
    ctx.strokeStyle = chart.theme?.gridColor || '#d1d5db'
    ctx.strokeRect(
      renderContext.plot.x,
      renderContext.plot.y - layout.headerHeight,
      renderContext.plot.width,
      layout.headerHeight
    )
    ctx.fillStyle = chart.theme?.textColor || '#1f2937'
    ctx.font = `11px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`
    ctx.textBaseline = 'middle'
    ctx.fillText(
      resolveChartMedicalHeaderText(chart),
      renderContext.plot.x + 6,
      renderContext.plot.y - layout.headerHeight / 2
    )
    if (layout.eventTrack) {
      ctx.fillStyle = '#f9fafb'
      ctx.fillRect(
        layout.eventTrack.x,
        layout.eventTrack.y,
        layout.eventTrack.width,
        layout.eventTrack.height
      )
      ctx.strokeRect(
        layout.eventTrack.x,
        layout.eventTrack.y,
        layout.eventTrack.width,
        layout.eventTrack.height
      )
      ctx.fillStyle = chart.theme?.textColor || '#4b5563'
      ctx.fillText(
        chart.kind === 'anesthesia' ? '麻醉事件' : '护理事件',
        Math.max(4, layout.eventTrack.x - 44),
        layout.eventTrack.y + layout.eventTrack.height / 2
      )
    }
    ctx.restore()
  }

  private resolveAnnotationPoint(
    annotation: IChartAnnotation,
    renderContext: IChartRenderContext
  ) {
    const rawPoint = resolveChartRawAnnotationPoint(
      annotation,
      renderContext.xAxis,
      renderContext.yAxis
    )
    return rawPoint ? this.resolvePointCoordinate(rawPoint, renderContext) : null
  }

  private resolveRegionRect(
    region: IChartRegion,
    renderContext: IChartRenderContext
  ) {
    const { x, y, width, height } = resolveChartRegionRect(region, renderContext)
    if (!width || !height) return null
    return { x, y, width, height }
  }

  private resolveRegionColor(region: IChartRegion) {
    if (region.type === 'warning') return '#fee2e2'
    if (region.type === 'phase') return '#dbeafe'
    return '#fce7f3'
  }

  private resolveMarkColor(mark: IChartMark) {
    if (mark.type === 'warning') return '#dc2626'
    if (mark.type === 'medication') return '#2563eb'
    return '#9333ea'
  }

  private resolveAxisTickList(payload: {
    chart: IChartGraphic
    renderContext: IChartRenderContext
    axis: 'x' | 'y'
  }) {
    const { chart, renderContext, axis } = payload
    return resolveChartAxisTickList({
      axis:
        axis === 'x' ? chart.coordinate?.xAxis : chart.coordinate?.yAxis,
      range: axis === 'x' ? renderContext.xRange : renderContext.yRange,
      plotStart:
        axis === 'x'
          ? renderContext.plot.x
          : renderContext.plot.y + renderContext.plot.height,
      plotSize:
        axis === 'x'
          ? renderContext.plot.width
          : -renderContext.plot.height,
      defaultSegments:
        axis === 'x'
          ? chart.kind === 'ecg'
            ? 20
            : 5
          : chart.kind === 'ecg'
            ? 10
            : 4
    })
  }

  private drawAxisLabels(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    renderContext: IChartRenderContext,
    xTickList: IChartAxisTick[],
    yTickList: IChartAxisTick[]
  ) {
    ctx.save()
    ctx.fillStyle = chart.theme?.textColor || '#4b5563'
    ctx.font = `10px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    yTickList.forEach(tick => {
      ctx.fillText(tick.label, renderContext.plot.x - 6, tick.position)
    })
    ctx.textBaseline = 'top'
    ctx.textAlign = 'center'
    xTickList.forEach(tick => {
      ctx.fillText(
        tick.label,
        tick.position,
        renderContext.plot.y + renderContext.plot.height + 6
      )
    })
    ctx.restore()
  }

  private drawLegend(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    width: number,
    height: number
  ) {
    const legendItemList = resolveChartLegendLayout(chart, width, height)
    if (!legendItemList.length) return
    ctx.save()
    ctx.font = `10px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'left'
    legendItemList.forEach(item => {
      this.drawLegendItem(ctx, chart, item)
    })
    ctx.restore()
  }

  private drawLegendItem(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    item: IChartLegendItemLayout
  ) {
    ctx.strokeStyle = item.color
    ctx.fillStyle = item.color
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(item.x, item.y + 6)
    ctx.lineTo(item.x + 10, item.y + 6)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(item.x + 5, item.y + 6, 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = chart.theme?.textColor || '#374151'
    ctx.fillText(item.label, item.x + 14, item.y + 6)
  }

  private drawDentalChart(
    ctx: CanvasRenderingContext2D,
    chart: IChartGraphic,
    width: number,
    height: number
  ) {
    const theme = chart.theme || {}
    ctx.fillStyle = theme.backgroundColor || '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#d1d5db'
    ctx.strokeRect(0.5, 0.5, Math.max(1, width - 1), Math.max(1, height - 1))
    ctx.fillStyle = theme.textColor || '#1f2937'
    ctx.font = `12px ${theme.fontFamily || 'Arial, sans-serif'}`
    ctx.textBaseline = 'top'
    ctx.fillText(chart.title || '牙位图', 16, 10)
    const dental = chart.dental
    if (!dental?.teeth.length) return
    const topCodes = dental.teeth.slice(0, 16)
    const bottomCodes = dental.teeth.slice(16, 32)
    const startX = 24
    const topY = 56
    const bottomY = 166
    const toothWidth = Math.max(22, (width - startX * 2) / 16 - 4)
    const toothHeight = 58
    this.drawDentalRow(ctx, topCodes, startX, topY, toothWidth, toothHeight, true)
    this.drawDentalRow(
      ctx,
      bottomCodes,
      startX,
      bottomY,
      toothWidth,
      toothHeight,
      false
    )
    this.drawDentalLegend(ctx, startX, height - 28)
    ctx.strokeStyle = '#9ca3af'
    ctx.beginPath()
    ctx.moveTo(width / 2, topY - 12)
    ctx.lineTo(width / 2, bottomY + toothHeight + 12)
    ctx.moveTo(startX, (topY + bottomY + toothHeight) / 2)
    ctx.lineTo(width - startX, (topY + bottomY + toothHeight) / 2)
    ctx.stroke()
  }

  private drawDentalRow(
    ctx: CanvasRenderingContext2D,
    teeth: NonNullable<IChartGraphic['dental']>['teeth'],
    startX: number,
    y: number,
    toothWidth: number,
    toothHeight: number,
    isTopRow: boolean
  ) {
    teeth.forEach((tooth, index) => {
      const x = startX + index * (toothWidth + 4)
      const status = tooth.status || []
      const geometry = resolveDentalToothPathGeometry({
        toothCode: tooth.code,
        x,
        y,
        width: toothWidth,
        height: toothHeight,
        isTopRow
      })
      const toothPath = new Path2D(geometry.toothPath)
      ctx.fillStyle = resolveDentalToothFill(status)
      ctx.strokeStyle = '#6b7280'
      ctx.lineWidth = 1
      ctx.fill(toothPath)
      this.drawDentalSurfaceState(
        ctx,
        tooth,
        geometry
      )
      ctx.stroke(toothPath)
      ctx.fillStyle = '#111827'
      ctx.font = '11px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(tooth.code, x + toothWidth / 2, y + toothHeight / 2)
      resolveDentalStatusVisualList(status).forEach(visual => {
        this.drawDentalStatusMarker(ctx, visual, x, y, toothWidth, toothHeight)
      })
    })
    ctx.textAlign = 'start'
  }

  private drawDentalSurfaceState(
    ctx: CanvasRenderingContext2D,
    tooth: NonNullable<IChartGraphic['dental']>['teeth'][number],
    geometry: ReturnType<typeof resolveDentalToothPathGeometry>
  ) {
    const surfaces = tooth.surfaces
    if (!surfaces) return
    geometry.surfaceList.forEach(surface => {
      const statusList = surfaces[surface.surface]
      if (!Array.isArray(statusList) || !statusList.length) return
      ctx.save()
      ctx.globalAlpha = 0.92
      ctx.fillStyle = resolveDentalToothFill(statusList)
      const path = new Path2D(surface.path)
      ctx.fill(path)
      ctx.strokeStyle =
        resolveDentalStatusVisualList(statusList)[0]?.stroke || '#6b7280'
      ctx.lineWidth = 1
      ctx.stroke(path)
      ctx.restore()
    })
  }

  private drawDentalStatusMarker(
    ctx: CanvasRenderingContext2D,
    visual: IDentalStatusVisual,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    ctx.save()
    ctx.strokeStyle = visual.stroke
    ctx.fillStyle = visual.stroke
    ctx.lineWidth = 2
    if (visual.marker === 'cross') {
      ctx.beginPath()
      ctx.moveTo(x + 6, y + 6)
      ctx.lineTo(x + width - 6, y + height - 6)
      ctx.moveTo(x + width - 6, y + 6)
      ctx.lineTo(x + 6, y + height - 6)
      ctx.stroke()
    } else if (visual.marker === 'corner-dot') {
      ctx.beginPath()
      ctx.arc(x + width - 8, y + 8, 4, 0, Math.PI * 2)
      ctx.fill()
    } else if (visual.marker === 'horizontal-band') {
      ctx.fillRect(x + 6, y + height - 14, width - 12, 4)
    } else if (visual.marker === 'vertical-line') {
      ctx.beginPath()
      ctx.moveTo(x + width / 2, y + 8)
      ctx.lineTo(x + width / 2, y + height - 8)
      ctx.stroke()
    } else if (visual.marker === 'top-band') {
      ctx.fillRect(x + 5, y + 6, width - 10, 5)
    } else if (visual.marker === 'implant') {
      ctx.beginPath()
      ctx.arc(x + width / 2, y + height - 12, 4, 0, Math.PI * 2)
      ctx.fill()
      ctx.moveTo(x + width / 2, y + 12)
      ctx.lineTo(x + width / 2, y + height - 16)
      ctx.stroke()
    }
    ctx.restore()
  }

  private drawDentalLegend(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save()
    ctx.font = '10px Arial, sans-serif'
    ctx.textBaseline = 'middle'
    let currentX = x
    DENTAL_STATUS_VISUAL_LIST.forEach(visual => {
      ctx.fillStyle = visual.fill
      ctx.strokeStyle = visual.stroke
      ctx.fillRect(currentX, y, 10, 10)
      ctx.strokeRect(currentX, y, 10, 10)
      ctx.fillStyle = '#374151'
      ctx.fillText(visual.label, currentX + 14, y + 5)
      currentX += 56
    })
    ctx.restore()
  }
}
