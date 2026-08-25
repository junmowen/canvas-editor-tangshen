import {
  ChartGraphicDataMergeStrategy,
  IChartAnnotation,
  IChartDataPoint,
  IChartGraphic,
  IChartGraphicDataResult,
  IChartMark,
  IChartRegion,
  IChartSeries
} from '../model/ChartGraphic'
import { deepClone } from '../../../../utils'

function isReplaceStrategy(strategy: ChartGraphicDataMergeStrategy | undefined) {
  return !strategy || strategy === 'replace'
}

function isNumberArray(data: IChartSeries['data']): data is number[] {
  return (data as unknown[]).every(item => typeof item === 'number')
}

function isPointArray(data: IChartSeries['data']): data is IChartDataPoint[] {
  return (data as unknown[]).every(
    item =>
      typeof item === 'object' &&
      item !== null &&
      !Array.isArray(item) &&
      'x' in item
  )
}

function createPointKey(point: IChartDataPoint) {
  return String(point.x)
}

function mergeSeriesData(
  currentData: IChartSeries['data'],
  patchData: IChartSeries['data'],
  strategy: ChartGraphicDataMergeStrategy
): IChartSeries['data'] {
  if (strategy === 'append') {
    if (isNumberArray(currentData) && isNumberArray(patchData)) {
      return [...currentData, ...patchData]
    }
    if (isPointArray(currentData) && isPointArray(patchData)) {
      return [...currentData, ...patchData]
    }
    return deepClone(patchData)
  }
  if (isNumberArray(currentData) && isNumberArray(patchData)) {
    return [...currentData, ...patchData]
  }
  if (!isPointArray(currentData) || !isPointArray(patchData)) {
    return deepClone(patchData)
  }
  const pointList = currentData.map(point => ({ ...point }))
  const indexMap = new Map<string, number>()
  pointList.forEach((point, index) => {
    indexMap.set(createPointKey(point), index)
  })
  patchData.forEach(point => {
    const key = createPointKey(point)
    const index = indexMap.get(key)
    if (index === undefined) {
      indexMap.set(key, pointList.length)
      pointList.push({ ...point })
      return
    }
    pointList[index] = {
      ...pointList[index],
      ...point
    }
  })
  return pointList
}

function mergeSeriesList(
  currentList: IChartSeries[] | undefined,
  patchList: IChartSeries[] | undefined,
  strategy: ChartGraphicDataMergeStrategy
) {
  if (!patchList) return undefined
  if (!currentList?.length || isReplaceStrategy(strategy)) {
    return deepClone(patchList)
  }
  const nextMap = new Map<string, IChartSeries>()
  const orderList: string[] = []
  currentList.forEach(series => {
    nextMap.set(series.id, deepClone(series))
    orderList.push(series.id)
  })
  patchList.forEach(series => {
    const currentSeries = nextMap.get(series.id)
    if (!currentSeries) {
      nextMap.set(series.id, deepClone(series))
      orderList.push(series.id)
      return
    }
    nextMap.set(series.id, {
      ...currentSeries,
      ...deepClone(series),
      data: mergeSeriesData(currentSeries.data, series.data, strategy)
    })
  })
  return orderList
    .map(seriesId => nextMap.get(seriesId))
    .filter((series): series is IChartSeries => !!series)
}

function appendList<T>(currentList: T[] | undefined, patchList: T[] | undefined) {
  if (!patchList) return undefined
  return [...(currentList || []), ...deepClone(patchList)]
}

function mergeByIdList<T extends { id: string }>(
  currentList: T[] | undefined,
  patchList: T[] | undefined
) {
  if (!patchList) return undefined
  if (!currentList?.length) return deepClone(patchList)
  const nextMap = new Map<string, T>()
  const orderList: string[] = []
  currentList.forEach(item => {
    nextMap.set(item.id, deepClone(item))
    orderList.push(item.id)
  })
  patchList.forEach(item => {
    if (!nextMap.has(item.id)) {
      orderList.push(item.id)
    }
    nextMap.set(item.id, {
      ...nextMap.get(item.id),
      ...deepClone(item)
    })
  })
  return orderList
    .map(id => nextMap.get(id))
    .filter((item): item is T => !!item)
}

function mergeItemList<T extends { id: string }>(
  currentList: T[] | undefined,
  patchList: T[] | undefined,
  strategy: ChartGraphicDataMergeStrategy
) {
  if (!patchList) return undefined
  if (isReplaceStrategy(strategy)) return deepClone(patchList)
  return strategy === 'append'
    ? appendList(currentList, patchList)
    : mergeByIdList(currentList, patchList)
}

/** 将 provider 返回的增量 patch 合并为可直接写回图表模型的 patch。 */
export function mergeChartGraphicDataPatch(payload: {
  chart: IChartGraphic
  patch: IChartGraphicDataResult
}): IChartGraphicDataResult {
  const { chart, patch } = payload
  const strategy =
    patch.strategy ||
    patch.source?.mergeStrategy ||
    chart.source?.mergeStrategy ||
    'replace'
  const nextPatch = { ...patch }
  delete nextPatch.strategy
  if (isReplaceStrategy(strategy)) {
    return nextPatch
  }
  if (patch.series !== undefined) {
    nextPatch.series = mergeSeriesList(chart.series, patch.series, strategy)
  } else {
    delete nextPatch.series
  }
  if (patch.marks !== undefined) {
    nextPatch.marks = mergeItemList<IChartMark>(chart.marks, patch.marks, strategy)
  } else {
    delete nextPatch.marks
  }
  if (patch.regions !== undefined) {
    nextPatch.regions = mergeItemList<IChartRegion>(
      chart.regions,
      patch.regions,
      strategy
    )
  } else {
    delete nextPatch.regions
  }
  if (patch.annotations !== undefined) {
    nextPatch.annotations = mergeItemList<IChartAnnotation>(
      chart.annotations,
      patch.annotations,
      strategy
    )
  } else {
    delete nextPatch.annotations
  }
  return {
    ...nextPatch
  }
}
