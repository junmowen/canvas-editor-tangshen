import { TableBorder, TdBorder, TdSlash } from '../../../dataset/enum/table/Table'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { ITableFragmentDescriptor } from '../../../interface/table/TableFragment'
import { ITd } from '../../../interface/table/Td'
import { getTableCellContentInset } from '../../../core/modules/table/layout/TableCellContentInset'
import { createPrintSvgPageContent } from './inline'
import {
  resolvePrintSvgTableFragmentRenderKey,
  resolvePrintSvgTableId,
  shouldPrintSvgFragmentTopBorder
} from './PrintSvgTableRenderAdapter'
import {
  createPrintSvgRect,
  createPrintSvgStrokePath,
  IPrintSvgStrokeSegment
} from './shape'
function createPrintSvgTableBackground(
  table: ITableFragmentDescriptor | IElement,
  startX: number,
  startY: number,
  scale: number
) {
  const contentList: string[] = []
  table.trList?.forEach(tr => {
    tr.tdList.forEach(td => {
      if (!td.backgroundColor) return
      contentList.push(
        createPrintSvgRect({
          x: Math.round((td.x || 0) * scale + startX),
          y: Math.round((td.y || 0) * scale + startY),
          width: (td.width || 0) * scale,
          height: (td.height || 0) * scale,
          fill: td.backgroundColor
        })
      )
    })
  })
  return contentList.join('')
}

/** 输出表格单元格斜线。 */
function createPrintSvgTableSlashBorder(payload: {
  /** 单元格数据。 */
  td: ITd
  /** 表格横向起点。 */
  startX: number
  /** 表格纵向起点。 */
  startY: number
  /** 线条颜色。 */
  borderColor: string
  /** 线条宽度。 */
  borderWidth: number
  /** 缩放比例。 */
  scale: number
  /** 虚线配置。 */
  lineDash?: number[]
}) {
  const { td, startX, startY, borderColor, borderWidth, scale, lineDash } =
    payload
  if (!td.slashTypes?.length) return ''
  const width = (td.width || 0) * scale
  const height = (td.height || 0) * scale
  const x = Math.round((td.x || 0) * scale + startX)
  const y = Math.round((td.y || 0) * scale + startY)
  const segmentList: IPrintSvgStrokeSegment[] = []
  if (td.slashTypes.includes(TdSlash.FORWARD)) {
    segmentList.push({ from: [x + width, y], to: [x, y + height] })
  }
  if (td.slashTypes.includes(TdSlash.BACK)) {
    segmentList.push({ from: [x, y], to: [x + width, y + height] })
  }
  return createPrintSvgStrokePath({
    segmentList,
    stroke: borderColor,
    lineWidth: borderWidth,
    lineDash
  })
}

/** 输出单元格显式边框，覆盖表格默认边框。 */
function createPrintSvgExplicitTdBorder(payload: {
  /** 单元格数据。 */
  td: ITd
  /** 表格数据。 */
  table: ITableFragmentDescriptor | IElement
  /** 表格横向起点。 */
  startX: number
  /** 表格纵向起点。 */
  startY: number
  /** 默认边框颜色。 */
  defaultBorderColor: string
  /** 缩放比例。 */
  scale: number
}) {
  const { td, table, startX, startY, defaultBorderColor, scale } = payload
  if (!td.borderTypes?.length) return ''
  const width = (td.width || 0) * scale
  const height = (td.height || 0) * scale
  const x = Math.round((td.x || 0) * scale + startX + width)
  const y = Math.round((td.y || 0) * scale + startY)
  const segmentList: IPrintSvgStrokeSegment[] = []
  if (td.borderTypes.includes(TdBorder.TOP)) {
    segmentList.push({ from: [x - width, y], to: [x, y] })
  }
  if (td.borderTypes.includes(TdBorder.RIGHT)) {
    segmentList.push({ from: [x, y], to: [x, y + height] })
  }
  if (td.borderTypes.includes(TdBorder.BOTTOM)) {
    segmentList.push({ from: [x, y + height], to: [x - width, y + height] })
  }
  if (td.borderTypes.includes(TdBorder.LEFT)) {
    segmentList.push({ from: [x - width, y], to: [x - width, y + height] })
  }
  return createPrintSvgStrokePath({
    segmentList,
    stroke: td.borderColor || table.borderColor || defaultBorderColor,
    lineWidth: (td.borderWidth || table.borderWidth || 1) * scale
  })
}

