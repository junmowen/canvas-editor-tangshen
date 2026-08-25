import {
  IChartGraphic,
  IChartSeries
} from '../model/ChartGraphic'
import {
  IChartPoint,
  IChartRenderContext
} from './ChartGraphicCoordinatePolicy'

export interface IEcgPaperGridLine {
  x1: number
  y1: number
  x2: number
  y2: number
  major: boolean
}

export interface IEcgLeadLayout {
  series: IChartSeries
  seriesIndex: number
  label: string
  plot: IChartRenderContext['plot']
  labelPoint: IChartPoint
}

export interface IEcgCalibrationPulse {
  path: string
  label: string
  labelPoint: IChartPoint
}

function resolveEcgSmallCell(context: IChartRenderContext) {
  return Math.max(
    4,
    Math.min(8, Math.min(context.plot.width / 100, context.plot.height / 32))
  )
}

function resolveEcgLeadColumnCount(seriesCount: number) {
  if (seriesCount >= 8) return 4
  if (seriesCount >= 6) return 3
  if (seriesCount > 1) return 2
  return 1
}

export function isEcgChart(chart: IChartGraphic) {
  return chart.kind === 'ecg'
}

export function resolveEcgPaperGridLineList(
  context: IChartRenderContext
): IEcgPaperGridLine[] {
  const { plot } = context
  const smallCell = resolveEcgSmallCell(context)
  const lineList: IEcgPaperGridLine[] = []
  const verticalCount = Math.floor(plot.width / smallCell)
  const horizontalCount = Math.floor(plot.height / smallCell)
  for (let index = 0; index <= verticalCount; index++) {
    const x = plot.x + index * smallCell
    lineList.push({
      x1: x,
      y1: plot.y,
      x2: x,
      y2: plot.y + plot.height,
      major: index % 5 === 0
    })
  }
  for (let index = 0; index <= horizontalCount; index++) {
    const y = plot.y + index * smallCell
    lineList.push({
      x1: plot.x,
      y1: y,
      x2: plot.x + plot.width,
      y2: y,
      major: index % 5 === 0
    })
  }
  return lineList
}

export function resolveEcgLeadLayoutList(
  chart: IChartGraphic,
  context: IChartRenderContext
): IEcgLeadLayout[] {
  const seriesList = chart.series || []
  if (!seriesList.length) return []
  const columnCount = resolveEcgLeadColumnCount(seriesList.length)
  const rowCount = Math.ceil(seriesList.length / columnCount)
  const gapX = 10
  const gapY = 12
  const labelWidth = seriesList.length > 1 ? 24 : 0
  const cellWidth =
    (context.plot.width - gapX * (columnCount - 1)) / columnCount
  const cellHeight =
    (context.plot.height - gapY * (rowCount - 1)) / rowCount
  return seriesList.map((series, seriesIndex) => {
    const rowIndex = Math.floor(seriesIndex / columnCount)
    const columnIndex = seriesIndex % columnCount
    const cellX = context.plot.x + columnIndex * (cellWidth + gapX)
    const cellY = context.plot.y + rowIndex * (cellHeight + gapY)
    const plot = {
      x: cellX + labelWidth,
      y: cellY + 4,
      width: Math.max(1, cellWidth - labelWidth - 2),
      height: Math.max(1, cellHeight - 8)
    }
    return {
      series,
      seriesIndex,
      label: series.name || series.id,
      plot,
      labelPoint: {
        x: cellX + 4,
        y: plot.y + 11
      }
    }
  })
}

export function resolveEcgSeriesRenderContext(
  chart: IChartGraphic,
  context: IChartRenderContext,
  series: IChartSeries,
  seriesIndex: number
) {
  const layout = resolveEcgLeadLayoutList(chart, context).find(
    item => item.series.id === series.id && item.seriesIndex === seriesIndex
  )
  return layout
    ? {
        layout,
        context: {
          ...context,
          plot: layout.plot
        }
      }
    : {
        layout: null,
        context
      }
}

export function resolveEcgCalibrationPulse(
  context: IChartRenderContext
): IEcgCalibrationPulse {
  const smallCell = resolveEcgSmallCell(context)
  const height = smallCell * 10
  const width = smallCell * 5
  const x = context.plot.x + smallCell
  const baselineY = context.plot.y + context.plot.height - smallCell * 2
  const topY = baselineY - height
  return {
    path: [
      `M ${x} ${baselineY}`,
      `L ${x + smallCell} ${baselineY}`,
      `L ${x + smallCell} ${topY}`,
      `L ${x + smallCell + width} ${topY}`,
      `L ${x + smallCell + width} ${baselineY}`,
      `L ${x + smallCell * 2 + width} ${baselineY}`
    ].join(' '),
    label: '1mV',
    labelPoint: {
      x,
      y: topY - 4
    }
  }
}

export function resolveEcgMetadataText(chart: IChartGraphic) {
  const grid = chart.coordinate?.grid
  const paperSpeed = grid?.paperSpeed || 25
  const gain = grid?.gain || 10
  return `${paperSpeed}mm/s ${gain}mm/mV`
}
