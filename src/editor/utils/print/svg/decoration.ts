import { ZERO } from '../../../dataset/constant/Common'
import { ulStyleMapping } from '../../../dataset/constant/List'
import { ElementType } from '../../../dataset/enum/Element'
import { ListStyle, ListType, UlStyle } from '../../../dataset/enum/List'
import { TextDecorationStyle } from '../../../dataset/enum/Text'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { escapePrintSvgText } from './core'
import {
  createPrintSvgCircle,
  createPrintSvgRect,
  createPrintSvgStrokePath,
  IPrintSvgStrokeSegment
} from './shape'
function isPrintSvgSeparatorElement(element?: IElement) {
  return element?.type === ElementType.SEPARATOR
}

/** 创建分隔线 SVG，恢复 SeparatorParticle 的可见线条。 */
function createPrintSvgSeparator(
  position: IElementPosition,
  options?: DeepRequired<IEditorOption>
) {
  const element = position.element
  if (!isPrintSvgSeparatorElement(element)) return ''
  const scale = options?.scale || 1
  const lineWidth = (options?.separator.lineWidth || 1) * scale
  const strokeStyle = element?.color || options?.separator.strokeStyle || '#000000'
  const x = position.coordinate.leftTop[0]
  const y = Math.round(position.coordinate.leftTop[1]) + lineWidth / 2
  const width = (element?.width || position.metrics.width) * scale
  return createPrintSvgStrokePath({
    segmentList: [{ from: [x, y], to: [x + width, y] }],
    stroke: strokeStyle,
    lineWidth,
    lineDash: element?.dashArray
  })
}

/** 创建复选框 SVG，恢复 CheckboxParticle 的方框和勾选态。 */
function createPrintSvgCheckbox(
  position: IElementPosition,
  options?: DeepRequired<IEditorOption>
) {
  const element = position.element
  if (element?.type !== ElementType.CHECKBOX) return ''
  const scale = options?.scale || 1
  const checkbox = options?.checkbox
  const gap = (checkbox?.gap || 0) * scale
  const lineWidth = checkbox?.lineWidth || 1
  const fillStyle = checkbox?.fillStyle || '#000000'
  const strokeStyle = checkbox?.strokeStyle || '#ffffff'
  const left = Math.round(position.coordinate.leftTop[0] + gap)
  const top = Math.round(
    position.coordinate.leftTop[1] + position.ascent - position.metrics.height + lineWidth
  )
  const width = Math.max(0, position.metrics.width - gap * 2)
  const height = position.metrics.height
  const contentList = [
    createPrintSvgRect({
      x: left,
      y: top,
      width,
      height,
      stroke: fillStyle,
      strokeWidth: lineWidth,
      fill: element.checkbox?.value ? fillStyle : undefined
    })
  ]
  if (element.checkbox?.value) {
    contentList.push(
      createPrintSvgStrokePath({
        segmentList: [
          {
            from: [left + 2 * scale, top + height / 2],
            to: [left + width / 2, top + height - 3 * scale]
          },
          {
            from: [left + width / 2, top + height - 3 * scale],
            to: [left + width - 2 * scale, top + 3 * scale]
          }
        ],
        stroke: strokeStyle,
        lineWidth: lineWidth * 2 * scale
      })
    )
  }
  return contentList.join('')
}

/** 创建单选框 SVG，恢复 RadioParticle 的圆形和选中态。 */
function createPrintSvgRadio(
  position: IElementPosition,
  options?: DeepRequired<IEditorOption>
) {
  const element = position.element
  if (element?.type !== ElementType.RADIO) return ''
  const scale = options?.scale || 1
  const radio = options?.radio
  const gap = (radio?.gap || 0) * scale
  const lineWidth = radio?.lineWidth || 1
  const fillStyle = radio?.fillStyle || '#000000'
  const strokeStyle = element.radio?.value ? fillStyle : radio?.strokeStyle || '#000000'
  const left = Math.round(position.coordinate.leftTop[0] + gap)
  const top = Math.round(
    position.coordinate.leftTop[1] + position.ascent - position.metrics.height + lineWidth
  )
  const width = Math.max(0, position.metrics.width - gap * 2)
  const height = position.metrics.height
  const cx = left + width / 2
  const cy = top + height / 2
  const contentList = [
    createPrintSvgCircle({
      cx,
      cy,
      r: width / 2,
      stroke: strokeStyle,
      strokeWidth: lineWidth
    })
  ]
  if (element.radio?.value) {
    contentList.push(
      createPrintSvgCircle({
        cx,
        cy,
        r: width / 3,
        fill: fillStyle
      })
    )
  }
  return contentList.join('')
}

