import { ControlComponent, ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

const COLUMN_TEXT_CONTROL_ID = 'column-text-control'

function setupSecondColumnTextControl(
  editor: any,
  value?: string,
  options: { prefixLineCount?: number; control?: Record<string, unknown> } = {}
) {
  const { prefixLineCount = 10, control = {} } = options
  const prefix = Array.from({ length: prefixLineCount }).flatMap((_, index) => [
    { value: `填充${index + 1}` },
    { value: '\n' }
  ])

  editor.command.executeUpdateOptions({
    width: 420,
    height: 260,
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
      ...prefix,
      {
        type: ElementType.CONTROL,
        value: '',
        controlId: COLUMN_TEXT_CONTROL_ID,
        control: {
          conceptId: 'columnTextControl',
          type: ControlType.TEXT,
          value: null,
          placeholder: '请输入',
          ...control
        }
      }
    ]
  })

  if (value !== undefined) {
    editor.command.executeSetControlValue({
      id: COLUMN_TEXT_CONTROL_ID,
      value
    })
  }
}

function getControlValuePosition(editor: any, controlId = COLUMN_TEXT_CONTROL_ID) {
  const draw = editor.draw
  const elementList = draw.getObjectResolver().getLayoutMainElementList()
  const valueIndex = elementList.findIndex((element: any) => {
    return (
      element.controlId === controlId &&
      element.controlComponent === ControlComponent.VALUE
    )
  })
  expect(valueIndex, '控件值元素必须存在').to.be.greaterThan(-1)

  const position = draw
    .getCoordinate()
    .getMainPositionList()
    .find((item: any) => item.index === valueIndex)
  expect(position, '控件值 position 必须存在').to.not.eq(undefined)

  const row = draw.getPageRowList()[position.pageNo][position.rowNo]
  const snapshot = editor.command.getTypesettingLayoutSnapshot()
  const column = snapshot.pageList[position.pageNo].columnList[row.columnIndex || 0]
  return {
    valueIndex,
    position,
    row,
    column
  }
}

function expectPositionInSecondColumn(editor: any, position: any, label: string) {
  const row = editor.draw.getPageRowList()[position.pageNo][position.rowNo]
  const snapshot = editor.command.getTypesettingLayoutSnapshot()
  const column = snapshot.pageList[position.pageNo].columnList[row.columnIndex || 0]
  const debugLabel = `${label}(${position.element?.value ?? ''}) p${position.pageNo} r${position.rowNo}`

  expect(row.columnIndex, `${debugLabel} 应落在第二栏`).to.eq(1)
  expect(position.coordinate.leftTop[0], `${debugLabel} 位置应在第二栏左边界内`).to.be.gte(
    column.rect.x
  )
  expect(position.coordinate.rightTop[0], `${debugLabel} 位置应在第二栏右边界内`).to.be.lte(
    column.rect.x + column.rect.width + 0.5
  )
}

function expectControlValuePositionsInSecondColumn(editor: any, label: string) {
  const pageRowList = editor.draw.getPageRowList()
  const valuePositions = editor.draw
    .getCoordinate()
    .getMainPositionList()
    .filter((item: any) => {
      return (
        item.element?.controlId === COLUMN_TEXT_CONTROL_ID &&
        item.element?.controlComponent === ControlComponent.VALUE
      )
    })

  expect(valuePositions.length, `${label} 控件值 position 必须存在`).to.be.greaterThan(
    0
  )
  valuePositions.forEach((position: any, index: number) => {
    const pageRows = pageRowList[position.pageNo]
    expect(pageRows, `${label} position ${index} pageNo 必须有效`).to.not.eq(
      undefined
    )
    expect(
      pageRows[position.rowNo],
      `${label} position ${index} rowNo 必须有效`
    ).to.not.eq(undefined)
    expectPositionInSecondColumn(editor, position, `${label} position ${index}`)
  })
}

function clickControlValueTail(editor: any) {
  const valuePositions = editor.draw
    .getCoordinate()
    .getMainPositionList()
    .filter((item: any) => {
      return (
        item.element?.controlId === COLUMN_TEXT_CONTROL_ID &&
        item.element?.controlComponent === ControlComponent.VALUE
      )
    })
  expect(valuePositions.length, '控件值 position 必须存在').to.be.greaterThan(0)
  const position = valuePositions[valuePositions.length - 1]
  cy.wrap({
    pageNo: position.pageNo,
    x: Math.max(1, position.coordinate.rightTop[0] - 1),
    y: position.coordinate.leftTop[1] + position.lineHeight / 2
  }).as('secondColumnControlPoint')
}

function commitImeText(text: string, compositionList: string[]) {
  cy.get('.ce-inputarea').then($input => {
    const input = $input[0] as HTMLTextAreaElement
    input.dispatchEvent(
      new CompositionEvent('compositionstart', {
        bubbles: true
      })
    )
    compositionList.forEach(data => {
      input.value = data
      input.dispatchEvent(
        new InputEvent('input', {
          data,
          inputType: 'insertCompositionText',
          bubbles: true
        })
      )
    })
    input.dispatchEvent(
      new CompositionEvent('compositionend', {
        data: text,
        bubbles: true
      })
    )
    input.value = text
    input.dispatchEvent(
      new InputEvent('input', {
        data: text,
        inputType: 'insertCompositionText',
        bubbles: true
      })
    )
  })
}

