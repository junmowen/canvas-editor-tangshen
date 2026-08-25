import {
  IChartGraphic,
  IChartSeries,
  IChartVitalSignsLayout
} from '../model/ChartGraphic'
import { IWorkerPaintCommand } from '../../../render-backend/worker/WorkerRenderProtocol'
import { escapePrintSvgAttr, escapePrintSvgText } from '../../../../utils/print/svg/core'
import { createPrintSvgCircle, createPrintSvgRect } from '../../../../utils/print/svg/shape'

export interface IChartVitalSignsGeometry {
  tableX: number
  tableY: number
  tableWidth: number
  tableBottom: number
  labelWidth: number
  gridX: number
  gridWidth: number
  dayWidth: number
  slotWidth: number
  dateY: number
  dayY: number
  timeY: number
  plotY: number
  plotHeight: number
  footerY: number
  footerRowHeight: number
}

const DEFAULT_VITAL_SIGNS_LAYOUT: IChartVitalSignsLayout = {
  dayCount: 7,
  slotsPerDay: 6,
  dayLabels: ['1', '2', '3', '4', '5', '6', '7'],
  timeLabels: ['2', '6', '10', '14', '18', '22'],
  temperatureTicks: [35, 36, 37, 38, 39, 40, 41, 42],
  pulseTicks: [40, 60, 80, 100, 120, 140, 160, 180],
  footerRows: [
    { label: '呼吸', unit: '次/分' },
    { label: '血氧', unit: '%' },
    { label: '出量', unit: 'ml' },
    { label: '入量', unit: 'ml' },
    { label: '大便', unit: '次/日' },
    { label: '小便', unit: '次/日' },
    { label: '体重', unit: 'kg' },
    { label: '身高', unit: 'cm' },
    { label: '血压', unit: 'mmHg' }
  ],
  showPatientHeader: true
}

export function resolveChartVitalSignsLayout(
  chart: IChartGraphic,
  width: number,
  height: number
): IChartVitalSignsGeometry {
  const layout = { ...DEFAULT_VITAL_SIGNS_LAYOUT, ...(chart.vitalSigns || {}) }
  const margin = Math.max(8, Math.min(16, width * 0.018))
  const tableX = margin
  const tableY = Math.max(54, height * 0.075)
  const tableWidth = width - margin * 2
  const labelWidth = Math.max(70, Math.min(96, width * 0.12))
  const gridX = tableX + labelWidth
  const gridWidth = tableWidth - labelWidth
  const dayWidth = gridWidth / Math.max(1, layout.dayCount)
  const slotWidth = dayWidth / Math.max(1, layout.slotsPerDay)
  const dateY = tableY
  const dayY = dateY + 18
  const timeY = dayY + 18
  const plotY = timeY + 18
  const footerRowHeight = Math.max(15, Math.min(22, height * 0.023))
  const footerY = height - margin - layout.footerRows.length * footerRowHeight - 18
  const plotHeight = Math.max(220, footerY - plotY)
  return {
    tableX,
    tableY,
    tableWidth,
    tableBottom: footerY + layout.footerRows.length * footerRowHeight,
    labelWidth,
    gridX,
    gridWidth,
    dayWidth,
    slotWidth,
    dateY,
    dayY,
    timeY,
    plotY,
    plotHeight,
    footerY,
    footerRowHeight
  }
}

function getVitalSignsLayout(chart: IChartGraphic) {
  return { ...DEFAULT_VITAL_SIGNS_LAYOUT, ...(chart.vitalSigns || {}) }
}

function resolveVitalSignsField(
  layout: IChartVitalSignsLayout,
  fieldId: string
) {
  return layout.fields?.find(field => field.id === fieldId)
}

function resolveVitalSignsFieldText(
  layout: IChartVitalSignsLayout,
  fieldId: string
) {
  const field = resolveVitalSignsField(layout, fieldId)
  return field?.value || field?.placeholder || '________'
}

function isVitalSignsTimeWindow(chart: IChartGraphic) {
  return chart.pagination?.mode === 'time-window'
}

