import { CommandAdaptTable } from './CommandAdaptTable'
import { ImageDisplay } from '../../dataset/enum/Common'
import { IEditorData, ISetValueOption } from '../../interface/Editor'
import {
  ChartGraphicPresetUnregister,
  ChartGraphicSeriesPointPatch,
  ChartGraphicDataProviderUnregister,
  DentalSurface,
  DentalToothStatus,
  IDentalToothState,
  IChartAnnotation,
  IChartDataPoint,
  IChartGraphicDataSourceState,
  IChartGraphicDataSourceSummary,
  IChartGraphicDataResult,
  IChartGraphicDataProvider,
  IChartGraphic,
  IChartGraphicInternalEditingState,
  IChartGraphicInternalSelectionTarget,
  IChartGraphicPreset,
  IChartGraphicPresetCompatibilityHost,
  IChartGraphicPresetCompatibilityResult,
  IChartGraphicPresetUpgradeInfo,
  IChartGraphicPresetUpgradeResult,
  IChartGraphicSnapshot,
  IChartGraphicTemplateAuditSummary,
  IChartGraphicTemplatePresetAuditSummary,
  IChartGraphicValidationEntry,
  IChartGraphicValidationIssueEntry,
  IChartGraphicValidationResult,
  IChartGraphicValidationSummary,
  IChartMark,
  IChartRegion,
  IChartSeries,
  IInsertChartGraphicPayload,
  IRefreshChartGraphicSourceOption,
  IRefreshChartGraphicSourcesPayload,
  IRefreshChartGraphicSourcesResult,
  ChartGraphicTemplateAuditReason,
  IChartGraphicDataSourceRefreshEvent
} from '../../interface/ChartGraphic'
import { IDrawImagePayload } from '../../interface/Draw'
import { IElement } from '../../interface/Element'
import { IWatermark } from '../../interface/Watermark'
import { deepClone, getUUID } from '../../utils'
import { formatElementContext } from '../../utils/elementContext'
import {
  applyImageDisplayChange,
  createCommandImageElement,
  replaceImageElementValue,
  saveImageElement
} from '../modules/image/command/ImageCommandPolicy'
import {
  clearHyperlinkAttrs,
  createHyperlinkElementList,
  resolveHyperlinkRangeFromCandidates,
  updateHyperlinkUrl
} from '../modules/inline/command/HyperlinkCommandPolicy'
import {
  applyWatermarkOptions,
  resetWatermarkOptions
} from '../modules/watermark/command/WatermarkCommandPolicy'
import {
  applySeparatorDashArray,
  createSeparatorElement,
  shouldReplaceParagraphStartWithSeparator
} from '../modules/separator/command/SeparatorCommandPolicy'
import { createPageBreakElement } from '../modules/page-break/command/PageBreakCommandPolicy'
import {
  applyChartGraphicAnnotationDelete,
  applyChartGraphicAnnotationUpsert,
  applyChartGraphicSeriesPointInsert,
  applyChartGraphicSeriesPointPatch,
  applyChartGraphicSeriesPointDelete,
  applyChartGraphicDentalSurfacePatch,
  applyChartGraphicDentalToothPatch,
  applyChartGraphicMarkDelete,
  applyChartGraphicMarkUpsert,
  applyChartGraphicPatch,
  applyChartGraphicPreset,
  applyChartGraphicRegionDelete,
  applyChartGraphicRegionUpsert,
  applyChartGraphicSeriesPatch,
  createChartGraphicElement,
  isChartGraphicElement,
  toggleChartGraphicDentalSurfaceStatus,
  toggleChartGraphicDentalToothStatus
} from '../modules/chart-graphics/command/ChartGraphicCommandPolicy'
import {
  createChartGraphicPresetUpgradePatch,
  getChartGraphicPresetList,
  getChartGraphicPresetCompatibility,
  getChartGraphicPresetUpgradeInfo,
  registerChartGraphicPreset
} from '../modules/chart-graphics/model/ChartGraphicPreset'
import { createChartGraphicSnapshot } from '../modules/chart-graphics/model/ChartGraphicSnapshotPolicy'
import { validateChartGraphic } from '../modules/chart-graphics/model/ChartGraphicValidationPolicy'
import { normalizeChartGraphicDataResult } from '../modules/chart-graphics/model/ChartGraphicDataBindingPolicy'
import { mergeChartGraphicDataPatch } from '../modules/chart-graphics/model/ChartGraphicDataMergePolicy'
import { walkCommandElementList } from './CommandElementTraversal'

interface IRefreshChartGraphicSourcesInternalOption {
  ignoreCommandDisabled?: boolean
  isSubmitHistory?: boolean
  renderAfterRefresh?: boolean
  preview?: boolean
}

type ChartGraphicRefreshElementStatus = 'refreshed' | 'failed' | 'skipped'

/**
 * 媒体与装饰命令适配模块，负责超链接、图片、分隔符、分页符和水印相关命令。
 */
export class CommandAdaptMedia extends CommandAdaptTable {
  /** 图表数据源 provider，按 sourceId 注册。 */
  private chartGraphicDataProviderMap = new Map<
    string,
    IChartGraphicDataProvider
  >()

  protected refreshChartGraphicSourcesInternalOptions: Required<IRefreshChartGraphicSourcesInternalOption> = {
    ignoreCommandDisabled: false,
    isSubmitHistory: true,
    renderAfterRefresh: true,
    preview: false
  }

  private chartGraphicOnOpenRefreshSequence = 0
  private chartGraphicOnOpenRefreshTimer: number | null = null
  private isPendingChartGraphicOnOpenRefreshAll = false
  private pendingChartGraphicOnOpenRefreshSourceIdSet = new Set<string>()
  private chartGraphicRefreshSequenceMap = new Map<string, number>()
  private chartGraphicDataSourceCacheMap = new Map<
    string,
    IChartGraphicDataResult
  >()

  private getChartGraphicProviderErrorMessage(error: unknown) {
    if (error instanceof Error && error.message) return error.message
    if (
      error &&
      typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string' &&
      error.message
    ) {
      return error.message
    }
    return 'provider error'
  }

