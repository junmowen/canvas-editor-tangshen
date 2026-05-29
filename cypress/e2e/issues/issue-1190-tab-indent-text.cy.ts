import type Editor from '../../../src/editor'
import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'

function dispatchTab(shiftKey = false) {
  cy.get('.ce-inputarea').then($input => {
    const input = $input[0] as HTMLTextAreaElement
    const KeyboardEventCtor = input.ownerDocument.defaultView!.KeyboardEvent
    const wasNotCancelled = input.dispatchEvent(
      new KeyboardEventCtor('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true
      })
    )
    expect(wasNotCancelled).to.eq(false)
  })
}

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getOriginalMainElementList()
}

function getCheckboxListClickPoint(editor: Editor, text: string) {
  const draw = (editor as any).draw
  draw.flushScheduledFrameRender()
  const row = draw
    .getOriginalRowList()
    .find((item: any) =>
      item.elementList.map((element: any) => element.value).join('').includes(text)
    )
  expect(row, `row containing ${text}`).to.not.eq(undefined)
  const startElement = row.elementList[0]
  expect(startElement.listStyle).to.eq(ListStyle.CHECKBOX)

  const position = draw
    .getPosition()
    .getOriginalPositionList()
    .find((item: any) => item.index === row.startIndex)
  expect(position, `position for ${text}`).to.not.eq(undefined)

  const options = editor.command.getOptions()
  const scale = options.scale
  const levelIndent = (startElement.listLevel || 0) * options.defaultTabWidth * scale
  let tabWidth = 0
  for (let index = 1; index < row.elementList.length; index++) {
    const element = row.elementList[index]
    if (element.type !== ElementType.TAB) break
    tabWidth += options.defaultTabWidth * scale
  }

  const checkbox = options.checkbox
  const left =
    position.coordinate.leftTop[0] -
    (row.offsetX || 0) +
    levelIndent +
    tabWidth -
    checkbox.gap * scale
  return {
    pageNo: position.pageNo,
    x: left + ((checkbox.width + checkbox.gap * 2) * scale) / 2,
    y: position.coordinate.leftTop[1] + position.lineHeight / 2
  }
}

function clickPagePoint(editor: Editor, point: { pageNo: number; x: number; y: number }) {
  const draw = (editor as any).draw
  const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[point.pageNo]
  const pageRect = pageWrapper.getBoundingClientRect()
  cy.get(`canvas[data-index="${point.pageNo}"]`).trigger('mousedown', {
    button: 0,
    clientX: pageRect.left + point.x,
    clientY: pageRect.top + point.y,
    force: true
  })
}

describe('tab indentation scenarios', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issues #1190, #942, and #974 insert a styled tab element in normal text when pressing Tab', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'before',
          font: 'Microsoft YaHei',
          size: 28,
          bold: true,
          color: '#FF0000',
          strikeout: true
        }
      ])
    })

    dispatchTab()

    cy.getEditor().then((editor: Editor) => {
      const tabElement = getOriginalElements(editor).find(
        (element: any) => element.type === ElementType.TAB
      )

      expect(tabElement).to.not.eq(undefined)
      expect(tabElement.value).to.eq('')
      expect(tabElement.font).to.eq('Microsoft YaHei')
      expect(tabElement.size).to.eq(28)
      expect(tabElement.bold).to.eq(true)
      expect(tabElement.color).to.eq('#FF0000')
      expect(tabElement.strikeout).to.eq(true)
    })
  })

  it('issue #1186 keeps checkbox list items clickable after Tab indentation', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: '第一项\n第二项' }]
      })

      const elementList = getOriginalElements(editor)
      editor.command.executeSetRange(0, elementList.length)
      editor.command.executeList(ListType.UL, ListStyle.CHECKBOX)

      const secondItemIndex = getOriginalElements(editor).findIndex(
        (element: any) => element.value === '二'
      )
      expect(secondItemIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(secondItemIndex, secondItemIndex)
    })

    dispatchTab()

    cy.getEditor().then((editor: Editor) => {
      clickPagePoint(editor, getCheckboxListClickPoint(editor, '第二项'))
    })

    cy.getEditor().then((editor: Editor) => {
      const secondItem = getOriginalElements(editor).find(
        (element: any) =>
          element.value === ZERO &&
          element.listStyle === ListStyle.CHECKBOX &&
          element.listLevel === 1
      )
      expect(secondItem?.checkbox?.value).to.eq(true)
    })
  })

  it('issue #1186 keeps checkbox list items clickable when the line starts with a Tab element', () => {
    cy.getEditor().then((editor: Editor) => {
      const listId = `checkbox-tab-${Date.now()}`
      editor.command.executeSetValue({
        main: [
          {
            value: ZERO,
            listId,
            listType: ListType.UL,
            listStyle: ListStyle.CHECKBOX,
            listLevel: 0,
            checkbox: {
              value: false
            }
          },
          {
            type: ElementType.TAB,
            value: '',
            listId,
            listType: ListType.UL,
            listStyle: ListStyle.CHECKBOX,
            listLevel: 0
          },
          ...'缩进项'.split('').map(value => ({
            value,
            listId,
            listType: ListType.UL,
            listStyle: ListStyle.CHECKBOX,
            listLevel: 0
          }))
        ]
      })

      clickPagePoint(editor, getCheckboxListClickPoint(editor, '缩进项'))
    })

    cy.getEditor().then((editor: Editor) => {
      const item = getOriginalElements(editor).find(
        (element: any) =>
          element.value === ZERO && element.listStyle === ListStyle.CHECKBOX
      )
      expect(item?.checkbox?.value).to.eq(true)
    })
  })
})
