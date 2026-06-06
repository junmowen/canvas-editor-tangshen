import Editor from '../../../src/editor'
import { VerticalAlign } from '../../../src/editor/dataset/enum/VerticalAlign'
import { TableBorder } from '../../../src/editor/dataset/enum/table/Table'

function getTable(editor: Editor) {
  return (editor as any).draw
    .getObjectResolver().getOriginalMainElementList()
    .find((element: any) => element.type === 'table')
}

function getCellCenter(editor: Editor, tableId: string) {
  const draw = (editor as any).draw
  draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
  const bounds = draw
    .getServices().tableLayoutSnapshotAccessor
    .getFragmentCellBounds(tableId)
    .find((item: any) => item.trIndex === 0 && item.tdIndex === 0)
  expect(bounds, '首个单元格布局边界必须存在').to.exist
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  }
}

describe('菜单-表格属性', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('右键表格可打开表格属性并保存常用属性', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertTable(2, 2)
      const table = getTable(editor)
      expect(table?.id, '表格必须已插入').to.be.a('string')
      const center = getCellCenter(editor, table.id)
      cy.wrap(center).as('cellCenter')
    })

    cy.get<{ x: number; y: number }>('@cellCenter').then(({ x, y }) => {
      cy.get('canvas[data-index="0"]').rightclick(x, y, {
        force: true
      })
    })

    cy.contains('.ce-contextmenu-content .ce-contextmenu-item', /^表格属性$/)
      .should('be.visible')
      .click()

    cy.get('.dialog-container select[name="borderType"]').select(TableBorder.EXTERNAL)
    cy.get('.dialog-container input[name="borderColor"]')
      .invoke('val', '#123456')
      .trigger('input')
      .trigger('change')
    cy.get('.dialog-container input[name="borderWidth"]').clear().type('2')
    cy.get('.dialog-container input[name="borderExternalWidth"]').clear().type('5')
    cy.get('.dialog-container input[name="rowMinHeight"]').clear().type('36')
    cy.get('.dialog-container select[name="repeatHeaderRow"]').select('true')
    cy.get('.dialog-container input[name="cellBackgroundColor"]')
      .invoke('val', '#ff00aa')
      .trigger('input')
      .trigger('change')
    cy.get('.dialog-container select[name="verticalAlign"]').select(
      VerticalAlign.MIDDLE
    )
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const table = getTable(editor)
      const firstRow = table?.trList?.[0]
      const firstCell = firstRow?.tdList?.[0]

      expect(table?.borderType).to.eq(TableBorder.EXTERNAL)
      expect(table?.borderColor).to.eq('#123456')
      expect(table?.borderWidth).to.eq(2)
      expect(table?.borderExternalWidth).to.eq(5)
      expect(firstRow?.minHeight).to.eq(36)
      expect(firstRow?.repeatOnPageStart).to.eq(true)
      expect(firstCell?.backgroundColor).to.eq('#ff00aa')
      expect(firstCell?.verticalAlign).to.eq(VerticalAlign.MIDDLE)
    })
  })
})
