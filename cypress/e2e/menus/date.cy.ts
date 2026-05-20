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

  it('支持按 yyyy 和 yyyy-MM 格式展示年份或月份选择器', () => {
    const renderDatePicker = (editor: Editor, dateFormat: string) => {
      const position = {
        coordinate: {
          leftTop: [0, 0]
        },
        lineHeight: 24,
        pageNo: 0
      }

      ;(editor as any).draw.getComponents().dateParticle.renderDatePicker(
        {
          type: 'date',
          value: '',
          dateFormat,
          valueList: [{ value: '2025-09-08' }]
        },
        position
      )
    }

    cy.getEditor().then((editor: Editor) => {
      renderDatePicker(editor, 'yyyy')
    })
    cy.get('.ce-date-container.active')
      .should('have.class', 'ce-date-container--year')
      .and('not.have.class', 'ce-date-container--month')
    cy.get('.ce-date-week').should('not.be.visible')
    cy.get('.ce-date-day')
      .should('have.class', 'ce-date-day--grid')
      .children()
      .should('have.length', 12)
      .first()
      .invoke('text')
      .should('match', /^\d{4}$/)
    cy.get('.ce-date-menu__time').should('not.be.visible')
    cy.get('.ce-date-menu__now').should('not.be.visible')

    cy.getEditor().then((editor: Editor) => {
      renderDatePicker(editor, 'yyyy-MM')
    })
    cy.get('.ce-date-container.active')
      .should('have.class', 'ce-date-container--month')
      .and('not.have.class', 'ce-date-container--year')
    cy.get('.ce-date-week').should('not.be.visible')
    cy.get('.ce-date-day')
      .should('have.class', 'ce-date-day--grid')
      .children()
      .should('have.length', 12)
      .first()
      .should('have.text', '01')
    cy.get('.ce-date-menu__time').should('not.be.visible')
    cy.get('.ce-date-menu__now').should('not.be.visible')
  })
})
