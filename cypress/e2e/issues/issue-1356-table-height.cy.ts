import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import {
  formatElementList,
  pickSurroundElementList
} from '../../../src/editor/utils/element'

function getEditorUrl() {
  return (
    Cypress.env('editorUrl') || 'http://localhost:3000/canvas-editor/index.html'
  )
}

function createIssueTable() {
  const cellText =
    '患者于三天前无明显诱因，感冒后发现面部水肿，无皮疹，尿量减少，出现乏力，在外治疗无好转，现来我院就诊。'
  return {
    type: ElementType.TABLE,
    value: '',
    width: 554,
    colgroup: [{ width: 277 }, { width: 277 }],
    trList: [
      {
        height: 131,
        minHeight: 42,
        tdList: [
          {
            colspan: 1,
            rowspan: 1,
            value: [
              {
                value: cellText,
                size: 16,
                bold: false,
                color: 'rgb(0, 0, 0)',
                italic: false
              }
            ]
          },
          {
            colspan: 1,
            rowspan: 1,
            value: [
              {
                value: cellText,
                size: 16,
                bold: false,
                color: 'rgb(0, 0, 0)',
                italic: false
              }
            ]
          }
        ]
      }
    ]
  } as any
}

describe('issue #1356 executeComputeElementListHeight table height', () => {
  beforeEach(() => {
    cy.visit(getEditorUrl())
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('matches the rendered table height for a formatted table', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(794, 1123)
      editor.command.executeSetPaperMargin([100, 120, 100, 120])

      const table = createIssueTable()
      editor.command.executeSetValue({
        main: [createIssueTable()]
      })

      const renderedTable = editor.command
        .getValue({ extraPickAttrs: ['id'] })
        .data.main.find(element => element.type === ElementType.TABLE)
      expect(renderedTable?.id).to.be.a('string')
      expect(renderedTable?.height).to.be.greaterThan(0)

      const computedHeight = editor.command.executeComputeElementListHeight([
        table
      ])

      const draw = (editor as any).draw
      const expectedTable = createIssueTable()
      formatElementList([expectedTable], {
        isHandleFirstElement: false,
        editorOptions: editor.command.getOptions() as any
      })
      const expectedRowList = draw.computeRowList({
        innerWidth: draw.getInnerWidth(),
        elementList: [expectedTable],
        surroundElementList: pickSurroundElementList([expectedTable])
      })
      const layoutHeight = expectedRowList.reduce(
        (sum: number, row: any) => sum + row.height + (row.offsetY || 0),
        0
      )

      expect(layoutHeight, 'formatted table height').to.be.greaterThan(0)
      expect(computedHeight).to.be.greaterThan(renderedTable!.height!)
      expect(computedHeight, 'computed height').to.be.closeTo(
        layoutHeight,
        1
      )
    })
  })
})
