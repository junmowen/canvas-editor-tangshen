import type Editor from '../../../src/editor'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'

const getText = (elementList: any[] = []) =>
  elementList.map(element => element.value).join('')

describe('issue API coverage batch 11', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #1154 exposes the draw instance for advanced integrations', () => {
    cy.getEditor().then((editor: Editor) => {
      expect((editor as any).draw).to.exist
      expect((editor as any).draw.getOriginalMainElementList).to.be.a('function')

      editor.command.executeSetValue({
        main: [{ value: 'draw instance is public' }]
      })

      const originalList = (editor as any).draw.getOriginalMainElementList()
      expect(getText(originalList).replace(/\u200B/g, '')).to.eq(
        'draw instance is public'
      )
    })
  })

  it('issue #1117 supports number controls through the control value APIs', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'number-control',
              type: ControlType.NUMBER,
              value: [{ value: '12.5' }],
              placeholder: 'number'
            }
          }
        ]
      })

      expect(editor.command.getControlValue({ conceptId: 'number-control' })[0]).to.include({
        type: ControlType.NUMBER,
        value: '12.5',
        innerText: '12.5'
      })

      editor.command.executeSetControlValue({
        conceptId: 'number-control',
        value: '98.75'
      })

      const value = editor.command.getControlValue({
        conceptId: 'number-control'
      })[0]
      expect(value).to.include({
        type: ControlType.NUMBER,
        value: '98.75',
        innerText: '98.75'
      })
      expect(getText(value.elementList)).to.eq('98.75')
      expect(editor.command.getText().main).to.eq('98.75')
    })
  })

  it('issue #1334 applies paragraph indent increase and decrease through commands', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'paragraph indent command coverage' }]
      })
      editor.command.executeSetRange(1, 1)

      editor.command.executeRowIndent({
        left: 32,
        right: 16,
        firstLine: 24
      })

      let first = editor.command.getValue().data.main[0]
      expect(first.rowIndentLeft).to.eq(32)
      expect(first.rowIndentRight).to.eq(16)
      expect(first.rowIndent).to.eq(24)

      editor.command.executeRowIndent({
        left: 8,
        right: null,
        firstLine: null
      })

      first = editor.command.getValue().data.main[0]
      expect(first.rowIndentLeft).to.eq(8)
      expect(first.rowIndentRight).to.eq(undefined)
      expect(first.rowIndent).to.eq(undefined)
    })
  })

  it('issue #1382 keeps explicit line breaks inside a list item valueList', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.LIST,
            value: '',
            listType: ListType.UL,
            listStyle: ListStyle.DISC,
            valueList: [
              { value: 'first list line' },
              { value: '\n' },
              { value: 'continued same list item' }
            ]
          }
        ]
      })

      const list = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.LIST)
      expect(getText(list?.valueList)).to.contain('first list line')
      expect(getText(list?.valueList)).to.contain('continued same list item')
      expect(editor.command.getText().main).to.contain('first list line')
      expect(editor.command.getText().main).to.contain('continued same list item')

      const html = editor.command.getHTML().main
      expect(html).to.contain('<ul')
      expect(html).to.contain('first list line')
      expect(html).to.contain('continued same list item')
      expect((html.match(/<li>/g) || []).length).to.eq(2)
    })
  })
})
