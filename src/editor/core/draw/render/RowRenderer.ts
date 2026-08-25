import { EditorMode, EditorZone } from '../../../dataset/enum/Editor'
import { IDrawRowPayload } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { BlockRowRenderer } from '../../modules/block/render/BlockRowRenderer'
import { ChartGraphicRowRenderer } from '../../modules/chart-graphics/render/ChartGraphicRowRenderer'
import { CheckableControlRenderer } from '../../modules/control/render/CheckableControlRenderer'
import { RowControlBorderRenderer } from '../../modules/control/render/RowControlBorderRenderer'
import { RowGroupRenderer } from '../../modules/group/render/RowGroupRenderer'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../../modules/formula/debug/FormulaDebugLogger'
import { isFormulaTextElement } from '../../modules/formula/layout/FormulaTextElementLayout'
import { FormulaTextRowRenderer } from '../../modules/formula/render/FormulaTextRowRenderer'
import { InlineImageRenderer } from '../../modules/image/render/InlineImageRenderer'
import { InlineRowElementRenderer } from '../../modules/inline/render/InlineRowElementRenderer'
import { ListRowMarkerRenderer } from '../../modules/list/render/ListRowMarkerRenderer'
import { PageBreakRowRenderer } from '../../modules/page-break/render/PageBreakRowRenderer'
import { LineBreakMarkerRenderer } from '../../modules/paragraph/render/LineBreakMarkerRenderer'
import { ParagraphTextRunRenderer } from '../../modules/paragraph/render/ParagraphTextRunRenderer'
import { RowHighlightRenderer } from '../../modules/richtext/render/RowHighlightRenderer'
import { ScriptRowRenderer } from '../../modules/richtext/render/ScriptRowRenderer'
import { RowTextDecorationRenderer } from '../../modules/richtext/render/RowTextDecorationRenderer'
import { renderRowDragHandle } from '../../modules/row-drag/RowDragHandle'
import { SeparatorRowRenderer } from '../../modules/separator/render/SeparatorRowRenderer'
import { TableRowElementRenderer } from '../../modules/table/render/TableRowElementRenderer'
import { RowSelectionRenderer } from '../../range/selection/RowSelectionRenderer'
import type { Draw } from '../Draw'
import { RowTableRenderHelper } from '../../modules/table/render/RowTableRenderHelper'

/**
 * 行渲染器。
 *
 * 负责绘制单行文本、选区高亮以及相关位置信息。
 */
export class RowRenderer {
  /** 只读表格渲染helper依赖，集中处理当前流程的辅助逻辑。 */
  private readonly tableRenderHelper: RowTableRenderHelper
  private readonly blockRowRenderer: BlockRowRenderer
  private readonly chartGraphicRowRenderer = new ChartGraphicRowRenderer()
  private readonly checkableControlRenderer: CheckableControlRenderer
  private readonly rowControlBorderRenderer: RowControlBorderRenderer
  private readonly rowGroupRenderer: RowGroupRenderer
  private readonly formulaTextRowRenderer: FormulaTextRowRenderer
  private readonly inlineImageRenderer: InlineImageRenderer
  private readonly inlineRowElementRenderer: InlineRowElementRenderer
  private readonly listRowMarkerRenderer: ListRowMarkerRenderer
  private readonly pageBreakRowRenderer: PageBreakRowRenderer
  private readonly lineBreakMarkerRenderer: LineBreakMarkerRenderer
  private readonly paragraphTextRunRenderer: ParagraphTextRunRenderer
  private readonly rowHighlightRenderer: RowHighlightRenderer
  private readonly scriptRowRenderer: ScriptRowRenderer
  private readonly rowTextDecorationRenderer: RowTextDecorationRenderer
  private readonly separatorRowRenderer: SeparatorRowRenderer
  private readonly tableRowElementRenderer: TableRowElementRenderer
  private readonly rowSelectionRenderer: RowSelectionRenderer

