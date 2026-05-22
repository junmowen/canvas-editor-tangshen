import type Editor from '../../../src/editor'
import { LocationPosition } from '../../../src/editor/dataset/enum/Common'
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

describe('issue API coverage batch 3', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #741 resolves full control values through position context and control APIs', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'issue741Control',
              type: ControlType.TEXT,
              value: [{ value: 'initial value' }],
              placeholder: 'control'
            }
          }
        ]
      })
      editor.command.executeSetControlValue({
        conceptId: 'issue741Control',
        value: 'complete control value'
      })

      const draw = (editor as any).draw
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const valueIndex = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'issue741Control' &&
          element.controlComponent === ControlComponent.VALUE
      )
      expect(valueIndex).to.be.greaterThan(-1)

      const context = editor.command.getPositionContextByEvent(
        createMouseEventAtPosition(editor, positionList[valueIndex])
      )

      expect(context?.element?.control?.conceptId).to.eq('issue741Control')
      expect(
        context?.element?.control?.value?.map(value => value.value).join('')
      ).to.eq('complete control value')
      expect(context?.rangeRect?.width).to.be.greaterThan(0)
      expect(
        editor.command.getControlValue({ conceptId: 'issue741Control' })[0]
      ).to.include({
        value: 'complete control value',
        innerText: 'complete control value'
      })
    })
  })

  it('issue #1093 exposes the active table column through getRangeContext', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'issue-1093-table',
            type: ElementType.TABLE,
            value: '',
            width: 360,
            colgroup: [{ width: 120 }, { width: 120 }, { width: 120 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'A1' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B1' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'C1' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: 'issue-1093-table',
        startTdIndex: 2,
        endTdIndex: 2,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, 'issue-1093-table', 2, 2, 0, 0)

      const context = editor.command.getRangeContext()

      expect(context).to.include({
        isTable: true,
        trIndex: 0,
        tdIndex: 2
      })
      expect(context?.tableElement).to.include({
        id: 'issue-1093-table',
        type: ElementType.TABLE
      })
      expect(context?.rangeRects[0].height).to.be.greaterThan(0)
    })
  })

  it('issue #1103 locates a control outer edge for external validation tips', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'required: ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'issue1103Required',
              type: ControlType.TEXT,
              value: [{ value: 'filled' }],
              placeholder: 'required'
            }
          }
        ]
      })

      const draw = (editor as any).draw
      const controlElement = draw
        .getElementList()
        .find(
          (element: any) =>
            element.control?.conceptId === 'issue1103Required' &&
            element.controlComponent === ControlComponent.VALUE
        )
      expect(controlElement?.controlId).to.be.a('string')

      editor.command.executeLocationControl(controlElement.controlId, {
        position: LocationPosition.OUTER_AFTER
      })

      const range = editor.command.getRange()
      const rangeContext = editor.command.getRangeContext()
      const position = draw.getPosition().getOriginalPositionList()[range.endIndex]
      expect(position).to.exist

      expect(rangeContext?.isCollapsed).to.eq(true)
      expect(rangeContext?.rangeRects[0]).to.include({
        width: 0
      })
      expect(rangeContext?.rangeRects[0].x).to.be.closeTo(
        position.coordinate.rightTop[0],
        0.01
      )
      expect(rangeContext?.rangeRects[0].height).to.be.greaterThan(0)
      expect(
        editor.command.getControlValue({ conceptId: 'issue1103Required' })[0]
      ).to.include({
        value: 'filled',
        innerText: 'filled'
      })
    })
  })

  it('issue #1228 provides stable area hit rects and page metrics for overlays', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'issue1228Area',
            area: {
              backgroundColor: 'rgba(0,0,0,0.04)',
              borderColor: '#336699'
            },
            valueList: [{ value: 'area content' }]
          },
          { value: ' after' }
        ]
      })

      const draw = (editor as any).draw
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const areaIndex = elementList.findIndex(
        (element: any) => element.areaId === 'issue1228Area'
      )
      expect(areaIndex).to.be.greaterThan(-1)

      const position = positionList[areaIndex]
      const context = editor.command.getPositionContextByEvent(
        createMouseEventAtPosition(editor, position, 'mouseover')
      )
      const [top, right, bottom, left] = editor.command.getPaperMargin()
      const options = editor.command.getOptions()

      expect(context?.element).to.include({
        areaId: 'issue1228Area'
      })
      expect(context?.element?.area).to.include({
        borderColor: '#336699'
      })
      expect(context?.rangeRect).to.include({
        x: position.coordinate.leftTop[0],
        width: position.coordinate.rightTop[0] - position.coordinate.leftTop[0],
        height: position.lineHeight
      })
      expect(context?.rangeRect?.height).to.be.greaterThan(0)
      expect(options.width - left - right).to.be.greaterThan(0)
      expect(options.height - top - bottom).to.be.greaterThan(0)
      expect(context?.tableInfo).to.eq(null)
    })
  })
})
