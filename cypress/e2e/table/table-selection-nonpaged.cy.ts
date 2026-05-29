import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'

type CellRef = {
  tableId: string
  text: string
}

type CursorPoint = {
  index: number
  pageNo: number
  x: number
  y: number
  left: number
  right: number
  top: number
  bottom: number
}

function prepareSimpleTable(editor: Editor, text: string): CellRef {
  editor.command.executeSetValue(
    {
      header: [],
      main: [{ value: '\u200B' }],
      footer: []
    },
    {
      isSetCursor: true
    } as any
  )
  editor.command.executeInsertTable(1, 1)
  const table = editor.command
    .getValue({
      extraPickAttrs: ['id']
    })
    .data.main.find(element => element.type === 'table')
  if (!table?.id) {
    throw new Error('table not found')
  }
  editor.command.executeSetPositionContext({
    startIndex: 0,
    endIndex: 0,
    tableId: table.id,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(0, 0)
  editor.command.executeInsertElementList(
    text.split('').map(value => ({
      value
    }))
  )
  return {
    tableId: table.id,
    text
  }
}

function setTableCursor(editor: Editor, cell: CellRef, index: number) {
  editor.command.executeSetPositionContext({
    startIndex: index,
    endIndex: index,
    tableId: cell.tableId,
    startTdIndex: 0,
    endTdIndex: 0,
    startTrIndex: 0,
    endTrIndex: 0
  } as any)
  editor.command.executeSetRange(index, index)
}

function getTableCursorPoint(
  editor: Editor,
  cell: CellRef,
  index: number
): CursorPoint {
  setTableCursor(editor, cell, index)
  const cursor = editor.command.getCursorPosition()
  if (!cursor) {
    throw new Error(`cursor not found ${index}`)
  }
  const {
    pageNo,
    coordinate: { leftTop, rightTop, rightBottom }
  } = cursor
  return {
    index,
    pageNo,
    x: Math.floor((leftTop[0] + rightTop[0]) / 2),
    y: Math.floor(leftTop[1] + 2),
    left: leftTop[0],
    right: rightTop[0],
    top: leftTop[1],
    bottom: rightBottom[1]
  }
}

function readCanvasBlueish(
  doc: Document,
  pageNo: number,
  point: CursorPoint
) {
  return readCompositedPageBoxStats(doc, pageNo, point).blueish
}

describe('menu-table selection nonpaged', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('exist')
  })

  it('shows selection highlight when dragging inside a non-paged cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareSimpleTable(editor, 'hello world')
      const firstChar = getTableCursorPoint(editor, cell, 0)
      const endPoint = getTableCursorPoint(editor, cell, 4)
      return {
        cell,
        firstChar,
        endPoint
      }
    }).as('nonPagedSelection')

    cy.get('@nonPagedSelection').then(payload => {
      const { firstChar } = payload as {
        firstChar: CursorPoint
      }
      cy.document().then(doc => {
        expect(readCanvasBlueish(doc, firstChar.pageNo, firstChar)).to.eq(0)
      })
    })

    cy.get('@nonPagedSelection').then(payload => {
      const { firstChar, endPoint } = payload as {
        firstChar: CursorPoint
        endPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${firstChar.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', Math.max(1, Math.floor(firstChar.left - 2)), firstChar.y, {
          button: 0,
          force: true
        })
      cy.wait(120)
      cy.get(`canvas[data-index="${firstChar.pageNo}"]`)
        .trigger('mousemove', endPoint.x, endPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', endPoint.x, endPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.wait(50)

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText.length).to.be.greaterThan(0)
    })

    cy.get('@nonPagedSelection').then(payload => {
      const { firstChar } = payload as {
        firstChar: CursorPoint
      }
      cy.document().then(doc => {
        expect(readCanvasBlueish(doc, firstChar.pageNo, firstChar)).to.be.greaterThan(0)
      })
    })
  })

  it('responds to double click inside a non-paged cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareSimpleTable(editor, 'hello world')
      const hitPoint = getTableCursorPoint(editor, cell, 2)
      return {
        hitPoint
      }
    }).as('nonPagedDblclick')

    cy.get('@nonPagedDblclick').then(payload => {
      const { hitPoint } = payload as {
        hitPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${hitPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('dblclick', hitPoint.x, hitPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.wait(50)

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const rangeText = editor.command.getRangeText()
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(rangeText.length).to.be.greaterThan(0)
    })

    cy.get('@nonPagedDblclick').then(payload => {
      const { hitPoint } = payload as {
        hitPoint: CursorPoint
      }
      cy.document().then(doc => {
        expect(readCanvasBlueish(doc, hitPoint.pageNo, hitPoint)).to.be.greaterThan(0)
      })
    })
  })

  it('does not eat the previous character when dragging from an existing caret in a non-paged cell', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareSimpleTable(editor, 'hello world')
      const caretPoint = getTableCursorPoint(editor, cell, 3)
      const endPoint = getTableCursorPoint(editor, cell, 7)
      return {
        cell,
        caretPoint,
        endPoint
      }
    }).as('nonPagedCaretDrag')

    cy.get('@nonPagedCaretDrag').then(payload => {
      const { caretPoint } = payload as {
        caretPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${caretPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', Math.max(1, Math.floor(caretPoint.left - 2)), caretPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', Math.max(1, Math.floor(caretPoint.left - 2)), caretPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      const anchorRange = editor.command.getRange()
      expect(cursor).to.not.eq(null)
      cy.wrap({
        anchorStartIndex: anchorRange.startIndex,
        pageNo: cursor!.pageNo,
        x: Math.floor(cursor!.coordinate.rightTop[0]),
        y: Math.floor(cursor!.coordinate.leftTop[1] + 2)
      }).as('nonPagedCaretLine')
    })

    cy.get('@nonPagedCaretDrag').then(payload => {
      const { endPoint } = payload as {
        endPoint: CursorPoint
      }
      cy.get('@nonPagedCaretLine').then(caretPayload => {
        const caretLine = caretPayload as {
          anchorStartIndex: number
          pageNo: number
          x: number
          y: number
        }
        cy.get(`canvas[data-index="${caretLine.pageNo}"]`)
          .scrollIntoView()
          .trigger('mousedown', caretLine.x, caretLine.y, {
            button: 0,
            force: true
          })
          .trigger('mousemove', endPoint.x, endPoint.y, {
            button: 0,
            force: true
          })
          .trigger('mouseup', endPoint.x, endPoint.y, {
            button: 0,
            force: true
          })
      })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@nonPagedCaretDrag').then(payload => {
        const { cell } = payload as {
          cell: CellRef
        }
        const range = editor.command.getRange()
        const rangeText = editor.command.getRangeText()
        expect(range.endIndex).to.be.greaterThan(range.startIndex)
        expect(rangeText.length).to.be.greaterThan(0)
        cy.get('@nonPagedCaretLine').then(caretPayload => {
          const caretLine = caretPayload as {
            anchorStartIndex: number
          }
          expect(rangeText[0]).to.eq(cell.text[caretLine.anchorStartIndex])
        })
      })
    })
  })

  it('starts from the next character when dragging from a caret placed after a character', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareSimpleTable(editor, '0123456789')
      const caretPoint = getTableCursorPoint(editor, cell, 3)
      const endPoint = getTableCursorPoint(editor, cell, 7)
      return {
        cell,
        caretPoint,
        endPoint
      }
    }).as('nonPagedAfterCharCaretDrag')

    cy.get('@nonPagedAfterCharCaretDrag').then(payload => {
      const { caretPoint } = payload as {
        caretPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${caretPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', caretPoint.x, caretPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', caretPoint.x, caretPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      expect(cursor).to.not.eq(null)
      cy.wrap({
        anchorCursorIndex: cursor!.index,
        pageNo: cursor!.pageNo,
        x: Math.floor(cursor!.coordinate.rightTop[0]),
        y: Math.floor(cursor!.coordinate.leftTop[1] + 2)
      }).as('nonPagedAfterCharCaretLine')
    })

    cy.get('@nonPagedAfterCharCaretDrag').then(payload => {
      const { endPoint } = payload as {
        endPoint: CursorPoint
      }
      cy.get('@nonPagedAfterCharCaretLine').then(caretPayload => {
        const caretLine = caretPayload as {
          anchorStartIndex: number
          pageNo: number
          x: number
          y: number
        }
        cy.get(`canvas[data-index="${caretLine.pageNo}"]`)
          .scrollIntoView()
          .trigger('mousedown', caretLine.x, caretLine.y, {
            button: 0,
            force: true
          })
          .trigger('mousemove', endPoint.x, endPoint.y, {
            button: 0,
            force: true
          })
          .trigger('mouseup', endPoint.x, endPoint.y, {
            button: 0,
            force: true
          })
      })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@nonPagedAfterCharCaretDrag').then(payload => {
        cy.get('@nonPagedAfterCharCaretLine').then(caretPayload => {
          const { cell } = payload as {
            cell: CellRef
          }
          const caretLine = caretPayload as {
            anchorCursorIndex: number
          }
          const rangeText = editor.command.getRangeText()
          expect(rangeText.length).to.be.greaterThan(0)
          expect(rangeText[0]).to.eq(cell.text[caretLine.anchorCursorIndex + 1])
        })
      })
    })
  })

  it('does not eat the previous character when dragging again from the same character box after placing a caret', () => {
    cy.getEditor().then((editor: Editor) => {
      const cell = prepareSimpleTable(editor, '0123456789')
      const caretPoint = getTableCursorPoint(editor, cell, 3)
      const endPoint = getTableCursorPoint(editor, cell, 7)
      return {
        cell,
        caretPoint,
        endPoint
      }
    }).as('nonPagedSameCharBoxDrag')

    cy.get('@nonPagedSameCharBoxDrag').then(payload => {
      const { caretPoint } = payload as {
        caretPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${caretPoint.pageNo}"]`)
        .scrollIntoView()
        .click(caretPoint.x, caretPoint.y, {
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const cursor = editor.command.getCursorPosition()
      cy.wrap({
        anchorCursorIndex: cursor!.index
      }).as('nonPagedSameCharBoxAnchor')
    })

    cy.get('@nonPagedSameCharBoxDrag').then(payload => {
      const { caretPoint, endPoint } = payload as {
        caretPoint: CursorPoint
        endPoint: CursorPoint
      }
      cy.get(`canvas[data-index="${caretPoint.pageNo}"]`)
        .scrollIntoView()
        .trigger('mousedown', caretPoint.x, caretPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', endPoint.x, endPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', endPoint.x, endPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      cy.get('@nonPagedSameCharBoxDrag').then(payload => {
        cy.get('@nonPagedSameCharBoxAnchor').then(anchorPayload => {
          const { cell } = payload as {
            cell: CellRef
          }
          const { anchorCursorIndex } = anchorPayload as {
            anchorCursorIndex: number
          }
          const rangeText = editor.command.getRangeText()
          expect(rangeText.length).to.be.greaterThan(0)
          expect(rangeText[0]).to.eq(cell.text[anchorCursorIndex + 1])
        })
      })
    })
  })
})
