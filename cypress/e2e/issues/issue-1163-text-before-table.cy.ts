import Editor from '../../../src/editor'

const ZERO = '\u200B'

function getMainValues(editor: Editor) {
  return editor.command.getValue({
    extraPickAttrs: ['id']
  }).data.main
}

describe('issue #1163 text before table', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('inserts normal text before a table at the beginning of the document', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [{ value: ZERO }],
          footer: []
        },
        {
          isSetCursor: true
        } as any
      )
      editor.command.executeSetRange(0, 0)
      editor.command.executeInsertTable(1, 1)

      let data = getMainValues(editor)
      const table = data.find(element => element.type === 'table')
      expect(data[0].type).to.eq('table')
      expect(table).to.not.eq(undefined)

      editor.command.executeAppendElementList(
        [
          {
            value: 'before'
          }
        ],
        {
          isPrepend: true
        }
      )

      data = getMainValues(editor)
      expect(data[0].value).to.eq('before')
      expect(data[1].type).to.eq('table')
      expect(data[1].id).to.eq(table!.id)
      expect(data[1].trList?.[0].tdList[0].value).to.have.length(0)
    })
  })
})
