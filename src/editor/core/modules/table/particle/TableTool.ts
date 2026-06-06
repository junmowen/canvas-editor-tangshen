import { IElement } from '../../../..'
import { EDITOR_PREFIX } from '../../../../dataset/constant/Editor'
import { TableOrder } from '../../../../dataset/enum/table/TableTool'
import { DeepRequired } from '../../../../interface/Common'
import { IEditorOption } from '../../../../interface/Editor'
import { RangeManager } from '../../../range/RangeManager'
import { RenderLayer } from '../../../render-backend'
import { Draw } from '../../../draw/Draw'
import type { DrawCoordinateService } from '../../../draw/coordinate/DrawCoordinateService'
import { resolveTableCellByIndex } from '../utils/TableCellTraversal'

/** anchor鼠标down契约，用于约束内部流程中传递的数据结构。 */
interface IAnchorMouseDown {
  /** 原始鼠标事件。 */
  evt: MouseEvent
  /** 当前拖拽的是行边界还是列边界。 */
  order: TableOrder
  /** 当前边界在行列集合中的索引。 */
  index: number
  /** 当前正在操作的表格元素。 */
  element: IElement
}

/** 表格工具层，负责行列增删、整表选择和边界拖拽辅助 UI。 */
export class TableTool {
  // 单元格最小宽度
  private readonly MIN_TD_WIDTH = 20
  // 行列工具相对表格偏移值
  private readonly ROW_COL_OFFSET = 18
  // 快速添加行列工具宽度
  private readonly ROW_COL_QUICK_WIDTH = 16
  // 快速添加行列工具偏移值
  private readonly ROW_COL_QUICK_OFFSET = 5
  // 快速添加行列工具相对表格位置
  private readonly ROW_COL_QUICK_POSITION =
    this.ROW_COL_OFFSET + (this.ROW_COL_OFFSET - this.ROW_COL_QUICK_WIDTH) / 2
  // 边框工具宽/高度
  private readonly BORDER_VALUE = 4
  // 快速选择工具偏移值
  private readonly TABLE_SELECT_OFFSET = 20

  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 当前页 base canvas，仅用于坐标换算和 cursor 副作用。 */
  private canvas: HTMLCanvasElement | null
  /** 编辑器配置快照，提供缩放、表格默认值和工具样式配置。 */
  private options: DeepRequired<IEditorOption>
  /** 坐标服务，用于判断当前是否处于表格上下文。 */
  private coordinate: DrawCoordinateService
  /** 选区管理器，用于表格工具交互后同步编辑选区。 */
  private range: RangeManager
  /** 编辑器主容器，作为工具 DOM 的兜底挂载点。 */
  private container: HTMLDivElement
  /** 当前页覆盖层宿主，表格工具会挂载到这里。 */
  private overlayHost: HTMLDivElement | null
  /** 当前工具所属页码，用于拖拽时重新解析 canvas。 */
  private currentPageNo: number
  private toolRowContainer: HTMLDivElement | null
  private toolRowAddBtn: HTMLDivElement | null
  private toolColAddBtn: HTMLDivElement | null
  private toolTableSelectBtn: HTMLDivElement | null
  private toolColContainer: HTMLDivElement | null
  private toolBorderContainer: HTMLDivElement | null
  private anchorLine: HTMLDivElement | null
  private mousedownX: number
  private mousedownY: number

  /** 初始化 TableTool 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.canvas = null
    this.options = draw.getOptions()
    this.coordinate = draw.getCoordinate()
    this.range = draw.getRange()
    this.container = draw.getPageCanvasHost().getContainer()
    this.overlayHost = null
    this.currentPageNo = 0
    // x、y轴
    this.toolRowContainer = null
    this.toolRowAddBtn = null
    this.toolColAddBtn = null
    this.toolTableSelectBtn = null
    this.toolColContainer = null
    this.toolBorderContainer = null
    this.anchorLine = null
    this.mousedownX = 0
    this.mousedownY = 0
  }

  /** 销毁dispose相关资源，解除事件监听并释放持有对象。 */
  public dispose() {
    this.toolRowContainer?.remove()
    this.toolRowAddBtn?.remove()
    this.toolColAddBtn?.remove()
    this.toolTableSelectBtn?.remove()
    this.toolColContainer?.remove()
    this.toolBorderContainer?.remove()
    this.anchorLine?.remove()
    this.toolRowContainer = null
    this.toolRowAddBtn = null
    this.toolColAddBtn = null
    this.toolTableSelectBtn = null
    this.toolColContainer = null
    this.toolBorderContainer = null
    this.anchorLine = null
    this.overlayHost = null
  }

