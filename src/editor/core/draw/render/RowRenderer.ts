import { ZERO } from '../../../dataset/constant/Common'
import { TEXTLIKE_ELEMENT_TYPE } from '../../../dataset/constant/Element'
import { PUNCTUATION_REG } from '../../../dataset/constant/Regular'
import { BlockType } from '../../../dataset/enum/Block'
import { ControlComponent } from '../../../dataset/enum/Control'
import { EditorMode, EditorZone } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { RowFlex } from '../../../dataset/enum/Row'
import { ImageDisplay } from '../../../dataset/enum/Common'
import { IDrawRowPayload } from '../../../interface/Draw'
import { IElement } from '../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { renderRowDragHandle } from '../../event/pointer/row-drag/RowDragHandle'
import type { Draw } from '../Draw'
import { RowTableRenderHelper } from './RowTableRenderHelper'

/**
 * 行渲染器。
 *
 * 负责绘制单行文本、选区高亮以及相关位置信息。
 */
export class RowRenderer {
  private readonly tableRenderHelper: RowTableRenderHelper

  constructor(private readonly draw: Draw) {
    this.tableRenderHelper = new RowTableRenderHelper(draw)
  }

  private forEachRowPositionSlice(
    payload: IDrawRowPayload,
    callback: (
      curRow: IDrawRowPayload['rowList'][number],
      rowPositionList: IDrawRowPayload['positionList']
    ) => void
  ) {
    // 把“rowList + positionList”统一按行切片，避免 drawHighlight / drawSelection / drawRow
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
    preserveTopEdge = false
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
    ctx.clearRect(
      Math.max(0, Math.floor(minX)),
      clearTop,
      Math.max(1, Math.ceil(maxX - minX)),
      clearHeight
    )
  }

