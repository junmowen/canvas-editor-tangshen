import { WordBreak } from '../../../dataset/enum/Editor'
import { IElement } from '../../../interface/Element'
import { IRow } from '../../../interface/Row'
import { isPlainTextElement } from '../../modules/paragraph/layout/ParagraphRowLayoutPolicy'
import type { Draw } from '../Draw'
import {
  measureOpeningPunctuationNextWidth,
  resolveCjkLatinSpacing
} from './RowLayoutTypographyPolicy'

/** 解析当前元素加入行后的候选宽度，用于后续断行策略判断。 */
export function resolveRowLayoutCandidateWidth(payload: {
  draw: Draw
  ctx: CanvasRenderingContext2D
  elementList: IElement[]
  index: number
  element: IElement
  preElement?: IElement
  curRow: IRow
  baseCurRowWidth: number
  metricsWidth: number
  availableWidth: number
  scale: number
  wordBreak: WordBreak
}) {
  const {
    draw,
    ctx,
    elementList,
    index,
    element,
    preElement,
    curRow,
    baseCurRowWidth,
    metricsWidth,
    availableWidth,
    scale,
    wordBreak
  } = payload
  let curRowWidth = baseCurRowWidth
  if (
    wordBreak === WordBreak.BREAK_WORD &&
    isPlainTextElement(preElement) &&
    isPlainTextElement(element)
  ) {
    const word = `${preElement?.value || ''}${element.value}`
    if (draw.getWordLikeReg().test(word)) {
      const { width } = draw
        .getTextParticle()
        .measureWord(ctx, elementList, index)
      const wordWidth = width * scale
      if (wordWidth <= availableWidth) {
        curRowWidth += wordWidth
      }
    }
  }
  const cjkLatinSpacing = resolveCjkLatinSpacing({
    draw,
    preElement,
    element,
    scale
  })
  curRowWidth += cjkLatinSpacing
  const openingPunctuationNextWidth =
    measureOpeningPunctuationNextWidth({
      draw,
      ctx,
      elementList,
      index,
      scale
    })
  if (
    openingPunctuationNextWidth > 0 &&
    curRow.elementList.length > 0 &&
    curRow.width + metricsWidth <= availableWidth &&
    metricsWidth + openingPunctuationNextWidth <= availableWidth &&
    curRow.width + metricsWidth + openingPunctuationNextWidth >
      availableWidth
  ) {
    curRowWidth = curRow.width + metricsWidth + openingPunctuationNextWidth
  }
  return {
    curRowWidth,
    cjkLatinSpacing
  }
}
