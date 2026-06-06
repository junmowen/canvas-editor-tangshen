import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import type { IElement } from '../../../src/editor/interface/Element'
import type { IRow } from '../../../src/editor/interface/Row'
import {
  normalizeParagraphIndent,
  resolveParagraphOffsetX,
  resolveParagraphRightIndent,
  resolveRowFlexOffsetX,
  shouldApplyRowFlexSpacing
} from '../../../src/editor/core/modules/paragraph/layout/ParagraphRowLayoutPolicy'

function element(payload: Partial<IElement> = {}): IElement {
  return {
    value: '测',
    ...payload
  }
}

function row(payload: Partial<IRow> = {}): IRow {
  return {
    width: 120,
    height: 16,
    ascent: 12,
    startIndex: 0,
    elementList: [],
    ...payload
  }
}

describe('paragraph row layout policy', () => {
  it('normalizes paragraph indent values with scale and clamps invalid negatives', () => {
    expect(normalizeParagraphIndent(24, 2)).to.eq(48)
    expect(normalizeParagraphIndent(undefined, 2)).to.eq(0)
    expect(normalizeParagraphIndent(-16, 2)).to.eq(0)
  })

  it('resolves first-line, left, and hanging offsets without applying them to lists', () => {
    const target = element({
      rowIndentLeft: 12,
      rowIndent: 24,
      rowHangingIndent: 36
    })

    expect(
      resolveParagraphOffsetX({
        element: target,
        isParagraphFirstContentElement: true,
        scale: 2
      })
    ).to.eq(72)
    expect(
      resolveParagraphOffsetX({
        element: target,
        isParagraphFirstContentElement: false,
        scale: 2
      })
    ).to.eq(96)
    expect(
      resolveParagraphOffsetX({
        element: element({ ...target, listId: 'list-a' }),
        isParagraphFirstContentElement: true,
        scale: 2
      })
    ).to.eq(0)
  })

  it('resolves right indentation and skips list paragraphs', () => {
    expect(
      resolveParagraphRightIndent({
        element: element({ rowIndentRight: 30 }),
        scale: 1.5
      })
    ).to.eq(45)
    expect(
      resolveParagraphRightIndent({
        element: element({ listId: 'list-a', rowIndentRight: 30 }),
        scale: 1.5
      })
    ).to.eq(0)
  })

  it('computes row flex offsets with existing left and right indentation', () => {
    expect(
      resolveRowFlexOffsetX({
        row: row({ rowFlex: RowFlex.CENTER, rowFlexOffsetX: 20, rightOffsetX: 30 }),
        innerWidth: 250
      })
    ).to.eq(40)
    expect(
      resolveRowFlexOffsetX({
        row: row({ rowFlex: RowFlex.RIGHT, rowFlexOffsetX: 20, rightOffsetX: 30 }),
        innerWidth: 250
      })
    ).to.eq(80)
    expect(
      resolveRowFlexOffsetX({
        row: row({ isSurround: true, rowFlex: RowFlex.RIGHT }),
        innerWidth: 250
      })
    ).to.eq(0)
  })

  it('applies justify spacing only for eligible non-surround rows', () => {
    expect(
      shouldApplyRowFlexSpacing({
        row: row(),
        preElement: element({ rowFlex: RowFlex.JUSTIFY })
      })
    ).to.eq(true)
    expect(
      shouldApplyRowFlexSpacing({
        row: row({ isWidthNotEnough: true }),
        preElement: element({ rowFlex: RowFlex.ALIGNMENT })
      })
    ).to.eq(true)
    expect(
      shouldApplyRowFlexSpacing({
        row: row({ isSurround: true }),
        preElement: element({ rowFlex: RowFlex.JUSTIFY })
      })
    ).to.eq(false)
  })
})
