import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { NumberType } from '../../../src/editor/dataset/enum/Common'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import { LineNumberType } from '../../../src/editor/dataset/enum/LineNumber'
import { VerticalAlign } from '../../../src/editor/dataset/enum/VerticalAlign'
import { TableBorder, TdBorder } from '../../../src/editor/dataset/enum/table/Table'
import {
  createOoxmlDocxBytes,
  createOoxmlPackageParts
} from '../../../src/editor/core/export/ooxml/OoxmlPackage'
import { importOoxmlDocxBytesToEditorData } from '../../../src/editor/core/export/ooxml/OoxmlImport'
import type { IEditorData, IEditorOption } from '../../../src/editor/interface/Editor'
import type { IElement } from '../../../src/editor/interface/Element'

const INLINE_IMAGE_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIxOCI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjE4IiBmaWxsPSIjRkZGRkZGIi8+PGNpcmNsZSBjeD0iOSIgY3k9IjkiIHI9IjUiIGZpbGw9IiMzMzY2OTkiLz48cGF0aCBkPSJNMTcgMTNMMjIgNUwyOCAxMyIgc3Ryb2tlPSIjQ0M1NTIyIiBzdHJva2Utd2lkdGg9IjMiIGZpbGw9Im5vbmUiLz48L3N2Zz4='

function createParagraphElements(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    value: `${prefix} paragraph ${index + 1}${index === count - 1 ? ZERO : ''}`,
    size: 14 + (index % 3),
    bold: index % 10 === 0,
    rowMargin: 4
  }))
}

function createLargeTable(): IElement {
  return {
    id: 'large-integrity-table',
    type: ElementType.TABLE,
    value: '',
    borderType: TableBorder.ALL,
    borderColor: '#1864ab',
    borderWidth: 2,
    tableStyleId: 'LargeIntegrityGrid',
    colgroup: [{ width: 92 }, { width: 104 }, { width: 116 }, { width: 128 }],
    trList: Array.from({ length: 18 }, (_, rowIndex) => ({
      height: rowIndex === 0 ? 72 : 34 + (rowIndex % 3),
      minHeight: 34 + (rowIndex % 3),
      repeatOnPageStart: rowIndex === 0,
      rowIndex,
      tdList: Array.from({ length: 4 }, (_, colIndex) => ({
        id: `large-cell-${rowIndex}-${colIndex}`,
        colspan: 1,
        rowspan: 1,
        colIndex,
        rowIndex,
        value: [
          {
            value: `R${rowIndex + 1}C${colIndex + 1}`,
            bold: rowIndex === 0,
            color: colIndex % 2 === 0 ? '#224466' : '#663322'
          }
        ],
        verticalAlign:
          rowIndex % 2 === 0 ? VerticalAlign.MIDDLE : VerticalAlign.BOTTOM,
        backgroundColor: rowIndex === 0 ? '#ddeeff' : undefined,
        borderTypes: [TdBorder.TOP, TdBorder.RIGHT, TdBorder.BOTTOM, TdBorder.LEFT],
        borderColor: '#556677',
        borderWidth: 1
      }))
    }))
  }
}

function createHyperlinkElement(id: string, value: string, url: string): IElement {
  return {
    id,
    type: ElementType.HYPERLINK,
    value,
    url,
    hyperlinkId: id,
    underline: true,
    color: '#1155CC'
  }
}

function createInlineImageElement(id: string): IElement {
  return {
    id,
    type: ElementType.IMAGE,
    value: INLINE_IMAGE_DATA_URL,
    width: 32,
    height: 18
  }
}

function collectText(elementList: IElement[] = []) {
  const textList: string[] = []
  elementList.forEach(element => {
    if (element.type === ElementType.TABLE) {
      element.trList?.forEach(tr => {
        tr.tdList.forEach(td => {
          textList.push(collectText(td.value))
        })
      })
      return
    }
    textList.push(element.value)
  })
  return textList.join('')
}

function flattenElements(elementList: IElement[] = []) {
  const flattened: IElement[] = []
  const walk = (list: IElement[]) => {
    list.forEach(element => {
      flattened.push(element)
      if (element.valueList?.length) {
        walk(element.valueList)
      }
      if (element.trList?.length) {
        element.trList.forEach(tr => {
          tr.tdList.forEach(td => walk(td.value || []))
        })
      }
    })
  }
  walk(elementList)
  return flattened
}

