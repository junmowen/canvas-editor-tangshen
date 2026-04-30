import type Editor from '../../../src/editor'

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getOriginalMainElementList()
}

function getParagraphByText(editor: Editor, text: string) {
  const elementList = getOriginalElements(editor)
  const textIndex = elementList.findIndex((element: any) => element.value === text)
  expect(textIndex).to.be.greaterThan(-1)
  let startIndex = textIndex
  while (startIndex > 0) {
    const element = elementList[startIndex]
    if (element.value === '\n' && !element.listWrap) {
      break
    }
    startIndex--
  }
  let endIndex = textIndex + 1
  while (endIndex < elementList.length) {
    const element = elementList[endIndex]
    if (element.value === '\n' && !element.listWrap) {
      break
    }
    endIndex++
  }
  return {
    startIndex,
    endIndex,
    textIndex,
    elementList: elementList.slice(startIndex, endIndex)
  }
}

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

describe('issue #440 - list sublevel editing', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('adds and removes sublevels with Tab and Shift+Tab', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '第一项\n第二项\n第三项'
          }
        ]
      })

      const elementList = getOriginalElements(editor)
      editor.command.executeSetRange(0, elementList.length)
      editor.command.executeList('ol' as any)

      const secondItem = getParagraphByText(editor, '二')
      editor.command.executeSetRange(
        secondItem.startIndex,
        secondItem.endIndex
      )
    })

    dispatchTab()

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()

      const secondItem = getParagraphByText(editor, '二')
      secondItem.elementList
        .filter((element: any) => element.listId)
        .forEach((element: any) => {
          expect(element.listLevel).to.eq(1)
        })

      editor.command.executeSetRange(
        secondItem.startIndex,
        secondItem.endIndex
      )
    })

    dispatchTab(true)

    cy.getEditor().then((editor: Editor) => {
      const secondItem = getParagraphByText(editor, '二')
      secondItem.elementList
        .filter((element: any) => element.listId)
        .forEach((element: any) => {
          expect(element.listLevel).to.eq(0)
        })
    })
  })

  it('round-trips sublevel data through getValue and setValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '第一项\n第二项\n第三项'
          }
        ]
      })

      let elementList = getOriginalElements(editor)
      editor.command.executeSetRange(0, elementList.length)
      editor.command.executeList('ol' as any)

      const secondItem = getParagraphByText(editor, '二')
      editor.command.executeSetRange(
        secondItem.startIndex,
        secondItem.endIndex
      )
      ;(editor as any).draw.getListParticle().indentList(1)

      const value = editor.command.getValue().data.main
      const listElement = value.find((element: any) => element.type === 'list')
      expect(
        listElement?.valueList.some((element: any) => element.listLevel === 1)
      ).to.eq(true)

      editor.command.executeSetValue({
        main: value
      })
      elementList = getOriginalElements(editor)
      expect(elementList.some((element: any) => element.listLevel === 1)).to.eq(
        true
      )
    })
  })
})
