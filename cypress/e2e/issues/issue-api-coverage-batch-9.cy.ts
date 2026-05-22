import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

function getOriginalRowHeights(editor: Editor) {
  const draw = (editor as any).draw
  draw.flushScheduledFrameRender()
  return draw.getOriginalRowList().map((row: any) => row.height)
}

function getFirstRowHeight(editor: Editor, main: any[]) {
  editor.command.executeSetValue({
    header: [],
    main,
    footer: []
  })
  return getOriginalRowHeights(editor)[0]
}

function findValueElement(editor: Editor, text: string) {
  return editor.command
    .getValue()
    .data.main.find(
      element =>
        element.value?.includes(text) ||
        element.valueList?.some(valueElement => valueElement.value?.includes(text))
    )
}

function titleDocument(titleId: string) {
  return {
    header: [],
    main: [
      {
        type: ElementType.TITLE,
        value: '',
        titleId,
        level: TitleLevel.FIRST,
        valueList: [
          {
            value: '标题内容',
            size: 24,
            bold: true
          }
        ]
      }
    ],
    footer: []
  }
}

describe('issue API coverage batch 9', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #1338 keeps text typed above a title in default body style', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(titleDocument('title-enter-start'))
      editor.command.executeSetRange(0, 0)
    })

    cy.get('.ce-inputarea').type('{enter}', { force: true, delay: 0 })
    cy.get('.ce-inputarea').type('{uparrow}正文行', { force: true, delay: 0 })

    cy.getEditor().then((editor: Editor) => {
      const inserted = findValueElement(editor, '正文行')

      expect(inserted).to.exist
      expect(inserted?.type).not.to.eq(ElementType.TITLE)
      expect(inserted?.titleId).to.eq(undefined)
      expect(inserted?.level).to.eq(undefined)
      expect(inserted?.bold).not.to.eq(true)
      expect(inserted?.size).not.to.eq(24)
    })
  })

  it('issue #1339 does not clone title metadata onto the line inserted before the first title character', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(titleDocument('title-split-start'))
      editor.command.executeSetRange(0, 0)
    })

    cy.get('.ce-inputarea').type('{enter}{uparrow}前置正文', {
      force: true,
      delay: 0
    })

    cy.getEditor().then((editor: Editor) => {
      const data = editor.command.getValue().data.main
      const inserted = findValueElement(editor, '前置正文')
      const titleElements = data.filter(
        element => element.type === ElementType.TITLE
      )

      expect(inserted).to.exist
      expect(inserted?.type).not.to.eq(ElementType.TITLE)
      expect(inserted?.titleId).to.eq(undefined)
      expect(inserted?.level).to.eq(undefined)
      expect(inserted?.bold).not.to.eq(true)
      expect(inserted?.size).not.to.eq(24)
      expect(titleElements.map(element => element.titleId)).to.deep.eq([
        'title-split-start'
      ])
    })
  })

  it('issue #1341 gives Tab elements the same row height as surrounding text', () => {
    cy.getEditor().then((editor: Editor) => {
      const textHeight = getFirstRowHeight(editor, [
        { value: 'Hello World', size: 24 }
      ])
      const tabHeight = getFirstRowHeight(editor, [
        { value: 'Hello', size: 24 },
        { type: ElementType.TAB, value: '', size: 24 },
        { value: 'World', size: 24 }
      ])

      expect(tabHeight).to.eq(textHeight)
    })
  })

  it('issue #1342 keeps descender characters from changing row height', () => {
    cy.getEditor().then((editor: Editor) => {
      const baselineHeight = getFirstRowHeight(editor, [
        { value: 'ss', size: 28 }
      ])
      const descenderHeight = getFirstRowHeight(editor, [
        { value: 'sgypqj$', size: 28 }
      ])

      expect(descenderHeight).to.be.at.least(baselineHeight)
    })
  })

  it('issue #1344 scales row height with font size', () => {
    cy.getEditor().then((editor: Editor) => {
      const smallHeight = getFirstRowHeight(editor, [
        { value: 'small font row', size: 8 }
      ])
      const largeHeight = getFirstRowHeight(editor, [
        { value: 'large font row', size: 28 }
      ])

      expect(largeHeight).to.be.greaterThan(smallHeight)
    })
  })
})
