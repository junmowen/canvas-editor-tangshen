import { NON_BREAKING_SPACE, ZERO } from '../dataset/constant/Common'
import { INLINE_NODE_NAME, TEXTLIKE_ELEMENT_TYPE } from '../dataset/constant/Element'
import { listStyleCSSMapping, listTypeElementMapping } from '../dataset/constant/List'
import { START_LINE_BREAK_REG } from '../dataset/constant/Regular'
import { titleNodeNameMapping, titleOrderNumberMapping } from '../dataset/constant/Title'
import { IFrameBlock } from '../core/modules/block/particle/modules/IFrameBlock'
import { BlockType } from '../dataset/enum/Block'
import { ImageDisplay } from '../dataset/enum/Common'
import { ControlComponent, ControlType } from '../dataset/enum/Control'
import { ElementType } from '../dataset/enum/Element'
import { ListStyle, ListType } from '../dataset/enum/List'
import { RowFlex } from '../dataset/enum/Row'
import { TableBorder, TdBorder } from '../dataset/enum/table/Table'
import { VerticalAlign } from '../dataset/enum/VerticalAlign'
import { DeepRequired } from '../interface/Common'
import { IEditorOption } from '../interface/Editor'
import { IElement } from '../interface/Element'
import { ITd } from '../interface/table/Td'
import { ITr } from '../interface/table/Tr'
import { resolveFormulaDisplayText } from '../core/modules/formula/model/FormulaTextModel'
import { getControlInlineContentText } from './elementControl'
import { convertRowFlexToJustifyContent, convertRowFlexToTextAlign, convertTextAlignToRowFlex, getIsBlockElement, replaceHTMLElementTag } from './elementLayout'
import { mergeOption } from './option'
import { zipElementList } from './elementZip'

/**
 * DOM/HTML 转换模块。
 *
 * 集中维护编辑器元素与剪贴板 HTML/DOM 之间的互转逻辑。
 */
export function convertElementToDom(
  element: IElement,
  options: DeepRequired<IEditorOption>
): HTMLElement {
  let tagName: keyof HTMLElementTagNameMap = 'span'
  if (element.type === ElementType.SUPERSCRIPT) {
    tagName = 'sup'
  } else if (element.type === ElementType.SUBSCRIPT) {
    tagName = 'sub'
  }
  const dom = document.createElement(tagName)
  dom.style.fontFamily = element.font || options.defaultFont
  if (element.rowFlex) {
    dom.style.textAlign = convertRowFlexToTextAlign(element.rowFlex)
  }
  if (element.groupIds?.length) {
    dom.dataset.groupIds = element.groupIds.join(',')
  }
  if (element.rowIndentLeft) {
    dom.style.marginLeft = `${element.rowIndentLeft}px`
  }
  if (element.rowIndentRight) {
    dom.style.marginRight = `${element.rowIndentRight}px`
  }
  if (element.rowIndent) {
    dom.style.textIndent = `${element.rowIndent}px`
  }
  if (element.rowHangingIndent) {
    dom.style.paddingLeft = `${element.rowHangingIndent}px`
    const textIndent = element.rowIndent || 0
    dom.style.textIndent = `${textIndent - element.rowHangingIndent}px`
  }
  if (element.rowMargin) {
    dom.style.lineHeight = `${element.rowMargin}`
  }
  if (element.lineSpacing) {
    dom.style.lineHeight =
      element.lineSpacingType === 'multiple'
        ? `${element.lineSpacing}`
        : `${element.lineSpacing}px`
  }
  if (element.spaceBefore) {
    dom.style.marginTop = `${element.spaceBefore}px`
  }
  if (element.spaceAfter) {
    dom.style.marginBottom = `${element.spaceAfter}px`
  }
  if (element.color) {
    dom.style.color = element.color
  }
  if (element.bold) {
    dom.style.fontWeight = '600'
  }
  if (element.italic) {
    dom.style.fontStyle = 'italic'
  }
  dom.style.fontSize = `${element.size || options.defaultSize}px`
  if (element.highlight) {
    dom.style.backgroundColor = element.highlight
  }
  if (element.underline || element.control?.underline) {
    dom.style.textDecoration = 'underline'
  }
  if (element.strikeout) {
    dom.style.textDecoration += ' line-through'
  }
  dom.innerText = element.value.replace(new RegExp(`${ZERO}`, 'g'), '\n')
  return dom
}