describe('OOXML large document import/export integrity', () => {
  it('keeps key editor data and options across a larger DOCX round trip', () => {
    const data: IEditorData = {
      headerPageScopes: [
        {
          pageScope: 'all',
          elementList: [
            { value: 'Large integrity header left' },
            { value: `Large integrity header right${ZERO}` }
          ]
        }
      ],
      main: [
        ...createParagraphElements('Before table', 36),
        createHyperlinkElement(
          'large-integrity-link-main',
          'Large integrity external link',
          'https://example.com/ooxml-large?case=main&round=trip'
        ),
        createInlineImageElement('large-integrity-image-main'),
        createLargeTable(),
        createHyperlinkElement(
          'large-integrity-link-tail',
          'Large integrity tail link',
          'https://example.com/ooxml-large/tail#media'
        ),
        createInlineImageElement('large-integrity-image-tail'),
        ...createParagraphElements('After table', 36)
      ],
      footerPageScopes: [
        {
          pageScope: 'all',
          elementList: [
            { value: 'Large integrity footer page' },
            { value: `Large integrity footer tail${ZERO}` }
          ]
        }
      ]
    }
    const options: IEditorOption = {
      width: 794,
      height: 1123,
      paperDirection: PaperDirection.VERTICAL,
      margins: [88, 96, 104, 112],
      gutter: 18,
      gutterPosition: 'top',
      mirrorMargins: true,
      columns: {
        count: 2,
        gap: 18
      },
      header: {
        top: 42
      },
      footer: {
        bottom: 46
      },
      pageNumber: {
        disabled: false,
        startPageNo: 7,
        numberType: NumberType.ARABIC
      },
      lineNumber: {
        disabled: false,
        right: 20,
        type: LineNumberType.CONTINUITY
      },
      pageBorder: {
        disabled: false,
        style: 'solid',
        color: '#336699',
        lineWidth: 1,
        padding: [1, 2, 3, 4]
      },
      background: {
        color: '#f4f8fb'
      },
      table: {
        tdPadding: [4, 6, 4, 6]
      }
    }

    const packageParts = createOoxmlPackageParts(data, options)
    const documentXml = packageParts['word/document.xml'] as string
    const documentRelationships =
      packageParts['word/_rels/document.xml.rels'] as string
    const mediaPartPaths = Object.keys(packageParts).filter(path =>
      path.startsWith('word/media/')
    )

    const exportStart = performance.now()
    const bytes = createOoxmlDocxBytes(data, options)
    const exportMs = performance.now() - exportStart
    const importStart = performance.now()
    const imported = importOoxmlDocxBytesToEditorData(bytes)
    const importMs = performance.now() - importStart

    console.table([
      {
        phase: 'export',
        ms: Number(exportMs.toFixed(2)),
        bytes: bytes.length,
        mainElements: data.main.length
      },
      {
        phase: 'import',
        ms: Number(importMs.toFixed(2)),
        bytes: bytes.length,
        mainElements: imported.data.main.length
      }
    ])

    expect(bytes.length).to.be.greaterThan(0)
    expect(documentRelationships).to.contain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"'
    )
    expect(documentRelationships).to.contain(
      'Target="https://example.com/ooxml-large?case=main&amp;round=trip"'
    )
    expect(documentRelationships).to.contain('TargetMode="External"')
    expect(documentRelationships).to.contain(
      'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"'
    )
    expect(documentRelationships).to.contain('Target="media/')
    expect(documentXml).to.contain('<w:tblStyle w:val="LargeIntegrityGrid"/>')
    expect(documentXml).to.contain(
      '<w:top w:val="single" w:sz="16" w:color="1864AB"'
    )
    expect(documentXml).to.contain('<w:tblHeader/>')
    expect(documentXml).to.contain('<w:trHeight w:val="510" w:hRule="atLeast"/>')
    expect(documentXml).to.contain(
      '<w:shd w:val="clear" w:color="auto" w:fill="DDEEFF"/>'
    )
    expect(mediaPartPaths).to.have.length(2)
    mediaPartPaths.forEach(path => {
      expect(path).to.match(/^word\/media\/rIdImage\d+\.svg$/)
      expect(packageParts[path]).to.be.instanceOf(Uint8Array)
      expect((packageParts[path] as Uint8Array).length).to.be.greaterThan(0)
    })
    expect(collectText(imported.data.main)).to.contain('Before table paragraph 1')
    expect(collectText(imported.data.main)).to.contain('After table paragraph 36')
    expect(collectText(imported.data.header)).to.contain('Large integrity header')
    expect(collectText(imported.data.footer)).to.contain('Large integrity footer')

    const importedElements = flattenElements(imported.data.main)
    const importedHyperlinks = importedElements.filter(
      element => element.type === ElementType.HYPERLINK
    )
    expect(importedHyperlinks.map(element => element.value)).to.include.members([
      'Large integrity external link',
      'Large integrity tail link'
    ])
    expect(importedHyperlinks.map(element => element.url)).to.include.members([
      'https://example.com/ooxml-large?case=main&round=trip',
      'https://example.com/ooxml-large/tail#media'
    ])

    const importedImages = importedElements.filter(
      element => element.type === ElementType.IMAGE
    )
    expect(importedImages).to.have.length(2)
    importedImages.forEach(image => {
      expect(image.value).to.eq(INLINE_IMAGE_DATA_URL)
      expect(image.width).to.eq(32)
      expect(image.height).to.eq(18)
      expect(image.id).to.match(/^rIdImage\d+$/)
    })

    const importedTable = imported.data.main.find(
      element => element.type === ElementType.TABLE
    )
    expect(importedTable?.colgroup).to.deep.eq([
      { width: 92 },
      { width: 104 },
      { width: 116 },
      { width: 128 }
    ])
    expect(importedTable?.tableStyleId).to.eq('LargeIntegrityGrid')
    expect(importedTable?.borderType).to.eq(TableBorder.ALL)
    expect(importedTable?.borderColor).to.eq('#1864AB')
    expect(importedTable?.borderWidth).to.eq(2)
    expect(importedTable?.trList).to.have.length(18)
    expect(importedTable?.trList?.[0].tdList).to.have.length(4)
    expect(importedTable?.trList?.[0].repeatOnPageStart).to.eq(true)
    expect(importedTable?.trList?.[0].minHeight).to.eq(34)
    expect(importedTable?.trList?.[0].height).to.eq(34)
    expect(importedTable?.trList?.[0].tdList[0].value[0].value).to.contain('R1C1')
    expect(importedTable?.trList?.[17].tdList[3].value[0].value).to.contain(
      'R18C4'
    )
    expect(importedTable?.trList?.[0].tdList[0].verticalAlign).to.eq(
      VerticalAlign.MIDDLE
    )
    expect(importedTable?.trList?.[1].tdList[0].verticalAlign).to.eq(
      VerticalAlign.BOTTOM
    )
    expect(importedTable?.trList?.[0].tdList[0].backgroundColor).to.eq('#DDEEFF')
    expect(importedTable?.trList?.[1].tdList[0].backgroundColor).to.eq(undefined)
    expect(importedTable?.trList?.[0].tdList[0].borderTypes).to.deep.eq([
      TdBorder.TOP,
      TdBorder.RIGHT,
      TdBorder.BOTTOM,
      TdBorder.LEFT
    ])
    expect(importedTable?.trList?.[0].tdList[0].borderColor).to.eq('#556677')
    expect(importedTable?.trList?.[0].tdList[0].borderWidth).to.eq(1)

    expect(imported.options).to.include({
      width: options.width,
      height: options.height,
      paperDirection: options.paperDirection,
      gutter: options.gutter,
      mirrorMargins: true,
      gutterPosition: 'top'
    })
    expect(imported.options.margins).to.deep.eq(options.margins)
    expect(imported.options.columns).to.deep.eq(options.columns)
    expect(imported.options.header).to.deep.eq(options.header)
    expect(imported.options.footer).to.deep.eq(options.footer)
    expect(imported.options.pageNumber).to.deep.eq(options.pageNumber)
    expect(imported.options.lineNumber).to.deep.eq(options.lineNumber)
    expect(imported.options.pageBorder).to.deep.eq({
      ...options.pageBorder,
      color: '#336699'
    })
    expect(imported.options.background).to.deep.eq({
      color: '#F4F8FB'
    })
    expect(imported.options.table).to.deep.eq(options.table)
  })
})