function resolveVitalSignsWindowHeaderText(chart: IChartGraphic) {
  const xAxis = chart.coordinate?.xAxis
  if (!isVitalSignsTimeWindow(chart) || xAxis?.min === undefined || xAxis.max === undefined) {
    return ''
  }
  return `${chart.title || ''}  ${String(xAxis.min)}-${String(xAxis.max)} 日`
}

function resolveTemperatureValue(series: IChartSeries, value: number) {
  if (series.id === 'pulse' || series.unit === 'bpm') {
    return 35 + (value - 40) / 20
  }
  return value
}

function resolveVitalSignsX(
  x: number | string,
  geometry: IChartVitalSignsGeometry,
  layout: IChartVitalSignsLayout
) {
  const numeric = typeof x === 'number' ? x : Number(x)
  if (!Number.isFinite(numeric)) return null
  const slotIndex =
    numeric >= 1 && numeric <= layout.dayCount
      ? (numeric - 1) * layout.slotsPerDay + layout.slotsPerDay / 2
      : numeric - 0.5
  const maxSlot = layout.dayCount * layout.slotsPerDay
  if (slotIndex < 0 || slotIndex > maxSlot) return null
  return geometry.gridX + (slotIndex / maxSlot) * geometry.gridWidth
}

function resolveVitalSignsY(
  series: IChartSeries,
  value: number,
  geometry: IChartVitalSignsGeometry
) {
  const temperature = resolveTemperatureValue(series, value)
  return geometry.plotY +
    ((42 - temperature) / (42 - 34)) * geometry.plotHeight
}

function resolveSeriesColor(series: IChartSeries, index: number) {
  if (series.color) return series.color
  if (series.id === 'temperature') return '#111827'
  if (series.id === 'pulse') return '#c51f2d'
  return ['#111827', '#c51f2d', '#2563eb', '#15803d'][index % 4]
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { align?: CanvasTextAlign; baseline?: CanvasTextBaseline; size?: number; color?: string } = {}
) {
  ctx.fillStyle = options.color || '#1f2937'
  ctx.font = `${options.size || 10}px Microsoft YaHei, Arial, sans-serif`
  ctx.textAlign = options.align || 'left'
  ctx.textBaseline = options.baseline || 'middle'
  ctx.fillText(text, x, y)
}

