import { CommandAdaptSearch } from './CommandAdaptSearch'
import { ZERO } from '../../dataset/constant/Common'
import { DeepRequired } from '../../interface/Common'
import { IGetImageOption, IGetValueOption } from '../../interface/Draw'
import {
  IEditorHTML,
  IEditorOption,
  IEditorResult,
  IEditorText
} from '../../interface/Editor'
import { IElement, IElementPosition } from '../../interface/Element'
import { IDocumentStyle } from '../../interface/Style'
import { IRange, RangeContext, RangeRect } from '../../interface/Range'
import {
  IClearChartGraphicDentalStatusByHitPayload,
  IInsertChartGraphicAnnotationByHitPayload,
  IInsertChartGraphicMarkByHitPayload,
  IInsertChartGraphicSeriesPointByHitPayload,
  IUpdateChartGraphicSeriesPointByHitPayload,
  IDeleteChartGraphicTargetByHitPayload,
  IChartDataPoint,
  IChartGraphic,
  IChartGraphicHitQueryPayload,
  IChartGraphicHitQueryResult,
  IToggleChartGraphicDentalStatusByHitPayload
 } from '../modules/chart-graphics/model/ChartGraphic'
import { ISearchResultContext } from '../../interface/Search'
import { deepClone, getUUID } from '../../utils'
import {
  pickElementAttr,
  zipElementList
} from '../../utils/elementZip'
import { createDomFromElementList } from '../../utils/elementDom'
import { getTextFromElementList } from '../../utils/elementText'
import { IGetAreaValueOption, IGetAreaValueResult } from '../../interface/Area'
import { ITypesettingLayoutSnapshot } from '../../interface/TypesettingLayout'
import {
  ITitleTree,
  ITitleTreeNode,
  ITitleTreeRange
} from '../../interface/Title'
import { buildTitleTree } from '../modules/title/query/TitleTreeBuilder'
import { FormulaDomain, IFormulaSymbol } from '../../interface/Formula'
import { getFormulaSymbolList } from '../modules/formula/model/FormulaSymbolLibrary'
import {
  createFormulaFromMathML,
  normalizeFormulaFromElement
} from '../modules/formula/model/FormulaModel'
import {
  createPdfBlobFromPrintSvgDocument,
  IPrintPdfDocumentOption
} from '../../utils/print'
import {
  createOoxmlDocxPackageBlob,
  createOoxmlPackageParts
} from '../export/ooxml/OoxmlPackage'
import { queryChartGraphicHitByPoint } from '../modules/chart-graphics/hittest/ChartGraphicHitQueryPolicy'
import { resolveChartAxisPointValueFromLocalCoordinate } from '../modules/chart-graphics/render/ChartGraphicCoordinatePolicy'

function resolveChartAxisPositionValue(payload: {
  chart: IChartGraphic
  seriesId?: string
  localX: number
  localY: number
  width: number
  height: number
}) {
  const { chart, localX, localY, width, height } = payload
  return resolveChartAxisPointValueFromLocalCoordinate({
    chart,
    width,
    height,
    localX,
    localY
  })
}

function resolveChartAxisInsertValue(payload: {
  chart: IChartGraphic
  seriesId: string
  localX: number
  localY: number
  width: number
  height: number
  label?: string
}) {
  const { label, ...pointPayload } = payload
  const point = resolveChartAxisPositionValue(pointPayload)
  return {
    ...point,
    label
  } as IChartDataPoint
}

/**
 * 查询命令适配模块，负责文档数据、选区上下文、关键词上下文等只读结果获取。
 */
export class CommandAdaptQuery extends CommandAdaptSearch {
  /** 标题树查询缓存，按正文数据版本和布局版本失效，避免频繁重建章节树。 */
  private titleTreeCache: {
    /** 正文数据版本，用于识别标题文本或结构是否变化。 */
    documentVersion: number
    /** 布局版本，用于识别标题所在页码是否变化。 */
    layoutVersion: number
    /** 缓存的标题树；无标题时缓存 null，避免重复扫描。 */
    tree: ITitleTree | null
  } | null = null

  /** 导出当前文档图片数据。 */
  public getImage(payload?: IGetImageOption): Promise<string[]> {
    return this.draw.getDataURL(payload)
  }

  /** 获取当前编辑器运行配置。 */
  public getOptions(): DeepRequired<IEditorOption> {
    return this.options
  }

