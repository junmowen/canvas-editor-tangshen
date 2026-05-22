import type Editor from '../../../src/editor'
import type { IElement } from '../../../src/editor/interface/Element'
import {
  ControlComponent,
  ControlType
} from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

const getText = (elementList: IElement[] = []) =>
  elementList.map(element => element.value).join('')

describe('issue API coverage batch 4', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #131 removes the only leading text control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'single-leading-control',
              type: ControlType.TEXT,
              value: [{ value: 'only control' }],
              placeholder: 'only'
            }
          }
        ]
      })

      expect(
        editor.command.getControlValue({
          conceptId: 'single-leading-control'
        })
      ).to.have.length(1)

      editor.command.executeRemoveControl({
        conceptId: 'single-leading-control'
      })

      expect(
        editor.command.getControlValue({
          conceptId: 'single-leading-control'
        })
      ).to.deep.eq([])
      expect(
        editor.command
          .getValue()
          .data.main.some(element => element.control?.conceptId === 'single-leading-control')
      ).to.eq(false)
    })
  })

  it('issue #227 applies select control text style to default code values', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        control: {
          bracketColor: '#25C7FE'
        }
      })
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            color: '#25C7FE',
            control: {
              conceptId: 'styled-select',
              type: ControlType.SELECT,
              color: '#25C7FE',
              value: null,
              placeholder: 'select',
              code: 'value-2',
              valueSets: [
                { value: 'Value 1', code: 'value-1' },
                { value: 'Value 2', code: 'value-2' }
              ]
            }
          }
        ]
      })

      const control = editor.command
        .getControlList()
        .find(
          element => element.control?.conceptId === 'styled-select'
        )
      const controlValueList = control?.control?.value || []

      expect(editor.command.getControlValue({ conceptId: 'styled-select' })[0])
        .to.include({
          type: ControlType.SELECT,
          value: 'value-2',
          innerText: 'Value 2',
          color: '#25C7FE'
        })
      expect(getText(controlValueList)).to.eq('Value 2')
      expect(
        controlValueList
          .filter(element => element.value.trim())
          .every(element => element.color === '#25C7FE')
      ).to.eq(true)

      const expandedValueElements = ((editor as any).draw.getOriginalMainElementList() as IElement[])
        .filter(
          element =>
            element.control?.conceptId === 'styled-select' &&
            element.controlComponent === ControlComponent.VALUE &&
            element.value.trim()
        )
      expect(getText(expandedValueElements)).to.eq('Value2')
      expect(expandedValueElements.every(element => element.color === '#25C7FE')).to.eq(
        true
      )
    })
  })

  it('issue #1230 reads and writes number controls through the command API', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'score: ' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'numeric-score',
              type: ControlType.NUMBER,
              value: null,
              placeholder: 'number'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        conceptId: 'numeric-score',
        value: '123.45'
      })

      const value = editor.command.getControlValue({
        conceptId: 'numeric-score'
      })[0]
      expect(value).to.include({
        type: ControlType.NUMBER,
        value: '123.45',
        innerText: '123.45'
      })
      expect(value.value).to.match(/^\d+(\.\d+)?$/)
      expect(getText(value.elementList)).to.eq('123.45')
      expect(editor.command.getHTML().main).to.contain('123.45')
    })
  })

  it('issue #1233 replaces mixed text-like content while preserving structures', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'target plain', color: '#111111' },
          { value: '\n' },
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'replace-title',
            level: TitleLevel.SECOND,
            valueList: [{ value: 'target title', color: '#222222' }]
          },
          {
            type: ElementType.LIST,
            value: '',
            listType: ListType.UL,
            listStyle: ListStyle.DISC,
            valueList: [{ value: 'target list', color: '#333333' }]
          }
        ]
      })

      editor.command.executeSearch('target')
      expect(editor.command.getSearchNavigateInfo()?.count).to.eq(3)

      editor.command.executeReplace('result')

      const data = editor.command.getValue().data.main
      const plain = data[0]
      const title = data.find(element => element.type === ElementType.TITLE)
      const list = data.find(element => element.type === ElementType.LIST)

      expect(plain).to.include({
        value: 'result plain',
        color: '#111111'
      })
      expect(title).to.include({
        type: ElementType.TITLE,
        titleId: 'replace-title',
        level: TitleLevel.SECOND
      })
      expect(getText(title?.valueList)).to.eq('result title')
      expect(title?.valueList?.[0].color).to.eq('#222222')
      expect(list).to.include({
        type: ElementType.LIST,
        listType: ListType.UL,
        listStyle: ListStyle.DISC
      })
      expect(getText(list?.valueList)).to.eq('result list')
      expect(list?.valueList?.[0].color).to.eq('#333333')
    })
  })

  it('issue #1337 locates catalog entries at the end of split title content', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'split-title',
            level: TitleLevel.FIRST,
            valueList: [
              { value: 'First heading' },
              { value: '\n' },
              { value: 'Second heading' }
            ]
          },
          { value: ' body text' }
        ]
      })

      return editor.command.getCatalog().then(catalog => {
        expect(catalog?.[0]).to.include({
          id: 'split-title',
          level: TitleLevel.FIRST
        })

        const originalElementList = (editor as any).draw.getOriginalElementList() as IElement[]
        const expectedIndex = originalElementList.reduce(
          (lastIndex, element, index) =>
            element.titleId === 'split-title' ? index : lastIndex,
          -1
        )
        expect(expectedIndex).to.be.greaterThan(-1)

        editor.command.executeLocationCatalog('split-title')

        expect(editor.command.getRange()).to.include({
          startIndex: expectedIndex,
          endIndex: expectedIndex
        })
        expect(originalElementList[expectedIndex].value).to.eq('g')
      })
    })
  })
})
