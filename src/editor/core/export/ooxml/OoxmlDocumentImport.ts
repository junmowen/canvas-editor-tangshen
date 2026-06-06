import { IEditorData } from '../../../interface/Editor'
import { IElement, ITrackChange, TrackChangeType } from '../../../interface/Element'
import { OoxmlImportRelationshipMap } from './OoxmlImportRelationships'
import {
  parseOoxmlMathElement,
  parseOoxmlMathParagraphElement
} from './OoxmlFormulaImport'
import {
  parseOoxmlDrawingImageElement,
  TOoxmlImageDataUrlCache
} from './OoxmlImageImport'
import { parseOoxmlStructuredDocumentTagElement } from './OoxmlControlImport'
import {
  getOoxmlChildElement as getFirstChildElement,
  getOoxmlChildElements as getChildElements
} from './OoxmlDom'
import {
  isOoxmlPageBreakElement,
  resolveOoxmlParagraphChildKind,
  resolveOoxmlRunChildKind,
  resolveOoxmlTrackChangeType,
  resolveOoxmlTrackChangeChildKind
} from './OoxmlDocumentImportAdapter'
import {
  applyOoxmlRunImportStyle,
  parseOoxmlRunImportStyle
} from './OoxmlRunImportStyle'
import {
  applyOoxmlParagraphImportStyle,
  parseOoxmlParagraphImportStyle
} from './OoxmlParagraphImportStyle'
import {
  appendOoxmlParagraphEnd,
  createOoxmlPageBreakElement,
  createOoxmlTabElement,
  createOoxmlTextElement
} from './OoxmlDocumentElementFactory'
import {
  applyOoxmlTrackChangeImport,
  parseOoxmlTrackChange
} from './OoxmlTrackChangeImport'
import { parseOoxmlXmlDocument } from './OoxmlXmlDocumentImport'
import { parseOoxmlHyperlinkElement } from './OoxmlHyperlinkImport'
import { parseOoxmlBlockContainerElement } from './OoxmlBlockContainerImport'

/** OOXML 主文档 XML 解析结果，保留正文元素列表和可直接 setValue 的编辑器数据。 */
export interface IOoxmlDocumentImportResult {
  /** 从 word/document.xml 的 w:body 中解析出的正文元素列表。 */
  elementList: IElement[]
  /** 内部编辑器数据结构，当前增量只填充 main。 */
  data: IEditorData
}

/** OOXML 主文档导入选项，用于把关系表等外部上下文传入正文解析。 */
export interface IOoxmlDocumentImportOption {
  /** document.xml.rels 解析得到的 rId 映射，当前用于恢复超链接 URL。 */
  relationships?: OoxmlImportRelationshipMap
  /** DOCX package 原始部件字节，用于把 word/media 图片资源回填为 data URL。 */
  packageParts?: Record<string, Uint8Array>
  /** 单次导入请求内的图片 data URL 缓存，正文、页眉、页脚共享时可避免重复编码。 */
  imageDataUrlCache?: TOoxmlImageDataUrlCache
  /** 当前 OOXML 修订上下文，由 w:ins/w:del 包裹结构向内部 run 透传。 */
  trackChange?: ITrackChange
}

/** 页眉页脚 XML 导入选项，限制根节点类型，避免把错误部件按正文吞掉。 */
export interface IOoxmlHeaderFooterImportOption
  extends IOoxmlDocumentImportOption {
  /** 期望的根节点本地名，页眉为 hdr，页脚为 ftr。 */
  rootLocalName: 'hdr' | 'ftr'
}

/** 解析 w:ins/w:del 包裹的段落内行内内容，并把修订信息透传到子元素。 */
function parseOoxmlTrackChangeElement(
  changeElement: Element,
  options: IOoxmlDocumentImportOption
) {
  const trackChangeType: TrackChangeType =
    resolveOoxmlTrackChangeType(changeElement)
  const trackChangeOptions: IOoxmlDocumentImportOption = {
    ...options,
    trackChange: parseOoxmlTrackChange(changeElement, trackChangeType)
  }
  const elementList: IElement[] = []
  for (const childElement of getChildElements(changeElement)) {
    const childKind = resolveOoxmlTrackChangeChildKind(childElement)
    if (childKind === 'run') {
      elementList.push(...parseOoxmlRunElement(childElement, trackChangeOptions))
      continue
    }
    if (childKind === 'hyperlink') {
      elementList.push(
        ...parseOoxmlHyperlinkElement(
          childElement,
          trackChangeOptions,
          parseOoxmlRunElement
        )
      )
      continue
    }
    if (childKind === 'sdt') {
      elementList.push(
        ...parseOoxmlStructuredDocumentTagElement(
          childElement,
          trackChangeOptions,
          {
            parseRunElement: parseOoxmlRunElement,
            parseParagraphElement: parseOoxmlParagraphElement
          }
        )
      )
      continue
    }
    if (childKind === 'math') {
      elementList.push(
        applyOoxmlTrackChangeImport(
          parseOoxmlMathElement(childElement),
          trackChangeOptions.trackChange
        )
      )
      continue
    }
    if (childKind === 'mathParagraph') {
      elementList.push(
        ...parseOoxmlMathParagraphElement(childElement).map(element =>
          applyOoxmlTrackChangeImport(element, trackChangeOptions.trackChange)
        )
      )
    }
  }
  return elementList
}

