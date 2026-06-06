/** 覆盖 TS-05 widowControl，验证段落拆页时不会产生首行或末行孤立。 */
describe('paragraph widow control', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 读取开启 widowControl 的行及其页码。 */
  function getWidowRows(editor: any) {
    return editor.draw
      .getPageRowList()
      .flatMap((pageRows: any[], pageNo: number) => {
        return pageRows
          .filter(row => {
            return row.elementList.some((element: any) => element.widowControl)
          })
          .map(row => ({ pageNo, row }))
      })
  }

  /** 页底只剩一行空间时，段落首两行应一起移动到下一页。 */
  it('avoids leaving the first paragraph line alone at the page bottom', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 260,
        height: 170,
        margins: [20, 20, 20, 20],
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
            value: '孤行控制段落需要形成多行内容用于分页',
            widowControl: true
          }
        ]
      })

      const widowRows = getWidowRows(editor)

      expect(widowRows.length).to.be.greaterThan(1)
      expect(widowRows[0].pageNo).to.eq(1)
      expect(widowRows[1].pageNo).to.eq(widowRows[0].pageNo)
    })
  })

  /** 末行可能单独进入下一页时，倒数第二行应一并移动过去。 */
  it('avoids leaving the last paragraph line alone at the next page top', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 220,
        height: 105,
        margins: [20, 20, 20, 20],
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
          {
            value: '末行控制段落需要刚好排成四行从而验证最后两行同行',
            widowControl: true
          }
        ]
      })

      const widowRows = getWidowRows(editor)
      const pageCounts = widowRows.reduce((countMap: Record<number, number>, item) => {
        countMap[item.pageNo] = (countMap[item.pageNo] || 0) + 1
        return countMap
      }, {})
      const lastPageNo = Math.max(...Object.keys(pageCounts).map(Number))

      expect(widowRows.length).to.be.greaterThan(2)
      expect(lastPageNo).to.be.greaterThan(0)
      expect(pageCounts[lastPageNo]).to.be.greaterThan(1)
    })
  })
})
