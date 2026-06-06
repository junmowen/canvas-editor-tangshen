/** 覆盖 TS-05-A：keepLines 在多栏下应整体换栏，避免段落被拆散。 */
describe('paragraph keep lines in columns', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 当前栏剩余空间不足以容纳整段时，keepLines 段落应整体进入下一栏。 */
  it('moves the whole paragraph to the next column when it cannot fit', () => {
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
            value: '整段同栏内容需要换成多行展示避免被拆开',
            keepLines: true
          }
        ]
      })

      const keepLineRows = editor.draw
        .getPageRowList()[0]
        .filter((row: any) => {
          return row.elementList.some((element: any) => element.keepLines)
        })

      expect(keepLineRows.length, 'keepLines 段落应形成多行').to.be.greaterThan(1)
      expect(
        new Set(keepLineRows.map((row: any) => row.columnIndex)).size,
        'keepLines 段落所有行应保持同栏'
      ).to.eq(1)
      expect(keepLineRows[0].columnIndex, 'keepLines 段落应进入第二栏').to.eq(1)

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const secondColumnBlocks = snapshot.pageList[0].columnList[1].paragraphBlockList
      expect(
        secondColumnBlocks.some((block: any) => block.startIndex === keepLineRows[0].startIndex),
        '第二栏快照应包含 keepLines 段落块'
      ).to.eq(true)
    })
  })
})
