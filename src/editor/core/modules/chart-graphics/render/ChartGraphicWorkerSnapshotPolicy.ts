import {
  IChartGraphic,
  IChartSeries
} from '../model/ChartGraphic'
import { IElementPosition } from '../../../../interface/Element'
import { IRowElement } from '../../../../interface/Row'
import { IWorkerPaintCommand } from '../../../render-backend/worker/WorkerRenderProtocol'
import {
  DENTAL_STATUS_VISUAL_LIST,
  IDentalStatusVisual,
  resolveDentalStatusVisualList,
  resolveDentalToothPathGeometry,
  resolveDentalToothFill
} from './DentalChartRenderPolicy'
import {
  downsampleChartSeriesPoints,
  resolveChartSeriesDataPoints
} from './ChartGraphicSeriesPointPolicy'
import {
  filterChartGraphicPointsToVisibleWindow,
  resolveChartGraphicFragmentChart,
  resolveChartGraphicFragmentRenderState
} from '../layout/ChartGraphicFragmentPolicy'
import {
  IChartAxisTick,
  IChartLegendItemLayout,
  IChartRenderContext,
  resolveChartAxisTickList,
  resolveChartBarRect,
  resolveChartLegendLayout,
  resolveChartPointCoordinate,
  resolveChartRawAnnotationPoint,
  resolveChartRawMarkPoint,
  resolveChartRegionRect,
  resolveChartRenderContext
} from './ChartGraphicCoordinatePolicy'
import {
  resolveChartMedicalBandLayout,
  resolveChartMedicalHeaderText,
  resolveChartMedicalMarkCoordinate
} from './ChartGraphicMedicalRenderPolicy'
import {
  isEcgChart,
  resolveEcgCalibrationPulse,
  resolveEcgLeadLayoutList,
  resolveEcgMetadataText,
  resolveEcgPaperGridLineList,
  resolveEcgSeriesRenderContext
} from './ChartGraphicEcgRenderPolicy'

type IWorkerChartContext = IChartRenderContext

function pushFrameCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  width: number,
  height: number,
  alpha: number,
  scale: number
) {
  const theme = chart.theme || {}
  const context = resolveChartRenderContext(chart, width, height)
  const { plot, padding } = context
  commandList.push(
    {
      type: 'fillRect',
      rect: { x: 0, y: 0, width, height },
      fillStyle: theme.backgroundColor || '#ffffff',
      alpha
    },
    {
      type: 'strokeRect',
      rect: { x: 0.5, y: 0.5, width: Math.max(1, width - 1), height: Math.max(1, height - 1) },
      strokeStyle: '#d1d5db',
      lineWidth: Math.max(1, scale),
      alpha
    }
  )
  if (isEcgChart(chart)) {
    resolveEcgPaperGridLineList(context).forEach(line => {
      commandList.push({
        type: 'strokePath',
        segmentList: [{ from: [line.x1, line.y1], to: [line.x2, line.y2] }],
        strokeStyle: line.major ? theme.gridColor || '#fecaca' : '#fee2e2',
        lineWidth: Math.max(0.5, (line.major ? 1 : 0.5) * scale),
        alpha
      })
    })
    commandList.push(
      {
        type: 'strokeRect',
        rect: plot,
        strokeStyle: '#6b7280',
        lineWidth: Math.max(1, scale),
        alpha
      },
      {
        type: 'fillText',
        text: chart.title || '心电图',
        x: padding.left,
        y: 18,
        font: `12px ${theme.fontFamily || 'Arial, sans-serif'}`,
        fillStyle: theme.textColor || '#1f2937',
        alpha,
        baseline: 'alphabetic'
      },
      {
        type: 'fillText',
        text: resolveEcgMetadataText(chart),
        x: width - padding.right - 110,
        y: 18,
        font: `12px ${theme.fontFamily || 'Arial, sans-serif'}`,
        fillStyle: theme.textColor || '#1f2937',
        alpha,
        baseline: 'alphabetic'
      }
    )
    resolveEcgLeadLayoutList(chart, context).forEach(layout => {
      commandList.push({
        type: 'fillText',
        text: layout.label,
        x: layout.labelPoint.x,
        y: layout.labelPoint.y + 10,
        font: `11px ${theme.fontFamily || 'Arial, sans-serif'}`,
        fillStyle: theme.textColor || '#1f2937',
        alpha,
        baseline: 'alphabetic'
      })
    })
    const pulse = resolveEcgCalibrationPulse(context)
    commandList.push(
      {
        type: 'strokeSvgPath',
        path: pulse.path,
        strokeStyle: '#111827',
        lineWidth: Math.max(1, 1.5 * scale),
        alpha
      },
      {
        type: 'fillText',
        text: pulse.label,
        x: pulse.labelPoint.x,
        y: pulse.labelPoint.y,
        font: `10px ${theme.fontFamily || 'Arial, sans-serif'}`,
        fillStyle: theme.textColor || '#4b5563',
        alpha,
        baseline: 'alphabetic'
      }
    )
    return
  }
  const xTickList = resolveAxisTickList({
    chart,
    context,
    axis: 'x'
  })
  const yTickList = resolveAxisTickList({
    chart,
    context,
    axis: 'y'
  })
  xTickList.forEach((tick, index) => {
    const gridX = tick.position
    commandList.push({
      type: 'strokePath',
      segmentList: [{ from: [gridX, plot.y], to: [gridX, plot.y + plot.height] }],
      strokeStyle:
        chart.kind === 'ecg' && index % 5 !== 0
          ? '#fee2e2'
          : theme.gridColor || '#e5e7eb',
      lineWidth: Math.max(1, scale),
      alpha
    })
  })
  yTickList.forEach((tick, index) => {
    const gridY = tick.position
    commandList.push({
      type: 'strokePath',
      segmentList: [{ from: [plot.x, gridY], to: [plot.x + plot.width, gridY] }],
      strokeStyle:
        chart.kind === 'ecg' && index % 5 !== 0
          ? '#fee2e2'
          : theme.gridColor || '#e5e7eb',
      lineWidth: Math.max(1, scale),
      alpha
    })
  })
  commandList.push({
    type: 'strokePath',
    segmentList: [
      { from: [plot.x, plot.y], to: [plot.x, plot.y + plot.height] },
      {
        from: [plot.x, plot.y + plot.height],
        to: [plot.x + plot.width, plot.y + plot.height]
      }
    ],
    strokeStyle: '#6b7280',
    lineWidth: Math.max(1, scale),
    alpha
  })
  if (chart.title) {
    commandList.push({
      type: 'fillText',
      text: chart.title,
      x: padding.left,
      y: 18,
      font: `12px ${theme.fontFamily || 'Arial, sans-serif'}`,
      fillStyle: theme.textColor || '#1f2937',
      alpha,
      baseline: 'alphabetic'
    })
  }
  pushAxisLabelCommands(commandList, chart, context, xTickList, yTickList, alpha)
  pushLegendCommands(commandList, chart, width, height, alpha, scale)
  const medicalLayout = resolveChartMedicalBandLayout(chart, context)
  if (medicalLayout) {
    commandList.push(
      {
        type: 'fillRect',
        rect: {
          x: context.plot.x,
          y: context.plot.y - medicalLayout.headerHeight,
          width: context.plot.width,
          height: medicalLayout.headerHeight
        },
        fillStyle: chart.kind === 'vital-signs' ? '#eff6ff' : '#f3f4f6',
        alpha
      },
      {
        type: 'fillText',
        text: resolveChartMedicalHeaderText(chart),
        x: context.plot.x + 6,
        y: context.plot.y - medicalLayout.headerHeight / 2,
        font: `11px ${theme.fontFamily || 'Arial, sans-serif'}`,
        fillStyle: theme.textColor || '#1f2937',
        alpha,
        baseline: 'middle'
      }
    )
    if (medicalLayout.eventTrack) {
      commandList.push({
        type: 'fillRect',
        rect: medicalLayout.eventTrack,
        fillStyle: '#f9fafb',
        alpha
      })
    }
  }
}

function pushRegionCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  context: IWorkerChartContext,
  alpha: number
) {
  const regions = chart.regions || []
  regions.forEach(region => {
    const { x, y, width, height } = resolveChartRegionRect(region, context)
    if (!width || !height) return
    commandList.push({
      type: 'fillRect',
      rect: { x, y, width, height },
      fillStyle: region.color || (region.type === 'phase' ? '#dbeafe' : '#fce7f3'),
      alpha: alpha * 0.36
    })
    if (region.label) {
      commandList.push({
        type: 'fillText',
        text: region.label,
        x: x + 4,
        y: y + 14,
        font: `11px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`,
        fillStyle: chart.theme?.textColor || '#374151',
        alpha
      })
    }
  })
}

function pushPointSymbolCommands(
  commandList: IWorkerPaintCommand[],
  symbol: NonNullable<IChartSeries['symbol']>,
  x: number,
  y: number,
  fillStyle: string,
  alpha: number
) {
  if (symbol === 'square') {
    commandList.push({
      type: 'fillRect',
      rect: { x: x - 3, y: y - 3, width: 6, height: 6 },
      fillStyle,
      alpha
    })
    return
  }
  if (symbol === 'triangle') {
    commandList.push({
      type: 'fillPath',
      segmentList: [
        { from: [x, y - 4], to: [x + 4, y + 3] },
        { from: [x + 4, y + 3], to: [x - 4, y + 3] },
        { from: [x - 4, y + 3], to: [x, y - 4] }
      ],
      fillStyle,
      alpha
    })
    return
  }
  commandList.push({
    type: 'fillCircle',
    x,
    y,
    radius: symbol === 'dot' ? 2 : 3,
    fillStyle,
    alpha
  })
}

function pushSeriesCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  context: IWorkerChartContext,
  alpha: number,
  scale: number
) {
  if (isEcgChart(chart)) {
    pushEcgSeriesCommands(commandList, chart, context, alpha, scale)
    return
  }
  const palette = chart.theme?.palette || ['#2563eb', '#dc2626', '#16a34a']
  const seriesList = chart.series || []
  const orderedSeriesList = [
    ...seriesList.filter(series => series.type === 'bar'),
    ...seriesList.filter(series => series.type !== 'bar')
  ]
  orderedSeriesList.forEach(series => {
    const paletteIndex = Math.max(
      0,
      seriesList.findIndex(item => item.id === series.id)
    )
    const rawPoints = filterChartGraphicPointsToVisibleWindow(
      resolveChartSeriesDataPoints(series, chart.coordinate?.xAxis),
      chart
    )
    const points = downsampleChartSeriesPoints({
      series,
      points: rawPoints,
      xMin: context.xRange.min,
      xSpan: context.xRange.span,
      plotWidth: context.plot.width
    })
    if (!points.length) return
    const color = series.color || palette[paletteIndex % palette.length]
    if (series.type === 'bar') {
      points.forEach(point => {
        const rect = resolveChartBarRect({
          chart,
          series,
          point,
          context
        })
        if (!rect) return
        commandList.push({
          type: 'fillRect',
          rect,
          fillStyle: color,
          alpha: alpha * 0.84
        })
      })
      return
    }
    if (series.type !== 'scatter') {
      const segmentList: NonNullable<Extract<IWorkerPaintCommand, { type: 'strokePath' }>['segmentList']> = []
      for (let index = 1; index < points.length; index++) {
        const previous = resolveChartPointCoordinate(points[index - 1], context)
        const current = resolveChartPointCoordinate(points[index], context)
        if (series.type === 'stepLine') {
          segmentList.push({
            from: [previous.x, previous.y],
            to: [current.x, previous.y]
          })
          segmentList.push({
            from: [current.x, previous.y],
            to: [current.x, current.y]
          })
        } else {
          segmentList.push({
            from: [previous.x, previous.y],
            to: [current.x, current.y]
          })
        }
      }
      commandList.push({
        type: 'strokePath',
        segmentList,
        strokeStyle: color,
        lineWidth: Math.max(2, 2 * scale),
        alpha
      })
    }
    if (series.symbol !== 'none') {
      points.forEach(point => {
        const coordinate = resolveChartPointCoordinate(point, context)
        pushPointSymbolCommands(
          commandList,
          series.symbol || 'circle',
          coordinate.x,
          coordinate.y,
          color,
          alpha
        )
      })
    }
  })
}

function pushEcgSeriesCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  context: IWorkerChartContext,
  alpha: number,
  scale: number
) {
  const palette = chart.theme?.palette || ['#111827']
  const seriesList = chart.series || []
  seriesList.forEach((series, seriesIndex) => {
    const { context: leadContext } = resolveEcgSeriesRenderContext(
      chart,
      context,
      series,
      seriesIndex
    )
    const rawPoints = filterChartGraphicPointsToVisibleWindow(
      resolveChartSeriesDataPoints(series, chart.coordinate?.xAxis),
      chart
    )
    const points = downsampleChartSeriesPoints({
      series,
      points: rawPoints,
      xMin: leadContext.xRange.min,
      xSpan: leadContext.xRange.span,
      plotWidth: leadContext.plot.width
    })
    if (points.length < 2) return
    const segmentList: NonNullable<
      Extract<IWorkerPaintCommand, { type: 'strokePath' }>['segmentList']
    > = []
    for (let index = 1; index < points.length; index++) {
      const previous = resolveChartPointCoordinate(points[index - 1], leadContext)
      const current = resolveChartPointCoordinate(points[index], leadContext)
      segmentList.push({
        from: [previous.x, previous.y],
        to: [current.x, current.y]
      })
    }
    commandList.push(
      {
        type: 'pushClipRect',
        rect: leadContext.plot
      },
      {
        type: 'strokePath',
        segmentList,
        strokeStyle: series.color || palette[seriesIndex % palette.length],
        lineWidth: Math.max(1, 1.2 * scale),
        alpha
      },
      {
        type: 'popState'
      }
    )
  })
}

function pushMarkCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  context: IWorkerChartContext,
  alpha: number
) {
  const marks = chart.marks || []
  marks.forEach(mark => {
    const point = resolveChartRawMarkPoint(mark, context.xAxis, context.yAxis)
    const coordinate =
      resolveChartMedicalMarkCoordinate(chart, mark, context) ||
      (point ? resolveChartPointCoordinate(point, context) : null)
    if (!coordinate) return
    const fillStyle =
      mark.type === 'warning'
        ? '#dc2626'
        : mark.type === 'medication'
          ? '#2563eb'
          : '#9333ea'
    commandList.push({
      type: 'fillPath',
      segmentList: [
        { from: [coordinate.x, coordinate.y - 5], to: [coordinate.x + 5, coordinate.y + 5] },
        { from: [coordinate.x + 5, coordinate.y + 5], to: [coordinate.x - 5, coordinate.y + 5] },
        { from: [coordinate.x - 5, coordinate.y + 5], to: [coordinate.x, coordinate.y - 5] }
      ],
      fillStyle,
      alpha
    })
    if (mark.label) {
      commandList.push({
        type: 'fillText',
        text: mark.label,
        x: coordinate.x + 6,
        y: coordinate.y - 2,
        font: `11px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`,
        fillStyle: chart.theme?.textColor || '#1f2937',
        alpha
      })
    }
  })
}

function pushAnnotationCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  context: IWorkerChartContext,
  alpha: number
) {
  const annotations = chart.annotations || []
  annotations.forEach(annotation => {
    const point = resolveChartRawAnnotationPoint(
      annotation,
      context.xAxis,
      context.yAxis
    )
    if (!point) return
    const coordinate = resolveChartPointCoordinate(point, context)
    commandList.push({
      type: 'fillText',
      text: annotation.text,
      x: coordinate.x + 4,
      y: coordinate.y,
      font: `11px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`,
      fillStyle: chart.theme?.textColor || '#1f2937',
      alpha,
      baseline: 'middle'
    })
  })
}

