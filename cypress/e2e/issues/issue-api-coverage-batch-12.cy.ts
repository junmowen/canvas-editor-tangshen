import type Editor from '../../../src/editor'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'

const getText = (elementList: any[] = []) =>
  elementList.map(element => element.value).join('')

describe('issue API coverage batch 12', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #584 exports text and table styles through getHTML', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: 'centered html text',
            font: 'Microsoft YaHei',
            size: 18,
            color: '#123456',
            rowFlex: RowFlex.CENTER
          },
          { value: '\n' },
          {
            type: ElementType.TABLE,
            value: '',
            width: 240,
            colgroup: [{ width: 240 }],
            trList: [
              {
                height: 48,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      {
                        value: 'styled cell',
                        bold: true,
                        color: '#aa0000'
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      const html = editor.command.getHTML().main
      expect(html).to.contain('centered html text')
      expect(html).to.contain('font-family')
      expect(html).to.contain('Microsoft YaHei')
      expect(html).to.contain('font-size: 18px')
      expect(html).to.contain('text-align: center')
      expect(html).to.contain('<table')
      expect(html).to.contain('styled cell')
      expect(html).to.contain('font-weight: 600')
    })
  })

  it('issue #601 supports date elements with an explicit date format', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.DATE,
            value: '',
            dateId: 'date-format-api',
            dateFormat: 'yyyy-MM-dd',
            valueList: [{ value: '2026-05-21' }]
          }
        ]
      })

      const dateElement = editor.command.getValue().data.main[0]
      expect(dateElement).to.include({
        type: ElementType.DATE,
        dateFormat: 'yyyy-MM-dd'
      })
      expect(getText(dateElement.valueList)).to.eq('2026-05-21')
      expect(editor.command.getText().main).to.eq('2026-05-21')
      expect(editor.command.getHTML().main).to.contain('2026-05-21')
    })
  })

  it('issue #787 preserves rowFlex when inserting element lists', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'inserted right aligned',
          rowFlex: RowFlex.RIGHT
        }
      ])

      const data = editor.command.getValue().data.main
      expect(data[0]).to.include({
        value: 'inserted right aligned',
        rowFlex: RowFlex.RIGHT
      })
      expect(editor.command.getHTML().main).to.contain('text-align: right')
    })
  })

  it('issue #839 keeps control minWidth and rowFlex in public control APIs', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'min-width-row-flex-control',
              type: ControlType.TEXT,
              minWidth: 120,
              rowFlex: RowFlex.RIGHT,
              value: [{ value: 'aligned control' }],
              placeholder: 'control'
            }
          }
        ]
      })

      const controlValue = editor.command.getControlValue({
        conceptId: 'min-width-row-flex-control'
      })[0]
      expect(controlValue).to.include({
        conceptId: 'min-width-row-flex-control',
        type: ControlType.TEXT,
        minWidth: 120,
        rowFlex: RowFlex.RIGHT,
        value: 'aligned control',
        innerText: 'aligned control'
      })

      const controlElement = editor.command.getValue().data.main[0]
      expect(controlElement.control).to.include({
        minWidth: 120,
        rowFlex: RowFlex.RIGHT
      })
      expect(editor.command.getHTML().main).to.contain('aligned control')
    })
  })

  it('issues #1239 and #1289 expose rowFlex alignment data on one logical row', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: 'left label',
            rowFlex: RowFlex.ALIGNMENT
          },
          {
            value: 'right value',
            rowFlex: RowFlex.ALIGNMENT
          }
        ]
      })

      const data = editor.command.getValue().data.main
      expect(data[0]).to.include({
        value: 'left labelright value',
        rowFlex: RowFlex.ALIGNMENT
      })

      const firstRow = (editor as any).draw.getOriginalRowList()[0]
      expect(firstRow.rowFlex).to.eq(RowFlex.ALIGNMENT)
      expect(getText(firstRow.elementList).replace(/\u200B/g, '')).to.eq(
        'left labelright value'
      )
      expect(editor.command.getText().main).to.eq('left labelright value')
    })
  })
})
