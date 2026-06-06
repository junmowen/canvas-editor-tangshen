import { ElementType } from '../../../src/editor/dataset/enum/Element'
import type { IElement } from '../../../src/editor/interface/Element'
import {
  isLineEndForbiddenOpenPunctuation,
  isLineStartForbiddenClosingPunctuation,
  isNumberUnitSuffixElement,
  shouldApplyCjkLatinSpacing,
  shouldHangLineEndPunctuation
} from '../../../src/editor/core/modules/paragraph/layout/ChineseLineBreakPolicy'

function text(value: string): IElement {
  return { value }
}

describe('chinese line break policy', () => {
  it('keeps common numeric unit suffixes attached to the preceding number body', () => {
    expect(isNumberUnitSuffixElement([text('1'), text('0'), text('%')], 2)).to.eq(
      true
    )
    expect(
      isNumberUnitSuffixElement([text('3'), text('.'), text('5'), text('℃')], 3)
    ).to.eq(true)
    expect(
      isNumberUnitSuffixElement(
        [text('1'), text('0'), text('m'), text('/'), text('s')],
        4
      )
    ).to.eq(true)
    expect(
      isNumberUnitSuffixElement([text('1'), text('0'), text('个')], 2, ['个'])
    ).to.eq(true)
  })

  it('does not treat standalone units or units after non-text boundaries as suffixes', () => {
    expect(isNumberUnitSuffixElement([text('m')], 0)).to.eq(false)
    expect(isNumberUnitSuffixElement([text('长'), text('m')], 1)).to.eq(false)
    expect(
      isNumberUnitSuffixElement(
        [text('1'), { value: '', type: ElementType.IMAGE }, text('m')],
        2
      )
    ).to.eq(false)
  })

  it('identifies default and custom opening punctuation forbidden at line end', () => {
    expect(isLineEndForbiddenOpenPunctuation(text('（'))).to.eq(true)
    expect(isLineEndForbiddenOpenPunctuation(text('《'))).to.eq(true)
    expect(isLineEndForbiddenOpenPunctuation(text('，'))).to.eq(false)
    expect(isLineEndForbiddenOpenPunctuation(text('｛'), ['｛'])).to.eq(true)
    expect(
      isLineEndForbiddenOpenPunctuation({
        value: '（',
        type: ElementType.IMAGE
      })
    ).to.eq(false)
  })

  it('identifies line-end hanging punctuation without matching opening marks', () => {
    expect(shouldHangLineEndPunctuation(text('，'))).to.eq(true)
    expect(shouldHangLineEndPunctuation(text('。'))).to.eq(true)
    expect(shouldHangLineEndPunctuation(text('？'))).to.eq(true)
    expect(shouldHangLineEndPunctuation(text('（'))).to.eq(false)
    expect(shouldHangLineEndPunctuation(text('中'))).to.eq(false)
    expect(
      shouldHangLineEndPunctuation({
        value: '，',
        type: ElementType.IMAGE
      })
    ).to.eq(false)
  })

  it('identifies closing punctuation forbidden at line start', () => {
    expect(isLineStartForbiddenClosingPunctuation(text('）'))).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('】'))).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('》'))).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('”'))).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('，'))).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('。'))).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('？'))).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('‧'), ['‧'])).to.eq(true)
    expect(isLineStartForbiddenClosingPunctuation(text('（'))).to.eq(false)
    expect(isLineStartForbiddenClosingPunctuation(text('中'))).to.eq(false)
    expect(
      isLineStartForbiddenClosingPunctuation({
        value: '）',
        type: ElementType.IMAGE
      })
    ).to.eq(false)
  })

  it('applies spacing only between adjacent CJK and latin or numeric text', () => {
    expect(shouldApplyCjkLatinSpacing(text('中'), text('A'))).to.eq(true)
    expect(shouldApplyCjkLatinSpacing(text('A'), text('中'))).to.eq(true)
    expect(shouldApplyCjkLatinSpacing(text('中'), text('1'))).to.eq(true)
    expect(shouldApplyCjkLatinSpacing(text('1'), text('中'))).to.eq(true)
    expect(shouldApplyCjkLatinSpacing(text('中'), text('文'))).to.eq(false)
    expect(shouldApplyCjkLatinSpacing(text('A'), text('1'))).to.eq(false)
    expect(
      shouldApplyCjkLatinSpacing(
        { value: '中', type: ElementType.IMAGE },
        text('A')
      )
    ).to.eq(false)
  })
})
