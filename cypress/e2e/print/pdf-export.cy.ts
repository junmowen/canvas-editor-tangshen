import {
  createPdfBlobFromPrintSvgDocument,
  createPrintSvgPageListFromDocument,
  IPrintSvgDocumentPayload
} from '../../../src/editor/utils/print'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import { TableBorder, TdBorder, TdSlash } from '../../../src/editor/dataset/enum/table/Table'
import { WatermarkType } from '../../../src/editor/dataset/enum/Watermark'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lw7rVwAAAABJRU5ErkJggg=='

function createTextPayload(text: string, font = 'Helvetica'): IPrintSvgDocumentPayload {
  return {
    width: 400,
    height: 300,
    pageCount: 1,
    mainPositionList: [
      {
        value: text,
        element: {
          value: text,
          font,
          size: 16
        },
        pageNo: 0,
        ascent: 16,
        coordinate: {
          leftTop: [40, 40],
          rightTop: [160, 40],
          rightBottom: [160, 60],
          leftBottom: [40, 60]
        }
      } as any
    ]
  }
}

function createPosition(
  value: string,
  x: number,
  y: number,
  element: any = { value }
) {
  const width = element.width || 10
  const height = element.height || 16
  return {
    pageNo: 0,
    index: x,
    value,
    element,
    rowIndex: 0,
    rowNo: 0,
    ascent: 16,
    lineHeight: 24,
    left: x,
    metrics: { width, height },
    isFirstLetter: false,
    isLastLetter: false,
    coordinate: {
      leftTop: [x, y],
      leftBottom: [x, y + 24],
      rightTop: [x + width, y],
      rightBottom: [x + width, y + 24]
    }
  } as any
}

function createComplexPrintPayload(): IPrintSvgDocumentPayload {
  const cellTextPosition = createPosition('CELL', 106, 126, {
    value: 'CELL',
    font: 'Helvetica'
  })
  const tableFragment = {
    tableId: 'pdf-fragment-table',
    logicalTableId: 'pdf-logical-table',
    logicalTableIndex: 0,
    fragmentOrder: 0,
    colgroup: [{ width: 120 }],
    width: 120,
    height: 48,
    borderType: TableBorder.DASH,
    borderColor: '#123456',
    borderWidth: 2,
    trList: [
      {
        height: 48,
        tdList: [
          {
            id: 'td-1',
            x: 0,
            y: 0,
            width: 120,
            height: 48,
            colspan: 1,
            rowspan: 1,
            value: [],
            backgroundColor: '#ffeeaa',
            borderTypes: [TdBorder.TOP, TdBorder.RIGHT],
            slashTypes: [TdSlash.BACK],
            positionList: [cellTextPosition]
          }
        ]
      }
    ]
  } as any
  const tableElement = {
    type: ElementType.TABLE,
    value: '',
    width: 120,
    height: 48
  }
  const tablePosition = createPosition('', 100, 120, tableElement)
  tablePosition.tableFragment = tableFragment
  const separatorPosition = createPosition('', 40, 210, {
    type: ElementType.SEPARATOR,
    value: '\n',
    width: 80,
    color: '#abcdef',
    dashArray: [2, 2]
  })
  const decoratedTextPosition = createPosition('DECOR', 100, 240, {
    value: 'DECOR',
    font: 'Helvetica',
    underline: true,
    textDecoration: { style: 'dashed' },
    controlId: 'decorated-control',
    control: { border: true },
    groupIds: ['group-a']
  })
  decoratedTextPosition.metrics = { width: 42, height: 16 }
  const formulaPosition = createPosition('Ek = hv - W0', 150, 300, {
    type: ElementType.LATEX,
    value: '{E_k} = hv - {W_0}',
    font: 'Helvetica',
    formula: {
      sourceFormat: 'latex',
      latex: '{E_k} = hv - {W_0}',
      displayText: 'Ek = hv - W0'
    },
    size: 16
  })
  formulaPosition.metrics = { width: 100, height: 20 }
  const imagePosition = createPosition('', 260, 120, {
    type: ElementType.IMAGE,
    value: TINY_PNG,
    width: 12,
    height: 12
  })
  const headerTextPosition = createPosition('HEADER', 40, 30, {
    value: 'HEADER',
    font: 'Helvetica'
  })
  const headerSeparatorPosition = createPosition('', 40, 60, {
    type: ElementType.SEPARATOR,
    value: '\n',
    width: 320,
    color: '#445566'
  })
  return {
    width: 400,
    height: 600,
    mainPositionList: [
      tablePosition,
      separatorPosition,
      decoratedTextPosition,
      formulaPosition,
      imagePosition
    ],
    pageRowList: [
      [
        {
          width: 120,
          height: 48,
          ascent: 16,
          startIndex: 0,
          rowIndex: 0,
          elementList: [tableElement],
          tableFragment
        } as any,
        {
          width: 160,
          height: 28,
          ascent: 16,
          startIndex: 1,
          rowIndex: 1,
          elementList: [
            { ...separatorPosition.element, metrics: separatorPosition.metrics },
            {
              ...decoratedTextPosition.element,
              metrics: decoratedTextPosition.metrics
            },
            { ...formulaPosition.element, metrics: formulaPosition.metrics },
            { ...imagePosition.element, metrics: imagePosition.metrics }
          ]
        } as any
      ]
    ],
    headerRowListByPage: [
      [
        {
          width: 60,
          height: 24,
          ascent: 16,
          startIndex: 0,
          rowIndex: 0,
          elementList: [
            { ...headerTextPosition.element, metrics: headerTextPosition.metrics }
          ]
        } as any,
        {
          width: 320,
          height: 8,
          ascent: 0,
          startIndex: 1,
          rowIndex: 1,
          elementList: [
            {
              ...headerSeparatorPosition.element,
              metrics: headerSeparatorPosition.metrics
            }
          ]
        } as any
      ]
    ],
    headerPositionListByPage: [[headerTextPosition, headerSeparatorPosition]],
    footerPositionListByPage: [[createPosition('FOOTER', 40, 540, {
      value: 'FOOTER',
      font: 'Helvetica'
    })]],
    badgeListByPage: [[{ x: 300, y: 300, width: 20, height: 20, value: TINY_PNG }]],
    editorOptions: {
      scale: 1,
      margins: [40, 40, 40, 40],
      table: { defaultBorderColor: '#000000' },
      defaultTabWidth: 32,
      defaultFont: 'Helvetica',
      defaultSize: 16,
      defaultColor: '#000000',
      underlineColor: '#000000',
      strikeoutColor: '#000000',
      separator: { lineWidth: 2, strokeStyle: '#333333' },
      control: {
        borderColor: '#ff00aa',
        borderWidth: 1
      },
      group: {
        backgroundColor: '#ddeeff',
        opacity: 0.5,
        activeBackgroundColor: '#ddeeff',
        activeOpacity: 0.5
      },
      background: { color: '#ffffff', applyPageNumbers: [] },
      pageNumber: {
        disabled: false,
        fromPageNo: 0,
        startPageNo: 1,
        format: '{pageNo} / {pageCount}',
        numberType: 'arabic',
        rowFlex: RowFlex.CENTER,
        size: 12,
        font: 'Helvetica',
        color: '#111111',
        bottom: 30
      },
      watermark: {
        data: 'DRAFT',
        type: WatermarkType.TEXT,
        repeat: false,
        opacity: 0.2,
        size: 40,
        font: 'Helvetica',
        color: '#999999',
        gap: [80, 80]
      },
      pageBorder: {
        disabled: false,
        color: '#111111',
        lineWidth: 1,
        padding: [4, 4, 4, 4],
        style: 'solid'
      }
    } as any,
    pageMetricList: [
      {
        margins: [40, 40, 40, 40],
        innerWidth: 320,
        headerExtraHeight: 10,
        footerExtraHeight: 10
      }
    ],
    pageCount: 1
  }
}

