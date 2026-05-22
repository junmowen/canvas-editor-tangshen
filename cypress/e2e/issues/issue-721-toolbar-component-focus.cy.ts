import type Editor from '../../../src/editor'
import { EDITOR_COMPONENT } from '../../../src/editor/dataset/constant/Editor'

describe('issue #721 toolbar component focus', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps the editor cursor active when clicking a custom component toolbar node', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'toolbar focus' }]
      })
      editor.command.executeSetRange(1, 1)

      const draw = (editor as any).draw
      const recoverySpy = cy.spy(draw.getCursor(), 'recoveryCursor')

      cy.document().then(doc => {
        const win = doc.defaultView!
        const toolbar = doc.createElement('div')
        toolbar.textContent = 'custom toolbar'
        toolbar.setAttribute(EDITOR_COMPONENT, 'component')
        doc.body.append(toolbar)

        toolbar.dispatchEvent(
          new win.MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true
          })
        )

        expect(recoverySpy).not.to.have.been.called

        const plain = doc.createElement('div')
        plain.textContent = 'plain target'
        doc.body.append(plain)
        plain.dispatchEvent(
          new win.MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true
          })
        )

        expect(recoverySpy).to.have.been.calledOnce

        toolbar.remove()
        plain.remove()
      })
    })
  })

  it('issue #871 keeps editor shortcuts active after clicking a component toolbar node', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'toolbar shortcut' }]
      })
      editor.command.executeSetRange(0, 7)

      cy.document().then(doc => {
        const win = doc.defaultView!
        const toolbar = doc.createElement('button')
        toolbar.textContent = 'shortcut toolbar'
        toolbar.setAttribute(EDITOR_COMPONENT, 'component')
        doc.body.append(toolbar)

        toolbar.dispatchEvent(
          new win.MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true
          })
        )

        const agentDom = doc.querySelector('.ce-inputarea')!
        agentDom.dispatchEvent(
          new win.KeyboardEvent('keydown', {
            key: 'b',
            ctrlKey: true,
            bubbles: true,
            cancelable: true
          })
        )

        const boldText = editor.command
          .getValue()
          .data.main.filter(element => element.bold)
          .map(element => element.value)
          .join('')
        expect(boldText).to.eq('toolbar')

        toolbar.remove()
      })
    })
  })
})
