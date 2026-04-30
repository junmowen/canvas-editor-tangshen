import Editor from '../../../src/editor'
import { readCompositedPageBoxStats } from '../utils/readCompositedPageStats'
import { TableDisplay } from '../../../src/editor/dataset/enum/table/Table'

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

      const draw = (editor as any).draw
      const firstRow = draw.getRowList()[0]
      const tableIndex = firstRow.elementList.findIndex(
        (element: any) => element.type === 'table'
      )
      expect(tableIndex).to.be.greaterThan(0)
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
