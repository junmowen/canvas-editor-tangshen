import { ZERO } from '../../../../dataset/constant/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import {
  ChartGraphicSeriesPointPatch,
  DentalSurface,
  DentalToothStatus,
  IDentalToothState,
  IChartAnnotation,
  IChartDataPoint,
  IChartGraphic,
  IChartMark,
  IChartRegion,
  IChartSeries,
  IInsertChartGraphicPayload
} from '../../../../interface/ChartGraphic'
import { IElement } from '../../../../interface/Element'
import {
  findChartGraphicPresetById,
  normalizeChartGraphic
} from '../model/ChartGraphicPreset'

function toChartComparableX(value: number | string, fallback = 0) {
  if (typeof value === 'number') return value
  const numeric = Number(value)
  if (Number.isFinite(numeric)) return numeric
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : fallback
}

/** 创建可插入文档的图表图形元素。 */
export function createChartGraphicElement(
  payload: IInsertChartGraphicPayload,
  chartId: string
): IElement {
  const chartGraphic = normalizeChartGraphic(payload)
  return {
    id: chartId,
    type: ElementType.CHART_GRAPHIC,
    value: ZERO,
    width: chartGraphic.size.width,
    height: chartGraphic.size.height,
    chartGraphic
  }
}

/** 判断元素是否为图表图形元素。 */
export function isChartGraphicElement(
  element: IElement | undefined | null
): element is IElement & { chartGraphic: IChartGraphic } {
  return element?.type === ElementType.CHART_GRAPHIC && !!element.chartGraphic
}

/** 将元素尺寸同步到图表模型尺寸。 */
export function syncChartGraphicElementSize(
  element: IElement | null | undefined
) {
  if (!isChartGraphicElement(element)) return false
  if (!element.width || !element.height) return false
  element.chartGraphic.size = {
    ...element.chartGraphic.size,
    width: element.width,
    height: element.height
  }
  return true
}

/** 更新图表图形模型。 */
export function applyChartGraphicPatch(
  element: IElement | null | undefined,
  patch: Partial<IChartGraphic>,
  options: {
    allowLockedCoordinate?: boolean
  } = {}
) {
  if (!isChartGraphicElement(element)) return false
  if (
    element.chartGraphic.interaction?.coordinateLocked &&
    patch.coordinate &&
    !options.allowLockedCoordinate
  ) {
    return false
  }
  element.chartGraphic = normalizeChartGraphic({
    ...element.chartGraphic,
    ...patch,
    kind: patch.kind || element.chartGraphic.kind
  })
  element.width = element.chartGraphic.size.width
  element.height = element.chartGraphic.size.height
  return true
}

/** 将指定图表切换为预设默认模型。 */
export function applyChartGraphicPreset(
  element: IElement | null | undefined,
  presetId: string
) {
  if (!isChartGraphicElement(element)) return false
  const preset = findChartGraphicPresetById(presetId)
  if (!preset) return false
  const previousChart = element.chartGraphic
  const nextChart = normalizeChartGraphic({
    kind: preset.kind,
    presetId: preset.id,
    source:
      previousChart.kind === preset.kind ? previousChart.source : undefined,
    interaction: previousChart.interaction?.readonly
      ? { readonly: true }
      : undefined
  })
  element.chartGraphic = nextChart
  element.width = nextChart.size.width
  element.height = nextChart.size.height
  return true
}

/** 更新指定图表序列。 */
export function applyChartGraphicSeriesPatch(
  element: IElement | null | undefined,
  seriesId: string,
  patch: Partial<IChartSeries>
) {
  if (!isChartGraphicElement(element)) return false
  const seriesList = element.chartGraphic.series || []
  const index = seriesList.findIndex(series => series.id === seriesId)
  if (index < 0) return false
  const nextSeriesList = [...seriesList]
  nextSeriesList[index] = {
    ...nextSeriesList[index],
    ...patch,
    id: seriesId
  }
  return applyChartGraphicPatch(element, {
    series: nextSeriesList
  })
}

/** 删除指定序列中的单个数据点。 */
export function applyChartGraphicSeriesPointDelete(
  element: IElement | null | undefined,
  seriesId: string,
  dataIndex: number
) {
  if (!isChartGraphicElement(element)) return false
  const seriesList = element.chartGraphic.series || []
  const index = seriesList.findIndex(series => series.id === seriesId)
  if (index < 0) return false
  const targetSeries = seriesList[index]
  if (!Array.isArray(targetSeries.data)) return false
  if (dataIndex < 0 || dataIndex >= targetSeries.data.length) return false
  const nextDataList = targetSeries.data.slice() as typeof targetSeries.data
  nextDataList.splice(dataIndex, 1)
  const nextSeriesList = [...seriesList]
  nextSeriesList[index] = {
    ...targetSeries,
    data: nextDataList
  }
  return applyChartGraphicPatch(element, {
    series: nextSeriesList
  })
}

