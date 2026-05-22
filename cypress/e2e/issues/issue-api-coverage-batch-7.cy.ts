import type Editor from '../../../src/editor'
import {
  ControlComponent,
  ControlType
} from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function createMouseEventAtPosition(
  editor: Editor,
  position: any,
  type = 'click'
) {
  const container = editor.command.getContainer()
  const win = container.ownerDocument.defaultView!
  const draw = (editor as any).draw
  const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
    position.pageNo
  ]
  const pageRect = pageWrapper.getBoundingClientRect()
  const { leftTop, rightTop } = position.coordinate

  return new win.MouseEvent(type, {
    bubbles: true,
    clientX: pageRect.left + (leftTop[0] + rightTop[0]) / 2,
    clientY: pageRect.top + leftTop[1] + position.lineHeight / 2
  })
}

describe('issue API coverage batch 7', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issues #292 and #343 expose clicked control details through public context APIs', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'clicked-control-id',
            control: {
              conceptId: 'clickedControl',
              type: ControlType.TEXT,
              value: [{ value: 'control value' }],
              placeholder: 'click'
            }
          },
          { value: ' after' }
        ]
      })

      const draw = (editor as any).draw
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const valueIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'clickedControl' &&
          element.controlComponent === ControlComponent.VALUE
      )
      expect(valueIndex).to.be.greaterThan(-1)

      editor.command.executeSetRange(valueIndex, valueIndex)
      const rangeContext = editor.command.getRangeContext()
      const positionContext = editor.command.getPositionContextByEvent(
        createMouseEventAtPosition(editor, positionList[valueIndex])
      )

      expect(rangeContext?.isCollapsed).to.eq(true)
      expect(rangeContext?.startElement.controlId).to.eq('clicked-control-id')
      expect(rangeContext?.startElement.control).to.include({
        conceptId: 'clickedControl',
        type: ControlType.TEXT,
        placeholder: 'click'
      })
      expect(
        rangeContext?.startElement.control?.value
          ?.map(element => element.value)
          .join('')
      ).to.eq('control value')

      expect(positionContext?.element?.controlId).to.eq('clicked-control-id')
      expect(positionContext?.element?.control).to.include({
        conceptId: 'clickedControl',
        type: ControlType.TEXT,
        placeholder: 'click'
      })
      expect(
        positionContext?.element?.control?.value
          ?.map(element => element.value)
          .join('')
      ).to.eq('control value')
      expect(positionContext?.rangeRect?.width).to.be.greaterThan(0)
    })
  })

  it('issue #322 reads and updates element values by public ids', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'formula-element-id',
            type: ElementType.LATEX,
            value: 'x=1',
            width: 120,
            height: 40
          },
          { value: ' date: ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'visitDateControl',
              type: ControlType.DATE,
              value: [{ value: '2024-01-01' }],
              placeholder: 'date'
            }
          }
        ]
      })

      expect(editor.command.getElementById({ id: 'formula-element-id' })[0]).to.include({
        id: 'formula-element-id',
        type: ElementType.LATEX,
        value: 'x=1'
      })
      expect(editor.command.getValue().data.main[0]).to.include({
        id: 'formula-element-id',
        type: ElementType.LATEX,
        value: 'x=1',
        width: 120,
        height: 40
      })
      expect(editor.command.getText().main).to.eq('x=1 date: 2024-01-01')

      editor.command.executeUpdateElementById({
        id: 'formula-element-id',
        properties: {
          value: 'x=2',
          width: 160,
          height: 48
        }
      })
      editor.command.executeSetControlValue({
        conceptId: 'visitDateControl',
        value: '2024-12-31'
      })

      const updatedFormula = editor.command.getElementById({
        id: 'formula-element-id'
      })[0]
      const savedFormula = editor.command.getValue().data.main.find(
        element => element.id === 'formula-element-id'
      )
      const updatedDateControl = editor.command.getControlValue({
        conceptId: 'visitDateControl'
      })[0]
      const savedDateControl = editor.command.getValue().data.main.find(
        element => element.control?.conceptId === 'visitDateControl'
      )

      expect(updatedFormula).to.include({
        id: 'formula-element-id',
        type: ElementType.LATEX,
        value: 'x=2',
        width: 160,
        height: 48
      })
      expect(savedFormula).to.include({
        value: 'x=2',
        width: 160,
        height: 48
      })
      expect(updatedDateControl).to.include({
        type: ControlType.DATE,
        value: '2024-12-31',
        innerText: '2024-12-31'
      })
      expect(
        savedDateControl?.control?.value?.map(element => element.value).join('')
      ).to.eq('2024-12-31')
      expect(editor.command.getText().main).to.eq('x=2 date: 2024-12-31')
    })
  })

  it('issue #794 inserts new elements into existing text without replacing the document', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'HelloWorld' }]
      })

      const worldIndex = (editor as any).draw
        .getOriginalMainElementList()
        .findIndex((element: any) => element.value === 'W')
      expect(worldIndex).to.be.greaterThan(-1)

      editor.command.executeSetRange(worldIndex - 1, worldIndex - 1)
      editor.command.executeInsertElementList([{ value: ' inserted ' }], {
        isReplace: false
      })

      expect(editor.command.getText().main).to.eq('Hello inserted World')
      expect(editor.command.getValue().data.main.map(element => element.value).join('')).to.eq(
        'Hello inserted World'
      )
    })
  })
})
