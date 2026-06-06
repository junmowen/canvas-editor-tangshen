import { VerticalAlign } from '../../../dataset/enum/VerticalAlign'
import { IElement } from '../../../interface/Element'
import { ITd } from '../../../interface/table/Td'
import { ITr } from '../../../interface/table/Tr'
import { convertPxToTwip, normalizeOoxmlHexColor } from './OoxmlUnit'
import {
  createOoxmlTableCellBorders,
  createOoxmlTableProperties,
  TOoxmlTableExportOptions
} from './OoxmlTableBorder'

/** 表格单元格正文生成器，由主 package 注入以复用段落、控件和公式导出逻辑。 */
export type TOoxmlTableCellBodyFactory = (td: ITd) => string

/** 表格单元格导出选项，用于补齐 OOXML 纵向合并 continuation 单元格。 */
interface IOoxmlTableCellExportOption {
  /** 当前单元格是否为纵向合并的延续单元格。 */
  isVerticalMergeContinuation?: boolean
}

/** 跨行合并跟踪信息，记录后续行需要补出的 continuation 单元格。 */
interface IOoxmlVerticalMergeState {
  /** 还需要继续写入 continuation 的剩余行数。 */
  remainingRows: number
  /** 当前纵向合并覆盖的列数，用于跨列+跨行组合。 */
  colspan: number
}

/** 生成表格网格列定义，优先使用内部 colgroup 宽度。 */
function createOoxmlTableGrid(element: IElement) {
  const colgroup = element.colgroup || []
  if (!colgroup.length) return ''
  const gridColumns = colgroup
    .map(col => `<w:gridCol w:w="${convertPxToTwip(col.width)}"/>`)
    .join('')
  return `<w:tblGrid>${gridColumns}</w:tblGrid>`
}

/** 判断表格行是否应作为跨页重复表头导出。 */
function isOoxmlTableHeaderRow(tr: ITr) {
  const extension = tr.extension as { trType?: string } | undefined
  return Boolean(
    tr.repeatOnPageStart ||
      tr.pagingRepeat ||
      extension?.trType === 'title' ||
      extension?.trType === 'header'
  )
}

/** 生成表格行属性，行高按最小高度写入，并显式允许跨页拆行。 */
function createOoxmlTableRowProperties(tr: ITr) {
  const properties: string[] = ['<w:cantSplit w:val="0"/>']
  if (isOoxmlTableHeaderRow(tr)) {
    // 表头行需要显式写 tblHeader，WPS/Word 跨页时才会稳定重复表头和表头样式。
    properties.push('<w:tblHeader/>')
  }
  const minHeight = tr.minHeight || tr.height
  if (minHeight) {
    // 导出最小行高而不是内容撑开的运行时行高，避免跨页长单元格被 WPS/Word 当成整行最小高度。
    properties.push(
      `<w:trHeight w:val="${convertPxToTwip(minHeight)}" w:hRule="atLeast"/>`
    )
  }
  return `<w:trPr>${properties.join('')}</w:trPr>`
}

/** 获取单元格宽度，优先使用单元格自身宽度，否则按 colgroup 和 colspan 汇总。 */
function getOoxmlTableCellWidth(element: IElement, td: ITd) {
  if (td.width) return td.width
  const colgroup = element.colgroup || []
  const startIndex = td.colIndex || 0
  const colspan = td.colspan || 1
  return colgroup
    .slice(startIndex, startIndex + colspan)
    .reduce((sum, col) => sum + col.width, 0)
}

/** 生成单元格背景色属性，使用 OOXML shd 节点承载填充色。 */
function createOoxmlTableCellShading(td: ITd) {
  if (!td.backgroundColor) return ''
  return `<w:shd w:val="clear" w:color="auto" w:fill="${normalizeOoxmlHexColor(td.backgroundColor)}"/>`
}

/** 生成单元格垂直对齐属性，内部 middle 映射到 OOXML center。 */
function createOoxmlTableCellVerticalAlign(td: ITd) {
  if (!td.verticalAlign) return ''
  const verticalAlignMap: Record<VerticalAlign, string> = {
    [VerticalAlign.TOP]: 'top',
    [VerticalAlign.MIDDLE]: 'center',
    [VerticalAlign.BOTTOM]: 'bottom'
  }
  return `<w:vAlign w:val="${verticalAlignMap[td.verticalAlign]}"/>`
}

/** 生成单元格文字方向属性，第一批先覆盖竖排文本。 */
function createOoxmlTableCellTextDirection(td: ITd) {
  if (td.textDirection !== 'vertical') return ''
  return '<w:textDirection w:val="tbRl"/>'
}

