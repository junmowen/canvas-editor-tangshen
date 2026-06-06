import type Editor from '../../../src/editor'

describe('issue #1237 page columns', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('updates and persists page column settings from the toolbar dialog', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        columns: {
          count: 2,
          gap: 32,
          widths: [180, 160]
        }
      })
    })

    cy.get('.footer .page-columns').should('not.exist')
    cy.get('.page-columns').click()
    cy.get('.page-columns [data-page-columns="1"]').should('contain.text', '1栏')
    cy.get('.page-columns [data-page-columns="2"]').should('contain.text', '2栏')
    cy.get('.page-columns [data-page-columns="3"]').should('contain.text', '3栏')
    cy.get('.page-columns [data-page-columns="custom"]').click()
    cy.get('.dialog-title span').should('contain.text', '分栏')
    cy.get('.dialog-option [name="count"]').should('have.value', '2')
    cy.get('.dialog-option [name="gap"]').should('have.value', '32')
    cy.get('.dialog-option [name="widths"]').should('have.value', '180,160')

    cy.get('.dialog-option [name="count"]').clear().type('3')
    cy.get('.dialog-option [name="gap"]').clear().type('18')
    cy.get('.dialog-option [name="widths"]').clear().type('160,120,100')
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().columns).to.deep.eq({
        count: 3,
        gap: 18,
        widths: [160, 120, 100]
      })
      expect(editor.command.getValue().options.columns).to.deep.eq({
        count: 3,
        gap: 18,
        widths: [160, 120, 100]
      })
    })
  })

  it('applies quick toolbar columns to selected content', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        columns: {
          count: 1,
          gap: 0,
          widths: []
        }
      })
      editor.command.executeSetValue({
        main: [
          { value: '前置正文。\n' },
          { value: '选中内容需要通过顶部菜单快速设置为双栏。'.repeat(8) },
          { value: '\n后置正文。' }
        ]
      })
      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const fullText = elementList.map((element: any) => element.value).join('')
      let offset = 0
      const findIndex = (targetText: string) => {
        const targetOffset = fullText.indexOf(targetText)
        offset = 0
        for (let index = 0; index < elementList.length; index++) {
          offset += String(elementList[index].value).length
          if (offset > targetOffset) {
            return index
          }
        }
        return -1
      }
      editor.command.executeSetRange(
        findIndex('选中内容需要'),
        findIndex('后置正文') - 1
      )
    })

    cy.get('.page-columns').click()
    cy.get('.page-columns [data-page-columns="2"]').click()

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().columns).to.deep.eq({
        count: 1,
        gap: 0,
        widths: []
      })
      const localColumnsElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.columns?.count === 2)
      expect(localColumnsElement).to.not.eq(undefined)
    })
  })
})
