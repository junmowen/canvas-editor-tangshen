import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'
import { TableDisplay } from '../../../src/editor/dataset/enum/table/Table'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

function text(value: string) {
  return value.split('').map(char => ({
    value: char
  }))
}

describe('菜单-表格', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('表格', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      editor.command.executeInsertTable(8, 8)

      const data = editor.command.getValue().data.main

      expect(data[0].type).to.eq('table')

      expect(data[0].trList?.length).to.eq(8)
    })
  })

  it('插入行内表格', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: '检查报告:'
        }
      ])
    })

    cy.get('.menu-item__table').click()
    cy.get('.table-display-inline').check({
      force: true
    })
    cy.get('.table-panel').trigger('mousemove', 20, 20).click(20, 20)

    cy.getEditor().then((editor: Editor) => {
      const table = editor.command
        .getValue()
        .data.main.find(element => element.type === 'table')
      expect(table).to.not.eq(undefined)
      expect(table!.tableDisplay).to.eq(TableDisplay.INLINE)

      const data = editor.command.getValue().data.main
      const textIndex = data.findIndex(element => element.value === '检查报告:')
      const tableIndex = data.findIndex(element => element.type === 'table')
      expect(textIndex).to.be.greaterThan(-1)
      expect(tableIndex).to.be.greaterThan(0)
      expect(tableIndex).to.be.greaterThan(textIndex)
    })
  })

  it('按内容自动调整表格列宽', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '',
            type: ElementType.TABLE,
            colgroup: [{ width: 120 }, { width: 120 }, { width: 120 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('ID')
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('治疗项目名称和详细说明')
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('金额')
                  }
                ]
              },
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('1')
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('超声波治疗')
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('20.00')
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = editor.command.getValue({ extraPickAttrs: ['id'] }).data
        .main[0]
      expect(table.type).to.eq(ElementType.TABLE)
      expect(table.colgroup?.map(col => col.width)).to.deep.eq([
        120,
        120,
        120
      ])

      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table.id,
        startTdIndex: 1,
        endTdIndex: 1,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, table.id, 1, 1, 0, 0)
      ;(editor as any).draw.flushScheduledFrameRender()
      const drawBefore = (editor as any).draw
      const beforeBounds = drawBefore
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds(table.id)
        .find((item: any) => item.trIndex === 0 && item.tdIndex === 1)
      editor.command.executeAutoFitTable()
      ;(editor as any).draw.flushScheduledFrameRender()

      const autoFitTable = editor.command.getValue().data.main[0]
      const [idCol, nameCol, amountCol] = autoFitTable.colgroup!.map(
        col => col.width
      )
      const totalWidth = autoFitTable.colgroup!.reduce(
        (total, col) => total + col.width,
        0
      )
      const afterBounds = (editor as any).draw
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds(table.id)
        .find((item: any) => item.trIndex === 0 && item.tdIndex === 1)

      expect(nameCol).to.be.greaterThan(idCol)
      expect(nameCol).to.be.greaterThan(amountCol)
      expect(totalWidth).to.be.at.most(
        (editor as any).draw.getOriginalInnerWidth() + 0.1
      )
      expect(afterBounds.width).to.be.greaterThan(beforeBounds.width)
      expect(editor.command.getText().main).to.contain('治疗项目名称和详细说明')
    })
  })

  it('选中整表后仍可按内容自动调整列宽', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '',
            type: ElementType.TABLE,
            colgroup: [{ width: 100 }, { width: 100 }, { width: 100 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('短')
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('整表选中后也需要调整的长列内容')
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('短')
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = editor.command.getValue({ extraPickAttrs: ['id'] }).data
        .main[0]
      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table.id,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, table.id, 0, 0, 0, 0)
      editor.command.executeTableSelectAll()
      const selectedTableRange = editor.command.getRange()
      editor.command.executeAutoFitTable({
        tableId: table.id
      })

      const autoFitTable = editor.command.getValue().data.main[0]
      const [firstCol, secondCol, thirdCol] = autoFitTable.colgroup!.map(
        col => col.width
      )
      expect(secondCol).to.be.greaterThan(firstCol)
      expect(secondCol).to.be.greaterThan(thirdCol)
      expect(editor.command.getRange()).to.deep.include(selectedTableRange)
    })
  })

  it('按内容自动调整时会重分配原本过宽的空列', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '',
            type: ElementType.TABLE,
            colgroup: [{ width: 90 }, { width: 450 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('否认14天内去过以下场所：水产、肉类批发市场，农贸市场，集市，大型超市')
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: text('右')
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = editor.command.getValue({ extraPickAttrs: ['id'] }).data
        .main[0]
      editor.command.executeAutoFitTable({
        tableId: table.id
      })

      const autoFitTable = editor.command.getValue().data.main[0]
      const [leftCol, rightCol] = autoFitTable.colgroup!.map(col => col.width)
      expect(leftCol).to.be.greaterThan(rightCol)
      expect(leftCol).to.be.greaterThan(90)
      expect(rightCol).to.be.lessThan(450)
    })
  })

  it('合并单元格', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertTable(2, 2)

      const table = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')

      expect(table).to.not.eq(undefined)

      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table!.id,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, table!.id, 0, 0, 0, 0)
      editor.command.executeTableSelectAll()
      editor.command.executeMergeTableCell()

      const mergedTable = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')

      expect(mergedTable?.trList?.[0].tdList?.[0].colspan).to.eq(2)
      expect(mergedTable?.trList?.[0].tdList?.[0].rowspan).to.eq(2)
      expect(mergedTable?.trList?.[0].tdList).to.have.length(1)
    })
  })

  it('閫夋嫨鏁翠釜琛ㄦ牸鏃朵細楂樹寒', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertTable(2, 2)

      const table = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')

      expect(table).to.not.eq(undefined)

      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table!.id,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, table!.id, 0, 0, 0, 0)
      editor.command.executeTableSelectAll()
      ;(editor as any).draw.flushScheduledFrameRender()
      const draw = (editor as any).draw
      const firstCellBounds = draw
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds(table!.id)
        .find((item: any) => item.trIndex === 0 && item.tdIndex === 0)
      cy.wrap({
        pageNo: firstCellBounds.pageNo,
        left: firstCellBounds.x,
        right: firstCellBounds.x + firstCellBounds.width,
        top: firstCellBounds.y,
        bottom: firstCellBounds.y + firstCellBounds.height
      }).as('selectedTableFirstCellPoint')
    })

    cy.get('@selectedTableFirstCellPoint').then(payload => {
      const firstCellPoint = payload as ReturnType<typeof getTableCellPoint>
      cy.getEditor().should((editor: Editor) => {
        (editor as any).draw.flushScheduledFrameRender()
      })
      cy.document().should(doc => {
        expect(
          readCompositedPageBoxStats(doc, firstCellPoint.pageNo, firstCellPoint).blueish
        ).to.be.greaterThan(0)
      })
    })
  })
})
