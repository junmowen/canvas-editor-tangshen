import type Editor from '../../../src/editor'

const ZERO = '\u200B'

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getObjectResolver().getOriginalMainElementList()
}

function createListDocument(itemCount: number) {
  return Array.from({ length: itemCount }, (_, index) => ({
    value:
      index === itemCount - 1
        ? `列表项${index + 1}${' 很长的门诊记录内容'.repeat(8)}`
        : `列表项${index + 1}${' 很长的门诊记录内容'.repeat(8)}\n`
  }))
}

function getListStartRows(editor: Editor) {
  const draw = (editor as any).draw
  return draw
    .getPageRowList()
    .flatMap((pageRows: any[], pageNo: number) =>
      pageRows
        .filter(
          (row: any) =>
            row.elementList[0]?.value === ZERO && row.listIndex !== undefined
        )
        .map((row: any) => ({
          ...row,
          pageNo
        }))
    )
}

function createOrderedListElements(itemCount: number) {
  const listId = `list-${Date.now()}-${Math.random()}`
  const elementList: any[] = []
  for (let index = 0; index < itemCount; index++) {
    elementList.push({
      value: ZERO,
      listId,
      listType: 'ol',
      listLevel: 0
    })
    const text = `列表项${index + 1}${' 很长的门诊记录内容'.repeat(8)}`
    text.split('').forEach(value => {
      elementList.push({
        value,
        listId,
        listType: 'ol',
        listLevel: 0
      })
    })
  }
  return elementList
}

function createTextElements(text: string, attrs: Record<string, any> = {}) {
  return text.split('').map(value => ({
    value,
    ...attrs
  }))
}

function findRowByText(editor: Editor, text: string) {
  const rows = (editor as any).draw.getObjectResolver().getOriginalRowList()
  return rows.find((row: any) =>
    row.elementList.map((element: any) => element.value).join('').includes(text)
  )
}

function getParagraphByText(editor: Editor, text: string) {
  const elementList = getOriginalElements(editor)
  const textIndex = elementList.findIndex((element: any) => element.value === text)
  expect(textIndex).to.be.greaterThan(-1)
  let startIndex = textIndex
  while (startIndex > 0) {
    const element = elementList[startIndex]
    if (element.value === '\n' && !element.listWrap) {
      break
    }
    startIndex--
  }
  let endIndex = textIndex + 1
  while (endIndex < elementList.length) {
    const element = elementList[endIndex]
    if (element.value === '\n' && !element.listWrap) {
      break
    }
    endIndex++
  }
  return {
    startIndex,
    endIndex,
    textIndex,
    elementList: elementList.slice(startIndex, endIndex)
  }
}

function dispatchTab(shiftKey = false) {
  cy.get('.ce-inputarea').then($input => {
    const input = $input[0] as HTMLTextAreaElement
    const KeyboardEventCtor = input.ownerDocument.defaultView!.KeyboardEvent
    const wasNotCancelled = input.dispatchEvent(
      new KeyboardEventCtor('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true
      })
    )
    expect(wasNotCancelled).to.eq(false)
  })
}