function drawVitalSignsSeries(
  ctx: CanvasRenderingContext2D,
  chart: IChartGraphic,
  geometry: IChartVitalSignsGeometry
) {
  const layout = getVitalSignsLayout(chart)
  ;(chart.series || []).forEach((series, seriesIndex) => {
    const pointList = series.data
      .map((rawPoint, dataIndex) => {
        const point = typeof rawPoint === 'number' ? { x: dataIndex + 1, y: rawPoint } : rawPoint
        const value = Number(point.y)
        const x = resolveVitalSignsX(point.x, geometry, layout)
        if (!x || !Number.isFinite(value)) return null
        return { x, y: resolveVitalSignsY(series, value, geometry), symbol: series.symbol || 'circle' }
      })
      .filter((point): point is { x: number; y: number; symbol: NonNullable<IChartSeries['symbol']> } => !!point)
    if (!pointList.length) return
    const color = resolveSeriesColor(series, seriesIndex)
    if (pointList.length > 1) {
      ctx.beginPath()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.2
      pointList.forEach((point, index) => {
        if (index === 0) ctx.moveTo(point.x, point.y)
        else ctx.lineTo(point.x, point.y)
      })
      ctx.stroke()
    }
    pointList.forEach(point => {
      ctx.fillStyle = '#ffffff'
      ctx.strokeStyle = color
      ctx.lineWidth = 1.4
      if (point.symbol === 'square') {
        ctx.fillRect(point.x - 3, point.y - 3, 6, 6)
        ctx.strokeRect(point.x - 3, point.y - 3, 6, 6)
      } else if (point.symbol === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(point.x, point.y - 4)
        ctx.lineTo(point.x + 4, point.y + 3)
        ctx.lineTo(point.x - 4, point.y + 3)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.arc(point.x, point.y, point.symbol === 'dot' ? 2 : 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    })
  })
}

export function drawChartVitalSigns(
  ctx: CanvasRenderingContext2D,
  chart: IChartGraphic,
  width: number,
  height: number
) {
  const layout = getVitalSignsLayout(chart)
  const geometry = resolveChartVitalSignsLayout(chart, width, height)
  const theme = chart.theme || {}
  const font = theme.fontFamily || 'Microsoft YaHei, Arial, sans-serif'
  ctx.save()
  ctx.fillStyle = theme.backgroundColor || '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.font = `10px ${font}`
  ctx.strokeStyle = '#1f2937'
  ctx.fillStyle = theme.textColor || '#1f2937'
  ctx.lineWidth = 1
  drawText(ctx, chart.title || 'XX医院体温单', width / 2, 16, { align: 'center', size: 16, color: '#111827' })
  if (isVitalSignsTimeWindow(chart)) {
    drawText(ctx, resolveVitalSignsWindowHeaderText(chart), geometry.tableX + 6, geometry.tableY - 8, { size: 9, color: '#1f2937' })
    drawText(ctx, '护理事件', geometry.tableX, height - 8, { size: 8, color: '#4b5563' })
  }
  if (layout.showPatientHeader !== false) {
    const patientFields = [
      ['姓名', 'patient-name'],
      ['年龄', 'patient-age'],
      ['性别', 'patient-gender'],
      ['科别', 'patient-department'],
      ['床号', 'patient-bed'],
      ['入院日期', 'patient-admission-date'],
      ['住院病历号', 'patient-record-no']
    ] as const
    patientFields.forEach(([label, fieldId], index) => {
      const x = geometry.tableX + index * (geometry.tableWidth / patientFields.length)
      drawText(ctx, `${label} ${resolveVitalSignsFieldText(layout, fieldId)}`, x, geometry.tableY - 22, { size: 9, color: '#4b5563' })
    })
  }
  const tableTop = geometry.dateY
  const labelRight = geometry.gridX
  const tableBottom = geometry.tableBottom
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 1
  ctx.strokeRect(geometry.tableX, tableTop, geometry.tableWidth, tableBottom - tableTop)
  ctx.beginPath()
  ctx.moveTo(labelRight, tableTop)
  ctx.lineTo(labelRight, tableBottom)
  ctx.stroke()
  const headerRows = [geometry.dateY, geometry.dayY, geometry.timeY, geometry.plotY]
  headerRows.forEach(rowY => {
    ctx.beginPath()
    ctx.moveTo(geometry.tableX, rowY)
    ctx.lineTo(geometry.tableX + geometry.tableWidth, rowY)
    ctx.stroke()
  })
  drawText(ctx, '日期', geometry.tableX + geometry.labelWidth / 2, geometry.dateY + 9, { align: 'center', size: 9 })
  drawText(ctx, '住院天数', geometry.tableX + geometry.labelWidth / 2, geometry.dayY + 9, { align: 'center', size: 9 })
  drawText(ctx, '时间', geometry.tableX + geometry.labelWidth / 2, geometry.timeY + 9, { align: 'center', size: 9 })
  for (let dayIndex = 0; dayIndex < layout.dayCount; dayIndex += 1) {
    const dayX = geometry.gridX + dayIndex * geometry.dayWidth
    ctx.beginPath()
    ctx.moveTo(dayX, geometry.dateY)
    ctx.lineTo(dayX, geometry.plotY)
    ctx.stroke()
    drawText(ctx, layout.dayLabels[dayIndex] || String(dayIndex + 1), dayX + geometry.dayWidth / 2, geometry.dateY + 9, { align: 'center', size: 10 })
    drawText(ctx, String(dayIndex + 1), dayX + geometry.dayWidth / 2, geometry.dayY + 9, { align: 'center', size: 9 })
    for (let slotIndex = 0; slotIndex <= layout.slotsPerDay; slotIndex += 1) {
      const slotX = dayX + slotIndex * geometry.slotWidth
      ctx.beginPath()
      ctx.moveTo(slotX, geometry.timeY)
      ctx.lineTo(slotX, geometry.plotY)
      ctx.strokeStyle = slotIndex === 0 ? '#c51f2d' : '#1f2937'
      ctx.lineWidth = slotIndex === 0 ? 1.2 : 0.7
      ctx.stroke()
      if (slotIndex < layout.slotsPerDay) {
        drawText(ctx, layout.timeLabels[slotIndex] || '', slotX + geometry.slotWidth / 2, geometry.timeY + 9, { align: 'center', size: 7, color: slotIndex === 3 ? '#c51f2d' : '#4b5563' })
      }
    }
  }
  for (let slotIndex = 0; slotIndex <= layout.dayCount * layout.slotsPerDay; slotIndex += 1) {
    const x = geometry.gridX + slotIndex * geometry.slotWidth
    ctx.beginPath()
    ctx.moveTo(x, geometry.plotY)
    ctx.lineTo(x, geometry.footerY)
    ctx.strokeStyle = slotIndex % layout.slotsPerDay === 0 ? '#c51f2d' : '#1f2937'
    ctx.lineWidth = slotIndex % layout.slotsPerDay === 0 ? 1.2 : 0.65
    ctx.stroke()
  }
  for (let tickIndex = 0; tickIndex <= 40; tickIndex += 1) {
    const value = 34 + tickIndex * 0.2
    const y = geometry.plotY + ((42 - value) / 8) * geometry.plotHeight
    ctx.beginPath()
    ctx.moveTo(geometry.gridX, y)
    ctx.lineTo(geometry.gridX + geometry.gridWidth, y)
    ctx.strokeStyle = Math.abs(value - 37) < 0.01 ? '#c51f2d' : tickIndex % 5 === 0 ? '#111827' : '#6b7280'
    ctx.lineWidth = Math.abs(value - 37) < 0.01 ? 1.2 : tickIndex % 5 === 0 ? 0.9 : 0.45
    ctx.stroke()
  }
  layout.temperatureTicks.forEach(value => {
    const y = geometry.plotY + ((42 - value) / 8) * geometry.plotHeight
    drawText(ctx, String(value), geometry.gridX - 22, y, { align: 'right', size: 8 })
  })
  layout.pulseTicks.forEach(value => {
    const temperature = resolveTemperatureValue({ id: 'pulse', data: [], type: 'line' }, value)
    const y = geometry.plotY + ((42 - temperature) / 8) * geometry.plotHeight
    drawText(ctx, String(value), geometry.gridX - 4, y, { align: 'right', size: 8 })
  })
  layout.footerRows.forEach((row, rowIndex) => {
    const y = geometry.footerY + rowIndex * geometry.footerRowHeight
    ctx.beginPath()
    ctx.moveTo(geometry.tableX, y)
    ctx.lineTo(geometry.tableX + geometry.tableWidth, y)
    ctx.strokeStyle = '#1f2937'
    ctx.lineWidth = 0.8
    ctx.stroke()
    drawText(ctx, `${row.label}${row.unit ? `(${row.unit})` : ''}`, geometry.tableX + geometry.labelWidth / 2, y + geometry.footerRowHeight / 2, { align: 'center', size: 8 })
    const field = layout.fields?.find(item => item.section === 'footer' && item.rowIndex === rowIndex)
    if (field) {
      drawText(ctx, resolveVitalSignsFieldText(layout, field.id), geometry.gridX + 6, y + geometry.footerRowHeight / 2, { size: 8, color: field.value ? '#111827' : '#9ca3af' })
    }
  })
  ctx.beginPath()
  ctx.moveTo(geometry.tableX, geometry.tableBottom)
  ctx.lineTo(geometry.tableX + geometry.tableWidth, geometry.tableBottom)
  ctx.stroke()
  drawVitalSignsSeries(ctx, chart, geometry)
  drawText(ctx, '说明：体温（○口温，□腋温，△肛温），脉搏（●），呼吸（○）', geometry.tableX, height - 8, { size: 8, color: '#4b5563' })
  ctx.restore()
}

function createVitalSignsText(
  text: string,
  x: number,
  y: number,
  options: { size?: number; fill?: string; anchor?: string; baseline?: string } = {}
) {
  const size = options.size || 10
  const fill = options.fill || '#1f2937'
  const anchor = options.anchor ? ` text-anchor="${options.anchor}"` : ''
  const baseline = options.baseline ? ` dominant-baseline="${options.baseline}"` : ''
  return `<text x="${x}" y="${y}" font-family="Microsoft YaHei, Arial, sans-serif" font-size="${size}" fill="${escapePrintSvgAttr(fill)}"${anchor}${baseline}>${escapePrintSvgText(text)}</text>`
}

export function createVitalSignsSvg(chart: IChartGraphic, width: number, height: number) {
  const layout = getVitalSignsLayout(chart)
  const geometry = resolveChartVitalSignsLayout(chart, width, height)
  const content: string[] = []
  content.push(createPrintSvgRect({ x: 0, y: 0, width, height, fill: chart.theme?.backgroundColor || '#ffffff' }))
  content.push(createVitalSignsText(chart.title || 'XX医院体温单', width / 2, 16, { size: 16, anchor: 'middle' }))
  if (isVitalSignsTimeWindow(chart)) {
    content.push(createVitalSignsText(resolveVitalSignsWindowHeaderText(chart), geometry.tableX + 6, geometry.tableY - 8, { size: 9 }))
    content.push(createVitalSignsText('护理事件', geometry.tableX, height - 8, { size: 8, fill: '#4b5563' }))
  }
  if (layout.showPatientHeader !== false) {
    const patientFields = [
      ['姓名', 'patient-name'],
      ['年龄', 'patient-age'],
      ['性别', 'patient-gender'],
      ['科别', 'patient-department'],
      ['床号', 'patient-bed'],
      ['入院日期', 'patient-admission-date'],
      ['住院病历号', 'patient-record-no']
    ] as const
    patientFields.forEach(([label, fieldId], index) => content.push(createVitalSignsText(`${label} ${resolveVitalSignsFieldText(layout, fieldId)}`, geometry.tableX + index * (geometry.tableWidth / patientFields.length), geometry.tableY - 22, { size: 9, fill: '#4b5563' })))
  }
  content.push(createPrintSvgRect({ x: geometry.tableX, y: geometry.tableY, width: geometry.tableWidth, height: geometry.tableBottom - geometry.tableY, fill: 'none', stroke: '#1f2937' }))
  content.push(`<path d="M ${geometry.gridX} ${geometry.tableY} L ${geometry.gridX} ${geometry.tableBottom}" stroke="#1f2937" stroke-width="1"/>`)
  ;[geometry.dayY, geometry.timeY, geometry.plotY].forEach(rowY => content.push(`<path d="M ${geometry.tableX} ${rowY} L ${geometry.tableX + geometry.tableWidth} ${rowY}" stroke="#1f2937" stroke-width="1"/>`))
  content.push(createVitalSignsText('日期', geometry.tableX + geometry.labelWidth / 2, geometry.dateY + 9, { anchor: 'middle', size: 9 }))
  content.push(createVitalSignsText('住院天数', geometry.tableX + geometry.labelWidth / 2, geometry.dayY + 9, { anchor: 'middle', size: 9 }))
  content.push(createVitalSignsText('时间', geometry.tableX + geometry.labelWidth / 2, geometry.timeY + 9, { anchor: 'middle', size: 9 }))
  for (let dayIndex = 0; dayIndex < layout.dayCount; dayIndex += 1) {
    const dayX = geometry.gridX + dayIndex * geometry.dayWidth
    content.push(`<path d="M ${dayX} ${geometry.dateY} L ${dayX} ${geometry.plotY}" stroke="#1f2937" stroke-width="1"/>`)
    content.push(createVitalSignsText(layout.dayLabels[dayIndex] || String(dayIndex + 1), dayX + geometry.dayWidth / 2, geometry.dateY + 9, { anchor: 'middle', size: 10 }))
    content.push(createVitalSignsText(String(dayIndex + 1), dayX + geometry.dayWidth / 2, geometry.dayY + 9, { anchor: 'middle', size: 9 }))
    for (let slotIndex = 0; slotIndex <= layout.slotsPerDay; slotIndex += 1) {
      const slotX = dayX + slotIndex * geometry.slotWidth
      content.push(`<path d="M ${slotX} ${geometry.timeY} L ${slotX} ${geometry.footerY}" stroke="${slotIndex === 0 ? '#c51f2d' : '#1f2937'}" stroke-width="${slotIndex === 0 ? 1.2 : 0.65}"/>`)
      if (slotIndex < layout.slotsPerDay) content.push(createVitalSignsText(layout.timeLabels[slotIndex] || '', slotX + geometry.slotWidth / 2, geometry.timeY + 9, { anchor: 'middle', size: 7, fill: slotIndex === 3 ? '#c51f2d' : '#4b5563' }))
    }
  }
  for (let tickIndex = 0; tickIndex <= 40; tickIndex += 1) {
    const value = 34 + tickIndex * 0.2
    const y = geometry.plotY + ((42 - value) / 8) * geometry.plotHeight
    const stroke = Math.abs(value - 37) < 0.01 ? '#c51f2d' : tickIndex % 5 === 0 ? '#111827' : '#6b7280'
    content.push(`<path d="M ${geometry.gridX} ${y} L ${geometry.gridX + geometry.gridWidth} ${y}" stroke="${stroke}" stroke-width="${Math.abs(value - 37) < 0.01 ? 1.2 : tickIndex % 5 === 0 ? 0.9 : 0.45}"/>`)
  }
  layout.temperatureTicks.forEach(value => content.push(createVitalSignsText(String(value), geometry.gridX - 22, geometry.plotY + ((42 - value) / 8) * geometry.plotHeight, { anchor: 'end', baseline: 'middle', size: 8 })))
  layout.pulseTicks.forEach(value => content.push(createVitalSignsText(String(value), geometry.gridX - 4, geometry.plotY + ((42 - resolveTemperatureValue({ id: 'pulse', data: [], type: 'line' }, value)) / 8) * geometry.plotHeight, { anchor: 'end', baseline: 'middle', size: 8 })))
  layout.footerRows.forEach((row, rowIndex) => {
    const y = geometry.footerY + rowIndex * geometry.footerRowHeight
    content.push(`<path d="M ${geometry.tableX} ${y} L ${geometry.tableX + geometry.tableWidth} ${y}" stroke="#1f2937" stroke-width="0.8"/>`)
    content.push(createVitalSignsText(`${row.label}${row.unit ? `(${row.unit})` : ''}`, geometry.tableX + geometry.labelWidth / 2, y + geometry.footerRowHeight / 2, { anchor: 'middle', baseline: 'middle', size: 8 }))
    const field = layout.fields?.find(item => item.section === 'footer' && item.rowIndex === rowIndex)
    if (field) content.push(createVitalSignsText(resolveVitalSignsFieldText(layout, field.id), geometry.gridX + 6, y + geometry.footerRowHeight / 2, { baseline: 'middle', size: 8, fill: field.value ? '#111827' : '#9ca3af' }))
  })
  ;(chart.series || []).forEach((series, seriesIndex) => {
    const pointList = series.data.map((rawPoint, dataIndex) => {
      const point = typeof rawPoint === 'number' ? { x: dataIndex + 1, y: rawPoint } : rawPoint
      const x = resolveVitalSignsX(point.x, geometry, layout)
      const value = Number(point.y)
      return x && Number.isFinite(value) ? { x, y: resolveVitalSignsY(series, value, geometry) } : null
    }).filter((point): point is { x: number; y: number } => !!point)
    if (!pointList.length) return
    const color = resolveSeriesColor(series, seriesIndex)
    if (pointList.length > 1) content.push(`<path d="${pointList.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ')}" fill="none" stroke="${color}" stroke-width="1.2"/>`)
    pointList.forEach(point => content.push(createPrintSvgCircle({ cx: point.x, cy: point.y, r: series.symbol === 'dot' ? 2 : 3, fill: '#ffffff', stroke: color, strokeWidth: 1.3 })))
  })
  content.push(createVitalSignsText('说明：体温（○口温，□腋温，△肛温），脉搏（●），呼吸（○）', geometry.tableX, height - 8, { size: 8, fill: '#4b5563' }))
  return content.join('')
}

export function pushVitalSignsWorkerCommands(
  commandList: IWorkerPaintCommand[],
  chart: IChartGraphic,
  width: number,
  height: number,
  alpha: number,
  scale: number
) {
  const layout = getVitalSignsLayout(chart)
  const geometry = resolveChartVitalSignsLayout(chart, width, height)
  const pushText = (text: string, x: number, y: number, size = 10, fill = '#1f2937') => commandList.push({ type: 'fillText', text, x, y, font: `${size}px Microsoft YaHei, Arial, sans-serif`, fillStyle: fill, alpha, baseline: 'middle' })
  commandList.push({ type: 'fillRect', rect: { x: 0, y: 0, width, height }, fillStyle: chart.theme?.backgroundColor || '#ffffff', alpha })
  pushText(chart.title || 'XX医院体温单', width / 2, 16, 16, '#111827')
  if (isVitalSignsTimeWindow(chart)) {
    pushText(resolveVitalSignsWindowHeaderText(chart), geometry.tableX + 6, geometry.tableY - 8, 9)
    pushText('护理事件', geometry.tableX, height - 8, 8, '#4b5563')
  }
  if (layout.showPatientHeader !== false) {
    const patientFields = [
      ['姓名', 'patient-name'],
      ['年龄', 'patient-age'],
      ['性别', 'patient-gender'],
      ['科别', 'patient-department'],
      ['床号', 'patient-bed'],
      ['入院日期', 'patient-admission-date'],
      ['住院病历号', 'patient-record-no']
    ] as const
    patientFields.forEach(([label, fieldId], index) => {
      pushText(
        `${label} ${resolveVitalSignsFieldText(layout, fieldId)}`,
        geometry.tableX + index * (geometry.tableWidth / patientFields.length),
        geometry.tableY - 22,
        9,
        '#4b5563'
      )
    })
  }
  commandList.push({ type: 'strokeRect', rect: { x: geometry.tableX, y: geometry.tableY, width: geometry.tableWidth, height: geometry.tableBottom - geometry.tableY }, strokeStyle: '#1f2937', lineWidth: scale, alpha })
  commandList.push({ type: 'strokePath', segmentList: [{ from: [geometry.gridX, geometry.tableY], to: [geometry.gridX, geometry.tableBottom] }], strokeStyle: '#1f2937', lineWidth: scale, alpha })
  ;[geometry.dayY, geometry.timeY, geometry.plotY].forEach(rowY => commandList.push({ type: 'strokePath', segmentList: [{ from: [geometry.tableX, rowY], to: [geometry.tableX + geometry.tableWidth, rowY] }], strokeStyle: '#1f2937', lineWidth: scale, alpha }))
  pushText('日期', geometry.tableX + geometry.labelWidth / 2, geometry.dateY + 9, 9)
  pushText('住院天数', geometry.tableX + geometry.labelWidth / 2, geometry.dayY + 9, 9)
  pushText('时间', geometry.tableX + geometry.labelWidth / 2, geometry.timeY + 9, 9)
  for (let dayIndex = 0; dayIndex < layout.dayCount; dayIndex += 1) {
    const dayX = geometry.gridX + dayIndex * geometry.dayWidth
    pushText(layout.dayLabels[dayIndex] || String(dayIndex + 1), dayX + geometry.dayWidth / 2, geometry.dateY + 9, 10)
    pushText(String(dayIndex + 1), dayX + geometry.dayWidth / 2, geometry.dayY + 9, 9)
    for (let slotIndex = 0; slotIndex <= layout.slotsPerDay; slotIndex += 1) {
      const slotX = dayX + slotIndex * geometry.slotWidth
      commandList.push({ type: 'strokePath', segmentList: [{ from: [slotX, geometry.timeY], to: [slotX, geometry.footerY] }], strokeStyle: slotIndex === 0 ? '#c51f2d' : '#1f2937', lineWidth: Math.max(0.5, (slotIndex === 0 ? 1.2 : 0.65) * scale), alpha })
      if (slotIndex < layout.slotsPerDay) pushText(layout.timeLabels[slotIndex] || '', slotX + geometry.slotWidth / 2, geometry.timeY + 9, 7, slotIndex === 3 ? '#c51f2d' : '#4b5563')
    }
  }
  for (let tickIndex = 0; tickIndex <= 40; tickIndex += 1) {
    const value = 34 + tickIndex * 0.2
    const y = geometry.plotY + ((42 - value) / 8) * geometry.plotHeight
    const major = Math.abs(value - 37) < 0.01 || tickIndex % 5 === 0
    commandList.push({ type: 'strokePath', segmentList: [{ from: [geometry.gridX, y], to: [geometry.gridX + geometry.gridWidth, y] }], strokeStyle: Math.abs(value - 37) < 0.01 ? '#c51f2d' : major ? '#111827' : '#6b7280', lineWidth: Math.max(0.5, (Math.abs(value - 37) < 0.01 ? 1.2 : major ? 0.9 : 0.45) * scale), alpha })
  }
  layout.temperatureTicks.forEach(value => pushText(String(value), geometry.gridX - 22, geometry.plotY + ((42 - value) / 8) * geometry.plotHeight, 8))
  layout.pulseTicks.forEach(value => pushText(String(value), geometry.gridX - 4, geometry.plotY + ((42 - resolveTemperatureValue({ id: 'pulse', data: [], type: 'line' }, value)) / 8) * geometry.plotHeight, 8))
  layout.footerRows.forEach((row, rowIndex) => {
    const y = geometry.footerY + rowIndex * geometry.footerRowHeight
    commandList.push({ type: 'strokePath', segmentList: [{ from: [geometry.tableX, y], to: [geometry.tableX + geometry.tableWidth, y] }], strokeStyle: '#1f2937', lineWidth: Math.max(0.5, 0.8 * scale), alpha })
    pushText(`${row.label}${row.unit ? `(${row.unit})` : ''}`, geometry.tableX + geometry.labelWidth / 2, y + geometry.footerRowHeight / 2, 8)
    const field = layout.fields?.find(item => item.section === 'footer' && item.rowIndex === rowIndex)
    if (field) pushText(resolveVitalSignsFieldText(layout, field.id), geometry.gridX + 6, y + geometry.footerRowHeight / 2, 8, field.value ? '#111827' : '#9ca3af')
  })
  ;(chart.series || []).forEach((series, seriesIndex) => {
    const pointList = series.data.map((rawPoint, dataIndex) => {
      const point = typeof rawPoint === 'number' ? { x: dataIndex + 1, y: rawPoint } : rawPoint
      const x = resolveVitalSignsX(point.x, geometry, layout)
      const value = Number(point.y)
      return x && Number.isFinite(value) ? { x, y: resolveVitalSignsY(series, value, geometry) } : null
    }).filter((point): point is { x: number; y: number } => !!point)
    if (!pointList.length) return
    const color = resolveSeriesColor(series, seriesIndex)
    if (pointList.length > 1) commandList.push({ type: 'strokePath', segmentList: pointList.slice(1).map((point, index) => ({ from: [pointList[index].x, pointList[index].y], to: [point.x, point.y] })), strokeStyle: color, lineWidth: Math.max(0.7, 1.2 * scale), alpha })
    pointList.forEach(point => commandList.push({ type: 'fillRect', rect: { x: point.x - 2.5, y: point.y - 2.5, width: 5, height: 5 }, fillStyle: '#ffffff', alpha }))
  })
}
