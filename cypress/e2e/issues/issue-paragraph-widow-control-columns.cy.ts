/** 覆盖 TS-05-A：widowControl 在多栏下应避免段落首行孤立在栏底。 */
describe('paragraph widow control in columns', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 读取开启 widowControl 的第一页行。 */
  function getFirstPageWidowRows(editor: any) {
    return editor.draw.getPageRowList()[0].filter((row: any) => {
      return row.elementList.some((element: any) => element.widowControl)
    })
  }

  /** 栏底只剩一行空间时，段落首两行应一起移动到下一栏。 */
  it('moves the first two paragraph lines to the next column together', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 170,
        margins: [20, 20, 20, 20],
        columns: {
          count: 2,
          gap: 20,
          widths: [160, 160]
        },
        header: {
          disabled: true
        },
        footer: {
          disabled: true
        },
        pageNumber: {
          disabled: true
        }
      })
      editor.command.executeSetValue({
        main: [
          { value: '填充一' },
          { value: '\n' },
          { value: '填充二' },
          { value: '\n' },
          { value: '填充三' },
          { value: '\n' },
          {
            value: '孤行控制段落需要形成多行内容用于分栏',
            widowControl: true
          }
        ]
      })

      const widowRows = getFirstPageWidowRows(editor)

      expect(widowRows.length, 'widowControl 段落应形成多行').to.be.greaterThan(1)
      expect(widowRows[0].columnIndex, '首行应进入第二栏').to.eq(1)
      expect(widowRows[1].columnIndex, '第二行应与首行同栏').to.eq(
        widowRows[0].columnIndex
      )

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const secondColumnBlocks = snapshot.pageList[0].columnList[1].paragraphBlockList
      expect(
        secondColumnBlocks.some((block: any) => block.startIndex === widowRows[0].startIndex),
        '第二栏快照应包含 widowControl 段落块'
      ).to.eq(true)
    })
  })
})
