import type Editor from '../../../src/editor'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'

function getControlElements(editor: Editor) {
  return (editor as any).draw
    .getOriginalMainElementList()
    .filter((element: any) => element.controlId)
}

describe('form mode control deletion disabled', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps control structure when selected content is deleted in form mode', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: null,
              placeholder: '其他补充',
              prefix: '{',
              postfix: '}'
            }
          },
          {
            value: '\n'
          },
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: [
                {
                  value: '已填写'
                }
              ],
              placeholder: '可编辑',
              prefix: '{',
              postfix: '}'
            }
          }
        ]
      })
      editor.command.executeMode(EditorMode.FORM)

      const elementList = (editor as any).draw.getOriginalMainElementList()
      const structureElements = getControlElements(editor)
      const firstControlId = structureElements[0].controlId
      const firstStartIndex = elementList.findIndex(
        (element: any) => element.controlId === firstControlId
      )
      const firstEndIndex = elementList.reduce((endIndex: number, element: any, index: number) => {
        return element.controlId === firstControlId ? index : endIndex
      }, firstStartIndex)

      expect(firstStartIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(firstStartIndex, firstEndIndex)
      editor.command.executeBackspace()

      const controls = editor.command.getControlList()
      expect(controls.some((element: any) => element.control?.placeholder === '其他补充')).to.eq(
        true
      )
      expect(getControlElements(editor).some((element: any) => element.controlId === firstControlId)).to.eq(
        true
      )
    })
  })

  it('still allows deleting a text control value in form mode', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: [
                {
                  value: '已填写'
                }
              ],
              placeholder: '可编辑',
              prefix: '{',
              postfix: '}'
            }
          }
        ]
      })
      editor.command.executeMode(EditorMode.FORM)

      const elementList = (editor as any).draw.getOriginalMainElementList()
      const startIndex = elementList.findIndex((element: any) => element.value === '已')
      const endIndex = elementList.findIndex((element: any) => element.value === '写')
      expect(startIndex).to.be.greaterThan(-1)
      expect(endIndex).to.be.greaterThan(startIndex)

      editor.command.executeSetRange(startIndex - 1, endIndex)
      editor.command.executeBackspace()

      const control = editor.command
        .getControlList()
        .find((element: any) => element.control?.placeholder === '可编辑')
      expect(control?.control?.value || []).to.have.length(0)
      expect(getControlElements(editor).some((element: any) => element.controlId === control?.controlId)).to.eq(
        true
      )
    })
  })
})
