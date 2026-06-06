import type Editor from '../../../src/editor'
import { ControlComponent, ControlType } from '../../../src/editor/dataset/enum/Control'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function getDraw(editor: Editor) {
  return (editor as any).draw
}

function getPositionList(editor: Editor) {
  return getDraw(editor).getCoordinate().getOriginalPositionList()
}

function getTable(editor: Editor) {
  return editor.command
    .getValue()
    .data.main.find((element: any) => element.type === ElementType.TABLE)
}

describe('issue API coverage batch 15', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #724 keeps table tools hidden for tableToolDisabled tables', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            tableToolDisabled: true,
            colgroup: [{ width: 120 }, { width: 120 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'A' }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'B' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = getTable(editor)
      expect(table?.tableToolDisabled).to.eq(true)

      editor.command.executeSetRange(0, 0, table.id, 0, 0, 0, 0)
      editor.command.executeMode(EditorMode.READONLY)
      getDraw(editor).getComponents().tableTool.render()

      expect(Cypress.$('.ce-table-tool__select')).to.have.length(0)
      expect(Cypress.$('.ce-table-tool__row')).to.have.length(0)
      expect(Cypress.$('.ce-table-tool__col')).to.have.length(0)
      expect(Cypress.$('.ce-table-tool__border')).to.have.length(0)
    })
  })

  it('issue #733 disposes table tools after undo removes the table', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertTable(2, 2)

      const table = getTable(editor)
      expect(table?.id).to.be.a('string')

      editor.command.executeSetRange(0, 0, table.id, 0, 0, 0, 0)
      getDraw(editor).getComponents().tableTool.render()

      expect(Cypress.$('.ce-table-tool__select')).to.have.length(1)
      expect(Cypress.$('.ce-table-tool__row')).to.have.length(1)
      expect(Cypress.$('.ce-table-tool__col')).to.have.length(1)
      expect(Cypress.$('.ce-table-tool__border')).to.have.length(1)

      editor.command.executeUndo()
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      expect(editor.command.getValue().data.main.some((element: any) => element.type === ElementType.TABLE)).to.eq(false)
      expect(Cypress.$('.ce-table-tool__select')).to.have.length(0)
      expect(Cypress.$('.ce-table-tool__row')).to.have.length(0)
      expect(Cypress.$('.ce-table-tool__col')).to.have.length(0)
      expect(Cypress.$('.ce-table-tool__border')).to.have.length(0)
    })
  })

  it('issue #1189 does not open control popups when a selection spans a select control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'Alpha selection line ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'select-popup-guard',
              type: ControlType.SELECT,
              code: null,
              value: null,
              placeholder: '请选择',
              valueSets: [
                { value: '启用', code: 'enabled' },
                { value: '停用', code: 'disabled' }
              ]
            }
          },
          { value: ' Bravo selection line' }
        ]
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const elementList = getDraw(editor).getObjectResolver().getOriginalMainElementList()
      const selectStart = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'select-popup-guard' &&
          element.controlComponent === ControlComponent.PREFIX
      )
      const selectEnd = elementList.findIndex(
        (element: any) =>
          element.control?.conceptId === 'select-popup-guard' &&
          element.controlComponent === ControlComponent.POSTFIX
      )
      expect(selectStart).to.be.greaterThan(-1)
      expect(selectEnd).to.be.greaterThan(selectStart)

      editor.command.executeSetRange(selectStart - 5, selectEnd + 5)

      expect(Cypress.$('.ce-select-control-popup')).to.have.length(0)
    })
  })

  it('issue #849 keeps focused control editing inside the control value', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'focused-text-control',
              type: ControlType.TEXT,
              value: [{ value: 'ABC' }],
              placeholder: '文本控件'
            }
          },
          { value: ' after' }
        ]
      })
      getDraw(editor).getServices().renderInvalidationManager.flushScheduledFrameRender()

      const valueIndex = getDraw(editor)
        .getObjectResolver().getOriginalMainElementList()
        .findIndex(
          (element: any) =>
            element.control?.conceptId === 'focused-text-control' &&
            element.controlComponent === ControlComponent.VALUE
        )
      expect(valueIndex).to.be.greaterThan(-1)

      editor.command.executeSetRange(valueIndex, valueIndex)

      cy.get('.ce-inputarea')
        .type('{backspace}', { force: true })
        .then(() => {
          const control = editor.command.getControlValue({
            conceptId: 'focused-text-control'
          })[0]
          expect(control).to.include({
            value: 'BC',
            innerText: 'BC'
          })
          expect(editor.command.getText().main).to.contain('before BC after')
        })
    })
  })
})
