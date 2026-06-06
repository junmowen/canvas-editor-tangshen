/** 覆盖 TS-05-A：行距和段距在多栏下应参与换栏判断。 */
describe('paragraph spacing in columns', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 设置一个短页面双栏环境，用于验证纵向间距会消耗当前栏高度。 */
  function setupColumnPage(editor: any) {
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
  }

  /** 查找包含指定字符的第一页布局行。 */
  function findFirstPageRowByText(editor: any, text: string) {
    return editor.draw.getPageRowList()[0].find((row: any) => {
      return row.elementList.some((element: any) => element.value === text)
    })
  }

  /** 精确行距撑高当前行后，应按真实行高换到下一栏。 */
  it('uses exact line spacing when deciding column break', () => {
    cy.getEditor().then((editor: any) => {
      setupColumnPage(editor)
      editor.command.executeSetValue({
        main: [
          { value: '填充一' },
          { value: '\n' },
          { value: '填充二' },
          { value: '\n' },
          { value: '填充三' },
          { value: '\n' },
          {
            value: '精确行距',
            lineSpacingType: 'exact',
            lineSpacing: 80
          }
        ]
      })

      const exactRow = findFirstPageRowByText(editor, '精')

      expect(exactRow, '精确行距行必须存在').to.not.eq(undefined)
      expect(exactRow.columnIndex, '精确行距应触发换到第二栏').to.eq(1)
      expect(exactRow.height, '精确行距必须撑开行高').to.be.greaterThan(80)
    })
  })

  /** 段前间距占用当前栏高度后，应按真实 offsetY 换到下一栏。 */
  it('uses spaceBefore when deciding column break', () => {
    cy.getEditor().then((editor: any) => {
      setupColumnPage(editor)
      editor.command.executeSetValue({
        main: [
          { value: '填充一' },
          { value: '\n' },
          { value: '填充二' },
          { value: '\n' },
          { value: '填充三' },
          { value: '\n' },
          {
            value: '段前间距',
            spaceBefore: 70
          }
        ]
      })

      const spacingRow = findFirstPageRowByText(editor, '段')

      expect(spacingRow, '段前间距行必须存在').to.not.eq(undefined)
      expect(spacingRow.columnIndex, '段前间距应触发换到第二栏').to.eq(1)
      expect(spacingRow.offsetY, '段前间距必须进入行偏移').to.be.greaterThan(60)
    })
  })
})
