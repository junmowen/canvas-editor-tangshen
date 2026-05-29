import Editor, { ControlType, ElementType } from '../../../src/editor'

describe('控件-文本型', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas').first().as('canvas').should('have.length', 1)
  })

  const text = `canvas-editor`
  const elementType: ElementType = <ElementType>'control'
  const controlType: ControlType = <ControlType>'text'

  it('文本型', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      editor.command.executeInsertElementList([
        {
          type: elementType,
          value: '',
          control: {
            type: controlType,
            value: null,
            placeholder: '文本型'
          }
        }
      ])

      const controlId = (editor as any).draw
        .getObjectResolver()
        .getOriginalMainElementList()
        .find((element: any) => element.controlId).controlId
      editor.command.executeSetControlValue({
        id: controlId,
        value: text
      })

      const [controlValue] = editor.command.getControlValue({
        id: controlId
      })
      expect(controlValue.value).to.be.eq(text)
    })
  })
})