/** 更新指定序列中的单个数据点。 */
export function applyChartGraphicSeriesPointPatch(
  element: IElement | null | undefined,
  seriesId: string,
  dataIndex: number,
  patch: ChartGraphicSeriesPointPatch
) {
  if (!isChartGraphicElement(element)) return false
  const seriesList = element.chartGraphic.series || []
  const index = seriesList.findIndex(series => series.id === seriesId)
  if (index < 0) return false
  const targetSeries = seriesList[index]
  if (!Array.isArray(targetSeries.data)) return false
  if (dataIndex < 0 || dataIndex >= targetSeries.data.length) return false
  const nextDataList = targetSeries.data.slice() as typeof targetSeries.data
  const currentPoint = nextDataList[dataIndex]
  if (typeof currentPoint === 'number') {
    if (typeof patch === 'number') {
      nextDataList[dataIndex] = patch as typeof currentPoint
    } else if (typeof patch.y === 'number') {
      nextDataList[dataIndex] = patch.y as typeof currentPoint
    } else {
      return false
    }
  } else {
    if (typeof patch === 'number') {
      nextDataList[dataIndex] = {
        ...currentPoint,
        y: patch
      } as typeof currentPoint
    } else {
      nextDataList[dataIndex] = {
        ...currentPoint,
        ...patch
      } as typeof currentPoint
    }
  }
  const nextSeriesList = [...seriesList]
  nextSeriesList[index] = {
    ...targetSeries,
    data: nextDataList
  }
  return applyChartGraphicPatch(element, {
    series: nextSeriesList
  })
}

/** 在指定序列中插入单个数据点，按 x 值保持升序。 */
export function applyChartGraphicSeriesPointInsert(
  element: IElement | null | undefined,
  seriesId: string,
  point: IChartDataPoint
) {
  if (!isChartGraphicElement(element)) return false
  const seriesList = element.chartGraphic.series || []
  const index = seriesList.findIndex(series => series.id === seriesId)
  if (index < 0) return false
  const targetSeries = seriesList[index]
  if (!Array.isArray(targetSeries.data)) return false
  if (
    !targetSeries.data.length ||
    typeof targetSeries.data[0] === 'number'
  ) {
    return false
  }
  const nextDataList = targetSeries.data.slice() as IChartDataPoint[]
  const pointX = toChartComparableX(point.x, nextDataList.length)
  const insertIndex = nextDataList.findIndex(
    item => toChartComparableX(item.x, nextDataList.length) > pointX
  )
  if (insertIndex < 0) {
    nextDataList.push(point)
  } else {
    nextDataList.splice(insertIndex, 0, point)
  }
  const nextSeriesList = [...seriesList]
  nextSeriesList[index] = {
    ...targetSeries,
    data: nextDataList
  }
  return applyChartGraphicPatch(element, {
    series: nextSeriesList
  })
}

/** 新增或更新图表事件标记。 */
export function applyChartGraphicMarkUpsert(
  element: IElement | null | undefined,
  mark: IChartMark
) {
  if (!isChartGraphicElement(element)) return false
  const markList = element.chartGraphic.marks || []
  const index = markList.findIndex(item => item.id === mark.id)
  const nextMarkList = [...markList]
  if (index >= 0) {
    nextMarkList[index] = {
      ...nextMarkList[index],
      ...mark
    }
  } else {
    nextMarkList.push(mark)
  }
  return applyChartGraphicPatch(element, {
    marks: nextMarkList
  })
}

/** 删除图表事件标记。 */
export function applyChartGraphicMarkDelete(
  element: IElement | null | undefined,
  markId: string
) {
  if (!isChartGraphicElement(element)) return false
  const markList = element.chartGraphic.marks || []
  if (!markList.some(mark => mark.id === markId)) return false
  return applyChartGraphicPatch(element, {
    marks: markList.filter(mark => mark.id !== markId)
  })
}

/** 新增或更新图表区间标记。 */
export function applyChartGraphicRegionUpsert(
  element: IElement | null | undefined,
  region: IChartRegion
) {
  if (!isChartGraphicElement(element)) return false
  const regionList = element.chartGraphic.regions || []
  const index = regionList.findIndex(item => item.id === region.id)
  const nextRegionList = [...regionList]
  if (index >= 0) {
    nextRegionList[index] = {
      ...nextRegionList[index],
      ...region
    }
  } else {
    nextRegionList.push(region)
  }
  return applyChartGraphicPatch(element, {
    regions: nextRegionList
  })
}

/** 删除图表区间标记。 */
export function applyChartGraphicRegionDelete(
  element: IElement | null | undefined,
  regionId: string
) {
  if (!isChartGraphicElement(element)) return false
  const regionList = element.chartGraphic.regions || []
  if (!regionList.some(region => region.id === regionId)) return false
  return applyChartGraphicPatch(element, {
    regions: regionList.filter(region => region.id !== regionId)
  })
}

/** 新增或更新图表文字标注。 */
export function applyChartGraphicAnnotationUpsert(
  element: IElement | null | undefined,
  annotation: IChartAnnotation
) {
  if (!isChartGraphicElement(element)) return false
  const annotationList = element.chartGraphic.annotations || []
  const index = annotationList.findIndex(item => item.id === annotation.id)
  const nextAnnotationList = [...annotationList]
  if (index >= 0) {
    nextAnnotationList[index] = {
      ...nextAnnotationList[index],
      ...annotation
    }
  } else {
    nextAnnotationList.push(annotation)
  }
  return applyChartGraphicPatch(element, {
    annotations: nextAnnotationList
  })
}