  /**
   * 按页码解析 base canvas。
   *
   * 表格工具只需要 DOM canvas 做坐标换算和 cursor 更新，实际资源由渲染后端托管。
   *
   * @param pageNo - 目标页码
   * @returns 当前页 base canvas，未挂载时返回 null
   */
  private _resolvePageCanvas(pageNo: number): HTMLCanvasElement | null {
    return (
      this.draw.getPageCanvasHost().getSurface(pageNo, RenderLayer.BASE)
        ?.canvas || null
    )
  }

  public render() {
    const { isTable, trIndex, tdIndex } = this.draw
      .getCoordinate()
      .getPositionContext()
    if (!isTable) return
    // 销毁之前工具
    this.dispose()
    const positionContext = this.draw.getCoordinate().getPositionContext()
    const tableContext = this.draw.getTargetResolver().resolveContextTable({
      positionContext
    })
    if (!tableContext) return
    const index = tableContext.index
    const tableElement = tableContext.element
    // 表格工具配置禁用又非设计模式时不渲染
    if (tableElement.tableToolDisabled && !this.draw.isDesignMode()) return
    // 渲染所需数据
    const { scale } = this.options
    const activeSlice = this.draw
      .getTargetResolver()
      .resolveTableSliceByPositionContext(positionContext)
    let renderTrList = tableElement.trList || []
    let renderColgroup = tableElement.colgroup || []
    let renderTd = resolveTableCellByIndex({
      tableElement,
      tableIndex: index,
      trIndex: trIndex!,
      tdIndex: tdIndex!
    })?.td || null
    let tableX = 0
    let tableY = 0
    let toolPageNo = this.draw.getPageNo()
    if (activeSlice) {
      const fragmentPosition = this.draw
        .getTargetResolver()
        .getPageFragmentPositions(activeSlice.pageNo)
        .find(position => {
          const fragmentTable = position.tableFragment
          return (
            fragmentTable?.tableId === activeSlice.fragmentTableId ||
            position.element?.id === activeSlice.fragmentTableId
          )
        })
      const fragmentTable = fragmentPosition?.tableFragment || null
      if (fragmentPosition && fragmentTable?.trList?.length) {
        renderTrList = fragmentTable.trList
        renderColgroup = fragmentTable.colgroup || tableElement.colgroup || []
        renderTd =
          fragmentTable.trList?.[activeSlice.fragmentTrIndex]?.tdList?.[
            activeSlice.fragmentTdIndex
          ] || renderTd
        tableX = fragmentPosition.coordinate.leftTop[0]
        tableY = fragmentPosition.coordinate.leftTop[1]
        toolPageNo = activeSlice.pageNo
      }
    }
    if (!renderTd) {
      return
    }
    if (!renderTrList.length || !renderColgroup.length) {
      return
    }
    if (tableX === 0 && tableY === 0) {
      const position = this.coordinate.getOriginalPositionList()[index!]
      if (!position) {
        return
      }
      tableX = position.coordinate.leftTop[0]
      tableY = position.coordinate.leftTop[1]
      toolPageNo = position.pageNo ?? this.draw.getPageNo()
    }
    this.currentPageNo = toolPageNo
    this.overlayHost =
      this.draw.getPageCanvasHost().getPageOverlayHost(toolPageNo) || this.container
    this.canvas = this._resolvePageCanvas(toolPageNo)
    const td = renderTd
    const rowIndex = td.rowIndex
    const colIndex = td.colIndex
    const currentLogicalRowIndex = activeSlice?.logicalTrIndex ?? rowIndex
    let tableBottom = 0
    let tableRight = 0
    for (let r = 0; r < renderTrList.length; r++) {
      const tr = renderTrList[r]
      for (let d = 0; d < tr.tdList.length; d++) {
        const currentTd = tr.tdList[d]
        tableBottom = Math.max(
          tableBottom,
          (currentTd.y! + currentTd.height!) * scale
        )
        tableRight = Math.max(
          tableRight,
          (currentTd.x! + currentTd.width!) * scale
        )
      }
    }
    const tableHeight = tableBottom
    const tableWidth = tableRight
    // 表格选择工具
    const tableSelectBtn = document.createElement('div')
    tableSelectBtn.classList.add(`${EDITOR_PREFIX}-table-tool__select`)
    tableSelectBtn.style.left = `${tableX}px`
    tableSelectBtn.style.top = `${tableY}px`
    tableSelectBtn.style.transform = `translate(-${
      this.TABLE_SELECT_OFFSET * scale
    }px, ${-this.TABLE_SELECT_OFFSET * scale}px)`
    const tableOperate = this.draw.getComponents().tableOperate
    // 快捷全选
    tableSelectBtn.onclick = () => {
      tableOperate.tableSelectAll()
    }
    tableSelectBtn.style.pointerEvents = 'auto'
    this.overlayHost.append(tableSelectBtn)
    this.toolTableSelectBtn = tableSelectBtn
    // 渲染行工具
    const rowHeightList = renderTrList.map(tr => tr.height)
    const rowContainer = document.createElement('div')
    rowContainer.classList.add(`${EDITOR_PREFIX}-table-tool__row`)
    rowContainer.style.transform = `translateX(-${
      this.ROW_COL_OFFSET * scale
    }px)`
    rowContainer.style.pointerEvents = 'auto'
    for (let r = 0; r < rowHeightList.length; r++) {
      const rowHeight = rowHeightList[r] * scale
      const rowItem = document.createElement('div')
      rowItem.classList.add(`${EDITOR_PREFIX}-table-tool__row__item`)
      const activeFragmentRow = renderTrList[r]
      const activeRowMatchIndex =
        tableElement.trList?.findIndex(tr => {
          const originId = (activeFragmentRow as any)?.originId
          return tr.id === originId || tr.id === activeFragmentRow?.id
        }) ?? -1
      const activeLogicalRowIndex =
        activeRowMatchIndex >= 0 ? activeRowMatchIndex : r
      if (activeLogicalRowIndex === currentLogicalRowIndex) {
        rowItem.classList.add('active')
      }
      // 快捷行选择
      rowItem.onclick = () => {
        const fragmentRow = renderTrList[r]
        const targetRowMatchIndex =
          tableElement.trList?.findIndex(tr => {
            const originId = (fragmentRow as any)?.originId
            return tr.id === originId || tr.id === fragmentRow?.id
          }) ?? -1
        const targetLogicalRowIndex =
          targetRowMatchIndex >= 0 ? targetRowMatchIndex : r
        const tdList = this.draw
          .getTableParticle()
          .getTdListByRowIndex(tableElement.trList!, targetLogicalRowIndex)
        const firstTd = tdList[0]
        const lastTd = tdList[tdList.length - 1]
        this.draw.getCoordinate().setPositionContext({
          index,
          isTable: true,
          trIndex: targetLogicalRowIndex,
          tdIndex: firstTd.tdIndex,
          tableId: tableElement.id
        })
        this.range.setRange(
          0,
          0,
          tableElement.id,
          firstTd.tdIndex,
          lastTd.tdIndex,
          targetLogicalRowIndex,
          targetLogicalRowIndex
        )
        this.draw.render({
          curIndex: 0,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
        this._setAnchorActive(rowContainer, r)
      }
      const rowItemAnchor = document.createElement('div')
      rowItemAnchor.classList.add(`${EDITOR_PREFIX}-table-tool__anchor`)
      // 行高度拖拽开始
      rowItemAnchor.onmousedown = evt => {
        this._mousedown({
          evt,
          element: tableElement,
          index: r,
          order: TableOrder.ROW
        })
      }
      rowItem.append(rowItemAnchor)
      rowItem.style.height = `${rowHeight}px`
      rowContainer.append(rowItem)
    }
    rowContainer.style.left = `${tableX}px`
    rowContainer.style.top = `${tableY}px`
    this.overlayHost.append(rowContainer)
    this.toolRowContainer = rowContainer
    // 添加行按钮
    const rowAddBtn = document.createElement('div')
    rowAddBtn.classList.add(`${EDITOR_PREFIX}-table-tool__quick__add`)
    rowAddBtn.style.left = `${tableX}px`
    rowAddBtn.style.top = `${tableY + tableHeight}px`
    rowAddBtn.style.transform = `translate(-${
      this.ROW_COL_QUICK_POSITION * scale
    }px, ${this.ROW_COL_QUICK_OFFSET * scale}px)`
    rowAddBtn.style.pointerEvents = 'auto'
    rowAddBtn.onmousedown = evt => {
      evt.preventDefault()
      evt.stopPropagation()
    }
    // 快捷添加行
    rowAddBtn.onclick = evt => {
      evt.preventDefault()
      evt.stopPropagation()
      const targetTrIndex = tableElement.trList!.length - 1
      const targetCell = resolveTableCellByIndex({
        tableElement,
        tableIndex: index,
        trIndex: targetTrIndex,
        tdIndex: 0
      })
      const targetTd = targetCell?.td
      if (!targetTd) return
      this.draw.getCoordinate().setPositionContext({
        index,
        isTable: true,
        trIndex: targetTrIndex,
        tdIndex: targetTd.tdIndex ?? 0,
        tdId: targetTd.id,
        trId: targetCell.tr.id,
        tableId: tableElement.id
      })
      tableOperate.insertTableBottomRow()
    }
    this.overlayHost.append(rowAddBtn)
    this.toolRowAddBtn = rowAddBtn
    // 渲染列工具
    const colWidthList = renderColgroup.map(col => col.width)
    const colContainer = document.createElement('div')
    colContainer.classList.add(`${EDITOR_PREFIX}-table-tool__col`)
    colContainer.style.transform = `translateY(-${
      this.ROW_COL_OFFSET * scale
    }px)`
    colContainer.style.pointerEvents = 'auto'
    for (let c = 0; c < colWidthList.length; c++) {
      const colWidth = colWidthList[c] * scale
      const colItem = document.createElement('div')
      colItem.classList.add(`${EDITOR_PREFIX}-table-tool__col__item`)
      if (c === colIndex) {
        colItem.classList.add('active')
      }
      // 快捷列选择
      colItem.onclick = () => {
        const tdList = this.draw
          .getTableParticle()
          .getTdListByColIndex(tableElement.trList!, c)
        const firstTd = tdList[0]
        const lastTd = tdList[tdList.length - 1]
        this.draw.getCoordinate().setPositionContext({
          index,
          isTable: true,
          trIndex: firstTd.trIndex,
          tdIndex: firstTd.tdIndex,
          tableId: tableElement.id
        })
        this.range.setRange(
          0,
          0,
          tableElement.id,
          firstTd.tdIndex,
          lastTd.tdIndex,
          firstTd.trIndex,
          lastTd.trIndex
        )
        this.draw.render({
          curIndex: 0,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
        this._setAnchorActive(colContainer, c)
      }
      const colItemAnchor = document.createElement('div')
      colItemAnchor.classList.add(`${EDITOR_PREFIX}-table-tool__anchor`)
      // 列高度拖拽开始
      colItemAnchor.onmousedown = evt => {
        this._mousedown({
          evt,
          element: tableElement,
          index: c,
          order: TableOrder.COL
        })
      }
      colItem.append(colItemAnchor)
      colItem.style.width = `${colWidth}px`
      colContainer.append(colItem)
    }
    colContainer.style.left = `${tableX}px`
    colContainer.style.top = `${tableY}px`
    this.overlayHost.append(colContainer)
    this.toolColContainer = colContainer
    // 添加列按钮
    const colAddBtn = document.createElement('div')
    colAddBtn.classList.add(`${EDITOR_PREFIX}-table-tool__quick__add`)
    colAddBtn.style.left = `${tableX + tableWidth}px`
    colAddBtn.style.top = `${tableY}px`
    colAddBtn.style.transform = `translate(${
      this.ROW_COL_QUICK_OFFSET * scale
    }px, -${this.ROW_COL_QUICK_POSITION * scale}px)`
    colAddBtn.style.pointerEvents = 'auto'
    colAddBtn.onmousedown = evt => {
      evt.preventDefault()
      evt.stopPropagation()
    }
    // 快捷添加列
    colAddBtn.onclick = evt => {
      evt.preventDefault()
      evt.stopPropagation()
      const lastColIndex = tableElement.colgroup!.length - 1
      const matchedTd = this.draw
        .getTableParticle()
        .getTdListByColIndex(tableElement.trList!, lastColIndex)
        .find(td => td.rowIndex === 0)
      const defaultTdIndex = (tableElement.trList?.[0]?.tdList?.length || 1) - 1
      const targetCell = resolveTableCellByIndex({
        tableElement,
        tableIndex: index,
        trIndex: matchedTd?.trIndex ?? 0,
        tdIndex: matchedTd?.tdIndex ?? defaultTdIndex
      })
      const targetTd = targetCell?.td
      if (!targetTd) return
      this.draw.getCoordinate().setPositionContext({
        index,
        isTable: true,
        trIndex: targetTd.trIndex ?? 0,
        tdIndex: targetTd.tdIndex ?? defaultTdIndex,
        tdId: targetTd.id,
        trId: targetCell.tr.id,
        tableId: tableElement.id
      })
      tableOperate.insertTableRightCol()
    }
    this.overlayHost.append(colAddBtn)
    this.toolColAddBtn = colAddBtn
    // 渲染单元格边框拖拽工具
    const borderContainer = document.createElement('div')
    borderContainer.classList.add(`${EDITOR_PREFIX}-table-tool__border`)
    borderContainer.style.height = `${tableHeight}px`
    borderContainer.style.width = `${tableWidth}px`
    borderContainer.style.left = `${tableX}px`
    borderContainer.style.top = `${tableY}px`
    for (let r = 0; r < renderTrList.length; r++) {
      const tr = renderTrList[r]
      for (let d = 0; d < tr.tdList.length; d++) {
        const td = tr.tdList[d]
        const rowBorder = document.createElement('div')
        rowBorder.classList.add(`${EDITOR_PREFIX}-table-tool__border__row`)
        rowBorder.style.width = `${td.width! * scale}px`
        rowBorder.style.height = `${this.BORDER_VALUE}px`
        rowBorder.style.top = `${
          (td.y! + td.height!) * scale - this.BORDER_VALUE / 2
        }px`
        rowBorder.style.left = `${td.x! * scale}px`
        // 行宽度拖拽开始
        rowBorder.onmousedown = evt => {
          this._mousedown({
            evt,
            element: tableElement,
            index: td.rowIndex! + td.rowspan - 1,
            order: TableOrder.ROW
          })
        }
        borderContainer.appendChild(rowBorder)
        const colBorder = document.createElement('div')
        colBorder.classList.add(`${EDITOR_PREFIX}-table-tool__border__col`)
        colBorder.style.width = `${this.BORDER_VALUE}px`
        colBorder.style.height = `${td.height! * scale}px`
        colBorder.style.top = `${td.y! * scale}px`
        colBorder.style.left = `${
          (td.x! + td.width!) * scale - this.BORDER_VALUE / 2
        }px`
        // 列高度拖拽开始
        colBorder.onmousedown = evt => {
          this._mousedown({
            evt,
            element: tableElement,
            index: td.colIndex! + td.colspan - 1,
            order: TableOrder.COL
          })
        }
        borderContainer.appendChild(colBorder)
      }
    }
    this.overlayHost.append(borderContainer)
    this.toolBorderContainer = borderContainer
  }

  /** 更新anchor活动，同步内部状态并触发必要的界面刷新。 */
  private _setAnchorActive(container: HTMLDivElement, index: number) {
    const children = container.children
    for (let c = 0; c < children.length; c++) {
      const child = children[c]
      if (c === index) {
        child.classList.add('active')
      } else {
        child.classList.remove('active')
      }
    }
  }

  private _mousedown(payload: IAnchorMouseDown) {
    const { evt, index, order, element } = payload
    evt.preventDefault()
    evt.stopPropagation()
    this.canvas = this._resolvePageCanvas(this.currentPageNo)
    // 表格所在页可能已被虚拟滚动卸载，无法换算坐标时直接忽略本次拖拽。
    if (!this.canvas) return
    const { scale } = this.options
    const width = this.draw.getWidth()
    const height = this.draw.getHeight()
    this.mousedownX = evt.clientX
    this.mousedownY = evt.clientY
    const target = evt.target as HTMLDivElement
    const canvasRect = this.canvas.getBoundingClientRect()
    // 改变光标
    const cursor = window.getComputedStyle(target).cursor
    document.body.style.cursor = cursor
    this.canvas.style.cursor = cursor
    // 拖拽线
    let startX = 0
    let startY = 0
    const anchorLine = document.createElement('div')
    anchorLine.classList.add(`${EDITOR_PREFIX}-table-anchor__line`)
    if (order === TableOrder.ROW) {
      anchorLine.classList.add(`${EDITOR_PREFIX}-table-anchor__line__row`)
      anchorLine.style.width = `${width}px`
      startX = 0
      startY = this.mousedownY - canvasRect.top
    } else {
      anchorLine.classList.add(`${EDITOR_PREFIX}-table-anchor__line__col`)
      anchorLine.style.height = `${height}px`
      startX = this.mousedownX - canvasRect.left
      startY = 0
    }
    anchorLine.style.left = `${startX}px`
    anchorLine.style.top = `${startY}px`
    anchorLine.style.pointerEvents = 'none'
    ;(this.overlayHost || this.container).append(anchorLine)
    this.anchorLine = anchorLine
    // 追加全局事件
    let dx = 0
    let dy = 0
    const mousemoveFn = (evt: MouseEvent) => {
      const movePosition = this._mousemove(evt, order, startX, startY)
      if (movePosition) {
        dx = movePosition.dx
        dy = movePosition.dy
      }
    }
    document.addEventListener('mousemove', mousemoveFn)
    document.addEventListener(
      'mouseup',
      () => {
        let isChangeSize = false
        // 改变尺寸
        if (order === TableOrder.ROW) {
          let deltaY = dy / scale
          const trList = element.trList!
          const tr = trList[index] || trList[index - 1]
          // 最大移动高度-向上移动超出最小高度限定，则减少移动量
          const { defaultTrMinHeight } = this.options.table
          if (deltaY < 0 && tr.height + deltaY < defaultTrMinHeight) {
            deltaY = defaultTrMinHeight - tr.height
          }
          if (deltaY) {
            tr.height += deltaY
            tr.minHeight = tr.height
            isChangeSize = true
          }
        } else {
          const { colgroup } = element
          if (colgroup && dx) {
            let deltaX = dx / scale
            // 宽度分配
            const innerWidth = this.draw.getInnerWidth()
            const curColWidth = colgroup[index].width
            // 最小移动距离计算-如果向左移动：使单元格小于最小宽度，则减少移动量
            if (deltaX < 0 && curColWidth + deltaX < this.MIN_TD_WIDTH) {
              deltaX = this.MIN_TD_WIDTH - curColWidth
            }
            // 最大移动距离计算-如果向右移动：使后面一个单元格小于最小宽度，则减少移动量
            const nextColWidth = colgroup[index + 1]?.width
            if (
              deltaX > 0 &&
              nextColWidth &&
              nextColWidth - deltaX < this.MIN_TD_WIDTH
            ) {
              deltaX = nextColWidth - this.MIN_TD_WIDTH
            }
            const moveColWidth = curColWidth + deltaX
            // 开始移动，只有表格的最后一列线才会改变表格的宽度，其他场景不用计算表格超出
            if (index === colgroup.length - 1) {
              let moveTableWidth = 0
              for (let c = 0; c < colgroup.length; c++) {
                const group = colgroup[c]
                // 下一列减去偏移量
                if (c === index + 1) {
                  moveTableWidth -= deltaX
                }
                // 当前列加上偏移量
                if (c === index) {
                  moveTableWidth += moveColWidth
                }
                if (c !== index) {
                  moveTableWidth += group.width
                }
              }
              if (moveTableWidth > innerWidth) {
                const tableWidth = element.width!
                deltaX = innerWidth - tableWidth
              }
            }
            if (deltaX) {
              // 当前列增加，后列减少
              if (colgroup.length - 1 !== index) {
                colgroup[index + 1].width -= deltaX
              }
              colgroup[index].width += deltaX
              isChangeSize = true
            }
          }
        }
        if (isChangeSize) {
          this.draw.render({ isSetCursor: false })
        }
        // 还原副作用
        anchorLine.remove()
        document.removeEventListener('mousemove', mousemoveFn)
        document.body.style.cursor = ''
        this.canvas && (this.canvas.style.cursor = 'text')
      },
      {
        once: true
      }
    )
  }

  private _mousemove(
    evt: MouseEvent,
    tableOrder: TableOrder,
    startX: number,
    startY: number
  /** dx数值，用于当前布局、统计或索引计算。 */
  ): { dx: number; dy: number } | null {
    if (!this.anchorLine) return null
    const dx = evt.clientX - this.mousedownX
    const dy = evt.clientY - this.mousedownY
    if (tableOrder === TableOrder.ROW) {
      this.anchorLine.style.top = `${startY + dy}px`
    } else {
      this.anchorLine.style.left = `${startX + dx}px`
    }
    evt.preventDefault()
    return { dx, dy }
  }
}
