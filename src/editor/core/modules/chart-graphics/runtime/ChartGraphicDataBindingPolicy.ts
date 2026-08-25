import {
  IChartDataPoint,
  IChartDataSourceBinding,
  IChartDataSourceFieldTransform,
  IChartAnnotation,
  IChartGraphic,
  IChartGraphicDataResult,
  IChartMark,
  IChartRegion,
  IChartSeries
} from '../model/ChartGraphic'

function readMappedValue(
  record: Record<string, unknown>,
  fieldMap: Record<string, string>,
  key: string,
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
) {
  const fieldName = fieldMap[key]
  return fieldName
    ? applyMappedFieldTransform(
        record[fieldName],
        fieldTransforms?.[key] || fieldTransforms?.[fieldName]
      )
    : undefined
}

function applyMappedFieldTransform(
  value: unknown,
  transform?: IChartDataSourceFieldTransform
) {
  if (!transform) return value
  let nextValue = value
  if (typeof nextValue === 'string' && transform.trim !== false) {
    nextValue = nextValue.trim()
  }
  if (
    nextValue === undefined ||
    nextValue === null ||
    (typeof nextValue === 'string' && nextValue === '')
  ) {
    return transform.emptyAs
  }
  let numericValue =
    typeof nextValue === 'number'
      ? nextValue
      : typeof nextValue === 'string'
        ? Number(nextValue)
        : Number.NaN
  if (!Number.isFinite(numericValue)) return nextValue
  if (transform.unit === 'fahrenheit-to-celsius') {
    numericValue = ((numericValue - 32) * 5) / 9
  } else if (transform.unit === 'celsius-to-fahrenheit') {
    numericValue = (numericValue * 9) / 5 + 32
  } else if (transform.unit === 'mgdl-to-mmol-l') {
    numericValue = numericValue / 18
  } else if (transform.unit === 'mmol-l-to-mgdl') {
    numericValue = numericValue * 18
  }
  if (typeof transform.scale === 'number' && Number.isFinite(transform.scale)) {
    numericValue *= transform.scale
  }
  if (typeof transform.offset === 'number' && Number.isFinite(transform.offset)) {
    numericValue += transform.offset
  }
  if (
    typeof transform.precision === 'number' &&
    Number.isInteger(transform.precision) &&
    transform.precision >= 0
  ) {
    const ratio = 10 ** transform.precision
    numericValue = Math.round(numericValue * ratio) / ratio
  }
  return numericValue
}

function toMappedNumber(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value === 'string') {
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : undefined
  }
  return undefined
}

function toMappedXValue(value: unknown, fallback: number): number | string {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value) return value
  return fallback
}

function toMappedString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}

