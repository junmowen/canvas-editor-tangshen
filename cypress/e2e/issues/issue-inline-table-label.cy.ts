import Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { TableDisplay } from '../../../src/editor/dataset/enum/table/Table'

describe('inline table label layout', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
  })

  it('places a text label and an inline table on the same row', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(900, 500)
      editor.command.executeSetPaperMargin([40, 40, 40, 40])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: '检查报告:'
            },
            {
              type: ElementType.TABLE,
              value: '',
              tableDisplay: TableDisplay.INLINE,
              colgroup: [
                {
                  width: 92
                },
                {
                  width: 220
                },
                {
                  width: 92
                },
                {
                  width: 220
                }
              ],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '报告名称' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '鼻咽部磁共振平扫' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '报告日期' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '2022-11-24 12:00' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const rowList = draw.getRowList()
      const firstRow = rowList[0]
      const inlineTableIndex = firstRow.elementList.findIndex(
        (element: any) => element.type === ElementType.TABLE
      )
      expect(inlineTableIndex).to.be.greaterThan(0)

      const positionList = draw.getPosition().getOriginalPositionList()
      const labelPosition = positionList[inlineTableIndex - 1]
      const tablePosition = positionList[inlineTableIndex]
      expect(labelPosition.value).to.eq(':')
      expect(tablePosition.rowNo).to.eq(labelPosition.rowNo)
      expect(tablePosition.coordinate.leftTop[0]).to.be.at.least(
        labelPosition.coordinate.rightTop[0]
      )
      const labelVisualTop =
        labelPosition.coordinate.leftTop[1] +
        labelPosition.ascent -
        labelPosition.metrics.boundingBoxAscent
      const tableVisualTop = tablePosition.coordinate.leftTop[1]
      const options = draw.getOptions()
      const rowMargin =
        options.defaultBasicRowMarginHeight * options.defaultRowMargin
      expect(labelVisualTop).to.be.at.least(tableVisualTop)
      expect(labelVisualTop - tableVisualTop).to.be.closeTo(rowMargin, 1)
    })
  })

  it('supports table operations when the inline table context index is stale', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(900, 500)
      editor.command.executeSetPaperMargin([40, 40, 40, 40])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'A:'
            },
            {
              type: ElementType.TABLE,
              value: '',
              tableDisplay: TableDisplay.INLINE,
              colgroup: [{ width: 100 }, { width: 100 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '1' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '2' }]
                    }
                  ]
                },
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '3' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '4' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const table = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      expect(table?.id).to.be.a('string')

      const setStaleInlineTableContext = () => {
        draw.getPosition().setPositionContext({
          isTable: true,
          index: 9999,
          trIndex: 0,
          tdIndex: 0,
          tableId: table!.id
        })
        draw.getRange().setRange(0, 0, table!.id, 0, 0, 0, 0)
      }

      setStaleInlineTableContext()
      expect(() => editor.command.executeInsertTableBottomRow()).not.to.throw()
      let nextTable = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      expect(nextTable?.trList).to.have.length(3)

      setStaleInlineTableContext()
      expect(() => editor.command.executeInsertTableRightCol()).not.to.throw()
      nextTable = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      expect(nextTable?.colgroup).to.have.length(3)

      setStaleInlineTableContext()
      expect(() => editor.command.executeTableBorderColor('#ff0000')).not.to.throw()
      nextTable = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      expect(nextTable?.borderColor).to.eq('#ff0000')

      setStaleInlineTableContext()
      expect(() => editor.command.executeDeleteTable()).not.to.throw()
      const value = editor.command.getValue().data.main
      expect(value.some(element => element.type === 'table')).to.eq(false)
      expect(value.map(element => element.value).join('')).to.contain('A:')
    })
  })

  it('keeps inline table cell hit bounds aligned after leading text', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(900, 500)
      editor.command.executeSetPaperMargin([40, 40, 40, 40])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'ssssss'
            },
            {
              type: ElementType.TABLE,
              value: '',
              tableDisplay: TableDisplay.INLINE,
              colgroup: [{ width: 100 }, { width: 100 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'B' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: 'A' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const table = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      const positionList = draw.getPosition().getOriginalPositionList()
      const tablePosition = positionList.find(
        (position: any) => position.element?.type === ElementType.TABLE
      )
      expect(tablePosition).to.exist

      const cellBounds = draw
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds(table!.id)
      expect(cellBounds).to.have.length(2)
      expect(cellBounds[0].x).to.be.closeTo(
        tablePosition.coordinate.leftTop[0],
        1
      )
      expect(cellBounds[1].x).to.be.closeTo(
        tablePosition.coordinate.leftTop[0] + 100,
        1
      )

      const hit = draw.getComponents().tableHitTestService.resolve({
        x: cellBounds[1].x + cellBounds[1].width / 2,
        y: cellBounds[1].y + cellBounds[1].height / 2,
        pageNo: tablePosition.pageNo,
        pagePoint: {
          x: cellBounds[1].x + cellBounds[1].width / 2,
          y: cellBounds[1].y + cellBounds[1].height / 2,
          pageIndex: String(tablePosition.pageNo)
        },
        startPosition: null
      })
      expect(hit.positionResult?.isTable).to.eq(true)
      expect(hit.positionResult?.tdIndex).to.eq(1)
    })
  })

  it('does not highlight another inline table with the same row and column indexes', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(900, 500)
      editor.command.executeSetPaperMargin([40, 40, 40, 40])
      const inlineTable = (first: string, second: string) => ({
        type: ElementType.TABLE,
        value: '',
        tableDisplay: TableDisplay.INLINE,
        colgroup: [{ width: 100 }, { width: 100 }],
        trList: [
          {
            height: 32,
            tdList: [
              {
                colspan: 1,
                rowspan: 1,
                value: [{ value: first }]
              },
              {
                colspan: 1,
                rowspan: 1,
                value: [{ value: second }]
              }
            ]
          }
        ]
      })
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'A:'
            },
            inlineTable('A1', 'A2') as any,
            {
              value: '\nB:'
            },
            inlineTable('B1', 'B2') as any
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const tables = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.filter(element => element.type === 'table')
      expect(tables).to.have.length(2)

      const range = draw.getRange()
      const renderCalls: Array<{ x: number; y: number; width: number; height: number }> = []
      const rawRender = range.render.bind(range)
      range.render = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        renderCalls.push({ x, y, width, height })
        rawRender(ctx, x, y, width, height)
      }

      draw.getPosition().setPositionContext({
        isTable: true,
        index: draw
          .getOriginalElementList()
          .findIndex((element: any) => element.id === tables[0].id),
        trIndex: 0,
        tdIndex: 0,
        tableId: tables[0].id
      })
      range.setRange(0, 0, tables[0].id, 0, 1, 0, 0)
      const firstBounds = draw
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds(tables[0].id)
      const secondBounds = draw
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds(tables[1].id)
      const originalTables = tables.map(table =>
        draw
          .getOriginalElementList()
          .find((element: any) => element.id === table.id)
      )
      originalTables.forEach((table: any) => {
        table.trList[0].tdList.forEach((td: any, tdIndex: number) => {
          draw.drawSelection(draw.getPage(0).getContext('2d'), {
            elementList: td.value,
            positionList: td.positionList,
            rowList: td.rowList,
            pageNo: 0,
            startIndex: 0,
            innerWidth: td.width,
            zone: range.getEditBoundaryRange().zone,
            tableCellContext: {
              tableId: table.id,
              trId: table.trList[0].id,
              tdId: td.id,
              trIndex: 0,
              tdIndex
            }
          })
        })
      })
      expect(renderCalls).to.have.length(2)
      expect(renderCalls.map(call => call.x)).to.deep.eq(
        firstBounds.map(bounds => bounds.x)
      )
      expect(renderCalls.some(call => call.y === secondBounds[0].y)).to.eq(false)
    })
  })

  it('draws inline table range from the table origin instead of the row origin', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(900, 500)
      editor.command.executeSetPaperMargin([40, 40, 40, 40])
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 's:'
            },
            {
              type: ElementType.TABLE,
              value: '',
              tableDisplay: TableDisplay.INLINE,
              colgroup: [{ width: 100 }, { width: 100 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '1' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '2' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const table = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      const tablePosition = draw
        .getPosition()
        .getOriginalPositionList()
        .find((position: any) => position.element?.id === table!.id)
      expect(tablePosition).to.exist

      const tableParticle = draw.getTableParticle()
      const drawRangeCalls: Array<{ x: number; y: number }> = []
      const rawDrawRange = tableParticle.drawRange.bind(tableParticle)
      tableParticle.drawRange = (
        ctx: CanvasRenderingContext2D,
        element: any,
        x: number,
        y: number
      ) => {
        drawRangeCalls.push({ x, y })
        rawDrawRange(ctx, element, x, y)
      }

      draw.getPosition().setPositionContext({
        isTable: true,
        index: draw
          .getOriginalElementList()
          .findIndex((element: any) => element.id === table!.id),
        trIndex: 0,
        tdIndex: 0,
        tableId: table!.id
      })
      draw.getRange().setRange(0, 0, table!.id, 0, 1, 0, 0)
      draw.drawRow(draw.getPage(0).getContext('2d'), {
        elementList: draw.getLayoutMainElementList(),
        positionList: draw.getPosition().getLayoutMainPositionListByPage(0),
        rowList: draw.getPageRowList()[0],
        pageNo: 0,
        startIndex: draw.getPageRowList()[0][0]?.startIndex,
        innerWidth: draw.getInnerWidth(),
        zone: draw.getRange().getEditBoundaryRange().zone
      })

      expect(drawRangeCalls).to.have.length(1)
      expect(drawRangeCalls[0].x).to.eq(tablePosition.coordinate.leftTop[0])
    })
  })

  it('keeps the first inline table fragment on the current page when a tall cell is split', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperSize(760, 420)
      editor.command.executeSetPaperMargin([40, 40, 40, 40])
      const filler = Array.from({ length: 13 }, () => ({
        value: 'EOF\n'
      })).flat()
      const longCellText =
        '否认14天内去过以下场所：水产、肉类批发市场，农贸市场，集市，大型超市，夜市；'.repeat(8)
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            ...filler,
            {
              value: 'ss'
            },
            {
              type: ElementType.TABLE,
              value: '',
              tableDisplay: TableDisplay.INLINE,
              colgroup: [{ width: 260 }, { width: 180 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: longCellText }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '2' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const tableRows = draw
        .getPageRowList()
        .map((pageRows: any[], pageNo: number) => ({
          pageNo,
          rows: pageRows.filter(row => row.tableFragment)
        }))
        .filter(item => item.rows.length)
      expect(tableRows.length).to.be.greaterThan(1)
      expect(tableRows[0].pageNo).to.be.greaterThan(0)
      expect(tableRows[0].rows[0].elementList.some((element: any) => element.value === 's')).to.eq(true)
      expect(tableRows[1].pageNo).to.eq(tableRows[0].pageNo + 1)
      expect(tableRows[1].rows[0].elementList.some((element: any) => element.value === 's')).to.eq(false)
    })
  })

  it('supports merging cells in an inline table', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: [
            {
              value: 'B:'
            },
            {
              type: ElementType.TABLE,
              value: '',
              tableDisplay: TableDisplay.INLINE,
              colgroup: [{ width: 80 }, { width: 80 }],
              trList: [
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '1' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '2' }]
                    }
                  ]
                },
                {
                  height: 32,
                  tdList: [
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '3' }]
                    },
                    {
                      colspan: 1,
                      rowspan: 1,
                      value: [{ value: '4' }]
                    }
                  ]
                }
              ]
            }
          ],
          footer: []
        },
        {
          isSetCursor: false
        } as any
      )

      const draw = (editor as any).draw
      const table = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      draw.getPosition().setPositionContext({
        isTable: true,
        index: 9999,
        trIndex: 0,
        tdIndex: 0,
        tableId: table!.id
      })
      draw.getRange().setRange(0, 0, table!.id, 0, 1, 0, 1)

      expect(() => editor.command.executeMergeTableCell()).not.to.throw()
      const mergedTable = editor.command
        .getValue({
          extraPickAttrs: ['id']
        })
        .data.main.find(element => element.type === 'table')
      expect(mergedTable?.trList?.[0].tdList?.[0].colspan).to.eq(2)
      expect(mergedTable?.trList?.[0].tdList?.[0].rowspan).to.eq(2)
    })
  })
})
