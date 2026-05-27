import { ElementType, IElement, TableBorder, VerticalAlign } from '../../../..'
import { ZERO } from '../../../../dataset/constant/Common'
import { TABLE_CONTEXT_ATTR } from '../../../../dataset/constant/Element'
import {
  TableDisplay,
  TdBorder,
  TdSlash
} from '../../../../dataset/enum/table/Table'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { IColgroup } from '../../../../interface/table/Colgroup'
import { ITd } from '../../../../interface/table/Td'
import { ITr } from '../../../../interface/table/Tr'
import { cloneProperty, getUUID } from '../../../../utils'
import {
  formatElementContext,
  formatElementList
} from '../../../../utils/element'
import { RangeManager } from '../../../range/RangeManager'
import { Draw } from '../../Draw'
import type { DrawCoordinateService } from '../../coordinate/DrawCoordinateService'
import { TableParticle } from './TableParticle'
import { TableTool } from './TableTool'

export interface IInsertTableOption {
  tableDisplay?: TableDisplay
}

export interface IAutoFitTableOption {
  tableId?: string
}

const ALL_TD_BORDERS = [
  TdBorder.TOP,
  TdBorder.RIGHT,
  TdBorder.BOTTOM,
  TdBorder.LEFT
]

/**
 * 表格结构操作器。
 * 负责插入、删除、合并、拆分以及边框等表格结构编辑操作。
 */
export class TableOperate {
  private draw: Draw
  private range: RangeManager
  private coordinate: DrawCoordinateService
  private tableTool: TableTool
  private tableParticle: TableParticle
  private options: DeepRequired<IEditorOption>

  constructor(
    draw: Draw,
    deps: {
      range: RangeManager
      tableTool: TableTool
      tableParticle: TableParticle
      options: DeepRequired<IEditorOption>
    }
  ) {
    this.draw = draw
    this.range = deps.range
    this.coordinate = draw.getCoordinate()
    this.tableTool = deps.tableTool
    this.tableParticle = deps.tableParticle
    this.options = deps.options
  }
  private resolveContextTable(tableId?: string) {
    return this.draw.getTargetResolver().resolveContextTable({
      tableId,
      range: this.range.getEditBoundaryRange(),
      normalize: true
    })
  }

