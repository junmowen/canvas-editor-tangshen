import Editor from '../../../src/editor'
import {
  TableBorder,
  TdBorder
} from '../../../src/editor/dataset/enum/table/Table'

function getTable(editor: Editor) {
  return editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
}

function getCellBounds(editor: Editor, tableId: string, trIndex: number, tdIndex: number) {
  const draw = (editor as any).draw
  draw.flushScheduledFrameRender()
  const bounds = draw
    .getTableLayoutSnapshotAccessor()
    .getFragmentCellBounds(tableId)
    .find((item: any) => item.trIndex === trIndex && item.tdIndex === tdIndex)
  expect(bounds).to.not.eq(undefined)
  return bounds
}

function countRedPixelsInDataUrl(dataUrl: string) {
  return new Cypress.Promise<number>(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let redPixels = 0
      for (let index = 0; index < imageData.length; index += 4) {
        const r = imageData[index]
        const g = imageData[index + 1]
        const b = imageData[index + 2]
        const a = imageData[index + 3]
        if (a > 0 && r > 150 && r > g * 1.5 && r > b * 1.5) {
          redPixels++
        }
      }
      resolve(redPixels)
    }
    image.src = dataUrl
  })
}

describe('issue #1053 table cell border settings', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('sets table border type, border color and selected cell border types', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [{ value: '\u200B' }],
          footer: []
        },
        {
          isSetCursor: true
        } as any
      )
      editor.command.executeSetRange(0, 0)
      editor.command.executeInsertTable(2, 2)

      let table = getTable(editor)
      expect(table?.id).to.be.a('string')

      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table!.id!,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0)

      editor.command.executeTableBorderType(TableBorder.EXTERNAL)
      editor.command.executeTableBorderColor('#0000FF')
      editor.command.executeTableTdBorderType(TdBorder.TOP)
      editor.command.executeTableTdBorderType(TdBorder.LEFT)
      editor.command.executeTableTdBorderColor('#FF0000')
      editor.command.executeTableTdBorderWidth(4)

      table = getTable(editor)
      const firstCell = table?.trList?.[0].tdList[0]

      expect(table?.borderType).to.eq(TableBorder.EXTERNAL)
      expect(table?.borderColor).to.eq('#0000FF')
      expect(firstCell?.borderTypes).to.include(TdBorder.TOP)
      expect(firstCell?.borderTypes).to.include(TdBorder.LEFT)
      expect(firstCell?.borderColor).to.eq('#FF0000')
      expect(firstCell?.borderWidth).to.eq(4)

      editor.command.executeTableTdBorderType(TdBorder.TOP)

      table = getTable(editor)
      expect(table?.trList?.[0].tdList[0].borderTypes).to.not.include(
        TdBorder.TOP
      )
      expect(table?.trList?.[0].tdList[0].borderTypes).to.include(TdBorder.LEFT)
    })
  })

  it('shows all borders when only selected cell border color and width are set', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [{ value: '\u200B' }],
          footer: []
        },
        {
          isSetCursor: true
        } as any
      )
      editor.command.executeSetRange(0, 0)
      editor.command.executeInsertTable(2, 2)

      const table = getTable(editor)!
      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table.id!,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0)

      editor.command.executeTableBorderType(TableBorder.EMPTY)
      editor.command.executeTableTdBorderColor('#FF0000')
      editor.command.executeTableTdBorderWidth(4)

      const firstCell = getTable(editor)?.trList?.[0].tdList[0]
      expect(firstCell?.borderTypes).to.have.members([
        TdBorder.TOP,
        TdBorder.RIGHT,
        TdBorder.BOTTOM,
        TdBorder.LEFT
      ])
      expect(firstCell?.borderColor).to.eq('#FF0000')
      expect(firstCell?.borderWidth).to.eq(4)
    })
  })

  it('round-trips per-cell border color and width through getValue and setValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            type: 'table',
            value: '',
            borderType: TableBorder.EXTERNAL,
            borderColor: '#0000FF',
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    borderTypes: [TdBorder.TOP],
                    borderColor: '#FF0000',
                    borderWidth: 4,
                    value: [{ value: 'A' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B' }]
                  }
                ]
              }
            ]
          } as any
        ],
        footer: []
      })

      const value = editor.command.getValue().data.main
      const firstCell = value[0].trList![0].tdList[0]

      expect(firstCell.borderTypes).to.deep.eq([TdBorder.TOP])
      expect(firstCell.borderColor).to.eq('#FF0000')
      expect(firstCell.borderWidth).to.eq(4)

      editor.command.executeSetValue({
        header: [],
        main: value,
        footer: []
      })

      const roundTripCell = editor.command.getValue().data.main[0].trList![0]
        .tdList[0]

      expect(roundTripCell.borderTypes).to.deep.eq([TdBorder.TOP])
      expect(roundTripCell.borderColor).to.eq('#FF0000')
      expect(roundTripCell.borderWidth).to.eq(4)
    })
  })

  it('renders a single cell border with its own color and width', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            type: 'table',
            value: '',
            borderType: TableBorder.EMPTY,
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    borderTypes: [
                      TdBorder.TOP,
                      TdBorder.RIGHT,
                      TdBorder.BOTTOM,
                      TdBorder.LEFT
                    ],
                    borderColor: '#FF0000',
                    borderWidth: 4,
                    value: [{ value: 'A' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B' }]
                  }
                ]
              },
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'C' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'D' }]
                  }
                ]
              }
            ]
          } as any
        ],
        footer: []
      })

      getCellBounds(editor, getTable(editor)!.id!, 0, 0)
      return editor.command.getImage({
        mode: 'print',
        pixelRatio: 1
      })
    }).then(imageList => {
      expect(imageList).to.have.length.greaterThan(0)
      return countRedPixelsInDataUrl(imageList[0])
    }).then(redPixels => {
      expect(redPixels).to.be.greaterThan(0)
    })
  })
})
