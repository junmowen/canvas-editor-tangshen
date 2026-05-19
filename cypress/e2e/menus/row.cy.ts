import Editor from '../../../src/editor'

describe('菜单-行处理', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  const text = 'canvas-editor'
  const prepareTextParagraph = (editor: Editor) => {
    editor.command.executeSetValue({
      main: [
        {
          value: text,
          size: 16
        }
      ]
    })
    editor.command.executeSetRange(1, 1)
  }
  const getTextElement = (editor: Editor) => {
    const data = editor.command.getValue().data.main
    const element = data.find(element => element.value === text)
    expect(element).to.not.eq(undefined)
    return element!
  }

  it('左对齐', () => {
    cy.getEditor().then((editor: Editor) => {
      prepareTextParagraph(editor)

      cy.get('.menu-item__left')
        .click()
        .then(() => {
          const element = getTextElement(editor)

          expect(element.rowFlex).to.eq('left')
        })
    })
  })

  it('居中对齐', () => {
    cy.getEditor().then((editor: Editor) => {
      prepareTextParagraph(editor)

      cy.get('.menu-item__center')
        .click()
        .then(() => {
          const element = getTextElement(editor)

          expect(element.rowFlex).to.eq('center')
        })
    })
  })

  it('靠右对齐', () => {
    cy.getEditor().then((editor: Editor) => {
      prepareTextParagraph(editor)

      cy.get('.menu-item__right')
        .click()
        .then(() => {
          const element = getTextElement(editor)

          expect(element.rowFlex).to.eq('right')
        })
    })
  })

  it('行间距', () => {
    cy.getEditor().then((editor: Editor) => {
      prepareTextParagraph(editor)

      cy.get('.menu-item__row-margin').as('rowMargin').click()

      cy.get('@rowMargin')
        .find('li')
        .eq(1)
        .click()
        .then(() => {
          const element = getTextElement(editor)

          expect(element.rowMargin).to.eq(1.25)
        })
    })
  })

  it('首行缩进', () => {
    cy.getEditor().then((editor: Editor) => {
      prepareTextParagraph(editor)

      cy.get('.menu-item__row-indent').as('rowIndent').click()

      cy.get('@rowIndent').find('input.row-indent-left-input').clear().type('1')
      cy.get('@rowIndent').find('input.row-indent-right-input').clear().type('1.5')
      cy.get('@rowIndent').find('input.row-indent-input').clear().type('2.5')
      cy.get('@rowIndent')
        .find('input.row-hanging-indent-input')
        .clear()
        .type('0.5')
      cy.get('@rowIndent').find('button.row-indent-apply').click()

      cy.getEditor().then((editor: Editor) => {
        const element = getTextElement(editor)

        expect(element.rowIndentLeft).to.eq(16)
        expect(element.rowIndentRight).to.eq(24)
        expect(element.rowIndent).to.eq(40)
        expect(element.rowHangingIndent).to.eq(8)
      })

      cy.get('@rowIndent').click()

      cy.get('@rowIndent')
        .find('li[data-rowindent="0"]')
        .click()
        .then(() => {
          const element = getTextElement(editor)

          expect(element.rowIndent).to.eq(undefined)
          expect(element.rowIndentLeft).to.eq(16)
          expect(element.rowIndentRight).to.eq(24)
          expect(element.rowHangingIndent).to.eq(8)
        })
    })
  })
})