/** 创建文本装饰线 SVG，支持双线、虚线、点线、波浪线和删除线。 */
function createPrintSvgTextDecoration(
  row: IRow,
  position: IElementPosition,
  options?: DeepRequired<IEditorOption>
) {
  const element = position.element
  if (!element) return ''
  const scale = options?.scale || 1
  const contentList: string[] = []
  const elementLeft = (element as IElement & { left?: number }).left || 0
  const x = position.coordinate.leftTop[0] - elementLeft
  const width = position.metrics.width + elementLeft
  if (element.underline || element.control?.underline) {
    const style = element.textDecoration?.style
    const y = Math.floor(position.coordinate.leftTop[1] + row.height - 2 * scale) + 0.5
    const stroke = element.control?.underline
      ? options?.underlineColor || element.color || '#000000'
      : element.color || options?.underlineColor || '#000000'
    if (style === TextDecorationStyle.WAVY) {
      const segmentList: IPrintSvgStrokeSegment[] = []
      let prevPoint: [number, number] = [x, y]
      for (let i = 1; i <= Math.max(1, Math.ceil(width)); i++) {
        const point: [number, number] = [
          x + Math.min(i, width),
          y + 1.2 * scale * Math.sin(i / scale)
        ]
        segmentList.push({ from: prevPoint, to: point })
        prevPoint = point
      }
      contentList.push(
        createPrintSvgStrokePath({ segmentList, stroke, lineWidth: scale })
      )
    } else {
      const segmentList: IPrintSvgStrokeSegment[] = [
        { from: [x, y], to: [x + width, y] }
      ]
      if (style === TextDecorationStyle.DOUBLE) {
        segmentList.push({ from: [x, y + 3 * scale], to: [x + width, y + 3 * scale] })
      }
      contentList.push(
        createPrintSvgStrokePath({
          segmentList,
          stroke,
          lineWidth: scale,
          lineDash:
            style === TextDecorationStyle.DASHED
              ? [3, 1]
              : style === TextDecorationStyle.DOTTED
                ? [1, 1]
                : undefined
        })
      )
    }
  }
  if (element.strikeout) {
    const y = position.coordinate.leftTop[1] + position.ascent - position.metrics.height / 2
    contentList.push(
      createPrintSvgStrokePath({
        segmentList: [{ from: [x, y], to: [x + width, y] }],
        stroke: options?.strikeoutColor || element.color || '#000000',
        lineWidth: scale
      })
    )
  }
  return contentList.join('')
}

/** 创建控件边框 SVG，按 controlId 合并连续控件片段。 */
function createPrintSvgControlBorderContent(
  row: IRow,
  rowPositionList: IElementPosition[],
  options?: DeepRequired<IEditorOption>
) {
  const contentList: string[] = []
  let index = 0
  while (index < row.elementList.length) {
    const element = row.elementList[index]
    const rowPosition = rowPositionList[index]
    if (!element.control?.border || !element.controlId || !rowPosition) {
      index++
      continue
    }
    const controlId = element.controlId
    const startPosition = rowPosition
    let width = 0
    let endIndex = index
    while (
      endIndex < row.elementList.length &&
      row.elementList[endIndex].controlId === controlId &&
      row.elementList[endIndex].control?.border
    ) {
      width += row.elementList[endIndex].metrics?.width || 0
      endIndex++
    }
    const scale = options?.scale || 1
    contentList.push(
      createPrintSvgRect({
        x: startPosition.coordinate.leftTop[0],
        y: startPosition.coordinate.leftTop[1] + scale,
        width,
        height: row.height - 2 * scale,
        stroke: options?.control.borderColor || '#000000',
        strokeWidth: (options?.control.borderWidth || 1) * scale
      })
    )
    index = endIndex
  }
  return contentList.join('')
}

/** 创建分组背景 SVG，恢复 Group 粒子的非交互背景。 */
function createPrintSvgGroupBackgroundContent(
  row: IRow,
  rowPositionList: IElementPosition[],
  options?: DeepRequired<IEditorOption>
) {
  const group = options?.group
  if (!group) return ''
  const rectMap = new Map<string, { x: number; y: number; width: number; height: number }>()
  row.elementList.forEach((element, index) => {
    const rowPosition = rowPositionList[index]
    if (!element.groupIds?.length || !rowPosition) return
    element.groupIds.forEach(groupId => {
      const rect = rectMap.get(groupId)
      if (!rect) {
        rectMap.set(groupId, {
          x: rowPosition.coordinate.leftTop[0],
          y: rowPosition.coordinate.leftTop[1],
          width: element.metrics.width,
          height: row.height
        })
      } else {
        rect.width += element.metrics.width
        rect.height = Math.max(rect.height, row.height)
      }
    })
  })
  return Array.from(rectMap.values())
    .map(rect =>
      createPrintSvgRect({
        ...rect,
        fill: group.backgroundColor,
        opacity: group.opacity
      })
    )
    .join('')
}

