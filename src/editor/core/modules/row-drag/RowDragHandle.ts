import { ZERO } from '../../../dataset/constant/Common'
import { EditorMode, EditorZone } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../interface/Draw'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import type { Draw } from '../../draw/Draw'
import {
  isParagraphEndBoundary,
  isParagraphStartBoundary
} from '../paragraph/selection/ParagraphBoundaryPolicy'
import { isEditorDisabled } from '../../shared/utils/editorState'

/** 行draghandlebounds契约，用于约束内部流程中传递的数据结构。 */
export interface IRowDragHandleBounds {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/** resolved行draghandle契约，用于约束内部流程中传递的数据结构。 */
export interface IResolvedRowDragHandle {
  /** 边界矩形，用于描述元素或选区占据的空间范围。 */
  bounds: IRowDragHandleBounds
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
  /** 光标元素索引，用于定位插入点所在元素。 */
  cursorIndex: number
}

/** HANDLE WIDTH 固定宽度，用于保持绘制尺寸一致。 */
const HANDLE_WIDTH = 14
/** HANDLE HEIGHT 固定高度，用于保持绘制尺寸一致。 */
const HANDLE_HEIGHT = 22
/** HANDLE GAP 间距常量，用于控制元素排布距离。 */
const HANDLE_GAP = 4
// HANDLE RADIUS 半径，用于绘制圆角或拖拽手柄。
const HANDLE_RADIUS = 4
// DOT RADIUS 半径，用于绘制圆角或拖拽手柄。
const DOT_RADIUS = 1
// DOT GAP X 间距，用于控制图形点位或文本装饰的距离。
const DOT_GAP_X = 4.5
// DOT GAP Y 间距，用于控制图形点位或文本装饰的距离。
const DOT_GAP_Y = 5
// HANDLE FILL 填充色，用于绘制对应图形的内部颜色。
const HANDLE_FILL = '#F3F4F6'
// HANDLE STROKE 描边色，用于绘制对应图形的边界颜色。
const HANDLE_STROKE = '#D1D5DB'
// DOT FILL 填充色，用于绘制对应图形的内部颜色。
const DOT_FILL = '#6B7280'

function getRowVisualBounds(
  row: IRow,
  rowPositionList: IElementPosition[]
) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let i = 0; i < rowPositionList.length; i++) {
    const position = rowPositionList[i]
    if (!position) continue
    minX = Math.min(minX, position.coordinate.leftTop[0] - (position.left || 0))
    minY = Math.min(minY, position.coordinate.leftTop[1])
    maxY = Math.max(maxY, position.coordinate.leftTop[1] + row.height)
  }
  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxY)
  ) {
    return null
  }
  return {
    x: row.isList && row.offsetX ? minX - row.offsetX : minX,
    y: minY,
    height: maxY - minY
  }
}

export function getIsTitleRow(payload: {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 行位置列表，保存每行的坐标和高度信息。 */
  rowPositionList: IElementPosition[]
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row?: IRow
}) {
  const { elementList, rowPositionList, row } = payload
  return (
    row?.elementList.some(element => getIsTitleElement(element)) ||
    rowPositionList.some(position => {
      const element = elementList[position.index]
      return getIsTitleElement(element)
    })
  )
}

export function getIsTitleElement(element?: IElement | null) {
  return !!element?.titleId || element?.type === ElementType.TITLE
}

export function getRowDragHandleBounds(payload: {
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 行位置列表，保存每行的坐标和高度信息。 */
  rowPositionList: IElementPosition[]
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale: number
}): IRowDragHandleBounds | null {
  const { row, rowPositionList, scale } = payload
  const rowBounds = getRowVisualBounds(row, rowPositionList)
  if (!rowBounds) return null
  const width = HANDLE_WIDTH * scale
  const height = Math.min(HANDLE_HEIGHT * scale, Math.max(rowBounds.height, 12 * scale))
  return {
    x: rowBounds.x - HANDLE_GAP * scale - width,
    y: rowBounds.y + (rowBounds.height - height) / 2,
    width,
    height
  }
}