  /** 获取段落块/栏/页排版中间层快照。 */
  public getTypesettingLayoutSnapshot(): ITypesettingLayoutSnapshot | null {
    return this.draw.getTypesettingLayoutSnapshot()
  }

  /** 获取当前正文标题父子树。 */
  public getTitleTree(): ITitleTree | null {
    const version = this.getTitleTreeCacheVersion()
    if (
      !this.titleTreeCache ||
      this.titleTreeCache.documentVersion !== version.documentVersion ||
      this.titleTreeCache.layoutVersion !== version.layoutVersion
    ) {
      this.titleTreeCache = {
        ...version,
        tree: buildTitleTree({
          elementList: this.draw.getObjectResolver().getOriginalMainElementList(),
          positionList: this.coordinate.getMainPositionList()
        })
      }
    }
    // 对外返回克隆结果，防止调用方修改节点数组或 childList 后污染缓存。
    return this.titleTreeCache.tree ? deepClone(this.titleTreeCache.tree) : null
  }

  /** 读取标题树缓存版本，正文版本负责内容变化，布局版本负责页码变化。 */
  private getTitleTreeCacheVersion() {
    return {
      documentVersion: this.draw.getRuntime().getDocumentTextStore().version,
      layoutVersion: this.draw.getTableLayoutSnapshotVersion()
    }
  }

  /** 按标题 id 查询标题树节点，供目录、章节定位和业务侧按章操作复用。 */
  public getTitleTreeNode(titleId: string): ITitleTreeNode | null {
    const titleTree = this.getTitleTree()
    if (!titleTree) {
      return null
    }
    return titleTree.nodeList.find(node => node.id === titleId) || null
  }

  /** 按标题 id 列表批量查询标题树节点，返回顺序与传入 id 顺序一致。 */
  public getTitleTreeNodeList(titleIds: string[]): ITitleTreeNode[] {
    const titleTree = this.getTitleTree()
    if (!titleTree || !titleIds.length) {
      return []
    }
    const nodeMap = new Map(titleTree.nodeList.map(node => [node.id, node]))
    return titleIds
      .map(titleId => nodeMap.get(titleId))
      .filter((node): node is ITitleTreeNode => Boolean(node))
  }

  /** 查询指定标题的直接子标题节点列表，标题不存在时返回 null。 */
  public getTitleTreeChildList(titleId: string): ITitleTreeNode[] | null {
    const titleTree = this.getTitleTree()
    if (!titleTree) {
      return null
    }
    const node = titleTree.nodeList.find(item => item.id === titleId)
    if (!node) {
      return null
    }
    const nodeMap = new Map(titleTree.nodeList.map(item => [item.id, item]))
    return node.childrenTitleIds
      .map(childTitleId => nodeMap.get(childTitleId))
      .filter((childNode): childNode is ITitleTreeNode => Boolean(childNode))
  }

  /** 按标题 id 查询章节范围，供章节拖拽、按章导出和业务侧批量处理复用。 */
  public getTitleTreeRange(titleId: string): ITitleTreeRange | null {
    const node = this.getTitleTreeNode(titleId)
    if (!node) {
      return null
    }
    const elementList = this.draw
      .getObjectResolver()
      .getOriginalMainElementList()
    return {
      titleId: node.id,
      startIndex: node.rangeStartIndex,
      endIndex: node.rangeEndIndex,
      contentStartIndex: node.contentStartIndex,
      contentEndIndex: node.contentEndIndex,
      nextBoundaryTitleId: node.nextBoundaryTitleId,
      tableId: node.tableId,
      trIndex: node.trIndex,
      tdIndex: node.tdIndex,
      elementList: node.tableId
        ? []
        : deepClone(
            elementList.slice(node.rangeStartIndex, node.rangeEndIndex + 1)
          )
    }
  }

  /** 查询内置专业公式符号库。 */
  public getFormulaSymbolList(domain?: FormulaDomain): IFormulaSymbol[] {
    return getFormulaSymbolList(domain)
  }

  /** 获取当前文档样式库。 */
  public getDocumentStyles(): IDocumentStyle[] {
    const styles = this.draw.getObjectResolver().getOriginalEditorData().styles
    return styles ? deepClone(styles) : []
  }