/** 输出表格默认边框，按现有渲染规则支持外框、内框和虚线。 */
function createPrintSvgTableBorder(payload: {
  /** 表格片段或原始表格。 */
  table: ITableFragmentDescriptor | IElement
  /** 表格横向起点。 */
  startX: number
  /** 表格纵向起点。 */
  startY: number
  /** 编辑器配置。 */
  options?: DeepRequired<IEditorOption>
}) {
  const { table, startX, startY, options } = payload
  const { colgroup, trList } = table
  if (!colgroup || !trList) return ''
  const scale = options?.scale || 1
  const defaultBorderColor = options?.table.defaultBorderColor || '#000000'
  const borderType = table.borderType || TableBorder.ALL
  const rawBorderWidth = table.borderWidth || 1
  const borderWidth = rawBorderWidth * scale
  const borderColor = table.borderColor || defaultBorderColor
  const tableWidth = (table.width || 0) * scale
  const tableHeight = (table.height || 0) * scale
  const isEmptyBorderType = borderType === TableBorder.EMPTY
  const isExternalBorderType = borderType === TableBorder.EXTERNAL
  const isInternalBorderType = borderType === TableBorder.INTERNAL
  const lineDash = borderType === TableBorder.DASH ? [3, 3] : undefined
  const rawExternalBorderWidth = table.borderExternalWidth
  const hasCustomExternalBorder =
    Boolean(rawExternalBorderWidth) && rawExternalBorderWidth !== rawBorderWidth
  const contentList: string[] = []
  if (!isEmptyBorderType && !isInternalBorderType) {
    const externalLineWidth = rawExternalBorderWidth
      ? rawExternalBorderWidth * scale
      : borderWidth
    const segmentList: IPrintSvgStrokeSegment[] = isExternalBorderType
      ? [
          { from: [Math.round(startX), Math.round(startY)], to: [Math.round(startX + tableWidth), Math.round(startY)] },
          { from: [Math.round(startX + tableWidth), Math.round(startY)], to: [Math.round(startX + tableWidth), Math.round(startY + tableHeight)] },
          { from: [Math.round(startX + tableWidth), Math.round(startY + tableHeight)], to: [Math.round(startX), Math.round(startY + tableHeight)] },
          { from: [Math.round(startX), Math.round(startY + tableHeight)], to: [Math.round(startX), Math.round(startY)] }
        ]
      : [
          { from: [Math.round(startX), Math.round(startY + tableHeight)], to: [Math.round(startX), Math.round(startY)] },
          { from: [Math.round(startX), Math.round(startY)], to: [Math.round(startX + tableWidth), Math.round(startY)] }
        ]
    contentList.push(
      createPrintSvgStrokePath({
        segmentList,
        stroke: borderColor,
        lineWidth: externalLineWidth,
        lineDash
      })
    )
  }
  trList.forEach((tr, trIndex) => {
    tr.tdList.forEach(td => {
      contentList.push(
        createPrintSvgTableSlashBorder({
          td,
          startX,
          startY,
          borderColor,
          borderWidth,
          scale,
          lineDash
        })
      )
      if (!td.borderTypes?.length && (isEmptyBorderType || isExternalBorderType)) {
        return
      }
      const width = (td.width || 0) * scale
      const height = (td.height || 0) * scale
      const x = Math.round((td.x || 0) * scale + startX + width)
      const y = Math.round((td.y || 0) * scale + startY)
      const segmentList: IPrintSvgStrokeSegment[] = []
      const externalSegmentList: IPrintSvgStrokeSegment[] = []
      if (
        shouldPrintSvgFragmentTopBorder({
          table,
          td,
          trIndex,
          isEmptyBorderType,
          isInternalBorderType
        })
      ) {
        segmentList.push({ from: [x - width, y], to: [x, y] })
      }
      if (!isEmptyBorderType && !isExternalBorderType) {
        if (!isInternalBorderType || (td.colIndex || 0) + td.colspan < colgroup.length) {
          const segment: IPrintSvgStrokeSegment = {
            from: [x, y],
            to: [x, y + height]
          }
          if (hasCustomExternalBorder && (td.colIndex || 0) + td.colspan === colgroup.length) {
            externalSegmentList.push(segment)
          } else {
            segmentList.push(segment)
          }
        }
        if (!isInternalBorderType || (td.rowIndex || 0) + td.rowspan < trList.length) {
          const segment: IPrintSvgStrokeSegment = {
            from: [x, y + height],
            to: [x - width, y + height]
          }
          if (hasCustomExternalBorder && (td.rowIndex || 0) + td.rowspan === trList.length) {
            externalSegmentList.push(segment)
          } else {
            segmentList.push(segment)
          }
        }
      }
      contentList.push(
        createPrintSvgStrokePath({
          segmentList,
          stroke: borderColor,
          lineWidth: borderWidth,
          lineDash
        })
      )
      contentList.push(
        createPrintSvgStrokePath({
          segmentList: externalSegmentList,
          stroke: borderColor,
          lineWidth: (rawExternalBorderWidth || rawBorderWidth) * scale,
          lineDash
        })
      )
    })
  })
  trList.forEach(tr => {
    tr.tdList.forEach(td => {
      contentList.push(
        createPrintSvgExplicitTdBorder({
          td,
          table,
          startX,
          startY,
          defaultBorderColor,
          scale
        })
      )
    })
  })
  return contentList.join('')
}

