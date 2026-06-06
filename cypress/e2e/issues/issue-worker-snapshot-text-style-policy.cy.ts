import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import type { IRowElement } from '../../../src/editor/interface/Row'
import {
  isWorkerSnapshotStrikeoutTextElement,
  isWorkerSnapshotTextElement,
  resolveWorkerSnapshotInlineTextOffsetY,
  resolveWorkerSnapshotTextFillStyle,
  shouldDrawWorkerSnapshotStandaloneText,
  shouldOffsetWorkerSnapshotSubscriptDecoration,
  shouldUseWorkerSnapshotHyperlinkUnderline
} from '../../../src/editor/core/modules/richtext/render/WorkerSnapshotTextStylePolicy'

function rowElement(overrides: Partial<IRowElement> = {}): IRowElement {
  return {
    value: 'worker snapshot text',
    metrics: {
      width: 24,
      height: 18,
      boundingBoxAscent: 14,
      boundingBoxDescent: 4
    },
    style: 'normal 16px Arial',
    ...overrides
  }
}

describe('worker snapshot text style policy', () => {
  it('accepts regular styled text without forcing standalone drawing', () => {
    const element = rowElement({
      type: ElementType.TEXT,
      font: 'SimSun',
      size: 18,
      bold: true,
      italic: true,
      underline: true,
      strikeout: true,
      color: '#123456',
      highlight: '#ffee00'
    })

    expect(isWorkerSnapshotTextElement(element), 'styled text is supported').to.eq(
      true
    )
    expect(
      shouldDrawWorkerSnapshotStandaloneText(element),
      'basic text styles can remain in merged text drawing'
    ).to.eq(false)
    expect(
      resolveWorkerSnapshotTextFillStyle({
        element,
        defaultHyperlinkColor: '#0000ee',
        defaultColor: '#000000'
      }),
      'explicit text color is used for fillText'
    ).to.eq('#123456')
    expect(
      isWorkerSnapshotStrikeoutTextElement(element),
      'textlike styled elements can draw strikeout'
    ).to.eq(true)
  })

  it('resolves text fill color by explicit color, hyperlink default, and document default', () => {
    expect(
      resolveWorkerSnapshotTextFillStyle({
        element: rowElement({ color: '#111111' }),
        defaultHyperlinkColor: '#0000ee',
        defaultColor: '#222222'
      }),
      'explicit color wins'
    ).to.eq('#111111')
    expect(
      resolveWorkerSnapshotTextFillStyle({
        element: rowElement({ type: ElementType.HYPERLINK }),
        defaultHyperlinkColor: '#0000ee',
        defaultColor: '#222222'
      }),
      'hyperlink without explicit color uses hyperlink default'
    ).to.eq('#0000ee')
    expect(
      resolveWorkerSnapshotTextFillStyle({
        element: rowElement(),
        defaultHyperlinkColor: '#0000ee',
        defaultColor: '#222222'
      }),
      'plain text without explicit color uses document default'
    ).to.eq('#222222')
  })

  it('keeps hyperlink underline semantics separate from normal underline fields', () => {
    expect(
      shouldUseWorkerSnapshotHyperlinkUnderline(
        rowElement({ type: ElementType.HYPERLINK })
      ),
      'hyperlink defaults to underline'
    ).to.eq(true)
    expect(
      shouldUseWorkerSnapshotHyperlinkUnderline(
        rowElement({ type: ElementType.HYPERLINK, underline: false })
      ),
      'hyperlink can opt out of default underline'
    ).to.eq(false)
    expect(
      shouldUseWorkerSnapshotHyperlinkUnderline(rowElement({ underline: true })),
      'normal underline is handled by decoration drawing, not hyperlink default'
    ).to.eq(false)
  })

  it('uses standalone baseline offsets for superscript and subscript', () => {
    const superscript = rowElement({ type: ElementType.SUPERSCRIPT })
    const subscript = rowElement({ type: ElementType.SUBSCRIPT })

    expect(resolveWorkerSnapshotInlineTextOffsetY(superscript)).to.eq(-9)
    expect(resolveWorkerSnapshotInlineTextOffsetY(subscript)).to.eq(9)
    expect(resolveWorkerSnapshotInlineTextOffsetY(rowElement())).to.eq(0)
    expect(shouldDrawWorkerSnapshotStandaloneText(superscript)).to.eq(true)
    expect(shouldDrawWorkerSnapshotStandaloneText(subscript)).to.eq(true)
    expect(shouldOffsetWorkerSnapshotSubscriptDecoration(subscript)).to.eq(true)
    expect(shouldOffsetWorkerSnapshotSubscriptDecoration(superscript)).to.eq(
      false
    )
  })

  it('requires standalone drawing only for layout-affecting text cases', () => {
    expect(shouldDrawWorkerSnapshotStandaloneText(rowElement({ width: 32 }))).to.eq(
      true
    )
    expect(
      shouldDrawWorkerSnapshotStandaloneText(rowElement({ letterSpacing: 1 }))
    ).to.eq(true)
    expect(
      shouldDrawWorkerSnapshotStandaloneText(
        rowElement({ rowFlex: RowFlex.ALIGNMENT })
      )
    ).to.eq(true)
    expect(
      shouldDrawWorkerSnapshotStandaloneText(rowElement({ rowFlex: RowFlex.JUSTIFY }))
    ).to.eq(true)
    expect(
      shouldDrawWorkerSnapshotStandaloneText(
        rowElement({ type: ElementType.HYPERLINK })
      )
    ).to.eq(true)
    expect(
      shouldDrawWorkerSnapshotStandaloneText(rowElement({ type: ElementType.LATEX }))
    ).to.eq(true)
  })

  it('allows text-bearing element types and rejects non-text snapshot content', () => {
    const supportedTypes = [
      undefined,
      ElementType.TEXT,
      ElementType.CONTROL,
      ElementType.TITLE,
      ElementType.HYPERLINK,
      ElementType.DATE,
      ElementType.TAB,
      ElementType.SUPERSCRIPT,
      ElementType.SUBSCRIPT,
      ElementType.LATEX
    ]

    supportedTypes.forEach(type => {
      expect(isWorkerSnapshotTextElement(rowElement({ type })), `${type}`).to.eq(
        true
      )
    })
    expect(
      isWorkerSnapshotTextElement(rowElement({ type: ElementType.IMAGE })),
      'image is handled by image snapshot policy'
    ).to.eq(false)
    expect(
      isWorkerSnapshotTextElement(rowElement({ type: ElementType.TABLE })),
      'table is handled by table snapshot policy'
    ).to.eq(false)
  })
})