  /** 按元素 id 查询结构化公式模型。 */
  public getFormulaById(id: string) {
    const element = this.draw
      .getObjectResolver()
      .getOriginalMainElementList()
      .find(item => item.id === id)
    return element ? normalizeFormulaFromElement(element) : null
  }

  /** 将外部 MathML 文本解析为内部结构化公式模型。 */
  public parseFormulaMathML(mathML: string, id?: string) {
    return createFormulaFromMathML(mathML, id)
  }

  /** 同步获取当前文档结构数据。 */
  public getValue(options?: IGetValueOption): IEditorResult {
    return this.draw.getValue(options)
  }

  /** 获取当前文档的 OOXML 最小 package 部件集合，供 DOCX 打包或调试使用。 */
  public getOoxmlPackageParts() {
    this.draw.flushAsyncInsertTransaction('command-get-ooxml-package-parts')
    const data = this.draw.getObjectResolver().getOriginalEditorData()
    return createOoxmlPackageParts(data, this.options)
  }

  /** 获取当前文档的最小 DOCX Blob，内部使用无压缩 ZIP package。 */
  public getOoxmlDocxBlob() {
    this.draw.flushAsyncInsertTransaction('command-get-ooxml-docx-blob')
    const data = this.draw.getObjectResolver().getOriginalEditorData()
    return createOoxmlDocxPackageBlob(data, this.options)
  }

  /** 获取当前文档的 PDF Blob，内部复用 SVG 打印页面并转换为矢量 PDF。 */
  public async getPdfBlob(options?: IPrintPdfDocumentOption) {
    this.draw.flushAsyncInsertTransaction('command-get-pdf-blob')
    await this.preparePrintChartGraphics()
    return createPdfBlobFromPrintSvgDocument(
      this.createPrintSvgDocumentPayload(),
      options
    )
  }

  /** 按文档坐标命中图表图形内部对象。 */
  public getChartGraphicHit(
    payload: IChartGraphicHitQueryPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = queryChartGraphicHitByPoint(this.draw, payload)
    if (!hit) return null
    return deepClone<IChartGraphicHitQueryResult>({
      elementId: hit.elementId,
      pageNo: hit.pageNo,
      chart: hit.chart,
      width: hit.width,
      height: hit.height,
      localX: hit.localX,
      localY: hit.localY,
      hit: hit.hit
    })
  }

  /** 按文档坐标命中牙位图并切换整牙或牙面状态。 */
  public toggleChartGraphicDentalStatusByHit(
    payload: IToggleChartGraphicDentalStatusByHitPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = this.getChartGraphicHit(payload)
    if (hit?.chart.interaction?.readonly) return null
    if (!hit?.elementId || !hit.hit.toothCode) return null
    if (hit.hit.target === 'dental-surface' && hit.hit.dentalSurface) {
      const ok = this.toggleChartGraphicDentalSurfaceStatus(
        hit.elementId,
        hit.hit.toothCode,
        hit.hit.dentalSurface,
        payload.status
      )
      return ok ? hit : null
    }
    if (hit.hit.target === 'dental-tooth') {
      const ok = this.toggleChartGraphicDentalToothStatus(
        hit.elementId,
        hit.hit.toothCode,
        payload.status
      )
      return ok ? hit : null
    }
    return null
  }

  /** 按文档坐标命中图表内部对象并直接删除可删除目标。 */
  public deleteChartGraphicTargetByHit(
    payload: IDeleteChartGraphicTargetByHitPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = this.getChartGraphicHit(payload)
    if (hit?.chart.interaction?.readonly) return null
    if (!hit?.elementId) return null
    if (
      hit.hit.target === 'series-point' &&
      hit.hit.seriesId &&
      hit.hit.dataIndex !== undefined
    ) {
      const ok = this.deleteChartGraphicSeriesPoint(
        hit.elementId,
        hit.hit.seriesId,
        hit.hit.dataIndex
      )
      return ok ? hit : null
    }
    if (hit.hit.target === 'mark' && hit.hit.markId) {
      const ok = this.deleteChartGraphicMark(hit.elementId, hit.hit.markId)
      return ok ? hit : null
    }
    if (hit.hit.target === 'region' && hit.hit.regionId) {
      const ok = this.deleteChartGraphicRegion(hit.elementId, hit.hit.regionId)
      return ok ? hit : null
    }
    if (hit.hit.target === 'annotation' && hit.hit.annotationId) {
      const ok = this.deleteChartGraphicAnnotation(
        hit.elementId,
        hit.hit.annotationId
      )
      return ok ? hit : null
    }
    if (
      hit.hit.target === 'dental-surface' ||
      hit.hit.target === 'dental-tooth'
    ) {
      return this.clearChartGraphicDentalStatusByHit(payload)
    }
    return null
  }

