/** 覆盖 TS-05-A：keepWithNext 在多栏下应优先换栏，避免标题孤立在栏底。 */
describe('paragraph keep with next in columns', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证标题与下一段在第一栏放不下时，会一起进入第二栏而不是直接分页。 */
  it('moves heading and following paragraph to the next column together', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 180,
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
            value: '标题',
            keepWithNext: true
          },
          { value: '\n' },
          { value: '正文段落' }
        ]
      })

      const firstPageRows = editor.draw.getPageRowList()[0]
      const headingRow = firstPageRows.find((row: any) => {
        return row.elementList.some((element: any) => element.keepWithNext)
      })
      const bodyRow = firstPageRows.find((row: any) => {
        return row.elementList.some((element: any) => element.value === '正')
      })

      expect(headingRow, '标题行必须存在').to.not.eq(undefined)
      expect(bodyRow, '正文行必须存在').to.not.eq(undefined)
      expect(headingRow.columnIndex, '标题应进入第二栏').to.eq(1)
      expect(bodyRow.columnIndex, '正文应与标题同栏').to.eq(headingRow.columnIndex)

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const secondColumnBlocks = snapshot.pageList[0].columnList[1].paragraphBlockList
      expect(
        secondColumnBlocks.some((block: any) => block.startIndex === headingRow.startIndex),
        '第二栏快照应包含标题段落块'
      ).to.eq(true)
    })
  })
})