export function splitListElement(
  elementList: IElement[]
): Map<number, IElement[]> {
  let curListIndex = 0
  const listElementListMap: Map<number, IElement[]> = new Map()
  for (let e = 0; e < elementList.length; e++) {
    const element = elementList[e]
    // 移除列表首行换行字符-如果是复选框直接忽略
    if (e === 0) {
      if (element.checkbox) continue
      element.value = element.value.replace(START_LINE_BREAK_REG, '')
    }
    if (element.listWrap) {
      const listElementList = listElementListMap.get(curListIndex) || []
      listElementList.push(element)
      listElementListMap.set(curListIndex, listElementList)
    } else {
      const valueList = element.value.split('\n')
      for (let c = 0; c < valueList.length; c++) {
        if (c > 0) {
          curListIndex += 1
        }
        const value = valueList[c]
        const listElementList = listElementListMap.get(curListIndex) || []
        listElementList.push({
          ...element,
          value
        })
        listElementListMap.set(curListIndex, listElementList)
      }
    }
  }
  return listElementListMap
}

/** 元素列表分组行flex契约，用于约束内部流程中传递的数据结构。 */
export interface IElementListGroupRowFlex {
  /** 行剩余弹性空间，用于分配两端对齐或缩进补偿。 */
  rowFlex: RowFlex | null
  /** 行左缩进，用于计算段落左侧排版边界。 */
  rowIndentLeft: number | null
  /** 行右缩进，用于计算段落右侧排版边界。 */
  rowIndentRight: number | null
  /** 行缩进值，用于计算段落文本起点。 */
  rowIndent: number | null
  /** 行悬挂缩进，用于计算首行外的文本起点。 */
  rowHangingIndent: number | null
  /** 业务数据载荷，供当前操作读取或提交。 */
  data: IElement[]
}

export function groupElementListByRowFlex(
  elementList: IElement[]
): IElementListGroupRowFlex[] {
  const elementListGroupList: IElementListGroupRowFlex[] = []
  if (!elementList.length) return elementListGroupList
  let currentRowFlex: RowFlex | null = elementList[0]?.rowFlex || null
  let currentRowIndentLeft: number | null =
    elementList[0]?.rowIndentLeft || null
  let currentRowIndentRight: number | null =
    elementList[0]?.rowIndentRight || null
  let currentRowIndent: number | null = elementList[0]?.rowIndent || null
  let currentRowHangingIndent: number | null =
    elementList[0]?.rowHangingIndent || null
  elementListGroupList.push({
    rowFlex: currentRowFlex,
    rowIndentLeft: currentRowIndentLeft,
    rowIndentRight: currentRowIndentRight,
    rowIndent: currentRowIndent,
    rowHangingIndent: currentRowHangingIndent,
    data: [elementList[0]]
  })
  for (let e = 1; e < elementList.length; e++) {
    const element = elementList[e]
    const rowFlex = element.rowFlex || null
    const rowIndentLeft = element.rowIndentLeft || null
    const rowIndentRight = element.rowIndentRight || null
    const rowIndent = element.rowIndent || null
    const rowHangingIndent = element.rowHangingIndent || null
    // 行布局相同&非块元素时追加数据，否则新增分组
    if (
      currentRowFlex === rowFlex &&
      currentRowIndentLeft === rowIndentLeft &&
      currentRowIndentRight === rowIndentRight &&
      currentRowIndent === rowIndent &&
      currentRowHangingIndent === rowHangingIndent &&
      !getIsBlockElement(element) &&
      !getIsBlockElement(elementList[e - 1])
    ) {
      const lastElementListGroup =
        elementListGroupList[elementListGroupList.length - 1]
      lastElementListGroup.data.push(element)
    } else {
      elementListGroupList.push({
        rowFlex,
        rowIndentLeft,
        rowIndentRight,
        rowIndent,
        rowHangingIndent,
        data: [element]
      })
      currentRowFlex = rowFlex
      currentRowIndentLeft = rowIndentLeft
      currentRowIndentRight = rowIndentRight
      currentRowIndent = rowIndent
      currentRowHangingIndent = rowHangingIndent
    }
  }
  // 压缩数据
  for (let g = 0; g < elementListGroupList.length; g++) {
    const elementListGroup = elementListGroupList[g]
    elementListGroup.data = zipElementList(elementListGroup.data, {
      isClassifyArea: true
    })
  }
  return elementListGroupList
}