  /** 按文档坐标命中牙位图并清除整牙或牙面状态。 */
  public clearChartGraphicDentalStatusByHit(
    payload: IClearChartGraphicDentalStatusByHitPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = this.getChartGraphicHit(payload)
    if (hit?.chart.interaction?.readonly) return null
    if (!hit?.elementId || !hit.hit.toothCode) return null
    if (hit.hit.target === 'dental-surface' && hit.hit.dentalSurface) {
      const ok = this.updateChartGraphicDentalSurface(
        hit.elementId,
        hit.hit.toothCode,
        hit.hit.dentalSurface,
        null
      )
      return ok ? hit : null
    }
    if (hit.hit.target === 'dental-tooth') {
      const ok = this.updateChartGraphicDentalTooth(hit.elementId, hit.hit.toothCode, {
        status: undefined,
        surfaces: undefined
      })
      return ok ? hit : null
    }
    return null
  }

  /** 按文档坐标命中图表点位并更新该点。 */
  public updateChartGraphicSeriesPointByHit(
    payload: IUpdateChartGraphicSeriesPointByHitPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = this.getChartGraphicHit(payload)
    if (hit?.chart.interaction?.readonly) return null
    if (
      !hit?.elementId ||
      hit.hit.target !== 'series-point' ||
      !hit.hit.seriesId ||
      hit.hit.dataIndex === undefined
    ) {
      return null
    }
    const ok = this.updateChartGraphicSeriesPoint(
      hit.elementId,
      hit.hit.seriesId,
      hit.hit.dataIndex,
      payload.patch
    )
    return ok ? hit : null
  }

  /** 按文档坐标命中绘图区后插入新标记。 */
  public insertChartGraphicMarkByHit(
    payload: IInsertChartGraphicMarkByHitPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = this.getChartGraphicHit(payload)
    if (hit?.chart.interaction?.readonly) return null
    if (
      !hit?.elementId ||
      (hit.hit.target !== 'plot-area' &&
        hit.hit.target !== 'series-line' &&
        hit.hit.target !== 'series-point')
    ) {
      return null
    }
    const point = resolveChartAxisPositionValue({
      chart: hit.chart,
      seriesId: hit.hit.seriesId,
      localX: hit.localX,
      localY: hit.localY,
      width: hit.width,
      height: hit.height
    })
    const ok = this.upsertChartGraphicMark(hit.elementId, {
      id: payload.id || getUUID(),
      type: payload.type || 'event',
      x: point.x,
      y: point.y,
      label: payload.label?.trim() || undefined
    })
    return ok ? hit : null
  }

  /** 按文档坐标命中绘图区后插入新标注。 */
  public insertChartGraphicAnnotationByHit(
    payload: IInsertChartGraphicAnnotationByHitPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = this.getChartGraphicHit(payload)
    if (hit?.chart.interaction?.readonly) return null
    if (
      !hit?.elementId ||
      (hit.hit.target !== 'plot-area' &&
        hit.hit.target !== 'series-line' &&
        hit.hit.target !== 'series-point')
    ) {
      return null
    }
    const text = payload.text.trim()
    if (!text) return null
    const point = resolveChartAxisPositionValue({
      chart: hit.chart,
      seriesId: hit.hit.seriesId,
      localX: hit.localX,
      localY: hit.localY,
      width: hit.width,
      height: hit.height
    })
    const ok = this.upsertChartGraphicAnnotation(hit.elementId, {
      id: payload.id || getUUID(),
      x: point.x,
      y: point.y,
      text
    })
    return ok ? hit : null
  }

  /** 按文档坐标命中曲线后插入新点位。 */
  public insertChartGraphicSeriesPointByHit(
    payload: IInsertChartGraphicSeriesPointByHitPayload
  ): IChartGraphicHitQueryResult | null {
    const hit = this.getChartGraphicHit(payload)
    if (hit?.chart.interaction?.readonly) return null
    if (
      !hit?.elementId ||
      hit.hit.target !== 'series-line' ||
      !hit.hit.seriesId
    ) {
      return null
    }
    const point = resolveChartAxisInsertValue({
      chart: hit.chart,
      seriesId: hit.hit.seriesId,
      localX: hit.localX,
      localY: hit.localY,
      width: hit.width,
      height: hit.height,
      label: payload.label
    })
    const ok = this.insertChartGraphicSeriesPoint(
      hit.elementId,
      hit.hit.seriesId,
      point
    )
    return ok ? hit : null
  }