function shouldEnableRowDragHandle(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 行位置列表，保存每行的坐标和高度信息。 */
  rowPositionList: IElementPosition[]
  /** 表格单元格上下文，保存命中单元格及其逻辑位置。 */
  tableCellContext?: IDrawRowPayload['tableCellContext']
}) {
  const { draw, row, rowPositionList, tableCellContext } = payload
  if (tableCellContext) return false
  if (isEditorDisabled(draw)) return false
  const mode = draw.getMode()
  if (mode === EditorMode.CLEAN || mode === EditorMode.PRINT) return false
  if (!row.elementList.length || !rowPositionList.length) return false
  const elementList = draw.getObjectResolver().getLayoutMainElementList()
  if (getIsTitleRow({ elementList, rowPositionList, row })) {
    return false
  }
  if (row.startIndex > 0) {
    const preElement = elementList[row.startIndex - 1]
    const startElement = row.elementList[0]
    if (
      !(
        startElement.value === ZERO ||
        isParagraphStartBoundary(startElement, preElement)
      )
    ) {
      return false
    }
  }
  if (row.elementList.some(element => element.type === ElementType.TABLE)) {
    return false
  }
  return true
}

export function resolveRowDragParagraphRange(payload: {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 行位置列表，保存每行的坐标和高度信息。 */
  rowPositionList: IElementPosition[]
}) {
  const { elementList, rowPositionList } = payload
  const firstContentPosition =
    rowPositionList.find(position => {
      const element = elementList[position.index]
      return element && element.value !== ZERO
    }) || rowPositionList[0]
  if (!firstContentPosition) return null
  const paragraphRange = resolveParagraphRange(
    elementList,
    firstContentPosition.index
  )
  if (!paragraphRange) return null
  return {
    ...paragraphRange,
    cursorIndex: firstContentPosition.index,
    firstContentIndex: firstContentPosition.index
  }
}

function isParagraphFirstVisualRow(payload: {
  /** 行位置列表，保存每行的坐标和高度信息。 */
  rowPositionList: IElementPosition[]
  /** paragraph范围，用于描述布局或命中的空间范围。 */
  paragraphRange: {
    /** 起始元素索引，用于确定处理范围的左边界。 */
    startIndex: number
    /** 结束元素索引，用于确定处理范围的右边界。 */
    endIndex: number
    /** first内容索引，用于定位对应元素、行或片段。 */
    firstContentIndex: number
  }
}) {
  const { rowPositionList, paragraphRange } = payload
  return rowPositionList.some(
    position => position.index === paragraphRange.firstContentIndex
  )
}

export function isRowDragHandleVisible(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 行位置列表，保存每行的坐标和高度信息。 */
  rowPositionList: IElementPosition[]
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
}) {
  const { draw, rowPositionList, zone = EditorZone.MAIN } = payload
  const range = draw.getRange().getEditBoundaryRange()
  if (range.isCrossRowCol) {
    return false
  }
  if (range.zone && range.zone !== zone) {
    return false
  }
  const elementList = draw.getObjectResolver().getLayoutMainElementList()
  const rowParagraphRange = resolveRowDragParagraphRange({
    elementList,
    rowPositionList
  })
  if (!rowParagraphRange) return false
  if (
    !isParagraphFirstVisualRow({
      rowPositionList,
      paragraphRange: rowParagraphRange
    })
  ) {
    return false
  }
  if (range.startIndex === range.endIndex) {
    return (
      rowParagraphRange.startIndex <= range.startIndex &&
      range.startIndex <= rowParagraphRange.endIndex
    )
  }
  const startIndex = Math.min(range.startIndex, range.endIndex) + 1
  const endIndex = Math.max(range.startIndex, range.endIndex)
  return rowPositionList.some(position => {
    const index = position?.index
    return index !== undefined && startIndex <= index && index <= endIndex
  })
}

function resolveParagraphRange(elementList: IElement[], cursorIndex: number) {
  if (!elementList[cursorIndex]) return null
  let contentStartIndex = cursorIndex
  while (contentStartIndex > 0) {
    const element = elementList[contentStartIndex]
    const preElement = elementList[contentStartIndex - 1]
    if (isParagraphStartBoundary(element, preElement)) {
      break
    }
    contentStartIndex--
  }
  let endIndex = cursorIndex
  while (endIndex < elementList.length - 1) {
    const element = elementList[endIndex]
    const nextElement = elementList[endIndex + 1]
    if (isParagraphEndBoundary(element, nextElement)) {
      break
    }
    endIndex++
  }
  if (elementList[endIndex]?.value === ZERO && endIndex > contentStartIndex) {
    endIndex--
  }
  const startIndex = Math.max(0, contentStartIndex - 1)
  if (startIndex > endIndex) return null
  return {
    startIndex,
    endIndex
  }
}

