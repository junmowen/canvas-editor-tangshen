import type Editor from '../../../src/editor'
import { ZERO } from '../../../src/editor/dataset/constant/Common'
import {
  FlexDirection,
  LocationPosition
} from '../../../src/editor/dataset/enum/Common'
import {
  ControlComponent,
  ControlState,
  ControlType
} from '../../../src/editor/dataset/enum/Control'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'

describe('control API regressions', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })
  it('issue #905 batch-removes matching controls inside and outside tables', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            width: 240,
            colgroup: [{ width: 120 }, { width: 120 }],
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
                          conceptId: 'batchDelete',
                          type: ControlType.TEXT,
                          value: [{ value: 'table-left' }],
                          placeholder: 'left'
                        }
                      }
                    ]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      {
                        type: ElementType.CONTROL,
                        value: '',
                        control: {
                          conceptId: 'keepTable',
                          type: ControlType.TEXT,
                          value: [{ value: 'keep-table' }],
                          placeholder: 'keep'
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
              conceptId: 'batchDelete',
              type: ControlType.TEXT,
              value: [{ value: 'outside' }],
              placeholder: 'outside'
            }
          }
        ]
      })

      expect(
        editor.command.getControlValue({ conceptId: 'batchDelete' })
      ).to.have.length(2)

      editor.command.executeRemoveControl({
        conceptId: 'batchDelete'
      })

      expect(
        editor.command.getControlValue({ conceptId: 'batchDelete' })
      ).to.deep.eq([])
      expect(
        editor.command.getControlValue({ conceptId: 'keepTable' })[0]
      ).to.include({
        value: 'keep-table',
        innerText: 'keep-table'
      })
      const data = editor.command.getValue().data.main
      expect(data[0].trList?.[0].tdList[0].value).to.deep.eq([])
      expect(
        data.map(element => element.control?.conceptId).filter(Boolean)
      ).not.to.include('batchDelete')
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
        .getObjectResolver().getOriginalMainElementList()
        .map((element: any) => element.value)
        .join('')
      expect(rawText).to.contain('empty placeholder')
      expect(rawText).to.contain('{')
      expect(rawText).to.contain('}')
    })
  })

  it('issue #439 clears text controls with an empty string and restores the placeholder', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'emptyStringText',
              type: ControlType.TEXT,
              value: [{ value: 'initial' }],
              placeholder: 'empty string placeholder'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'emptyStringText',
        value: ''
      })

      const control = editor.command.getControlValue({
        conceptId: 'emptyStringText'
      })[0]
      expect(control).to.include({
        value: null,
        innerText: null,
        placeholder: 'empty string placeholder'
      })
      const rawText = (editor as any).draw
        .getObjectResolver().getOriginalMainElementList()
        .map((element: any) => element.value)
        .join('')
      expect(rawText).to.contain('empty string placeholder')
      expect(editor.command.getValue().data.main[0].control?.value).to.deep.eq(
        []
      )
      expect(editor.command.getText().main).not.to.contain('initial')
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

      expect(
        editor.command.getControlValue({ conceptId: 'loadedSelect' })[0]
      ).to.include({
        value: 'yes',
        innerText: '有'
      })
      expect(
        editor.command.getControlValue({ conceptId: 'loadedCheckbox' })[0]
      ).to.include({
        value: 'left,right',
        innerText: '左右'
      })
      expect(
        editor.command.getControlValue({ conceptId: 'loadedRadio' })[0]
      ).to.include({
        value: 'female',
        innerText: '女'
      })
      expect(
        editor.command.getControlValue({ conceptId: 'areaTableSelect' })[0]
      ).to.include({
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

  it('issue #821 keeps getControlValue consistent with getValue for list values inside table controls', () => {
    cy.getEditor().then((editor: Editor) => {
      const nestedValue = [
        {
          value: '',
          type: ElementType.LIST,
          listType: ListType.UL,
          listStyle: ListStyle.DISC,
          valueList: [
            {
              value: '嵌套列表值'
            }
          ]
        }
      ]
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            width: 220,
            colgroup: [{ width: 220 }],
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
                          conceptId: 'tableListControl',
                          type: ControlType.TEXT,
                          value: nestedValue,
                          placeholder: 'list value'
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      const control = editor.command.getControlValue({
        conceptId: 'tableListControl'
      })[0]
      const savedControl =
        editor.command.getValue().data.main[0].trList?.[0].tdList[0].value[0]
          .control
      expect(control.elementList).to.deep.eq(savedControl?.value)
      expect(control.value).to.eq('嵌套列表值')
      expect(savedControl?.value?.[0]).to.include({
        type: ElementType.LIST,
        listType: ListType.UL,
        listStyle: ListStyle.DISC
      })
    })
  })

  it('issue #1360 exposes the selected paragraph start index in range context', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'first' }, { value: '\n' }, { value: 'second' }]
      })
      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
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

      const elementList = (editor as any).draw.getObjectResolver().getElementList()
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

  it('issue #1109 lets style APIs update disabled controls without changing their value', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'disabledStyle',
              type: ControlType.TEXT,
              value: [{ value: 'locked' }],
              placeholder: 'locked',
              disabled: true
            }
          }
        ]
      })

      editor.command.executeSetControlProperties({
        conceptId: 'disabledStyle',
        properties: {
          font: 'Microsoft YaHei',
          size: 24,
          bold: true,
          highlight: '#00ff00'
        }
      })

      const control = editor.command.getControlValue({
        conceptId: 'disabledStyle'
      })[0]
      expect(control).to.include({
        value: 'locked',
        innerText: 'locked',
        disabled: true,
        font: 'Microsoft YaHei',
        size: 24,
        bold: true,
        highlight: '#00ff00'
      })
      expect(control.elementList?.[0]).to.include({
        value: 'locked',
        font: 'Microsoft YaHei',
        size: 24,
        bold: true,
        highlight: '#00ff00'
      })
    })
  })

  it('issue #1105 highlights disabled controls with configured disabledBackgroundColor', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        control: {
          disabledBackgroundColor: '#f2dede'
        }
      })
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'disabledHighlight',
              type: ControlType.TEXT,
              value: [{ value: 'locked' }],
              placeholder: 'locked',
              disabled: true
            }
          }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getElementList()
      const valueIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'disabledHighlight' &&
          element.controlComponent === 'value'
      )
      expect(valueIndex).to.be.greaterThan(-1)

      const highlight = (editor as any).draw
        .getControl()
        .getControlHighlight(elementList, valueIndex)

      expect(highlight).to.eq('#f2dede')
      expect(
        editor.command.getControlValue({ conceptId: 'disabledHighlight' })[0]
      ).to.include({
        disabled: true,
        value: 'locked'
      })
    })
  })

  it('issue #296 updates arbitrary control properties such as minWidth', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'resizableControl',
              type: ControlType.TEXT,
              value: [{ value: 'content' }],
              placeholder: 'content'
            }
          }
        ]
      })

      editor.command.executeSetControlProperties({
        conceptId: 'resizableControl',
        properties: {
          minWidth: 180
        }
      })

      const control = editor.command.getControlValue({
        conceptId: 'resizableControl'
      })[0]
      expect(control).to.include({
        value: 'content',
        minWidth: 180
      })
      expect(editor.command.getValue().data.main[0].control?.minWidth).to.eq(
        180
      )
    })
  })

  it('issues #298 and #299 apply the current text size when inserting a control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeSize(28)

      editor.command.executeInsertControl({
        type: ElementType.CONTROL,
        value: '',
        control: {
          conceptId: 'sizedControl',
          type: ControlType.TEXT,
          value: [{ value: 'sized value' }],
          placeholder: 'sized'
        }
      })

      const control = editor.command.getControlValue({
        conceptId: 'sizedControl'
      })[0]
      expect(control).to.include({
        value: 'sized value',
        size: 28
      })
      expect(editor.command.getValue().data.main[0].control?.size).to.eq(28)
      expect(control.elementList?.every(element => element.size === 28)).to.eq(
        true
      )
    })
  })

  it('issue #1092 inserts text between adjacent disabled controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'disabled-left',
              type: ControlType.TEXT,
              value: null,
              placeholder: '控件1',
              prefix: '{',
              postfix: '}',
              disabled: true
            }
          },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'disabled-right',
              type: ControlType.TEXT,
              value: null,
              placeholder: '控件2',
              prefix: '{',
              postfix: '}',
              disabled: true
            }
          }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getElementList()
      const leftPostfixIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'disabled-left' &&
          element.controlComponent === 'postfix'
      )
      expect(leftPostfixIndex).to.be.greaterThan(-1)

      editor.command.executeSetRange(leftPostfixIndex, leftPostfixIndex)
      editor.command.executeInsertElementList([{ value: '中间文本' }])

      const text = editor.command.getText().main
      expect(text).to.contain('中间文本')

      const value = editor.command.getValue().data.main
      const insertedIndex = value.findIndex(
        element => element.value === '中间文本'
      )
      expect(insertedIndex).to.be.greaterThan(-1)
      expect(value[insertedIndex - 1].control?.conceptId).to.eq('disabled-left')
      expect(value[insertedIndex + 1].control?.conceptId).to.eq(
        'disabled-right'
      )
      expect(value[insertedIndex - 1].control?.disabled).to.eq(true)
      expect(value[insertedIndex + 1].control?.disabled).to.eq(true)
      expect(value[insertedIndex]).to.not.have.property('control')
    })
  })

  it('issue #503 sets multiple controls in document order without stale control indexes', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'partyName',
              type: ControlType.TEXT,
              value: null,
              placeholder: '当事人姓名',
              prefix: '<',
              postfix: '>'
            }
          },
          { value: ' ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'phoneNumber',
              type: ControlType.TEXT,
              value: null,
              placeholder: '联系电话',
              prefix: '<',
              postfix: '>'
            }
          }
        ]
      })

      editor.command.getControlList().forEach(control => {
        if (control.control?.placeholder === '当事人姓名') {
          editor.command.executeSetControlValue({
            conceptId: control.control.conceptId,
            value: '张三'
          })
        }
        if (control.control?.placeholder === '联系电话') {
          editor.command.executeSetControlValue({
            conceptId: control.control.conceptId,
            value: '10086'
          })
        }
      })

      expect(
        editor.command.getControlValue({ conceptId: 'partyName' })[0]
      ).to.include({
        value: '张三',
        innerText: '张三'
      })
      expect(
        editor.command.getControlValue({ conceptId: 'phoneNumber' })[0]
      ).to.include({
        value: '10086',
        innerText: '10086'
      })
      expect(editor.command.getText().main).to.contain('张三')
      expect(editor.command.getText().main).to.contain('10086')
    })
  })
})