  /** 异步获取当前文档结构数据。 */
  public getValueAsync(options?: IGetValueOption): Promise<IEditorResult> {
    return this.workerManager.getValue(options)
  }

  /** 获取指定区域的结构化内容。 */
  public getAreaValue(
    options?: IGetAreaValueOption
  ): IGetAreaValueResult | null {
    return this.draw.getArea().getAreaValue(options)
  }

  /** 获取当前文档的 HTML 内容。 */
  public getHTML(): IEditorHTML {
    this.draw.flushAsyncInsertTransaction('command-get-html')
    const options = this.options
    const { main } = this.draw
      .getObjectResolver()
      .getOriginalEditorData()
    return {
      header: createDomFromElementList(
        this.draw.getHeader().getElementList(0),
        options
      ).innerHTML,
      main: createDomFromElementList(main, options).innerHTML,
      footer: createDomFromElementList(
        this.draw.getFooter().getElementList(0),
        options
      ).innerHTML
    }
  }

  /** 获取当前文档的纯文本内容。 */
  public getText(): IEditorText {
    this.draw.flushAsyncInsertTransaction('command-get-text')
    const { main } = this.draw
      .getObjectResolver()
      .getOriginalEditorData()
    return {
      header: getTextFromElementList(this.draw.getHeader().getElementList(0)),
      main: getTextFromElementList(main),
      footer: getTextFromElementList(this.draw.getFooter().getElementList(0))
    }
  }

  /** 获取当前文档字数统计。 */
  public getWordCount(): Promise<number> {
    return this.workerManager.getWordCount()
  }

  /** 获取当前选区对应的纯文本。 */
  public getRangeText(): string {
    return this.range.toString()
  }

  /** 解析选区上下文的起止位置信息。 */
  private resolveRangeContextPositions(payload: {
    /** 选区是否折叠，用于区分光标和范围选择。 */
    isCollapsed: boolean
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 结束元素索引，用于确定处理范围的右边界。 */
    endIndex: number
    /** 光标坐标信息，用于渲染插入点或处理命中。 */
    cursorPosition: IElementPosition | null
  }) {
    // 统一解析 rangeContext 里的首尾位置和选区位置列表。
    // 这样 getRangeContext 主体只做编排，不再铺开大量边界补位分支。
    const { isCollapsed, startIndex, endIndex, cursorPosition } = payload
    const positionList = this.coordinate.getPositionList()
    const selectionContentRange = this.range.getSelectionContentRange()
    const selectionPositionList = selectionContentRange
      ? positionList.slice(
          selectionContentRange.startIndex,
          selectionContentRange.endIndex + 1
        )
      : null
    const endSelectionPosition =
      selectionPositionList?.[selectionPositionList.length - 1]
    const startPosition =
      (isCollapsed
        ? cursorPosition || positionList[endIndex]
        : selectionPositionList?.[0]) ||
      positionList[startIndex] ||
      positionList[Math.max(0, endIndex - 1)] ||
      positionList[0]
    const endPosition =
      (isCollapsed
        ? cursorPosition || positionList[endIndex]
        : endSelectionPosition) ||
      positionList[Math.max(0, endIndex - 1)] ||
      positionList[endIndex] ||
      positionList[positionList.length - 1]
    if (!startPosition || !endPosition) {
      return null
    }
    return {
      positionList,
      selectionPositionList,
      startPosition,
      endPosition
    }
  }

