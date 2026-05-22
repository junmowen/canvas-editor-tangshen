import type Editor from '../../../src/editor'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

describe('issue #673 control highlight command', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('computes highlight matches for controls selected by conceptId', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'highlightControl',
              type: ControlType.TEXT,
              value: [{ value: '高亮文本' }],
              placeholder: 'highlight'
            }
          }
        ]
      })

      editor.command.executeSetControlHighlight([
        {
          conceptId: 'highlightControl',
          ruleList: [
            {
              keyword: '亮',
              backgroundColor: '#ffff00',
              alpha: 0.5
            }
          ]
        }
      ])

      const results = (editor as any).draw
        .getControl()
        .controlSearch.getHighlightMatchResult()

      expect(results.length).to.be.greaterThan(0)
      expect(
        results.some(
          (result: any) =>
            result.keyword === '亮' &&
            result.backgroundColor === '#ffff00' &&
            result.alpha === 0.5
        )
      ).to.eq(true)
    })
  })
})
