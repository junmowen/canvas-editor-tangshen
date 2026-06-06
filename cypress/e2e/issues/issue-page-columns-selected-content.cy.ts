import type Editor from '../../../src/editor'

/** 覆盖 TS-03 选中内容分栏，验证段落级分栏不影响前后正文。 */
describe('typesetting selected content columns', () => {
  const pageHeight = 260

  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  function findElementIndexByTextOffset(elementList: any[], textOffset: number) {
    let offset = 0
    for (let index = 0; index < elementList.length; index++) {
      offset += String(elementList[index].value).length
      if (offset > textOffset) {
        return index
      }
    }
    return -1
  }

  function applySelectedLocalColumns(
    editor: Editor,
    startText: string,
    endText: string
  ) {
    const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
    const fullText = elementList.map((element: any) => element.value).join('')
    editor.command.executeSetRange(
      findElementIndexByTextOffset(elementList, fullText.indexOf(startText)),
      findElementIndexByTextOffset(elementList, fullText.indexOf(endText)) - 1
    )
    editor.command.executeRowColumns({
      count: 2,
      gap: 20,
      widths: [160, 160]
    })
  }

  function getRowsWithElementFlag(editor: Editor, flag: string) {
    return (editor as any).draw
      .getPageRowList()
      .flatMap((pageRows: any[], pageNo: number) => {
        return pageRows
          .map((row: any, rowNo: number) => ({ row, pageNo, rowNo }))
          .filter(({ row }: any) => {
            return row.elementList.some((element: any) => element[flag])
          })
      })
  }

  function expectNoFlagPositionOverflow(editor: Editor, flag: string) {
    const overflowPositionList = (editor as any).draw
      .getCoordinate()
      .getMainPositionList()
      .filter((position: any) => {
        return position.element?.[flag] && position.coordinate.leftBottom[1] > pageHeight + 0.5
      })
    expect(
      overflowPositionList.length,
      JSON.stringify(overflowPositionList.slice(0, 3))
    ).to.eq(0)
  }

  /** 验证命令 API 可对选中段落写入局部分栏并参与真实行流。 */
  it('applies columns only to selected paragraphs and keeps surrounding text single-column', () => {
    cy.getEditor().then((editor: Editor) => {
      const before = Array.from({ length: 3 }).flatMap((_, index) => [
        { value: `前置正文第${index + 1}行` },
        { value: '\n' }
      ])
      const selected = Array.from({ length: 18 }).flatMap((_, index) => [
        { value: `选中分栏正文第${index + 1}行` },
        { value: '\n' }
      ])
      const after = Array.from({ length: 2 }).flatMap((_, index) => [
        { value: `后置正文第${index + 1}行` },
        { value: '\n' }
      ])

      editor.command.executeUpdateOptions({
        width: 420,
        height: 320,
        margins: [20, 20, 20, 20],
        columns: {
          count: 1,
          gap: 0,
          widths: []
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
        main: [...before, ...selected, ...after]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const fullText = elementList.map((element: any) => element.value).join('')
      const selectedStartTextOffset = fullText.indexOf('选中分栏正文第1行')
      const selectedEndTextOffset = fullText.indexOf('后置正文第1行')
      const findElementIndexByTextOffset = (textOffset: number) => {
        let offset = 0
        for (let index = 0; index < elementList.length; index++) {
          offset += String(elementList[index].value).length
          if (offset > textOffset) {
            return index
          }
        }
        return -1
      }
      const selectedStartIndex = findElementIndexByTextOffset(
        selectedStartTextOffset
      )
      const selectedEndIndex = findElementIndexByTextOffset(
        selectedEndTextOffset
      )
      expect(selectedStartIndex).to.be.greaterThan(0)
      expect(selectedEndIndex).to.be.greaterThan(selectedStartIndex)

      editor.command.executeSetRange(selectedStartIndex, selectedEndIndex - 1)
      editor.command.executeRowColumns({
        count: 2,
        gap: 20,
        widths: [160, 160]
      })

      const value = editor.command.getValue().data.main
      const selectedValue = value.filter((element: any) => element.columns)
      const surroundingValue = value.filter((element: any) => !element.columns)
      expect(selectedValue.length).to.be.greaterThan(0)
      expect(selectedValue.every((element: any) => element.columns?.count === 2))
        .to.eq(true)
      expect(surroundingValue.some((element: any) =>
        String(element.value).includes('前置正文')
      )).to.eq(true)
      expect(surroundingValue.some((element: any) =>
        String(element.value).includes('后置正文')
      )).to.eq(true)

      const firstPageRows = (editor as any).draw.getPageRowList()[0]
      const selectedRows = firstPageRows.filter((row: any) =>
        row.elementList.map((element: any) => element.value).join('')
          .includes('选中分栏正文')
      )
      const beforeRows = firstPageRows.filter((row: any) =>
        row.elementList.map((element: any) => element.value).join('')
          .includes('前置正文')
      )
      expect(selectedRows.some((row: any) => row.columnIndex === 1)).to.eq(true)
      expect(selectedRows.every((row: any) => row.columns?.count === 2)).to.eq(true)
      expect(beforeRows.every((row: any) => !row.columns && row.columnIndex === 0))
        .to.eq(true)

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const firstPage = snapshot.pageList[0]
      expect(firstPage.columnList[1].paragraphBlockList.length).to.be.greaterThan(0)

      const secondColumnRow = selectedRows.find(
        (row: any) => row.columnIndex === 1
      )
      const secondColumnRowNo = firstPageRows.indexOf(secondColumnRow)
      const secondColumnPosition = (editor as any).draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => {
          return position.pageNo === 0 && position.rowNo === secondColumnRowNo
        })
      expect(secondColumnPosition.coordinate.leftTop[0]).to.be.gte(
        firstPage.columnList[1].rect.x
      )
      expect(secondColumnPosition.coordinate.leftTop[1]).to.be.greaterThan(
        firstPage.contentRect.y
      )
    })
  })

  /** 验证长段落会按局部分栏首栏宽度重新换行，避免横向溢出。 */
  it('wraps selected long paragraphs by the local column width', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
        margins: [20, 20, 20, 20],
        columns: {
          count: 1,
          gap: 0,
          widths: []
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
      const selectedText =
        '长段落选区内容需要按照局部分栏宽度换行，不能继续使用页面整栏宽度。'.repeat(
          12
        )
      editor.command.executeSetValue({
        main: [
          { value: '前置正文保持单栏。\n' },
          ...Array.from(selectedText).map(value => ({ value })),
          { value: '\n后置正文保持单栏。' }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const fullText = elementList.map((element: any) => element.value).join('')
      const selectedStartTextOffset = fullText.indexOf('长段落选区内容')
      const selectedEndTextOffset = fullText.indexOf('后置正文保持单栏')
      const findElementIndexByTextOffset = (textOffset: number) => {
        let offset = 0
        for (let index = 0; index < elementList.length; index++) {
          offset += String(elementList[index].value).length
          if (offset > textOffset) {
            return index
          }
        }
        return -1
      }

      editor.command.executeSetRange(
        findElementIndexByTextOffset(selectedStartTextOffset),
        findElementIndexByTextOffset(selectedEndTextOffset) - 1
      )
      editor.command.executeRowColumns({
        count: 2,
        gap: 20,
        widths: [140, 140]
      })

      const selectedRows = (editor as any).draw
        .getPageRowList()
        .flat()
        .filter((row: any) =>
          row.elementList.some((element: any) => element.columns?.count === 2)
        )
      const localColumnWidth = (editor as any).draw
        .getServices()
        .pageColumnLayoutService.getPrimaryColumnWidth(0, {
          count: 2,
          gap: 20,
          widths: [140, 140]
        })
      expect(selectedRows.length).to.be.greaterThan(1)
      const overflowRows = selectedRows
        .map((row: any) => row.width)
        .filter((width: number) => width > localColumnWidth + 8)
      expect(
        overflowRows.length,
        JSON.stringify({ localColumnWidth, overflowRows: overflowRows.slice(0, 5) })
      ).to.eq(0)
      expect(selectedRows.some((row: any) => row.columnIndex === 1)).to.eq(true)
    })
  })

  /** 验证选中内容分栏会均衡铺满目标栏数，避免出现少栏。 */
  it('balances selected content across every requested local column', () => {
    cy.getEditor().then((editor: Editor) => {
      const columnCountList = [2, 3, 4]
      columnCountList.forEach(count => {
        const selected = Array.from({ length: 17 }).flatMap((_, index) => [
          { value: `均衡分栏第${index + 1}行` },
          { value: '\n' }
        ])
        editor.command.executeUpdateOptions({
          width: 620,
          height: 720,
          margins: [20, 20, 20, 20],
          columns: {
            count: 1,
            gap: 0,
            widths: []
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
            { value: '前置正文。\n' },
            ...selected,
            { value: '后置正文。' }
          ]
        })

        const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
        const fullText = elementList.map((element: any) => element.value).join('')
        const findElementIndexByTextOffset = (textOffset: number) => {
          let offset = 0
          for (let index = 0; index < elementList.length; index++) {
            offset += String(elementList[index].value).length
            if (offset > textOffset) {
              return index
            }
          }
          return -1
        }
        editor.command.executeSetRange(
          findElementIndexByTextOffset(fullText.indexOf('均衡分栏第1行')),
          findElementIndexByTextOffset(fullText.indexOf('后置正文')) - 1
        )
        editor.command.executeRowColumns({
          count,
          gap: 20,
          widths: []
        })

        const selectedRows = (editor as any).draw
          .getPageRowList()
          .flat()
          .filter((row: any) => row.columns?.count === count)
        const usedColumnIndexList = Array.from(
          new Set(selectedRows.map((row: any) => row.columnIndex))
        )
        expect(usedColumnIndexList).to.have.length(count)
        const columnHeightList = Array.from({ length: count }).map((_, columnIndex) => {
          return selectedRows
            .filter((row: any) => row.columnIndex === columnIndex)
            .reduce((height: number, row: any) => {
              return height + row.height + (row.offsetY || 0)
            }, 0)
        })
        const leadingColumnHeightList = columnHeightList.slice(0, -1)
        const maxRowHeight = Math.max(
          ...selectedRows.map((row: any) => row.height + (row.offsetY || 0))
        )
        expect(
          Math.max(...leadingColumnHeightList) - Math.min(...leadingColumnHeightList)
        ).to.be.lte(maxRowHeight)
        expect(columnHeightList[columnHeightList.length - 1]).to.be.lte(
          Math.min(...leadingColumnHeightList)
        )
      })
    })
  })

  /** 验证同一高度存在多栏行时，鼠标命中会按 X 轴进入中间栏。 */
  it('hit-tests selected local column rows by their horizontal column range', () => {
    cy.getEditor().then((editor: Editor) => {
      const selected = Array.from({ length: 17 }).flatMap((_, index) => [
        { value: `鼠标命中分栏第${index + 1}行` },
        { value: '\n' }
      ])
      editor.command.executeUpdateOptions({
        width: 620,
        height: 720,
        margins: [20, 20, 20, 20],
        columns: {
          count: 1,
          gap: 0,
          widths: []
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
          { value: '前置正文。\n' },
          ...selected,
          { value: '后置正文。' }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const fullText = elementList.map((element: any) => element.value).join('')
      const findElementIndexByTextOffset = (textOffset: number) => {
        let offset = 0
        for (let index = 0; index < elementList.length; index++) {
          offset += String(elementList[index].value).length
          if (offset > textOffset) {
            return index
          }
        }
        return -1
      }
      editor.command.executeSetRange(
        findElementIndexByTextOffset(fullText.indexOf('鼠标命中分栏第1行')),
        findElementIndexByTextOffset(fullText.indexOf('后置正文')) - 1
      )
      editor.command.executeRowColumns({
        count: 4,
        gap: 20,
        widths: []
      })

      const firstPageRows = (editor as any).draw.getPageRowList()[0]
      const positionList = (editor as any).draw
        .getCoordinate()
        .getMainPositionList()
      const hitColumnIndexList = [1, 2]
      hitColumnIndexList.forEach(columnIndex => {
        const targetRow = firstPageRows.find((row: any) => {
          return row.columns?.count === 4 && row.columnIndex === columnIndex
        })
        expect(targetRow).to.exist
        const rowNo = firstPageRows.indexOf(targetRow)
        const rowPositionList = positionList.filter((position: any) => {
          return position.pageNo === 0 && position.rowNo === rowNo
        })
        const targetPosition = rowPositionList.find((position: any) => {
          return position.coordinate.rightTop[0] - position.coordinate.leftTop[0] > 4
        })
        expect(targetPosition).to.exist
        const x =
          targetPosition.coordinate.leftTop[0] +
          (targetPosition.coordinate.rightTop[0] -
            targetPosition.coordinate.leftTop[0]) *
            0.75
        const y =
          targetPosition.coordinate.leftTop[1] +
          (targetPosition.coordinate.leftBottom[1] -
            targetPosition.coordinate.leftTop[1]) /
            2
        const hitPosition = (editor as any).draw.getCoordinate().getPositionByXY({
          x,
          y,
          pageNo: 0
        })
        const hitIndex = hitPosition.hitTargetIndex ?? hitPosition.index
        expect(rowPositionList.map((position: any) => position.index)).to.include(
          hitIndex
        )
      })
    })
  })

  /** 验证选中内容分栏跨页时，会在下一页第一栏继续承接，不能把局部分栏小节撑出页面。 */
  it('continues a long selected local column section on the next page', () => {
    cy.getEditor().then((editor: Editor) => {
      const selected = Array.from({ length: 64 }).flatMap((_, index) => [
        { value: `跨页分栏第${index + 1}行` },
        { value: '\n' }
      ])
      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
        margins: [20, 20, 20, 20],
        columns: {
          count: 1,
          gap: 0,
          widths: []
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
          { value: '前置正文。\n' },
          ...selected,
          { value: '后置正文。' }
        ]
      })

      const elementList = (editor as any).draw.getObjectResolver().getOriginalMainElementList()
      const fullText = elementList.map((element: any) => element.value).join('')
      const findElementIndexByTextOffset = (textOffset: number) => {
        let offset = 0
        for (let index = 0; index < elementList.length; index++) {
          offset += String(elementList[index].value).length
          if (offset > textOffset) {
            return index
          }
        }
        return -1
      }

      editor.command.executeSetRange(
        findElementIndexByTextOffset(fullText.indexOf('跨页分栏第1行')),
        findElementIndexByTextOffset(fullText.indexOf('后置正文')) - 1
      )
      editor.command.executeRowColumns({
        count: 2,
        gap: 20,
        widths: [160, 160]
      })

      const pageRowList = (editor as any).draw.getPageRowList()
      const localRowsByPage = pageRowList.map((pageRows: any[]) => {
        return pageRows.filter((row: any) => row.columns?.count === 2)
      })
      expect(pageRowList.length).to.be.greaterThan(1)
      expect(localRowsByPage[0].some((row: any) => row.columnIndex === 1)).to.eq(true)
      expect(localRowsByPage.slice(1).some((pageRows: any[]) => {
        return pageRows.some((row: any) => row.columnIndex === 0)
      })).to.eq(true)

      const localPositionList = (editor as any).draw
        .getCoordinate()
        .getMainPositionList()
        .filter((position: any) => position.element?.columns?.count === 2)
      expect(localPositionList.length).to.be.greaterThan(0)
      const overflowPositionList = localPositionList.filter((position: any) => {
        return position.coordinate.leftBottom[1] > 260.5
      })
      expect(
        overflowPositionList.length,
        JSON.stringify(overflowPositionList.slice(0, 3))
      ).to.eq(0)
    })
  })

  /** 验证选中内容分栏跨页时，keepLines 长段不会被均衡分栏拆到不同栏或页。 */
  it('keeps selected keepLines paragraphs intact across local column page breaks', () => {
    cy.getEditor().then((editor: Editor) => {
      const leadingSelectedRows = Array.from({ length: 9 }).flatMap((_, index) => [
        { value: `局部前导第${index + 1}行` },
        { value: '\n' }
      ])
      const trailingSelectedRows = Array.from({ length: 36 }).flatMap((_, index) => [
        { value: `局部后续第${index + 1}行` },
        { value: '\n' }
      ])
      editor.command.executeUpdateOptions({
        width: 420,
        height: pageHeight,
        margins: [20, 20, 20, 20],
        columns: {
          count: 1,
          gap: 0,
          widths: []
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
          { value: '前置正文。\n' },
          ...leadingSelectedRows,
          {
            value: '整段同栏局部分栏内容需要保持完整承接不能被页面或栏边界拆散。'.repeat(
              2
            ),
            keepLines: true
          },
          { value: '\n' },
          ...trailingSelectedRows,
          { value: '后置正文。' }
        ]
      })

      applySelectedLocalColumns(editor, '局部前导第1行', '后置正文')

      const pageRowList = (editor as any).draw.getPageRowList()
      const keepLineRows = getRowsWithElementFlag(editor, 'keepLines')
      expect(pageRowList.length, '局部分栏小节应跨页').to.be.greaterThan(1)
      expect(keepLineRows.length, 'keepLines 段落应形成多行').to.be.greaterThan(1)
      expect(
        new Set(
          keepLineRows.map(({ row, pageNo }: any) => `${pageNo}:${row.columnIndex}`)
        ).size,
        'keepLines 段落所有行应保持在同一页同一栏'
      ).to.eq(1)
      expectNoFlagPositionOverflow(editor, 'keepLines')
    })
  })

  /** 验证选中内容分栏跨页时，widowControl 长段首尾不会孤立承接或产生 y 溢出。 */
  it('keeps selected widowControl paragraphs from isolated local column continuations', () => {
    cy.getEditor().then((editor: Editor) => {
      const leadingSelectedRows = Array.from({ length: 12 }).flatMap((_, index) => [
        { value: `孤行前导第${index + 1}行` },
        { value: '\n' }
      ])
      const trailingSelectedRows = Array.from({ length: 36 }).flatMap((_, index) => [
        { value: `孤行后续第${index + 1}行` },
        { value: '\n' }
      ])
      editor.command.executeUpdateOptions({
        width: 420,
        height: pageHeight,
        margins: [20, 20, 20, 20],
        columns: {
          count: 1,
          gap: 0,
          widths: []
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
          { value: '前置正文。\n' },
          ...leadingSelectedRows,
          {
            value: '孤行控制局部分栏长段需要在页面和栏边界保持正确承接。'.repeat(
              4
            ),
            widowControl: true
          },
          { value: '\n' },
          ...trailingSelectedRows,
          { value: '后置正文。' }
        ]
      })

      applySelectedLocalColumns(editor, '孤行前导第1行', '后置正文')

      const pageRowList = (editor as any).draw.getPageRowList()
      const widowRows = getRowsWithElementFlag(editor, 'widowControl')
      const widowSegments = widowRows.reduce((segments: any[][], current: any) => {
        const previousSegment = segments[segments.length - 1]
        const previous = previousSegment?.[previousSegment.length - 1]
        if (
          previous &&
          previous.pageNo === current.pageNo &&
          previous.row.columnIndex === current.row.columnIndex
        ) {
          previousSegment.push(current)
        } else {
          segments.push([current])
        }
        return segments
      }, [])

      expect(pageRowList.length, '局部分栏小节应跨页').to.be.greaterThan(1)
      expect(widowRows.length, 'widowControl 段落应形成多行').to.be.greaterThan(2)
      expect(
        widowSegments[0].length,
        'widowControl 段落首段承接至少应包含两行'
      ).to.be.gte(2)
      expect(
        widowSegments[widowSegments.length - 1].length,
        'widowControl 段落尾段承接至少应包含两行'
      ).to.be.gte(2)
      expectNoFlagPositionOverflow(editor, 'widowControl')
    })
  })

  /** 验证选中内容局部分栏跨页承接时，行栏元数据和页面坐标不会越界。 */
  it('keeps row column metadata bounded when selected local columns continue across pages', () => {
    cy.getEditor().then((editor: Editor) => {
      const leadingSelectedRows = Array.from({ length: 8 }).flatMap((_, index) => [
        { value: `元数据前导第${index + 1}行` },
        { value: '\n' }
      ])
      const trailingSelectedRows = Array.from({ length: 48 }).flatMap((_, index) => [
        { value: `元数据后续第${index + 1}行` },
        { value: '\n' }
      ])

      editor.command.executeUpdateOptions({
        width: 420,
        height: pageHeight,
        margins: [20, 20, 20, 20],
        columns: {
          count: 1,
          gap: 0,
          widths: []
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
          { value: '前置正文占位。\n' },
          ...leadingSelectedRows,
          {
            value: '跨页承接的整段同栏内容需要携带 keepLines 并稳定落在同一栏。'.repeat(
              2
            ),
            keepLines: true
          },
          { value: '\n' },
          ...trailingSelectedRows,
          { value: '后置正文。' }
        ]
      })

      applySelectedLocalColumns(editor, '元数据前导第1行', '后置正文')

      const pageRowList = (editor as any).draw.getPageRowList()
      const localRows = pageRowList.flatMap((pageRows: any[], pageNo: number) => {
        return pageRows
          .map((row: any, rowNo: number) => ({ row, pageNo, rowNo }))
          .filter(({ row }: any) => row.columns?.count === 2)
      })
      const localPageNoList = Array.from(
        new Set(localRows.map(({ pageNo }: any) => pageNo))
      )
      const positionList = (editor as any).draw
        .getCoordinate()
        .getMainPositionList()

      expect(localRows.length, '应产生局部分栏行').to.be.greaterThan(0)
      expect(localPageNoList.length, '局部分栏内容应跨页承接').to.be.greaterThan(1)
      expect(localRows.some(({ row }: any) => row.columnIndex === 1)).to.eq(true)
      expect(localRows.some(({ pageNo, row }: any) => {
        return pageNo > 0 && row.columnIndex === 0
      })).to.eq(true)

      localRows.forEach(({ row, pageNo, rowNo }: any) => {
        const layout = (editor as any).draw
          .getServices()
          .pageColumnLayoutService.getPageColumnLayout(pageNo, row.columns)
        const column = layout.columnList[row.columnIndex]
        expect(
          row.columnIndex,
          JSON.stringify({ pageNo, rowNo, columnIndex: row.columnIndex })
        ).to.be.within(0, layout.columnList.length - 1)
        expect(column, JSON.stringify({ pageNo, rowNo })).to.exist
        if (row.columnStartY !== undefined) {
          expect(
            row.columnStartY,
            JSON.stringify({ pageNo, rowNo, columnStartY: row.columnStartY })
          ).to.be.gte(layout.contentRect.y)
          expect(
            row.columnStartY,
            JSON.stringify({
              pageNo,
              rowNo,
              columnStartY: row.columnStartY,
              contentBottom: layout.contentRect.y + layout.contentRect.height
            })
          ).to.be.lte(layout.contentRect.y + layout.contentRect.height)
        }

        const rowPositionList = positionList.filter((position: any) => {
          return position.pageNo === pageNo && position.rowNo === rowNo
        })
        expect(rowPositionList.length, JSON.stringify({ pageNo, rowNo }))
          .to.be.greaterThan(0)
        rowPositionList.forEach((position: any) => {
          expect(position.pageNo).to.be.within(0, pageRowList.length - 1)
          expect(position.coordinate.leftTop[1]).to.be.gte(layout.contentRect.y)
          expect(position.coordinate.leftBottom[1]).to.be.lte(pageHeight + 0.5)
          expect(position.coordinate.leftTop[0]).to.be.gte(column.rect.x)
          expect(position.coordinate.rightTop[0]).to.be.lte(
            column.rect.x + column.rect.width + 0.5
          )
        })
      })

      const firstRowByPage = localRows.reduce((map: Map<number, any>, current: any) => {
        if (!map.has(current.pageNo)) {
          map.set(current.pageNo, current.row)
        }
        return map
      }, new Map<number, any>())
      localPageNoList.filter((pageNo: number) => pageNo > 0).forEach(pageNo => {
        const firstRow = firstRowByPage.get(pageNo)
        expect(firstRow?.columnIndex, `page ${pageNo} should restart at first column`)
          .to.eq(0)
        expect(firstRow?.columnStartY, `page ${pageNo} should restart at content top`)
          .to.eq(undefined)
      })

      const keepLineRows = getRowsWithElementFlag(editor, 'keepLines')
      expect(keepLineRows.length, 'keepLines 长段应形成多行').to.be.greaterThan(1)
      expect(
        keepLineRows.every(({ row }: any) => row.columns?.count === 2),
        'keepLines 长段应参与选区局部分栏'
      ).to.eq(true)
      expectNoFlagPositionOverflow(editor, 'keepLines')
    })
  })
})