function resolveAxisTickList(payload: {
  chart: IChartGraphic
  context: IWorkerChartContext
  axis: 'x' | 'y'
}) {
  const { chart, context, axis } = payload
  return resolveChartAxisTickList({
    axis: axis === 'x' ? chart.coordinate?.xAxis : chart.coordinate?.yAxis,
    range: axis === 'x' ? context.xRange : context.yRange,
    plotStart:
      axis === 'x' ? context.plot.x : context.plot.y + context.plot.height,
    plotSize: axis === 'x' ? context.plot.width : -context.plot.height,
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

function pushAxisLabelCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  context: IWorkerChartContext,
  xTickList: IChartAxisTick[],
  yTickList: IChartAxisTick[],
  alpha: number
) {
  const font = `10px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`
  const fillStyle = chart.theme?.textColor || '#4b5563'
  yTickList.forEach(tick => {
    commandList.push({
      type: 'fillText',
      text: tick.label,
      x: context.plot.x - 6,
      y: tick.position,
      font,
      fillStyle,
      alpha,
      baseline: 'middle'
    })
  })
  xTickList.forEach(tick => {
    commandList.push({
      type: 'fillText',
      text: tick.label,
      x: tick.position,
      y: context.plot.y + context.plot.height + 6,
      font,
      fillStyle,
      alpha,
      baseline: 'top'
    })
  })
}

function pushLegendCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  width: number,
  height: number,
  alpha: number,
  scale: number
) {
  const legendItemList = resolveChartLegendLayout(chart, width, height)
  if (!legendItemList.length) return
  legendItemList.forEach(item => {
    pushLegendItemCommands(commandList, chart, item, alpha, scale)
  })
}

function pushLegendItemCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  item: IChartLegendItemLayout,
  alpha: number,
  scale: number
) {
  commandList.push(
    {
      type: 'strokePath',
      segmentList: [
        {
          from: [item.x, item.y + 6],
          to: [item.x + 10, item.y + 6]
        }
      ],
      strokeStyle: item.color,
      lineWidth: Math.max(1, 2 * scale),
      alpha
    },
    {
      type: 'fillCircle',
      x: item.x + 5,
      y: item.y + 6,
      radius: 2,
      fillStyle: item.color,
      alpha
    },
    {
      type: 'fillText',
      text: item.label,
      x: item.x + 14,
      y: item.y + 6,
      font: `10px ${chart.theme?.fontFamily || 'Arial, sans-serif'}`,
      fillStyle: chart.theme?.textColor || '#374151',
      alpha,
      baseline: 'middle'
    }
  )
}

function pushDentalCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  width: number,
  height: number,
  alpha: number,
  scale: number
) {
  const theme = chart.theme || {}
  commandList.push(
    {
      type: 'fillRect',
      rect: { x: 0, y: 0, width, height },
      fillStyle: theme.backgroundColor || '#ffffff',
      alpha
    },
    {
      type: 'strokeRect',
      rect: { x: 0.5, y: 0.5, width: Math.max(1, width - 1), height: Math.max(1, height - 1) },
      strokeStyle: '#d1d5db',
      lineWidth: Math.max(1, scale),
      alpha
    },
    {
      type: 'fillText',
      text: chart.title || '牙位图',
      x: 16,
      y: 22,
      font: `12px ${theme.fontFamily || 'Arial, sans-serif'}`,
      fillStyle: theme.textColor || '#1f2937',
      alpha
    }
  )
  const teeth = chart.dental?.teeth || []
  const startX = 24
  const toothWidth = Math.max(22, (width - startX * 2) / 16 - 4)
  const toothHeight = 58
  ;[
    { teeth: teeth.slice(0, 16), y: 56, isTopRow: true },
    { teeth: teeth.slice(16, 32), y: 166, isTopRow: false }
  ].forEach(row => {
    row.teeth.forEach((tooth, index) => {
      const x = startX + index * (toothWidth + 4)
      const status = tooth.status || []
      const fillStyle = resolveDentalToothFill(status)
      const geometry = resolveDentalToothPathGeometry({
        toothCode: tooth.code,
        x,
        y: row.y,
        width: toothWidth,
        height: toothHeight,
        isTopRow: row.isTopRow
      })
      commandList.push(
        {
          type: 'fillSvgPath',
          path: geometry.toothPath,
          fillStyle,
          alpha
        },
        {
          type: 'strokeSvgPath',
          path: geometry.toothPath,
          strokeStyle: '#6b7280',
          lineWidth: Math.max(1, scale),
          alpha
        }
      )
      pushDentalSurfaceCommands(
        commandList,
        tooth,
        geometry,
        alpha,
        scale
      )
      commandList.push({
        type: 'fillText',
        text: tooth.code,
        x: x + toothWidth / 2 - 7,
        y: row.y + toothHeight / 2 + 4,
        font: '11px Arial, sans-serif',
        fillStyle: '#111827',
        alpha
      })
      resolveDentalStatusVisualList(status).forEach(visual => {
        pushDentalStatusMarkerCommands(
          commandList,
          visual,
          x,
          row.y,
          toothWidth,
          toothHeight,
          alpha,
          scale
        )
      })
    })
  })
  pushDentalLegendCommands(commandList, 24, height - 28, alpha, scale)
}