/** 创建列表符号 SVG，恢复有序、无序和清单列表的行首粒子。 */
function createPrintSvgListMarker(
  row: IRow,
  rowStartPosition: IElementPosition,
  options?: DeepRequired<IEditorOption>
) {
  const startElement = row.elementList[0]
  if (!row.isList || startElement.value !== ZERO || startElement.listWrap) {
    return ''
  }
  const scale = options?.scale || 1
  const defaultTabWidth = options?.defaultTabWidth || 32
  const levelIndent = (startElement.listLevel || 0) * defaultTabWidth * scale
  const x = rowStartPosition.coordinate.leftTop[0] - (row.offsetX || 0) + levelIndent
  const y = rowStartPosition.coordinate.leftTop[1] + row.ascent
  if (startElement.listStyle === ListStyle.CHECKBOX) {
    return createPrintSvgCheckbox({
      ...rowStartPosition,
      element: {
        ...startElement,
        type: ElementType.CHECKBOX,
        checkbox: { value: !!startElement.checkbox?.value }
      },
      coordinate: {
        ...rowStartPosition.coordinate,
        leftTop: [x, rowStartPosition.coordinate.leftTop[1]]
      }
    })
  }
  const markerText =
    startElement.listType === ListType.UL
      ? ulStyleMapping[
          startElement.listStyle === ListStyle.CHECKBOX
            ? UlStyle.CHECKBOX
            : [UlStyle.DISC, UlStyle.CIRCLE, UlStyle.SQUARE][
                (startElement.listLevel || 0) % 3
              ]
        ] || ulStyleMapping[UlStyle.DISC]
      : `${(row.listIndex || 0) + 1}.`
  return `<text x="${x}" y="${y}" font-family="${escapePrintSvgText(options?.defaultFont || 'Microsoft YaHei')}" font-size="${options?.defaultSize || 16}" fill="${escapePrintSvgText(options?.defaultColor || '#000000')}">${escapePrintSvgText(markerText)}</text>`
}

/** 创建一页的行级装饰 SVG，按现有 pageRowList 和 positionList 对齐。 */
export function createPrintSvgRowDecorationContent(payload: {
  /** 当前页行列表。 */
  pageRows?: IRow[]
  /** 当前页位置列表。 */
  pagePositionList: IElementPosition[]
  /** 编辑器配置。 */
  options?: DeepRequired<IEditorOption>
}) {
  const { pageRows, pagePositionList, options } = payload
  if (!pageRows?.length) return ''
  const beforeTextList: string[] = []
  const afterTextList: string[] = []
  let rowPositionOffset = 0
  pageRows.forEach(row => {
    const rowPositionList = pagePositionList.slice(
      rowPositionOffset,
      rowPositionOffset + row.elementList.length
    )
    rowPositionOffset += row.elementList.length
    beforeTextList.push(createPrintSvgGroupBackgroundContent(row, rowPositionList, options))
    row.elementList.forEach((element, index) => {
      const rowPosition = rowPositionList[index]
      if (!rowPosition) return
      beforeTextList.push(createPrintSvgSeparator(rowPosition, options))
      beforeTextList.push(createPrintSvgCheckbox(rowPosition, options))
      beforeTextList.push(createPrintSvgRadio(rowPosition, options))
      afterTextList.push(createPrintSvgTextDecoration(row, rowPosition, options))
      if (element.type === ElementType.TAB && element.metrics?.tabStopAlignment === 'bar') {
        const x = rowPosition.coordinate.leftTop[0] + element.metrics.width
        afterTextList.push(
          createPrintSvgStrokePath({
            segmentList: [
              {
                from: [x, rowPosition.coordinate.leftTop[1]],
                to: [x, rowPosition.coordinate.leftBottom[1]]
              }
            ],
            stroke: element.color || options?.defaultColor || '#000000',
            lineWidth: Math.max(1, options?.scale || 1)
          })
        )
      }
    })
    beforeTextList.push(createPrintSvgControlBorderContent(row, rowPositionList, options))
    if (row.isList && rowPositionList[0]) {
      beforeTextList.push(createPrintSvgListMarker(row, rowPositionList[0], options))
    }
  })
  return `${beforeTextList.join('')}${afterTextList.join('')}`
}

