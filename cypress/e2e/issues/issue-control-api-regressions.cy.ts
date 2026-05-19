import type Editor from '../../../src/editor'
import { LocationPosition } from '../../../src/editor/dataset/enum/Common'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('control API regressions', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #1037 batches control value and property updates', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'name',
              type: ControlType.TEXT,
              value: null,
              placeholder: 'name'
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'age',
              type: ControlType.NUMBER,
              value: null,
              placeholder: 'age'
            }
          }
        ]
      })

      editor.command.executeSetControlValueList([
        {
          conceptId: 'name',
          value: '张三',
          isSubmitHistory: false
        },
        {
          conceptId: 'age',
          value: '42',
          isSubmitHistory: false
        }
      ])
      editor.command.executeSetControlPropertiesList([
        {
          conceptId: 'name',
          properties: {
            highlight: '#ffff00'
          },
          isSubmitHistory: false
        },
        {
          conceptId: 'age',
          properties: {
            bold: true
          },
          isSubmitHistory: false
        }
      ])

      const values = editor.command.getControlValue({ conceptId: 'name' })
      expect(values[0]).to.include({
        value: '张三',
        innerText: '张三',
        highlight: '#ffff00'
      })
      const age = editor.command.getControlValue({ conceptId: 'age' })
      expect(age[0]).to.include({
        value: '42',
        innerText: '42',
        bold: true
      })
    })
  })

  it('issue #1136 applies styled element arrays to date controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'visitDate',
              type: ControlType.DATE,
              value: null,
              placeholder: 'date'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'visitDate',
        value: [
          {
            value: '2026-05-19',
            highlight: '#ff0000'
          }
        ]
      })

      const value = editor.command.getControlValue({
        conceptId: 'visitDate'
      })[0]
      expect(value).to.include({
        value: '2026-05-19',
        innerText: '2026-05-19'
      })
      expect(value.elementList?.[0]).to.include({
        value: '2026-05-19',
        highlight: '#ff0000'
      })
    })
  })

  it('issue #1140 applies styled element arrays to number controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'score',
              type: ControlType.NUMBER,
              value: null,
              placeholder: 'score'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'score',
        value: [
          {
            value: '98',
            highlight: '#00ff00'
          }
        ]
      })

      const value = editor.command.getControlValue({ conceptId: 'score' })[0]
      expect(value).to.include({
        value: '98',
        innerText: '98'
      })
      expect(value.elementList?.[0]).to.include({
        value: '98',
        highlight: '#00ff00'
      })
    })
  })

  it('issue #1073 exports only selected checkbox labels to HTML', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'symptom',
              type: ControlType.CHECKBOX,
              code: 'yes',
              value: null,
              valueSets: [
                { value: '有', code: 'yes' },
                { value: '无', code: 'no' }
              ]
            }
          }
        ]
      })

      const html = editor.command.getHTML().main
      expect(html).to.contain('有')
      expect(html).not.to.contain('无')
    })
  })

  it('issue #1319 blocks Enter from inserting newlines into number controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'numberField',
              type: ControlType.NUMBER,
              value: null,
              placeholder: 'number'
            }
          }
        ]
      })
    })

    cy.get('canvas[data-index]').first().type('{leftArrow}')
    cy.get('.ce-inputarea').type('123{enter}456')

    cy.getEditor().then((editor: Editor) => {
      const value = editor.command.getControlValue({
        conceptId: 'numberField'
      })[0]
      expect(value.value).to.eq('123456')
      expect(value.innerText).to.eq('123456')
      expect(value.value).not.to.contain('\n')
    })
  })

  it('issue #1219 allows empty control prefix and postfix to remove brackets', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'plainPlaceholder',
              type: ControlType.TEXT,
              value: null,
              placeholder: '请输入',
              prefix: '',
              postfix: ''
            }
          }
        ]
      })

      const rawText = (editor as any).draw
        .getOriginalMainElementList()
        .map((element: any) => element.value)
        .join('')
        .replace(/\u200B/g, '')
      expect(rawText).to.eq('请输入')
      expect(rawText).not.to.contain('{')
      expect(rawText).not.to.contain('}')
    })
  })

  it('issue #1071 inserts controls when global prefix and postfix are empty strings', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        control: {
          prefix: '',
          postfix: ''
        }
      })
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertControl({
        type: ElementType.CONTROL,
        value: '',
        control: {
          conceptId: 'globalEmptyAffix',
          type: ControlType.TEXT,
          value: null,
          placeholder: '空前后缀'
        }
      } as any)

      const rawControl = (editor as any).draw
        .getOriginalMainElementList()
        .find((element: any) => element.control?.conceptId === 'globalEmptyAffix')
      expect(rawControl?.control).to.include({
        conceptId: 'globalEmptyAffix',
        placeholder: '空前后缀'
      })

      editor.command.executeSetControlValue({
        conceptId: 'globalEmptyAffix',
        value: '已填写'
      })
      const filled = editor.command.getControlValue({
        conceptId: 'globalEmptyAffix'
      })[0]
      expect(filled).to.include({
        value: '已填写',
        innerText: '已填写'
      })

      const rawText = (editor as any).draw
        .getOriginalMainElementList()
        .map((element: any) => element.value)
        .join('')
        .replace(/\u200B/g, '')
      expect(rawText).to.eq('已填写')
      expect(rawText).not.to.contain('{')
      expect(rawText).not.to.contain('}')
    })
  })

  it('issue #988 clears text controls with null values and restores the placeholder', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'nullableText',
              type: ControlType.TEXT,
              value: [{ value: 'initial' }],
              placeholder: 'empty placeholder'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'nullableText',
        value: null
      })

      const control = editor.command.getControlValue({
        conceptId: 'nullableText'
      })[0]
      expect(control).to.include({
        value: null,
        innerText: null,
        placeholder: 'empty placeholder'
      })
      const rawText = (editor as any).draw
        .getOriginalMainElementList()
        .map((element: any) => element.value)
        .join('')
      expect(rawText).to.contain('empty placeholder')
      expect(rawText).to.contain('{')
      expect(rawText).to.contain('}')
    })
  })

  it('issue #1128 keeps unselected checkbox control values empty', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'emptyCheckbox',
              type: ControlType.CHECKBOX,
              code: null,
              value: null,
              valueSets: [
                { value: '有', code: 'yes' },
                { value: '无', code: 'no' }
              ]
            }
          }
        ]
      })

      const value = editor.command.getControlValue({
        conceptId: 'emptyCheckbox'
      })[0]
      expect(value.value).to.eq(null)
      expect(value.innerText).to.eq(null)
      expect(editor.command.getHTML().main).not.to.contain('有')
      expect(editor.command.getHTML().main).not.to.contain('无')
    })
  })

  it('issue #1225 loads choice controls with selected labels in nested containers', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'loadedSelect',
              type: ControlType.SELECT,
              code: 'yes',
              value: null,
              placeholder: '请选择',
              valueSets: [
                { value: '有', code: 'yes' },
                { value: '无', code: 'no' }
              ]
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'loadedCheckbox',
              type: ControlType.CHECKBOX,
              code: 'left,right',
              value: null,
              valueSets: [
                { value: '左', code: 'left' },
                { value: '右', code: 'right' }
              ]
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'loadedRadio',
              type: ControlType.RADIO,
              code: 'female',
              value: null,
              valueSets: [
                { value: '男', code: 'male' },
                { value: '女', code: 'female' }
              ]
            }
          },
          { value: '\n' },
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'choice-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [
              {
                type: ElementType.TABLE,
                value: '',
                width: 200,
                colgroup: [{ width: 200 }],
                trList: [
                  {
                    height: 40,
                    tdList: [
                      {
                        colspan: 1,
                        rowspan: 1,
                        value: [
                          {
                            type: ElementType.CONTROL,
                            value: '',
                            control: {
                              conceptId: 'areaTableSelect',
                              type: ControlType.SELECT,
                              code: 'ok',
                              value: null,
                              placeholder: '状态',
                              valueSets: [
                                { value: '正常', code: 'ok' },
                                { value: '异常', code: 'bad' }
                              ]
                            }
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      expect(editor.command.getControlValue({ conceptId: 'loadedSelect' })[0]).to.include({
        value: 'yes',
        innerText: '有'
      })
      expect(editor.command.getControlValue({ conceptId: 'loadedCheckbox' })[0]).to.include({
        value: 'left,right',
        innerText: '左右'
      })
      expect(editor.command.getControlValue({ conceptId: 'loadedRadio' })[0]).to.include({
        value: 'female',
        innerText: '女'
      })
      expect(editor.command.getControlValue({ conceptId: 'areaTableSelect' })[0]).to.include({
        value: 'ok',
        innerText: '正常'
      })

      const text = editor.command.getText().main
      expect(text).to.contain('有')
      expect(text).to.contain('左')
      expect(text).to.contain('右')
      expect(text).to.contain('女')
      expect(text).to.contain('正常')
    })
  })

  it('issue #1360 exposes the selected paragraph start index in range context', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'first' }, { value: '\n' }, { value: 'second' }]
      })
      const elementList = (editor as any).draw.getOriginalMainElementList()
      const secondParagraphStart = elementList.findIndex(
        (element: any, index: number) =>
          element.value === 's' && elementList[index - 1]?.value === '\u200B'
      )
      expect(secondParagraphStart).to.be.greaterThan(-1)
      editor.command.executeSetRange(secondParagraphStart, secondParagraphStart)

      const context = editor.command.getRangeContext()
      expect(context?.startParagraphNo).to.eq(secondParagraphStart - 1)
      expect(elementList[context!.startParagraphNo].value).to.eq('\u200B')
      expect(editor.command.getRangeParagraph()?.[0].value).to.eq('second')
    })
  })

  it('issue #1150 exposes start and end column numbers in range context', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'abcdef' }]
      })
      editor.command.executeSetRange(1, 4)

      const context = editor.command.getRangeContext()
      expect(context?.startColNo).to.eq(2)
      expect(context?.endColNo).to.eq(4)
      expect(context?.selectionText).to.eq('bcd')
    })
  })

  it('issue #1353 keeps disabled control location away from the postfix', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'disabledText',
              type: ControlType.TEXT,
              value: [{ value: 'locked' }],
              placeholder: 'locked',
              disabled: true,
              prefix: '{{{{',
              postfix: '}}}}'
            }
          }
        ]
      })

      const elementList = (editor as any).draw.getElementList()
      const controlId = elementList.find(
        (element: any) => element.control?.conceptId === 'disabledText'
      )?.controlId
      expect(controlId).to.be.a('string')

      editor.command.executeLocationControl(controlId, {
        position: LocationPosition.AFTER
      })

      const range = editor.command.getRange()
      expect(elementList[range.startIndex].controlComponent).not.to.eq(
        'postfix'
      )
      expect(editor.command.getRangeContext()?.endElement.value).to.eq('d')
    })
  })

  it('issues #305, #323, #628, #653, and #884 support control APIs inside table cells', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            width: 240,
            colgroup: [{ width: 240 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      {
                        type: ElementType.CONTROL,
                        value: '',
                        control: {
                          conceptId: 'tableControl',
                          type: ControlType.TEXT,
                          value: null,
                          placeholder: 'table control'
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'outsideControl',
              type: ControlType.TEXT,
              value: null,
              placeholder: 'outside control'
            }
          }
        ]
      })

      const controlList = editor.command.getControlList()
      expect(
        controlList.map(element => element.control?.conceptId)
      ).to.include.members(['tableControl', 'outsideControl'])

      editor.command.executeSetControlValue({
        conceptId: 'tableControl',
        value: 'table value'
      })
      editor.command.executeSetControlExtension({
        conceptId: 'tableControl',
        extension: { source: 'table-cell' }
      })
      editor.command.executeSetControlProperties({
        conceptId: 'tableControl',
        properties: {
          highlight: '#00ff00',
          bold: true
        }
      })

      const tableControl = editor.command.getControlValue({
        conceptId: 'tableControl'
      })[0]
      expect(tableControl).to.include({
        value: 'table value',
        innerText: 'table value',
        highlight: '#00ff00',
        bold: true
      })
      expect(tableControl.extension).to.deep.eq({
        source: 'table-cell'
      })

      const outsideControl = editor.command.getControlValue({
        conceptId: 'outsideControl'
      })[0]
      expect(outsideControl.value).to.eq(null)
      expect(outsideControl.extension).to.eq(undefined)
      expect(outsideControl.highlight).to.eq(undefined)
    })
  })

  it('issue #976 does not replace text inside disabled controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'disabledControl',
              type: ControlType.TEXT,
              value: [{ value: 'target' }],
              placeholder: 'disabled',
              disabled: true
            }
          },
          { value: ' target' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'enabledControl',
              type: ControlType.TEXT,
              value: [{ value: 'target' }],
              placeholder: 'enabled'
            }
          }
        ]
      })

      editor.command.executeSearch('target')
      expect(editor.command.getSearchNavigateInfo()?.count).to.eq(3)

      editor.command.executeReplace('replaced')

      const disabledControl = editor.command.getControlValue({
        conceptId: 'disabledControl'
      })[0]
      const enabledControl = editor.command.getControlValue({
        conceptId: 'enabledControl'
      })[0]
      expect(disabledControl).to.include({
        value: 'target',
        innerText: 'target'
      })
      expect(enabledControl).to.include({
        value: 'replaced',
        innerText: 'replaced'
      })
      const text = editor.command.getText().main
      expect(text).to.contain('target')
      expect(text).to.contain('replaced')
      expect(text.match(/replaced/g)).to.have.length(2)
    })
  })
})