  /** 初始化 RowRenderer 实例并注入运行依赖。 */
  constructor(private readonly draw: Draw) {
    this.tableRenderHelper = new RowTableRenderHelper(draw)
    this.blockRowRenderer = new BlockRowRenderer()
    this.checkableControlRenderer = new CheckableControlRenderer()
    this.rowControlBorderRenderer = new RowControlBorderRenderer()
    this.rowGroupRenderer = new RowGroupRenderer(draw)
    this.formulaTextRowRenderer = new FormulaTextRowRenderer(draw)
    this.inlineImageRenderer = new InlineImageRenderer()
    this.inlineRowElementRenderer = new InlineRowElementRenderer()
    this.listRowMarkerRenderer = new ListRowMarkerRenderer()
    this.pageBreakRowRenderer = new PageBreakRowRenderer()
    this.lineBreakMarkerRenderer = new LineBreakMarkerRenderer()
    this.paragraphTextRunRenderer = new ParagraphTextRunRenderer()
    this.rowHighlightRenderer = new RowHighlightRenderer(draw)
    this.scriptRowRenderer = new ScriptRowRenderer()
    this.rowTextDecorationRenderer = new RowTextDecorationRenderer()
    this.separatorRowRenderer = new SeparatorRowRenderer()
    this.tableRowElementRenderer = new TableRowElementRenderer()
    this.rowSelectionRenderer = new RowSelectionRenderer(draw, this.tableRenderHelper)
  }

  private forEachRowPositionSlice(
    payload: IDrawRowPayload,
    callback: (
      curRow: IDrawRowPayload['rowList'][number],
      rowPositionList: IDrawRowPayload['positionList']
    ) => void
  ) {
    // 把“rowList + positionList”统一按行切片，避免行级流程重复维护 offset。
    // 各自维护一份 rowPositionOffset 循环。
    let rowPositionOffset = 0
    for (let i = 0; i < payload.rowList.length; i++) {
      const curRow = payload.rowList[i]
      const rowPositionList = payload.positionList.slice(
        rowPositionOffset,
        rowPositionOffset + curRow.elementList.length
      )
      rowPositionOffset += curRow.elementList.length
      callback(curRow, rowPositionList)
    }
  }

  private clearRowRenderArea(
    ctx: CanvasRenderingContext2D,
    rowPositionList: IDrawRowPayload['positionList'],
    rowHeight: number,
    preserveTopEdge = false,
    /** 是否清理整行正文宽度，公式独占行需要清掉旧文本残影。 */
    clearFullRowWidth = false,
    /** 当前页正文宽度，整行清理时使用。 */
    innerWidth = 0,
    /** 整行清理的左边界，主正文使用页边距左侧，表格内默认使用当前行左侧。 */
    fullRowClearStartX?: number
  ) {
    // 每一行先按最小包围盒清理旧像素，避免 selection/highlight 残留。
    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY

    for (let i = 0; i < rowPositionList.length; i++) {
      const rowPosition = rowPositionList[i]
      if (!rowPosition) continue
      minX = Math.min(minX, rowPosition.coordinate.leftTop[0])
      maxX = Math.max(maxX, rowPosition.coordinate.rightTop[0])
      minY = Math.min(minY, rowPosition.coordinate.leftTop[1])
    }

    if (
      !Number.isFinite(minX) ||
      !Number.isFinite(maxX) ||
      !Number.isFinite(minY)
    ) {
      return
    }

    const clearTop = Math.max(
      0,
      Math.floor(minY) + (preserveTopEdge ? 1 : 0)
    )
    const clearHeight = Math.max(
      1,
      Math.ceil(rowHeight) - (preserveTopEdge ? 1 : 0)
    )
    const clearLeft = clearFullRowWidth
      ? fullRowClearStartX ?? minX
      : minX
    ctx.clearRect(
      Math.max(0, Math.floor(clearLeft)),
      clearTop,
      clearFullRowWidth
        ? Math.max(1, Math.ceil(innerWidth))
        : Math.max(1, Math.ceil(maxX - minX)),
      clearHeight
    )
  }