  private clearTableBorderStyle(element: IElement) {
    const trList = element.trList
    if (!trList?.length) return
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (td.borderTypes !== undefined) {
          delete td.borderTypes
        }
        if (td.borderColor !== undefined) {
          delete td.borderColor
        }
        if (td.borderWidth !== undefined) {
          delete td.borderWidth
        }
      }
    }
  }

  private renderTableVisualStyleChange(curIndex: number) {
    this.draw.render({
      curIndex,
      isLazy: false,
      pageRenderScope: 'visible'
    })
  }

  private measureCellContentWidth(value: IElement[]): number {
    if (!value.length) return 0
    const rowList = this.draw.computeRowList({
      innerWidth: 999999,
      elementList: value,
      isFromTable: true
    })
    const scale = this.options.scale
    return Math.max(
      0,
      rowList.reduce((max, row) => Math.max(max, row.width), 0) / scale
    )
  }

  private fitColgroupWidths(widthList: number[]): number[] {
    const { defaultColMinWidth } = this.options.table
    const availableWidth = this.draw.getOriginalInnerWidth()
    const nextWidthList = widthList.map(width =>
      Math.max(defaultColMinWidth, width)
    )
    const getTotalWidth = () =>
      nextWidthList.reduce((total, width) => total + width, 0)
    if (getTotalWidth() <= availableWidth) {
      return nextWidthList
    }
    let remaining = getTotalWidth() - availableWidth
    let shrinkableIndexList = nextWidthList
      .map((width, index) => ({ width, index }))
      .filter(item => item.width > defaultColMinWidth)
    while (remaining > 0 && shrinkableIndexList.length) {
      const shrinkWidth = remaining / shrinkableIndexList.length
      let reducedWidth = 0
      const nextShrinkableIndexList: { width: number; index: number }[] = []
      for (const item of shrinkableIndexList) {
        const currentWidth = nextWidthList[item.index]
        const canReduceWidth = currentWidth - defaultColMinWidth
        if (canReduceWidth <= 0) continue
        const reduced = Math.min(canReduceWidth, shrinkWidth)
        nextWidthList[item.index] = currentWidth - reduced
        reducedWidth += reduced
        if (nextWidthList[item.index] > defaultColMinWidth + 0.01) {
          nextShrinkableIndexList.push({
            width: nextWidthList[item.index],
            index: item.index
          })
        }
      }
      if (reducedWidth <= 0) {
        break
      }
      remaining -= reducedWidth
      shrinkableIndexList = nextShrinkableIndexList
    }
    return nextWidthList
  }

  private expandColgroupWidths(widthList: number[]): number[] {
    const availableWidth = this.draw.getOriginalInnerWidth()
    const nextWidthList = this.fitColgroupWidths(widthList)
    const totalWidth = nextWidthList.reduce((total, width) => total + width, 0)
    const remainingWidth = availableWidth - totalWidth
    if (remainingWidth <= 0 || !nextWidthList.length) {
      return nextWidthList
    }
    const contentTotalWidth = widthList.reduce((total, width) => total + width, 0)
    if (contentTotalWidth <= 0) {
      const extraWidth = remainingWidth / nextWidthList.length
      return nextWidthList.map(width => width + extraWidth)
    }
    return nextWidthList.map((width, index) => {
      return width + remainingWidth * (widthList[index] / contentTotalWidth)
    })
  }

  private computeAutoFitColgroup(element: IElement): IColgroup[] {
    const { colgroup, trList } = element
    if (!colgroup?.length || !trList?.length) return []
    const nextWidthList = colgroup.map(() => 0)
    this.draw.getTableParticle().computeRowColInfo(element)
    for (let t = 0; t < trList.length; t++) {
      const tr = trList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const colIndex = td.colIndex ?? d
        const colspan = td.colspan || 1
        const contentWidth =
          this.measureCellContentWidth(td.value) +
          this.options.table.tdPadding[1] +
          this.options.table.tdPadding[3]
        const widthPerCol = contentWidth / colspan
        for (let c = 0; c < colspan; c++) {
          const nextIndex = colIndex + c
          if (nextIndex >= nextWidthList.length) continue
          nextWidthList[nextIndex] = Math.max(
            nextWidthList[nextIndex],
            widthPerCol
          )
        }
      }
    }
    if (typeof window !== 'undefined') {
      const targetWindow = window as any
      const debugStore = targetWindow.__ceAutoFitTableDebug || {}
      targetWindow.__ceAutoFitTableDebug = {
        ...debugStore,
        preFitWidths: nextWidthList.slice()
      }
    }
    return this.expandColgroupWidths(nextWidthList).map(width => ({
      width
    }))
  }

  private resolveInlineTableWidth(startIndex: number, fallbackWidth: number) {
    const positionList = this.coordinate.getPositionList()
    const cursorPosition = positionList[startIndex]
    if (!cursorPosition) {
      return fallbackWidth
    }
    const rowPositionList = positionList.filter(position => {
      return (
        position.pageNo === cursorPosition.pageNo &&
        position.rowNo === cursorPosition.rowNo
      )
    })
    if (!rowPositionList.length) {
      return fallbackWidth
    }
    const rowStartX = Math.min(
      ...rowPositionList.map(position => position.coordinate.leftTop[0])
    )
    const usedWidth = Math.max(
      0,
      (cursorPosition.coordinate.rightTop[0] - rowStartX) / this.options.scale
    )
    const inlineWidth = fallbackWidth - usedWidth
    return inlineWidth > 0 ? inlineWidth : fallbackWidth
  }

  public insertTable(row: number, col: number, options: IInsertTableOption = {}) {
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return
    const { defaultTrMinHeight } = this.options.table
    const elementList = this.draw.getObjectResolver().getElementList()
    let offsetX = 0
    if (elementList[startIndex]?.listId) {
      const positionList = this.coordinate.getPositionList()
      const { rowIndex } = positionList[startIndex]
      const rowList = this.draw.getObjectResolver().getRowList()
      const row = rowList[rowIndex]
      offsetX = row?.offsetX || 0
    }
    const baseInnerWidth = this.draw.getContextInnerWidth() - offsetX
    const innerWidth =
      options.tableDisplay === TableDisplay.INLINE
        ? this.resolveInlineTableWidth(startIndex, baseInnerWidth)
        : baseInnerWidth

    // 初始化列配置。
    const colgroup: IColgroup[] = []
    const colWidth = innerWidth / col
    for (let c = 0; c < col; c++) {
      colgroup.push({
        width: colWidth
      })
    }

    // 初始化行与单元格。
    const trList: ITr[] = []
    for (let r = 0; r < row; r++) {
      const tdList: ITd[] = []
      const tr: ITr = {
        height: defaultTrMinHeight,
        tdList
      }
      for (let c = 0; c < col; c++) {
        tdList.push({
          colspan: 1,
          rowspan: 1,
          value: []
        })
      }
      trList.push(tr)
    }

    const element: IElement = {
      type: ElementType.TABLE,
      value: '',
      tableDisplay: options.tableDisplay,
      colgroup,
      trList
    }

    // 统一补齐表格元素上下文。
    formatElementList([element], {
      editorOptions: this.options
    })
    formatElementContext(elementList, [element], startIndex, {
      editorOptions: this.options
    })

    const curIndex = startIndex + 1
    this.draw.spliceElementList(
      elementList,
      curIndex,
      startIndex === endIndex ? 0 : endIndex - startIndex,
      [element]
    )
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex, isSetCursor: false })
  }

  public insertTableTopRow() {
    const context = this.resolveContextTable()
    if (!context || context.trIndex === undefined) return
    const { index, trIndex, tableId, element } = context
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]

    // 如果当前行被上方跨行单元格覆盖，需要先补齐对应的 rowspan。
    if (curTr.tdList.length < element.colgroup!.length) {
      const curTrNo = curTr.tdList[0].rowIndex!
      for (let t = 0; t < trIndex!; t++) {
        const tr = curTrList[t]
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          if (td.rowspan > 1 && td.rowIndex! + td.rowspan >= curTrNo + 1) {
            td.rowspan += 1
          }
        }
      }
    }

    // 在当前行上方插入一行新的空白行。
    const newTrId = getUUID()
    const newTr: ITr = {
      height: curTr.height,
      id: newTrId,
      tdList: []
    }
    for (let t = 0; t < curTr.tdList.length; t++) {
      const curTd = curTr.tdList[t]
      const newTdId = getUUID()
      newTr.tdList.push({
        id: newTdId,
        rowspan: 1,
        colspan: curTd.colspan,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: newTrId,
            tdId: newTdId
          }
        ]
      })
    }
    curTrList.splice(trIndex!, 0, newTr)
    this.draw.getCoordinate().setPositionContext({
      isTable: true,
      index,
      trIndex,
      tdIndex: 0,
      tdId: newTr.tdList[0].id,
      trId: newTr.id,
      tableId
    })
    this.range.setRange(0, 0)
    this.draw.render({ curIndex: 0 })
    this.tableTool.render()
  }

  public insertTableBottomRow() {
    const context = this.resolveContextTable()
    if (!context || context.trIndex === undefined) return
    const { index, trIndex, tableId, element } = context
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]
    const anchorTr =
      curTrList.length - 1 === trIndex ? curTr : curTrList[trIndex! + 1]

    // 如果锚点行被上方跨行单元格覆盖，需要先补齐对应的 rowspan。
    if (anchorTr.tdList.length < element.colgroup!.length) {
      const curTrNo = anchorTr.tdList[0].rowIndex!
      for (let t = 0; t < trIndex! + 1; t++) {
        const tr = curTrList[t]
        for (let d = 0; d < tr.tdList.length; d++) {
          const td = tr.tdList[d]
          if (td.rowspan > 1 && td.rowIndex! + td.rowspan >= curTrNo + 1) {
            td.rowspan += 1
          }
        }
      }
    }

    // 在当前行下方插入一行新的空白行。
    const newTrId = getUUID()
    const newTr: ITr = {
      height: anchorTr.height,
      id: newTrId,
      tdList: []
    }
    for (let t = 0; t < anchorTr.tdList.length; t++) {
      const curTd = anchorTr.tdList[t]
      const newTdId = getUUID()
      newTr.tdList.push({
        id: newTdId,
        rowspan: 1,
        colspan: curTd.colspan,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: newTrId,
            tdId: newTdId
          }
        ]
      })
    }
    curTrList.splice(trIndex! + 1, 0, newTr)

    // 重新设置表格光标上下文。
    this.draw.getCoordinate().setPositionContext({
      isTable: true,
      index,
      trIndex: trIndex! + 1,
      tdIndex: 0,
      tdId: newTr.tdList[0].id,
      trId: newTr.id,
      tableId: element.id
    })
    this.range.setRange(0, 0)

    // 重新渲染。
    this.draw.render({ curIndex: 0 })
  }

  public adjustColWidth(element: IElement) {
    if (element.type !== ElementType.TABLE) return
    const { defaultColMinWidth } = this.options.table
    const colgroup = element.colgroup!
    const colgroupWidth = colgroup.reduce((pre, cur) => pre + cur.width, 0)
    const width = this.draw.getOriginalInnerWidth()
    if (colgroupWidth > width) {
      // 过滤出宽度大于最小值的列，用于参与等比压缩。
      const greaterMinWidthCol = colgroup.filter(
        col => col.width > defaultColMinWidth
      )
      // 均分需要缩减的宽度。
      const adjustWidth = (colgroupWidth - width) / greaterMinWidthCol.length
      for (let g = 0; g < colgroup.length; g++) {
        const group = colgroup[g]
        // 缩减后仍不小于最小列宽时才执行压缩。
        if (group.width - adjustWidth >= defaultColMinWidth) {
          group.width -= adjustWidth
        }
      }
    }
  }

  public autoFitTable(options: IAutoFitTableOption = {}) {
    const context = this.resolveContextTable(options.tableId)
    if (!context || !context.element?.trList?.length) return
    if (typeof window !== 'undefined') {
      const targetWindow = window as any
      targetWindow.__ceAutoFitTableDebug = {
        tableId: context.tableId,
        index: context.index,
        trIndex: context.trIndex,
        tdIndex: context.tdIndex,
        originalColgroup: context.element.colgroup?.map(col => col.width) || []
      }
    }
    const nextColgroup = this.computeAutoFitColgroup(context.element)
    if (!nextColgroup.length) return
    if (typeof window !== 'undefined') {
      const debugStore = (window as any).__ceAutoFitTableDebug
      debugStore.nextColgroup = nextColgroup.map(
        col => col.width
      )
    }
    context.element.colgroup = nextColgroup
    this.draw.getTableParticle().computeRowColInfo(context.element)
    this.draw.render({
      curIndex: context.index,
      isSetCursor: false,
      pageRenderScope: 'visible'
    })
    this.tableTool.render()
  }

  public insertTableLeftCol() {
    const context = this.resolveContextTable()
    if (!context || context.tdIndex === undefined) return
    const { index, tdIndex, tableId, element } = context
    const curTrList = element.trList!
    const curTdIndex = tdIndex!

    // 在当前列左侧为每一行插入单元格。
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      const tdId = getUUID()
      tr.tdList.splice(curTdIndex, 0, {
        id: tdId,
        rowspan: 1,
        colspan: 1,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: tr.id,
            tdId
          }
        ]
      })
    }

    // 插入新的列宽配置。
    const { defaultColMinWidth } = this.options.table
    const colgroup = element.colgroup!
    colgroup.splice(curTdIndex, 0, {
      width: defaultColMinWidth
    })
    this.adjustColWidth(element)

    // 重置表格光标上下文。
    this.draw.getCoordinate().setPositionContext({
      isTable: true,
      index,
      trIndex: 0,
      tdIndex: curTdIndex,
      tdId: curTrList[0].tdList[curTdIndex].id,
      trId: curTrList[0].id,
      tableId
    })
    this.range.setRange(0, 0)

    // 重新渲染。
    this.draw.render({ curIndex: 0 })
    this.tableTool.render()
  }

  public insertTableRightCol() {
    const context = this.resolveContextTable()
    if (!context || context.tdIndex === undefined) return
    const { index, tdIndex, tableId, element } = context
    const curTrList = element.trList!
    const curTdIndex = tdIndex! + 1

    // 在当前列右侧为每一行插入单元格。
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      const tdId = getUUID()
      tr.tdList.splice(curTdIndex, 0, {
        id: tdId,
        rowspan: 1,
        colspan: 1,
        value: [
          {
            value: ZERO,
            size: 16,
            tableId,
            trId: tr.id,
            tdId
          }
        ]
      })
    }

    // 插入新的列宽配置。
    const { defaultColMinWidth } = this.options.table
    const colgroup = element.colgroup!
    colgroup.splice(curTdIndex, 0, {
      width: defaultColMinWidth
    })
    this.adjustColWidth(element)

    // 重置表格光标上下文。
    this.draw.getCoordinate().setPositionContext({
      isTable: true,
      index,
      trIndex: 0,
      tdIndex: curTdIndex,
      tdId: curTrList[0].tdList[curTdIndex].id,
      trId: curTrList[0].id,
      tableId: element.id
    })
    this.range.setRange(0, 0)

    // 重新渲染。
    this.draw.render({ curIndex: 0 })
  }

  public deleteTableRow() {
    const context = this.resolveContextTable()
    if (
      !context ||
      context.trIndex === undefined ||
      context.tdIndex === undefined
    ) return
    const { index, trIndex, tdIndex, element } = context
    const trList = element.trList!
    const curTr = trList[trIndex!]
    const curTdRowIndex = curTr.tdList[tdIndex!].rowIndex!

    // 如果当前表格只剩一行，则直接删除整张表格。
    if (trList.length <= 1) {
      this.deleteTable()
      return
    }

    // 先修正上方跨行单元格的 rowspan。
    for (let r = 0; r < curTdRowIndex; r++) {
      const tr = trList[r]
      const tdList = tr.tdList
      for (let d = 0; d < tdList.length; d++) {
        const td = tdList[d]
        if (td.rowIndex! + td.rowspan > curTdRowIndex) {
          td.rowspan--
        }
      }
    }

    // 将当前行中仍在跨行的单元格，补到下一行中继续承接。
    for (let d = 0; d < curTr.tdList.length; d++) {
      const td = curTr.tdList[d]
      if (td.rowspan > 1) {
        const tdId = getUUID()
        const nextTr = trList[trIndex! + 1]
        nextTr.tdList.splice(d, 0, {
          id: tdId,
          rowspan: td.rowspan - 1,
          colspan: td.colspan,
          value: [
            {
              value: ZERO,
              size: 16,
              tableId: element.id,
              trId: nextTr.id,
              tdId
            }
          ]
        })
      }
    }

    // 删除当前行，并重置选区与工具状态。
    trList.splice(trIndex!, 1)
    this.draw.getCoordinate().setPositionContext({
      isTable: false
    })
    this.range.clearRange()
    this.draw.render({
      curIndex: index
    })
    this.tableTool.dispose()
  }

  public deleteTableCol() {
    const context = this.resolveContextTable()
    if (
      !context ||
      context.trIndex === undefined ||
      context.tdIndex === undefined
    ) return
    const { index, tdIndex, trIndex, element } = context
    const curTrList = element.trList!
    const curTd = curTrList[trIndex!].tdList[tdIndex!]
    const curColIndex = curTd.colIndex!

    // 如果当前表格只剩一列，则直接删除整张表格。
    const moreTdTr = curTrList.find(tr => tr.tdList.length > 1)
    if (!moreTdTr) {
      this.deleteTable()
      return
    }

    // 缩减覆盖当前列的 colspan，或直接删除该列单元格。
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        if (
          td.colIndex! <= curColIndex &&
          td.colIndex! + td.colspan > curColIndex
        ) {
          if (td.colspan > 1) {
            td.colspan--
          } else {
            tr.tdList.splice(d, 1)
          }
        }
      }
    }
    element.colgroup?.splice(curColIndex, 1)

    // 清理表格上下文。
    this.draw.getCoordinate().setPositionContext({
      isTable: false
    })
    this.range.setRange(0, 0)

    // 重新渲染。
    this.draw.render({
      curIndex: index
    })
    this.tableTool.dispose()
  }

  public deleteTable() {
    const context = this.resolveContextTable()
    if (!context) return
    const originalElementList = this.draw.getObjectResolver().getOriginalElementList()
    const deleteIndex = context.index
    this.draw.spliceElementList(originalElementList, deleteIndex, 1)
    const curIndex = deleteIndex - 1
    this.draw.getCoordinate().setPositionContext({
      isTable: false,
      index: curIndex
    })
    this.range.setRange(curIndex, curIndex)
    this.draw.render({ curIndex })
    this.tableTool.dispose()
  }

  public mergeTableCell() {
    const {
      isCrossRowCol,
      tableId,
      startTdIndex,
      endTdIndex,
      startTrIndex,
      endTrIndex
    } = this.range.getEditBoundaryRange()
    if (!isCrossRowCol) return
    const context = this.resolveContextTable(tableId)
    if (
      !context ||
      startTdIndex === undefined ||
      endTdIndex === undefined ||
      startTrIndex === undefined ||
      endTrIndex === undefined
    ) {
      return
    }
    const tableIndex = context.index
    const element = context.element
    const positionContext = {
      ...context.positionContext,
      isTable: true,
      index: tableIndex,
      trIndex: startTrIndex,
      tdIndex: startTdIndex,
      tableId: context.tableId || element.id
    }
    const curTrList = element.trList!
    const startTd = curTrList[startTrIndex!].tdList[startTdIndex!]
    const endTd = curTrList[endTrIndex!].tdList[endTdIndex!]

    const startColIndex = Math.min(startTd.colIndex!, endTd.colIndex!)
    const endColIndex = Math.max(
      startTd.colIndex! + startTd.colspan - 1,
      endTd.colIndex! + endTd.colspan - 1
    )
    const startRowIndex = Math.min(startTd.rowIndex!, endTd.rowIndex!)
    const endRowIndex = Math.max(
      startTd.rowIndex! + startTd.rowspan - 1,
      endTd.rowIndex! + endTd.rowspan - 1
    )

    // 收集选区覆盖到的行列矩阵，并校验是否形成完整矩形。
    const rowColMap = new Map<number, ITd[]>()
    const coverage = new Set<string>()
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const tdStartColIndex = td.colIndex!
        const tdEndColIndex = tdStartColIndex + td.colspan - 1
        const tdStartRowIndex = td.rowIndex!
        const tdEndRowIndex = tdStartRowIndex + td.rowspan - 1
        const isOverlap = !(
          tdEndColIndex < startColIndex ||
          tdStartColIndex > endColIndex ||
          tdEndRowIndex < startRowIndex ||
          tdStartRowIndex > endRowIndex
        )
        if (!isOverlap) continue
        // 只要有单元格部分压到选区边界，说明无法合并成完整矩形。
        if (
          tdStartColIndex < startColIndex ||
          tdEndColIndex > endColIndex ||
          tdStartRowIndex < startRowIndex ||
          tdEndRowIndex > endRowIndex
        ) {
          return
        }
        const rowCol = rowColMap.get(tdStartRowIndex) || []
        rowCol.push(td)
        rowColMap.set(tdStartRowIndex, rowCol)
        for (let row = tdStartRowIndex; row <= tdEndRowIndex; row++) {
          for (let col = tdStartColIndex; col <= tdEndColIndex; col++) {
            coverage.add(`${row}_${col}`)
          }
        }
      }
    }
    const rowCol = [...rowColMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, tdList]) =>
        tdList.sort((a, b) => (a.colIndex || 0) - (b.colIndex || 0))
      )
    if (!rowCol.length) return
    for (let row = startRowIndex; row <= endRowIndex; row++) {
      for (let col = startColIndex; col <= endColIndex; col++) {
        if (!coverage.has(`${row}_${col}`)) {
          return
        }
      }
    }

    // 开始合并单元格。
    const mergeTdIdList: string[] = []
    const anchorTd = rowCol[0][0]
    const anchorElement = anchorTd.value[0]
    for (let t = 0; t < rowCol.length; t++) {
      const tr = rowCol[t]
      for (let d = 0; d < tr.length; d++) {
        const td = tr[d]
        const isAnchorTd = t === 0 && d === 0
        // 缓存待删除单元格，并将内容移动到锚点单元格。
        if (!isAnchorTd) {
          mergeTdIdList.push(td.id!)
          // 被合并单元格没有内容时，跳过首个换行占位符。
          const startTdValueIndex = td.value.length > 1 ? 0 : 1
          // 复制表格上下文后，再追加到锚点单元格。
          for (let d = startTdValueIndex; d < td.value.length; d++) {
            const tdElement = td.value[d]
            cloneProperty<IElement>(
              TABLE_CONTEXT_ATTR,
              anchorElement,
              tdElement
            )
            anchorTd.value.push(tdElement)
          }
        }
        // 列方向合并。
        if (t === 0 && d !== 0) {
          anchorTd.colspan += td.colspan
        }
        // 行方向合并。
        if (t !== 0) {
          if (anchorTd.colIndex === td.colIndex) {
            anchorTd.rowspan += td.rowspan
          }
        }
      }
    }

    // 移除多余单元格。
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      let d = 0
      while (d < tr.tdList.length) {
        const td = tr.tdList[d]
        if (mergeTdIdList.includes(td.id!)) {
          tr.tdList.splice(d, 1)
          d--
        }
        d++
      }
    }

    // 设置新的表格位置上下文。
    this.draw.getCoordinate().setPositionContext({
      ...positionContext,
      index: tableIndex,
      tableId: element.id,
      trIndex: anchorTd.trIndex,
      tdIndex: anchorTd.tdIndex
    })
    const curIndex = anchorTd.value.length - 1
    this.range.setRange(curIndex, curIndex)

    // 重新渲染表格与工具层。
    this.draw.render()
    this.tableTool.render()
  }

  public cancelMergeTableCell() {
    const context = this.resolveContextTable()
    if (
      !context ||
      context.trIndex === undefined ||
      context.tdIndex === undefined
    ) return
    const { tdIndex, trIndex, element } = context
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]!
    const curTd = curTr.tdList[tdIndex!]
    if (curTd.rowspan === 1 && curTd.colspan === 1) return
    const colspan = curTd.colspan

    // 拆分跨列。
    if (curTd.colspan > 1) {
      for (let c = 1; c < curTd.colspan; c++) {
        const tdId = getUUID()
        curTr.tdList.splice(tdIndex! + c, 0, {
          id: tdId,
          rowspan: 1,
          colspan: 1,
          value: [
            {
              value: ZERO,
              size: 16,
              tableId: element.id,
              trId: curTr.id,
              tdId
            }
          ]
        })
      }
      curTd.colspan = 1
    }

    // 拆分跨行。
    if (curTd.rowspan > 1) {
      for (let r = 1; r < curTd.rowspan; r++) {
        const tr = curTrList[trIndex! + r]
        for (let c = 0; c < colspan; c++) {
          const tdId = getUUID()
          tr.tdList.splice(curTd.colIndex!, 0, {
            id: tdId,
            rowspan: 1,
            colspan: 1,
            value: [
              {
                value: ZERO,
                size: 16,
                tableId: element.id,
                trId: tr.id,
                tdId
              }
            ]
          })
        }
      }
      curTd.rowspan = 1
    }

    // 重新渲染表格与工具层。
    const curIndex = curTd.value.length - 1
    this.range.setRange(curIndex, curIndex)
    this.draw.render()
    this.tableTool.render()
  }

  public splitVerticalTableCell() {
    const context = this.resolveContextTable()
    if (
      !context ||
      context.trIndex === undefined ||
      context.tdIndex === undefined
    ) return

    // 暂时忽略跨行跨列选择。
    const range = this.range.getEditBoundaryRange()
    if (range.isCrossRowCol) return
    const { tdIndex, trIndex, element } = context
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]!
    const curTd = curTr.tdList[tdIndex!]

    // 增加列配置。
    element.colgroup!.splice(tdIndex! + 1, 0, {
      width: this.options.table.defaultColMinWidth
    })

    // 同一行插入 td，非同行则增加跨列数。
    for (let t = 0; t < curTrList.length; t++) {
      const tr = curTrList[t]
      let d = 0
      while (d < tr.tdList.length) {
        const td = tr.tdList[d]
        // 非同行：如果当前列被交叉单元格覆盖，则增加其 colspan。
        if (td.rowIndex !== curTd.rowIndex) {
          if (
            td.colIndex! <= curTd.colIndex! &&
            td.colIndex! + td.colspan > curTd.colIndex!
          ) {
            td.colspan++
          }
        } else {
          // 当前单元格：在右侧插入新的 td。
          if (td.id === curTd.id) {
            const tdId = getUUID()
            curTr.tdList.splice(d + curTd.colspan, 0, {
              id: tdId,
              rowspan: curTd.rowspan,
              colspan: 1,
              value: [
                {
                  value: ZERO,
                  size: 16,
                  tableId: element.id,
                  trId: tr.id,
                  tdId
                }
              ]
            })
            d++
          }
        }
        d++
      }
    }

    // 重新渲染表格与工具层。
    this.draw.render()
    this.tableTool.render()
  }

  public splitHorizontalTableCell() {
    const context = this.resolveContextTable()
    if (
      !context ||
      context.trIndex === undefined ||
      context.tdIndex === undefined
    ) return

    // 暂时忽略跨行跨列选择。
    const range = this.range.getEditBoundaryRange()
    if (range.isCrossRowCol) return
    const { tdIndex, trIndex, element } = context
    const curTrList = element.trList!
    const curTr = curTrList[trIndex!]!
    const curTd = curTr.tdList[tdIndex!]

    // 记录追加行索引，避免重复处理。
    let appendTrIndex = -1

    // 交叉行增加 rowspan，并在下方追加一行 tr。
    let t = 0
    while (t < curTrList.length) {
      if (t === appendTrIndex) {
        t++
        continue
      }
      const tr = curTrList[t]
      let d = 0
      while (d < tr.tdList.length) {
        const td = tr.tdList[d]
        if (td.id === curTd.id) {
          const trId = getUUID()
          const tdId = getUUID()
          curTrList.splice(t + curTd.rowspan, 0, {
            id: trId,
            height: this.options.table.defaultTrMinHeight,
            tdList: [
              {
                id: tdId,
                rowspan: 1,
                colspan: curTd.colspan,
                value: [
                  {
                    value: ZERO,
                    size: 16,
                    tableId: element.id,
                    trId,
                    tdId
                  }
                ]
              }
            ]
          })
          appendTrIndex = t + curTd.rowspan
        } else if (
          td.rowIndex! >= curTd.rowIndex! &&
          td.rowIndex! < curTd.rowIndex! + curTd.rowspan &&
          td.rowIndex! + td.rowspan >= curTd.rowIndex! + curTd.rowspan
        ) {
          // 1. 循环 td 上边界落在当前 td 内部，说明存在交叉。
          // 2. 循环 td 下边界覆盖当前 td 下边界。
          td.rowspan++
        }
        d++
      }
      t++
    }

    // 重新渲染表格与工具层。
    this.draw.render()
    this.tableTool.render()
  }

  public tableTdVerticalAlign(payload: VerticalAlign) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        const td = row[c]
        if (
          !td ||
          td.verticalAlign === payload ||
          (!td.verticalAlign && payload === VerticalAlign.TOP)
        ) {
          continue
        }
        // 重设垂直对齐方式。
        td.verticalAlign = payload
      }
    }
    const { endIndex } = this.range.getEditBoundaryRange()
    this.draw.render({
      curIndex: endIndex,
      isLazy: false
    })
  }

  public tableBorderType(payload: TableBorder) {
    const context = this.resolveContextTable()
    if (!context) return
    const { element } = context
    if (
      (!element.borderType && payload === TableBorder.ALL) ||
      (payload !== TableBorder.EMPTY && element.borderType === payload)
    ) {
      return
    }
    element.borderType = payload
    if (payload === TableBorder.EMPTY) {
      this.clearTableBorderStyle(element)
    }
    const { endIndex } = this.range.getEditBoundaryRange()
    this.renderTableVisualStyleChange(endIndex)
  }

  public tableBorderColor(payload: string) {
    const context = this.resolveContextTable()
    if (!context) return
    const { element } = context
    if (
      (!element.borderColor &&
        payload === this.options.table.defaultBorderColor) ||
      element.borderColor === payload
    ) {
      return
    }
    element.borderColor = payload
    const { endIndex } = this.range.getEditBoundaryRange()
    this.renderTableVisualStyleChange(endIndex)
  }

  public tableBorderWidth(payload: number) {
    const context = this.resolveContextTable()
    if (!context || !Number.isFinite(payload) || payload <= 0) return
    const { element } = context
    if (
      (!element.borderWidth &&
        !element.borderExternalWidth &&
        payload === 1) ||
      (element.borderWidth === payload &&
        element.borderExternalWidth === payload)
    ) {
      return
    }
    element.borderWidth = payload
    element.borderExternalWidth = payload
    const { endIndex } = this.range.getEditBoundaryRange()
    this.renderTableVisualStyleChange(endIndex)
  }

  public tableTdBorderType(payload: TdBorder) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    const tdList = rowCol.flat()

    // 存在则设置边框类型，否则取消设置。
    const isSetBorderType = tdList.some(
      td => !td.borderTypes?.includes(payload)
    )
    tdList.forEach(td => {
      if (!td.borderTypes) {
        td.borderTypes = []
      }
      const borderTypeIndex = td.borderTypes.findIndex(type => type === payload)
      if (isSetBorderType) {
        if (!~borderTypeIndex) {
          td.borderTypes.push(payload)
        }
      } else {
        if (~borderTypeIndex) {
          td.borderTypes.splice(borderTypeIndex, 1)
        }
      }

      // 边框类型列表为空时删除字段。
      if (!td.borderTypes.length) {
        delete td.borderTypes
      }
    })
    const { endIndex } = this.range.getEditBoundaryRange()
    this.renderTableVisualStyleChange(endIndex)
  }

  public tableTdBorderColor(payload: string) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    rowCol.flat().forEach(td => {
      if (!td.borderTypes?.length) {
        td.borderTypes = [...ALL_TD_BORDERS]
      }
      td.borderColor = payload
    })
    const { endIndex } = this.range.getEditBoundaryRange()
    this.renderTableVisualStyleChange(endIndex)
  }

  public tableTdBorderWidth(payload: number) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    rowCol.flat().forEach(td => {
      if (!td.borderTypes?.length) {
        td.borderTypes = [...ALL_TD_BORDERS]
      }
      td.borderWidth = payload
    })
    const { endIndex } = this.range.getEditBoundaryRange()
    this.renderTableVisualStyleChange(endIndex)
  }

  public tableTdSlashType(payload: TdSlash) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    const tdList = rowCol.flat()

    // 存在则设置单元格斜线类型，否则取消设置。
    const isSetTdSlashType = tdList.some(
      td => !td.slashTypes?.includes(payload)
    )
    tdList.forEach(td => {
      if (!td.slashTypes) {
        td.slashTypes = []
      }
      const slashTypeIndex = td.slashTypes.findIndex(type => type === payload)
      if (isSetTdSlashType) {
        if (!~slashTypeIndex) {
          td.slashTypes.push(payload)
        }
      } else {
        if (~slashTypeIndex) {
          td.slashTypes.splice(slashTypeIndex, 1)
        }
      }

      // 斜线类型列表为空时删除字段。
      if (!td.slashTypes.length) {
        delete td.slashTypes
      }
    })
    const { endIndex } = this.range.getEditBoundaryRange()
    this.draw.render({
      curIndex: endIndex
    })
  }

  public tableTdBackgroundColor(payload: string) {
    const rowCol = this.tableParticle.getRangeRowCol()
    if (!rowCol) return
    for (let r = 0; r < rowCol.length; r++) {
      const row = rowCol[r]
      for (let c = 0; c < row.length; c++) {
        const col = row[c]
        col.backgroundColor = payload
      }
    }
    const { endIndex } = this.range.getEditBoundaryRange()
    this.range.setRange(endIndex, endIndex)
    this.draw.render({
      isCompute: false,
      pageRenderScope: 'visible'
    })
  }

  public tableSelectAll() {
    const context = this.resolveContextTable()
    if (!context || !context.tableId) return
    const { tableId, element } = context
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    const trList = element.trList!

    // 计算最后一个单元格位置。
    const endTrIndex = trList.length - 1
    const endTdIndex = trList[endTrIndex].tdList.length - 1
    this.range.replaceRange({
      startIndex,
      endIndex,
      tableId,
      startTdIndex: 0,
      endTdIndex,
      startTrIndex: 0,
      endTrIndex
    })
    this.draw.render({
      isCompute: false,
      isSubmitHistory: false,
      pageRenderScope: 'visible'
    })
  }
}
