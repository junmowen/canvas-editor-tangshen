import type Editor from '../../../src/editor'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

const tinyImageDataUrl =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
const updatedImageDataUrl =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxIiBoZWlnaHQ9IjEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9InJlZCIvPjwvc3ZnPg=='

const normalizeRowText = (row: any) =>
  (row.elementList || [])
    .map((element: any) => element.value)
    .join('')
    .replace(/\u200B/g, '')
    .replace(/\n/g, '')
    .trim()

describe('issue API coverage batch 10', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #255 exposes row data through draw.getRowList', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'Row one' },
          { value: '\n' },
          { value: 'Row two' },
          { value: '\n' },
          { value: 'Row three' }
        ]
      })

      const rowList = (editor as any).draw.getObjectResolver().getRowList()
      const rowTexts = rowList.map(normalizeRowText).filter(Boolean)

      expect(rowTexts).to.include.members(['Row one', 'Row two', 'Row three'])
      expect(rowList.length).to.be.greaterThan(0)
      expect(
        rowList.every((row: any) => typeof row.startIndex === 'number')
      ).to.eq(true)
      expect(
        rowList.every((row: any) => typeof row.rowIndex === 'number')
      ).to.eq(true)
    })
  })

  it('issue #429 exposes collapsed and expanded range data', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'alpha beta gamma' }]
      })

      editor.command.executeSetRange(11, 15)

      const range = editor.command.getRange()
      const context = editor.command.getRangeContext()

      expect(range.startIndex).to.be.lessThan(range.endIndex)
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(context?.isCollapsed).to.eq(false)
      expect(context?.selectionText?.trim()).to.not.eq('')
    })
  })

  it('issue #552 reads and updates table cell data by public element id lookup', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'template-table',
            type: ElementType.TABLE,
            value: '',
            colgroup: [{ width: 120 }, { width: 120 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    id: 'template-cell-a',
                    colspan: 1,
                    rowspan: 1,
                    value: [{ id: 'template-label-a', value: 'Cell A' }]
                  },
                  {
                    id: 'template-cell-b',
                    colspan: 1,
                    rowspan: 1,
                    value: [{ id: 'template-label-b', value: 'Cell B' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const cellBefore = editor.command.getElementById({
        id: 'template-label-a'
      })

      expect(cellBefore.map(element => element.value).join('')).to.eq('Cell A')
      expect(
        cellBefore.every(element => element.id === 'template-label-a')
      ).to.eq(true)

      editor.command.executeUpdateElementById({
        id: 'template-label-a',
        properties: {
          value: 'Cell A updated'
        }
      })

      const cellAfter = editor.command.getElementById({
        id: 'template-label-a'
      })
      expect(cellAfter.map(element => element.value).join('')).to.eq(
        'Cell A updated'
      )
      expect(
        cellAfter.every(element => element.id === 'template-label-a')
      ).to.eq(true)
      expect(
        editor.command
          .getValue()
          .data.main[0].trList?.[0].tdList[0].value.map(
            (element: any) => element.value
          )
          .join('')
          .replace(/\u200B/g, '')
      ).to.contain('Cell A updated')
    })
  })

  it('issue #806 keeps table cell content stable when updating table extension', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'extension-table',
            type: ElementType.TABLE,
            value: '',
            extension: {
              source: 'initial'
            },
            width: 180,
            colgroup: [{ width: 180 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    id: 'extension-cell',
                    colspan: 1,
                    rowspan: 1,
                    value: [{ id: 'extension-label', value: 'Cell A' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      editor.command.executeUpdateElementById({
        id: 'extension-table',
        properties: {
          extension: {
            source: 'updated',
            kind: 'regression'
          }
        }
      })

      const table = editor.command.getValue().data.main[0]
      expect(table.extension).to.deep.eq({
        source: 'updated',
        kind: 'regression'
      })
      expect(
        table.trList?.[0].tdList[0].value
          .map((element: any) => element.value)
          .join('')
      ).to.eq('Cell A')
      expect(
        editor.command.getElementById({ id: 'extension-label' })[0]
      ).to.include({
        id: 'extension-label'
      })
      expect(editor.command.getText().main).to.contain('Cell A')
    })
  })

  it('issue #1006 preserves table styles when updating trList by table id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'tr-list-update-table',
            type: ElementType.TABLE,
            value: '',
            width: 240,
            colgroup: [{ width: 120 }, { width: 120 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'old A' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'old B' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      editor.command.executeUpdateElementById({
        id: 'tr-list-update-table',
        properties: {
          trList: [
            {
              height: 52,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  backgroundColor: '#ffeeaa',
                  borderColor: '#ff0000',
                  borderWidth: 3,
                  value: [{ value: 'updated A', bold: true }]
                },
                {
                  colspan: 1,
                  rowspan: 1,
                  backgroundColor: '#aaffee',
                  value: [{ value: 'updated B', color: '#00aa00' }]
                }
              ]
            }
          ]
        }
      })

      const table = editor.command.getValue().data.main[0]
      expect(table).to.include({
        id: 'tr-list-update-table',
        type: ElementType.TABLE,
        width: 240
      })
      expect(table.colgroup).to.deep.eq([{ width: 120 }, { width: 120 }])
      expect(table.trList?.[0].height).to.eq(52)
      expect(table.trList?.[0].tdList[0]).to.include({
        backgroundColor: '#ffeeaa',
        borderColor: '#ff0000',
        borderWidth: 3
      })
      expect(table.trList?.[0].tdList[1].backgroundColor).to.eq('#aaffee')
      expect(
        table.trList?.[0].tdList[0].value
          .map((element: any) => element.value)
          .join('')
      ).to.eq('updated A')
      expect(
        table.trList?.[0].tdList[1].value
          .map((element: any) => element.value)
          .join('')
      ).to.eq('updated B')
    })
  })

  it('issue #972 preserves table cell text through getValue and setValue round trip', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'round-trip-table',
            type: ElementType.TABLE,
            value: '',
            width: 200,
            colgroup: [{ width: 100 }, { width: 100 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: '姓名' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: '张三' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const saved = editor.command.getValue()
      editor.command.executeSetValue(saved.data)

      const table = editor.command.getValue().data.main[0]
      expect(
        table.trList?.[0].tdList[0].value
          .map((element: any) => element.value)
          .join('')
      ).to.eq('姓名')
      expect(
        table.trList?.[0].tdList[1].value
          .map((element: any) => element.value)
          .join('')
      ).to.eq('张三')
      expect(editor.command.getText().main).to.contain('姓名')
      expect(editor.command.getText().main).to.contain('张三')
    })
  })

  it('issue #933 updates image values through executeUpdateElementById', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'update-image',
            type: ElementType.IMAGE,
            value: tinyImageDataUrl,
            width: 24,
            height: 24
          }
        ]
      })

      editor.command.executeUpdateElementById({
        id: 'update-image',
        properties: {
          value: updatedImageDataUrl
        }
      })

      const image = editor.command.getValue().data.main[0]
      expect(image).to.include({
        id: 'update-image',
        type: ElementType.IMAGE,
        value: updatedImageDataUrl,
        width: 24,
        height: 24
      })
      expect(
        editor.command.getElementById({ id: 'update-image' })[0]
      ).to.include({
        id: 'update-image',
        type: ElementType.IMAGE,
        value: updatedImageDataUrl
      })
    })
  })

  it('issue #755 keeps getOptions mode in sync after executeMode', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeMode(EditorMode.FORM)
      expect(editor.command.getOptions().mode).to.eq(EditorMode.FORM)
      expect(editor.command.getValue().options.mode).to.eq(EditorMode.FORM)

      editor.command.executeMode(EditorMode.READONLY)
      expect(editor.command.getOptions().mode).to.eq(EditorMode.READONLY)
      expect(editor.command.getValue().options.mode).to.eq(EditorMode.READONLY)

      editor.command.executeMode(EditorMode.EDIT)
      expect(editor.command.getOptions().mode).to.eq(EditorMode.EDIT)
      expect(editor.command.getValue().options.mode).to.eq(EditorMode.EDIT)
    })
  })

  it('issue #846 returns keyword matches with page numbers from getKeywordContext', () => {
    cy.getEditor().then((editor: Editor) => {
      const bodyLines = Array.from({ length: 180 }, (_, index) => {
        return `filler line ${index + 1} ${'content '.repeat(8)}`
      })

      editor.command.executeSetValue({
        main: [
          {
            value: ['needle', ...bodyLines, 'needle'].join('\n')
          }
        ]
      })

      const contexts = editor.command.getKeywordContext('needle')
      expect(contexts).to.have.length(2)
      expect(contexts?.[0].startPosition.pageNo).to.eq(0)
      expect(contexts?.[1].startPosition.pageNo).to.be.greaterThan(
        contexts?.[0].startPosition.pageNo ?? -1
      )
      expect(contexts?.[0].range.startIndex).to.be.lessThan(
        contexts?.[1].range.startIndex
      )
    })
  })
})
