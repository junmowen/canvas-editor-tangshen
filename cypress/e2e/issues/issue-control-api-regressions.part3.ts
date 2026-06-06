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
  it('issue #278 reads text control values through getControlValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'readableText',
              type: ControlType.TEXT,
              value: [{ value: '可读取文本' }],
              placeholder: '请输入'
            }
          }
        ]
      })

      const control = editor.command.getControlValue({
        conceptId: 'readableText'
      })[0]

      expect(control).to.include({
        value: '可读取文本',
        innerText: '可读取文本',
        type: ControlType.TEXT
      })
      expect(control.elementList?.map(element => element.value).join('')).to.eq(
        '可读取文本'
      )
    })
  })

  it('issue #686 clears multiple table text controls without losing placeholders', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            width: 260,
            colgroup: [{ width: 130 }, { width: 130 }],
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
                          conceptId: 'tableClearLeft',
                          type: ControlType.TEXT,
                          value: [{ value: 'left value' }],
                          placeholder: 'left placeholder'
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
                          conceptId: 'tableClearRight',
                          type: ControlType.TEXT,
                          value: [{ value: 'right value' }],
                          placeholder: 'right placeholder'
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

      editor.command.getControlList().forEach(control => {
        editor.command.executeSetControlValue({
          conceptId: control.control!.conceptId,
          value: ''
        })
      })

      const left = editor.command.getControlValue({
        conceptId: 'tableClearLeft'
      })[0]
      const right = editor.command.getControlValue({
        conceptId: 'tableClearRight'
      })[0]
      expect(left).to.include({
        value: null,
        innerText: null,
        placeholder: 'left placeholder'
      })
      expect(right).to.include({
        value: null,
        innerText: null,
        placeholder: 'right placeholder'
      })
      const tdList = editor.command.getValue().data.main[0].trList?.[0].tdList
      expect(tdList?.[0].value[0].control?.value).to.deep.eq([])
      expect(tdList?.[1].value[0].control?.value).to.deep.eq([])
    })
  })

  it('issue #835 replaces date controls inside table cells', () => {
    cy.getEditor().then((editor: Editor) => {
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
                          conceptId: 'tableDate',
                          type: ControlType.DATE,
                          value: [{ value: '2024-01-01' }],
                          placeholder: 'date'
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

      editor.command.executeSetControlValue({
        conceptId: 'tableDate',
        value: '2026-05-20'
      })

      const control = editor.command.getControlValue({
        conceptId: 'tableDate'
      })[0]
      expect(control).to.include({
        value: '2026-05-20',
        innerText: '2026-05-20',
        type: ControlType.DATE
      })
      const tableControl =
        editor.command.getValue().data.main[0].trList?.[0].tdList[0].value[0]
          .control
      expect(tableControl?.value?.map(element => element.value).join('')).to.eq(
        '2026-05-20'
      )
    })
  })

  it('issue #1259 batch-sets controls scoped by area id when concept ids are reused', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'patientInfo',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [
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
              { value: ' ' },
              {
                type: ElementType.CONTROL,
                value: '',
                control: {
                  conceptId: 'sex',
                  type: ControlType.TEXT,
                  value: null,
                  placeholder: 'sex'
                }
              }
            ]
          },
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'nursingInfo',
            area: {
              backgroundColor: 'rgba(0,5,0,0.07)'
            },
            valueList: [
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
              { value: ' ' },
              {
                type: ElementType.CONTROL,
                value: '',
                control: {
                  conceptId: 'sex',
                  type: ControlType.TEXT,
                  value: null,
                  placeholder: 'sex'
                }
              }
            ]
          }
        ]
      })

      editor.command.executeSetControlValueList([
        {
          areaId: 'patientInfo',
          value: 'patient-value'
        },
        {
          areaId: 'nursingInfo',
          value: 'nursing-value'
        }
      ])

      expect(
        editor.command
          .getControlValue({ areaId: 'patientInfo' })
          .map(control => control.value)
      ).to.deep.eq(['patient-value', 'patient-value'])
      expect(
        editor.command
          .getControlValue({ areaId: 'nursingInfo' })
          .map(control => control.value)
      ).to.deep.eq(['nursing-value', 'nursing-value'])
      expect(
        editor.command
          .getControlValue({ conceptId: 'name' })
          .map(control => control.value)
      ).to.deep.eq(['patient-value', 'nursing-value'])
    })
  })

  it('issues #979 and #1083 hide controls dynamically without exporting their text', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'hideControl',
              type: ControlType.TEXT,
              value: [{ value: 'hidden control value' }],
              placeholder: 'hide me'
            }
          },
          { value: 'visible sibling' }
        ]
      })

      editor.command.executeSetControlProperties({
        conceptId: 'hideControl',
        properties: {
          hide: true
        }
      })

      const control = editor.command.getControlValue({
        conceptId: 'hideControl'
      })[0]
      expect(control).to.include({
        value: 'hidden control value',
        innerText: 'hidden control value',
        hide: true
      })
      const value = editor.command
        .getValue()
        .data.main.find(element => element.control?.conceptId === 'hideControl')
      expect(value?.control?.hide).to.eq(true)
      expect(editor.command.getHTML().main).not.to.contain(
        'hidden control value'
      )
      expect(editor.command.getHTML().main).to.contain('visible sibling')
    })
  })

  it('does not let dynamically hidden text controls push following text', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'hiddenLayoutText',
              type: ControlType.TEXT,
              value: [{ value: 'hidden text that used to keep its width' }],
              placeholder: 'hidden'
            }
          },
          { value: 'B' }
        ]
      })

      const getTextPosition = (value: string) => {
        const draw = (editor as any).draw
        const elementList = draw.getObjectResolver().getElementList()
        const index = elementList.findIndex(
          (element: any) => element.value === value && !element.controlId
        )
        expect(index, `${value} element index`).to.be.greaterThan(-1)
        return draw.getCoordinate().getOriginalPositionList()[index]
      }

      const prefixBefore = getTextPosition('A')
      const suffixBefore = getTextPosition('B')
      const prefixBeforeRight = prefixBefore.coordinate.rightTop[0]
      const suffixBeforeLeft = suffixBefore.coordinate.leftTop[0]
      expect(
        suffixBeforeLeft,
        'control has visible width before hide'
      ).to.be.greaterThan(prefixBeforeRight)

      editor.command.executeSetControlProperties({
        conceptId: 'hiddenLayoutText',
        properties: {
          hide: true
        }
      })

      const prefixAfter = getTextPosition('A')
      const suffixAfter = getTextPosition('B')
      const prefixAfterRight = prefixAfter.coordinate.rightTop[0]
      const suffixAfterLeft = suffixAfter.coordinate.leftTop[0]
      expect(
        suffixAfterLeft,
        'following text shifts left after hide'
      ).to.be.lessThan(suffixBeforeLeft)
      expect(
        suffixAfterLeft,
        'hidden control contributes no width'
      ).to.be.closeTo(prefixAfterRight, 0.5)
    })
  })

  it('issue #1036 lets Backspace pass hidden non-deletable controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: '111' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'hiddenLockedControl',
              type: ControlType.TEXT,
              value: [{ value: 'hidden' }],
              placeholder: 'hidden',
              hide: true,
              deletable: false
            }
          },
          { value: '222' }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      editor.command.executeSetRange(
        elementList.length - 1,
        elementList.length - 1
      )
    })

    cy.get('.ce-inputarea')
      .type('{backspace}{backspace}{backspace}{backspace}', { force: true })
      .then(() => {
        cy.getEditor().then((editor: Editor) => {
          const text = editor.command.getText().main.replace(/\u200B/g, '')
          expect(text).to.eq('11')
          expect(
            (editor as any).draw
              .getObjectResolver().getOriginalMainElementList()
              .some(
                (element: any) =>
                  element.control?.conceptId === 'hiddenLockedControl'
              )
          ).to.eq(false)
        })
      })
  })

  it('issue #1203 sets extension on controls inside table cells', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
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
                          conceptId: 'tableExtensionControl',
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
          }
        ]
      })

      editor.command.executeSetControlExtension({
        conceptId: 'tableExtensionControl',
        extension: {
          source: 'table-cell',
          code: 'extension'
        }
      })

      const control = editor.command.getControlValue({
        conceptId: 'tableExtensionControl'
      })[0]
      expect(control.extension).to.deep.eq({
        source: 'table-cell',
        code: 'extension'
      })
      const tableControl =
        editor.command.getValue().data.main[0].trList?.[0].tdList[0].value[0]
      expect(tableControl?.control?.extension).to.deep.eq({
        source: 'table-cell',
        code: 'extension'
      })
    })
  })

  it('issue #1075 exposes saved document content at getValue().data.main', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'first' },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'savedMainControl',
              type: ControlType.TEXT,
              value: [{ value: 'control value' }],
              placeholder: 'saved'
            }
          }
        ]
      })

      const value = editor.command.getValue()
      expect(value.data.main).to.be.an('array').and.not.be.empty
      expect(value.data.main.map(element => element.value).join('')).to.contain(
        'first'
      )
      expect(
        value.data.main.some(
          element => element.control?.conceptId === 'savedMainControl'
        )
      ).to.eq(true)
    })
  })

  it('issue #1026 handles numeric choice codes including zero', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'numericCheckbox',
              type: ControlType.CHECKBOX,
              code: 0,
              value: null,
              valueSets: [
                { value: '零', code: 0 },
                { value: '一', code: 1 }
              ]
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'numericRadio',
              type: ControlType.RADIO,
              code: 0,
              value: null,
              valueSets: [
                { value: '否', code: 0 },
                { value: '是', code: 1 }
              ]
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'numericSelect',
              type: ControlType.SELECT,
              code: 0,
              value: null,
              placeholder: '请选择',
              valueSets: [
                { value: '未通过', code: 0 },
                { value: '通过', code: 1 }
              ]
            }
          }
        ]
      })

      expect(
        editor.command.getControlValue({ conceptId: 'numericCheckbox' })[0]
      ).to.include({
        value: '0',
        innerText: '零'
      })
      expect(
        editor.command.getControlValue({ conceptId: 'numericRadio' })[0]
      ).to.include({
        value: '0',
        innerText: '否'
      })
      expect(
        editor.command.getControlValue({ conceptId: 'numericSelect' })[0]
      ).to.include({
        value: '0',
        innerText: '未通过'
      })

      const elementList = (editor as any).draw.getObjectResolver().getElementList()
      const checkboxOption = elementList.find(
        (element: any) =>
          element.control?.conceptId === 'numericCheckbox' &&
          element.controlComponent === ControlComponent.CHECKBOX &&
          String(element.checkbox?.code) === '0'
      )
      const radioOption = elementList.find(
        (element: any) =>
          element.control?.conceptId === 'numericRadio' &&
          element.controlComponent === ControlComponent.RADIO &&
          String(element.radio?.code) === '0'
      )
      expect(checkboxOption?.checkbox?.value).to.eq(true)
      expect(radioOption?.radio?.value).to.eq(true)
    })
  })

  it('issue #1347 selects a checkbox on the first click in form mode', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'formCheckbox',
              type: ControlType.CHECKBOX,
              code: null,
              value: null,
              valueSets: [
                { value: '同意', code: 'agree' },
                { value: '拒绝', code: 'reject' }
              ]
            }
          }
        ]
      })
      editor.command.executeMode(EditorMode.FORM)

      const draw = (editor as any).draw
      const elementList = draw.getObjectResolver().getOriginalMainElementList()
      const positionList = draw.getCoordinate().getOriginalPositionList()
      const checkboxIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'formCheckbox' &&
          element.controlComponent === ControlComponent.CHECKBOX &&
          element.checkbox?.code === 'agree'
      )
      expect(checkboxIndex).to.be.greaterThan(-1)

      const position = positionList[checkboxIndex]
      const layoutElement = draw.getObjectResolver().getElementList()[checkboxIndex]
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        position.pageNo
      ]
      const pageRect = pageWrapper.getBoundingClientRect()
      const leftTop = position.coordinate.leftTop
      const metrics = layoutElement.metrics
      const clientX = pageRect.left + leftTop[0] + metrics.width / 2
      const clientY = pageRect.top + leftTop[1] + position.lineHeight / 2

      cy.get('@canvas').trigger('mousedown', {
        button: 0,
        clientX,
        clientY,
        force: true
      })

      cy.getEditor().then((nextEditor: Editor) => {
        expect(
          nextEditor.command.getControlValue({ conceptId: 'formCheckbox' })[0]
        ).to.include({
          value: 'agree',
          innerText: '同意'
        })
      })
    })
  })

  it('issue #395 renders select placeholders when no option is selected', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'selectPlaceholder',
              type: ControlType.SELECT,
              code: null,
              value: null,
              placeholder: '请选择状态',
              valueSets: [
                { value: '启用', code: 'enabled' },
                { value: '停用', code: 'disabled' }
              ]
            }
          }
        ]
      })

      const placeholderElements = (editor as any).draw
        .getObjectResolver().getElementList()
        .filter(
          (element: any) =>
            element.control?.conceptId === 'selectPlaceholder' &&
            element.controlComponent === ControlComponent.PLACEHOLDER
        )
      expect(
        placeholderElements.map((element: any) => element.value).join('')
      ).to.eq('请选择状态')
    })
  })

  it('issue #1310 deletes one character at a time in input-able select controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'inputAbleSelect',
              type: ControlType.SELECT,
              code: null,
              value: null,
              placeholder: '请选择或输入',
              valueSets: [
                { value: '启用', code: 'enabled' },
                { value: '停用', code: 'disabled' }
              ],
              selectExclusiveOptions: {
                inputAble: true
              }
            }
          }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const placeholderIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'inputAbleSelect' &&
          element.controlComponent === ControlComponent.PLACEHOLDER
      )
      expect(placeholderIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(placeholderIndex, placeholderIndex)
    })

    cy.get('.ce-inputarea')
      .type('abc{backspace}', { force: true })
      .then(() => {
        cy.getEditor().then((editor: Editor) => {
          const valueText = (editor as any).draw
            .getObjectResolver().getOriginalMainElementList()
            .filter(
              (element: any) =>
                element.control?.conceptId === 'inputAbleSelect' &&
                element.controlComponent === ControlComponent.VALUE
            )
            .map((element: any) => element.value)
            .join('')
          expect(valueText).to.eq('ab')
        })
      })

    cy.getEditor().then((editor: Editor) => {
      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const firstValueIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'inputAbleSelect' &&
          element.controlComponent === ControlComponent.VALUE
      )
      expect(firstValueIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(firstValueIndex, firstValueIndex)
    })

    cy.get('.ce-inputarea')
      .type('{del}', { force: true })
      .then(() => {
        cy.getEditor().then((editor: Editor) => {
          const valueText = (editor as any).draw
            .getObjectResolver().getOriginalMainElementList()
            .filter(
              (element: any) =>
                element.control?.conceptId === 'inputAbleSelect' &&
                element.controlComponent === ControlComponent.VALUE
            )
            .map((element: any) => element.value)
            .join('')
          expect(valueText).to.eq('a')
        })
      })
  })

  it('issue #1340 preserves multi-select popup scroll after selecting lower options', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'scrollingMultiSelect',
              type: ControlType.SELECT,
              code: null,
              value: null,
              placeholder: '请选择',
              isMultiSelect: true,
              valueSets: Array.from({ length: 12 }, (_, index) => ({
                value: `选项${index + 1}`,
                code: `option-${index + 1}`
              }))
            }
          }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const placeholderIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'scrollingMultiSelect' &&
          element.controlComponent === ControlComponent.PLACEHOLDER
      )
      expect(placeholderIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(placeholderIndex, placeholderIndex)
      ;(editor as any).draw.getControl().initControl()
    })

    cy.get('.ce-select-control-popup')
      .should($popup => {
        expect($popup[0].scrollHeight).to.be.greaterThan($popup[0].clientHeight)
      })
      .then($popup => {
        const popup = $popup[0] as HTMLDivElement
        popup.scrollTop = popup.scrollHeight
        const beforeScrollTop = popup.scrollTop
        expect(beforeScrollTop).to.be.greaterThan(0)
        cy.wrap(beforeScrollTop).as('beforeScrollTop')
      })

    cy.get('.ce-select-control-popup li').last().click()

    cy.get<number>('@beforeScrollTop').then(beforeScrollTop => {
      cy.get('.ce-select-control-popup').should($popup => {
        expect($popup[0].scrollTop).to.eq(beforeScrollTop)
      })
    })
  })

  it('issue #883 preserves line breaks inside control placeholders', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'multilinePlaceholder',
              type: ControlType.TEXT,
              value: null,
              placeholder: '第一行\n第二行'
            }
          }
        ]
      })

      const placeholderElements = (editor as any).draw
        .getObjectResolver().getElementList()
        .filter(
          (element: any) =>
            element.control?.conceptId === 'multilinePlaceholder' &&
            element.controlComponent === ControlComponent.PLACEHOLDER
        )

      expect(
        placeholderElements.map((element: any) => element.value)
      ).to.deep.eq(['第', '一', '行', ZERO, '第', '二', '行'])
    })
  })

  it('issue #407 preserves line breaks inside text control values after save and reload', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'multilineControlValue',
              type: ControlType.TEXT,
              value: [
                { value: '第一行' },
                { value: '\n' },
                { value: '第二行' }
              ],
              placeholder: 'multiline'
            }
          }
        ]
      })

      const saved = editor.command.getValue()
      const savedControl = saved.data.main[0].control
      expect(savedControl?.value?.map(element => element.value).join('')).to.eq(
        '第一行\n第二行'
      )

      editor.command.executeSetValue(saved.data)

      const reloadedControl = editor.command.getValue().data.main[0].control
      expect(
        reloadedControl?.value?.map(element => element.value).join('')
      ).to.eq('第一行\n第二行')
    })
  })

  it('issue #843 preserves control text color through save and read APIs', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'coloredControl',
              type: ControlType.TEXT,
              value: [{ value: '红色控件' }],
              placeholder: 'colored',
              color: '#ff0000'
            }
          }
        ]
      })

      const control = editor.command.getControlValue({
        conceptId: 'coloredControl'
      })[0]
      const savedControl = editor.command.getValue().data.main[0].control

      expect(control).to.include({
        value: '红色控件',
        innerText: '红色控件',
        color: '#ff0000'
      })
      expect(control.elementList?.[0]).to.include({
        value: '红色控件',
        color: '#ff0000'
      })
      expect(savedControl).to.include({
        conceptId: 'coloredControl',
        color: '#ff0000'
      })

      editor.command.executeSetControlProperties({
        conceptId: 'coloredControl',
        properties: {
          color: '#00aa00'
        }
      })

      expect(
        editor.command.getControlValue({ conceptId: 'coloredControl' })[0]
      ).to.include({
        color: '#00aa00'
      })
      expect(editor.command.getValue().data.main[0].control).to.include({
        color: '#00aa00'
      })
    })
  })
})