  /** 生成选区上下文的页面矩形信息。 */
  private createRangeContextRects(payload: {
    selectionPositionList: IElementPosition[] | null
    /** 光标坐标信息，用于渲染插入点或处理命中。 */
    cursorPosition: IElementPosition | null
    /** 结束元素索引，用于确定处理范围的右边界。 */
    endIndex: number
  }): RangeRect[] | null {
    // rangeRects 是公开上下文里最容易膨胀的一块：
    // 非闭合选区按行聚合，闭合光标退化成 0 宽矩形。
    const { selectionPositionList, cursorPosition, endIndex } = payload
    // 初始化 range Rects 列表。
    const rangeRects: RangeRect[] = []
    const height = this.draw.getOriginalHeight()
    const pageGap = this.draw.getOriginalPageGap()
    if (selectionPositionList) {
      let currentRowNo: number | null = null
      let currentX = 0
      let rangeRect: RangeRect | null = null
      for (let p = 0; p < selectionPositionList.length; p++) {
        const {
          rowNo,
          pageNo,
          coordinate: { leftTop, rightTop },
          lineHeight
        } = selectionPositionList[p]
        if (currentRowNo === null || currentRowNo !== rowNo) {
          if (rangeRect) {
            rangeRects.push(rangeRect)
          }
          rangeRect = {
            x: leftTop[0],
            y: leftTop[1] + pageNo * (height + pageGap),
            width: rightTop[0] - leftTop[0],
            height: lineHeight
          }
          currentRowNo = rowNo
          currentX = leftTop[0]
        } else {
          rangeRect!.width = rightTop[0] - currentX
        }
        if (p === selectionPositionList.length - 1 && rangeRect) {
          rangeRects.push(rangeRect)
        }
      }
      return rangeRects
    }

    const positionList = this.coordinate.getPositionList()
    const position = cursorPosition || positionList[endIndex]
    if (!position) {
      return null
    }
    const {
      coordinate: { rightTop },
      pageNo,
      lineHeight
    } = position
    rangeRects.push({
      x: rightTop[0],
      y: rightTop[1] + pageNo * (height + pageGap),
      width: 0,
      height: lineHeight
    })
    return rangeRects
  }

  /** 解析选区上下文所属标题信息。 */
  private resolveRangeContextTitleInfo(payload: {
    /** 文档元素列表，按文档顺序保存参与处理的元素。 */
    elementList: IElement[]
    /** 布局位置列表，保存元素分页后的坐标结果。 */
    positionList: IElementPosition[]
    /** 选区是否折叠，用于区分光标和范围选择。 */
    isCollapsed: boolean
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
  }) {
    // 标题上下文按“向前回溯到当前标题块起点”的方式解析，
    // 不把这段扫描逻辑继续留在 getRangeContext 主体里。
    const { elementList, positionList, isCollapsed, startIndex } = payload
    let titleId: string | null = null
    let titleStartPageNo: number | null = null
    let scanIndex = isCollapsed ? startIndex - 1 : startIndex
    while (scanIndex >= 0) {
      const curElement = elementList[scanIndex]
      const preElement = elementList[scanIndex - 1]
      if (curElement.titleId && curElement.titleId !== preElement?.titleId) {
        titleId = curElement.titleId
        titleStartPageNo = positionList[scanIndex]?.pageNo ?? null
        break
      }
      scanIndex--
    }
    return {
      titleId,
      titleStartPageNo
    }
  }