export function createDomFromElementList(
  elementList: IElement[],
  options?: IEditorOption
) {
  const editorOptions = mergeOption(options)
  function buildDom(payload: IElement[]): HTMLDivElement {
    const clipboardDom = document.createElement('div')
    for (let e = 0; e < payload.length; e++) {
      const element = payload[e]
      if (element.hide || element.control?.hide || element.area?.hide) {
        continue
      }
      // 构造表格
      if (element.type === ElementType.TABLE) {
        const tableDom: HTMLTableElement = document.createElement('table')
        tableDom.setAttribute('cellSpacing', '0')
        tableDom.setAttribute('cellpadding', '0')
        tableDom.setAttribute('border', '0')
        const tableBorderColor = element.borderColor || '#000000'
        const tableBorderWidth = element.borderWidth || 1
        const borderStyle = `${tableBorderWidth}px solid ${tableBorderColor}`
        // 表格边框
        if (!element.borderType || element.borderType === TableBorder.ALL) {
          tableDom.style.borderTop = borderStyle
          tableDom.style.borderLeft = borderStyle
        } else if (element.borderType === TableBorder.EXTERNAL) {
          tableDom.style.border = borderStyle
        }
        tableDom.style.width = `${element.width}px`
        // colgroup
        const colgroupDom = document.createElement('colgroup')
        for (let c = 0; c < element.colgroup!.length; c++) {
          const colgroup = element.colgroup![c]
          const colDom = document.createElement('col')
          colDom.setAttribute('width', `${colgroup.width}`)
          colgroupDom.append(colDom)
        }
        tableDom.append(colgroupDom)
        // tr
        const trList = element.trList!
        for (let t = 0; t < trList.length; t++) {
          const trDom = document.createElement('tr')
          const tr = trList[t]
          trDom.style.height = `${tr.height}px`
          for (let d = 0; d < tr.tdList.length; d++) {
            const tdDom = document.createElement('td')
            if (!element.borderType || element.borderType === TableBorder.ALL) {
              tdDom.style.borderBottom = tdDom.style.borderRight = '1px solid'
            }
            const td = tr.tdList[d]
            const tdBorderColor = td.borderColor || tableBorderColor
            const tdBorderWidth = td.borderWidth || tableBorderWidth
            const tdBorderStyle = `${tdBorderWidth}px solid ${tdBorderColor}`
            tdDom.colSpan = td.colspan
            tdDom.rowSpan = td.rowspan
            tdDom.style.verticalAlign = td.verticalAlign || 'top'
            // 单元格边框
            if (td.borderTypes?.includes(TdBorder.TOP)) {
              tdDom.style.borderTop = tdBorderStyle
            }
            if (td.borderTypes?.includes(TdBorder.RIGHT)) {
              tdDom.style.borderRight = tdBorderStyle
            }
            if (td.borderTypes?.includes(TdBorder.BOTTOM)) {
              tdDom.style.borderBottom = tdBorderStyle
            }
            if (td.borderTypes?.includes(TdBorder.LEFT)) {
              tdDom.style.borderLeft = tdBorderStyle
            }
            const childDom = createDomFromElementList(td.value!, options)
            tdDom.innerHTML = childDom.innerHTML
            if (td.backgroundColor) {
              tdDom.style.backgroundColor = td.backgroundColor
            }
            trDom.append(tdDom)
          }
          tableDom.append(trDom)
        }
        clipboardDom.append(tableDom)
      } else if (element.type === ElementType.HYPERLINK) {
        const a = document.createElement('a')
        a.innerText = element.valueList!.map(v => v.value).join('')
        if (element.url) {
          a.href = element.url
        }
        clipboardDom.append(a)
      } else if (element.type === ElementType.TITLE) {
        const h = document.createElement(
          `h${titleOrderNumberMapping[element.level!]}`
        )
        const childDom = buildDom(element.valueList!)
        h.innerHTML = childDom.innerHTML
        clipboardDom.append(h)
      } else if (element.type === ElementType.LIST) {
        const list = document.createElement(
          listTypeElementMapping[element.listType!]
        )
        if (element.listStyle) {
          list.style.listStyleType = listStyleCSSMapping[element.listStyle]
        }
        // 按照换行符拆分
        const zipList = zipElementList(element.valueList!)
        const listElementListMap = splitListElement(zipList)
        listElementListMap.forEach(listElementList => {
          const li = document.createElement('li')
          const childDom = buildDom(listElementList)
          li.innerHTML = childDom.innerHTML
          list.append(li)
        })
        clipboardDom.append(list)
      } else if (element.type === ElementType.AREA) {
        if (!element.valueList?.length) continue
        const childDom = buildDom(element.valueList)
        clipboardDom.append(...Array.from(childDom.childNodes))
      } else if (element.type === ElementType.IMAGE) {
        const img = document.createElement('img')
        if (element.value) {
          img.src = element.value
          img.width = element.width!
          img.height = element.height!
        }
        if (element.imgDisplay) {
          img.dataset.ceImageDisplay = element.imgDisplay
          if (
            element.imgDisplay === ImageDisplay.FLOAT_TOP ||
            element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
          ) {
            img.style.position = 'absolute'
            img.style.zIndex =
              element.imgDisplay === ImageDisplay.FLOAT_TOP ? '1' : '-1'
          }
        }
        if (element.imgFloatPosition) {
          img.dataset.ceImageFloatX = `${element.imgFloatPosition.x}`
          img.dataset.ceImageFloatY = `${element.imgFloatPosition.y}`
          if (element.imgFloatPosition.pageNo !== undefined) {
            img.dataset.ceImageFloatPageNo = `${element.imgFloatPosition.pageNo}`
          }
          img.style.left = `${element.imgFloatPosition.x}px`
          img.style.top = `${element.imgFloatPosition.y}px`
        }
        clipboardDom.append(img)
      } else if (element.type === ElementType.BLOCK) {
        if (element.block?.type === BlockType.VIDEO) {
          const src = element.block.videoBlock?.src
          if (src) {
            const video = document.createElement('video')
            video.style.display = 'block'
            video.controls = true
            video.src = src
            video.width = element.width! || options?.width || window.innerWidth
            video.height = element.height!
            clipboardDom.append(video)
          }
        } else if (element.block?.type === BlockType.IFRAME) {
          const { src, srcdoc } = element.block.iframeBlock || {}
          if (src || srcdoc) {
            const iframe = document.createElement('iframe')
            iframe.sandbox.add(...IFrameBlock.sandbox)
            if (element.block.iframeBlock?.allowPopup !== false) {
              iframe.sandbox.add('allow-popups')
              iframe.sandbox.add('allow-popups-to-escape-sandbox')
              iframe.sandbox.add('allow-top-navigation-by-user-activation')
            }
            if (element.block.iframeBlock?.allowFullscreen !== false) {
              iframe.allowFullscreen = true
              iframe.allow = 'fullscreen; picture-in-picture'
            }
            iframe.style.display = 'block'
            iframe.style.border = 'none'
            if (src) {
              iframe.src = src
            } else if (srcdoc) {
              iframe.srcdoc = srcdoc
            }
            iframe.width = `${
              element.width || options?.width || window.innerWidth
            }`
            iframe.height = `${element.height!}`
            clipboardDom.append(iframe)
          }
        } else if (element.block?.type === BlockType.HTML) {
          const html = element.block.htmlBlock?.html
          if (html) {
            const htmlBlock = document.createElement('div')
            htmlBlock.setAttribute('data-ce-block-type', 'html')
            htmlBlock.style.display = 'block'
            htmlBlock.style.width = `${
              element.width || options?.width || window.innerWidth
            }px`
            htmlBlock.style.height = `${element.height!}px`
            htmlBlock.innerHTML = html
            clipboardDom.append(htmlBlock)
          }
        }
      } else if (element.type === ElementType.SEPARATOR) {
        const hr = document.createElement('hr')
        clipboardDom.append(hr)
      } else if (element.type === ElementType.PAGE_BREAK) {
        const pageBreak = document.createElement('span')
        pageBreak.dataset.cePageBreak = 'true'
        clipboardDom.append(pageBreak)
      } else if (element.type === ElementType.CHECKBOX) {
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        if (element.checkbox?.value) {
          checkbox.setAttribute('checked', 'true')
        }
        clipboardDom.append(checkbox)
      } else if (element.type === ElementType.RADIO) {
        const radio = document.createElement('input')
        radio.type = 'radio'
        if (element.radio?.value) {
          radio.setAttribute('checked', 'true')
        }
        clipboardDom.append(radio)
      } else if (element.type === ElementType.TAB) {
        const tab = document.createElement('span')
        tab.innerHTML = `${NON_BREAKING_SPACE}${NON_BREAKING_SPACE}`
        clipboardDom.append(tab)
      } else if (element.type === ElementType.CONTROL) {
        const controlElement = convertElementToDom(
          {
            ...element,
            value: ''
          },
          editorOptions
        )
        const controlText = element.control
          ? getControlInlineContentText(element, editorOptions)
          : ''
        const isChoiceControl =
          element.control?.type === ControlType.SELECT ||
          element.control?.type === ControlType.CHECKBOX ||
          element.control?.type === ControlType.RADIO
        if (controlText) {
          controlElement.innerText = controlText
        } else if (element.control?.value?.length && !isChoiceControl) {
          const childDom = buildDom(element.control.value)
          controlElement.innerHTML = childDom.innerHTML
        }
        clipboardDom.append(controlElement)
      } else if (
        !element.type ||
        element.type === ElementType.LATEX ||
        TEXTLIKE_ELEMENT_TYPE.includes(element.type)
      ) {
        let text = ''
        if (element.type === ElementType.DATE) {
          text = element.valueList?.map(v => v.value).join('') || ''
        } else if (element.type === ElementType.LATEX) {
          // 文本型公式控件导出 DOM 时使用展示文本，避免复制为空或退回图片语义。
          text =
            element.formula?.displayText ||
            resolveFormulaDisplayText(element.formula?.latex ?? element.value)
        } else {
          text = element.value
        }
        if (!text) continue
        const dom = convertElementToDom(element, editorOptions)
        // 前一个元素是标题，移除首行换行符
        if (payload[e - 1]?.type === ElementType.TITLE) {
          text = text.replace(/^\n/, '')
        }
        dom.innerText = text.replace(new RegExp(`${ZERO}`, 'g'), '\n')
        clipboardDom.append(dom)
      }
    }
    return clipboardDom
  }
  // 按行布局分类创建dom
  const clipboardDom = document.createElement('div')
  const groupElementList = groupElementListByRowFlex(elementList)
  for (let g = 0; g < groupElementList.length; g++) {
    const elementGroupRowFlex = groupElementList[g]
    // 行布局样式设置
    const isDefaultRowFlex =
      !elementGroupRowFlex.rowFlex ||
      elementGroupRowFlex.rowFlex === RowFlex.LEFT
    const hasRowIndent =
      !!elementGroupRowFlex.rowIndentLeft ||
      !!elementGroupRowFlex.rowIndentRight ||
      !!elementGroupRowFlex.rowIndent ||
      !!elementGroupRowFlex.rowHangingIndent
    // 块元素使用flex否则使用text-align
    const rowFlexDom = document.createElement('div')
    if (!isDefaultRowFlex) {
      const firstElement = elementGroupRowFlex.data[0]
      if (getIsBlockElement(firstElement)) {
        rowFlexDom.style.display = 'flex'
        rowFlexDom.style.justifyContent = convertRowFlexToJustifyContent(
          firstElement.rowFlex!
        )
      } else {
        rowFlexDom.style.textAlign = convertRowFlexToTextAlign(
          elementGroupRowFlex.rowFlex!
        )
      }
    }
    if (elementGroupRowFlex.rowIndent) {
      rowFlexDom.style.textIndent = `${elementGroupRowFlex.rowIndent}px`
    }
    if (elementGroupRowFlex.rowHangingIndent) {
      rowFlexDom.style.paddingLeft = `${elementGroupRowFlex.rowHangingIndent}px`
      const textIndent = elementGroupRowFlex.rowIndent || 0
      rowFlexDom.style.textIndent = `${
        textIndent - elementGroupRowFlex.rowHangingIndent
      }px`
    }
    if (elementGroupRowFlex.rowIndentLeft) {
      rowFlexDom.style.marginLeft = `${elementGroupRowFlex.rowIndentLeft}px`
    }
    if (elementGroupRowFlex.rowIndentRight) {
      rowFlexDom.style.marginRight = `${elementGroupRowFlex.rowIndentRight}px`
    }
    // 布局内容
    rowFlexDom.innerHTML = buildDom(elementGroupRowFlex.data).innerHTML
    // 未设置行布局时无需行布局容器
    if (!isDefaultRowFlex || hasRowIndent) {
      clipboardDom.append(rowFlexDom)
    } else {
      rowFlexDom.childNodes.forEach(child => {
        clipboardDom.append(child.cloneNode(true))
      })
    }
  }
  return clipboardDom
}

