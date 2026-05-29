import { IElement } from '../../../..'
import { ZERO } from '../../../../dataset/constant/Common'
import { TABLE_CONTEXT_ATTR } from '../../../../dataset/constant/Element'
import { ITd } from '../../../../interface/table/Td'
import { cloneProperty, getUUID } from '../../../../utils'
import type { TableOperate } from './TableOperate'

/** 表格operate内部访问契约，用于在拆分模块间共享受控能力。 */
type TableOperateInternal = Record<string, any>

declare module './TableOperate' {
  /** 表格operate契约，用于约束内部流程中传递的数据结构。 */
  interface TableOperate {
    mergeTableCell(): void
    /** 取消 Merge Table Cell 对应的待处理任务。 */
    cancelMergeTableCell(): void
    splitVerticalTableCell(): void
    splitHorizontalTableCell(): void
  }
}

const tableMergeMethods = {
  mergeTableCell(this: TableOperateInternal) {
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
    // 创建 coverage 实例。
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
  },

  /** 取消 Merge Table Cell 对应的待处理任务。 */
  cancelMergeTableCell(this: TableOperateInternal) {
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
  },

  splitVerticalTableCell(this: TableOperateInternal) {
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
  },

  splitHorizontalTableCell(this: TableOperateInternal) {
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
}

/** 安装表格mergemethods，把拆分方法挂载到目标原型。 */
export function installTableMergeMethods(TableOperateClass: typeof TableOperate) {
  Object.assign(TableOperateClass.prototype, tableMergeMethods)
}