/** 生成表格单元格属性，覆盖宽度、合并、边框、背景、对齐和文字方向。 */
function createOoxmlTableCellProperties(
  element: IElement,
  td: ITd,
  option: IOoxmlTableCellExportOption = {}
) {
  const properties: string[] = []
  const width = getOoxmlTableCellWidth(element, td)
  if (width) {
    properties.push(`<w:tcW w:w="${convertPxToTwip(width)}" w:type="dxa"/>`)
  }
  if ((td.colspan || 1) > 1) {
    properties.push(`<w:gridSpan w:val="${td.colspan}"/>`)
  }
  if (option.isVerticalMergeContinuation) {
    properties.push('<w:vMerge/>')
  } else if ((td.rowspan || 1) > 1) {
    properties.push('<w:vMerge w:val="restart"/>')
  }
  const cellBorders = createOoxmlTableCellBorders(element, td)
  if (cellBorders) {
    properties.push(cellBorders)
  }
  const shading = createOoxmlTableCellShading(td)
  if (shading) {
    properties.push(shading)
  }
  const verticalAlign = createOoxmlTableCellVerticalAlign(td)
  if (verticalAlign) {
    properties.push(verticalAlign)
  }
  const textDirection = createOoxmlTableCellTextDirection(td)
  if (textDirection) {
    properties.push(textDirection)
  }
  return properties.length ? `<w:tcPr>${properties.join('')}</w:tcPr>` : ''
}

/** 生成表格单元格 XML。 */
function createOoxmlTableCell(
  element: IElement,
  td: ITd,
  createCellBody: TOoxmlTableCellBodyFactory,
  option: IOoxmlTableCellExportOption = {}
) {
  return `<w:tc>${createOoxmlTableCellProperties(element, td, option)}${createCellBody(td)}</w:tc>`
}

/** 获取表格列数，优先使用 colgroup，缺失时从单元格索引推导。 */
function getOoxmlTableColumnCount(element: IElement) {
  if (element.colgroup?.length) return element.colgroup.length
  return Math.max(
    0,
    ...(element.trList || []).flatMap(tr =>
      (tr.tdList || []).map(td => (td.colIndex || 0) + (td.colspan || 1))
    )
  )
}

/** 生成纵向合并 continuation 单元格，补齐 WordprocessingML 所需结构。 */
function createOoxmlVerticalMergeContinuationCell(
  element: IElement,
  colIndex: number,
  state: IOoxmlVerticalMergeState,
  createCellBody: TOoxmlTableCellBodyFactory
) {
  return createOoxmlTableCell(
    element,
    {
      colspan: state.colspan,
      rowspan: 1,
      colIndex,
      value: []
    },
    createCellBody,
    {
      isVerticalMergeContinuation: true
    }
  )
}

/** 生成表格行 XML，同时根据前序 rowspan 补出 continuation 单元格。 */
function createOoxmlTableRow(
  element: IElement,
  tr: ITr,
  verticalMergeStateMap: Map<number, IOoxmlVerticalMergeState>,
  createCellBody: TOoxmlTableCellBodyFactory,
  columnCount: number
) {
  const cellMap = new Map<number, ITd>()
  ;(tr.tdList || []).forEach(td => {
    cellMap.set(td.colIndex || 0, td)
  })
  const cellXmlList: string[] = []

  for (let colIndex = 0; colIndex < columnCount;) {
    const td = cellMap.get(colIndex)
    if (td) {
      cellXmlList.push(createOoxmlTableCell(element, td, createCellBody))
      const rowspan = td.rowspan || 1
      const colspan = td.colspan || 1
      // rowspan 大于 1 时记录后续行 continuation，避免只写 restart 导致 Word 表格结构不完整。
      if (rowspan > 1) {
        verticalMergeStateMap.set(colIndex, {
          remainingRows: rowspan - 1,
          colspan
        })
      }
      colIndex += colspan
      continue
    }

    const mergeState = verticalMergeStateMap.get(colIndex)
    if (mergeState) {
      cellXmlList.push(
        createOoxmlVerticalMergeContinuationCell(
          element,
          colIndex,
          mergeState,
          createCellBody
        )
      )
      mergeState.remainingRows -= 1
      if (mergeState.remainingRows <= 0) {
        verticalMergeStateMap.delete(colIndex)
      }
      colIndex += mergeState.colspan
      continue
    }

    colIndex += 1
  }

  const cellXml = cellXmlList.join('')
  return `<w:tr>${createOoxmlTableRowProperties(tr)}${cellXml}</w:tr>`
}

/** 生成表格 XML，覆盖基础网格、行、单元格、简单合并和第一批表格边框。 */
export function createOoxmlTableXml(
  element: IElement,
  createCellBody: TOoxmlTableCellBodyFactory,
  options?: TOoxmlTableExportOptions
) {
  const verticalMergeStateMap = new Map<number, IOoxmlVerticalMergeState>()
  const columnCount = getOoxmlTableColumnCount(element)
  const rows = (element.trList || [])
    .map(tr =>
      createOoxmlTableRow(
        element,
        tr,
        verticalMergeStateMap,
        createCellBody,
        columnCount
      )
    )
    .join('')
  return `<w:tbl>${createOoxmlTableProperties(element, options)}${createOoxmlTableGrid(element)}${rows}</w:tbl>`
}