function expectControlPatchFallback(editor: any, label: string) {
  const range = editor.command.getRange()
  const result = editor.draw.getServices().typingLinePatchPipeline.patchAroundCursor({
    curIndex: range.startIndex,
    editIndex: range.startIndex,
    insertedCount: 0
  })
  expect(result.patched, `${label} 单行 patch 应保守失败`).to.eq(false)
  expect(
    result.reason,
    `${label} 单行 patch 失败原因应标记控件风险`
  ).to.match(/^line-control-/)

  const stats = editor.getRenderBackendStats()
  expect(
    stats.typingLinePatch.patchFailCount,
    `${label} 单行 patch 应明确失败`
  ).to.be.greaterThan(0)
  expect(
    stats.typingLinePatch.lastFailReason,
    `${label} 单行 patch 失败原因应标记控件风险`
  ).to.match(/^line-control-/)
}

/** 覆盖 TS-03-D：控件在多栏中的定位、命中和 API 回填。 */
describe('typesetting page columns control value', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 控件落在第二栏时，API 回填和点击命中都应仍然指向同一个控件。 */
  it('keeps a text control editable and hittable in the second column', () => {
    cy.getEditor().then((editor: any) => {
      setupSecondColumnTextControl(editor, '第二栏控件')

      const controlValue = editor.command.getControlValue({
        id: COLUMN_TEXT_CONTROL_ID
      })[0]
      expect(controlValue.innerText).to.eq('第二栏控件')

      const { position } = getControlValuePosition(editor)
      expectPositionInSecondColumn(editor, position, '控件值')

      const pageWrapper = editor.draw
        .getPageCanvasHost()
        .getPageWrapperList()[position.pageNo]
      const pageRect = pageWrapper.getBoundingClientRect()
      const event = new MouseEvent('click', {
        clientX:
          pageRect.left +
          (position.coordinate.leftTop[0] + position.coordinate.rightTop[0]) / 2,
        clientY: pageRect.top + position.coordinate.leftTop[1] + position.lineHeight / 2,
        bubbles: true
      })
      const context = editor.command.getPositionContextByEvent(event)

      expect(context?.element?.controlId).to.eq(COLUMN_TEXT_CONTROL_ID)
      expect(context?.element?.control?.value?.map((item: any) => item.value).join(''))
        .to.eq('第二栏控件')
    })
  })

  /** 真实键入控件值后，局部 patch、光标和重绘位置都不能回退到第一栏。 */
  it('keeps real typed text control input patched inside the second column', () => {
    cy.getEditor().then((editor: any) => {
      setupSecondColumnTextControl(editor, '栏')
      const { position } = getControlValuePosition(editor)
      cy.wrap({
        pageNo: position.pageNo,
        x: Math.max(1, position.coordinate.rightTop[0] - 1),
        y: position.coordinate.leftTop[1] + position.lineHeight / 2
      }).as('secondColumnControlPoint')
    })

    cy.get('@secondColumnControlPoint').then((point: any) => {
      cy.get(`canvas[data-index="${point.pageNo}"]`).click(point.x, point.y, {
        force: true
      })
    })
    cy.get('.ce-inputarea').type('X', { force: true, delay: 0 })

    cy.getEditor().then((editor: any) => {
      const controlValue = editor.command.getControlValue({
        id: COLUMN_TEXT_CONTROL_ID
      })[0]
      expect(controlValue.innerText).to.contain('X')

      const typedPosition = editor.draw
        .getCoordinate()
        .getMainPositionList()
        .find((item: any) => {
          return (
            item.element?.controlId === COLUMN_TEXT_CONTROL_ID &&
            item.element?.controlComponent === ControlComponent.VALUE &&
            item.element?.value === 'X'
          )
        })
      expect(typedPosition, '真实输入字符 position 必须存在').to.not.eq(undefined)
      expectPositionInSecondColumn(editor, typedPosition, '真实输入字符')

      const cursorPosition = editor.draw.getCoordinate().getCursorPosition()
      expect(cursorPosition, '真实输入后 cursor position 必须存在').to.not.eq(null)
      expectPositionInSecondColumn(editor, cursorPosition, '真实输入后光标')

      const range = editor.command.getRange()
      expect(range.startIndex, '真实输入后选区应保持折叠').to.eq(range.endIndex)
      expect(range.startIndex, '真实输入后选区应在输入字符之后').to.be.gte(
        typedPosition.index
      )
    })
  })

  /** 长文本导致当前行扩宽/扩行时，chunk patch 必须保守回退或保持第二栏上下文。 */
  it('keeps long typed text control input bounded to the second column after row expansion', () => {
    const longText = 'ABCDEFGHIJKLMNOPQRSTUVWX'

    cy.getEditor().then((editor: any) => {
      setupSecondColumnTextControl(editor, '栏')
      editor.resetRenderBackendStats()
      const { position } = getControlValuePosition(editor)
      cy.wrap({
        pageNo: position.pageNo,
        x: Math.max(1, position.coordinate.rightTop[0] - 1),
        y: position.coordinate.leftTop[1] + position.lineHeight / 2
      }).as('secondColumnControlPoint')
    })

    cy.get('@secondColumnControlPoint').then((point: any) => {
      cy.get(`canvas[data-index="${point.pageNo}"]`).click(point.x, point.y, {
        force: true
      })
    })
    cy.get('.ce-inputarea').type(longText, { force: true, delay: 0 })

    cy.getEditor().then((editor: any) => {
      const controlValue = editor.command.getControlValue({
        id: COLUMN_TEXT_CONTROL_ID
      })[0]
      expect(controlValue.innerText).to.contain(longText)

      expectControlValuePositionsInSecondColumn(editor, '长文本真实输入后')

      const valuePositionList = editor.draw
        .getCoordinate()
        .getMainPositionList()
        .filter((item: any) => {
          return (
            item.element?.controlId === COLUMN_TEXT_CONTROL_ID &&
            item.element?.controlComponent === ControlComponent.VALUE
          )
        })
      const rowKeySet = new Set(
        valuePositionList.map((position: any) => {
          return `${position.pageNo}:${position.rowNo}`
        })
      )
      expect(rowKeySet.size, '长文本输入应触发行宽或行数变化').to.be.greaterThan(1)

      const cursorPosition = editor.draw.getCoordinate().getCursorPosition()
      expect(cursorPosition, '长文本输入后 cursor position 必须存在').to.not.eq(null)
      expectPositionInSecondColumn(editor, cursorPosition, '长文本输入后光标')

      const range = editor.command.getRange()
      expect(range.startIndex, '长文本输入后选区应保持折叠').to.eq(range.endIndex)
      expect(range.startIndex, '长文本输入后选区应在控件值末尾').to.be.gte(
        Math.max(...valuePositionList.map((position: any) => position.index))
      )

      const stats = editor.getRenderBackendStats()
      const conservativeFallback =
        stats.layout.computeCount > 0 &&
        (stats.chunkLayout.patchFailCount > 0 ||
          stats.typingLinePatch.patchFailCount > 0)
      const keptColumnContext =
        stats.chunkLayout.patchSuccessCount + stats.typingLinePatch.patchSuccessCount >
        0
      expect(
        conservativeFallback || keptColumnContext,
        `长文本输入应保守回退或保持栏上下文：${JSON.stringify({
          chunkLayout: stats.chunkLayout,
          typingLinePatch: stats.typingLinePatch
        })}`
      ).to.eq(true)
    })
  })

  /** 多片段/前后缀控件输入不能走单行 patch，否则局部写回容易丢失栏上下文。 */
  it('falls back for prefixed multi-fragment control input in the second column', () => {
    cy.getEditor().then((editor: any) => {
      setupSecondColumnTextControl(editor, '栏位', {
        control: {
          prefix: '[',
          postfix: ']',
          preText: '前',
          postText: '后'
        }
      })
      editor.resetRenderBackendStats()
      clickControlValueTail(editor)
    })

    cy.get('@secondColumnControlPoint').then((point: any) => {
      cy.get(`canvas[data-index="${point.pageNo}"]`).click(point.x, point.y, {
        force: true
      })
    })
    cy.get('.ce-inputarea').type('X', { force: true, delay: 0 })

    cy.getEditor().then((editor: any) => {
      const controlValue = editor.command.getControlValue({
        id: COLUMN_TEXT_CONTROL_ID
      })[0]
      expect(controlValue.innerText).to.contain('X')
      expectControlValuePositionsInSecondColumn(editor, '前后缀多片段输入后')
      expectControlPatchFallback(editor, '前后缀多片段输入')
    })
  })

  /** IME 组合提交会产生多字符临时片段，控件内同样必须保守回退。 */
  it('falls back for IME control input in the second column', () => {
    cy.getEditor().then((editor: any) => {
      setupSecondColumnTextControl(editor, '栏', {
        control: {
          prefix: '[',
          postfix: ']'
        }
      })
      editor.resetRenderBackendStats()
      clickControlValueTail(editor)
    })

    cy.get('@secondColumnControlPoint').then((point: any) => {
      cy.get(`canvas[data-index="${point.pageNo}"]`).click(point.x, point.y, {
        force: true
      })
    })
    commitImeText('的', ['d', 'de', '的'])

    cy.getEditor().then((editor: any) => {
      const controlValue = editor.command.getControlValue({
        id: COLUMN_TEXT_CONTROL_ID
      })[0]
      expect(controlValue.innerText).to.contain('的')
      expectControlValuePositionsInSecondColumn(editor, 'IME 输入后')
      expectControlPatchFallback(editor, 'IME 输入')
    })
  })
})