  private stringifyChartGraphicDataSourceCacheValue(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value
        .map(item => this.stringifyChartGraphicDataSourceCacheValue(item))
        .join(',')}]`
    }
    if (value && typeof value === 'object') {
      return `{${Object.keys(value)
        .sort()
        .map(key => {
          const record = value as Record<string, unknown>
          return `${JSON.stringify(key)}:${this.stringifyChartGraphicDataSourceCacheValue(record[key])}`
        })
        .join(',')}}`
    }
    return JSON.stringify(value)
  }

  private createChartGraphicDataSourceCacheKey(payload: {
    chartId: string
    kind: IChartGraphic['kind']
    source: IChartGraphic['source']
  }) {
    const { chartId, kind, source } = payload
    if (!source?.sourceId || !source.version) return ''
    return [
      source.sourceId,
      source.version,
      chartId,
      kind,
      source.mergeStrategy || 'replace',
      this.stringifyChartGraphicDataSourceCacheValue(source.fieldMap || {}),
      this.stringifyChartGraphicDataSourceCacheValue(source.fieldTransforms || {})
    ].join('|')
  }

  private clearChartGraphicDataSourceCache(sourceId?: string) {
    if (!sourceId) {
      this.chartGraphicDataSourceCacheMap.clear()
      return
    }
    Array.from(this.chartGraphicDataSourceCacheMap.keys()).forEach(key => {
      if (key.startsWith(`${sourceId}|`)) {
        this.chartGraphicDataSourceCacheMap.delete(key)
      }
    })
  }

  private isChartGraphicSeriesNumberData(data: IChartSeries['data']) {
    return (data as unknown[]).every(item => typeof item === 'number')
  }

  private isCacheableChartGraphicDataPatch(payload: {
    chart: IChartGraphic
    patch: IChartGraphicDataResult
  }) {
    const { chart, patch } = payload
    const strategy =
      patch.strategy ||
      patch.source?.mergeStrategy ||
      chart.source?.mergeStrategy ||
      'replace'
    if (strategy === 'append') return false
    if (strategy === 'merge') {
      return !(patch.series || []).some(series =>
        this.isChartGraphicSeriesNumberData(series.data)
      )
    }
    return true
  }

  /** 为当前选区添加超链接。 */
  public hyperlink(payload: IElement) {
    if (this.isCommandDisabled()) return
    const activeControl = this.control.getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const hyperlinkId = getUUID()
    const newElementList = createHyperlinkElementList(payload, hyperlinkId)
    if (!newElementList) return
    const start = startIndex + 1
    formatElementContext(elementList, newElementList, startIndex, {
      editorOptions: this.options
    })
    this.draw.spliceElementList(
      elementList,
      start,
      startIndex === endIndex ? 0 : endIndex - startIndex,
      newElementList
    )
    const curIndex = start + newElementList.length - 1
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  /** 解析当前光标或选区所在的超链接范围。 */
  public getHyperlinkRange(): [number, number] | null {
    const targetResolver = this.draw.getTargetResolver()
    const { elementList, startElement, endElement } =
      targetResolver.resolveRangeBoundaryElements()
    const selectedElementList = this.range.getSelectionElementList() || []
    // 超链接入口不只看当前光标，还要覆盖选区两端和相邻元素。
    const nextElement = targetResolver.resolveRangeElement({
      elementList,
      anchor: 'end',
      offset: 1
    })
    const prevElement = targetResolver.resolveRangeElement({
      elementList,
      anchor: 'start',
      offset: -1
    })
    const candidateElementList = [
      selectedElementList[0] || null,
      startElement,
      endElement,
      nextElement,
      prevElement
    ]
    return resolveHyperlinkRangeFromCandidates({
      elementList,
      candidateElementList
    })
  }

  /** 删除当前超链接及其文本内容。 */
  public deleteHyperlink() {
    if (this.isCommandDisabled()) return
    // 获取超链接索引
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const [leftIndex, rightIndex] = hyperRange
    // 删除元素
    this.draw.spliceElementList(
      elementList,
      leftIndex,
      rightIndex - leftIndex + 1
    )
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    // 重置画布
    const newIndex = leftIndex - 1
    this.range.setRange(newIndex, newIndex)
    this.draw.render({
      curIndex: newIndex
    })
  }

  /** 取消当前超链接但保留文本内容。 */
  public cancelHyperlink() {
    if (this.isCommandDisabled()) return
    // 获取超链接索引
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const [leftIndex, rightIndex] = hyperRange
    clearHyperlinkAttrs(elementList, leftIndex, rightIndex)
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    // 重置画布
    const { endIndex } = this.getRange()
    this.draw.render({
      curIndex: endIndex,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  /** 编辑当前超链接地址和显示文本。 */
  public editHyperlink(payload: string) {
    if (this.isCommandDisabled()) return
    // 获取超链接索引
    const hyperRange = this.getHyperlinkRange()
    if (!hyperRange) return
    const elementList = this.draw.getObjectResolver().getElementList()
    const [leftIndex, rightIndex] = hyperRange
    updateHyperlinkUrl(elementList, leftIndex, rightIndex, payload)
    this.draw.getHyperlinkParticle().clearHyperlinkPopup()
    // 重置画布
    const { endIndex } = this.getRange()
    this.draw.render({
      curIndex: endIndex,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  /** 在当前选区插入分隔符。 */
  public separator(payload: number[]) {
    if (this.isCommandDisabled()) return
    const activeControl = this.control.getActiveControl()
    if (activeControl) return
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return
    const targetResolver = this.draw.getTargetResolver()
    const elementList = targetResolver.resolveRangeBoundaryElements().elementList
    let curIndex = -1
    // 光标存在分割线，则判断为修改线段逻辑
    const endElement = targetResolver.resolveRangeElement({
      elementList,
      anchor: 'end',
      offset: 1
    })
    const separatorUpdate = applySeparatorDashArray(endElement, payload)
    if (separatorUpdate !== 'not-separator') {
      if (separatorUpdate === 'unchanged') return
      curIndex = endIndex
    } else {
      const newElement = createSeparatorElement(payload)
      // 从行头增加分割线
      formatElementContext(elementList, [newElement], startIndex, {
        editorOptions: this.options
      })
      const startElement = targetResolver.resolveRangeElement({
        elementList,
        anchor: 'start'
      })
      if (
        shouldReplaceParagraphStartWithSeparator({
          startIndex,
          startElement
        })
      ) {
        this.draw.spliceElementList(elementList, startIndex, 1, [newElement])
        curIndex = startIndex - 1
      } else {
        this.draw.spliceElementList(elementList, startIndex + 1, 0, [
          newElement
        ])
        curIndex = startIndex
      }
    }
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
  }

  /** 在当前选区插入分页符。 */
  public pageBreak() {
    if (this.isCommandDisabled()) return
    const activeControl = this.control.getActiveControl()
    if (activeControl) return
    this.insertElementList([createPageBreakElement()])
  }

  /** 添加或更新文档水印配置。 */
  public addWatermark(payload: IWatermark) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const options = this.draw.getOptions()
    applyWatermarkOptions(options, payload)
    this.draw.render({
      isSetCursor: false,
      isSubmitHistory: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  /** 删除文档水印配置。 */
  public deleteWatermark() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const options = this.draw.getOptions()
    if (resetWatermarkOptions(options)) {
      this.draw.render({
        isSetCursor: false,
        isSubmitHistory: false,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 在当前选区插入图片元素。 */
  public image(payload: IDrawImagePayload): string | null {
    if (this.isCommandDisabled()) return null
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return null
    const imageId = payload.id || getUUID()
    this.insertElementList([createCommandImageElement(payload, imageId)])
    return imageId
  }

  /** 在当前选区插入图表图形元素。 */
  public insertChartGraphic(payload: IInsertChartGraphicPayload): string | null {
    if (this.isCommandDisabled()) return null
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return null
    const chartId = payload.id || getUUID()
    this.insertElementList([createChartGraphicElement(payload, chartId)])
    return chartId
  }

  /** 整体替换编辑器文档数据，并自动刷新 refreshMode 为 on-open 的图表。 */
  public setValue(payload: Partial<IEditorData>, options?: ISetValueOption) {
    super.setValue(payload, options)
    if (options?.isRefreshChartGraphicOnOpen === false) {
      this.cancelChartGraphicOnOpenRefresh()
    } else {
      this.scheduleChartGraphicOnOpenRefresh()
    }
  }

  /** 整体替换文档数据，并等待 refreshMode 为 on-open 的图表刷新完成。 */
  public async setValueAsync(
    payload: Partial<IEditorData>,
    options?: ISetValueOption
  ): Promise<IRefreshChartGraphicSourcesResult> {
    this.cancelChartGraphicOnOpenRefresh()
    super.setValue(payload, options)
    if (options?.isRefreshChartGraphicOnOpen === false) {
      return this.createEmptyChartGraphicRefreshResult()
    }
    return this.refreshChartGraphicSourcesInternal(
      {
        refreshMode: 'on-open'
      },
      {
        ignoreCommandDisabled: true,
        isSubmitHistory: false,
        preview: false
      }
    )
  }

  /** 更新指定图表图形元素。 */
  public updateChartGraphic(id: string, patch: Partial<IChartGraphic>) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicPatch(element, patch)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 将指定图表图形切换为预设默认模型。 */
  public applyChartGraphicPreset(id: string, presetId: string) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicPreset(element, presetId)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 将指定图表实例升级到当前注册表中的同 id 最新预设版本。 */
  public upgradeChartGraphicPreset(id: string) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!isChartGraphicElement(element)) return false
    if (element.chartGraphic.interaction?.readonly) return false
    const patch = createChartGraphicPresetUpgradePatch(element.chartGraphic)
    if (!patch) return false
    if (!applyChartGraphicPatch(element, patch)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 批量升级文档内所有可升级的图表预设版本。 */
  public upgradeChartGraphicPresets(): IChartGraphicPresetUpgradeResult {
    const result: IChartGraphicPresetUpgradeResult = {
      checked: 0,
      upgraded: 0,
      skipped: 0,
      failed: 0,
      upgradedChartIds: [],
      skippedChartIds: [],
      failedChartIds: [],
      infos: []
    }
    if (this.isCommandDisabled()) return result
    for (const element of this.collectChartGraphicElementList()) {
      const chartId = element.id || ''
      const info = {
        ...getChartGraphicPresetUpgradeInfo(element.chartGraphic),
        chartId
      }
      result.checked++
      result.infos.push(deepClone(info))
      if (!info.upgradable || element.chartGraphic.interaction?.readonly) {
        result.skipped++
        result.skippedChartIds.push(chartId)
        continue
      }
      const patch = createChartGraphicPresetUpgradePatch(element.chartGraphic)
      if (!patch) {
        result.skipped++
        result.skippedChartIds.push(chartId)
        continue
      }
      if (applyChartGraphicPatch(element, patch)) {
        result.upgraded++
        result.upgradedChartIds.push(chartId)
      } else {
        result.failed++
        result.failedChartIds.push(chartId)
      }
    }
    if (result.upgraded) this.renderChartGraphicUpdate()
    return result
  }

  /** 更新指定图表图形的数据序列。 */
  public updateChartGraphicSeries(
    id: string,
    seriesId: string,
    patch: Partial<IChartSeries>
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicSeriesPatch(element, seriesId, patch)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 删除指定图表图形序列中的单个数据点。 */
  public deleteChartGraphicSeriesPoint(
    id: string,
    seriesId: string,
    dataIndex: number
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicSeriesPointDelete(element, seriesId, dataIndex)) {
      return false
    }
    this.renderChartGraphicUpdate()
    return true
  }

  /** 更新指定图表图形序列中的单个数据点。 */
  public updateChartGraphicSeriesPoint(
    id: string,
    seriesId: string,
    dataIndex: number,
    patch: ChartGraphicSeriesPointPatch
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (
      !applyChartGraphicSeriesPointPatch(element, seriesId, dataIndex, patch)
    ) {
      return false
    }
    this.renderChartGraphicUpdate()
    return true
  }

  /** 在指定图表图形序列中插入单个数据点。 */
  public insertChartGraphicSeriesPoint(
    id: string,
    seriesId: string,
    point: IChartDataPoint
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicSeriesPointInsert(element, seriesId, point)) {
      return false
    }
    this.renderChartGraphicUpdate()
    return true
  }

  /** 新增或更新指定图表图形的事件标记。 */
  public upsertChartGraphicMark(id: string, mark: IChartMark) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicMarkUpsert(element, mark)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 删除指定图表图形的事件标记。 */
  public deleteChartGraphicMark(id: string, markId: string) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicMarkDelete(element, markId)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 新增或更新指定图表图形的区间标记。 */
  public upsertChartGraphicRegion(id: string, region: IChartRegion) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicRegionUpsert(element, region)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 删除指定图表图形的区间标记。 */
  public deleteChartGraphicRegion(id: string, regionId: string) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicRegionDelete(element, regionId)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 新增或更新指定图表图形的文字标注。 */
  public upsertChartGraphicAnnotation(
    id: string,
    annotation: IChartAnnotation
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicAnnotationUpsert(element, annotation)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 删除指定图表图形的文字标注。 */
  public deleteChartGraphicAnnotation(id: string, annotationId: string) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicAnnotationDelete(element, annotationId)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 更新牙位图指定牙位状态。 */
  public updateChartGraphicDentalTooth(
    id: string,
    code: string,
    patch: Partial<IDentalToothState>
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!applyChartGraphicDentalToothPatch(element, code, patch)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 更新牙位图指定牙面的状态数组。 */
  public updateChartGraphicDentalSurface(
    id: string,
    code: string,
    surface: DentalSurface,
    statusList: DentalToothStatus[] | null
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (
      !applyChartGraphicDentalSurfacePatch(
        element,
        code,
        surface,
        statusList
      )
    ) {
      return false
    }
    this.renderChartGraphicUpdate()
    return true
  }

  /** 切换牙位图指定整牙状态。 */
  public toggleChartGraphicDentalToothStatus(
    id: string,
    code: string,
    status: DentalToothStatus
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!toggleChartGraphicDentalToothStatus(element, code, status)) {
      return false
    }
    this.renderChartGraphicUpdate()
    return true
  }

  /** 切换牙位图指定牙面的单个状态。 */
  public toggleChartGraphicDentalSurfaceStatus(
    id: string,
    code: string,
    surface: DentalSurface,
    status: DentalToothStatus
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (
      !toggleChartGraphicDentalSurfaceStatus(element, code, surface, status)
    ) {
      return false
    }
    this.renderChartGraphicUpdate()
    return true
  }

  /** 读取指定图表图形模型。 */
  public getChartGraphic(id: string): IChartGraphic | null {
    const element = this.findChartGraphicElement(id)
    return isChartGraphicElement(element)
      ? deepClone(element.chartGraphic!)
      : null
  }

  /** 读取当前可用的图表预设列表，可按 kind 过滤。 */
  public getChartGraphicPresetList(kind?: IChartGraphicPreset['kind']) {
    return deepClone(getChartGraphicPresetList(kind))
  }

  /** 查询指定图表预设与宿主版本 / 能力是否兼容。 */
  public getChartGraphicPresetCompatibility(
    presetId: string,
    host?: IChartGraphicPresetCompatibilityHost
  ): IChartGraphicPresetCompatibilityResult {
    return deepClone(getChartGraphicPresetCompatibility(presetId, host))
  }

  /** 查询指定图表实例相对当前注册表预设的升级状态。 */
  public getChartGraphicPresetUpgradeInfo(
    id: string
  ): IChartGraphicPresetUpgradeInfo {
    const element = this.findChartGraphicElement(id)
    return deepClone(
      isChartGraphicElement(element)
        ? {
            ...getChartGraphicPresetUpgradeInfo(element.chartGraphic),
            chartId: element.id || id
          }
        : getChartGraphicPresetUpgradeInfo(null)
    )
  }

  /** 批量查询文档内所有图表实例相对当前注册表预设的升级状态。 */
  public getChartGraphicPresetUpgradeInfoList(): IChartGraphicPresetUpgradeInfo[] {
    return this.collectChartGraphicElementList().map(element =>
      deepClone({
        ...getChartGraphicPresetUpgradeInfo(element.chartGraphic),
        chartId: element.id || ''
      })
    )
  }

  /** 读取指定图表图形渲染 / 调试快照。 */
  public getChartGraphicSnapshot(id: string): IChartGraphicSnapshot | null {
    return createChartGraphicSnapshot(this.findChartGraphicElement(id))
  }

  /** 读取指定图表图形校验结果。 */
  public getChartGraphicValidation(
    id: string
  ): IChartGraphicValidationResult | null {
    const element = this.findChartGraphicElement(id)
    if (!isChartGraphicElement(element)) return null
    return validateChartGraphic(element.chartGraphic)
  }

  /** 批量读取文档内所有图表图形的结构化校验结果。 */
  public getChartGraphicValidationList(): IChartGraphicValidationEntry[] {
    return this.collectChartGraphicElementList().map(element => ({
      chartId: element.id || '',
      result: deepClone(validateChartGraphic(element.chartGraphic))
    }))
  }

  /** 扁平读取文档内所有图表图形的结构化校验问题。 */
  public getChartGraphicValidationIssueList(): IChartGraphicValidationIssueEntry[] {
    const result: IChartGraphicValidationIssueEntry[] = []
    this.collectChartGraphicElementList().forEach(element => {
      const validation = validateChartGraphic(element.chartGraphic)
      const issueList = [
        ...(validation.errors || []),
        ...(validation.warnings || [])
      ]
      issueList.forEach(issue => {
        result.push({
          ...issue,
          chartId: element.id || '',
          kind: element.chartGraphic.kind,
          title: element.chartGraphic.title,
          presetId: element.chartGraphic.presetId,
          presetVersion: element.chartGraphic.presetVersion
        })
      })
    })
    return deepClone(result)
  }

  /** 读取文档内所有图表图形的结构化校验汇总。 */
  public getChartGraphicValidationSummary(): IChartGraphicValidationSummary {
    const entries = this.getChartGraphicValidationList()
    const issueList = this.getChartGraphicValidationIssueList()
    const summary: IChartGraphicValidationSummary = {
      valid: true,
      checked: entries.length,
      invalid: 0,
      warned: 0,
      errorCount: 0,
      warningCount: 0,
      invalidChartIds: [],
      warningChartIds: [],
      issueList,
      entries
    }
    entries.forEach(entry => {
      const errorCount = entry.result.errors?.length || 0
      const warningCount = entry.result.warnings?.length || 0
      summary.errorCount += errorCount
      summary.warningCount += warningCount
      if (errorCount) {
        summary.invalid++
        summary.invalidChartIds.push(entry.chartId || '')
      }
      if (warningCount) {
        summary.warned++
        summary.warningChartIds.push(entry.chartId || '')
      }
    })
    summary.valid = summary.invalid === 0
    return summary
  }

  /** 读取文档内所有图表的数据源绑定与 provider 可用状态。 */
  public getChartGraphicDataSourceStateList(): IChartGraphicDataSourceState[] {
    return this.collectChartGraphicElementList().map(element => {
      const chart = element.chartGraphic
      const source = chart.source
      const bound = !!source?.sourceId
      const providerRegistered =
        bound && this.chartGraphicDataProviderMap.has(source.sourceId!)
      return {
        chartId: element.id || '',
        kind: chart.kind,
        title: chart.title,
        bound,
        sourceId: source?.sourceId,
        refreshMode: source?.refreshMode,
        version: source?.version,
        lastRefreshAt: source?.lastRefreshAt,
        lastSuccessAt: source?.lastSuccessAt,
        refreshDurationMs: source?.refreshDurationMs,
        lastError: source?.lastError,
        providerRegistered,
        refreshable: bound && providerRegistered
      }
    })
  }

  /** 读取文档内图表数据源绑定、刷新模式和 provider 状态汇总。 */
  public getChartGraphicDataSourceSummary(): IChartGraphicDataSourceSummary {
    const states = this.getChartGraphicDataSourceStateList()
    const summary: IChartGraphicDataSourceSummary = {
      checked: states.length,
      bound: 0,
      unbound: 0,
      providerMissing: 0,
      failed: 0,
      attempted: 0,
      succeeded: 0,
      neverRefreshed: 0,
      manual: 0,
      onOpen: 0,
      onPrint: 0,
      unboundChartIds: [],
      providerMissingChartIds: [],
      failedChartIds: [],
      attemptedChartIds: [],
      succeededChartIds: [],
      neverRefreshedChartIds: [],
      manualChartIds: [],
      onOpenChartIds: [],
      onPrintChartIds: [],
      states
    }
    states.forEach(state => {
      const chartId = state.chartId || ''
      if (state.bound) {
        summary.bound++
      } else {
        summary.unbound++
        summary.unboundChartIds.push(chartId)
      }
      if (state.bound && !state.providerRegistered) {
        summary.providerMissing++
        summary.providerMissingChartIds.push(chartId)
      }
      if (state.lastError) {
        summary.failed++
        summary.failedChartIds.push(chartId)
      }
      if (state.lastRefreshAt) {
        summary.attempted++
        summary.attemptedChartIds.push(chartId)
      } else if (state.bound && !state.lastError) {
        summary.neverRefreshed++
        summary.neverRefreshedChartIds.push(chartId)
      }
      if (state.lastSuccessAt) {
        summary.succeeded++
        summary.succeededChartIds.push(chartId)
      }
      if (state.refreshMode === 'manual') {
        summary.manual++
        summary.manualChartIds.push(chartId)
      } else if (state.refreshMode === 'on-open') {
        summary.onOpen++
        summary.onOpenChartIds.push(chartId)
      } else if (state.refreshMode === 'on-print') {
        summary.onPrint++
        summary.onPrintChartIds.push(chartId)
      }
    })
    return summary
  }

  /** 读取图表模板发布前审计汇总，不触发刷新或写入历史。 */
  public getChartGraphicTemplateAuditSummary(): IChartGraphicTemplateAuditSummary {
    const validation = this.getChartGraphicValidationSummary()
    const dataSource = this.getChartGraphicDataSourceSummary()
    const preset = this.getChartGraphicTemplatePresetAuditSummary()
    const blockingReasons: ChartGraphicTemplateAuditReason[] = []
    const warnings: ChartGraphicTemplateAuditReason[] = []
    const blockingChartIds = new Set<string>()
    const warningChartIds = new Set<string>()
    const addReason = (
      list: ChartGraphicTemplateAuditReason[],
      reason: ChartGraphicTemplateAuditReason
    ) => {
      if (!list.includes(reason)) {
        list.push(reason)
      }
    }
    const addChartIds = (target: Set<string>, chartIds: string[]) => {
      chartIds.filter(Boolean).forEach(chartId => target.add(chartId))
    }
    if (validation.errorCount) {
      addReason(blockingReasons, 'chart.validation.error')
      addChartIds(blockingChartIds, validation.invalidChartIds)
    }
    if (dataSource.providerMissing) {
      addReason(blockingReasons, 'chart.source.providerMissing')
      addChartIds(blockingChartIds, dataSource.providerMissingChartIds)
    }
    if (dataSource.failed) {
      addReason(blockingReasons, 'chart.source.refreshFailed')
      addChartIds(blockingChartIds, dataSource.failedChartIds)
    }
    if (dataSource.neverRefreshed) {
      addReason(blockingReasons, 'chart.source.neverRefreshed')
      addChartIds(blockingChartIds, dataSource.neverRefreshedChartIds)
    }
    if (preset.missing) {
      addReason(blockingReasons, 'chart.preset.missing')
      addChartIds(blockingChartIds, preset.missingChartIds)
    }
    if (preset.kindMismatch) {
      addReason(blockingReasons, 'chart.preset.kindMismatch')
      addChartIds(blockingChartIds, preset.kindMismatchChartIds)
    }
    if (validation.warningCount) {
      addReason(warnings, 'chart.validation.warning')
      addChartIds(warningChartIds, validation.warningChartIds)
    }
    if (dataSource.unbound) {
      addReason(warnings, 'chart.source.unbound')
      addChartIds(warningChartIds, dataSource.unboundChartIds)
    }
    if (preset.upgradable) {
      addReason(warnings, 'chart.preset.upgradable')
      addChartIds(warningChartIds, preset.upgradableChartIds)
    }
    addChartIds(warningChartIds, preset.warningChartIds)
    return deepClone({
      publishable: blockingReasons.length === 0,
      checked: validation.checked,
      blockingReasons,
      warnings,
      blockingChartIds: Array.from(blockingChartIds),
      warningChartIds: Array.from(warningChartIds).filter(
        chartId => !blockingChartIds.has(chartId)
      ),
      validation,
      dataSource,
      preset
    })
  }

  private getChartGraphicTemplatePresetAuditSummary(): IChartGraphicTemplatePresetAuditSummary {
    const infos = this.getChartGraphicPresetUpgradeInfoList()
    const summary: IChartGraphicTemplatePresetAuditSummary = {
      checked: infos.length,
      upgradable: 0,
      missing: 0,
      kindMismatch: 0,
      warned: 0,
      upgradableChartIds: [],
      missingChartIds: [],
      kindMismatchChartIds: [],
      warningChartIds: [],
      infos
    }
    infos.forEach(info => {
      const chartId = info.chartId || ''
      if (info.upgradable) {
        summary.upgradable++
        summary.upgradableChartIds.push(chartId)
      }
      if (!info.presetFound) {
        summary.missing++
        summary.missingChartIds.push(chartId)
      }
      if (info.presetFound && !info.kindMatched) {
        summary.kindMismatch++
        summary.kindMismatchChartIds.push(chartId)
      }
      if (info.warnings?.length) {
        summary.warned++
        summary.warningChartIds.push(chartId)
      }
    })
    return summary
  }

  /** 注册图表数据源 provider。 */
  public registerChartGraphicDataProvider(
    provider: IChartGraphicDataProvider
  ): ChartGraphicDataProviderUnregister {
    if (!provider.sourceId) return () => undefined
    this.clearChartGraphicDataSourceCache(provider.sourceId)
    this.chartGraphicDataProviderMap.set(provider.sourceId, provider)
    this.scheduleChartGraphicOnOpenRefresh(provider.sourceId)
    return () => {
      if (this.chartGraphicDataProviderMap.get(provider.sourceId) === provider) {
        this.chartGraphicDataProviderMap.delete(provider.sourceId)
        this.clearChartGraphicDataSourceCache(provider.sourceId)
      }
    }
  }

  /** 注册图表预设；同 id 再注册时会临时覆盖当前版本。 */
  public registerChartGraphicPreset(
    preset: IChartGraphicPreset
  ): ChartGraphicPresetUnregister {
    return registerChartGraphicPreset(deepClone(preset))
  }

  /** 设置图表内部编辑态，供属性面板或 overlay 控件投影。 */
  public setChartGraphicInternalEditing(
    id: string,
    state: IChartGraphicInternalEditingState | null
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!isChartGraphicElement(element)) return false
    if (!this.isValidChartGraphicInternalEditingState(element.chartGraphic, state)) {
      return false
    }
    const interaction = {
      ...element.chartGraphic.interaction,
      internalEditing: state || undefined
    }
    if (!state) {
      delete interaction.internalEditing
    }
    if (!applyChartGraphicPatch(element, { interaction })) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 读取图表内部编辑态。 */
  public getChartGraphicInternalEditing(
    id: string
  ): IChartGraphicInternalEditingState | null {
    const element = this.findChartGraphicElement(id)
    return isChartGraphicElement(element)
      ? deepClone(element.chartGraphic.interaction?.internalEditing || null)
      : null
  }

  /** 设置图表内部多选目标。 */
  public setChartGraphicInternalSelection(
    id: string,
    selection: IChartGraphicInternalSelectionTarget[]
  ) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!isChartGraphicElement(element)) return false
    if (
      !this.isValidChartGraphicInternalSelection(
        element.chartGraphic,
        selection
      )
    ) {
      return false
    }
    const previousEditing = element.chartGraphic.interaction?.internalEditing
    const internalEditing: IChartGraphicInternalEditingState = {
      mode:
        previousEditing?.mode ||
        (element.chartGraphic.interaction?.readonly
          ? 'readonly-preview'
          : 'chart'),
      ...previousEditing,
      selection: selection.length ? deepClone(selection) : undefined
    }
    if (!selection.length) {
      delete internalEditing.selection
    }
    const interaction = {
      ...element.chartGraphic.interaction,
      internalEditing
    }
    if (!applyChartGraphicPatch(element, { interaction })) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 读取图表内部多选目标。 */
  public getChartGraphicInternalSelection(
    id: string
  ): IChartGraphicInternalSelectionTarget[] {
    const element = this.findChartGraphicElement(id)
    return isChartGraphicElement(element)
      ? deepClone(
          element.chartGraphic.interaction?.internalEditing?.selection || []
        )
      : []
  }

  /** 删除当前图表内部多选目标。 */
  public deleteChartGraphicInternalSelection(id: string) {
    if (this.isCommandDisabled()) return false
    const element = this.findChartGraphicElement(id)
    if (!isChartGraphicElement(element)) return false
    if (element.chartGraphic.interaction?.readonly) return false
    const selection =
      element.chartGraphic.interaction?.internalEditing?.selection || []
    if (!selection.length) return false
    if (!this.isValidChartGraphicInternalSelection(element.chartGraphic, selection)) {
      return false
    }
    const patch = this.createChartGraphicInternalSelectionDeletePatch(
      element.chartGraphic,
      selection
    )
    if (!patch) return false
    if (!applyChartGraphicPatch(element, patch)) return false
    this.renderChartGraphicUpdate()
    return true
  }

  /** 根据图表 source 绑定刷新图表数据。 */
  public async refreshChartGraphicSource(
    id: string,
    options: IRefreshChartGraphicSourceOption = {}
  ): Promise<boolean> {
    if (this.isCommandDisabled() && !options.preview) return false
    const element = this.findChartGraphicElement(id)
    if (!isChartGraphicElement(element)) return false
    const refreshStatus = await this.refreshChartGraphicElementSource(element, {
      preview: !!options.preview
    })
    if (refreshStatus !== 'refreshed') return false
    this.renderChartGraphicUpdate({
      isSubmitHistory: !options.preview
    })
    return true
  }

  /** 按 sourceId 或 refreshMode 批量刷新图表数据源。 */
  public async refreshChartGraphicSources(
    payload: IRefreshChartGraphicSourcesPayload = {},
    options: IRefreshChartGraphicSourceOption = {}
  ): Promise<IRefreshChartGraphicSourcesResult> {
    if (this.isCommandDisabled() && !options.preview) {
      return this.createEmptyChartGraphicRefreshResult()
    }
    return this.refreshChartGraphicSourcesInternal(payload, {
      ignoreCommandDisabled: !!options.preview,
      isSubmitHistory: !options.preview,
      preview: !!options.preview
    })
  }

  /** 内部批量刷新入口，允许打印/导出链路绕过命令禁用。 */
  protected async refreshChartGraphicSourcesInternal(
    payload: IRefreshChartGraphicSourcesPayload = {},
    options: IRefreshChartGraphicSourcesInternalOption = this.refreshChartGraphicSourcesInternalOptions
  ): Promise<IRefreshChartGraphicSourcesResult> {
    const resolvedOptions = {
      ...this.refreshChartGraphicSourcesInternalOptions,
      ...options
    }
    const result: IRefreshChartGraphicSourcesResult = {
      refreshed: 0,
      skipped: 0,
      failed: 0,
      refreshedChartIds: [],
      skippedChartIds: [],
      failedChartIds: []
    }
    if (this.isCommandDisabled() && !resolvedOptions.ignoreCommandDisabled) {
      return result
    }
    const elementList = this.collectChartGraphicElementList()
    for (const element of elementList) {
      const chartId = element.id || ''
      const source = element.chartGraphic.source
      if (
        !source?.sourceId ||
        (payload.sourceId && source.sourceId !== payload.sourceId) ||
        (payload.refreshMode && source.refreshMode !== payload.refreshMode)
      ) {
        result.skipped++
        result.skippedChartIds.push(chartId)
        continue
      }
      try {
        const refreshStatus = await this.refreshChartGraphicElementSource(
          element,
          {
            preview: resolvedOptions.preview
          }
        )
        if (refreshStatus === 'refreshed') {
          result.refreshed++
          result.refreshedChartIds.push(chartId)
        } else if (refreshStatus === 'skipped') {
          result.skipped++
          result.skippedChartIds.push(chartId)
        } else {
          result.failed++
          result.failedChartIds.push(chartId)
        }
      } catch (error) {
        if (isChartGraphicElement(element)) {
          element.chartGraphic.source = {
            ...element.chartGraphic.source,
            lastError: this.getChartGraphicProviderErrorMessage(error)
          }
        }
        result.failed++
        result.failedChartIds.push(chartId)
      }
    }
    if (result.refreshed && resolvedOptions.renderAfterRefresh !== false) {
      this.renderChartGraphicUpdate({
        isSubmitHistory: resolvedOptions.isSubmitHistory
      })
    }
    return result
  }

  /** 刷新单个图表元素的数据源，不触发渲染。 */
  private async refreshChartGraphicElementSource(
    element: IElement,
    options: {
      preview?: boolean
    } = {}
  ): Promise<ChartGraphicRefreshElementStatus> {
    if (!isChartGraphicElement(element)) return 'skipped'
    const chart = element.chartGraphic
    const source = chart.source
    const sourceId = source?.sourceId
    if (!source || !sourceId) {
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: 'skipped',
        status: 'skipped',
        reason: 'source-missing',
        chartId: element.id || '',
        kind: chart.kind,
        title: chart.title,
        preview: !!options.preview
      })
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: 'complete',
        status: 'skipped',
        reason: 'source-missing',
        chartId: element.id || '',
        kind: chart.kind,
        title: chart.title,
        preview: !!options.preview
      })
      return 'skipped'
    }
    const provider = this.chartGraphicDataProviderMap.get(sourceId)
    if (!provider) {
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: 'skipped',
        status: 'skipped',
        reason: 'provider-missing',
        chartId: element.id || '',
        kind: chart.kind,
        title: chart.title,
        sourceId,
        refreshMode: source.refreshMode,
        version: source.version,
        preview: !!options.preview
      })
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: 'complete',
        status: 'skipped',
        reason: 'provider-missing',
        chartId: element.id || '',
        kind: chart.kind,
        title: chart.title,
        sourceId,
        refreshMode: source.refreshMode,
        version: source.version,
        preview: !!options.preview
      })
      return 'skipped'
    }
    const chartId = element.id || ''
    const refreshSequence = this.startChartGraphicRefreshSequence(chartId)
    const refreshStartedAt = Date.now()
    const lastRefreshAt = new Date(refreshStartedAt).toISOString()
    const cacheKey = this.createChartGraphicDataSourceCacheKey({
      chartId,
      kind: chart.kind,
      source
    })
    const cachedResult = !options.preview && cacheKey
      ? this.chartGraphicDataSourceCacheMap.get(cacheKey)
      : undefined
    const isCached = !!cachedResult
    this.emitChartGraphicDataSourceRefreshEvent({
      phase: 'before',
      chartId,
      kind: chart.kind,
      title: chart.title,
      sourceId,
      refreshMode: source.refreshMode,
      version: source.version,
      reason: isCached ? 'cache-hit' : undefined,
      refreshStartedAt: lastRefreshAt,
      cached: isCached,
      preview: !!options.preview
    })
    try {
      const result =
        (cachedResult ? deepClone(cachedResult) : undefined) ||
        (await provider.load({
          chartId: element.id || '',
          kind: chart.kind,
          chart: deepClone(chart),
          source: deepClone(source),
          fieldMap: source.fieldMap ? { ...source.fieldMap } : undefined,
          fieldTransforms: source.fieldTransforms
            ? deepClone(source.fieldTransforms)
            : undefined,
          mergeStrategy: source.mergeStrategy
        }))
      const refreshDurationMs = Math.max(0, Date.now() - refreshStartedAt)
      if (!this.isLatestChartGraphicRefreshSequence(chartId, refreshSequence)) {
        this.emitChartGraphicDataSourceRefreshEvent({
          phase: 'skipped',
          status: 'skipped',
          reason: 'stale',
          chartId,
          kind: chart.kind,
          title: chart.title,
          sourceId,
          refreshMode: source.refreshMode,
          version: source.version,
          cached: isCached,
          refreshStartedAt: lastRefreshAt,
          refreshEndedAt: new Date().toISOString(),
          refreshDurationMs,
          preview: !!options.preview
        })
        this.emitChartGraphicDataSourceRefreshEvent({
          phase: 'complete',
          status: 'skipped',
          reason: 'stale',
          chartId,
          kind: chart.kind,
          title: chart.title,
          sourceId,
          refreshMode: source.refreshMode,
          version: source.version,
          cached: isCached,
          refreshStartedAt: lastRefreshAt,
          refreshEndedAt: new Date().toISOString(),
          refreshDurationMs,
          preview: !!options.preview
        })
        return 'skipped'
      }
      if (!result) {
        element.chartGraphic.source = {
          ...source,
          lastRefreshAt,
          refreshDurationMs,
          lastError: 'provider returned empty result'
        }
        this.emitChartGraphicDataSourceRefreshEvent({
          phase: 'error',
          status: 'failed',
          reason: 'empty-result',
          error: 'provider returned empty result',
          chartId,
          kind: chart.kind,
          title: chart.title,
          sourceId,
          refreshMode: source.refreshMode,
          version: source.version,
          cached: isCached,
          refreshStartedAt: lastRefreshAt,
          refreshEndedAt: new Date().toISOString(),
          refreshDurationMs,
          preview: !!options.preview
        })
        this.emitChartGraphicDataSourceRefreshEvent({
          phase: 'complete',
          status: 'failed',
          reason: 'empty-result',
          error: 'provider returned empty result',
          chartId,
          kind: chart.kind,
          title: chart.title,
          sourceId,
          refreshMode: source.refreshMode,
          version: source.version,
          cached: isCached,
          refreshStartedAt: lastRefreshAt,
          refreshEndedAt: new Date().toISOString(),
          refreshDurationMs,
          preview: !!options.preview
        })
        this.finishChartGraphicRefreshSequence(chartId, refreshSequence)
        return 'failed'
      }
      const normalizedPatch = normalizeChartGraphicDataResult({
        result,
        source,
        chart
      })
      const isCacheable = this.isCacheableChartGraphicDataPatch({
        chart,
        patch: normalizedPatch
      })
      const patch = mergeChartGraphicDataPatch({
        chart,
        patch: normalizedPatch
      })
      const nextSource = {
        ...source,
        ...patch.source,
        lastRefreshAt,
        lastSuccessAt: new Date().toISOString(),
        refreshDurationMs,
        lastError: undefined
      }
      const nextCacheKey = this.createChartGraphicDataSourceCacheKey({
        chartId,
        kind: chart.kind,
        source: nextSource
      })
      const isApplied = applyChartGraphicPatch(
        element,
        {
          ...patch,
          source: nextSource
        },
        {
          allowLockedCoordinate: true
        }
      )
      if (
        isApplied &&
        !isCached &&
        !options.preview &&
        nextCacheKey &&
        isCacheable
      ) {
        this.chartGraphicDataSourceCacheMap.set(nextCacheKey, deepClone(result))
      }
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: isApplied ? 'success' : 'error',
        status: isApplied ? 'refreshed' : 'failed',
        reason: isApplied
          ? isCached
            ? 'cache-hit'
            : undefined
          : 'apply-failed',
        chartId,
        kind: chart.kind,
        title: chart.title,
        sourceId,
        refreshMode: nextSource.refreshMode,
        version: nextSource.version,
        refreshStartedAt: lastRefreshAt,
        refreshEndedAt: nextSource.lastSuccessAt,
        refreshDurationMs,
        cached: isCached,
        preview: !!options.preview
      })
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: 'complete',
        status: isApplied ? 'refreshed' : 'failed',
        reason: isApplied
          ? isCached
            ? 'cache-hit'
            : undefined
          : 'apply-failed',
        chartId,
        kind: element.chartGraphic.kind,
        title: element.chartGraphic.title,
        sourceId,
        refreshMode: element.chartGraphic.source?.refreshMode,
        version: element.chartGraphic.source?.version,
        refreshStartedAt: lastRefreshAt,
        refreshEndedAt: nextSource.lastSuccessAt,
        refreshDurationMs,
        cached: isCached,
        preview: !!options.preview
      })
      this.finishChartGraphicRefreshSequence(chartId, refreshSequence)
      return isApplied ? 'refreshed' : 'failed'
    } catch (error) {
      if (!this.isLatestChartGraphicRefreshSequence(chartId, refreshSequence)) {
        this.emitChartGraphicDataSourceRefreshEvent({
          phase: 'skipped',
          status: 'skipped',
          reason: 'stale',
          chartId,
          kind: chart.kind,
          title: chart.title,
          sourceId,
          refreshMode: source.refreshMode,
          version: source.version,
          refreshStartedAt: lastRefreshAt,
          refreshEndedAt: new Date().toISOString(),
          refreshDurationMs: Math.max(0, Date.now() - refreshStartedAt),
          preview: !!options.preview
        })
        this.emitChartGraphicDataSourceRefreshEvent({
          phase: 'complete',
          status: 'skipped',
          reason: 'stale',
          chartId,
          kind: chart.kind,
          title: chart.title,
          sourceId,
          refreshMode: source.refreshMode,
          version: source.version,
          refreshStartedAt: lastRefreshAt,
          refreshEndedAt: new Date().toISOString(),
          refreshDurationMs: Math.max(0, Date.now() - refreshStartedAt),
          preview: !!options.preview
        })
        return 'skipped'
      }
      const errorMessage = this.getChartGraphicProviderErrorMessage(error)
      const refreshDurationMs = Math.max(0, Date.now() - refreshStartedAt)
      element.chartGraphic.source = {
        ...source,
        lastRefreshAt,
        refreshDurationMs,
        lastError: errorMessage
      }
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: 'error',
        status: 'failed',
        reason: 'provider-error',
        error: errorMessage,
        chartId,
        kind: chart.kind,
        title: chart.title,
        sourceId,
        refreshMode: source.refreshMode,
        version: source.version,
        refreshStartedAt: lastRefreshAt,
        refreshEndedAt: new Date().toISOString(),
        refreshDurationMs,
        preview: !!options.preview
      })
      this.emitChartGraphicDataSourceRefreshEvent({
        phase: 'complete',
        status: 'failed',
        reason: 'provider-error',
        error: errorMessage,
        chartId,
        kind: chart.kind,
        title: chart.title,
        sourceId,
        refreshMode: source.refreshMode,
        version: source.version,
        refreshStartedAt: lastRefreshAt,
        refreshEndedAt: new Date().toISOString(),
        refreshDurationMs,
        preview: !!options.preview
      })
      this.finishChartGraphicRefreshSequence(chartId, refreshSequence)
      return 'failed'
    }
  }

  private emitChartGraphicDataSourceRefreshEvent(
    payload: IChartGraphicDataSourceRefreshEvent
  ) {
    this.draw.getEventBus().emit(
      'chartGraphicDataSourceRefresh',
      deepClone(payload)
    )
  }

  private startChartGraphicRefreshSequence(chartId: string) {
    const nextSequence =
      (this.chartGraphicRefreshSequenceMap.get(chartId) || 0) + 1
    this.chartGraphicRefreshSequenceMap.set(chartId, nextSequence)
    return nextSequence
  }

  private isLatestChartGraphicRefreshSequence(
    chartId: string,
    refreshSequence: number
  ) {
    return this.chartGraphicRefreshSequenceMap.get(chartId) === refreshSequence
  }

  private finishChartGraphicRefreshSequence(
    chartId: string,
    refreshSequence: number
  ) {
    if (this.isLatestChartGraphicRefreshSequence(chartId, refreshSequence)) {
      this.chartGraphicRefreshSequenceMap.delete(chartId)
    }
  }

  private isValidChartGraphicInternalEditingState(
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
      return !!state.regionId && !!chart.regions?.some(region => region.id === state.regionId)
    }
    if (state.mode === 'annotation') {
      return !!state.annotationId && !!chart.annotations?.some(annotation => annotation.id === state.annotationId)
    }
    if (state.mode === 'dental-tooth' || state.mode === 'dental-surface') {
      const tooth = chart.dental?.teeth.find(item => item.code === state.toothCode)
      if (!tooth) return false
      if (state.mode !== 'dental-tooth' && !state.dentalSurface) return false
    }
    return state.selection
      ? this.isValidChartGraphicInternalSelection(chart, state.selection)
      : true
  }

  private isValidChartGraphicInternalSelection(
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
        return !!target.regionId && !!chart.regions?.some(region => region.id === target.regionId)
      }
      if (target.target === 'annotation') {
        return !!target.annotationId && !!chart.annotations?.some(annotation => annotation.id === target.annotationId)
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

  private createChartGraphicInternalSelectionDeletePatch(
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

  /** 调度打开文档后的 on-open 图表数据刷新。 */
  private scheduleChartGraphicOnOpenRefresh(sourceId?: string) {
    const refreshSequence = ++this.chartGraphicOnOpenRefreshSequence
    if (sourceId && !this.isPendingChartGraphicOnOpenRefreshAll) {
      this.pendingChartGraphicOnOpenRefreshSourceIdSet.add(sourceId)
    } else {
      this.isPendingChartGraphicOnOpenRefreshAll = true
      this.pendingChartGraphicOnOpenRefreshSourceIdSet.clear()
    }
    if (this.chartGraphicOnOpenRefreshTimer !== null) {
      window.clearTimeout(this.chartGraphicOnOpenRefreshTimer)
    }
    this.chartGraphicOnOpenRefreshTimer = window.setTimeout(() => {
      this.chartGraphicOnOpenRefreshTimer = null
      const isRefreshAll = this.isPendingChartGraphicOnOpenRefreshAll
      const sourceIdList = Array.from(
        this.pendingChartGraphicOnOpenRefreshSourceIdSet
      )
      this.isPendingChartGraphicOnOpenRefreshAll = false
      this.pendingChartGraphicOnOpenRefreshSourceIdSet.clear()
      const refreshPayloadList: IRefreshChartGraphicSourcesPayload[] =
        isRefreshAll || !sourceIdList.length
          ? [
              {
                refreshMode: 'on-open'
              }
            ]
          : sourceIdList.map(item => ({
              sourceId: item,
              refreshMode: 'on-open'
            }))
      void Promise.all(
        refreshPayloadList.map(payload =>
          this.refreshChartGraphicSourcesInternal(payload, {
            ignoreCommandDisabled: true,
            isSubmitHistory: false,
            renderAfterRefresh: false,
            preview: false
          })
        )
      ).then(resultList => {
        const refreshed = resultList.reduce(
          (sum, result) => sum + result.refreshed,
          0
        )
        if (refreshSequence === this.chartGraphicOnOpenRefreshSequence && refreshed) {
          this.renderChartGraphicUpdate({
            isSubmitHistory: false
          })
        }
      })
    }, 0)
  }

  /** 取消尚未执行的 on-open 刷新批次，并让已发出的旧批次停止提交渲染。 */
  private cancelChartGraphicOnOpenRefresh() {
    this.chartGraphicOnOpenRefreshSequence++
    if (this.chartGraphicOnOpenRefreshTimer !== null) {
      window.clearTimeout(this.chartGraphicOnOpenRefreshTimer)
      this.chartGraphicOnOpenRefreshTimer = null
    }
    this.isPendingChartGraphicOnOpenRefreshAll = false
    this.pendingChartGraphicOnOpenRefreshSourceIdSet.clear()
  }

  private createEmptyChartGraphicRefreshResult(): IRefreshChartGraphicSourcesResult {
    return {
      refreshed: 0,
      skipped: 0,
      failed: 0,
      refreshedChartIds: [],
      skippedChartIds: [],
      failedChartIds: []
    }
  }

  /** 重绘图表图形更新。 */
  private renderChartGraphicUpdate(
    options: {
      isSubmitHistory?: boolean
    } = {}
  ) {
    this.draw.render({
      isSubmitHistory: options.isSubmitHistory,
      isSetCursor: false
    })
  }

  /** 收集文档内所有图表图形元素。 */
  private collectChartGraphicElementList(): Array<
    IElement & { chartGraphic: IChartGraphic }
  > {
    const result: Array<IElement & { chartGraphic: IChartGraphic }> = []
    for (const context of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      walkCommandElementList({
        elementList: context.elementList,
        isIncludeValueList: true,
        visitor: ({ element }) => {
          if (isChartGraphicElement(element)) {
            result.push(element)
          }
        }
      })
    }
    return result
  }

  /** 按 id 查找图表图形元素。 */
  private findChartGraphicElement(id: string): IElement | null {
    for (const context of this.draw
      .getObjectResolver()
      .getOriginalZoneElementList()) {
      let result: IElement | null = null
      walkCommandElementList({
        elementList: context.elementList,
        isIncludeValueList: true,
        visitor: ({ element }) => {
          if (element.id === id) {
            result = element
          }
        }
      })
      if (result) return result
    }
    return null
  }

  /** 替换当前图片元素的资源信息。 */
  public replaceImageElement(payload: string) {
    const element = this.draw.getTargetResolver().resolveRangeElement()
    if (!replaceImageElementValue(element, payload)) return
    this.draw.render({
      isSetCursor: false
    })
  }

  /** 将当前图片元素保存为本地图片文件。 */
  public saveAsImageElement() {
    const element = this.draw.getTargetResolver().resolveRangeElement()
    saveImageElement(element)
  }

  /** 切换当前图片元素的显示方式。 */
  public changeImageDisplay(element: IElement, display: ImageDisplay) {
    const { startIndex, endIndex } = this.getRange()
    const isChanged = applyImageDisplayChange({
      element,
      display,
      startIndex,
      positionList: this.coordinate.getPositionList()
    })
    if (!isChanged) return
    this.draw.getComponents().previewer.clearResizer()
    this.draw.render({
      isSetCursor: true,
      curIndex: endIndex
    })
  }
}
