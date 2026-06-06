import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'
import {
  applyDocumentStyleToElement,
  clearDocumentStyleFromElement,
  resolveDocumentStyleCascade,
  resolveElementCurrentStyleId,
  resolveElementStyleWithDocumentStyle
} from '../../../src/editor/core/modules/style/DocumentStylePolicy'
import { IDocumentStyle } from '../../../src/editor/interface/Style'

describe('document style policy', () => {
  const styles: IDocumentStyle[] = [
    {
      id: 'Body',
      name: '正文',
      paragraph: {
        rowFlex: RowFlex.LEFT,
        spaceAfter: 8
      },
      text: {
        font: 'Microsoft YaHei',
        size: 16,
        color: '#333333'
      }
    },
    {
      id: 'Quote',
      name: '引用',
      basedOn: 'Body',
      paragraph: {
        rowFlex: RowFlex.CENTER,
        rowIndentLeft: 24
      },
      text: {
        italic: true,
        color: '#666666'
      }
    }
  ]

  it('resolves basedOn cascade and lets child style override parent fields', () => {
    const style = resolveDocumentStyleCascade(styles, 'Quote')

    expect(style?.paragraph?.spaceAfter).to.eq(8)
    expect(style?.paragraph?.rowFlex).to.eq(RowFlex.CENTER)
    expect(style?.paragraph?.rowIndentLeft).to.eq(24)
    expect(style?.text?.font).to.eq('Microsoft YaHei')
    expect(style?.text?.size).to.eq(16)
    expect(style?.text?.italic).to.eq(true)
    expect(style?.text?.color).to.eq('#666666')
  })

  it('keeps direct element formatting above document style values', () => {
    const result = resolveElementStyleWithDocumentStyle({
      styles,
      element: {
        value: '直接格式',
        styleId: 'Quote',
        color: '#CC0000',
        size: 20,
        rowFlex: RowFlex.RIGHT
      }
    })

    expect(result.font).to.eq('Microsoft YaHei')
    expect(result.italic).to.eq(true)
    expect(result.color).to.eq('#CC0000')
    expect(result.size).to.eq(20)
    expect(result.rowFlex).to.eq(RowFlex.RIGHT)
  })

  it('applies clears and identifies current style ids', () => {
    const applied = applyDocumentStyleToElement(
      { value: '引用段落' },
      styles,
      'Quote'
    )
    const cleared = clearDocumentStyleFromElement(applied)

    expect(applied.styleId).to.eq('Quote')
    expect(applied.styleName).to.eq('引用')
    expect(applied.italic).to.eq(true)
    expect(resolveElementCurrentStyleId(applied, styles)).to.eq('Quote')
    expect(cleared.styleId).to.eq(undefined)
    expect(resolveElementCurrentStyleId({ value: '标题', level: TitleLevel.SECOND }, styles)).to.eq('Heading2')
    expect(resolveElementCurrentStyleId({ value: '正文' }, styles)).to.eq('Normal')
  })

  it('guards cyclic basedOn definitions without hanging', () => {
    const cyclicStyles: IDocumentStyle[] = [
      { id: 'A', basedOn: 'B', text: { bold: true } },
      { id: 'B', basedOn: 'A', text: { italic: true } }
    ]
    const style = resolveDocumentStyleCascade(cyclicStyles, 'A')

    expect(style?.id).to.eq('A')
    expect(style?.text?.bold).to.eq(true)
  })
})
