import {
  IChartGraphic,
  IChartSeries
} from '../model/ChartGraphic'
import { IElementPosition } from '../../../../interface/Element'
import {
  DENTAL_STATUS_VISUAL_LIST,
  IDentalStatusVisual,
  resolveDentalStatusVisualList,
  resolveDentalToothPathGeometry,
  resolveDentalToothFill
} from '../render/DentalChartRenderPolicy'
import {
  downsampleChartSeriesPoints,
  IResolvedChartSeriesPoint,
  resolveChartSeriesDataPoints
} from '../render/ChartGraphicSeriesPointPolicy'
import { resolveChartSmoothBezierSegmentList } from '../render/ChartGraphicSeriesGeometryPolicy'
import { createVitalSignsSvg } from './ChartGraphicVitalSignsPolicy'
import {
  resolveChartMedicalBandLayout,
  resolveChartMedicalHeaderText,
  resolveChartMedicalMarkCoordinate
} from '../render/ChartGraphicMedicalRenderPolicy'
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
  resolveChartAxisTickList,
  resolveChartBarRect,
  resolveChartLegendLayout,
  resolveChartPointCoordinate,
  resolveChartRawAnnotationPoint,
  resolveChartRawMarkPoint,
  resolveChartRegionRect,
  resolveChartRenderContext
} from '../render/ChartGraphicCoordinatePolicy'
import {
  isEcgChart,
  resolveEcgCalibrationPulse,
  resolveEcgLeadLayoutList,
  resolveEcgMetadataText,
  resolveEcgPaperGridLineList,
  resolveEcgSeriesRenderContext
} from '../render/ChartGraphicEcgRenderPolicy'
import {
  encodeChartGraphicClipboardPayload
} from '../serializer/ChartGraphicClipboardSerializer'
import { escapePrintSvgAttr, escapePrintSvgText } from '../../../../utils/print/svg/core'
import { createPrintSvgCircle, createPrintSvgRect } from '../../../../utils/print/svg/shape'

function resolveSeriesPoints(
  series: IChartSeries,
  chart: IChartGraphic
): IResolvedChartSeriesPoint[] {
  return filterChartGraphicPointsToVisibleWindow(
    resolveChartSeriesDataPoints(series, chart.coordinate?.xAxis),
    chart
  )
}

