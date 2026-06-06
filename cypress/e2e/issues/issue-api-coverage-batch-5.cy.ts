import type Editor from '../../../src/editor'
import { LocationPosition } from '../../../src/editor/dataset/enum/Common'
import {
  ControlComponent,
  ControlState,
  ControlType
} from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

const getControlText = (control: any) =>
  (control?.value || []).map((element: any) => element.value).join('')

const getValueElements = (editor: Editor, conceptId: string) =>
  ((editor as any).draw.getObjectResolver().getOriginalMainElementList() as any[]).filter(
    element =>
      element.control?.conceptId === conceptId &&
      element.controlComponent === ControlComponent.VALUE &&
      element.value.trim()
  )

describe('issue API coverage batch 5', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issues #749 and #775 locate controls at configurable cursor positions', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'location-control',
            control: {
              conceptId: 'locationControl',
              type: ControlType.TEXT,
              value: [{ value: 'target' }],
              placeholder: 'location'
            }
          },
          { value: 'Z' }
        ]
      })

      editor.command.executeLocationControl('location-control', {
        position: LocationPosition.BEFORE
      })
      const beforeRange = editor.command.getRange()
      const beforeCursor = editor.command.getCursorPosition()
      const beforeContext = editor.command.getRangeContext()

      editor.command.executeLocationControl('location-control', {
        position: LocationPosition.AFTER
      })
      const afterRange = editor.command.getRange()
      const afterCursor = editor.command.getCursorPosition()
      const afterContext = editor.command.getRangeContext()

      expect(beforeCursor).to.not.eq(null)
      expect(afterCursor).to.not.eq(null)
      expect(beforeRange.startIndex).to.be.lessThan(afterRange.startIndex)
      expect(beforeContext?.isCollapsed).to.eq(true)
      expect(afterContext?.isCollapsed).to.eq(true)
      expect(afterContext?.endElement.controlId).to.eq('location-control')
      expect(afterContext?.endElement.control?.conceptId).to.eq(
        'locationControl'
      )
    })
  })

  it('issue #791 applies control properties to the whole text value', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'styleWholeControl',
              type: ControlType.TEXT,
              value: 'abcd'.split('').map(value => ({ value })),
              placeholder: 'style'
            }
          }
        ]
      })

      editor.command.executeSetControlProperties({
        conceptId: 'styleWholeControl',
        properties: {
          bold: true,
          color: '#ff0000',
          highlight: '#00ff00'
        }
      })

      const control = editor.command.getControlValue({
        conceptId: 'styleWholeControl'
      })[0]
      const expandedValueElements = getValueElements(editor, 'styleWholeControl')

      expect(control).to.include({
        bold: true,
        color: '#ff0000',
        highlight: '#00ff00',
        value: 'abcd',
        innerText: 'abcd'
      })
      expect(control.elementList?.map(element => element.value).join('')).to.eq(
        'abcd'
      )
      expect(
        expandedValueElements.every(
          element =>
            element.bold === true &&
            element.color === '#ff0000' &&
            element.highlight === '#00ff00'
        )
      ).to.eq(true)
    })
  })

  it('issue #822 emits complete controlChange payloads while switching controls', () => {
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
            controlId: 'first-change-control',
            control: {
              conceptId: 'firstChangeControl',
              type: ControlType.TEXT,
              value: [{ value: 'first' }],
              placeholder: 'first'
            }
          },
          { value: ' ' },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'second-change-control',
            control: {
              conceptId: 'secondChangeControl',
              type: ControlType.TEXT,
              value: [{ value: 'second' }],
              placeholder: 'second'
            }
          }
        ]
      })

      const control = (editor as any).draw.getControl()
      editor.command.executeLocationControl('first-change-control', {
        position: LocationPosition.BEFORE
      })
      control.initControl()
      editor.command.executeLocationControl('second-change-control', {
        position: LocationPosition.BEFORE
      })
      control.initControl()

      expect(payloads).to.have.length(3)
      expect(payloads.every(Boolean)).to.eq(true)
      expect(payloads.map(payload => payload.state)).to.deep.eq([
        ControlState.ACTIVE,
        ControlState.INACTIVE,
        ControlState.ACTIVE
      ])
      expect(payloads.map(payload => payload.controlId)).to.deep.eq([
        'first-change-control',
        'first-change-control',
        'second-change-control'
      ])
      expect(payloads[2].control).to.include({
        conceptId: 'secondChangeControl',
        type: ControlType.TEXT
      })
    })
  })

  it('issues #856 and #873 update a target control and expose the latest value on controlChange', () => {
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
            controlId: 'same-concept-left',
            control: {
              conceptId: 'sameConcept',
              type: ControlType.TEXT,
              value: [{ value: 'left' }],
              placeholder: 'same'
            }
          },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'same-concept-right',
            control: {
              conceptId: 'sameConcept',
              type: ControlType.TEXT,
              value: [{ value: 'right' }],
              placeholder: 'same'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        id: 'same-concept-left',
        value: 'latest'
      })

      expect(
        editor
          .command
          .getControlValue({ conceptId: 'sameConcept' })
          .map(control => control.value)
      ).to.deep.eq(['latest', 'right'])

      editor.command.executeLocationControl('same-concept-left', {
        position: LocationPosition.BEFORE
      })
      ;(editor as any).draw.getControl().initControl()

      expect(payloads).to.have.length(1)
      expect(payloads[0]).to.include({
        state: ControlState.ACTIVE,
        controlId: 'same-concept-left'
      })
      expect(payloads[0].control).to.include({
        conceptId: 'sameConcept',
        type: ControlType.TEXT
      })
      expect(getControlText(payloads[0].control)).to.eq('latest')
    })
  })
})
