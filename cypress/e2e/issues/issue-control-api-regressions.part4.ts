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