  /**
   * 根据选区范围绘制当前行的高亮背景。
   */
  private drawHighlight(
    ctx: CanvasRenderingContext2D,
    payload: IDrawRowPayload
  ) {
    const { elementList } = payload
    const draw = this.draw
    const marginHeight = draw.getDefaultBasicRowMarginHeight()
    const highlightMarginHeight = draw.getServices().metricsService.getHighlightMarginHeight()
    const highlight = draw.getHighlight()
    const control = draw.getControl()
    this.forEachRowPositionSlice(payload, (curRow, rowPositionList) => {
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const preElement = curRow.elementList[j - 1]
        const controlHighlightIndex = curRow.startIndex + j
        const sourceElement = payload.tableCellContext
          ? elementList[controlHighlightIndex]
          : draw.getOriginalMainElementList()[controlHighlightIndex]
        const preSourceElement = payload.tableCellContext
          ? elementList[controlHighlightIndex - 1]
          : draw.getOriginalMainElementList()[controlHighlightIndex - 1]
        const controlHighlight =
          elementList[controlHighlightIndex]
            ? control.getControlHighlight(elementList, controlHighlightIndex)
            : undefined
        const activeHighlight =
          element.highlight || sourceElement?.highlight || controlHighlight
        const preHighlight =
          preElement?.highlight || preSourceElement?.highlight
        if (activeHighlight) {
          if (
            preHighlight &&
            preHighlight !== activeHighlight
          ) {
            highlight.render(ctx)
          }
          const rowPosition = rowPositionList[j]
          if (!rowPosition) {
            continue
          }
          const {
            coordinate: {
              leftTop: [x, y],
              rightTop: [rightX],
              leftBottom: [, bottomY]
            }
          } = rowPosition
          const offsetX = element.left || 0
          const elementWidth = element.metrics?.width || rightX - x
          const rowHeight = curRow.height || bottomY - y
          highlight.recordFillInfo(
            ctx,
            x - offsetX,
            y + marginHeight - highlightMarginHeight,
            elementWidth + offsetX,
            rowHeight - 2 * marginHeight + 2 * highlightMarginHeight,
            activeHighlight
          )
        } else if (preHighlight) {
          highlight.render(ctx)
        }
      }
      highlight.render(ctx)
    })
  }

  private renderSelectionRange(
    ctx: CanvasRenderingContext2D,
    payload: IDrawRowPayload,
    effectiveRangeStartIndex: number,
    effectiveRangeEndIndex: number,
    rangeMinWidth: number
  ) {
    // 普通字符级选区矩形绘制统一收在这里，
    // drawSelection 主体只保留“选择哪条路径”的编排。
    const { elementList, startIndex } = payload
    const rangeManager = this.draw.getRange()
    let index = startIndex
    this.forEachRowPositionSlice(payload, (curRow, rowPositionList) => {
      for (let j = 0; j < curRow.elementList.length; j++) {
        const element = curRow.elementList[j]
        const metrics = element.metrics
        const rowPosition = rowPositionList[j]
        if (!rowPosition) {
          index++
          continue
        }
        const {
          coordinate: {
            leftTop: [x, y]
          }
        } = rowPosition
        if (effectiveRangeStartIndex <= index && index <= effectiveRangeEndIndex) {
          if (element.value !== ZERO) {
            let rangeWidth = metrics.width
            if (rangeWidth === 0 && curRow.elementList.length === 1) {
              rangeWidth = rangeMinWidth
            }
            rangeManager.render(ctx, x, y, rangeWidth, curRow.height)
          } else if (effectiveRangeStartIndex === index) {
            const nextElement = elementList[effectiveRangeStartIndex + 1]
            if (nextElement && nextElement.value === ZERO) {
              rangeManager.render(
                ctx,
                x + metrics.width,
                y,
                rangeMinWidth,
                curRow.height
              )
            }
          }
        }
        index++
      }
    })
  }

  private renderRowElement(payload: {
    ctx: CanvasRenderingContext2D
    curRow: IDrawRowPayload['rowList'][number]
    element: IDrawRowPayload['rowList'][number]['elementList'][number]
    preElement: IDrawRowPayload['rowList'][number]['elementList'][number] | undefined
    rowPosition: IDrawRowPayload['positionList'][number]
    index: number
    pageNo: number
    isDrawLineBreak: boolean
    isPrintMode: boolean
    isDesignMode: boolean
    isExport?: boolean
    mode: EditorMode
    options: ReturnType<Draw['getOptions']>
    textParticle: ReturnType<Draw['getTextParticle']>
    control: ReturnType<Draw['getControl']>
    underline: ReturnType<Draw['getUnderline']>
    strikeout: ReturnType<Draw['getStrikeout']>
    groupParticle: ReturnType<Draw['getGroup']>
    tableParticle: ReturnType<Draw['getTableParticle']>
    lineBreakParticle: ReturnType<Draw['getLineBreakParticle']>
    imageParticle: ReturnType<Draw['getImageParticle']>
    laTexParticle: ReturnType<Draw['getLaTexParticle']>
    hyperlinkParticle: ReturnType<Draw['getHyperlinkParticle']>
    superscriptParticle: ReturnType<Draw['getSuperscriptParticle']>
    subscriptParticle: ReturnType<Draw['getSubscriptParticle']>
    separatorParticle: ReturnType<Draw['getSeparatorParticle']>
    pageBreakParticle: ReturnType<Draw['getPageBreakParticle']>
    checkboxParticle: ReturnType<Draw['getCheckboxParticle']>
    radioParticle: ReturnType<Draw['getRadioParticle']>
    blockParticle: ReturnType<Draw['getBlockParticle']>
    getElementSize: (el: IElement) => number
    getElementFont: Draw['getElementFont']
    getElementRowMargin: (el: IElement) => number
    currentTableRangeElement: IElement | ITableFragmentDescriptor | null
    isCrossRowCol: boolean
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
      groupParticle,
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
      currentTableRangeElement,
      isCrossRowCol,
      zone
    } = payload
    const tableFragment =
      element.type === ElementType.TABLE ? curRow.tableFragment : undefined
    const metrics = element.metrics
    const {
      ascent: offsetY,
      coordinate: {
        leftTop: [x, y]
      }
    } = rowPosition
    let nextTableRangeElement = currentTableRangeElement

    if ((element.hide || element.control?.hide || element.area?.hide) && !isDesignMode) {
      textParticle.complete()
    } else if (element.type === ElementType.IMAGE) {
      textParticle.complete()
      if (
        element.imgDisplay !== ImageDisplay.SURROUND &&
        element.imgDisplay !== ImageDisplay.TIGHT &&
        element.imgDisplay !== ImageDisplay.FLOAT_TOP &&
        element.imgDisplay !== ImageDisplay.FLOAT_BOTTOM
      ) {
        imageParticle.render(ctx, element, x, y + offsetY, {
          isExport
        })
      }
    } else if (element.type === ElementType.LATEX) {
      textParticle.complete()
      laTexParticle.render(ctx, element, x, y + offsetY)
    } else if (element.type === ElementType.TABLE) {
      if (isCrossRowCol) {
        nextTableRangeElement = tableFragment || element
      }
      tableParticle.render(
        ctx,
        (tableFragment || element) as unknown as IElement,
        x,
        y
      )
    } else if (element.type === ElementType.HYPERLINK) {
      textParticle.complete()
      hyperlinkParticle.render(ctx, element, x, y + offsetY)
    } else if (element.type === ElementType.DATE) {
      const nextElement = curRow.elementList[index + 1]
      if (!preElement || preElement.dateId !== element.dateId) {
        textParticle.complete()
      }
      textParticle.record(ctx, element, x, y + offsetY)
      if (!nextElement || nextElement.dateId !== element.dateId) {
        textParticle.complete()
      }
    } else if (element.type === ElementType.SUPERSCRIPT) {
      textParticle.complete()
      superscriptParticle.render(ctx, element, x, y + offsetY)
    } else if (element.type === ElementType.SUBSCRIPT) {
      underline.render(ctx)
      textParticle.complete()
      subscriptParticle.render(ctx, element, x, y + offsetY)
    } else if (element.type === ElementType.SEPARATOR) {
      separatorParticle.render(ctx, element, x, y, zone)
    } else if (element.type === ElementType.PAGE_BREAK) {
      if (mode !== EditorMode.CLEAN && !isPrintMode) {
        pageBreakParticle.render(ctx, element, x, y)
      }
    } else if (
      element.type === ElementType.CHECKBOX ||
      element.controlComponent === ControlComponent.CHECKBOX
    ) {
      textParticle.complete()
      checkboxParticle.render({
        ctx,
        x,
        y: y + offsetY,
        index,
        row: curRow
      })
    } else if (
      element.type === ElementType.RADIO ||
      element.controlComponent === ControlComponent.RADIO
    ) {
      textParticle.complete()
      radioParticle.render({
        ctx,
        x,
        y: y + offsetY,
        index,
        row: curRow
      })
    } else if (element.type === ElementType.TAB) {
      textParticle.complete()
    } else if (
      element.rowFlex === RowFlex.ALIGNMENT ||
      element.rowFlex === RowFlex.JUSTIFY
    ) {
      textParticle.record(ctx, element, x, y + offsetY)
      textParticle.complete()
    } else if (element.type === ElementType.BLOCK) {
      textParticle.complete()
      if (isExport) {
        this.renderBlockExportFallback(ctx, element, x, y + offsetY)
      } else {
        blockParticle.render(pageNo, element, x, y + offsetY)
      }
    } else {
      if (element.left) {
        textParticle.complete()
      }
      textParticle.record(ctx, element, x, y + offsetY)
      if (element.width || element.letterSpacing || PUNCTUATION_REG.test(element.value)) {
        textParticle.complete()
      }
    }

    if (
      isDrawLineBreak &&
      !isPrintMode &&
      mode !== EditorMode.CLEAN &&
      !curRow.isWidthNotEnough &&
      index === curRow.elementList.length - 1
    ) {
      lineBreakParticle.render(ctx, element, x, y + curRow.height / 2)
    }

    if (element.control?.border) {
      if (
        preElement?.control?.border &&
        preElement.controlId !== element.controlId
      ) {
        control.drawBorder(ctx)
      }
      const rowMargin = getElementRowMargin(element)
      control.recordBorderInfo(
        x,
        y + rowMargin,
        element.metrics.width,
        curRow.height - 2 * rowMargin
      )
    } else if (preElement?.control?.border) {
      control.drawBorder(ctx)
    }

    if (element.underline || element.control?.underline) {
      if (
        preElement?.type === ElementType.SUBSCRIPT &&
        element.type !== ElementType.SUBSCRIPT
      ) {
        underline.render(ctx)
      }
      const rowMargin = getElementRowMargin(element)
      const offsetLineX = element.left || 0
      let offsetLineY = 0
      if (element.type === ElementType.SUBSCRIPT) {
        offsetLineY = subscriptParticle.getOffsetY(element)
      }
      const color = element.control?.underline
        ? options.underlineColor
        : element.color
      underline.recordFillInfo(
        ctx,
        x - offsetLineX,
        y + curRow.height - rowMargin + offsetLineY,
        metrics.width + offsetLineX,
        0,
        color,
        element.textDecoration?.style
      )
    } else if (preElement?.underline || preElement?.control?.underline) {
      underline.render(ctx)
    }

    if (element.strikeout) {
      if (!element.type || TEXTLIKE_ELEMENT_TYPE.includes(element.type)) {
        if (
          preElement &&
          ((preElement.type === ElementType.SUBSCRIPT &&
            element.type !== ElementType.SUBSCRIPT) ||
            (preElement.type === ElementType.SUPERSCRIPT &&
              element.type !== ElementType.SUPERSCRIPT) ||
            getElementSize(preElement) !== getElementSize(element))
        ) {
          strikeout.render(ctx)
        }
        const standardMetrics = textParticle.measureBasisWord(
          ctx,
          getElementFont(element)
        )
        let adjustY =
          y +
          offsetY +
          standardMetrics.actualBoundingBoxDescent * options.scale -
          metrics.height / 2
        if (element.type === ElementType.SUBSCRIPT) {
          adjustY += subscriptParticle.getOffsetY(element)
        } else if (element.type === ElementType.SUPERSCRIPT) {
          adjustY += superscriptParticle.getOffsetY(element)
        }
        strikeout.recordFillInfo(ctx, x, adjustY, metrics.width)
      }
    } else if (preElement?.strikeout) {
      strikeout.render(ctx)
    }

    if (!options.group.disabled && element.groupIds) {
      groupParticle.recordFillInfo(element, x, y, metrics.width, curRow.height)
    }

    return nextTableRangeElement
  }

  /**
   * 仅绘制选区矩形层。
   */
  public drawSelection(ctx: CanvasRenderingContext2D, payload: IDrawRowPayload) {
    // 选区绘制分成两条主路径：
    // 1. 跨行列选择按 cell bounds；
    // 2. 普通字符选择按字符盒范围。
    const rangeManager = this.draw.getRange()
    const rangeMinWidth = this.draw.getOptions().rangeMinWidth
    const position = this.draw.getPosition()
    const {
      elementList,
      zone,
      tableCellContext
    } = payload
    const {
      isCrossRowCol,
      zone: rangeZone,
      startIndex: rangeStartIndex,
      endIndex: rangeEndIndex
    } = rangeManager.getEditBoundaryRange()
    if (
      isCrossRowCol &&
      !this.tableRenderHelper.renderCrossRowColSelection(ctx, payload, rangeZone)
    ) {
      return
    }
    const skipCurrentLayerSelection = !!(
      !tableCellContext &&
      position.getPositionContext().isTable &&
      !isCrossRowCol
    )
    const renderSelectionRange =
      !skipCurrentLayerSelection &&
      !isCrossRowCol &&
      rangeStartIndex !== rangeEndIndex
        ? rangeManager.getRenderSelectionRange({
            elementList,
            tableCellContext
          })
        : null
    if (renderSelectionRange && rangeZone === zone) {
      const effectiveRangeStartIndex =
        renderSelectionRange.startIndex ?? rangeStartIndex
      const effectiveRangeEndIndex =
        renderSelectionRange.endIndex ?? rangeEndIndex
      this.renderSelectionRange(
        ctx,
        payload,
        effectiveRangeStartIndex,
        effectiveRangeEndIndex,
        rangeMinWidth
      )
    }

    this.tableRenderHelper.forEachCellPayload(payload, tableCellPayload => {
      this.drawSelection(ctx, {
        ...tableCellPayload,
        selectionCtx: ctx
      })
    })
  }

  /** 导出时不挂载 DOM/SVG block host，改为在图片中固化一个稳定占位框。 */
  private renderBlockExportFallback(
    ctx: CanvasRenderingContext2D,
    element: IDrawRowPayload['rowList'][number]['elementList'][number],
    x: number,
    y: number
  ) {
    const metrics = element.metrics
    const width = Math.max(1, metrics?.width || element.width || 1)
    const height = Math.max(1, metrics?.height || element.height || 1)
    const svgRasterImage = element.block?.svgBlock?.rasterImage
    if (element.block?.type === BlockType.SVG && svgRasterImage?.complete) {
      ctx.drawImage(svgRasterImage, x, y, width, height)
      return
    }
    const fallbackText = this.getBlockExportFallbackText(element)
    ctx.save()
    ctx.fillStyle = '#f7f7f7'
    ctx.strokeStyle = '#d0d0d0'
    ctx.lineWidth = 1
    ctx.fillRect(x, y, width, height)
    ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1))
    ctx.fillStyle = '#666666'
    ctx.font = '12px sans-serif'
    ctx.textBaseline = 'middle'
    ctx.fillText(fallbackText, x + 8, y + height / 2)
    ctx.restore()
  }

  /** 获取外部 block 导出时的稳定 Canvas2D 文本摘要。 */
  private getBlockExportFallbackText(
    element: IDrawRowPayload['rowList'][number]['elementList'][number]
  ): string {
    if (element.block?.type === BlockType.HTML) {
      const text = element.block.htmlBlock?.text || this.extractTextFromHtml(
        element.block.htmlBlock?.html || ''
      )
      return text ? text.slice(0, 80) : 'HTML block'
    }
    return 'Embedded block'
  }

  /** 从 HTML 片段中提取可导出的纯文本摘要，不依赖运行时 DOM host。 */
  private extractTextFromHtml(html: string): string {
    if (!html) return ''
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
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
    const underline = this.draw.getUnderline()
    const strikeout = this.draw.getStrikeout()
    const groupParticle = this.draw.getGroup()
    const tableParticle = this.draw.getTableParticle()
    const listParticle = this.draw.getListParticle()
    const lineBreakParticle = this.draw.getLineBreakParticle()
    const imageParticle = this.draw.getImageParticle()
    const laTexParticle = this.draw.getLaTexParticle()
    const hyperlinkParticle = this.draw.getHyperlinkParticle()
    const superscriptParticle = this.draw.getSuperscriptParticle()
    const subscriptParticle = this.draw.getSubscriptParticle()
    const separatorParticle = this.draw.getSeparatorParticle()
    const pageBreakParticle = this.draw.getPageBreakParticle()
    const checkboxParticle = this.draw.getCheckboxParticle()
    const radioParticle = this.draw.getRadioParticle()
    const blockParticle = this.draw.getBlockParticle()
    const options = this.draw.getOptions()
    const mode = this.draw.getMode()
    const isDesignMode = this.draw.isDesignMode()
    const snapshotAccessor = this.draw.getTableLayoutSnapshotAccessor()
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
      tableRangeElement: IElement | ITableFragmentDescriptor
      x: number
      y: number
    }> = []

    this.forEachRowPositionSlice(payload, (curRow, rowPositionList) => {
      this.clearRowRenderArea(
        ctx,
        rowPositionList,
        curRow.height,
        !!payload.tableCellContext && rowPositionList[0]?.rowNo === 0
      )
    })
    this.drawHighlight(ctx, payload)
    this.drawSelection(selectionCtx, payload)

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
          groupParticle,
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

      if (curRow.isList) {
        if (rowStartPosition) {
          listParticle.drawListStyle(ctx, curRow, rowStartPosition)
        }
      }
      renderRowDragHandle({
        ctx,
        draw: this.draw,
        row: curRow,
        rowPositionList,
        zone: payload.zone,
        tableCellContext: payload.tableCellContext
      })

      textParticle.complete()
      control.drawBorder(ctx)
      underline.render(ctx)
      strikeout.render(ctx)
      groupParticle.render(ctx)
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
        tableId,
        snapshotAccessor
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