  /** 获取当前选区的完整上下文信息。 */
  public getRangeContext(): RangeContext | null {
    // 公开 rangeContext 是命令层的综合视图：
    // 它把公开 range、cursor、row/col、rect、table/title context 统一组装成一个稳定输出。
    const range = this.getRange()
    const { startIndex, endIndex } = range
    if (!~startIndex && !~endIndex) return null
    const isCollapsed = startIndex === endIndex
    const selectionText = this.getRangeText()
    const cursorPosition = this.getCursorPosition()
    const selectedElementList = this.range.getSelectionElementList() || []
    const selectionElementList = zipElementList(selectedElementList)
    const elementList = this.draw.getObjectResolver().getElementList()
    const boundaryElements = this.draw
      .getTargetResolver()
      .resolveRangeContextBoundaryElements({
      isCollapsed,
      startIndex,
      endIndex,
      elementList,
      selectedElementList
    })
    if (!boundaryElements) return null
    const { startSourceElement, endSourceElement } = boundaryElements
    const startElement = pickElementAttr(startSourceElement, {
      extraPickAttrs: ['id', 'controlComponent']
    })
    const endElement = pickElementAttr(endSourceElement, {
      extraPickAttrs: ['id', 'controlComponent']
    })
    const rowList = this.draw.getObjectResolver().getRowList()
    const resolvedPositions = this.resolveRangeContextPositions({
      isCollapsed,
      startIndex,
      endIndex,
      cursorPosition
    })
    if (!resolvedPositions) return null
    const { positionList, selectionPositionList, startPosition, endPosition } =
      resolvedPositions
    const startPageNo = startPosition.pageNo
    const endPageNo = endPosition.pageNo
    const startRowNo = startPosition.rowIndex
    const endRowNo = endPosition.rowIndex
    const startParagraphNo =
      this.range.getRangeParagraphInfo()?.startIndex ?? startIndex
    const startRow = rowList[startRowNo] || rowList[0]
    const endRow = rowList[endRowNo] || rowList[rowList.length - 1]
    if (!startRow || !endRow) return null
    let startColNo = 0
    let endColNo = 0
    // 以光标显示位置为准
    startColNo =
      startRow.elementList[0]?.value === ZERO
        ? startPosition.index! - startRow.startIndex
        : startPosition.index! - startRow.startIndex + 1
    // 光标闭合时列位置相同
    if (startPosition === endPosition) {
      endColNo = startColNo
    } else {
      endColNo =
        endRow.elementList[0]?.value === ZERO
          ? endPosition.index! - endRow.startIndex
          : endPosition.index! - endRow.startIndex + 1
    }
    const rangeRects = this.createRangeContextRects({
      selectionPositionList,
      cursorPosition,
      endIndex
    })
    if (!rangeRects) return null
    const zone = this.draw.getZone().getZone()
    const { isTable, trIndex, tdIndex, index } =
      this.coordinate.getPositionContext()
    let tableElement: IElement | null = null
    if (isTable) {
      const originalElementList = this.draw.getObjectResolver().getOriginalElementList()
      const originTableElement = originalElementList[index!] || null
      if (originTableElement) {
        tableElement = zipElementList([originTableElement])[0]
      }
    }
    const { titleId, titleStartPageNo } = this.resolveRangeContextTitleInfo({
      elementList,
      positionList,
      isCollapsed,
      startIndex
    })
    return deepClone<RangeContext>({
      isCollapsed,
      startElement,
      endElement,
      startPageNo,
      endPageNo,
      startRowNo,
      endRowNo,
      startParagraphNo,
      startColNo,
      endColNo,
      rangeRects,
      zone,
      isTable,
      trIndex: trIndex ?? null,
      tdIndex: tdIndex ?? null,
      tableElement,
      selectionText,
      selectionElementList,
      titleId,
      titleStartPageNo
    })
  }

  /** 获取当前选区所在行信息。 */
  public getRangeRow(): IElement[] | null {
    const rowElementList = this.range.getRangeRowElementList()
    return rowElementList ? zipElementList(rowElementList) : null
  }

  /** 获取当前选区所在段落信息。 */
  public getRangeParagraph(): IElement[] | null {
    const paragraphElementList = this.range.getRangeParagraphInfo()?.elementList
    return paragraphElementList ? zipElementList(paragraphElementList) : null
  }

  /** 获取关键词在文档中的选区列表。 */
  public getKeywordRangeList(payload: string): IRange[] {
    return this.range.getKeywordRangeList(payload)
  }

  /** 获取关键词命中的上下文片段。 */
  public getKeywordContext(payload: string): ISearchResultContext[] | null {
    const rangeList = this.getKeywordRangeList(payload)
    if (!rangeList.length) return null
    const searchResultContextList: ISearchResultContext[] = []
    const positionList = this.coordinate.getMainPositionList()
    for (let r = 0; r < rangeList.length; r++) {
      const range = rangeList[r]
      const { startIndex, endIndex, tableId, startTrIndex, startTdIndex } =
        range
      let keywordPositionList: IElementPosition[] = positionList
      if (range.tableId) {
        const tableContext = this.draw
          .getTargetResolver()
          .resolveOriginalTableById(tableId!)
        if (tableContext) {
          keywordPositionList =
            this.draw.getTargetResolver().resolveOriginalTableTdByIndex({
              tableIndex: tableContext.index,
              trIndex: startTrIndex!,
              tdIndex: startTdIndex!
            })?.td.positionList || []
        }
      }
      // 获取关键词始末位置
      const startPosition = deepClone(keywordPositionList[startIndex])
      const endPosition = deepClone(keywordPositionList[endIndex])
      searchResultContextList.push({
        range,
        startPosition,
        endPosition
      })
    }
    return searchResultContextList
  }
}
