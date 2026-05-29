import Editor from '../../../src/editor'

describe('基础功能', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas').first().as('canvas').should('have.length', 1)
  })

  const text = 'canvas-editor'

  it('编辑保存', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      cy.get('@canvas')
        .type(text)
        .then(() => {
          const data = editor.command.getValue().data.main

          expect(data[0].value).to.eq(text)
        })
    })
  })

  it('回车换行', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      editor.command.executeInsertElementList([{ value: 'a' }])
      editor.command.executeSetRange(1, 1)

      cy.get('.ce-inputarea')
        .then($input => {
          const input = $input[0] as HTMLTextAreaElement
          const KeyboardEventCtor = input.ownerDocument.defaultView!.KeyboardEvent
          input.value = ''
          const wasNotCancelled = input.dispatchEvent(
            new KeyboardEventCtor('keydown', {
              key: 'Enter',
              bubbles: true,
              cancelable: true
            })
          )
          input.value = ''
          const data = editor.command.getValue().data.main

          expect(wasNotCancelled).to.eq(false)
          expect(data.map(element => element.value)).to.deep.eq(['a\n'])
        })
      cy.get('.ce-inputarea')
        .type('b', { force: true })
        .then(() => {
          const data = editor.command.getValue().data.main

          expect(data.map(element => element.value)).to.deep.eq(['a\nb'])
        })
    })
  })

  it('模式切换', () => {
    cy.get('@canvas').click()

    cy.get('.ce-cursor').should('have.css', 'display', 'block')

    cy.get('.editor-mode').click().click()

    cy.get('.editor-mode').contains('只读')

    cy.get('@canvas').click()

    cy.get('.ce-cursor').should('have.css', 'display', 'none')
  })

  it('页面缩放', () => {
    cy.get('.page-scale-add').click()

    cy.get('.page-scale-percentage').contains('110%')

    cy.get('.page-scale-minus').click().click()

    cy.get('.page-scale-percentage').contains('90%')
  })

  it('字数统计', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      editor.command.executeInsertElementList([
        {
          value: 'canvas-editor 2022 编辑器'
        }
      ])

      cy.get('.word-count').contains('7')
    })
  })
})
