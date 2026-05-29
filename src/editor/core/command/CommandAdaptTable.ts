import { CommandAdaptRichText } from './CommandAdaptRichText'
import { TableBorder, TdBorder, TdSlash } from '../../dataset/enum/table/Table'
import { VerticalAlign } from '../../dataset/enum/VerticalAlign'
import { TableOperate } from '../modules/table/particle/TableOperate'

/**
 * 表格命令适配模块，负责表格结构、单元格合并拆分和边框样式相关命令。
 */
export class CommandAdaptTable extends CommandAdaptRichText {
  /** 在当前选区插入指定行列的表格。 */
  public insertTable(
    row: number,
    col: number,
    options?: Parameters<TableOperate['insertTable']>[2]
  ) {
    if (this.isCommandDisabled()) return
    const activeControl = this.control.getActiveControl()
    if (activeControl) return
    this.tableOperate.insertTable(row, col, options)
  }

  /** 在当前表格位置上方插入一行。 */
  public insertTableTopRow() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.insertTableTopRow()
  }

  /** 在当前表格位置下方插入一行。 */
  public insertTableBottomRow() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.insertTableBottomRow()
  }

  /** 在当前表格位置左侧插入一列。 */
  public insertTableLeftCol() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.insertTableLeftCol()
  }

  /** 在当前表格位置右侧插入一列。 */
  public insertTableRightCol() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.insertTableRightCol()
  }

  /** 删除当前选中的表格行。 */
  public deleteTableRow() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.deleteTableRow()
  }

  /** 删除当前选中的表格列。 */
  public deleteTableCol() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.deleteTableCol()
  }

  /** 删除当前表格。 */
  public deleteTable() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.deleteTable()
  }

  /** 合并当前选中的表格单元格。 */
  public mergeTableCell() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.mergeTableCell()
  }

  /** 取消当前合并单元格。 */
  public cancelMergeTableCell() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.cancelMergeTableCell()
  }

  /** 按垂直方向拆分当前单元格。 */
  public splitVerticalTableCell() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.splitVerticalTableCell()
  }

  /** 按水平方向拆分当前单元格。 */
  public splitHorizontalTableCell() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.splitHorizontalTableCell()
  }

  /** 设置表格单元格内容的垂直对齐方式。 */
  public tableTdVerticalAlign(payload: VerticalAlign) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableTdVerticalAlign(payload)
  }

  /** 设置当前表格的边框类型。 */
  public tableBorderType(payload: TableBorder) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableBorderType(payload)
  }

  /** 设置当前表格的边框颜色。 */
  public tableBorderColor(payload: string) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableBorderColor(payload)
  }

  /** 设置当前表格的边框宽度。 */
  public tableBorderWidth(payload: number) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableBorderWidth(payload)
  }

  /** 设置当前单元格的边框类型。 */
  public tableTdBorderType(payload: TdBorder) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableTdBorderType(payload)
  }

  /** 设置当前单元格的边框颜色。 */
  public tableTdBorderColor(payload: string) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableTdBorderColor(payload)
  }

  /** 设置当前单元格的边框宽度。 */
  public tableTdBorderWidth(payload: number) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableTdBorderWidth(payload)
  }

  /** 设置当前单元格的斜线类型。 */
  public tableTdSlashType(payload: TdSlash) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableTdSlashType(payload)
  }

  /** 设置当前单元格的背景色。 */
  public tableTdBackgroundColor(payload: string) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.tableTdBackgroundColor(payload)
  }

  /** 根据内容或容器自动调整表格宽度。 */
  public autoFitTable(
    options?: Parameters<TableOperate['autoFitTable']>[0]
  ) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.tableOperate.autoFitTable(options)
  }

  /** 选中当前表格的全部内容。 */
  public tableSelectAll() {
    this.tableOperate.tableSelectAll()
  }
}
