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
      editor.command.executeTableBorderColor('#FF0000')
      editor.command.executeTableTdBorderType(TdBorder.TOP)
      editor.command.executeTableTdBorderType(TdBorder.LEFT)

      table = getTable(editor)
      const firstCell = table?.trList?.[0].tdList[0]

      expect(table?.borderType).to.eq(TableBorder.EXTERNAL)
      expect(table?.borderColor).to.eq('#FF0000')
      expect(firstCell?.borderTypes).to.include(TdBorder.TOP)
      expect(firstCell?.borderTypes).to.include(TdBorder.LEFT)

      editor.command.executeTableTdBorderType(TdBorder.TOP)

      table = getTable(editor)
      expect(table?.trList?.[0].tdList[0].borderTypes).to.not.include(
        TdBorder.TOP
      )
      expect(table?.trList?.[0].tdList[0].borderTypes).to.include(TdBorder.LEFT)
    })
  })
})