/** 解析 w:r 内的最小行内内容，当前覆盖 w:t、w:tab、w:br 和内联图片。 */
function parseOoxmlRunElement(
  runElement: Element,
  options: IOoxmlDocumentImportOption = {}
) {
  const elementList: IElement[] = []
  const runStyle = parseOoxmlRunImportStyle(runElement)
  for (const childElement of getChildElements(runElement)) {
    const childKind = resolveOoxmlRunChildKind(childElement)
    // rPr 已在 run 开始时解析，不能当作正文内容处理。
    if (childKind === 'runProperties') {
      continue
    }
    // w:t/w:delText 是普通文本节点，textContent 会自动完成 XML 实体反转义。
    if (childKind === 'text') {
      elementList.push(createOoxmlTextElement(childElement.textContent || ''))
      continue
    }
    // w:tab 使用内部 TAB 元素表示，value 保持为空字符串。
    if (childKind === 'tab') {
      elementList.push(createOoxmlTabElement())
      continue
    }
    // w:br 默认作为文本内换行，分页符保留为 PAGE_BREAK 元素。
    if (childKind === 'break') {
      elementList.push(
        isOoxmlPageBreakElement(childElement)
          ? createOoxmlPageBreakElement()
          : createOoxmlTextElement('\n')
      )
      continue
    }
    // w:drawing 第一批恢复内联图片结构，媒体二进制后续由 DOCX package 上下文补齐。
    if (childKind === 'drawing') {
      elementList.push(...parseOoxmlDrawingImageElement(childElement, options))
    }
  }
  const implicitDeleteTrackChange = getFirstChildElement(runElement, 'delText')
    ? parseOoxmlTrackChange(undefined, 'delete')
    : undefined
  const trackChange = options.trackChange || implicitDeleteTrackChange
  return elementList.map(element =>
    applyOoxmlTrackChangeImport(
      applyOoxmlRunImportStyle(element, runStyle),
      trackChange
    )
  )
}

/** 解析单个 w:p 段落，并在段落末尾补充内部 ZERO 段落符。 */
function parseOoxmlParagraphElement(
  paragraphElement: Element,
  options: IOoxmlDocumentImportOption
) {
  const elementList: IElement[] = []
  const paragraphStyle = parseOoxmlParagraphImportStyle(paragraphElement)
  for (const childElement of getChildElements(paragraphElement)) {
    const childKind = resolveOoxmlParagraphChildKind(childElement)
    // w:pPr 是段落属性节点，已在段落入口统一解析，不参与正文内容流。
    if (childKind === 'paragraphProperties') {
      continue
    }
    // 普通 run 直接解析为文本/TAB/换行等行内元素。
    if (childKind === 'run') {
      elementList.push(...parseOoxmlRunElement(childElement, options))
      continue
    }
    // w:ins/w:del 是 Word 修订包裹结构，内部 run 需要恢复 trackChange。
    if (childKind === 'trackChange') {
      elementList.push(...parseOoxmlTrackChangeElement(childElement, options))
      continue
    }
    // hyperlink 是段落内包裹结构，需要结合 document relationships 恢复 URL。
    if (childKind === 'hyperlink') {
      elementList.push(
        ...parseOoxmlHyperlinkElement(
          childElement,
          options,
          parseOoxmlRunElement
        )
      )
      continue
    }
    // w:sdt 是内容控件，第一批恢复业务控件 tag 和选项，无法识别时保留普通文本。
    if (childKind === 'sdt') {
      elementList.push(
        ...parseOoxmlStructuredDocumentTagElement(childElement, options, {
          parseRunElement: parseOoxmlRunElement,
          parseParagraphElement: parseOoxmlParagraphElement
        })
      )
      continue
    }
    // m:oMath 是 Word 原生公式，导入为内部结构化公式元素。
    if (childKind === 'math') {
      elementList.push(parseOoxmlMathElement(childElement))
      continue
    }
    // m:oMathPara 是 Word 块级公式容器，直接恢复其中的公式元素。
    if (childKind === 'mathParagraph') {
      elementList.push(...parseOoxmlMathParagraphElement(childElement))
    }
  }
  appendOoxmlParagraphEnd(elementList)
  return applyOoxmlParagraphImportStyle(elementList, paragraphStyle)
}

/** 把 word/header*.xml 或 word/footer*.xml 解析为内部页眉/页脚元素列表。 */
export function parseOoxmlHeaderFooterXmlToElementList(
  xml: string,
  options: IOoxmlHeaderFooterImportOption
) {
  const importOptions = {
    ...options,
    imageDataUrlCache: options.imageDataUrlCache || new Map()
  }
  const rootElement = parseOoxmlXmlDocument(xml, {
    partName: importOptions.rootLocalName === 'hdr' ? 'header XML' : 'footer XML',
    rootLocalName: importOptions.rootLocalName
  })
  return parseOoxmlBlockContainerElement(
    rootElement,
    importOptions,
    parseOoxmlParagraphElement
  )
}

/** 把 word/document.xml 解析为内部正文元素列表和 IEditorData.main。 */
export function parseOoxmlDocumentXmlToEditorData(
  documentXml: string | Document,
  options: IOoxmlDocumentImportOption = {}
): IOoxmlDocumentImportResult {
  const importOptions = {
    ...options,
    imageDataUrlCache: options.imageDataUrlCache || new Map()
  }
  const documentElement = parseOoxmlXmlDocument(documentXml, {
    partName: 'word/document.xml',
    rootLocalName: 'document'
  })
  const bodyElement = getFirstChildElement(documentElement, 'body')
  // 主文档缺少 body 说明不是可导入的 WordprocessingML 主文档。
  if (!bodyElement) {
    throw new Error('Missing OOXML w:body')
  }

  const elementList = parseOoxmlBlockContainerElement(
    bodyElement,
    importOptions,
    parseOoxmlParagraphElement
  )
  return {
    elementList,
    data: {
      main: elementList
    }
  }
}