function parseMappedFieldNameList(value: string | undefined) {
  return (value || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function createSeriesFromRecords(payload: {
  records: Record<string, unknown>[]
  fieldMap: Record<string, string>
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
  sourceChart: IChartGraphic
}): IChartSeries[] | undefined {
  const { records, fieldMap, fieldTransforms, sourceChart } = payload
  if (!fieldMap.x || !fieldMap.y || !records.length) return undefined
  const yFieldNameList = parseMappedFieldNameList(fieldMap.y)
  if (!yFieldNameList.length) return undefined
  if (yFieldNameList.length > 1) {
    const multiSeriesList = yFieldNameList
      .map((fieldName): IChartSeries | null => {
        const sourceSeries = sourceChart.series?.find(
          series => series.id === fieldName || series.name === fieldName
        )
        const data = records
          .map((record, index): IChartDataPoint | null => {
            const y = toMappedNumber(
              applyMappedFieldTransform(
                record[fieldName],
                fieldTransforms?.[fieldName]
              )
            )
            if (y === undefined) return null
            return {
              x: toMappedXValue(
                readMappedValue(record, fieldMap, 'x', fieldTransforms),
                index
              ),
              y,
              label: toMappedString(
                readMappedValue(record, fieldMap, 'label', fieldTransforms)
              )
            }
          })
          .filter((point): point is IChartDataPoint => !!point)
        if (!data.length) return null
        return {
          id: sourceSeries?.id || fieldName,
          name: sourceSeries?.name || fieldName,
          type: sourceSeries?.type || 'line',
          symbol: sourceSeries?.symbol || 'circle',
          color: sourceSeries?.color,
          data
        }
      })
      .filter((series): series is IChartSeries => !!series)
    return multiSeriesList.length ? multiSeriesList : undefined
  }
  const groupedPointMap = new Map<
    string,
    { name?: string; data: IChartDataPoint[] }
  >()
  records.forEach((record, index) => {
    const y = toMappedNumber(readMappedValue(record, fieldMap, 'y', fieldTransforms))
    if (y === undefined) return
    const seriesId =
      toMappedString(readMappedValue(record, fieldMap, 'seriesId', fieldTransforms)) ||
      sourceChart.series?.[0]?.id ||
      'mapped-series'
    const seriesName =
      toMappedString(readMappedValue(record, fieldMap, 'seriesName', fieldTransforms)) ||
      sourceChart.series?.find(series => series.id === seriesId)?.name
    const group = groupedPointMap.get(seriesId) || {
      name: seriesName,
      data: []
    }
    group.data.push({
      x: toMappedXValue(readMappedValue(record, fieldMap, 'x', fieldTransforms), index),
      y,
      label: toMappedString(readMappedValue(record, fieldMap, 'label', fieldTransforms))
    })
    groupedPointMap.set(seriesId, group)
  })
  if (!groupedPointMap.size) return undefined
  return Array.from(groupedPointMap.entries()).map(([id, group]) => {
    const sourceSeries = sourceChart.series?.find(series => series.id === id)
    return {
      id,
      name: group.name || sourceSeries?.name || id,
      type: sourceSeries?.type || 'line',
      symbol: sourceSeries?.symbol || 'circle',
      color: sourceSeries?.color,
      data: group.data
    }
  })
}

function createMarksFromRecords(payload: {
  records: Record<string, unknown>[]
  fieldMap: Record<string, string>
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
}): IChartMark[] | undefined {
  const { records, fieldMap, fieldTransforms } = payload
  if (!fieldMap.markX && !fieldMap.markLabel) return undefined
  const markList = records
    .map((record, index): IChartMark | null => {
      const label = toMappedString(
        readMappedValue(record, fieldMap, 'markLabel', fieldTransforms)
      )
      const x = toMappedXValue(
        readMappedValue(record, fieldMap, 'markX', fieldTransforms),
        index
      )
      if (!label && !fieldMap.markX) return null
      return {
        id: toMappedString(readMappedValue(record, fieldMap, 'markId', fieldTransforms)) || `mark-${index}`,
        type:
          (toMappedString(readMappedValue(record, fieldMap, 'markType', fieldTransforms)) as
            | IChartMark['type']
            | undefined) || 'event',
        x,
        y: toMappedNumber(readMappedValue(record, fieldMap, 'markY', fieldTransforms)),
        label
      }
    })
    .filter((mark): mark is IChartMark => !!mark)
  return markList.length ? markList : undefined
}

function createRegionsFromRecords(payload: {
  records: Record<string, unknown>[]
  fieldMap: Record<string, string>
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
}): IChartRegion[] | undefined {
  const { records, fieldMap, fieldTransforms } = payload
  if (!fieldMap.regionXStart && !fieldMap.regionXEnd && !fieldMap.regionLabel) {
    return undefined
  }
  const regionList = records
    .map((record, index): IChartRegion | null => {
      const label = toMappedString(
        readMappedValue(record, fieldMap, 'regionLabel', fieldTransforms)
      )
      const regionXStartValue = readMappedValue(
        record,
        fieldMap,
        'regionXStart',
        fieldTransforms
      )
      const regionXEndValue = readMappedValue(
        record,
        fieldMap,
        'regionXEnd',
        fieldTransforms
      )
      if (
        !label &&
        regionXStartValue === undefined &&
        regionXEndValue === undefined
      ) {
        return null
      }
      return {
        id:
          toMappedString(readMappedValue(record, fieldMap, 'regionId', fieldTransforms)) ||
          `region-${index}`,
        type:
          (toMappedString(readMappedValue(record, fieldMap, 'regionType', fieldTransforms)) as
            | IChartRegion['type']
            | undefined) || 'range',
        xStart: regionXStartValue !== undefined
          ? toMappedXValue(regionXStartValue, index)
          : undefined,
        xEnd: regionXEndValue !== undefined
          ? toMappedXValue(regionXEndValue, index)
          : undefined,
        yStart: toMappedNumber(readMappedValue(record, fieldMap, 'regionYStart', fieldTransforms)),
        yEnd: toMappedNumber(readMappedValue(record, fieldMap, 'regionYEnd', fieldTransforms)),
        label,
        color: toMappedString(readMappedValue(record, fieldMap, 'regionColor', fieldTransforms))
      }
    })
    .filter((region): region is IChartRegion => !!region)
  return regionList.length ? regionList : undefined
}

function createAnnotationsFromRecords(payload: {
  records: Record<string, unknown>[]
  fieldMap: Record<string, string>
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
}): IChartAnnotation[] | undefined {
  const { records, fieldMap, fieldTransforms } = payload
  if (!fieldMap.annotationText) return undefined
  const annotationList = records
    .map((record, index): IChartAnnotation | null => {
      const text = toMappedString(
        readMappedValue(record, fieldMap, 'annotationText', fieldTransforms)
      )
      if (!text) return null
      return {
        id:
          toMappedString(readMappedValue(record, fieldMap, 'annotationId', fieldTransforms)) ||
          `annotation-${index}`,
        x: toMappedXValue(
          readMappedValue(record, fieldMap, 'annotationX', fieldTransforms),
          index
        ),
        y: toMappedNumber(readMappedValue(record, fieldMap, 'annotationY', fieldTransforms)),
        text
      }
    })
    .filter((annotation): annotation is IChartAnnotation => !!annotation)
  return annotationList.length ? annotationList : undefined
}

export function normalizeChartGraphicDataResult(payload: {
  result: IChartGraphicDataResult
  source: IChartDataSourceBinding
  chart: IChartGraphic
}): IChartGraphicDataResult {
  const { result, source, chart } = payload
  const records = result.records
  const fieldMap = result.fieldMap || source.fieldMap
  const fieldTransforms = result.fieldTransforms || source.fieldTransforms
  if (!records?.length || !fieldMap) {
    return result
  }
  const mappedSeries = result.series || createSeriesFromRecords({
    records,
    fieldMap,
    fieldTransforms,
    sourceChart: chart
  })
  const mappedMarks = result.marks || createMarksFromRecords({
    records,
    fieldMap,
    fieldTransforms
  })
  const mappedRegions = result.regions || createRegionsFromRecords({
    records,
    fieldMap,
    fieldTransforms
  })
  const mappedAnnotations = result.annotations || createAnnotationsFromRecords({
    records,
    fieldMap,
    fieldTransforms
  })
  return {
    ...result,
    records: undefined,
    fieldMap: undefined,
    fieldTransforms: undefined,
    series: mappedSeries,
    marks: mappedMarks,
    regions: mappedRegions,
    annotations: mappedAnnotations
  }
}