function pushDentalSurfaceCommands(
  commandList: IWorkerPaintCommand[],
  tooth: NonNullable<IChartGraphic['dental']>['teeth'][number],
  geometry: ReturnType<typeof resolveDentalToothPathGeometry>,
  alpha: number,
  scale: number
) {
  const surfaces = tooth.surfaces
  if (!surfaces) return
  geometry.surfaceList.forEach(surface => {
    const statusList = surfaces[surface.surface]
    if (!Array.isArray(statusList) || !statusList.length) return
    commandList.push(
      {
        type: 'fillSvgPath',
        path: surface.path,
        fillStyle: resolveDentalToothFill(statusList),
        alpha: alpha * 0.92
      },
      {
        type: 'strokeSvgPath',
        path: surface.path,
        strokeStyle:
          resolveDentalStatusVisualList(statusList)[0]?.stroke || '#6b7280',
        lineWidth: Math.max(1, scale),
        alpha
      }
    )
  })
}

function pushDentalStatusMarkerCommands(
  commandList: IWorkerPaintCommand[],
  visual: IDentalStatusVisual,
  x: number,
  y: number,
  width: number,
  height: number,
  alpha: number,
  scale: number
) {
  const lineWidth = Math.max(1, 2 * scale)
  if (visual.marker === 'cross') {
    commandList.push({
      type: 'strokePath',
      segmentList: [
        { from: [x + 6, y + 6], to: [x + width - 6, y + height - 6] },
        { from: [x + width - 6, y + 6], to: [x + 6, y + height - 6] }
      ],
      strokeStyle: visual.stroke,
      lineWidth,
      alpha
    })
  } else if (visual.marker === 'corner-dot') {
    commandList.push({
      type: 'fillCircle',
      x: x + width - 8,
      y: y + 8,
      radius: 4,
      fillStyle: visual.stroke,
      alpha
    })
  } else if (visual.marker === 'horizontal-band') {
    commandList.push({
      type: 'fillRect',
      rect: { x: x + 6, y: y + height - 14, width: width - 12, height: 4 },
      fillStyle: visual.stroke,
      alpha
    })
  } else if (visual.marker === 'vertical-line') {
    commandList.push({
      type: 'strokePath',
      segmentList: [
        { from: [x + width / 2, y + 8], to: [x + width / 2, y + height - 8] }
      ],
      strokeStyle: visual.stroke,
      lineWidth,
      alpha
    })
  } else if (visual.marker === 'top-band') {
    commandList.push({
      type: 'fillRect',
      rect: { x: x + 5, y: y + 6, width: width - 10, height: 5 },
      fillStyle: visual.stroke,
      alpha
    })
  } else if (visual.marker === 'implant') {
    commandList.push(
      {
        type: 'fillCircle',
        x: x + width / 2,
        y: y + height - 12,
        radius: 4,
        fillStyle: visual.stroke,
        alpha
      },
      {
        type: 'strokePath',
        segmentList: [
          { from: [x + width / 2, y + 12], to: [x + width / 2, y + height - 16] }
        ],
        strokeStyle: visual.stroke,
        lineWidth,
        alpha
      }
    )
  }
}

