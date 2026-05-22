import type Editor from '../../../src/editor'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('issue #700 explicit control id', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('preserves explicit controlId through setValue and getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'explicit-control-id',
            control: {
              conceptId: 'explicitControl',
              type: ControlType.TEXT,
              value: [{ value: 'explicit value' }],
              placeholder: 'explicit'
            }
          }
        ]
      })

      const control = editor.command
        .getControlList()
        .find(
          (element: any) => element.control?.conceptId === 'explicitControl'
        )
      expect(control?.controlId).to.eq('explicit-control-id')

      const savedControl = editor.command.getValue({
        extraPickAttrs: ['controlId']
      }).data.main[0]
      expect(savedControl).to.include({
        type: ElementType.CONTROL,
        controlId: 'explicit-control-id'
      })
    })
  })
})
