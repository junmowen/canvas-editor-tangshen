import { ZERO } from '../../../dataset/constant/Common'
import { ulStyleMapping } from '../../../dataset/constant/List'
import { ElementType } from '../../../dataset/enum/Element'
import { KeyMap } from '../../../dataset/enum/KeyMap'
import { ListStyle, ListType, UlStyle } from '../../../dataset/enum/List'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { IRow, IRowElement } from '../../../interface/Row'
import { getUUID } from '../../../utils'
import { RangeManager } from '../../range/RangeManager'
import { Draw } from '../Draw'

/**
 * 列表粒子。
 *
 * 负责列表的设置、取消、渲染和测量。
 */
export class ListParticle {
  /** Draw 门面对象 */
  private draw: Draw
  /** 范围管理器 */
  private range: RangeManager
  /** 编辑器选项 */
  private options: DeepRequired<IEditorOption>

  /** 非递增样式的默认宽度 */
  private readonly UN_COUNT_STYLE_WIDTH = 20
  /** 测量基准文本 */
  private readonly MEASURE_BASE_TEXT = '0'
  /** 列表间距 */
  private readonly LIST_GAP = 10
  /** 列表子层级缩进。 */
  private readonly LIST_LEVEL_INDENT_RATIO = 1

  /**
   * 构造函数。
   *
   * @param draw - Draw 门面对象
   */
  constructor(draw: Draw) {
    this.draw = draw
    this.range = draw.getRange()
    this.options = draw.getOptions()
  }

