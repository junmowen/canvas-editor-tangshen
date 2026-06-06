import { CommandAdaptCore } from './CommandAdaptCore'
import { ZERO } from '../../dataset/constant/Common'
import { ListStyle, ListType } from '../../dataset/enum/List'
import { RowFlex } from '../../dataset/enum/Row'
import { TitleLevel } from '../../dataset/enum/Title'
import { IDrawOption, IPainterOption } from '../../interface/Draw'
import { IElement, IRowIndentPayload, ITabStop } from '../../interface/Element'
import { IPageColumns } from '../../interface/PageColumns'
import { ITextDecoration } from '../../interface/Text'
import { IDocumentStyle } from '../../interface/Style'
import { getUUID } from '../../utils'
import { IRichtextOption } from '../../interface/Command'
import {
  toggleSubscriptSelection,
  toggleSuperscriptSelection
} from '../modules/richtext/command/ScriptCommandPolicy'
import {
  applyRowColumnsToParagraphList,
  applyRowFlexToParagraphList,
  applyRowMarginToParagraphList,
  applyParagraphIndent,
  applyTitleToElementList
} from './CommandParagraphStylePolicy'
import {
  applyDocumentStyleToParagraphList,
  clearDocumentStyleFromParagraphList,
  cloneDocumentStyleList
} from './CommandDocumentStyleCommandPolicy'
import {
  createPageNumberContinueOptions,
  createPageNumberRangeOptions,
  createPageNumberRestartOptions
} from './CommandPageNumberPolicy'
import {
  executeBooleanTextStyleToggleCommand,
  executeFontCommand,
  executeNullableColorStyleCommand,
  executeSizeCommand,
  executeSizeDeltaCommand,
  executeUnderlineCommand
} from './CommandTextStyleCommandPolicy'
import {
  applyTabStopsToParagraphList,
  clearRichTextStyleFromElementList,
  collectPainterStyleFromSelection,
  createParagraphCommandRenderOption,
  executeParagraphElementCommand,
  getCommandParagraphElementList
} from './CommandRichTextElementPolicy'

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
    this.draw.setPainterStyle(
      collectPainterStyleFromSelection(selection),
      options
    )
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
      const elementList = this.draw.getObjectResolver().getElementList()
      const enterElement = this.draw.getTargetResolver().resolveRangeAnchorElement({ elementList })!
      if (enterElement?.value === ZERO) {
        changeElementList.push(enterElement)
        renderOption = { curIndex: endIndex }
      }
    }
    if (!changeElementList.length) return
    clearRichTextStyleFromElementList(changeElementList)
    this.draw.render(renderOption)
  }

  /** 设置当前选区或默认输入样式的字体。 */
  public font(payload: string, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeFontCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      font: payload
    })
  }

  /** 设置当前选区或默认输入样式的字号。 */
  public size(payload: number, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const { minSize, maxSize, defaultSize } = this.options
    if (payload < minSize || payload > maxSize) return
    executeSizeCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      size: payload,
      defaultSize
    })
  }

  /** 增大当前选区或默认输入样式的字号。 */
  public sizeAdd(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeSizeDeltaCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      delta: 2,
      defaultSize: this.options.defaultSize,
      minSize: this.options.minSize,
      maxSize: this.options.maxSize
    })
  }

  /** 减小当前选区或默认输入样式的字号。 */
  public sizeMinus(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeSizeDeltaCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      delta: -2,
      defaultSize: this.options.defaultSize,
      minSize: this.options.minSize,
      maxSize: this.options.maxSize
    })
  }

  /** 切换当前选区或默认输入样式的加粗状态。 */
  public bold(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeBooleanTextStyleToggleCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      key: 'bold'
    })
  }

  /** 切换当前选区或默认输入样式的斜体状态。 */
  public italic(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeBooleanTextStyleToggleCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      key: 'italic'
    })
  }

  /** 切换当前选区或默认输入样式的下划线状态。 */
  public underline(
    textDecoration?: ITextDecoration,
    options?: IRichtextOption
  ) {
    if (this.isCommandDisabled(options)) return
    executeUnderlineCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      textDecoration
    })
  }

  /** 切换当前选区或默认输入样式的删除线状态。 */
  public strikeout(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeBooleanTextStyleToggleCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      key: 'strikeout',
      selectionRenderOptions: {
        isSetCursor: false,
        isCompute: false,
        pageRenderScope: 'visible'
      }
    })
  }

  /** 切换当前选区或默认输入样式的上标状态。 */
  public superscript(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (!selection) return
    toggleSuperscriptSelection(selection)
    this.draw.render({ isSetCursor: false })
  }

  /** 切换当前选区或默认输入样式的下标状态。 */
  public subscript(options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    const selection = this.range.getSelectionElementList()
    if (!selection) return
    toggleSubscriptSelection(selection)
    this.draw.render({ isSetCursor: false })
  }

  /** 设置当前选区或默认输入样式的文字颜色。 */
  public color(payload: string | null, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeNullableColorStyleCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      key: 'color',
      value: payload,
      isCompute: false
    })
  }

  /** 设置当前选区或默认输入样式的高亮颜色。 */
  public highlight(payload: string | null, options?: IRichtextOption) {
    if (this.isCommandDisabled(options)) return
    executeNullableColorStyleCommand({
      draw: this.draw,
      range: this.range,
      endIndex: this.getRange().endIndex,
      key: 'highlight',
      value: payload,
      isCompute: true
    })
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
    applyTitleToElementList({
      elementList: changeElementList,
      level: payload,
      titleId,
      titleOptions: this.draw.getOptions().title
    })
    this.draw.render(createParagraphCommandRenderOption(startIndex, endIndex))
  }

  /** 设置当前段落的列表类型。 */
  public list(listType: ListType | null, listStyle?: ListStyle) {
    const isReadonly = this.draw.isReadonly()
    if (isReadonly) return
    this.draw.getListParticle().setList(listType, listStyle)
  }

  /** 设置当前段落的水平对齐方式。 */
  public rowFlex(payload: RowFlex) {
    executeParagraphElementCommand({
      draw: this.draw,
      range: this.range,
      getRange: () => this.getRange(),
      apply: paragraphElementList => {
        applyRowFlexToParagraphList(paragraphElementList, payload)
      }
    })
  }

  /** 设置当前段落的行间距和段前段后距离。 */
  public rowMargin(payload: number) {
    executeParagraphElementCommand({
      draw: this.draw,
      range: this.range,
      getRange: () => this.getRange(),
      apply: paragraphElementList => {
        applyRowMarginToParagraphList(paragraphElementList, payload)
      }
    })
  }

  /** 设置当前段落的局部分栏配置，支持对选中内容独立分栏。 */
  public rowColumns(payload: IPageColumns | null) {
    executeParagraphElementCommand({
      draw: this.draw,
      range: this.range,
      getRange: () => this.getRange(),
      getElementList: () => this.getParagraphElementList(),
      apply: paragraphElementList => {
        applyRowColumnsToParagraphList(paragraphElementList, payload)
      }
    })
  }

  /** 设置整篇文档的可复用样式库，不触碰当前正文内容。 */
  public setDocumentStyles(payload: IDocumentStyle[]) {
    this.draw.setEditorData({
      styles: cloneDocumentStyleList(payload)
    })
  }

  /** 对当前段落或选区应用文档样式。 */
  public applyDocumentStyle(styleId: string) {
    executeParagraphElementCommand({
      draw: this.draw,
      range: this.range,
      getRange: () => this.getRange(),
      getElementList: () => this.getParagraphElementList(),
      apply: paragraphElementList => {
        return applyDocumentStyleToParagraphList({
          paragraphElementList,
          styles: this.draw.getObjectResolver().getOriginalEditorData().styles,
          styleId
        })
      }
    })
  }

  /** 清除当前段落或选区的文档样式关联，保留直接格式。 */
  public clearDocumentStyle() {
    executeParagraphElementCommand({
      draw: this.draw,
      range: this.range,
      getRange: () => this.getRange(),
      getElementList: () => this.getParagraphElementList(),
      apply: paragraphElementList => {
        return clearDocumentStyleFromParagraphList(paragraphElementList)
      }
    })
  }

  /** 获取当前选区覆盖的段落元素集合。 */
  private getParagraphElementList(): IElement[] | null {
    return getCommandParagraphElementList(this.range)
  }

  /** 批量设置当前段落缩进。 */
  private setParagraphIndent(payload: IRowIndentPayload) {
    executeParagraphElementCommand({
      draw: this.draw,
      range: this.range,
      getRange: () => this.getRange(),
      getElementList: () => this.getParagraphElementList(),
      apply: paragraphElementList => {
        applyParagraphIndent(paragraphElementList, payload)
      }
    })
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

  /** 设置当前段落的制表位列表，传入 null 或空数组时清除制表位。 */
  public setTabStops(payload: ITabStop[] | null) {
    executeParagraphElementCommand({
      draw: this.draw,
      range: this.range,
      getRange: () => this.getRange(),
      getElementList: () => this.getParagraphElementList(),
      apply: paragraphElementList => {
        applyTabStopsToParagraphList(paragraphElementList, payload)
      }
    })
  }

  /** 设置页码沿用上一节编号。 */
  public pageNumberContinue() {
    this.updateOptions({
      pageNumber: createPageNumberContinueOptions(this.options.pageNumber)
    })
  }

  /** 设置页码从指定编号重新开始。 */
  public pageNumberRestart(payload: {
    /** 起始页码，用于限定跨页范围的左边界。 */
    startPageNo?: number
    /** 来源页码，用于描述迁移或重排前所在页面。 */
    fromPageNo?: number
  }) {
    this.updateOptions({
      pageNumber: createPageNumberRestartOptions(this.options.pageNumber, payload)
    })
  }

  /** 设置页码应用范围。 */
  public pageNumberRange(payload: {
    /** 来源页码，用于描述迁移或重排前所在页面。 */
    fromPageNo?: number
    /** 最大页面no，用于定位对应页、行或序号。 */
    maxPageNo?: number | null
  }) {
    this.updateOptions({
      pageNumber: createPageNumberRangeOptions(this.options.pageNumber, payload)
    })
  }
}
