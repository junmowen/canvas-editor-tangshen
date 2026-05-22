import { CommandAdaptCore } from './CommandAdaptCore'
import { ZERO } from '../../dataset/constant/Common'
import { EDITOR_ELEMENT_STYLE_ATTR } from '../../dataset/constant/Element'
import { titleSizeMapping } from '../../dataset/constant/Title'
import { ElementType } from '../../dataset/enum/Element'
import { ElementStyleKey } from '../../dataset/enum/ElementStyle'
import { ListStyle, ListType } from '../../dataset/enum/List'
import { RowFlex } from '../../dataset/enum/Row'
import { TitleLevel } from '../../dataset/enum/Title'
import { IDrawOption, IPainterOption } from '../../interface/Draw'
import { IElement, IElementStyle, IRowIndentPayload } from '../../interface/Element'
import { ITextDecoration } from '../../interface/Text'
import { getUUID, isObjectEqual } from '../../utils'
import { isTextLikeElement } from '../../utils/element'
import { IRichtextOption } from '../../interface/Command'

/**
 * 富文本命令适配模块，负责文字样式、段落样式、标题、列表和页码相关命令。
 */
export class CommandAdaptRichText extends CommandAdaptCore {
  /** 启用或取消格式刷样式采集。 */
  public painter(options: IPainterOption) {
    // 如果单击且已经有样式设置则取消设置
    if (!options.isDblclick && this.draw.getPainterStyle()) {
      this.canvasEvent.clearPainterStyle()
      return
    }
    const selection = this.range.getSelection()
    if (!selection) return
    const painterStyle: IElementStyle = {}
    selection.forEach(s => {
      const painterStyleKeys = EDITOR_ELEMENT_STYLE_ATTR
      painterStyleKeys.forEach(p => {
        const key = p as keyof typeof ElementStyleKey
        if (painterStyle[key] === undefined) {
          painterStyle[key] = s[key] as any
        }
      })
    })
    this.draw.setPainterStyle(painterStyle, options)
  }

  /** 将格式刷样式应用到当前选区。 */
  public applyPainterStyle() {
    if (this.isCommandDisabled()) return
    this.canvasEvent.applyPainterStyle()
  }