  /**
   * 设置列表。
   *
   * 为选中的段落设置列表类型和样式。
   *
   * @param listType - 列表类型
   * @param listStyle - 列表样式
   */
  public setList(listType: ListType | null, listStyle?: ListStyle) {
    // 只读模式下不处理
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range.getRangeParagraphElementList()
    if (!changeElementList || !changeElementList.length) return
    // 如果包含列表则设置为取消列表
    const isUnsetList = changeElementList.find(
      el => el.listType === listType && el.listStyle === listStyle
    )
    if (isUnsetList || !listType) {
      this.unsetList()
      return
    }
    // 设置列表值
    const listId = getUUID()
    changeElementList.forEach(el => {
      el.listId = listId
      el.listType = listType
      el.listStyle = listStyle
      el.listLevel = 0
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public unsetList() {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return
    // 如果列表最后字符不是换行符则需插入换行符
    const elementList = this.draw.getElementList()
    const endElement = elementList[endIndex]
    if (endElement?.listId) {
      let start = endIndex + 1
      while (start < elementList.length) {
        const element = elementList[start]
        if (element.value === ZERO && !element.listWrap) break
        if (element.listId !== endElement.listId) {
          this.draw.spliceElementList(elementList, start, 0, [
            {
              value: ZERO
            }
          ])
          break
        }
        start++
      }
    }
    // 取消设置
    changeElementList.forEach(el => {
      delete el.listId
      delete el.listType
      delete el.listStyle
      delete el.listLevel
      delete el.listWrap
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  public indentList(delta: 1 | -1): boolean {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return false
    const { startIndex, endIndex } = this.range.getEditBoundaryRange()
    if (!~startIndex && !~endIndex) return false
    const changeElementList = this.range
      .getRangeParagraphElementList()
      ?.filter(el => el.listId)
    if (!changeElementList || !changeElementList.length) return false
    let hasChanged = false
    changeElementList.forEach(el => {
      const nextLevel = Math.max(0, (el.listLevel || 0) + delta)
      if (nextLevel !== (el.listLevel || 0)) {
        el.listLevel = nextLevel
        hasChanged = true
      }
    })
    if (!hasChanged) return true
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
    return true
  }

  public computeListStyle(
    ctx: CanvasRenderingContext2D,
    elementList: IElement[]
  ): Map<string, number> {
    const listStyleMap = new Map<string, number>()
    let start = 0
    if (!elementList[start]) {
      return listStyleMap
    }
    let curListKey = this.getListStyleKey(elementList[start])
    let curElementList: IElement[] = []
    const elementLength = elementList.length
    while (start < elementLength) {
      const curElement = elementList[start]
      const curListStyleKey = this.getListStyleKey(curElement)
      if (curListKey && curListKey === curListStyleKey) {
        curElementList.push(curElement)
      } else {
        if (curListStyleKey && curListStyleKey !== curListKey) {
          // 列表结束
          if (curElementList.length) {
            const width = this.getListStyleWidth(ctx, curElementList)
            listStyleMap.set(curListKey!, width)
          }
          curListKey = curListStyleKey
          curElementList = curListKey ? [curElement] : []
        }
      }
      start++
    }
    if (curElementList.length) {
      const width = this.getListStyleWidth(ctx, curElementList)
      listStyleMap.set(curListKey!, width)
    }
    return listStyleMap
  }

  public getListStyleKey(element?: IElement): string | null {
    if (!element?.listId) return null
    return `${element.listId}:${element.listLevel || 0}`
  }

  public getListStyleWidth(
    ctx: CanvasRenderingContext2D,
    listElementList: IElement[]
  ): number {
    const { scale, checkbox, defaultTabWidth } = this.options
    const startElement = listElementList[0]
    const levelIndent =
      (startElement.listLevel || 0) * defaultTabWidth * scale *
      this.LIST_LEVEL_INDENT_RATIO
    // 非递增样式返回固定值
    if (
      startElement.listStyle &&
      startElement.listStyle !== ListStyle.DECIMAL
    ) {
      if (startElement.listStyle === ListStyle.CHECKBOX) {
        return levelIndent + (checkbox.width + this.LIST_GAP) * scale
      }
      return levelIndent + this.UN_COUNT_STYLE_WIDTH * scale
    }
    // 计算列表数量
    const count = listElementList.reduce((pre, cur) => {
      if (cur.value === ZERO) {
        pre += 1
      }
      return pre
    }, 0)
    if (!count) return 0
    // 以递增样式最大宽度为准
    const text = `${this.MEASURE_BASE_TEXT.repeat(String(count).length)}${
      KeyMap.PERIOD
    }`
    const textMetrics = ctx.measureText(text)
    return levelIndent + Math.ceil((textMetrics.width + this.LIST_GAP) * scale)
  }

  public drawListStyle(
    ctx: CanvasRenderingContext2D,
    row: IRow,
    position: IElementPosition
  ) {
    const { elementList, offsetX, listIndex, ascent } = row
    const startElement = elementList[0]
    if (startElement.value !== ZERO || startElement.listWrap) return
    // tab width
    let tabWidth = 0
    const { defaultTabWidth, scale, defaultFont, defaultSize } = this.options
    const levelIndent =
      (startElement.listLevel || 0) * defaultTabWidth * scale *
      this.LIST_LEVEL_INDENT_RATIO
    for (let i = 1; i < elementList.length; i++) {
      const element = elementList[i]
      if (element?.type !== ElementType.TAB) break
      tabWidth += defaultTabWidth * scale
    }
    // 列表样式渲染
    const {
      coordinate: {
        leftTop: [startX, startY]
      }
    } = position
    const x = startX - offsetX! + levelIndent + tabWidth
    const y = startY + ascent
    // 复选框样式特殊处理
    if (startElement.listStyle === ListStyle.CHECKBOX) {
      const { width, height, gap } = this.options.checkbox
      const checkboxRowElement: IRowElement = {
        ...startElement,
        checkbox: {
          value: !!startElement.checkbox?.value
        },
        metrics: {
          ...startElement.metrics,
          width: (width + gap * 2) * scale,
          height: height * scale
        }
      }
      this.draw.getCheckboxParticle().render({
        ctx,
        x: x - gap * scale,
        y,
        index: 0,
        row: {
          ...row,
          elementList: [checkboxRowElement, ...row.elementList]
        }
      })
    } else {
      let text = ''
      if (startElement.listType === ListType.UL) {
        text = this.getUlStyleText(startElement)
      } else {
        text = `${listIndex! + 1}${KeyMap.PERIOD}`
      }
      if (!text) return
      ctx.save()
      ctx.font = `${defaultSize * scale}px ${defaultFont}`
      ctx.fillText(text, x, y)
      ctx.restore()
    }
  }

  private getUlStyleText(element: IElement) {
    if (element.listStyle === ListStyle.CHECKBOX) {
      return ulStyleMapping[UlStyle.CHECKBOX]
    }
    const levelStyleList = [UlStyle.DISC, UlStyle.CIRCLE, UlStyle.SQUARE]
    const levelStyle =
      levelStyleList[(element.listLevel || 0) % levelStyleList.length]
    return ulStyleMapping[levelStyle] || ulStyleMapping[UlStyle.DISC]
  }
}
