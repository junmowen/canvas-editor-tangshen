/** 覆盖 TS-03 分栏真实行流，验证行会从第一栏流入第二栏。 */
describe('typesetting page columns real flow', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证多栏配置会影响行测量、分页分栏和最终 position 坐标。 */
  it('flows body rows into the next column before creating a new page', () => {
    cy.getEditor().then((editor: any) => {
      const main = Array.from({ length: 18 }).flatMap((_, index) => [
        { value: `第${index + 1}行用于验证分栏真实流动` },
        { value: '\n' }
      ])

      editor.command.executeUpdateOptions({
        width: 420,
        height: 320,
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
      editor.command.executeSetValue({ main })

      const pageRowList = editor.draw.getPageRowList()
      const firstPageRows = pageRowList[0]
      expect(firstPageRows.some((row: any) => row.columnIndex === 1)).to.eq(true)
      expect(firstPageRows.every((row: any) => row.columnIndex === 0 || row.columnIndex === 1))
        .to.eq(true)

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const firstPage = snapshot.pageList[0]
      expect(firstPage.columnList[0].paragraphBlockList.length).to.be.greaterThan(0)
      expect(firstPage.columnList[1].paragraphBlockList.length).to.be.greaterThan(0)

      const firstSecondColumnRowOffset = firstPageRows.findIndex(
        (row: any) => row.columnIndex === 1
      )
      const firstSecondColumnPosition = editor.draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => {
          return position.pageNo === 0 &&
            position.rowNo === firstSecondColumnRowOffset
        })
      expect(firstSecondColumnPosition.coordinate.leftTop[0]).to.be.gte(
        firstPage.columnList[1].rect.x
      )
    })
  })
})