function createPrintSvgTableCellClipId(payload: {
  table: ITableFragmentDescriptor | IElement
  trIndex: number
  tdIndex: number
  startX: number
  startY: number
}) {
  const tableId = resolvePrintSvgTableId(payload.table)
  const rawId = [
    'ce-table-cell-clip',
    tableId || 'table',
    payload.trIndex,
    payload.tdIndex,
    Math.round(payload.startX),
    Math.round(payload.startY)
  ].join('-')
  return rawId.replace(/[^a-zA-Z0-9_-]/g, '-')
}

/** 解析 SVG 打印中单元格正文裁剪区域，对齐 Canvas/worker 的内容区裁剪。 */
function resolvePrintSvgTableCellClipRect(payload: {
  /** 表格片段或原始表格。 */
  table: ITableFragmentDescriptor | IElement
  /** 单元格数据。 */
  td: ITd
  /** 表格横向起点。 */
  startX: number
  /** 表格纵向起点。 */
  startY: number
  /** 编辑器配置。 */
  options?: DeepRequired<IEditorOption>
}) {
  const { table, td, startX, startY, options } = payload
  const scale = options?.scale || 1
  const tdPadding = options?.table.tdPadding || [0, 0, 0, 0]
  const contentInset = getTableCellContentInset(table, td)
  const left = (tdPadding[3] + contentInset.left) * scale
  const right = (tdPadding[1] + contentInset.right) * scale
  const top = (tdPadding[0] + contentInset.top) * scale
  const bottom = (tdPadding[2] + contentInset.bottom) * scale
  const x = (td.x || 0) * scale + startX
  const y = (td.y || 0) * scale + startY
  const width = (td.width || 0) * scale
  const height = (td.height || 0) * scale
  return {
    x: x + left,
    y: y + top,
    width: Math.max(0, width - left - right),
    height: Math.max(0, height - top - bottom)
  }
}

/** 输出表格单元格内部内容，复用单元格自己的 positionList。 */
function createPrintSvgTableCellContent(
  table: ITableFragmentDescriptor | IElement,
  startX: number,
  startY: number,
  options?: DeepRequired<IEditorOption>
) {
  const contentList: string[] = []
  table.trList?.forEach((tr, trIndex) => {
    tr.tdList.forEach((td, tdIndex) => {
      if (td.positionList?.length) {
        const clipId = createPrintSvgTableCellClipId({
          table,
          trIndex,
          tdIndex,
          startX,
          startY
        })
        const clipRect = resolvePrintSvgTableCellClipRect({
          table,
          td,
          startX,
          startY,
          options
        })
        const cellContent = createPrintSvgPageContent(td.positionList, options)
        contentList.push(
          `<defs><clipPath id="${clipId}"><rect x="${clipRect.x}" y="${clipRect.y}" width="${clipRect.width}" height="${clipRect.height}"/></clipPath></defs><g clip-path="url(#${clipId})">${cellContent}</g>`
        )
      }
    })
  })
  return contentList.join('')
}

/** 从当前页行和位置列表中解析表格片段，输出表格背景、内容和边框。 */
export function createPrintSvgTableContent(payload: {
  /** 当前页行列表。 */
  pageRows?: IRow[]
  /** 当前页正文位置列表。 */
  pagePositionList: IElementPosition[]
  /** 编辑器配置。 */
  options?: DeepRequired<IEditorOption>
}) {
  const { pageRows, pagePositionList, options } = payload
  if (!pageRows?.length) return ''
  const scale = options?.scale || 1
  const contentList: string[] = []
  const renderedTableSet = new Set<string>()
  let rowPositionOffset = 0
  pageRows.forEach(row => {
    const rowPositionList = pagePositionList.slice(
      rowPositionOffset,
      rowPositionOffset + row.elementList.length
    )
    rowPositionOffset += row.elementList.length
    const table = row.tableFragment
    const rowPosition = rowPositionList[0]
    if (!table || !rowPosition) return
    const tableKey = resolvePrintSvgTableFragmentRenderKey(table, rowPosition)
    if (renderedTableSet.has(tableKey)) return
    renderedTableSet.add(tableKey)
    const [startX, startY] = rowPosition.coordinate.leftTop
    contentList.push(createPrintSvgTableBackground(table, startX, startY, scale))
    contentList.push(createPrintSvgTableCellContent(table, startX, startY, options))
    contentList.push(createPrintSvgTableBorder({ table, startX, startY, options }))
  })
  return contentList.join('')
}