function resolveAxisTickList(payload: {
  chart: IChartGraphic
  context: IChartRenderContext
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

function createSvgText(payload: {
  x: number
  y: number
  text: string
  fill?: string
  size?: number
  font?: string
  anchor?: 'start' | 'middle' | 'end'
  baseline?: 'auto' | 'middle' | 'hanging'
}) {
  const {
    x,
    y,
    text,
    fill = '#1f2937',
    size = 11,
    font = 'Arial, sans-serif',
    anchor,
    baseline
  } = payload
  const anchorAttr = anchor ? ` text-anchor="${anchor}"` : ''
  const baselineAttr = baseline ? ` dominant-baseline="${baseline}"` : ''
  return `<text x="${x}" y="${y}" font-family="${escapePrintSvgText(font)}" font-size="${size}" fill="${escapePrintSvgAttr(fill)}"${anchorAttr}${baselineAttr}>${escapePrintSvgText(text)}</text>`
}

function createPath(payload: {
  d: string
  stroke: string
  strokeWidth?: number
  fill?: string
}) {
  const { d, stroke, strokeWidth = 2, fill = 'none' } = payload
  if (!d) return ''
  return `<path d="${escapePrintSvgAttr(d)}" fill="${escapePrintSvgAttr(fill)}" stroke="${escapePrintSvgAttr(stroke)}" stroke-width="${strokeWidth}"/>`
}

function createSvgIdPart(value: string | number | undefined) {
  return String(value ?? 'chart')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'chart'
}

function createSeriesPath(
  series: IChartSeries,
  points: IChartPoint[],
  context: IChartRenderContext
) {
  const coordinateList = points.map(point =>
    resolveChartPointCoordinate(point, context)
  )
  const firstPoint = coordinateList[0]
  if (!firstPoint) return ''
  const pathPartList = [`M ${firstPoint.x} ${firstPoint.y}`]
  if (series.type === 'smoothLine') {
    resolveChartSmoothBezierSegmentList(coordinateList).forEach(segment => {
      pathPartList.push(
        `C ${segment.control1.x} ${segment.control1.y} ${segment.control2.x} ${segment.control2.y} ${segment.end.x} ${segment.end.y}`
      )
    })
  } else {
    coordinateList.slice(1).forEach((coordinate, index) => {
      if (series.type === 'stepLine') {
        const previous = coordinateList[index]
        pathPartList.push(`L ${coordinate.x} ${previous.y}`)
      }
      pathPartList.push(`L ${coordinate.x} ${coordinate.y}`)
    })
  }
  return pathPartList.join(' ')
}

function createPointSymbol(
  symbol: NonNullable<IChartSeries['symbol']>,
  x: number,
  y: number,
  fill: string
) {
  if (symbol === 'square') {
    return createPrintSvgRect({ x: x - 3, y: y - 3, width: 6, height: 6, fill })
  }
  if (symbol === 'triangle') {
    return `<path d="M ${x} ${y - 4} L ${x + 4} ${y + 3} L ${x - 4} ${y + 3} Z" fill="${escapePrintSvgAttr(fill)}"/>`
  }
  return createPrintSvgCircle({
    cx: x,
    cy: y,
    r: symbol === 'dot' ? 2 : 3,
    fill
  })
}

function createBarRectNode(rect: IChartBarRect, fill: string) {
  return createPrintSvgRect({
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    fill,
    opacity: 0.84
  })
}

function createAxisLabels(
  chart: IChartGraphic,
  context: IChartRenderContext,
  xTickList: IChartAxisTick[],
  yTickList: IChartAxisTick[]
) {
  const fill = chart.theme?.textColor || '#4b5563'
  const font = chart.theme?.fontFamily
  return [
    ...yTickList.map(tick =>
      createSvgText({
        x: context.plot.x - 6,
        y: tick.position,
        text: tick.label,
        fill,
        size: 10,
        font,
        anchor: 'end',
        baseline: 'middle'
      })
    ),
    ...xTickList.map(tick =>
      createSvgText({
        x: tick.position,
        y: context.plot.y + context.plot.height + 6,
        text: tick.label,
        fill,
        size: 10,
        font,
        anchor: 'middle',
        baseline: 'hanging'
      })
    )
  ].join('')
}

function createLegendItem(chart: IChartGraphic, item: IChartLegendItemLayout) {
  return [
    createPath({
      d: `M ${item.x} ${item.y + 6} L ${item.x + 10} ${item.y + 6}`,
      stroke: item.color,
      strokeWidth: 2
    }),
    createPrintSvgCircle({
      cx: item.x + 5,
      cy: item.y + 6,
      r: 2,
      fill: item.color
    }),
    createSvgText({
      x: item.x + 14,
      y: item.y + 6,
      text: item.label,
      fill: chart.theme?.textColor || '#374151',
      size: 10,
      font: chart.theme?.fontFamily,
      baseline: 'middle'
    })
  ].join('')
}

function createLegend(chart: IChartGraphic, width: number, height: number) {
  return resolveChartLegendLayout(chart, width, height)
    .map(item => createLegendItem(chart, item))
    .join('')
}

function createFrame(
  chart: IChartGraphic,
  width: number,
  height: number,
  context: IChartRenderContext
) {
  const theme = chart.theme || {}
  const { plot, padding } = context
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
  const contentList = [
    createPrintSvgRect({
      x: 0,
      y: 0,
      width,
      height,
      fill: theme.backgroundColor || '#ffffff',
      stroke: '#d1d5db'
    })
  ]
  if (isEcgChart(chart)) {
    resolveEcgPaperGridLineList(context).forEach(line => {
      contentList.push(
        createPath({
          d: `M ${line.x1} ${line.y1} L ${line.x2} ${line.y2}`,
          stroke: line.major ? theme.gridColor || '#fecaca' : '#fee2e2',
          strokeWidth: line.major ? 1 : 0.5
        })
      )
    })
    contentList.push(
      createPrintSvgRect({
        ...plot,
        fill: 'none',
        stroke: '#6b7280'
      }),
      createSvgText({
        x: padding.left,
        y: 18,
        text: chart.title || '心电图',
        fill: theme.textColor,
        size: 12,
        font: theme.fontFamily
      }),
      createSvgText({
        x: width - padding.right,
        y: 18,
        text: resolveEcgMetadataText(chart),
        fill: theme.textColor,
        size: 12,
        font: theme.fontFamily,
        anchor: 'end'
      })
    )
    resolveEcgLeadLayoutList(chart, context).forEach(layout => {
      contentList.push(
        createSvgText({
          x: layout.labelPoint.x,
          y: layout.labelPoint.y,
          text: layout.label,
          fill: theme.textColor,
          size: 11,
          font: theme.fontFamily
        })
      )
    })
    const pulse = resolveEcgCalibrationPulse(context)
    contentList.push(
      createPath({
        d: pulse.path,
        stroke: '#111827',
        strokeWidth: 1.5
      }),
      createSvgText({
        x: pulse.labelPoint.x,
        y: pulse.labelPoint.y,
        text: pulse.label,
        fill: theme.textColor,
        size: 10,
        font: theme.fontFamily
      })
    )
    return contentList.join('')
  }
  xTickList.forEach((tick, index) => {
    const stroke =
      chart.kind === 'ecg' && index % 5 !== 0
        ? '#fee2e2'
        : theme.gridColor || '#e5e7eb'
    contentList.push(
      createPath({
        d: `M ${tick.position} ${plot.y} L ${tick.position} ${plot.y + plot.height}`,
        stroke,
        strokeWidth: 1
      })
    )
  })
  yTickList.forEach((tick, index) => {
    const stroke =
      chart.kind === 'ecg' && index % 5 !== 0
        ? '#fee2e2'
        : theme.gridColor || '#e5e7eb'
    contentList.push(
      createPath({
        d: `M ${plot.x} ${tick.position} L ${plot.x + plot.width} ${tick.position}`,
        stroke,
        strokeWidth: 1
      })
    )
  })
  contentList.push(
    createPath({
      d: `M ${plot.x} ${plot.y} L ${plot.x} ${plot.y + plot.height} L ${plot.x + plot.width} ${plot.y + plot.height}`,
      stroke: '#6b7280',
      strokeWidth: 1
    })
  )
  if (chart.title) {
    contentList.push(
      createSvgText({
        x: padding.left,
        y: 18,
        text: chart.title,
        fill: theme.textColor,
        size: 12,
        font: theme.fontFamily
      })
    )
  }
  contentList.push(createAxisLabels(chart, context, xTickList, yTickList))
  contentList.push(createLegend(chart, width, height))
  const medicalLayout = resolveChartMedicalBandLayout(chart, context)
  if (medicalLayout) {
    contentList.push(
      createPrintSvgRect({
        x: context.plot.x,
        y: context.plot.y - medicalLayout.headerHeight,
        width: context.plot.width,
        height: medicalLayout.headerHeight,
        fill: chart.kind === 'vital-signs' ? '#eff6ff' : '#f3f4f6',
        stroke: chart.theme?.gridColor || '#d1d5db'
      }),
      createSvgText({
        x: context.plot.x + 6,
        y: context.plot.y - medicalLayout.headerHeight / 2,
        text: resolveChartMedicalHeaderText(chart),
        fill: chart.theme?.textColor,
        baseline: 'middle'
      })
    )
    if (medicalLayout.eventTrack) {
      contentList.push(
        createPrintSvgRect({
          ...medicalLayout.eventTrack,
          fill: '#f9fafb',
          stroke: chart.theme?.gridColor || '#d1d5db'
        }),
        createSvgText({
          x: Math.max(4, medicalLayout.eventTrack.x - 44),
          y: medicalLayout.eventTrack.y + medicalLayout.eventTrack.height / 2,
          text: chart.kind === 'anesthesia' ? '麻醉事件' : '护理事件',
          fill: chart.theme?.textColor,
          baseline: 'middle'
        })
      )
    }
  }
  return contentList.join('')
}

function createRegions(chart: IChartGraphic, context: IChartRenderContext) {
  return (chart.regions || [])
    .map(region => {
      const { x, y, width, height } = resolveChartRegionRect(region, context)
      if (!width || !height) return ''
      const content = [
        createPrintSvgRect({
          x,
          y,
          width,
          height,
          fill: region.color || (region.type === 'phase' ? '#dbeafe' : '#fce7f3'),
          opacity: 0.36
        })
      ]
      if (region.label) {
        content.push(
          createSvgText({
            x: x + 4,
            y: y + 14,
            text: region.label,
            fill: chart.theme?.textColor
          })
        )
      }
      return content.join('')
    })
    .join('')
}

function createSeries(
  chart: IChartGraphic,
  context: IChartRenderContext,
  clipIdPrefix?: string
) {
  if (isEcgChart(chart)) {
    return createEcgSeries(chart, context, clipIdPrefix)
  }
  const palette = chart.theme?.palette || ['#2563eb', '#dc2626', '#16a34a']
  const seriesList = chart.series || []
  const orderedSeriesList = [
    ...seriesList.filter(series => series.type === 'bar'),
    ...seriesList.filter(series => series.type !== 'bar')
  ]
  return orderedSeriesList
    .map(series => {
      const paletteIndex = Math.max(
        0,
        seriesList.findIndex(item => item.id === series.id)
      )
      const rawPoints = resolveSeriesPoints(series, chart)
      const points = downsampleChartSeriesPoints({
        series,
        points: rawPoints,
        xMin: context.xRange.min,
        xSpan: context.xRange.span,
        plotWidth: context.plot.width
      })
      if (!points.length) return ''
      const color = series.color || palette[paletteIndex % palette.length]
      const content: string[] = []
      if (series.type === 'bar') {
        points.forEach(point => {
          const rect = resolveChartBarRect({
            chart,
            series,
            point,
            context
          })
          if (!rect) return
          content.push(createBarRectNode(rect, color))
        })
        return content.join('')
      }
      if (series.type !== 'scatter') {
        content.push(
          createPath({
            d: createSeriesPath(series, points, context),
            stroke: color
          })
        )
      }
      if (series.symbol !== 'none') {
        points.forEach(point => {
          const coordinate = resolveChartPointCoordinate(point, context)
          content.push(
            createPointSymbol(
              series.symbol || 'circle',
              coordinate.x,
              coordinate.y,
              color
            )
          )
        })
      }
      return content.join('')
    })
    .join('')
}

function createEcgSeries(
  chart: IChartGraphic,
  context: IChartRenderContext,
  clipIdPrefix = 'ce-ecg'
) {
  const palette = chart.theme?.palette || ['#111827']
  const definitionList: string[] = []
  const contentList = (chart.series || [])
    .map((series, seriesIndex) => {
      const { context: leadContext } = resolveEcgSeriesRenderContext(
        chart,
        context,
        series,
        seriesIndex
      )
      const rawPoints = resolveSeriesPoints(series, chart)
      const points = downsampleChartSeriesPoints({
        series,
        points: rawPoints,
        xMin: leadContext.xRange.min,
        xSpan: leadContext.xRange.span,
        plotWidth: leadContext.plot.width
      })
      if (points.length < 2) return ''
      const clipId = `${clipIdPrefix}-ecg-lead-${seriesIndex}`
      definitionList.push(
        `<clipPath id="${escapePrintSvgAttr(clipId)}"><rect x="${leadContext.plot.x}" y="${leadContext.plot.y}" width="${leadContext.plot.width}" height="${leadContext.plot.height}"/></clipPath>`
      )
      return `<g clip-path="url(#${escapePrintSvgAttr(clipId)})">${createPath({
        d: createSeriesPath(series, points, leadContext),
        stroke: series.color || palette[seriesIndex % palette.length],
        strokeWidth: 1.2
      })}</g>`
    })
    .join('')
  return `<defs>${definitionList.join('')}</defs>${contentList}`
}

function createMarks(chart: IChartGraphic, context: IChartRenderContext) {
  return (chart.marks || [])
    .map(mark => {
      const point = resolveChartRawMarkPoint(mark, context.xAxis, context.yAxis)
      const coordinate =
        resolveChartMedicalMarkCoordinate(chart, mark, context) ||
        (point ? resolveChartPointCoordinate(point, context) : null)
      if (!coordinate) return ''
      const fill =
        mark.type === 'warning'
          ? '#dc2626'
          : mark.type === 'medication'
            ? '#2563eb'
            : '#9333ea'
      const content = [
        `<path d="M ${coordinate.x} ${coordinate.y - 5} L ${coordinate.x + 5} ${coordinate.y + 5} L ${coordinate.x - 5} ${coordinate.y + 5} Z" fill="${fill}" stroke="#ffffff" stroke-width="1"/>`
      ]
      if (mark.label) {
        content.push(
          createSvgText({
            x: coordinate.x + 6,
            y: coordinate.y - 2,
            text: mark.label,
            fill: chart.theme?.textColor
          })
        )
      }
      return content.join('')
    })
    .join('')
}

function createAnnotations(
  chart: IChartGraphic,
  context: IChartRenderContext
) {
  return (chart.annotations || [])
    .map(annotation => {
      const point = resolveChartRawAnnotationPoint(
        annotation,
        context.xAxis,
        context.yAxis
      )
      if (!point) return ''
      const coordinate = resolveChartPointCoordinate(point, context)
      return createSvgText({
        x: coordinate.x + 4,
        y: coordinate.y,
        text: annotation.text,
        fill: chart.theme?.textColor,
        font: chart.theme?.fontFamily,
        baseline: 'middle'
      })
    })
    .join('')
}

function createDentalStatusMarker(
  visual: IDentalStatusVisual,
  x: number,
  y: number,
  width: number,
  height: number
) {
  const stroke = escapePrintSvgAttr(visual.stroke)
  if (visual.marker === 'cross') {
    return `<path d="M ${x + 6} ${y + 6} L ${x + width - 6} ${y + height - 6} M ${x + width - 6} ${y + 6} L ${x + 6} ${y + height - 6}" fill="none" stroke="${stroke}" stroke-width="2"/>`
  }
  if (visual.marker === 'corner-dot') {
    return createPrintSvgCircle({
      cx: x + width - 8,
      cy: y + 8,
      r: 4,
      fill: visual.stroke
    })
  }
  if (visual.marker === 'horizontal-band') {
    return createPrintSvgRect({
      x: x + 6,
      y: y + height - 14,
      width: width - 12,
      height: 4,
      fill: visual.stroke
    })
  }
  if (visual.marker === 'vertical-line') {
    return `<path d="M ${x + width / 2} ${y + 8} L ${x + width / 2} ${y + height - 8}" fill="none" stroke="${stroke}" stroke-width="2"/>`
  }
  if (visual.marker === 'top-band') {
    return createPrintSvgRect({
      x: x + 5,
      y: y + 6,
      width: width - 10,
      height: 5,
      fill: visual.stroke
    })
  }
  return [
    createPrintSvgCircle({
      cx: x + width / 2,
      cy: y + height - 12,
      r: 4,
      fill: visual.stroke
    }),
    `<path d="M ${x + width / 2} ${y + 12} L ${x + width / 2} ${y + height - 16}" fill="none" stroke="${stroke}" stroke-width="2"/>`
  ].join('')
}

function createDentalLegend(x: number, y: number) {
  return DENTAL_STATUS_VISUAL_LIST.map((visual, index) => {
    const itemX = x + index * 56
    return [
      createPrintSvgRect({
        x: itemX,
        y,
        width: 10,
        height: 10,
        fill: visual.fill,
        stroke: visual.stroke
      }),
      createSvgText({
        x: itemX + 14,
        y: y + 8,
        text: visual.label,
        fill: '#374151',
        size: 10
      })
    ].join('')
  }).join('')
}

function createDentalPath(payload: {
  path: string
  fill: string
  stroke?: string
  opacity?: number
}) {
  const strokeAttr = payload.stroke
    ? ` stroke="${escapePrintSvgAttr(payload.stroke)}"`
    : ''
  const opacityAttr =
    payload.opacity === undefined ? '' : ` opacity="${payload.opacity}"`
  return `<path d="${escapePrintSvgAttr(payload.path)}" fill="${escapePrintSvgAttr(payload.fill)}"${strokeAttr}${opacityAttr}/>`
}

function createDentalChart(chart: IChartGraphic, width: number, height: number) {
  const theme = chart.theme || {}
  const contentList = [
    createPrintSvgRect({
      x: 0,
      y: 0,
      width,
      height,
      fill: theme.backgroundColor || '#ffffff',
      stroke: '#d1d5db'
    }),
    createSvgText({
      x: 16,
      y: 22,
      text: chart.title || '牙位图',
      fill: theme.textColor,
      size: 12,
      font: theme.fontFamily
    })
  ]
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
      const fill = resolveDentalToothFill(status)
      const geometry = resolveDentalToothPathGeometry({
        toothCode: tooth.code,
        x,
        y: row.y,
        width: toothWidth,
        height: toothHeight,
        isTopRow: row.isTopRow
      })
      contentList.push(
        createDentalPath({
          path: geometry.toothPath,
          fill,
          stroke: '#6b7280'
        })
      )
      const surfaces = tooth.surfaces
      if (surfaces) {
        geometry.surfaceList.forEach(surface => {
          const statusList = surfaces[surface.surface]
          if (!Array.isArray(statusList) || !statusList.length) return
          contentList.push(
            createDentalPath({
              path: surface.path,
              fill: resolveDentalToothFill(statusList),
              stroke: resolveDentalStatusVisualList(statusList)[0]?.stroke || '#6b7280',
              opacity: 0.92
            })
          )
        })
      }
      contentList.push(
        createSvgText({
          x: x + toothWidth / 2 - 7,
          y: row.y + toothHeight / 2 + 4,
          text: tooth.code,
          fill: '#111827'
        })
      )
      resolveDentalStatusVisualList(status).forEach(visual => {
        contentList.push(
          createDentalStatusMarker(visual, x, row.y, toothWidth, toothHeight)
        )
      })
    })
  })
  contentList.push(createDentalLegend(startX, height - 28))
  return contentList.join('')
}