export function convertTextNodeToElement(
  textNode: Element | Node
): IElement | null {
  if (!textNode || textNode.nodeType !== 3) return null
  const parentNode = <HTMLElement>textNode.parentNode
  const anchorNode =
    parentNode.nodeName === 'FONT'
      ? <HTMLElement>parentNode.parentNode
      : parentNode
  const rowFlex = convertTextAlignToRowFlex(anchorNode)
  const value = textNode.textContent
  const style = window.getComputedStyle(anchorNode)
  if (!value || anchorNode.nodeName === 'STYLE') return null
  const element: IElement = {
    value,
    font: style.fontFamily.replace(/^["']|["']$/g, ''),
    bold: Number(style.fontWeight) > 500,
    italic: style.fontStyle.includes('italic'),
    size: Math.floor(parseFloat(style.fontSize))
  }
  if (getHasExplicitTextColor(anchorNode)) {
    element.color = style.color
  }
  const groupIds = anchorNode.dataset.groupIds
  if (groupIds) {
    element.groupIds = groupIds
      .split(',')
      .map(groupId => groupId.trim())
      .filter(Boolean)
  }
  // 元素类型-默认文本
  if (anchorNode.nodeName === 'SUB' || style.verticalAlign === 'sub') {
    element.type = ElementType.SUBSCRIPT
  } else if (anchorNode.nodeName === 'SUP' || style.verticalAlign === 'super') {
    element.type = ElementType.SUPERSCRIPT
  }
  // 行对齐
  if (rowFlex !== RowFlex.LEFT) {
    element.rowFlex = rowFlex
  }
  const textIndent = parseFloat(style.textIndent || '0')
  const marginLeft = parseFloat(style.marginLeft || '0')
  const marginRight = parseFloat(style.marginRight || '0')
  const paddingLeft = parseFloat(style.paddingLeft || '0')
  if (marginLeft) {
    element.rowIndentLeft = marginLeft
  }
  if (marginRight) {
    element.rowIndentRight = marginRight
  }
  if (paddingLeft) {
    element.rowHangingIndent = paddingLeft
    const firstLineIndent = textIndent + paddingLeft
    if (firstLineIndent > 0) {
      element.rowIndent = firstLineIndent
    }
  } else if (textIndent > 0) {
    element.rowIndent = textIndent
  } else if (textIndent < 0) {
    element.rowHangingIndent = Math.abs(textIndent)
  }
  // 高亮色
  if (style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
    element.highlight = style.backgroundColor
  }
  // 下划线
  if (style.textDecorationLine.includes('underline')) {
    element.underline = true
  }
  // 删除线
  if (style.textDecorationLine.includes('line-through')) {
    element.strikeout = true
  }
  return element
}

function getHasExplicitTextColor(node: HTMLElement): boolean {
  let currentNode: HTMLElement | null = node
  while (currentNode && currentNode !== document.body) {
    if (currentNode.style.color) {
      return true
    }
    currentNode = currentNode.parentElement
  }
  return false
}

/** 获取元素列表byhtml选项，用于约束调用方可传入的可选配置。 */
export interface IGetElementListByHTMLOption {
  /** 内部可用宽度，用于排版时扣除边距或缩进。 */
  innerWidth: number
}

export function getElementListByHTML(
  htmlText: string,
  options: IGetElementListByHTMLOption = {
    innerWidth: window.innerWidth
  }
): IElement[] {
  const elementList: IElement[] = []
  function findTextNode(dom: Element | Node) {
    if (dom.nodeType === 3) {
      const element = convertTextNodeToElement(dom)
      if (element) {
        elementList.push(element)
      }
    } else if (dom.nodeType === 1) {
      const childNodes = dom.childNodes
      for (let n = 0; n < childNodes.length; n++) {
        const node = childNodes[n]
        if ((node as HTMLElement).dataset?.cePageBreak === 'true') {
          elementList.push({
            type: ElementType.PAGE_BREAK,
            value: '\n'
          })
          continue
        }
        // br元素与display:block元素需换行
        if (node.nodeName === 'BR') {
          elementList.push({
            value: '\n'
          })
        } else if (node.nodeName === 'A') {
          const aElement = node as HTMLLinkElement
          const value = aElement.innerText
          if (value) {
            elementList.push({
              type: ElementType.HYPERLINK,
              value: '',
              valueList: [
                {
                  value
                }
              ],
              url: aElement.href
            })
          }
        } else if (/H[1-6]/.test(node.nodeName)) {
          const hElement = node as HTMLTitleElement
          const valueList = getElementListByHTML(
            replaceHTMLElementTag(hElement, 'div').outerHTML,
            options
          )
          elementList.push({
            value: '',
            type: ElementType.TITLE,
            level: titleNodeNameMapping[node.nodeName],
            valueList
          })
          if (
            node.nextSibling &&
            !INLINE_NODE_NAME.includes(node.nextSibling.nodeName)
          ) {
            elementList.push({
              value: '\n'
            })
          }
        } else if (node.nodeName === 'UL' || node.nodeName === 'OL') {
          const listNode = node as HTMLOListElement | HTMLUListElement
          const listElement: IElement = {
            value: '',
            type: ElementType.LIST,
            valueList: []
          }
          if (node.nodeName === 'OL') {
            listElement.listType = ListType.OL
          } else {
            listElement.listType = ListType.UL
            listElement.listStyle = <ListStyle>(
              (<unknown>listNode.style.listStyleType)
            )
          }
          listNode.querySelectorAll('li').forEach(li => {
            const liValueList = getElementListByHTML(li.innerHTML, options)
            liValueList.forEach(list => {
              if (list.value === '\n') {
                list.listWrap = true
              }
            })
            liValueList.unshift({
              value: '\n'
            })
            listElement.valueList!.push(...liValueList)
          })
          elementList.push(listElement)
        } else if (node.nodeName === 'HR') {
          elementList.push({
            value: '\n',
            type: ElementType.SEPARATOR
          })
        } else if (node.nodeName === 'IMG') {
          const imageNode = node as HTMLImageElement
          const { src, width, height } = imageNode
          if (src) {
            const imageElement: IElement = {
              width: width || 1,
              height: height || 1,
              value: src,
              type: ElementType.IMAGE
            }
            const imageDisplay = imageNode.dataset.ceImageDisplay as
              | ImageDisplay
              | undefined
            if (
              imageDisplay &&
              Object.values(ImageDisplay).includes(imageDisplay)
            ) {
              imageElement.imgDisplay = imageDisplay
            }
            const x = Number(imageNode.dataset.ceImageFloatX)
            const y = Number(imageNode.dataset.ceImageFloatY)
            const pageNo = Number(imageNode.dataset.ceImageFloatPageNo)
            if (!Number.isNaN(x) && !Number.isNaN(y)) {
              imageElement.imgFloatPosition = {
                x,
                y
              }
              if (!Number.isNaN(pageNo)) {
                imageElement.imgFloatPosition.pageNo = pageNo
              }
            }
            const rowFlex = convertTextAlignToRowFlex(node.parentElement!)
            if (rowFlex !== RowFlex.LEFT) {
              imageElement.rowFlex = rowFlex
            }
            elementList.push(imageElement)
          }
        } else if (node.nodeName === 'VIDEO') {
          const { src, width, height } = node as HTMLVideoElement
          if (src && width && height) {
            elementList.push({
              value: '',
              type: ElementType.BLOCK,
              block: {
                type: BlockType.VIDEO,
                videoBlock: {
                  src
                }
              },
              width,
              height
            })
          }
        } else if (node.nodeName === 'IFRAME') {
          const { src, srcdoc, width, height } = node as HTMLIFrameElement
          if ((src || srcdoc) && width && height) {
            elementList.push({
              value: '',
              type: ElementType.BLOCK,
              block: {
                type: BlockType.IFRAME,
                iframeBlock: {
                  src,
                  srcdoc
                }
              },
              width: parseInt(width),
              height: parseInt(height)
            })
          }
        } else if (
          node.nodeName === 'DIV' &&
          (node as HTMLElement).dataset.ceBlockType === BlockType.HTML
        ) {
          const htmlElement = node as HTMLDivElement
          const width = parseInt(htmlElement.style.width) || options.innerWidth
          const height = parseInt(htmlElement.style.height) || 120
          elementList.push({
            value: '',
            type: ElementType.BLOCK,
            block: {
              type: BlockType.HTML,
              htmlBlock: {
                html: htmlElement.innerHTML,
                text: htmlElement.textContent?.replace(/\s+/g, ' ').trim()
              }
            },
            width,
            height
          })
        } else if (node.nodeName === 'TABLE') {
          const tableElement = node as HTMLTableElement
          const element: IElement = {
            type: ElementType.TABLE,
            value: '\n',
            colgroup: [],
            trList: []
          }
          // colgroup
          const colElements = tableElement.querySelectorAll('colgroup col')
          // 基础数据
          tableElement.querySelectorAll('tr').forEach(trElement => {
            const trHeightStr = Number(
              window.getComputedStyle(trElement).height.replace('px', '')
            )
            const tr: ITr = {
              height: trHeightStr,
              minHeight: trHeightStr,
              tdList: []
            }
            trElement.querySelectorAll('th,td').forEach(tdElement => {
              const tableCell = <HTMLTableCellElement>tdElement
              const valueList = getElementListByHTML(
                tableCell.innerHTML,
                options
              )
              const td: ITd = {
                colspan: tableCell.colSpan,
                rowspan: tableCell.rowSpan,
                value: valueList,
                verticalAlign: window.getComputedStyle(tdElement)
                  .verticalAlign as VerticalAlign,
                width: parseFloat(window.getComputedStyle(tdElement).width)
              }
              if (tableCell.style.backgroundColor) {
                td.backgroundColor = tableCell.style.backgroundColor
              }
              tr.tdList.push(td)
            })
            element.trList!.push(tr)
          })
          if (element.trList!.length) {
            // 列选项数据
            const tdCount = element.trList![0].tdList.reduce(
              (pre, cur) => pre + cur.colspan,
              0
            )
            const width = Math.ceil(options.innerWidth / tdCount)
            for (let i = 0; i < tdCount; i++) {
              const colElement = colElements[i]?.getAttribute('width')
              element.colgroup!.push({
                width: colElement ? parseFloat(colElement) : width
              })
            }
            elementList.push(element)
          }
        } else if (
          node.nodeName === 'INPUT' &&
          (<HTMLInputElement>node).type === ControlComponent.CHECKBOX
        ) {
          elementList.push({
            type: ElementType.CHECKBOX,
            value: '',
            checkbox: {
              value: (<HTMLInputElement>node).checked
            }
          })
        } else if (
          node.nodeName === 'INPUT' &&
          (<HTMLInputElement>node).type === ControlComponent.RADIO
        ) {
          elementList.push({
            type: ElementType.RADIO,
            value: '',
            radio: {
              value: (<HTMLInputElement>node).checked
            }
          })
        } else {
          findTextNode(node)
          if (node.nodeType === 1 && n !== childNodes.length - 1) {
            const nodeElement = node as Element
            const display = window.getComputedStyle(nodeElement).display
            if (
              display === 'block' &&
              !/(\n|\r\n)$/.test(nodeElement.textContent!)
            ) {
              elementList.push({
                value: '\n'
              })
            }
          }
        }
      }
    }
  }
  // 追加dom
  const clipboardDom = document.createElement('div')
  clipboardDom.innerHTML = htmlText
  document.body.appendChild(clipboardDom)
  // 初始化 delete Nodes 列表。
  const deleteNodes: ChildNode[] = []
  clipboardDom.childNodes.forEach(child => {
    if (child.nodeType !== 1 && !child.textContent?.trim()) {
      deleteNodes.push(child)
    }
  })
  deleteNodes.forEach(node => node.remove())
  // 搜索文本节点
  findTextNode(clipboardDom)
  // 移除dom
  clipboardDom.remove()
  return elementList
}
