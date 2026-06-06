import type Editor from '../../../src/editor'
import { ListType } from '../../../src/editor/dataset/enum/List'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'
import { applyDragCommitMutation } from '../../../src/editor/core/event/pointer/intents/drag-drop/DragCommitMutationIntent'
import {
  getRowDragHandleBounds,
  resolveRowDragHandleAtPoint
} from '../../../src/editor/core/event/pointer/row-drag/RowDragHandle'

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getObjectResolver().getOriginalMainElementList()
}

function getText(editor: Editor) {
  return editor.command.getText().main.replace(/\u200B/g, '')
}

function setOrderedListValue(editor: Editor) {
  editor.command.executeSetValue({
    main: [
      {
        value: '',
        type: 'list' as any,
        listType: ListType.OL,
        valueList: [
          { value: '\n' },
          { value: '第一项' },
          { value: '\n' },
          { value: '第二项' },
          { value: '\n' },
          { value: '第三项' }
        ]
      }
    ]
  })
}

function setTitleAndListValue(editor: Editor) {
  editor.command.executeSetValue({
    main: [
      {
        value: '',
        type: 'title' as any,
        level: TitleLevel.FIRST,
        valueList: [{ value: '流行病史：' }]
      },
      { value: '\n否认特殊接触史。\n' },
      {
        value: '',
        type: 'title' as any,
        level: TitleLevel.FIRST,
        valueList: [{ value: '体格检查：' }]
      },
      { value: '\nT：39.5℃，P：80bpm。\n' },
      {
        value: '',
        type: 'list' as any,
        listType: ListType.OL,
        valueList: [
          { value: '\n' },
          { value: '第一项' },
          { value: '\n' },
          { value: '第二项' }
        ]
      }
    ]
  })
}

function getRowHandlePoint(draw: any, row: any) {
  const positionList = draw
    .getCoordinate()
    .getMainPositionListByPage(0)
    .slice(row.startIndex, row.startIndex + row.elementList.length)
  const bounds = getRowDragHandleBounds({
    row,
    rowPositionList: positionList,
    scale: draw.getOptions().scale
  })
  expect(bounds).to.not.eq(null)
  return {
    pageNo: 0,
    x: Math.floor(bounds!.x + bounds!.width / 2),
    y: Math.floor(bounds!.y + bounds!.height / 2)
  }
}

function getRowHandleBounds(draw: any, row: any) {
  const positionList = draw
    .getCoordinate()
    .getMainPositionListByPage(0)
    .slice(row.startIndex, row.startIndex + row.elementList.length)
  const bounds = getRowDragHandleBounds({
    row,
    rowPositionList: positionList,
    scale: draw.getOptions().scale
  })
  expect(bounds).to.not.eq(null)
  return bounds!
}

function getTextRange(draw: any, text: string) {
  const elementList = draw.getObjectResolver().getElementList()
  const chars = Array.from(text)
  const startIndex = elementList.findIndex((element: any, index: number) =>
    chars.every((char, offset) => elementList[index + offset]?.value === char)
  )
  expect(startIndex).to.be.greaterThan(-1)
  return {
    startIndex: startIndex - 1,
    endIndex: startIndex + chars.length - 1
  }
}

function selectText(editor: Editor, text: string) {
  const draw = (editor as any).draw
  const range = getTextRange(draw, text)
  editor.command.executeSetRange(range.startIndex, range.endIndex)
  return range
}