function pushDentalLegendCommands(
  commandList: IWorkerPaintCommand[],
  x: number,
  y: number,
  alpha: number,
  scale: number
) {
  let currentX = x
  DENTAL_STATUS_VISUAL_LIST.forEach(visual => {
    commandList.push(
      {
        type: 'fillRect',
        rect: { x: currentX, y, width: 10, height: 10 },
        fillStyle: visual.fill,
        alpha
      },
      {
        type: 'strokeRect',
        rect: { x: currentX, y, width: 10, height: 10 },
        strokeStyle: visual.stroke,
        lineWidth: Math.max(1, scale),
        alpha
      },
      {
        type: 'fillText',
        text: visual.label,
        x: currentX + 14,
        y: y + 8,
        font: '10px Arial, sans-serif',
        fillStyle: '#374151',
        alpha
      }
    )
    currentX += 56
  })
}

function translateChartWorkerCommand(
  command: IWorkerPaintCommand,
  translateX: number,
  translateY: number
): IWorkerPaintCommand {
  if (command.type === 'pushClipRect') {
    return {
      ...command,
      rect: {
        ...command.rect,
        x: command.rect.x + translateX,
        y: command.rect.y + translateY
      }
    }
  }
  if (command.type === 'popState') {
    return command
  }
  const translatableCommand = command as IWorkerPaintCommand & {
    translateX?: number
    translateY?: number
  }
  return {
    ...translatableCommand,
    translateX: (translatableCommand.translateX ?? 0) + translateX,
    translateY: (translatableCommand.translateY ?? 0) + translateY
  } as IWorkerPaintCommand
}

/** 生成图表图形 worker/offscreen 绘制命令。 */
export function pushChartGraphicWorkerSnapshotCommands(payload: {
  commandList: IWorkerPaintCommand[]
  element: IRowElement
  rowPosition: IElementPosition
  alpha: number
  scale: number
}) {
  const { commandList, element, rowPosition, alpha, scale } = payload
  const sourceChart = element.chartGraphic
  if (!sourceChart) return
  const fragmentState = resolveChartGraphicFragmentRenderState({
    element,
    metrics: rowPosition.metrics
  })
  if (!fragmentState) return
  const chart = resolveChartGraphicFragmentChart(
    sourceChart,
    fragmentState.fragment
  )
  const width = fragmentState.fullWidth
  const height = fragmentState.fullHeight
  const translateX = rowPosition.coordinate.leftTop[0]
  const translateY = rowPosition.coordinate.leftTop[1]
  const localCommandList: IWorkerPaintCommand[] = []
  if (chart.kind === 'dental') {
    pushDentalCommands(localCommandList, chart, width, height, alpha, scale)
  } else {
    const context = resolveChartRenderContext(chart, width, height)
    pushFrameCommands(localCommandList, chart, width, height, alpha, scale)
    pushRegionCommands(localCommandList, chart, context, alpha)
    pushSeriesCommands(localCommandList, chart, context, alpha, scale)
    pushMarkCommands(localCommandList, chart, context, alpha)
    pushAnnotationCommands(localCommandList, chart, context, alpha)
  }
  if (
    fragmentState.fragment &&
    fragmentState.fragment.mode !== 'time-window'
  ) {
    commandList.push({
      type: 'pushClipRect',
      rect: {
        x: translateX,
        y: translateY,
        width: fragmentState.visibleWidth,
        height: fragmentState.visibleHeight
      }
    })
  }
  localCommandList.forEach(command => {
    commandList.push(
      translateChartWorkerCommand(
        command,
        translateX,
        fragmentState.fragment?.mode === 'time-window'
          ? translateY
          : translateY - fragmentState.offsetY
      )
    )
  })
  if (
    fragmentState.fragment &&
    fragmentState.fragment.mode !== 'time-window'
  ) {
    commandList.push({
      type: 'popState'
    })
  }
}