describe('issue #440 - list sublevel editing', () => {
  beforeEach(() => {
    cy.visit(
      `${Cypress.env('EDITOR_BASE_URL') || 'http://localhost:3000'}/canvas-editor/index.html`
    )
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('adds and removes sublevels with Tab and Shift+Tab', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '第一项\n第二项\n第三项'
          }
        ]
      })

      const elementList = getOriginalElements(editor)
      editor.command.executeSetRange(0, elementList.length)
      editor.command.executeList('ol' as any)

      const secondItem = getParagraphByText(editor, '二')
      editor.command.executeSetRange(
        secondItem.startIndex,
        secondItem.endIndex
      )
    })

    dispatchTab()

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

      const secondItem = getParagraphByText(editor, '二')
      secondItem.elementList
        .filter((element: any) => element.listId)
        .forEach((element: any) => {
          expect(element.listLevel).to.eq(1)
        })

      editor.command.executeSetRange(
        secondItem.startIndex,
        secondItem.endIndex
      )
    })

    dispatchTab(true)

    cy.getEditor().then((editor: Editor) => {
      const secondItem = getParagraphByText(editor, '二')
      secondItem.elementList
        .filter((element: any) => element.listId)
        .forEach((element: any) => {
          expect(element.listLevel).to.eq(0)
        })
    })
  })

  it('round-trips sublevel data through getValue and setValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '第一项\n第二项\n第三项'
          }
        ]
      })

      let elementList = getOriginalElements(editor)
      editor.command.executeSetRange(0, elementList.length)
      editor.command.executeList('ol' as any)

      const secondItem = getParagraphByText(editor, '二')
      editor.command.executeSetRange(
        secondItem.startIndex,
        secondItem.endIndex
      )
      ;(editor as any).draw.getListParticle().indentList(1)

      const value = editor.command.getValue().data.main
      editor.command.executeSetValue({
        main: value
      })
      elementList = getOriginalElements(editor)
      const secondItemAfterSetValue = getParagraphByText(editor, '二')
      expect(
        secondItemAfterSetValue.elementList
          .filter((element: any) => element.listId)
          .every((element: any) => element.listLevel === 1)
      ).to.eq(true)
    })
  })

  it('keeps ordered list numbering after typing in a later page chunk', () => {
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw

      editor.command.executeSetValue(
        {
          header: [],
          main: createOrderedListElements(32),
          footer: []
        },
        {
          isSetCursor: true
        }
      )

      const listRowsBeforeTyping = getListStartRows(editor)
      const laterPageRow =
        listRowsBeforeTyping.find((row: any) => row.pageNo > 0 && row.listIndex >= 7) ||
        listRowsBeforeTyping.find((row: any) => row.listIndex >= 7)
      expect(laterPageRow, '测试文档需要形成第 8 个及以后列表项').to.exist

      const firstTextOffset = laterPageRow.elementList.findIndex(
        (element: any) => element.value !== ZERO
      )
      expect(firstTextOffset, '后页列表行需要有可输入文本').to.be.greaterThan(-1)
      const targetIndex = laterPageRow.startIndex + firstTextOffset
      const expectedListIndex = laterPageRow.listIndex
      editor.resetRenderBackendStats()
      editor.command.executeSetRange(targetIndex, targetIndex)
      editor.command.executeInsertElementList(
        '追加'.split('').map(value => ({ value })),
        {
          isSubmitHistory: false
        }
      )

      const stats = editor.getRenderBackendStats()
      const updatedRow = draw
        .getObjectResolver().getRowList()
        .find((row: any) => row.startIndex === laterPageRow.startIndex)

      expect(stats.layout.computeCount, '输入态不应回退整篇 layout').to.eq(0)
      expect(
        stats.chunkLayout.patchSuccessCount + stats.typingLinePatch.patchSuccessCount,
        '输入态应命中局部 patch'
      ).to.be.greaterThan(0)
      expect(updatedRow?.listIndex, '后页列表项输入后保持原编号序号').to.eq(
        expectedListIndex
      )
      expect(
        getListStartRows(editor).map((row: any) => row.listIndex).slice(0, 12),
        '前 12 个列表序号连续'
      ).to.deep.eq(Array.from({ length: 12 }, (_, index) => index))
    })
  })

  it('does not leak list indentation into surrounding headings', () => {
    cy.getEditor().then((editor: Editor) => {
      const diagnosisListId = `diagnosis-${Date.now()}`
      const treatmentListId = `treatment-${Date.now()}`
      const diagnosisListAttrs = {
        listId: diagnosisListId,
        listType: 'ol',
        listLevel: 0
      }
      const treatmentListAttrs = {
        listId: treatmentListId,
        listType: 'ol',
        listLevel: 0
      }

      editor.command.executeSetValue({
        main: [
          ...createTextElements('门诊诊断:'),
          {
            value: ZERO,
            ...diagnosisListAttrs
          },
          ...createTextElements('高血压', diagnosisListAttrs),
          {
            value: ZERO
          },
          ...createTextElements('处置治疗:'),
          {
            value: ZERO,
            ...treatmentListAttrs
          },
          ...createTextElements('复查', treatmentListAttrs)
        ]
      })

      const diagnosisTitleRow = findRowByText(editor, '门诊诊断:')
      const diagnosisListRow = findRowByText(editor, '高血压')
      const treatmentTitleRow = findRowByText(editor, '处置治疗:')
      const treatmentListRow = findRowByText(editor, '复查')

      expect(diagnosisTitleRow, '诊断标题行').to.exist
      expect(diagnosisListRow, '诊断列表行').to.exist
      expect(treatmentTitleRow, '处置标题行').to.exist
      expect(treatmentListRow, '处置列表行').to.exist

      expect(diagnosisTitleRow.offsetX || 0).to.eq(0)
      expect(diagnosisTitleRow.isList || false).to.eq(false)
      expect(treatmentTitleRow.offsetX || 0).to.eq(0)
      expect(treatmentTitleRow.isList || false).to.eq(false)
      expect(diagnosisListRow.offsetX).to.be.greaterThan(0)
      expect(treatmentListRow.offsetX).to.be.greaterThan(0)
    })
  })
})
