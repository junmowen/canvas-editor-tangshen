import type Editor from '../../../src/editor'

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getOriginalMainElementList()
}

function getTextRows(editor: Editor) {
  return (editor as any).draw
    .getOriginalRowList()
    .filter((row: any) =>
      row.elementList.some(
        (element: any) => !element.type && element.value !== '\u200B'
      )
    )
}

describe('issue #725 paragraph row indentation', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('applies paragraph first-line indentation through the command API', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '首段第一行会缩进并保持自动换行后的后续行不重复缩进。'
          }
        ]
      })

      editor.command.executeSetRange(1, 1)

      editor.command.executeRowIndent(32)

      const firstParagraph = getOriginalElements(editor).filter(
        (element: any) => element.value !== '\u200B' && !element.type
      )
      expect(firstParagraph[0].rowIndent).to.eq(32)

      const rows = getTextRows(editor)
      expect(rows[0].offsetX).to.eq(32)

      const value = editor.command.getValue().data.main
      expect(value[0].rowIndent).to.eq(32)

      editor.command.executeSetValue({
        main: value
      })

      const restoredValue = editor.command.getValue().data.main
      expect(restoredValue[0].rowIndent).to.eq(32)
      expect(getTextRows(editor)[0].offsetX).to.eq(32)
    })
  })

  it('applies fixed character indentation from the toolbar menu', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '菜单固定缩进数值需要按当前字号换算。'
          }
        ]
      })
      editor.command.executeSetRange(1, 1)
    })

    cy.get('.menu-item__row-indent').click()
    cy.get('.menu-item__row-indent [data-rowindent-chars="2"]').click()

    cy.getEditor().then((editor: Editor) => {
      const value = editor.command.getValue().data.main
      expect(value[0].rowIndent).to.eq(32)
    })
  })

  it('does not apply paragraph indentation to wrapped continuation rows', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value:
              '首行缩进只应该出现在段落第一行，后面的自动换行内容仍然从页面正文起始位置排版。'.repeat(
                8
              )
          }
        ]
      })

      editor.command.executeSetRange(1, 1)
      editor.command.executeRowIndent(48)

      const rows = getTextRows(editor)
      expect(rows.length).to.be.greaterThan(1)

      const firstRowFirstText = rows[0].elementList.find(
        (element: any) => !element.type && element.value !== '\u200B'
      )
      const wrappedRowFirstText = rows[1].elementList.find(
        (element: any) => !element.type && element.value !== '\u200B'
      )

      expect(rows[0].offsetX).to.eq(48)
      expect(rows[1].offsetX || 0).to.eq(0)
      expect(firstRowFirstText.rowIndent).to.eq(48)
      expect(wrappedRowFirstText.rowIndent).to.eq(48)
    })
  })

  it('supports left and right paragraph indentation through the command API', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '左右缩进需要移动段落起点并缩小可用排版宽度。'.repeat(6)
          }
        ]
      })

      editor.command.executeSetRange(1, 1)
      const beforeRows = getTextRows(editor).length

      editor.command.executeRowIndent({
        left: 32,
        right: 48
      })

      const value = editor.command.getValue().data.main
      expect(value[0].rowIndentLeft).to.eq(32)
      expect(value[0].rowIndentRight).to.eq(48)

      const rows = getTextRows(editor)
      expect(rows.length).to.be.greaterThan(beforeRows)
      rows.forEach((row: any) => {
        expect(row.offsetX || 0).to.eq(32)
        expect(row.rightOffsetX || 0).to.eq(48)
      })

      editor.command.executeSetValue({
        main: value
      })
      const restoredValue = editor.command.getValue().data.main
      expect(restoredValue[0].rowIndentLeft).to.eq(32)
      expect(restoredValue[0].rowIndentRight).to.eq(48)
    })
  })

  it('applies hanging indentation only to wrapped continuation rows', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value:
              '悬挂缩进只应该出现在自动换行后的续行，首行仍然按左缩进起排。'.repeat(
                8
              )
          }
        ]
      })

      editor.command.executeSetRange(1, 1)
      editor.command.executeRowIndent({
        left: 24,
        hanging: 40
      })

      const rows = (editor as any).draw
        .getOriginalRowList()
        .filter((row: any) => row.elementList.some((element: any) => !element.type))
      expect(rows.length).to.be.greaterThan(1)

      expect(rows[0].offsetX).to.eq(24)
      expect(rows[1].offsetX).to.eq(64)
      expect(rows[0].rowFlexOffsetX).to.eq(24)
      expect(rows[1].rowFlexOffsetX).to.eq(64)

      const firstRowFirstText = rows[0].elementList.find(
        (element: any) => !element.type && element.value !== '\u200B'
      )
      const wrappedRowFirstText = rows[1].elementList.find(
        (element: any) => !element.type && element.value !== '\u200B'
      )
      expect(firstRowFirstText.rowHangingIndent).to.eq(40)
      expect(wrappedRowFirstText.rowHangingIndent).to.eq(40)
    })
  })
})
