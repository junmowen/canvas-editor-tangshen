import type Editor from '../../../src/editor'

function getMainText(editor: Editor) {
  const main = editor.command.getValue().data.main
  const textControl = main.find(
    (element: any) => element.type === 'control' && element.control?.type === 'text'
  )
  return (textControl?.control?.value || [])
    .map((element: any) => element.value)
    .join('')
}

function getTextControlValue(editor: Editor) {
  const main = editor.command.getValue().data.main
  const textControl = main.find(
    (element: any) => element.type === 'control' && element.control?.type === 'text'
  )
  return textControl?.control?.value || []
}

describe('issue #425 - control inserted in text control value', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('renders nested control placeholders as inline text after setValue round trip', () => {
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
                  value: '结婚年龄：'
                },
                {
                  type: 'control',
                  value: '',
                  control: {
                    type: 'text',
                    value: null,
                    placeholder: '年龄'
                  }
                },
                {
                  value: ' 岁，配偶健康'
                },
                {
                  type: 'control',
                  value: '',
                  control: {
                    type: 'select',
                    value: null,
                    placeholder: '请选择',
                    valueSets: [
                      {
                        value: '健康',
                        code: 'healthy'
                      }
                    ]
                  }
                },
                {
                  value: '，'
                },
                {
                  type: 'control',
                  value: '',
                  control: {
                    type: 'checkbox',
                    value: null,
                    code: 'none',
                    valueSets: [
                      {
                        value: '无子女',
                        code: 'none'
                      }
                    ]
                  }
                },
                {
                  value: '。'
                }
              ],
              placeholder: '关系'
            }
          }
        ]
      })

      const firstText = getMainText(editor)
      expect(firstText).to.contain('结婚年龄：{年龄} 岁')
      expect(firstText).to.contain('配偶健康{请选择}')
      expect(firstText).to.contain('{无子女}')
      expect(firstText).not.to.contain('{}')

      const value = editor.command.getValue().data.main
      editor.command.executeSetValue({
        main: value
      })

      const roundTripText = getMainText(editor)
      expect(roundTripText).to.eq(firstText)
      expect(editor.command.getHTML().main).to.contain('年龄')
      expect(getTextControlValue(editor).some((element: any) => element.type === 'control')).to.eq(
        true
      )
    })
  })

  it('allows executeInsertControl inside an active text control', () => {
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
                  value: '关系'
                }
              ],
              placeholder: '关系'
            }
          }
        ]
      })

      const elementList = (editor as any).draw.getOriginalMainElementList()
      const insertIndex = elementList.findIndex((element: any) => element.value === '关')
      expect(insertIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(insertIndex, insertIndex)
      editor.command.executeInsertControl({
        type: 'control',
        value: '',
        control: {
          type: 'text',
          value: null,
          placeholder: '年龄'
        }
      } as any)

      const value = getTextControlValue(editor)
      const nestedControl = value.find((element: any) => element.type === 'control')
      expect(nestedControl?.control?.placeholder).to.eq('年龄')
      expect(value.map((element: any) => element.value).join('')).to.contain('{年龄}')
    })
  })

  it('keeps the toolbar control menu enabled while a text control is active', () => {
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
                  value: '关系'
                }
              ],
              placeholder: '关系'
            }
          }
        ]
      })

      const elementList = (editor as any).draw.getOriginalMainElementList()
      const index = elementList.findIndex((element: any) => element.value === '关')
      expect(index).to.be.greaterThan(-1)
      editor.command.executeSetRange(index, index)
    })

    cy.get('.menu-item__control').should('not.have.class', 'disable')
  })
})
