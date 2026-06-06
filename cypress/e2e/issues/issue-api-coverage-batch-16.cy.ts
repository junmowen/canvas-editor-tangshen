import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function getTextRows(editor: Editor) {
  const draw = (editor as any).draw
  draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
  return draw.getObjectResolver().getOriginalRowList().filter((row: any) =>
    row.elementList.some((element: any) => !element.type && element.value !== '\u200B')
  )
}

function getRowText(row: any) {
  return (row.elementList || [])
    .map((element: any) => element.value)
    .join('')
    .replace(/\u200B/g, '')
    .replace(/\n/g, '')
}

function getRowHeight(row: any) {
  return row.height + (row.offsetY || 0)
}

describe('issue API coverage batch 16', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #993 preserves explicit table row heights in the saved value and layout', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            width: 240,
            colgroup: [{ width: 120 }, { width: 120 }],
            trList: [
              {
                height: 48,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'row a' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'row b' }]
                  }
                ]
              },
              {
                height: 72,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'row c' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'row d' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = editor.command.getValue().data.main[0]
      expect(table.trList?.map((row: any) => row.height)).to.deep.eq([48, 72])
      expect(editor.command.getHTML().main).to.contain('<table')
      expect(editor.command.getText().main).to.contain('row a')
      expect(editor.command.getText().main).to.contain('row d')
    })
  })

  it('issue #769 keeps CRLF input as a normal line break', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'alpha\r\nbeta' }]
      })

      const text = editor.command.getText().main
      const value = editor.command.getValue().data.main

      expect(text).to.eq('alpha\nbeta')
      expect(value.map((element: any) => element.value).join('')).to.contain('\n')
      expect(value.map((element: any) => element.value).join('')).to.not.contain('\r')
      expect(getTextRows(editor).map(getRowText)).to.include.members([
        'alpha',
        'beta'
      ])
    })
  })

  it('issue #1213 exposes coherent page and content height metrics', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'height metrics coverage' }]
      })

      const draw = (editor as any).draw
      const pageHeight = draw.getPageCanvasHost().getPageHeight(0)
      const originalHeight = draw.getOriginalHeight()
      const currentHeight = draw.getHeight()
      const mainOuterHeight = draw.getMainOuterHeight()
      const contentHeight = draw
        .getObjectResolver().getRowList()
        .reduce((sum: number, row: any) => sum + row.height + (row.offsetY || 0), 0)

      expect(originalHeight).to.eq(pageHeight)
      expect(currentHeight).to.eq(originalHeight)
      expect(mainOuterHeight).to.be.greaterThan(0)
      expect(currentHeight).to.be.greaterThan(mainOuterHeight)
      expect(contentHeight).to.be.greaterThan(0)
    })
  })

  it('issue #1324 keeps manual and automatic wrapping on the same row cadence', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(260, 260)
      editor.command.executeSetPaperMargin([10, 10, 10, 10])
      editor.command.executeSetValue({
        main: [
          {
            value: '手动换行应该和自动换行保持一致。'
          },
          { value: '\n' },
          {
            value:
              '自动换行应该和手动换行保持一致。'.repeat(4)
          }
        ]
      })

      const rows = getTextRows(editor)
      const manualRows = rows.slice(0, 2)
      const wrapRows = rows.slice(2, 4)

      expect(manualRows.length).to.eq(2)
      expect(wrapRows.length).to.eq(2)
      expect(getRowText(manualRows[0])).to.contain('手动换行应该和自动换行保持一致。')
      expect(getRowText(wrapRows[0])).to.contain('自动换行应该和手动换行保持一致。')
      expect(getRowHeight(manualRows[0])).to.be.closeTo(getRowHeight(wrapRows[0]), 2)
      expect(getRowHeight(manualRows[1])).to.be.closeTo(getRowHeight(wrapRows[1]), 2)
    })
  })

  it('issue #1331 keeps wrapped underscore lines from collapsing', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(260, 260)
      editor.command.executeSetPaperMargin([10, 10, 10, 10])
      editor.command.executeSetValue({
        main: [
          {
            value: '_'.repeat(220)
          }
        ]
      })

      const rows = getTextRows(editor)
      expect(rows.length).to.be.greaterThan(1)
      expect(rows.every((row: any) => row.height > 0)).to.eq(true)
      expect(
        rows.reduce((sum: number, row: any) => sum + row.height + (row.offsetY || 0), 0)
      ).to.be.greaterThan(rows[0].height)
      expect(editor.command.getText().main.replace(/\u200B/g, '')).to.eq(
        '_'.repeat(220)
      )
    })
  })
})
