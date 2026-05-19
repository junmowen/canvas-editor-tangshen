import Editor from '../../../src/editor'

describe('菜单-日期选择器', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('LaTeX', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      cy.get('.menu-item__date').click()

      cy.get('.menu-item__date li')
        .first()
        .click()
        .then(() => {
          const data = editor.command.getValue().data.main

          expect(data[0].type).to.eq('date')
        })
    })
  })

  it('支持 yyyy 格式插入', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      cy.get('.menu-item__date').click()
      cy.get('.menu-item__date li[data-format="yyyy"]').click()
      cy.getEditor().then((nextEditor: Editor) => {
        const dateElement = nextEditor.command
          .getValue()
          .data.main.find(element => element.type === 'date')
        expect(dateElement.type).to.eq('date')
        expect(dateElement.dateFormat).to.eq('yyyy')
      })
    })
  })

  it('支持 yyyy-MM 格式插入', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      cy.get('.menu-item__date').click()
      cy.get('.menu-item__date li[data-format="yyyy-MM"]').click()
      cy.getEditor().then((nextEditor: Editor) => {
        const dateElement = nextEditor.command
          .getValue()
          .data.main.find(element => element.type === 'date')
        expect(dateElement.type).to.eq('date')
        expect(dateElement.dateFormat).to.eq('yyyy-MM')
      })
    })
  })

  it('支持 yyyy-MM-dd hh:mm:ss 格式插入', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      cy.get('.menu-item__date').click()
      cy.get('.menu-item__date li[data-format="yyyy-MM-dd hh:mm:ss"]').click()
      cy.getEditor().then((nextEditor: Editor) => {
        const dateElement = nextEditor.command
          .getValue()
          .data.main.find(element => element.type === 'date')
        expect(dateElement.type).to.eq('date')
        expect(dateElement.dateFormat).to.eq('yyyy-MM-dd hh:mm:ss')
      })
    })
  })
})
