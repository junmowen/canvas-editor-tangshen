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
      draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
      const elementList = draw.getObjectResolver().getOriginalMainElementList()
      const positionList = draw.getCoordinate().getOriginalPositionList()
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

        draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

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
      draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
      const elementList = draw.getObjectResolver().getOriginalMainElementList()
      const positionList = draw.getCoordinate().getOriginalPositionList()
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
        const nextElementList = nextDraw.getObjectResolver().getOriginalMainElementList()
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
        .getObjectResolver().getOriginalMainElementList()
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
        .getObjectResolver().getOriginalMainElementList()
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
        .getObjectResolver().getOriginalMainElementList()
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
        .getObjectResolver().getOriginalMainElementList()
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

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
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

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
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
            .getObjectResolver().getOriginalMainElementList()
            .some(
              (element: any) =>
                element.control?.conceptId === 'deleteProtectedDisabled'
            )
        ).to.eq(true)
      })
    })
  })
})