/** 删除图表文字标注。 */
export function applyChartGraphicAnnotationDelete(
  element: IElement | null | undefined,
  annotationId: string
) {
  if (!isChartGraphicElement(element)) return false
  const annotationList = element.chartGraphic.annotations || []
  if (!annotationList.some(annotation => annotation.id === annotationId)) {
    return false
  }
  return applyChartGraphicPatch(element, {
    annotations: annotationList.filter(annotation => annotation.id !== annotationId)
  })
}

/** 更新牙位状态。 */
export function applyChartGraphicDentalToothPatch(
  element: IElement | null | undefined,
  code: string,
  patch: Partial<IDentalToothState>
) {
  if (!isChartGraphicElement(element) || !element.chartGraphic.dental) {
    return false
  }
  const dental = element.chartGraphic.dental
  const toothList = dental.teeth || []
  const index = toothList.findIndex(tooth => tooth.code === code)
  if (index < 0) return false
  const nextToothList = [...toothList]
  nextToothList[index] = {
    ...nextToothList[index],
    ...patch,
    code
  }
  return applyChartGraphicPatch(element, {
    dental: {
      ...dental,
      teeth: nextToothList
    }
  })
}

/** 更新牙位图指定牙面的状态数组；传入 null 或空数组表示删除该牙面状态。 */
export function applyChartGraphicDentalSurfacePatch(
  element: IElement | null | undefined,
  code: string,
  surface: DentalSurface,
  statusList: DentalToothStatus[] | null
) {
  if (!isChartGraphicElement(element) || !element.chartGraphic.dental) {
    return false
  }
  const dental = element.chartGraphic.dental
  const toothList = dental.teeth || []
  const index = toothList.findIndex(tooth => tooth.code === code)
  if (index < 0) return false
  const nextToothList = [...toothList]
  const currentTooth = nextToothList[index]
  const nextSurfaces = {
    ...(currentTooth.surfaces || {})
  }
  if (!statusList?.length) {
    delete nextSurfaces[surface]
  } else {
    nextSurfaces[surface] = [...statusList]
  }
  nextToothList[index] = {
    ...currentTooth,
    code,
    surfaces: Object.keys(nextSurfaces).length ? nextSurfaces : undefined
  }
  return applyChartGraphicPatch(element, {
    dental: {
      ...dental,
      teeth: nextToothList
    }
  })
}

function toggleDentalStatusList(
  statusList: DentalToothStatus[] | undefined,
  status: DentalToothStatus
) {
  const nextStatusList = [...(statusList || [])]
  const index = nextStatusList.indexOf(status)
  if (index >= 0) {
    nextStatusList.splice(index, 1)
  } else {
    nextStatusList.push(status)
  }
  return nextStatusList
}

/** 切换整牙状态；存在则移除，不存在则追加。 */
export function toggleChartGraphicDentalToothStatus(
  element: IElement | null | undefined,
  code: string,
  status: DentalToothStatus
) {
  if (!isChartGraphicElement(element) || !element.chartGraphic.dental) {
    return false
  }
  const dental = element.chartGraphic.dental
  const toothList = dental.teeth || []
  const index = toothList.findIndex(tooth => tooth.code === code)
  if (index < 0) return false
  const nextToothList = [...toothList]
  const currentTooth = nextToothList[index]
  const nextStatusList = toggleDentalStatusList(currentTooth.status, status)
  nextToothList[index] = {
    ...currentTooth,
    code,
    status: nextStatusList.length ? nextStatusList : undefined
  }
  return applyChartGraphicPatch(element, {
    dental: {
      ...dental,
      teeth: nextToothList
    }
  })
}

/** 切换指定牙面状态；存在则移除，不存在则追加。 */
export function toggleChartGraphicDentalSurfaceStatus(
  element: IElement | null | undefined,
  code: string,
  surface: DentalSurface,
  status: DentalToothStatus
) {
  if (!isChartGraphicElement(element) || !element.chartGraphic.dental) {
    return false
  }
  const dental = element.chartGraphic.dental
  const toothList = dental.teeth || []
  const index = toothList.findIndex(tooth => tooth.code === code)
  if (index < 0) return false
  const nextToothList = [...toothList]
  const currentTooth = nextToothList[index]
  const nextSurfaces = {
    ...(currentTooth.surfaces || {})
  }
  const nextStatusList = toggleDentalStatusList(nextSurfaces[surface], status)
  if (nextStatusList.length) {
    nextSurfaces[surface] = nextStatusList
  } else {
    delete nextSurfaces[surface]
  }
  nextToothList[index] = {
    ...currentTooth,
    code,
    surfaces: Object.keys(nextSurfaces).length ? nextSurfaces : undefined
  }
  return applyChartGraphicPatch(element, {
    dental: {
      ...dental,
      teeth: nextToothList
    }
  })
}