  /** 清除当前选区或输入锚点的文字样式。 */
  public format(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    // 选区设置或设置换行处样式
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      }
    }
    if (!changeElementList.length) return
    changeElementList.forEach(el => {
      EDITOR_ELEMENT_STYLE_ATTR.forEach(attr => {
        delete el[attr]
      })
    })
    this.draw.render(renderOption)
  }

  /** 设置当前选区或默认输入样式的字体。 */
  public font(payload: string, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      selection.forEach(el => {
        el.font = payload
      })
      this.draw.render({ isSetCursor: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        font: payload
      })
      if (enterElement?.value === ZERO) {
        enterElement.font = payload
      } else {
        isSubmitHistory = false
      }
      this.draw.render({
        isSubmitHistory,
        curIndex: endIndex,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 设置当前选区或默认输入样式的字号。 */
  public size(payload: number, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const { minSize, maxSize, defaultSize } = this.options
    if (payload < minSize || payload > maxSize) return
    // 选区设置或设置换行处样式
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    const selection = this.range.getTextLikeSelectionElementList()
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        size: payload
      })
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      } else {
        this.draw.render({
          curIndex: endIndex,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
      }
    }
    if (!changeElementList.length) return
    let isExistUpdate = false
    changeElementList.forEach(el => {
      if (
        (!el.size && payload === defaultSize) ||
        (el.size && el.size === payload)
      ) {
        return
      }
      el.size = payload
      isExistUpdate = true
    })
    if (isExistUpdate) {
      this.draw.render(renderOption)
    }
  }

  /** 增大当前选区或默认输入样式的字号。 */
  public sizeAdd(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const { defaultSize, maxSize } = this.options
    const selection = this.range.getTextLikeSelectionElementList()
    // 选区设置或设置换行处样式
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      // 设置默认样式
      const style = this.range.getDefaultStyle()
      const anchorSize = style?.size || enterElement.size || defaultSize
      this.range.setDefaultStyle({
        size: anchorSize + 2 > maxSize ? maxSize : anchorSize + 2
      })
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      } else {
        this.draw.render({
          curIndex: endIndex,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
      }
    }
    if (!changeElementList.length) return
    let isExistUpdate = false
    changeElementList.forEach(el => {
      if (!el.size) {
        el.size = defaultSize
      }
      if (el.size >= maxSize) return
      if (el.size + 2 > maxSize) {
        el.size = maxSize
      } else {
        el.size += 2
      }
      isExistUpdate = true
    })
    if (isExistUpdate) {
      this.draw.render(renderOption)
    }
  }

  /** 减小当前选区或默认输入样式的字号。 */
  public sizeMinus(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const { defaultSize, minSize } = this.options
    const selection = this.range.getTextLikeSelectionElementList()
    // 选区设置或设置换行处样式
    let renderOption: IDrawOption = {}
    let changeElementList: IElement[] = []
    if (selection?.length) {
      changeElementList = selection
      renderOption = { isSetCursor: false }
    } else {
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      const style = this.range.getDefaultStyle()
      const anchorSize = style?.size || enterElement.size || defaultSize
      this.range.setDefaultStyle({
        size: anchorSize - 2 < minSize ? minSize : anchorSize - 2
      })
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      } else {
        this.draw.render({
          curIndex: endIndex,
          isCompute: false,
          isSubmitHistory: false,
          pageRenderScope: 'visible'
        })
      }
    }
    if (!changeElementList.length) return
    let isExistUpdate = false
    changeElementList.forEach(el => {
      if (!el.size) {
        el.size = defaultSize
      }
      if (el.size <= minSize) return
      if (el.size - 2 < minSize) {
        el.size = minSize
      } else {
        el.size -= 2
      }
      isExistUpdate = true
    })
    if (isExistUpdate) {
      this.draw.render(renderOption)
    }
  }

  /** 切换当前选区或默认输入样式的加粗状态。 */
  public bold(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      const noBoldIndex = selection.findIndex(s => !s.bold)
      selection.forEach(el => {
        el.bold = !!~noBoldIndex
      })
      this.draw.render({ isSetCursor: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        bold: enterElement.bold ? false : !this.range.getDefaultStyle()?.bold
      })
      if (enterElement?.value === ZERO) {
        enterElement.bold = !enterElement.bold
      } else {
        isSubmitHistory = false
      }
      this.draw.render({
        isSubmitHistory,
        curIndex: endIndex,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 切换当前选区或默认输入样式的斜体状态。 */
  public italic(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      const noItalicIndex = selection.findIndex(s => !s.italic)
      selection.forEach(el => {
        el.italic = !!~noItalicIndex
      })
      this.draw.render({ isSetCursor: false })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        italic: enterElement.italic
          ? false
          : !this.range.getDefaultStyle()?.italic
      })
      if (enterElement?.value === ZERO) {
        enterElement.italic = !enterElement.italic
      } else {
        isSubmitHistory = false
      }
      this.draw.render({
        isSubmitHistory,
        curIndex: endIndex,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 切换当前选区或默认输入样式的下划线状态。 */
  public underline(
    textDecoration?: ITextDecoration,
    options?: IRichtextOption
  ) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      // 没有设置下划线、当前与之前有一个设置不存在、文本装饰不一致时重设下划线
      const isSetUnderline = selection.some(
        s =>
          !s.underline ||
          (!textDecoration && s.textDecoration) ||
          (textDecoration && !s.textDecoration) ||
          (textDecoration &&
            s.textDecoration &&
            !isObjectEqual(s.textDecoration, textDecoration))
      )
      selection.forEach(el => {
        el.underline = isSetUnderline
        if (isSetUnderline && textDecoration) {
          el.textDecoration = textDecoration
        } else {
          delete el.textDecoration
        }
      })
      this.draw.render({
        isSetCursor: false,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        underline: enterElement?.underline
          ? false
          : !this.range.getDefaultStyle()?.underline
      })
      if (enterElement?.value === ZERO) {
        enterElement.underline = !enterElement.underline
      } else {
        isSubmitHistory = false
      }
      this.draw.render({
        isSubmitHistory,
        curIndex: endIndex,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 切换当前选区或默认输入样式的删除线状态。 */
  public strikeout(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      const noStrikeoutIndex = selection.findIndex(s => !s.strikeout)
      selection.forEach(el => {
        el.strikeout = !!~noStrikeoutIndex
      })
      this.draw.render({
        isSetCursor: false,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        strikeout: enterElement.strikeout
          ? false
          : !this.range.getDefaultStyle()?.strikeout
      })
      if (enterElement?.value === ZERO) {
        enterElement.strikeout = !enterElement.strikeout
      } else {
        isSubmitHistory = false
      }
      this.draw.render({
        isSubmitHistory,
        curIndex: endIndex,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 切换当前选区或默认输入样式的上标状态。 */
  public superscript(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (!selection) return
    const superscriptIndex = selection.findIndex(
      s => s.type === ElementType.SUPERSCRIPT
    )
    selection.forEach(el => {
      // 取消上标
      if (~superscriptIndex) {
        if (el.type === ElementType.SUPERSCRIPT) {
          el.type = ElementType.TEXT
          delete el.actualSize
        }
      } else {
        // 设置上标
        if (
          !el.type ||
          el.type === ElementType.TEXT ||
          el.type === ElementType.SUBSCRIPT
        ) {
          el.type = ElementType.SUPERSCRIPT
        }
      }
    })
    this.draw.render({ isSetCursor: false })
  }

  /** 切换当前选区或默认输入样式的下标状态。 */
  public subscript(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (!selection) return
    const subscriptIndex = selection.findIndex(
      s => s.type === ElementType.SUBSCRIPT
    )
    selection.forEach(el => {
      // 取消下标
      if (~subscriptIndex) {
        if (el.type === ElementType.SUBSCRIPT) {
          el.type = ElementType.TEXT
          delete el.actualSize
        }
      } else {
        // 设置下标
        if (
          !el.type ||
          el.type === ElementType.TEXT ||
          el.type === ElementType.SUPERSCRIPT
        ) {
          el.type = ElementType.SUBSCRIPT
        }
      }
    })
    this.draw.render({ isSetCursor: false })
  }

  /** 设置当前选区或默认输入样式的文字颜色。 */
  public color(payload: string | null, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      selection.forEach(el => {
        if (payload) {
          el.color = payload
        } else {
          delete el.color
        }
      })
      this.draw.render({
        isSetCursor: false,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        color: payload || undefined
      })
      if (enterElement?.value === ZERO) {
        if (payload) {
          enterElement.color = payload
        } else {
          delete enterElement.color
        }
      } else {
        isSubmitHistory = false
      }
      this.draw.render({
        isSubmitHistory,
        curIndex: endIndex,
        isCompute: false,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 设置当前选区或默认输入样式的高亮颜色。 */
  public highlight(payload: string | null, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (selection?.length) {
      selection.forEach(el => {
        if (payload) {
          el.highlight = payload
        } else {
          delete el.highlight
        }
      })
      this.draw.render({
        isSetCursor: false,
        isCompute: true,
        pageRenderScope: 'visible'
      })
    } else {
      let isSubmitHistory = true
      const { endIndex } = this.getRange()
      const elementList = this.draw.getElementList()
      const enterElement = elementList[endIndex]
      this.range.setDefaultStyle({
        highlight: payload || undefined
      })
      if (enterElement?.value === ZERO) {
        if (payload) {
          enterElement.highlight = payload
        } else {
          delete enterElement.highlight
        }
      } else {
        isSubmitHistory = false
      }
      this.draw.render({
        isSubmitHistory,
        curIndex: endIndex,
        isCompute: true,
        pageRenderScope: 'visible'
      })
    }
  }

  /** 将当前段落设置为指定标题级别或恢复为正文。 */
  public title(payload: TitleLevel | null) {
    if (this.isCommandDisabled()) return
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return
    // 需要改变的元素列表
    const changeElementList =
      startIndex === endIndex
        ? this.range.getRangeParagraphElementList()
        : this.range.getSelectionElementList()
    if (!changeElementList || !changeElementList.length) return
    // 设置值
    const titleId = getUUID()
    const titleOptions = this.draw.getOptions().title
    changeElementList.forEach(el => {
      if (!el.type && el.value === ZERO) return
      if (payload) {
        el.level = payload
        el.titleId = titleId
        if (isTextLikeElement(el)) {
          el.size = titleOptions[titleSizeMapping[payload]]
          el.bold = true
        }
      } else {
        if (el.titleId) {
          delete el.titleId
          delete el.title
          delete el.level
          delete el.size
          delete el.bold
        }
      }
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  /** 设置当前段落的列表类型。 */
  public list(listType: ListType | null, listStyle?: ListStyle) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.draw.getListParticle().setList(listType, listStyle)
  }

  /** 设置当前段落的水平对齐方式。 */
  public rowFlex(payload: RowFlex) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return
    const paragraphElementList = this.range.getEditBoundaryRange().isCrossRowCol
      ? this.range.getSelectionElementList()
      : this.range.getRangeParagraphElementList()
    if (!paragraphElementList) return
    paragraphElementList.forEach(element => {
      element.rowFlex = payload
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  /** 设置当前段落的行间距和段前段后距离。 */
  public rowMargin(payload: number) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return
    const paragraphElementList = this.range.getEditBoundaryRange().isCrossRowCol
      ? this.range.getSelectionElementList()
      : this.range.getRangeParagraphElementList()
    if (!paragraphElementList) return
    paragraphElementList.forEach(element => {
      element.rowMargin = payload
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  /** 获取当前选区覆盖的段落元素集合。 */
  private getParagraphElementList(): IElement[] | null {
    return this.range.getEditBoundaryRange().isCrossRowCol
      ? this.range.getSelectionElementList()
      : this.range.getRangeParagraphElementList()
  }

  /** 写入单个段落元素的缩进配置。 */
  private setParagraphIndentValue(
    element: IElement,
    key: keyof Pick<
      IElement,
      'rowIndentLeft' | 'rowIndentRight' | 'rowIndent' | 'rowHangingIndent'
    >,
    value: number | null | undefined
  ) {
    if (value === undefined) return
    const nextValue = value === null ? null : Math.max(0, value)
    if (nextValue === null || nextValue === 0) {
      delete element[key]
    } else {
      element[key] = nextValue
    }
  }

  /** 批量设置当前段落缩进。 */
  private setParagraphIndent(payload: IRowIndentPayload) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    const { startIndex, endIndex } = this.getRange()
    if (!~startIndex && !~endIndex) return
    const paragraphElementList = this.getParagraphElementList()
    if (!paragraphElementList) return
    paragraphElementList.forEach(element => {
      this.setParagraphIndentValue(element, 'rowIndentLeft', payload.left)
      this.setParagraphIndentValue(element, 'rowIndentRight', payload.right)
      this.setParagraphIndentValue(element, 'rowIndent', payload.firstLine)
      this.setParagraphIndentValue(
        element,
        'rowHangingIndent',
        payload.hanging
      )
    })
    // 光标定位
    const isSetCursor = startIndex === endIndex
    const curIndex = isSetCursor ? endIndex : startIndex
    this.draw.render({ curIndex, isSetCursor })
  }

  /** 设置当前段落的首行缩进。 */
  public rowIndent(payload: number | IRowIndentPayload | null) {
    if (typeof payload === 'number' || payload === null) {
      this.setParagraphIndent({ firstLine: payload })
    } else {
      this.setParagraphIndent(payload)
    }
  }

  /** 设置当前段落的左缩进。 */
  public rowIndentLeft(payload: number | null) {
    this.setParagraphIndent({ left: payload })
  }

  /** 设置当前段落的右缩进。 */
  public rowIndentRight(payload: number | null) {
    this.setParagraphIndent({ right: payload })
  }

  /** 设置当前段落的悬挂缩进。 */
  public rowHangingIndent(payload: number | null) {
    this.setParagraphIndent({ hanging: payload })
  }

  /** 设置页码沿用上一节编号。 */
  public pageNumberContinue() {
    this.updateOptions({
      pageNumber: {
        ...this.options.pageNumber,
        startPageNo: 1,
        fromPageNo: 0
      }
    })
  }

  /** 设置页码从指定编号重新开始。 */
  public pageNumberRestart(payload: {
    startPageNo?: number
    fromPageNo?: number
  }) {
    this.updateOptions({
      pageNumber: {
        ...this.options.pageNumber,
        startPageNo: payload.startPageNo ?? this.options.pageNumber.startPageNo,
        fromPageNo: payload.fromPageNo ?? this.options.pageNumber.fromPageNo
      }
    })
  }

  /** 设置页码应用范围。 */
  public pageNumberRange(payload: {
    fromPageNo?: number
    maxPageNo?: number | null
  }) {
    this.updateOptions({
      pageNumber: {
        ...this.options.pageNumber,
        fromPageNo: payload.fromPageNo ?? this.options.pageNumber.fromPageNo,
        maxPageNo:
          payload.maxPageNo === undefined
            ? this.options.pageNumber.maxPageNo
            : payload.maxPageNo
      }
    })
  }
}