describe('issue #621 list item drag reorder', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps ordered-list context when moving a selected list paragraph', () => {
    cy.getEditor().then((editor: Editor) => {
      setOrderedListValue(editor)

      const originalListId = getOriginalElements(editor).find(
        (element: any) => element.value === '第'
      ).listId

      const draw = (editor as any).draw
      const elementList = draw.getObjectResolver().getElementList()
      const firstSecondItemIndex = elementList.findIndex(
        (element: any, index: number) =>
          element.value === '第' && elementList[index + 1]?.value === '二'
      )
      const secondItemEndIndex = firstSecondItemIndex + '第二项'.length - 1
      const firstThirdItemIndex = elementList.findIndex(
        (element: any, index: number) =>
          element.value === '第' && elementList[index + 1]?.value === '三'
      )
      const thirdItemEndIndex = firstThirdItemIndex + '第三项'.length - 1

      editor.command.executeSetRange(firstSecondItemIndex - 1, secondItemEndIndex)

      const cacheRange = {
        startIndex: firstSecondItemIndex - 2,
        endIndex: secondItemEndIndex
      }
      const dropRange = {
        startIndex: thirdItemEndIndex,
        endIndex: thirdItemEndIndex
      }
      const mutationResult = applyDragCommitMutation({
        draw,
        range: dropRange,
        cacheRange,
        cacheElementList: elementList,
        cachePositionList: draw.getCoordinate().getPositionList(),
        cachePositionContext: draw.getCoordinate().getPositionContext(),
        cacheStartIndex: cacheRange.startIndex,
        cacheEndIndex: cacheRange.endIndex,
        dragElementList: elementList.slice(
          cacheRange.startIndex + 1,
          cacheRange.endIndex + 1
        ),
        isContainControl: false
      })
      expect(mutationResult.applied).to.eq(true)
      editor.command.executeForceUpdate({
        isSubmitHistory: false
      })

      expect(getText(editor)).to.eq('\n1.第一项\n2.第三项\n3.第二项\n')

      const movedSecondItem = getOriginalElements(editor).filter((element: any) =>
        ['第', '二', '项'].includes(element.value)
      )
      expect(movedSecondItem.length).to.be.greaterThan(0)
      movedSecondItem.forEach((element: any) => {
        expect(element.listId).to.eq(originalListId)
        expect(element.listType).to.eq(ListType.OL)
      })

      const listRows = draw
        .getObjectResolver().getOriginalRowList()
        .filter((row: any) => row.isList)
      expect(listRows.map((row: any) => row.listIndex)).to.deep.eq([0, 1, 2])
    })
  })

  it('only resolves the row handle after clicking a list paragraph', () => {
    cy.getEditor().then((editor: Editor) => {
      setOrderedListValue(editor)

      const draw = (editor as any).draw
      const row = draw.getPageRowList()[0].find((item: any) => item.isList)
      expect(row).to.exist
      const handlePoint = getRowHandlePoint(draw, row)

      expect(
        resolveRowDragHandleAtPoint({
          draw,
          x: handlePoint.x,
          y: handlePoint.y,
          pageNo: handlePoint.pageNo
        })
      ).to.eq(null)

      const firstPosition = draw
        .getCoordinate()
        .getPositionList()[getTextRange(draw, '第一项').startIndex + 1]
      cy.wrap({
        pageNo: firstPosition.pageNo,
        x: Math.floor(
          (firstPosition.coordinate.leftTop[0] +
            firstPosition.coordinate.rightTop[0]) /
            2
        ),
        y: Math.floor(
          (firstPosition.coordinate.leftTop[1] +
            firstPosition.coordinate.leftBottom[1]) /
            2
        )
      }).as('firstItemPoint')
      cy.wrap(handlePoint).as('firstHandlePoint')
    })

    cy.get('@firstItemPoint').then(payload => {
      const point = payload as { pageNo: number; x: number; y: number }
      cy.get(`canvas[data-index="${point.pageNo}"]`).trigger(
        'mousedown',
        point.x,
        point.y,
        { button: 0, force: true }
      )
    })

    cy.get('@firstHandlePoint').then(payload => {
      const handlePoint = payload as { pageNo: number; x: number; y: number }
      cy.getEditor().then((editor: Editor) => {
        const draw = (editor as any).draw
        expect(
          resolveRowDragHandleAtPoint({
            draw,
            x: handlePoint.x,
            y: handlePoint.y,
            pageNo: handlePoint.pageNo
          })
        ).to.not.eq(null)
      })
    })
  })

  it('keeps the row handle outside ordered-list content', () => {
    cy.getEditor().then((editor: Editor) => {
      setOrderedListValue(editor)
      selectText(editor, '第一项')
      const draw = (editor as any).draw
      const row = draw.getPageRowList()[0].find((item: any) => item.isList)
      const bounds = getRowHandleBounds(draw, row)
      const firstContentPosition =
        draw.getCoordinate().getPositionList()[getTextRange(draw, '第一项').startIndex + 1]
      expect(bounds.x + bounds.width).to.be.lessThan(
        firstContentPosition.coordinate.leftTop[0]
      )
      expect(
        resolveRowDragHandleAtPoint({
          draw,
          x: Math.floor(bounds.x + bounds.width / 2),
          y: Math.floor(bounds.y + bounds.height / 2),
          pageNo: 0
        })
      ).to.not.eq(null)
    })
  })

  it('starts list paragraph dragging from the visible row handle', () => {
    cy.getEditor().then((editor: Editor) => {
      setOrderedListValue(editor)

      const draw = (editor as any).draw
      const row = draw.getPageRowList()[0].find((item: any) => item.isList)
      expect(row).to.exist
      editor.command.executeSetRange(
        getTextRange(draw, '第一项').startIndex + 1,
        getTextRange(draw, '第一项').startIndex + 1
      )
      const handlePoint = getRowHandlePoint(draw, row)
      cy.wrap(handlePoint).as('handlePoint')
    })

    cy.get('@handlePoint').then(payload => {
      const point = payload as { pageNo: number; x: number; y: number }
      cy.get(`canvas[data-index="${point.pageNo}"]`).trigger(
        'mousedown',
        point.x,
        point.y,
        { button: 0, force: true }
      )
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const session = draw.getComponents().canvasEvent.getPointerSession()
      expect(session.isAllowDrag).to.eq(true)
      const range = draw.getRange().getEditBoundaryRange()
      const rangeText = draw
        .getObjectResolver().getElementList()
        .slice(range.startIndex + 1, range.endIndex + 1)
        .map((element: any) => element.value)
        .join('')
        .replace(/\u200B/g, '')
      expect(rangeText).to.eq('第一项')
      expect(session.dragSnapshot.range.startIndex).to.eq(range.startIndex)
      expect(session.dragSnapshot.range.endIndex).to.eq(range.endIndex)
    })
  })

  it('reorders a list paragraph by dragging its row handle', () => {
    cy.getEditor().then((editor: Editor) => {
      setOrderedListValue(editor)
      const draw = (editor as any).draw
      const listRows = draw.getPageRowList()[0].filter((row: any) => row.isList)
      expect(listRows.length).to.eq(3)
      const secondRange = getTextRange(draw, '第二项')
      editor.command.executeSetRange(
        secondRange.startIndex + 1,
        secondRange.startIndex + 1
      )
      const startPoint = getRowHandlePoint(draw, listRows[1])
      const thirdRowPositionList = draw
        .getCoordinate()
        .getMainPositionListByPage(0)
        .slice(
          listRows[2].startIndex,
          listRows[2].startIndex + listRows[2].elementList.length
        )
      const lastThirdPosition =
        thirdRowPositionList[thirdRowPositionList.length - 1]
      const dropPoint = {
        pageNo: lastThirdPosition.pageNo,
        x: Math.floor(lastThirdPosition.coordinate.rightTop[0] - 1),
        y: Math.floor(
          (lastThirdPosition.coordinate.leftTop[1] +
            lastThirdPosition.coordinate.leftBottom[1]) /
            2
        )
      }
      cy.wrap({ startPoint, dropPoint }).as('dragPoints')
    })

    cy.get('@dragPoints').then(payload => {
      const { startPoint, dropPoint } = payload as {
        startPoint: { pageNo: number; x: number; y: number }
        dropPoint: { pageNo: number; x: number; y: number }
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .trigger('mousedown', startPoint.x, startPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(getText(editor)).to.eq('\n1.第一项\n2.第三项\n3.第二项\n')
    })
  })

  it('does not move a list item into a non-list paragraph while dragging by row handle', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: '普通段落\n' },
          {
            value: '',
            type: 'list' as any,
            listType: ListType.OL,
            valueList: [
              { value: '\n' },
              { value: '第一项' },
              { value: '\n' },
              { value: '第二项' },
              { value: '\n' },
              { value: '第三项' }
            ]
          }
        ]
      })
      const draw = (editor as any).draw
      const secondRange = getTextRange(draw, '第二项')
      editor.command.executeSetRange(
        secondRange.startIndex + 1,
        secondRange.startIndex + 1
      )
      const listRows = draw.getPageRowList()[0].filter((row: any) => row.isList)
      const startPoint = getRowHandlePoint(draw, listRows[1])
      const paragraphPosition =
        draw.getCoordinate().getPositionList()[getTextRange(draw, '普通段落').startIndex + 1]
      const dropPoint = {
        pageNo: paragraphPosition.pageNo,
        x: Math.floor(paragraphPosition.coordinate.leftTop[0]),
        y: Math.floor(
          (paragraphPosition.coordinate.leftTop[1] +
            paragraphPosition.coordinate.leftBottom[1]) /
            2
        )
      }
      cy.wrap({ startPoint, dropPoint }).as('listToParagraphDragPoints')
    })

    cy.get('@listToParagraphDragPoints').then(payload => {
      const { startPoint, dropPoint } = payload as {
        startPoint: { pageNo: number; x: number; y: number }
        dropPoint: { pageNo: number; x: number; y: number }
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .trigger('mousedown', startPoint.x, startPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      expect(getText(editor)).to.eq('普通段落\n\n1.第一项\n2.第二项\n3.第三项\n')
    })
  })

  it('does not expose row handle on title rows or drop list items into title rows', () => {
    cy.getEditor().then((editor: Editor) => {
      setTitleAndListValue(editor)

      const draw = (editor as any).draw
      const titleRange = getTextRange(draw, '体格检查：')
      editor.command.executeSetRange(
        titleRange.startIndex + 1,
        titleRange.startIndex + 1
      )
      const titleRow = draw
        .getPageRowList()[0]
        .find((row: any) =>
          row.elementList.some((element: any) => element.value === '体')
        )
      expect(titleRow).to.exist
      const titleHandlePoint = getRowHandlePoint(draw, titleRow)
      expect(
        resolveRowDragHandleAtPoint({
          draw,
          x: titleHandlePoint.x,
          y: titleHandlePoint.y,
          pageNo: titleHandlePoint.pageNo
        })
      ).to.eq(null)

      const secondRange = getTextRange(draw, '第二项')
      editor.command.executeSetRange(
        secondRange.startIndex + 1,
        secondRange.startIndex + 1
      )
      const listRows = draw.getPageRowList()[0].filter((row: any) => row.isList)
      expect(listRows.length).to.eq(2)
      const startPoint = getRowHandlePoint(draw, listRows[1])
      const titlePosition =
        draw.getCoordinate().getPositionList()[titleRange.startIndex + 1]
      const dropPoint = {
        pageNo: titlePosition.pageNo,
        x: Math.floor(titlePosition.coordinate.leftTop[0]),
        y: Math.floor(
          (titlePosition.coordinate.leftTop[1] +
            titlePosition.coordinate.leftBottom[1]) /
            2
        )
      }
      const beforeValue = JSON.stringify(editor.command.getValue().data.main)
      cy.wrap({ startPoint, dropPoint, beforeValue }).as('listToTitleDragPoints')
    })

    cy.get('@listToTitleDragPoints').then(payload => {
      const { startPoint, dropPoint, beforeValue } = payload as {
        startPoint: { pageNo: number; x: number; y: number }
        dropPoint: { pageNo: number; x: number; y: number }
        beforeValue: string
      }
      cy.wrap(beforeValue).as('beforeTitleDragValue')
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .trigger('mousedown', startPoint.x, startPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.get('@beforeTitleDragValue').then(beforeValue => {
      cy.getEditor().then((editor: Editor) => {
        expect(JSON.stringify(editor.command.getValue().data.main)).to.eq(
          beforeValue
        )
        expect(getText(editor)).to.eq(
          '流行病史：\n否认特殊接触史。\n体格检查：\nT：39.5℃，P：80bpm。\n\n1.第一项\n2.第二项\n'
        )
      })
    })
  })

  it('keeps a moved paragraph draggable after dropping it below a title block', () => {
    cy.getEditor().then((editor: Editor) => {
      setTitleAndListValue(editor)

      const draw = (editor as any).draw
      const paragraphRange = getTextRange(draw, '否认特殊接触史。')
      editor.command.executeSetRange(
        paragraphRange.startIndex + 1,
        paragraphRange.startIndex + 1
      )
      const paragraphRow = draw
        .getPageRowList()[0]
        .find((row: any) =>
          row.elementList.some((element: any) => element.value === '否')
        )
      expect(paragraphRow).to.exist
      const startPoint = getRowHandlePoint(draw, paragraphRow)
      const titleRange = getTextRange(draw, '体格检查：')
      const titlePosition =
        draw.getCoordinate().getPositionList()[titleRange.endIndex]
      const dropPoint = {
        pageNo: titlePosition.pageNo,
        x: Math.floor(titlePosition.coordinate.rightTop[0]),
        y: Math.floor(titlePosition.coordinate.leftBottom[1] + 2)
      }
      cy.wrap({ startPoint, dropPoint }).as('paragraphToTitleBottomPoints')
    })

    cy.get('@paragraphToTitleBottomPoints').then(payload => {
      const { startPoint, dropPoint } = payload as {
        startPoint: { pageNo: number; x: number; y: number }
        dropPoint: { pageNo: number; x: number; y: number }
      }
      cy.get(`canvas[data-index="${startPoint.pageNo}"]`)
        .trigger('mousedown', startPoint.x, startPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mousemove', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
        .trigger('mouseup', dropPoint.x, dropPoint.y, {
          button: 0,
          force: true
        })
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const movedElements = draw
        .getObjectResolver().getElementList()
        .filter((element: any) => '否认特殊接触史。'.includes(element.value))
      expect(movedElements.length).to.be.greaterThan(0)

      const movedRange = getTextRange(draw, '否认特殊接触史。')
      editor.command.executeSetRange(
        movedRange.startIndex + 1,
        movedRange.startIndex + 1
      )
      const movedRow = draw
        .getPageRowList()[0]
        .find((row: any) =>
          row.elementList.some((element: any) => element.value === '否')
        )
      expect(movedRow).to.exist
      const movedHandlePoint = getRowHandlePoint(draw, movedRow)
      expect(
        resolveRowDragHandleAtPoint({
          draw,
          x: movedHandlePoint.x,
          y: movedHandlePoint.y,
          pageNo: movedHandlePoint.pageNo
        })
      ).to.not.eq(null)
    })
  })
})
