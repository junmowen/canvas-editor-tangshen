import type Editor from '../../../src/editor'

function getMainText(editor: Editor) {
  const main = editor.command.getValue().data.main
  const textControl = main.find((element: any) =>
    element.type === 'control' &&
    element.control?.type === 'text' &&
    element.control?.value?.some((valueElement: any) => valueElement.type === 'control')
  )
  return (textControl?.control?.value || [])
    .map((element: any) => getElementText(element))
    .join('')
}

function getElementText(element: any) {
  if (element.type !== 'control' || !element.control) {
    return element.value
  }
  const control = element.control
  const value = Array.isArray(control.value) && control.value.length
    ? control.value.map((valueElement: any) => valueElement.value).join('')
    : control.placeholder || ''
  return `${control.prefix ?? '{'}${control.preText || ''}${value}${control.postText || ''}${control.postfix ?? '}'}`
}

function getTextControlValue(editor: Editor) {
  const main = editor.command.getValue().data.main
  const textControl = main.find((element: any) =>
    element.type === 'control' &&
    element.control?.type === 'text' &&
    element.control?.value?.some((valueElement: any) => valueElement.type === 'control')
  )
  return textControl?.control?.value || []
}

function getNestedControlValueList(editor: Editor) {
  return editor.command.getControlList().filter((element: any) =>
    ['年龄', '请选择'].includes(element.control?.placeholder) ||
    element.control?.valueSets?.some((valueSet: any) => valueSet.value === '无子女')
  )
}

describe('issue #425 - control inserted in text control value', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
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
      expect(getNestedControlValueList(editor).length).to.eq(3)

      editor.command.executeSetValue({
        main: editor.command.getValue().data.main
      })
      expect(getMainText(editor)).to.eq(firstText)
      expect(getNestedControlValueList(editor).length).to.eq(3)
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

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
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
      const nestedControl = value.find((element: any) => element.control?.placeholder === '年龄')
      expect(nestedControl?.control?.placeholder).to.eq('年龄')
      expect(value.map((element: any) => getElementText(element)).join('')).to.contain('{年龄}')
    })
  })

  it('updates nested control values without replacing the parent text control value', () => {
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
                    placeholder: '年龄',
                    conceptId: 'age'
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
                    conceptId: 'spouseHealth',
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
                    conceptId: 'childStatus',
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

      const ageControl = (editor as any).draw
        .getObjectResolver().getOriginalMainElementList()
        .find((element: any) => element.control?.conceptId === 'age')
      expect(ageControl?.controlId).to.be.a('string')
      editor.command.executeSetControlValue({
        id: ageControl!.controlId,
        value: '22'
      })

      const text = getMainText(editor)
      expect(text).to.contain('结婚年龄：{22} 岁')
      expect(text).to.contain('配偶健康{请选择}')
      expect(text).to.contain('{无子女}')
      expect(text).not.to.eq('{{22}}')

      const ageValue = editor.command.getControlValue({
        conceptId: 'age'
      })
      expect(ageValue?.[0].value).to.eq('22')

      const value = editor.command.getValue().data.main
      editor.command.executeSetValue({
        main: value
      })
      expect(getMainText(editor)).to.eq(text)
    })
  })

  it('does not duplicate braces when an empty text control only contains one nested control', () => {
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
          }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const placeholderIndex = elementList.findIndex(
        (element: any) => element.value === '其'
      )
      expect(placeholderIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(placeholderIndex, placeholderIndex)
      editor.command.executeInsertControl({
        type: 'control',
        value: '',
        control: {
          type: 'text',
          value: null,
          placeholder: '22'
        }
      } as any)

      expect(getMainText(editor)).to.eq('{22}')
      expect(getTextControlValue(editor).map((element: any) => element.value).join('')).to.eq(
        ''
      )
      expect(getMainText(editor)).to.eq('{22}')
      const formattedControlElementList = (editor as any).draw
        .getObjectResolver().getOriginalMainElementList()
        .filter((element: any) => element.controlId)
      expect(formattedControlElementList.some((element: any) => element.parentControlId)).to.eq(
        true
      )

      const value = editor.command.getValue().data.main
      editor.command.executeSetValue({
        main: value
      })
      expect(getMainText(editor)).to.eq('{22}')
      const roundTripControlElementList = (editor as any).draw
        .getObjectResolver().getOriginalMainElementList()
        .filter((element: any) => element.controlId)
      expect(roundTripControlElementList.some((element: any) => element.parentControlId)).to.eq(
        true
      )
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

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const index = elementList.findIndex((element: any) => element.value === '关')
      expect(index).to.be.greaterThan(-1)
      editor.command.executeSetRange(index, index)
    })

    cy.get('.menu-item__control').should('not.have.class', 'disable')
  })
})