  private renderRowElement(payload: {
    /** Canvas 2D 上下文，用于执行当前绘制指令。 */
    ctx: CanvasRenderingContext2D
    /** cur行，用于保存或定位表格行结构。 */
    curRow: IDrawRowPayload['rowList'][number]
    /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
    element: IDrawRowPayload['rowList'][number]['elementList'][number]
    /** pre元素，用于定位或修改对应文档节点。 */
    preElement: IDrawRowPayload['rowList'][number]['elementList'][number] | undefined
    /** 行位置，用于描述布局或命中的空间范围。 */
    rowPosition: IDrawRowPayload['positionList'][number]
    /** 元素索引，用于定位文档列表中的目标元素。 */
    index: number
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo: number
    /** 是否绘制换行符，用于控制格式标记显示。 */
    isDrawLineBreak: boolean
    /** 是否打印mode，用于控制当前流程的判断分支。 */
    isPrintMode: boolean
    /** 是否设计模式，用于显示编辑辅助标记。 */
    isDesignMode: boolean
    /** 是否导出绘制，用于关闭运行期副作用并保持输出稳定。 */
    isExport?: boolean
    /** 模式标识，用于选择当前处理分支。 */
    mode: EditorMode
    /** 操作配置项，用于调整当前流程的可选行为。 */
    options: ReturnType<Draw['getOptions']>
    textParticle: ReturnType<Draw['getTextParticle']>
    /** 控件配置对象，描述当前控件的行为和取值规则。 */
    control: ReturnType<Draw['getControl']>
    /** 是否下划线，用于设置文字装饰样式。 */
    underline: ReturnType<Draw['getComponents']>['underline']
    /** 是否删除线，用于设置文字装饰样式。 */
    strikeout: ReturnType<Draw['getComponents']>['strikeout']
    tableParticle: ReturnType<Draw['getTableParticle']>
    lineBreakParticle: ReturnType<Draw['getComponents']>['lineBreakParticle']
    imageParticle: ReturnType<Draw['getImageParticle']>
    laTexParticle: ReturnType<Draw['getComponents']>['laTexParticle']
    hyperlinkParticle: ReturnType<Draw['getHyperlinkParticle']>
    superscriptParticle: ReturnType<Draw['getComponents']>['superscriptParticle']
    subscriptParticle: ReturnType<Draw['getComponents']>['subscriptParticle']
    separatorParticle: ReturnType<Draw['getComponents']>['separatorParticle']
    pageBreakParticle: ReturnType<Draw['getComponents']>['pageBreakParticle']
    checkboxParticle: ReturnType<Draw['getCheckboxParticle']>
    radioParticle: ReturnType<Draw['getRadioParticle']>
    blockParticle: ReturnType<Draw['getBlockParticle']>
    /** 读取元素字号，作为行内测量的基础尺寸。 */
    getElementSize: (el: IElement) => number
    getElementFont: Draw['getElementFont']
    /** 读取元素行距，参与行盒高度计算。 */
    getElementRowMargin: (el: IElement) => number
    /** 当前表格范围元素，用于定位或修改对应文档节点。 */
    currentTableRangeElement: IElement | ITableFragmentDescriptor | null
    /** 是否跨行列选择，用于判断表格选区形态。 */
    isCrossRowCol: boolean
    /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
    zone?: EditorZone
  }): IElement | ITableFragmentDescriptor | null {
    // drawRow 主循环的逐元素分发都收在这里，
    // 主循环本身只负责遍历和收尾编排。
    const {
      ctx,
      curRow,
      element,
      preElement,
      rowPosition,
      index,
      pageNo,
      isDrawLineBreak,
      isPrintMode,
      isDesignMode,
      isExport,
      mode,
      options,
      textParticle,
      control,
      underline,
      strikeout,
      tableParticle,
      lineBreakParticle,
      imageParticle,
      hyperlinkParticle,
      superscriptParticle,
      subscriptParticle,
      separatorParticle,
      pageBreakParticle,
      checkboxParticle,
      radioParticle,
      blockParticle,
      getElementSize,
      getElementFont,
      getElementRowMargin,
      currentTableRangeElement,
      isCrossRowCol,
      zone
    } = payload
    const metrics = element.metrics
    const {
      ascent: offsetY,
      coordinate: {
        leftTop: [x, y]
      }
    } = rowPosition
    const logicalPreElement = this.draw
      .getObjectResolver()
      .getLayoutMainElementList()[rowPosition.index - 1]
    let nextTableRangeElement = currentTableRangeElement
    if (
      isFormulaDebugEnabled() &&
      (isFormulaTextElement(element) ||
        isFormulaTextElement(preElement) ||
        isFormulaTextElement(logicalPreElement))
    ) {
      logFormulaDebug('row-render-position', {
        pageNo,
        rowNo: rowPosition.rowNo,
        rowIndex: rowPosition.rowIndex,
        logicalIndex: rowPosition.index,
        elementId: element.id,
        elementType: element.type,
        elementValue: element.value,
        elementLatex: element.formula?.latex,
        rowPreElementId: preElement?.id,
        rowPreElementType: preElement?.type,
        logicalPreElementId: logicalPreElement?.id,
        logicalPreElementType: logicalPreElement?.type,
        logicalPreElementLatex: logicalPreElement?.formula?.latex,
        x: roundFormulaDebugNumber(x),
        lineTop: roundFormulaDebugNumber(y),
        lineBottom: roundFormulaDebugNumber(rowPosition.coordinate.leftBottom[1]),
        baselineY: roundFormulaDebugNumber(y + offsetY),
        rowHeight: roundFormulaDebugNumber(curRow.height),
        positionLineHeight: roundFormulaDebugNumber(rowPosition.lineHeight),
        metricsWidth: roundFormulaDebugNumber(metrics.width),
        metricsHeight: roundFormulaDebugNumber(metrics.height)
      })
    }

    if ((element.hide || element.control?.hide || element.area?.hide) && !isDesignMode) {
      textParticle.complete()
    } else if (this.inlineImageRenderer.canRender(element)) {
      textParticle.complete()
      this.inlineImageRenderer.render(ctx, element, x, y + offsetY, imageParticle, {
        isExport
      })
    } else if (this.formulaTextRowRenderer.canRender(element)) {
      this.formulaTextRowRenderer.render({
        ctx,
        element,
        x,
        y: y + offsetY,
        textParticle
      })
    } else if (this.tableRowElementRenderer.canRender(element)) {
      nextTableRangeElement = this.tableRowElementRenderer.render({
        ctx,
        curRow,
        element,
        x,
        y,
        currentTableRangeElement: nextTableRangeElement,
        isCrossRowCol,
        tableParticle
      })
    } else if (this.inlineRowElementRenderer.canRender(element)) {
      this.inlineRowElementRenderer.render({
        ctx,
        curRow,
        element,
        preElement,
        x,
        y: y + offsetY,
        index,
        textParticle,
        hyperlinkParticle
      })
    } else if (this.scriptRowRenderer.canRender(element)) {
      this.scriptRowRenderer.render({
        ctx,
        element,
        x,
        y: y + offsetY,
        textParticle,
        underline,
        superscriptParticle,
        subscriptParticle
      })
    } else if (this.separatorRowRenderer.canRender(element)) {
      this.separatorRowRenderer.render(
        ctx,
        element,
        x,
        y,
        zone,
        separatorParticle,
        pageNo
      )
    } else if (this.pageBreakRowRenderer.canRender(element)) {
      this.pageBreakRowRenderer.render(
        ctx,
        element,
        x,
        y,
        mode,
        isPrintMode,
        pageBreakParticle
      )
    } else if (this.checkableControlRenderer.isCheckable(element)) {
      textParticle.complete()
      this.checkableControlRenderer.render({
        ctx,
        element,
        x,
        y: y + offsetY,
        index,
        row: curRow,
        checkboxParticle,
        radioParticle
      })
    } else if (this.blockRowRenderer.canRender(element)) {
      this.blockRowRenderer.render({
        ctx,
        pageNo,
        element,
        x,
        y: y + offsetY,
        isExport,
        textParticle,
        blockParticle
      })
    } else if (this.chartGraphicRowRenderer.canRender(element)) {
      textParticle.complete()
      this.chartGraphicRowRenderer.render(ctx, element, x, y + offsetY)
    } else {
      this.paragraphTextRunRenderer.render({
        ctx,
        element,
        rowPosition,
        x,
        y: y + offsetY,
        mode,
        isPrintMode,
        options,
        textParticle
      })
    }

    this.lineBreakMarkerRenderer.render({
      ctx,
      curRow,
      element,
      x,
      y,
      index,
      isDrawLineBreak,
      isPrintMode,
      mode,
      lineBreakParticle
    })

    this.rowControlBorderRenderer.render({
      ctx,
      element,
      preElement,
      x,
      y,
      rowHeight: curRow.height,
      control,
      getElementRowMargin
    })
    this.rowTextDecorationRenderer.render({
      ctx,
      element,
      preElement,
      x,
      y,
      offsetY,
      rowHeight: curRow.height,
      options,
      textParticle,
      underline,
      strikeout,
      subscriptParticle,
      superscriptParticle,
      getElementSize,
      getElementFont,
      getElementRowMargin
    })

    this.rowGroupRenderer.record({
      element,
      x,
      y,
      width: metrics.width,
      rowHeight: curRow.height,
      options
    })

    return nextTableRangeElement
  }

