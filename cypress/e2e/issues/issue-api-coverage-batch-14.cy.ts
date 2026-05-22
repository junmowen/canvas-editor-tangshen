import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

const getText = (elementList: any[] = []) =>
  elementList.map(element => element.value).join('').replace(/\u200B/g, '')

const getTable = (editor: Editor) =>
  editor.command
    .getValue({ extraPickAttrs: ['id'] })
    .data.main.find(element => element.type === ElementType.TABLE)

const getTablePageCount = (editor: Editor) => {
  const pageRowList = (editor as any).draw.getPageRowList()
  const tablePageCount = pageRowList.filter((rows: any[]) =>
    rows.some(row =>
      row.elementList.some((element: any) => element.type === ElementType.TABLE)
    )
  ).length

  return { pageRowList, tablePageCount }
}

describe('issue API coverage batch 14', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issues #1001 and #1383 expose paged table rows through draw.getPageRowList', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'prefix text to leave less page room\n'.repeat(4)
            },
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 180 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [
                        {
                          value:
                            'table-page-row-check-start ' +
                            '分页内容'.repeat(180) +
                            ' table-page-row-check-end'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([12, 12, 12, 12])

      const table = getTable(editor)
      const { pageRowList, tablePageCount } = getTablePageCount(editor)
      const html = editor.command.getHTML().main
      const text = editor.command.getText().main

      expect(pageRowList.length, 'page count').to.be.greaterThan(1)
      expect(tablePageCount, 'table page count').to.be.greaterThan(1)
      expect(table?.trList).to.have.length(1)
      expect(getText(table?.trList?.[0].tdList[0].value)).to.contain(
        'table-page-row-check-start'
      )
      expect(getText(table?.trList?.[0].tdList[0].value)).to.contain(
        'table-page-row-check-end'
      )
      expect(text).to.contain('prefix text to leave less page room')
      expect(text).to.contain('table-page-row-check-start')
      expect(text).to.contain('table-page-row-check-end')
      expect(html).to.contain('<table')
      expect(html).to.contain('table-page-row-check-start')
      expect(html).to.contain('table-page-row-check-end')
    })
  })

  it('issue #1047 keeps a long table cell value intact while the cell spans pages', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 180 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [
                        {
                          value:
                            'cell-cross-page-start ' +
                            '单元格跨页'.repeat(220) +
                            ' cell-cross-page-end'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([12, 12, 12, 12])

      const table = getTable(editor)
      const { pageRowList, tablePageCount } = getTablePageCount(editor)
      const cellValue = getText(table?.trList?.[0].tdList[0].value)

      expect(pageRowList.length).to.be.greaterThan(1)
      expect(tablePageCount).to.be.greaterThan(1)
      expect(table?.trList?.[0].tdList[0].rowspan).to.eq(1)
      expect(cellValue).to.contain('cell-cross-page-start')
      expect(cellValue).to.contain('cell-cross-page-end')
      expect(editor.command.getText().main).to.contain('cell-cross-page-start')
      expect(editor.command.getText().main).to.contain('cell-cross-page-end')
      expect(editor.command.getHTML().main).to.contain('cell-cross-page-start')
      expect(editor.command.getHTML().main).to.contain('cell-cross-page-end')
    })
  })

  it('issues #1254 and #1309 keep all cells visible in a cross-page 3x3 table', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 72 }, { width: 72 }, { width: 72 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [
                        {
                          value:
                            'row-1-col-1-start ' +
                            '跨页表格'.repeat(120) +
                            ' row-1-col-1-end'
                        }
                      ]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-1-col-2' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-1-col-3' }]
                    }
                  ]
                },
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-2-col-1' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-2-col-2' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-2-col-3' }]
                    }
                  ]
                },
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-3-col-1' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-3-col-2' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-3-col-3' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([12, 12, 12, 12])

      const table = getTable(editor)
      const { pageRowList, tablePageCount } = getTablePageCount(editor)
      const html = editor.command.getHTML().main

      expect(pageRowList.length).to.be.greaterThan(1)
      expect(tablePageCount).to.be.greaterThan(1)
      expect(table?.trList).to.have.length(3)
      expect(getText(table?.trList?.[0].tdList[0].value)).to.contain(
        'row-1-col-1-start'
      )
      expect(getText(table?.trList?.[0].tdList[0].value)).to.contain(
        'row-1-col-1-end'
      )
      expect(getText(table?.trList?.[1].tdList[1].value)).to.eq('row-2-col-2')
      expect(getText(table?.trList?.[2].tdList[2].value)).to.eq('row-3-col-3')
      expect(editor.command.getText().main).to.contain('row-2-col-2')
      expect(editor.command.getText().main).to.contain('row-3-col-3')
      expect(html).to.contain('row-1-col-1-start')
      expect(html).to.contain('row-2-col-2')
      expect(html).to.contain('row-3-col-3')
    })
  })

  it('issue #1291 preserves merged cell data across paged table output', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              type: ElementType.TABLE,
              value: '',
              colgroup: [{ width: 96 }, { width: 96 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 3,
                      value: [
                        {
                          value:
                            'merged-cell-start ' +
                            '合并单元格'.repeat(100) +
                            ' merged-cell-end'
                        }
                      ]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-1-right' }]
                    }
                  ]
                },
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-2-right' }]
                    }
                  ]
                },
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'row-3-right' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )
      editor.command.executePaperSize(240, 240)
      editor.command.executeSetPaperMargin([12, 12, 12, 12])

      const table = getTable(editor)
      const { pageRowList, tablePageCount } = getTablePageCount(editor)
      const html = editor.command.getHTML().main
      const mergedText = getText(table?.trList?.[0].tdList[0].value)

      expect(pageRowList.length).to.be.greaterThan(1)
      expect(tablePageCount).to.be.greaterThan(1)
      expect(table?.trList?.[0].tdList[0].rowspan).to.eq(3)
      expect(mergedText).to.contain('merged-cell-start')
      expect(mergedText).to.contain('merged-cell-end')
      expect(editor.command.getText().main).to.contain('row-2-right')
      expect(editor.command.getText().main).to.contain('row-3-right')
      expect(html).to.contain('merged-cell-start')
      expect(html).to.contain('row-2-right')
      expect(html).to.contain('row-3-right')
    })
  })
})