function readBlobPrefix(blob: Blob, length: number) {
  return new Cypress.Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error)
    reader.onload = () => {
      const bytes = new Uint8Array(reader.result as ArrayBuffer)
      resolve(String.fromCharCode(...bytes.slice(0, length)))
    }
    reader.readAsArrayBuffer(blob)
  })
}

describe('PDF export', () => {
  it('creates a PDF blob from ASCII print SVG payload', () => {
    cy.wrap(
      createPdfBlobFromPrintSvgDocument(createTextPayload('PDF smoke test'))
    ).then(blob => {
      expect(blob.type).to.eq('application/pdf')
      expect(blob.size).to.be.greaterThan(500)
      return readBlobPrefix(blob, 4)
    }).then(prefix => {
      expect(prefix).to.eq('%PDF')
    })
  })

  it('creates a PDF blob from a decorated print SVG payload', () => {
    const payload = createComplexPrintPayload()
    const [printSvg] = createPrintSvgPageListFromDocument(payload)

    expect(printSvg).to.contain('HEADER')
    expect(printSvg).to.contain('FOOTER')
    expect(printSvg).to.contain('DRAFT')
    expect(printSvg).to.contain('1 / 1')
    expect(printSvg).to.contain('CELL')
    expect(printSvg).to.contain('#ffeeaa')
    expect(printSvg).to.contain('stroke="#123456"')
    expect(printSvg).to.contain('stroke-dasharray="3 3"')
    expect(printSvg).to.contain('stroke="#abcdef"')
    expect(printSvg).to.contain('stroke="#445566"')
    expect(printSvg).to.contain('stroke="#ff00aa"')
    expect(printSvg).to.contain('#ddeeff')
    expect(printSvg).to.contain('DECOR')
    expect(printSvg).to.contain('Ek = hv - W0')
    expect(printSvg).to.contain('<image')
    expect(printSvg).to.contain('stroke="#111111"')

    cy.wrap(createPdfBlobFromPrintSvgDocument(payload)).then(blob => {
      expect(blob.type).to.eq('application/pdf')
      expect(blob.size).to.be.greaterThan(3000)
      return readBlobPrefix(blob, 4)
    }).then(prefix => {
      expect(prefix).to.eq('%PDF')
    })
  })

  it('requires an embedded font when SVG text contains Unicode', () => {
    cy.then(() => {
      return createPdfBlobFromPrintSvgDocument(
        createTextPayload('中文测试', '微软雅黑')
      )
        .then(() => {
          throw new Error('Expected PDF export to reject without Unicode fonts')
        })
        .catch(error => {
          if (error.message.includes('Expected PDF export')) {
            throw error
          }
          expect(error.message).to.contain('Unicode text')
        })
    })
  })
})