  public renderSelection(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    this.rowSelectionRenderer.render(ctx, payload)
  }

  /**
   * 绘制单行内容，并在需要时叠加选区高亮。
   */
  public drawRow(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    // 正文绘制主入口：
    // 先清理行区域，再画 highlight / selection，随后遍历正文元素，最后补 table range queue。
    const selectionCtx = payload.selectionCtx || ctx
    const tableCellClipState = this.tableRenderHelper.applyCellClip(
      ctx,
      selectionCtx,
      payload
    )
    const rangeManager = this.draw.getRange()
    const textParticle = this.draw.getTextParticle()
    const control = this.draw.getControl()
    const components = this.draw.getComponents()
    const underline = components.underline
    const strikeout = components.strikeout
    const tableParticle = this.draw.getTableParticle()
    const listParticle = this.draw.getListParticle()
    const lineBreakParticle = components.lineBreakParticle
    const imageParticle = this.draw.getImageParticle()
    const laTexParticle = components.laTexParticle
    const hyperlinkParticle = this.draw.getHyperlinkParticle()
    const superscriptParticle = components.superscriptParticle
    const subscriptParticle = components.subscriptParticle
    const separatorParticle = components.separatorParticle
    const pageBreakParticle = components.pageBreakParticle
    const checkboxParticle = this.draw.getCheckboxParticle()
    const radioParticle = this.draw.getRadioParticle()
    const blockParticle = this.draw.getBlockParticle()
    const options = this.draw.getOptions()
    const mode = this.draw.getMode()
    const isDesignMode = this.draw.isDesignMode()
    const getElementSize =
      this.draw.getServices().metricsService.getElementSize.bind(
        this.draw.getServices().metricsService
      )
    const getElementFont = this.draw.getElementFont.bind(this.draw)
    const getElementRowMargin =
      this.draw.getServices().metricsService.getElementRowMargin.bind(
        this.draw.getServices().metricsService
      )
    const { lineBreak } = options
    const {
      rowList,
      pageNo,
      positionList,
      isDrawLineBreak = !lineBreak.disabled
    } = payload
    const isPrintMode = mode === EditorMode.PRINT
    const { isCrossRowCol: rawIsCrossRowCol, tableId } =
      rangeManager.getEditBoundaryRange()
    const isCrossRowCol = !!rawIsCrossRowCol
    const tableRangePaintQueue: Array<{
      /** 表格范围元素，用于描述表格选区覆盖的文档元素。 */
      tableRangeElement: IElement | ITableFragmentDescriptor
      /** 横坐标，用于定位画布或页面内的位置。 */
      x: number
      /** 纵坐标，用于定位画布或页面内的位置。 */
      y: number
    }> = []
    const mainContentStartX = this.draw.getMargins(pageNo)[3]

    const shouldClearFullRowWidthInSlice = rowList.some(row => {
      return row.elementList.some(element => {
        return this.formulaTextRowRenderer.canRender(element)
      })
    })

    this.forEachRowPositionSlice(payload, (curRow, rowPositionList) => {
      this.clearRowRenderArea(
        ctx,
        rowPositionList,
        curRow.height,
        !!payload.tableCellContext && rowPositionList[0]?.rowNo === 0,
        shouldClearFullRowWidthInSlice,
        innerWidth,
        payload.tableCellContext ? undefined : mainContentStartX
      )
    })
    this.rowHighlightRenderer.render(ctx, payload)
    this.renderSelection(selectionCtx, payload)

    let rowPositionOffset = 0
    for (let i = 0; i < rowList.length; i++) {
      const curRow = rowList[i]
      const rowPositionList = positionList.slice(
        rowPositionOffset,
        rowPositionOffset + curRow.elementList.length
      )
      rowPositionOffset += curRow.elementList.length
      const rowStartPosition = rowPositionList[0]
      let tableRangeElement: IElement | ITableFragmentDescriptor | null = null

      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const rowPosition = rowPositionList[j]
        if (!rowPosition) {
          continue
        }
        const preElement = curRow.elementList[j - 1]
        tableRangeElement = this.renderRowElement({
          ctx,
          curRow,
          element,
          preElement,
          rowPosition,
          index: j,
          pageNo,
          isDrawLineBreak,
          isPrintMode,
          isDesignMode,
          isExport: payload.isExport,
          mode,
          options,
          textParticle,
          control,
          underline,
          strikeout,
          tableParticle,
          lineBreakParticle,
          imageParticle,
          laTexParticle,
          hyperlinkParticle,
          superscriptParticle,
          subscriptParticle,
          separatorParticle,
          pageBreakParticle,
          checkboxParticle,
          radioParticle,
          blockParticle,
          getElementSize,
          getElementFont,
          getElementRowMargin,
          currentTableRangeElement: tableRangeElement,
          isCrossRowCol,
          zone: payload.zone
        })
      }

      this.listRowMarkerRenderer.render(
        ctx,
        curRow,
        rowStartPosition,
        listParticle
      )
      renderRowDragHandle({
        ctx,
        draw: this.draw,
        row: curRow,
        rowPositionList,
        zone: payload.zone,
        tableCellContext: payload.tableCellContext
      })

      textParticle.complete()
      this.rowControlBorderRenderer.flush(ctx, control)
      this.rowTextDecorationRenderer.flush(ctx, underline, strikeout)
      this.rowGroupRenderer.flush(ctx)
      this.tableRenderHelper.drawFragmentCellTopBorder(
        ctx,
        payload,
        rowPositionList
      )
      this.tableRenderHelper.enqueueRangePaint({
        tableRangePaintQueue,
        tableRangeElement,
        rowPositionList,
        isPrintMode,
        isCrossRowCol,
        tableId
      })
    }

    this.tableRenderHelper.forEachCellPayload(payload, tableCellPayload => {
      this.drawRow(ctx, {
        ...tableCellPayload,
        isExport: payload.isExport,
        selectionCtx
      })
    })

    if (!isPrintMode) {
      for (let i = 0; i < tableRangePaintQueue.length; i++) {
        const paintPayload = tableRangePaintQueue[i]
        tableParticle.drawRange(
          selectionCtx,
          paintPayload.tableRangeElement as unknown as IElement,
          paintPayload.x,
          paintPayload.y
        )
      }
    }
    this.tableRenderHelper.restoreCellClip(ctx, selectionCtx, tableCellClipState)
  }
}
