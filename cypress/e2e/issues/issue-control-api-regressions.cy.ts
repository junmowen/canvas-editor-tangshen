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

  it('issue #964 fills and reads one or many text controls in form mode', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'zs',
              type: ControlType.TEXT,
              value: null,
              placeholder: '主诉'
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'xbs',
              type: ControlType.TEXT,
              value: null,
              placeholder: '现病史'
            }
          }
        ]
      })
      editor.command.executeMode(EditorMode.FORM)

      editor.command.executeSetControlValueList([
        { conceptId: 'zs', value: '咳嗽三天' },
        { conceptId: 'xbs', value: '高血压' }
      ])

      expect(editor.command.getControlValue({ conceptId: 'zs' })[0]).to.include(
        {
          value: '咳嗽三天',
          innerText: '咳嗽三天'
        }
      )
      expect(
        editor.command
          .getControlList()
          .map(element => [
            element.control?.conceptId,
            element.control?.value?.map(value => value.value).join('')
          ])
      ).to.deep.eq([
        ['zs', '咳嗽三天'],
        ['xbs', '高血压']
      ])
    })
  })

  it('issue #1007 preserves styled element arrays when setting text control values', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'content',
              type: ControlType.TEXT,
              value: null,
              placeholder: 'content'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'content',
        value: [
          {
            value: '富文本',
            color: '#ff0000',
            bold: true
          },
          {
            value: '结构',
            highlight: '#00ff00',
            italic: true
          }
        ]
      })

      const control = editor.command.getControlValue({
        conceptId: 'content'
      })[0]

      expect(control).to.include({
        value: '富文本结构',
        innerText: '富文本结构'
      })
      expect(control.elementList).to.have.length(2)
      expect(control.elementList?.[0]).to.include({
        value: '富文本',
        color: '#ff0000',
        bold: true
      })
      expect(control.elementList?.[1]).to.include({
        value: '结构',
        highlight: '#00ff00',
        italic: true
      })
      expect(control.elementList?.map(element => element.value)).to.deep.eq([
        '富文本',
        '结构'
      ])
    })
  })

  it('issue #1293 selects only the control value on triple click', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'tripleClickControl',
              type: ControlType.TEXT,
              value: [{ value: '三击全选内容' }],
              placeholder: 'triple click',
              prefix: '{',
              postfix: '}'
            }
          },
          { value: ' after' }
        ]
      })

      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const controlValueIndexes = elementList.reduce(
        (indexes: number[], element: any, index: number) => {
          if (
            element.control?.conceptId === 'tripleClickControl' &&
            element.controlComponent === ControlComponent.VALUE
          ) {
            indexes.push(index)
          }
          return indexes
        },
        []
      )
      expect(controlValueIndexes).to.have.length.greaterThan(0)

      const midIndex =
        controlValueIndexes[Math.floor(controlValueIndexes.length / 2)]
      const position = positionList[midIndex]
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        position.pageNo
      ]
      const pageRect = pageWrapper.getBoundingClientRect()
      const leftTop = position.coordinate.leftTop
      const rightTop = position.coordinate.rightTop
      const clientX = pageRect.left + (leftTop[0] + rightTop[0]) / 2
      const clientY = pageRect.top + leftTop[1] + position.lineHeight / 2
      const canvas = cy.get('@canvas')

      canvas.then($canvas => {
        const target = $canvas[0] as HTMLCanvasElement
        const win = target.ownerDocument.defaultView!
        const dispatch = (type: 'mousedown' | 'mouseup' | 'click') => {
          target.dispatchEvent(
            new win.MouseEvent(type, {
              bubbles: true,
              clientX,
              clientY,
              button: 0,
              buttons: 1,
              detail: 1
            })
          )
        }

        dispatch('mousedown')
        dispatch('mouseup')
        dispatch('click')
        dispatch('mousedown')
        dispatch('mouseup')
        dispatch('click')
        dispatch('mousedown')
        dispatch('mouseup')
        dispatch('click')

        draw.flushScheduledFrameRender()

        const context = editor.command.getRangeContext()
        expect(draw.getRange().getSelectionElementList()).to.not.eq(null)
        expect(editor.command.getRangeText()).to.eq('三击全选内容')
        expect(context?.startElement.controlId).to.eq(
          context?.endElement.controlId
        )
        expect(context?.startElement.controlId).to.be.a('string')
        expect(context?.startElement.controlComponent).to.eq(
          ControlComponent.VALUE
        )
        expect(context?.endElement.controlComponent).to.eq(
          ControlComponent.VALUE
        )
        expect(context?.selectionText).to.eq('三击全选内容')
      })
    })
  })

  it('issue #1352 keeps the caret out of disabled controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'disabledControl',
              type: ControlType.TEXT,
              value: [{ value: '不可编辑' }],
              placeholder: 'disabled',
              prefix: '{',
              postfix: '}',
              disabled: true
            }
          },
          { value: ' after' }
        ]
      })

      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const controlId = elementList.find(
        (element: any) => element.control?.conceptId === 'disabledControl'
      )?.controlId
      expect(controlId).to.be.a('string')

      const controlIndexes = elementList
        .map((element: any, index: number) =>
          element.controlId === controlId ? index : -1
        )
        .filter((index: number) => index >= 0)
      const controlValueIndex = controlIndexes.find((index: number) => {
        return elementList[index].controlComponent === ControlComponent.VALUE
      }) as number
      const controlPosition = positionList[controlValueIndex]
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        controlPosition.pageNo
      ]
      const pageRect = pageWrapper.getBoundingClientRect()
      const clientX =
        pageRect.left +
        (controlPosition.coordinate.leftTop[0] +
          controlPosition.coordinate.rightTop[0]) /
          2
      const clientY =
        pageRect.top +
        controlPosition.coordinate.leftTop[1] +
        controlPosition.lineHeight / 2
      const canvas = cy.get('@canvas')

      canvas.then($canvas => {
        const target = $canvas[0] as HTMLCanvasElement
        const win = target.ownerDocument.defaultView!
        const dispatch = (type: 'mousedown' | 'mouseup' | 'click') => {
          target.dispatchEvent(
            new win.MouseEvent(type, {
              bubbles: true,
              clientX,
              clientY,
              button: 0,
              buttons: 1,
              detail: 1
            })
          )
        }

        dispatch('mousedown')
        dispatch('mouseup')
        dispatch('click')
      })

      cy.getEditor().then((nextEditor: Editor) => {
        const nextDraw = (nextEditor as any).draw
        const cursor = nextEditor.command.getCursorPosition()
        const nextElementList = nextDraw.getOriginalMainElementList()
        const nextControlId = nextElementList.find(
          (element: any) => element.control?.conceptId === 'disabledControl'
        )?.controlId
        const nextControlIndexes = nextElementList
          .map((element: any, index: number) =>
            element.controlId === nextControlId ? index : -1
          )
          .filter((index: number) => index >= 0)
        const controlStartIndex = nextControlIndexes[0]
        const controlEndIndex =
          nextControlIndexes[nextControlIndexes.length - 1]

        expect(cursor?.index).to.satisfy((index: number) => {
          return index < controlStartIndex || index > controlEndIndex
        })
        expect(nextDraw.getControl().getIsRangeWithinControl()).to.eq(false)
        expect(nextDraw.getControl().getActiveControl()).to.eq(null)
      })
    })
  })

  it('issue #916 updates highlight on an already highlighted control without losing its value', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'highlightControl',
              type: ControlType.TEXT,
              value: [{ value: 'highlighted value', highlight: '#ffff00' }],
              placeholder: 'highlight'
            }
          }
        ]
      })

      editor.command.executeSetControlProperties({
        conceptId: 'highlightControl',
        properties: {
          highlight: '#00ff00'
        }
      })

      const control = editor.command.getControlValue({
        conceptId: 'highlightControl'
      })[0]
      expect(control).to.include({
        value: 'highlighted value',
        innerText: 'highlighted value',
        highlight: '#00ff00'
      })
      expect(control.elementList?.map(element => element.value).join('')).to.eq(
        'highlighted value'
      )
      expect(
        control.elementList?.some(element => element.highlight === '#00ff00')
      ).to.eq(true)
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

  it('issue #925 supports number controls through value, read, and export APIs', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'score: ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'numericScore',
              type: ControlType.NUMBER,
              value: null,
              placeholder: 'number'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'numericScore',
        value: '100'
      })

      const value = editor.command.getControlValue({
        conceptId: 'numericScore'
      })[0]
      expect(value).to.include({
        type: ControlType.NUMBER,
        value: '100',
        innerText: '100'
      })
      expect(editor.command.getValue().data.main[1].control?.type).to.eq(
        ControlType.NUMBER
      )
      expect(editor.command.getHTML().main).to.contain('100')
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

  it('issue #902 renders control preText and postText around the editable value', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'affixedControl',
              type: ControlType.TEXT,
              value: [{ value: 'value' }],
              placeholder: 'placeholder',
              prefix: '{',
              postfix: '}',
              preText: '前文本：',
              postText: ' 后文本'
            }
          }
        ]
      })

      const control = editor.command.getControlValue({
        conceptId: 'affixedControl'
      })[0]
      expect(control).to.include({
        value: 'value',
        innerText: 'value',
        preText: '前文本：',
        postText: ' 后文本'
      })
      const rawText = (editor as any).draw
        .getOriginalMainElementList()
        .map((element: any) => element.value)
        .join('')
        .replace(/\u200B/g, '')
      expect(rawText).to.eq('{前文本：value 后文本}')
      expect(editor.command.getHTML().main).to.contain('前文本：value 后文本')
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
        .find(
          (element: any) => element.control?.conceptId === 'globalEmptyAffix'
        )
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

  it('issue #1413 protects non-deletable controls from range deletion', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'protectedControl',
              type: ControlType.TEXT,
              value: [{ value: 'protected value' }],
              placeholder: 'protected',
              deletable: false
            }
          },
          { value: ' after' }
        ]
      })

      const elementList = (editor as any).draw.getOriginalMainElementList()
      const controlIndexes = elementList.reduce(
        (indexes: number[], element: any, index: number) => {
          if (element.control?.conceptId === 'protectedControl') {
            indexes.push(index)
          }
          return indexes
        },
        []
      )
      expect(controlIndexes.length).to.be.greaterThan(0)

      editor.command.executeSetRange(
        controlIndexes[0],
        controlIndexes[controlIndexes.length - 1]
      )
      editor.command.executeBackspace()

      const control = editor.command.getControlValue({
        conceptId: 'protectedControl'
      })[0]
      expect(control).to.include({
        value: 'protected value',
        deletable: false
      })
      expect(editor.command.getText().main).to.contain('protected value')
    })
  })

  it('issue #633 prevents deleting a disabled control with forward Delete', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'deleteProtectedDisabled',
              type: ControlType.TEXT,
              value: [{ value: 'locked' }],
              placeholder: 'locked',
              disabled: true
            }
          },
          { value: 'after' }
        ]
      })

      const elementList = (editor as any).draw.getOriginalMainElementList()
      const firstControlIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'deleteProtectedDisabled'
      )
      expect(firstControlIndex).to.be.greaterThan(0)

      editor.command.executeSetRange(
        firstControlIndex - 1,
        firstControlIndex - 1
      )
      cy.get('.ce-inputarea').type('{del}', { force: true })

      cy.getEditor().then((nextEditor: Editor) => {
        const control = nextEditor.command.getControlValue({
          conceptId: 'deleteProtectedDisabled'
        })[0]
        expect(control).to.include({
          value: 'locked',
          disabled: true
        })
        expect(
          (nextEditor as any).draw
            .getOriginalMainElementList()
            .some(
              (element: any) =>
                element.control?.conceptId === 'deleteProtectedDisabled'
            )
        ).to.eq(true)
      })
    })
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
        .getOriginalMainElementList()
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
        .getOriginalMainElementList()
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

      const elementList = (editor as any).draw.getElementList()
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

      const elementList = (editor as any).draw.getElementList()
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

      const elementList = (editor as any).draw.getOriginalMainElementList()
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
              .getOriginalMainElementList()
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

      const elementList = (editor as any).draw.getElementList()
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
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const checkboxIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'formCheckbox' &&
          element.controlComponent === ControlComponent.CHECKBOX &&
          element.checkbox?.code === 'agree'
      )
      expect(checkboxIndex).to.be.greaterThan(-1)

      const position = positionList[checkboxIndex]
      const layoutElement = draw.getElementList()[checkboxIndex]
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
        .getElementList()
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

      const elementList = (editor as any).draw.getOriginalMainElementList()
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
            .getOriginalMainElementList()
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
      const elementList = (editor as any).draw.getOriginalMainElementList()
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
            .getOriginalMainElementList()
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

      const elementList = (editor as any).draw.getOriginalMainElementList()
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
        .getElementList()
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

  it('issue #853 honors pasteDisabled on active text controls', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'noPasteControl',
              type: ControlType.TEXT,
              value: [{ value: '原值' }],
              placeholder: 'no paste',
              pasteDisabled: true
            }
          }
        ]
      })

      const draw = (editor as any).draw
      const controlElement = draw
        .getElementList()
        .find(
          (element: any) =>
            element.control?.conceptId === 'noPasteControl' &&
            element.controlComponent === ControlComponent.VALUE
        )
      editor.command.executeLocationControl(controlElement.controlId, {
        position: LocationPosition.AFTER
      })
      draw.getControl().initControl()

      expect(draw.getControl().getIsDisabledPasteControl()).to.eq(true)
      expect(
        editor.command.getControlValue({ conceptId: 'noPasteControl' })[0]
      ).to.include({
        value: '原值',
        pasteDisabled: true
      })
    })
  })

  it('issue #1004 returns updated control values from getPositionContextByEvent', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'positionValueControl',
              type: ControlType.TEXT,
              value: [{ value: '旧值' }],
              placeholder: 'position'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'positionValueControl',
        value: '新值'
      })

      const draw = (editor as any).draw
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const valueIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'positionValueControl' &&
          element.controlComponent === ControlComponent.VALUE
      )
      expect(valueIndex).to.be.greaterThan(-1)

      const position = positionList[valueIndex]
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        position.pageNo
      ]
      const pageRect = pageWrapper.getBoundingClientRect()
      const leftTop = position.coordinate.leftTop
      const rightTop = position.coordinate.rightTop
      const event = new MouseEvent('click', {
        clientX: pageRect.left + (leftTop[0] + rightTop[0]) / 2,
        clientY: pageRect.top + leftTop[1] + position.lineHeight / 2,
        bubbles: true
      })

      const context = editor.command.getPositionContextByEvent(event)

      expect(context?.element?.control?.conceptId).to.eq('positionValueControl')
      expect(
        context?.element?.control?.value?.map(value => value.value).join('')
      ).to.eq('新值')
      expect(
        editor.command.getControlValue({ conceptId: 'positionValueControl' })[0]
      ).to.include({
        value: '新值',
        innerText: '新值'
      })
    })
  })

  it('issue #1100 inserts elements before and after a specified control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'anchorControl',
              type: ControlType.TEXT,
              value: [{ value: '控件' }],
              placeholder: 'anchor'
            }
          },
          { value: 'Z' }
        ]
      })

      const findValueElement = () =>
        (editor as any).draw
          .getElementList()
          .find(
            (element: any) =>
              element.control?.conceptId === 'anchorControl' &&
              element.controlComponent === ControlComponent.VALUE
          )

      editor.command.executeLocationControl(findValueElement().controlId, {
        position: LocationPosition.OUTER_BEFORE
      })
      editor.command.executeInsertElementList([{ value: 'B' }])
      editor.command.executeLocationControl(findValueElement().controlId, {
        position: LocationPosition.OUTER_AFTER
      })
      editor.command.executeInsertElementList([{ value: 'Y' }])

      expect(editor.command.getText().main).to.eq('AB控件YZ')
    })
  })

  it('issue #1125 emits inactive controlChange when the cursor moves after the control', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: any[] = []
      editor.eventBus.on('controlChange', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'controlChangePosition',
              type: ControlType.TEXT,
              value: [{ value: '控件值' }],
              placeholder: 'position'
            }
          }
        ]
      })

      const draw = (editor as any).draw
      const controlElement = draw
        .getElementList()
        .find(
          (element: any) =>
            element.control?.conceptId === 'controlChangePosition' &&
            element.controlComponent === ControlComponent.VALUE
        )

      editor.command.executeLocationControl(controlElement.controlId)
      draw.getControl().initControl()
      editor.command.executeLocationControl(controlElement.controlId, {
        position: LocationPosition.OUTER_AFTER
      })
      draw.getControl().initControl()

      expect(payloads[0].state).to.eq(ControlState.ACTIVE)
      expect(payloads[payloads.length - 1].state).to.eq(ControlState.INACTIVE)
      expect(payloads[payloads.length - 1]).to.include({
        controlId: controlElement.controlId
      })
      expect(payloads[payloads.length - 1].control).to.include({
        conceptId: 'controlChangePosition',
        type: ControlType.TEXT
      })
    })
  })

  it('issue #920 emits inactive controlChange with a defined control payload after value changes', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: any[] = []
      editor.eventBus.on('controlChange', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'inactive-payload-control',
            control: {
              conceptId: 'inactivePayloadControl',
              type: ControlType.TEXT,
              value: [{ value: '原始值' }],
              placeholder: 'inactive'
            }
          }
        ]
      })

      const draw = (editor as any).draw
      editor.command.executeLocationControl('inactive-payload-control', {
        position: LocationPosition.AFTER
      })
      draw.getControl().initControl()
      editor.command.executeSetControlValue({
        conceptId: 'inactivePayloadControl',
        value: '更新值'
      })
      editor.command.executeLocationControl('inactive-payload-control', {
        position: LocationPosition.OUTER_AFTER
      })
      draw.getControl().initControl()

      const inactivePayload = payloads.find(
        payload => payload.state === ControlState.INACTIVE
      )
      expect(inactivePayload).to.not.eq(undefined)
      expect(inactivePayload).to.include({
        controlId: 'inactive-payload-control'
      })
      expect(inactivePayload.control).to.include({
        conceptId: 'inactivePayloadControl',
        type: ControlType.TEXT
      })
    })
  })

  it('issue #997 selects a horizontal checkbox control on the first click', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'horizontalCheckbox',
              type: ControlType.CHECKBOX,
              code: null,
              value: null,
              flexDirection: FlexDirection.ROW,
              valueSets: [
                { value: '左侧', code: 'left' },
                { value: '右侧', code: 'right' }
              ]
            }
          }
        ]
      })
      editor.command.executeMode(EditorMode.FORM)

      const draw = (editor as any).draw
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const checkboxIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'horizontalCheckbox' &&
          element.controlComponent === ControlComponent.CHECKBOX &&
          element.checkbox?.code === 'left'
      )
      expect(checkboxIndex).to.be.greaterThan(-1)

      const position = positionList[checkboxIndex]
      const layoutElement = draw.getElementList()[checkboxIndex]
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
    })

    cy.getEditor().then((editor: Editor) => {
      expect(
        editor.command.getControlValue({ conceptId: 'horizontalCheckbox' })[0]
      ).to.include({
        value: 'left',
        innerText: '左侧'
      })
    })
  })

  it('issue #1023 preserves nested table rules after setting control properties', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'nestedTableControl',
              type: ControlType.TEXT,
              value: [
                {
                  id: 'control-nested-table',
                  type: ElementType.TABLE,
                  value: '',
                  tableToolDisabled: true,
                  colgroup: [{ width: 120 }],
                  trList: [
                    {
                      height: 40,
                      tdList: [
                        {
                          colspan: 1,
                          rowspan: 1,
                          disabled: true,
                          deletable: false,
                          value: [{ value: 'cell value' }]
                        }
                      ]
                    }
                  ]
                }
              ],
              placeholder: 'nested table'
            }
          }
        ]
      })

      editor.command.executeSetControlProperties({
        conceptId: 'nestedTableControl',
        properties: {
          disabled: true,
          deletable: false
        }
      })

      const value = editor.command.getValue().data.main[0] as any
      const table = value.control.value.find(
        (element: any) => element.type === ElementType.TABLE
      )
      expect(
        editor.command.getControlValue({ conceptId: 'nestedTableControl' })[0]
      ).to.include({
        disabled: true,
        deletable: false
      })
      expect(table).to.include({
        type: ElementType.TABLE,
        tableToolDisabled: true
      })
      expect(table.trList?.[0].tdList[0]).to.include({
        disabled: true,
        deletable: false
      })
    })
  })

  it('issue #691 restores empty control placeholders with the configured control size', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'sizedPlaceholderControl',
              type: ControlType.TEXT,
              value: [{ value: '初始值' }],
              placeholder: '请输入',
              size: 24
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'sizedPlaceholderControl',
        value: '输入值'
      })
      editor.command.executeSetControlValue({
        conceptId: 'sizedPlaceholderControl',
        value: null
      })

      const draw = (editor as any).draw
      const placeholder = draw
        .getOriginalMainElementList()
        .find(
          (element: any) =>
            element.control?.conceptId === 'sizedPlaceholderControl' &&
            element.controlComponent === ControlComponent.PLACEHOLDER
        )

      expect(
        editor.command.getControlValue({
          conceptId: 'sizedPlaceholderControl'
        })[0]
      ).to.include({
        value: null,
        innerText: null
      })
      expect(placeholder).to.not.eq(undefined)
      expect(draw.getElementFont(placeholder)).to.contain('24px')
    })
  })

  it('issue #1101 keeps committed IME text inside an active text control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'ime-text-control',
            control: {
              conceptId: 'imeTextControl',
              type: ControlType.TEXT,
              value: [{ value: 'A' }, { value: 'B' }],
              placeholder: 'ime'
            }
          }
        ]
      })

      editor.command.executeLocationControl('ime-text-control', {
        position: LocationPosition.AFTER
      })
      ;(editor as any).draw.getControl().initControl()
    })

    cy.get('.ce-inputarea').then($input => {
      const input = $input[0] as HTMLTextAreaElement
      input.dispatchEvent(
        new CompositionEvent('compositionstart', {
          bubbles: true
        })
      )
      ;['d', 'de', '的'].forEach(data => {
        input.value = data
        input.dispatchEvent(
          new InputEvent('input', {
            data,
            inputType: 'insertCompositionText',
            bubbles: true
          })
        )
      })
      input.dispatchEvent(
        new CompositionEvent('compositionend', {
          data: '的',
          bubbles: true
        })
      )
      input.value = '的'
      input.dispatchEvent(
        new InputEvent('input', {
          data: '的',
          inputType: 'insertCompositionText',
          bubbles: true
        })
      )
    })

    cy.getEditor().then((editor: Editor) => {
      const control = editor.command.getControlValue({
        conceptId: 'imeTextControl'
      })[0]
      expect(control).to.include({
        value: 'AB的',
        innerText: 'AB的'
      })
      expect(control.elementList?.map(element => element.value).join('')).to.eq(
        'AB的'
      )
    })
  })

  it('issue #996 deletes one adjacent text control without throwing when control content is observed', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: any[] = []
      editor.eventBus.on('controlContentChange', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'adjacent-control-left',
            control: {
              conceptId: 'adjacentLeft',
              type: ControlType.TEXT,
              value: [{ value: '左' }],
              placeholder: 'left',
              prefix: '\u200C',
              postfix: '\u200C'
            }
          },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'adjacent-control-right',
            control: {
              conceptId: 'adjacentRight',
              type: ControlType.TEXT,
              value: [{ value: '右' }],
              placeholder: 'right',
              prefix: '\u200C',
              postfix: '\u200C'
            }
          }
        ]
      })
      editor.command.executeLocationControl('adjacent-control-left', {
        position: LocationPosition.OUTER_AFTER
      })
      cy.wrap({ payloads }).as('adjacentControlObserver')
    })

    cy.get('.ce-inputarea').type('{backspace}', { force: true })

    cy.get('@adjacentControlObserver').then(() => {
      cy.getEditor().then((editor: Editor) => {
        const controlIds = [
          ...new Set(
            editor.command.getControlList().map(element => element.controlId)
          )
        ]
        expect(controlIds).to.not.include('adjacent-control-left')
        expect(controlIds).to.include('adjacent-control-right')
        expect(editor.command.getText().main).to.eq('右')
      })
    })
  })
})