/** 创建图表图形 SVG 节点，供打印和 PDF 导出复用。 */
export function createPrintSvgChartGraphic(position: IElementPosition) {
  const element = position.element
  const sourceChart = element?.chartGraphic
  if (!sourceChart) return ''
  const fragmentState = resolveChartGraphicFragmentRenderState({
    element,
    metrics: position.metrics
  })
  if (!fragmentState) return ''
  const chart = resolveChartGraphicFragmentChart(
    sourceChart,
    fragmentState.fragment
  )
  const width = fragmentState.fullWidth
  const height = fragmentState.fullHeight
  const x = position.coordinate.leftTop[0]
  const y = position.coordinate.leftTop[1]
  const renderContext =
    chart.kind === 'dental'
      ? null
      : resolveChartRenderContext(chart, width, height)
  const content =
    chart.kind === 'dental'
      ? createDentalChart(chart, width, height)
      : chart.kind === 'vital-signs'
        ? createVitalSignsSvg(chart, width, height)
        : [
          createFrame(chart, width, height, renderContext!),
          createRegions(chart, renderContext!),
          createSeries(
            chart,
            renderContext!,
            `ce-chart-${createSvgIdPart(element.id)}-${position.pageNo}`
          ),
          createMarks(chart, renderContext!),
          createAnnotations(chart, renderContext!)
        ].join('')
  const clipboardPayload = encodeChartGraphicClipboardPayload(element)
  const payloadAttr = clipboardPayload
    ? ` data-ce-chart-graphic-payload="${escapePrintSvgAttr(clipboardPayload)}"`
    : ''
  if (!fragmentState.fragment || fragmentState.fragment.mode === 'time-window') {
    return `<g data-chart-graphic="${escapePrintSvgAttr(chart.kind)}"${payloadAttr} transform="translate(${x} ${y})">${content}</g>`
  }
  const clipId = `ce-chart-fragment-${escapePrintSvgAttr(element.id || 'chart')}-${position.pageNo}-${fragmentState.fragment.fragmentIndex}`
  return `<g data-chart-graphic="${escapePrintSvgAttr(chart.kind)}"${payloadAttr} transform="translate(${x} ${y})"><defs><clipPath id="${clipId}"><rect x="0" y="0" width="${fragmentState.visibleWidth}" height="${fragmentState.visibleHeight}"/></clipPath></defs><g clip-path="url(#${clipId})"><g transform="translate(0 -${fragmentState.offsetY})">${content}</g></g></g>`
}
