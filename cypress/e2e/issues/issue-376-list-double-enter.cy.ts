import type Editor from '../../../src/editor'
import { ListType } from '../../../src/editor/dataset/enum/List'

const ZERO = '\u200B'

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getOriginalMainElementList()
}

function prepareList(editor: Editor, listType: ListType) {
  editor.command.executeSetValue({
    main: [{ value: '第一项' }]
  })

  const elementList = getOriginalElements(editor)
  editor.command.executeSetRange(0, elementList.length)
  editor.command.executeList(listType)

  const listElements = getOriginalElements(editor)
  const endIndex = listElements.findLastIndex(
    (element: any) => element.value !== ZERO
  )
  expect(endIndex).to.be.greaterThan(-1)
  editor.command.executeSetRange(endIndex, endIndex)
}

function pressEnterTwice() {
  cy.get('.ce-inputarea')
    .type('{enter}', { force: true, delay: 0 })
    .type('{enter}', { force: true, delay: 0 })
}

describe('issue #376 double enter exits lists', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  ;[ListType.OL, ListType.UL].forEach(listType => {
    const label = listType === ListType.OL ? 'ordered' : 'unordered'

    it(`cancels the ${label} list after pressing Enter twice`, () => {
      cy.getEditor().then((editor: Editor) => {
        prepareList(editor, listType)
      })

      pressEnterTwice()

      cy.getEditor().then((editor: Editor) => {
        const range = editor.command.getRange()
        const element = getOriginalElements(editor)[range.endIndex]
        expect(element?.value).to.eq(ZERO)
        expect(element?.listId).to.eq(undefined)
        expect(editor.command.getText().main.replace(/\u200B/g, '')).to.contain(
          '第一项'
        )
      })
    })
  })
})
