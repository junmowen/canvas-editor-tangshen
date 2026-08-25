import {
  IChartGraphic,
  IChartGraphicInternalEditingState,
  IChartGraphicInternalSelectionTarget,
  IChartSeries
} from '../model/ChartGraphic'

export function isValidChartGraphicInternalEditingState(
  chart: IChartGraphic,
  state: IChartGraphicInternalEditingState | null
) {
  if (!state) return true
  if (chart.interaction?.readonly && state.mode !== 'readonly-preview') {
    return false
  }
  if (state.mode === 'chart' || state.mode === 'readonly-preview') return true
  if (state.mode === 'point') {
    const series = chart.series?.find(item => item.id === state.seriesId)
    return (
      !!series &&
      state.dataIndex !== undefined &&
      state.dataIndex >= 0 &&
      state.dataIndex < series.data.length
    )
  }
  if (state.mode === 'mark') {
    return !!state.markId && !!chart.marks?.some(mark => mark.id === state.markId)
  }
  if (state.mode === 'region') {
    return (
      !!state.regionId &&
      !!chart.regions?.some(region => region.id === state.regionId)
    )
  }
  if (state.mode === 'annotation') {
    return (
      !!state.annotationId &&
      !!chart.annotations?.some(annotation => annotation.id === state.annotationId)
    )
  }
  if (state.mode === 'dental-tooth' || state.mode === 'dental-surface') {
    const tooth = chart.dental?.teeth.find(item => item.code === state.toothCode)
    if (!tooth) return false
    if (state.mode !== 'dental-tooth' && !state.dentalSurface) return false
  }
  return state.selection
    ? isValidChartGraphicInternalSelection(chart, state.selection)
    : true
}

export function isValidChartGraphicInternalSelection(
  chart: IChartGraphic,
  selection: IChartGraphicInternalSelectionTarget[]
) {
  return selection.every(target => {
    if (target.target === 'series-point') {
      const series = chart.series?.find(item => item.id === target.seriesId)
      return (
        !!series &&
        target.dataIndex !== undefined &&
        target.dataIndex >= 0 &&
        target.dataIndex < series.data.length
      )
    }
    if (target.target === 'mark') {
      return !!target.markId && !!chart.marks?.some(mark => mark.id === target.markId)
    }
    if (target.target === 'region') {
      return (
        !!target.regionId &&
        !!chart.regions?.some(region => region.id === target.regionId)
      )
    }
    if (target.target === 'annotation') {
      return (
        !!target.annotationId &&
        !!chart.annotations?.some(annotation => annotation.id === target.annotationId)
      )
    }
    if (
      target.target === 'dental-tooth' ||
      target.target === 'dental-surface'
    ) {
      const tooth = chart.dental?.teeth.find(item => item.code === target.toothCode)
      return !!tooth && (target.target === 'dental-tooth' || !!target.dentalSurface)
    }
    return false
  })
}

export function createChartGraphicInternalSelectionDeletePatch(
    chart: IChartGraphic,
    selection: IChartGraphicInternalSelectionTarget[]
  ): Partial<IChartGraphic> | null {
    let changed = false
    const seriesList: IChartSeries[] | undefined = chart.series?.map(series => ({
      ...series,
      data: series.data.slice() as typeof series.data
    }))
    const pointSelectionMap = new Map<string, number[]>()
    selection.forEach(target => {
      if (
        target.target === 'series-point' &&
        target.seriesId &&
        target.dataIndex !== undefined
      ) {
        const indexList = pointSelectionMap.get(target.seriesId) || []
        indexList.push(target.dataIndex)
        pointSelectionMap.set(target.seriesId, indexList)
      }
    })
    pointSelectionMap.forEach((indexList, seriesId) => {
      const series = seriesList?.find(item => item.id === seriesId)
      if (!series || !Array.isArray(series.data)) return
      Array.from(new Set(indexList))
        .sort((left, right) => right - left)
        .forEach(index => {
          if (index >= 0 && index < series.data.length) {
            series.data.splice(index, 1)
            changed = true
          }
        })
    })

    const markIdSet = new Set(
      selection
        .filter(target => target.target === 'mark' && target.markId)
        .map(target => target.markId!)
    )
    const regionIdSet = new Set(
      selection
        .filter(target => target.target === 'region' && target.regionId)
        .map(target => target.regionId!)
    )
    const annotationIdSet = new Set(
      selection
        .filter(target => target.target === 'annotation' && target.annotationId)
        .map(target => target.annotationId!)
    )
    const marks = markIdSet.size
      ? (chart.marks || []).filter(mark => !markIdSet.has(mark.id))
      : chart.marks
    const regions = regionIdSet.size
      ? (chart.regions || []).filter(region => !regionIdSet.has(region.id))
      : chart.regions
    const annotations = annotationIdSet.size
      ? (chart.annotations || []).filter(annotation => !annotationIdSet.has(annotation.id))
      : chart.annotations
    changed =
      changed ||
      marks !== chart.marks ||
      regions !== chart.regions ||
      annotations !== chart.annotations

    const dental = chart.dental
      ? {
          ...chart.dental,
          teeth: chart.dental.teeth.map(tooth => ({
            ...tooth,
            status: tooth.status ? [...tooth.status] : tooth.status,
            surfaces: tooth.surfaces ? { ...tooth.surfaces } : tooth.surfaces
          }))
        }
      : undefined
    selection.forEach(target => {
      if (!dental || !target.toothCode) return
      const tooth = dental.teeth.find(item => item.code === target.toothCode)
      if (!tooth) return
      if (target.target === 'dental-tooth') {
        if (tooth.status || tooth.surfaces) {
          delete tooth.status
          delete tooth.surfaces
          changed = true
        }
      } else if (
        target.target === 'dental-surface' &&
        target.dentalSurface &&
        tooth.surfaces?.[target.dentalSurface]
      ) {
        delete tooth.surfaces[target.dentalSurface]
        if (!Object.keys(tooth.surfaces).length) {
          delete tooth.surfaces
        }
        changed = true
      }
    })

    if (!changed) return null
    const interaction = {
      ...chart.interaction,
      internalEditing: chart.interaction?.internalEditing
        ? {
            ...chart.interaction.internalEditing,
            selection: undefined
          }
        : undefined
    }
    if (interaction.internalEditing) {
      delete interaction.internalEditing.selection
    }
    return {
      series: seriesList,
      marks,
      regions,
      annotations,
      dental,
      interaction
    }
  }
