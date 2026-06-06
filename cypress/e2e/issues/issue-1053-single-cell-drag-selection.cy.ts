import Editor from '../../../src/editor'

function getTable(editor: Editor) {
  return editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
}

function getCellBounds(editor: Editor, tableId: string, trIndex: number, tdIndex: number) {
  const draw = (editor as any).draw
  draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
  const bounds = draw
    .getServices().tableLayoutSnapshotAccessor
    .getFragmentCellBounds(tableId)
    .find((item: any) => item.trIndex === trIndex && item.tdIndex === tdIndex)
  expect(bounds).to.not.eq(undefined)
  return bounds
}

describe('issue #1053 single table cell drag selection', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('selects a single cell when dragging inside the same top-left cell', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertTable(2, 2)

      const table = getTable(editor)!
      const bounds = getCellBounds(editor, table.id!, 0, 0)

      cy.wrap({
        pageNo: bounds.pageNo,
        startX: bounds.x + 4,
        startY: bounds.y + 4,
        endX: bounds.x + bounds.width - 4,
        endY: bounds.y + bounds.height - 4
      }).as('dragCell')
    })

    cy.get('@dragCell').then(payload => {
      const cell = payload as {
        startX: number
        startY: number
        endX: number
        endY: number
      }
      cy.get('canvas[data-index="0"]')
        .trigger('mousedown', cell.startX, cell.startY, {
          button: 0,
          force: true
        })
        .trigger('mousemove', cell.endX, cell.endY, {
          button: 0,
          force: true
        })
        .trigger('mouseup', cell.endX, cell.endY, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()

      expect(range.isCrossRowCol).to.eq(true)
      expect(range.startTrIndex).to.eq(0)
      expect(range.endTrIndex).to.eq(0)
      expect(range.startTdIndex).to.eq(0)
      expect(range.endTdIndex).to.eq(0)
    })
  })
})
