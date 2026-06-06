import { IElement } from '../../../interface/Element'
import { getOoxmlChildElements as getChildElements } from './OoxmlDom'
import type { IOoxmlDocumentImportOption } from './OoxmlDocumentImport'
import {
  resolveOoxmlBlockChildKind
} from './OoxmlDocumentImportAdapter'
import { parseOoxmlMathParagraphElement } from './OoxmlFormulaImport'
import { parseOoxmlTableElement } from './OoxmlTableImport'
import { appendOoxmlParagraphEnd } from './OoxmlDocumentElementFactory'

/** 解析块级容器的直接段落、表格和块级公式。 */
export function parseOoxmlBlockContainerElement(
  containerElement: Element,
  options: IOoxmlDocumentImportOption,
  parseParagraphElement: (
    paragraphElement: Element,
    options: IOoxmlDocumentImportOption
  ) => IElement[]
) {
  const elementList: IElement[] = []
  for (const childElement of getChildElements(containerElement)) {
    const childKind = resolveOoxmlBlockChildKind(childElement)
    if (childKind === 'paragraph') {
      elementList.push(...parseParagraphElement(childElement, options))
      continue
    }
    if (childKind === 'table') {
      elementList.push(
        parseOoxmlTableElement(childElement, options, parseParagraphElement)
      )
      continue
    }
    if (childKind === 'mathParagraph') {
      elementList.push(...parseOoxmlMathParagraphElement(childElement))
      appendOoxmlParagraphEnd(elementList)
    }
  }
  return elementList
}