export function resolveRowDragHandleAtPoint(payload: {
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
}): IResolvedRowDragHandle | null {
  const { draw, x, y, pageNo } = payload
  const rowList = draw.getPageRowList()[pageNo] || []
  const positionList = draw.getCoordinate().getLayoutMainPositionListByPage(pageNo)
  const elementList = draw.getObjectResolver().getLayoutMainElementList()
  const { scale } = draw.getOptions()
  let rowPositionOffset = 0
  for (let i = 0; i < rowList.length; i++) {
    const row = rowList[i]
    const rowPositionList = positionList.slice(
      rowPositionOffset,
      rowPositionOffset + row.elementList.length
    )
    rowPositionOffset += row.elementList.length
    if (!shouldEnableRowDragHandle({ draw, row, rowPositionList })) continue
    if (!isRowDragHandleVisible({ draw, rowPositionList })) continue
    const bounds = getRowDragHandleBounds({ row, rowPositionList, scale })
    if (!bounds) continue
    if (
      x < bounds.x ||
      x > bounds.x + bounds.width ||
      y < bounds.y ||
      y > bounds.y + bounds.height
    ) {
      continue
    }
    const paragraphRange = resolveRowDragParagraphRange({
      elementList,
      rowPositionList
    })
    if (!paragraphRange) continue
    if (
      !isParagraphFirstVisualRow({
        rowPositionList,
        paragraphRange
      })
    ) {
      continue
    }
    return {
      bounds,
      row,
      cursorIndex: paragraphRange.cursorIndex,
      startIndex: paragraphRange.startIndex,
      endIndex: paragraphRange.endIndex
    }
  }
  return null
}

export function renderRowDragHandle(payload: {
  /** Canvas 2D 上下文，用于执行当前绘制指令。 */
  ctx: CanvasRenderingContext2D
  /** 绘制核心实例，提供布局、渲染和命中查询能力。 */
  draw: Draw
  /** 行布局对象，保存当前行的元素和坐标信息。 */
  row: IRow
  /** 行位置列表，保存每行的坐标和高度信息。 */
  rowPositionList: IElementPosition[]
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: EditorZone
  /** 表格单元格上下文，保存命中单元格及其逻辑位置。 */
  tableCellContext?: IDrawRowPayload['tableCellContext']
}) {
  const { ctx, draw, row, rowPositionList, zone, tableCellContext } = payload
  if (!shouldEnableRowDragHandle({ draw, row, rowPositionList, tableCellContext })) {
    return
  }
  if (!isRowDragHandleVisible({ draw, rowPositionList, zone })) {
    return
  }
  const { scale } = draw.getOptions()
  const bounds = getRowDragHandleBounds({ row, rowPositionList, scale })
  if (!bounds) return
  const radius = HANDLE_RADIUS * scale
  ctx.save()
  ctx.fillStyle = HANDLE_FILL
  ctx.strokeStyle = HANDLE_STROKE
  ctx.lineWidth = Math.max(1, scale)
  ctx.beginPath()
  ctx.moveTo(bounds.x + radius, bounds.y)
  ctx.lineTo(bounds.x + bounds.width - radius, bounds.y)
  ctx.quadraticCurveTo(
    bounds.x + bounds.width,
    bounds.y,
    bounds.x + bounds.width,
    bounds.y + radius
  )
  ctx.lineTo(bounds.x + bounds.width, bounds.y + bounds.height - radius)
  ctx.quadraticCurveTo(
    bounds.x + bounds.width,
    bounds.y + bounds.height,
    bounds.x + bounds.width - radius,
    bounds.y + bounds.height
  )
  ctx.lineTo(bounds.x + radius, bounds.y + bounds.height)
  ctx.quadraticCurveTo(
    bounds.x,
    bounds.y + bounds.height,
    bounds.x,
    bounds.y + bounds.height - radius
  )
  ctx.lineTo(bounds.x, bounds.y + radius)
  ctx.quadraticCurveTo(bounds.x, bounds.y, bounds.x + radius, bounds.y)
  ctx.fill()
  ctx.stroke()

  const dotRadius = DOT_RADIUS * scale
  const dotGapX = DOT_GAP_X * scale
  const dotGapY = DOT_GAP_Y * scale
  const centerX = bounds.x + bounds.width / 2
  const centerY = bounds.y + bounds.height / 2
  ctx.fillStyle = DOT_FILL
  for (let column = 0; column < 2; column++) {
    for (let rowIndex = 0; rowIndex < 3; rowIndex++) {
      ctx.beginPath()
      ctx.arc(
        centerX + (column - 0.5) * dotGapX,
        centerY + (rowIndex - 1) * dotGapY,
        dotRadius,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }
  ctx.restore()
}
