import type Editor from '../../../src/editor'
import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'
import { ParagraphTextRunRenderer } from '../../../src/editor/core/modules/paragraph/render/ParagraphTextRunRenderer'

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

function getOriginalElements(editor: Editor) {
  return (editor as any).draw.getObjectResolver().getOriginalMainElementList()
}

function getCheckboxListClickPoint(editor: Editor, text: string) {
  const draw = (editor as any).draw
  draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
  const row = draw
    .getObjectResolver().getOriginalRowList()
    .find((item: any) =>
      item.elementList.map((element: any) => element.value).join('').includes(text)
    )
  expect(row, `row containing ${text}`).to.not.eq(undefined)
  const startElement = row.elementList[0]
  expect(startElement.listStyle).to.eq(ListStyle.CHECKBOX)

  const position = draw
    .getCoordinate()
    .getOriginalPositionList()
    .find((item: any) => item.index === row.startIndex)
  expect(position, `position for ${text}`).to.not.eq(undefined)

  const options = editor.command.getOptions()
  const scale = options.scale
  const levelIndent = (startElement.listLevel || 0) * options.defaultTabWidth * scale
  let tabWidth = 0
  for (let index = 1; index < row.elementList.length; index++) {
    const element = row.elementList[index]
    if (element.type !== ElementType.TAB) break
    tabWidth += options.defaultTabWidth * scale
  }

  const checkbox = options.checkbox
  const left =
    position.coordinate.leftTop[0] -
    (row.offsetX || 0) +
    levelIndent +
    tabWidth -
    checkbox.gap * scale
  return {
    pageNo: position.pageNo,
    x: left + ((checkbox.width + checkbox.gap * 2) * scale) / 2,
    y: position.coordinate.leftTop[1] + position.lineHeight / 2
  }
}

function clickPagePoint(editor: Editor, point: { pageNo: number; x: number; y: number }) {
  const draw = (editor as any).draw
  const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[point.pageNo]
  const pageRect = pageWrapper.getBoundingClientRect()
  cy.get(`canvas[data-index="${point.pageNo}"]`).trigger('mousedown', {
    button: 0,
    clientX: pageRect.left + point.x,
    clientY: pageRect.top + point.y,
    force: true
  })
}

describe('tab indentation scenarios', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issues #1190, #942, and #974 insert a styled tab element in normal text when pressing Tab', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'before',
          font: 'Microsoft YaHei',
          size: 28,
          bold: true,
          color: '#FF0000',
          strikeout: true
        }
      ])
    })

    dispatchTab()

    cy.getEditor().then((editor: Editor) => {
      const tabElement = getOriginalElements(editor).find(
        (element: any) => element.type === ElementType.TAB
      )

      expect(tabElement).to.not.eq(undefined)
      expect(tabElement.value).to.eq('')
      expect(tabElement.font).to.eq('Microsoft YaHei')
      expect(tabElement.size).to.eq(28)
      expect(tabElement.bold).to.eq(true)
      expect(tabElement.color).to.eq('#FF0000')
      expect(tabElement.strikeout).to.eq(true)
    })
  })

  it('issue #1186 keeps checkbox list items clickable after Tab indentation', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: '第一项\n第二项' }]
      })

      const elementList = getOriginalElements(editor)
      editor.command.executeSetRange(0, elementList.length)
      editor.command.executeList(ListType.UL, ListStyle.CHECKBOX)

      const secondItemIndex = getOriginalElements(editor).findIndex(
        (element: any) => element.value === '二'
      )
      expect(secondItemIndex).to.be.greaterThan(-1)
      editor.command.executeSetRange(secondItemIndex, secondItemIndex)
    })

    dispatchTab()

    cy.getEditor().then((editor: Editor) => {
      clickPagePoint(editor, getCheckboxListClickPoint(editor, '第二项'))
    })

    cy.getEditor().then((editor: Editor) => {
      const secondItem = getOriginalElements(editor).find(
        (element: any) =>
          element.value === ZERO &&
          element.listStyle === ListStyle.CHECKBOX &&
          element.listLevel === 1
      )
      expect(secondItem?.checkbox?.value).to.eq(true)
    })
  })

  it('issue #1186 keeps checkbox list items clickable when the line starts with a Tab element', () => {
    cy.getEditor().then((editor: Editor) => {
      const listId = `checkbox-tab-${Date.now()}`
      editor.command.executeSetValue({
        main: [
          {
            value: ZERO,
            listId,
            listType: ListType.UL,
            listStyle: ListStyle.CHECKBOX,
            listLevel: 0,
            checkbox: {
              value: false
            }
          },
          {
            type: ElementType.TAB,
            value: '',
            listId,
            listType: ListType.UL,
            listStyle: ListStyle.CHECKBOX,
            listLevel: 0
          },
          ...'缩进项'.split('').map(value => ({
            value,
            listId,
            listType: ListType.UL,
            listStyle: ListStyle.CHECKBOX,
            listLevel: 0
          }))
        ]
      })

      clickPagePoint(editor, getCheckboxListClickPoint(editor, '缩进项'))
    })

    cy.getEditor().then((editor: Editor) => {
      const item = getOriginalElements(editor).find(
        (element: any) =>
          element.value === ZERO && element.listStyle === ListStyle.CHECKBOX
      )
      expect(item?.checkbox?.value).to.eq(true)
    })
  })

  it('uses explicit tab stops when measuring a Tab element', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          {
            type: ElementType.TAB,
            value: '',
            tabStops: [{ position: 120, alignment: 'left' }]
          },
          { value: 'B' }
        ]
      })

      const draw = (editor as any).draw
      const row = draw.getObjectResolver().getOriginalRowList()[0]
      const firstElement = row.elementList.find(
        (element: any) => element.value === 'A'
      )
      const tabElement = row.elementList.find(
        (element: any) => element.type === ElementType.TAB
      )
      const scale = editor.command.getOptions().scale
      const expectedTabWidth = 120 * scale - firstElement.metrics.width

      expect(tabElement).to.not.eq(undefined)
      expect(tabElement.metrics.width).to.be.closeTo(expectedTabWidth, 0.5)
    })
  })

  it('sets paragraph tab stops through command API', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          { type: ElementType.TAB, value: '' },
          { value: 'B' }
        ]
      })
      editor.command.executeSetRange(0, getOriginalElements(editor).length - 1)
      editor.command.executeSetTabStops([
        { position: 120, alignment: 'left' },
        { position: 80, alignment: 'right' },
        { position: -1, alignment: 'left' }
      ])

      const value = editor.command.getValue().data.main
      const firstValue = value.find((element: any) => element.value === 'A')
      expect(firstValue?.tabStops?.map(tabStop => tabStop.position)).to.deep.eq(
        [80, 120]
      )

      const draw = (editor as any).draw
      const row = draw.getObjectResolver().getOriginalRowList()[0]
      const firstElement = row.elementList.find(
        (element: any) => element.value === 'A'
      )
      const tabElement = row.elementList.find(
        (element: any) => element.type === ElementType.TAB
      )
      const nextRunWidth = row.elementList
        .slice(row.elementList.indexOf(tabElement) + 1)
        .reduce((sum: number, element: any) => sum + element.metrics.width, 0)
      const scale = editor.command.getOptions().scale
      const expectedTabWidth =
        80 * scale - firstElement.metrics.width - nextRunWidth
      expect(tabElement.metrics.width).to.be.closeTo(expectedTabWidth, 0.5)

      editor.command.executeSetTabStops(null)
      const clearedValue = editor.command
        .getValue()
        .data.main.find((element: any) => element.value === 'A')
      expect(clearedValue?.tabStops).to.eq(undefined)
    })
  })

  it('measures right center and decimal aligned tab stops', () => {
    cy.getEditor().then((editor: Editor) => {
      const getTabWidth = (
        alignment: 'right' | 'center' | 'decimal',
        text: string
      ) => {
        editor.command.executeSetValue({
          main: [
            { value: 'A' },
            {
              type: ElementType.TAB,
              value: '',
              tabStops: [{ position: 120, alignment }]
            },
            { value: text }
          ]
        })
        const row = (editor as any).draw.getObjectResolver().getOriginalRowList()[0]
        const tabIndex = row.elementList.findIndex(
          (element: any) => element.type === ElementType.TAB
        )
        const firstElement = row.elementList.find(
          (element: any) => element.value === 'A'
        )
        const afterTabElements = row.elementList.slice(tabIndex + 1)
        const nextRunWidth = afterTabElements.reduce(
          (sum: number, element: any) => sum + element.metrics.width,
          0
        )
        const decimalRunWidth = afterTabElements
          .filter((element: any) => element.value !== '.')
          .slice(0, text.indexOf('.') >= 0 ? text.indexOf('.') : text.length)
          .reduce((sum: number, element: any) => sum + element.metrics.width, 0)
        return {
          scale: editor.command.getOptions().scale,
          firstWidth: firstElement.metrics.width,
          tabWidth: row.elementList[tabIndex].metrics.width,
          nextRunWidth,
          decimalRunWidth
        }
      }

      const right = getTabWidth('right', 'BC')
      expect(right.tabWidth).to.be.closeTo(
        120 * right.scale - right.firstWidth - right.nextRunWidth,
        0.5
      )

      const center = getTabWidth('center', 'BC')
      expect(center.tabWidth).to.be.closeTo(
        120 * center.scale - center.firstWidth - center.nextRunWidth / 2,
        0.5
      )

      const decimal = getTabWidth('decimal', '12.34')
      expect(decimal.tabWidth).to.be.closeTo(
        120 * decimal.scale - decimal.firstWidth - decimal.decimalRunWidth,
        0.5
      )
    })
  })

  it('measures right aligned tab stops with formula and script runs', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          {
            type: ElementType.TAB,
            value: '',
            tabStops: [{ position: 160, alignment: 'right' }]
          },
          {
            id: 'tab-formula',
            type: ElementType.LATEX,
            value: '\\frac{a}{b}',
            formula: {
              id: 'tab-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: '\\frac{a}{b}',
              ast: {
                type: 'fraction',
                numerator: { type: 'text', value: 'a' },
                denominator: { type: 'text', value: 'b' }
              }
            }
          },
          { type: ElementType.SUPERSCRIPT, value: '2' },
          { value: 'C' }
        ]
      })

      const row = (editor as any).draw.getObjectResolver().getOriginalRowList()[0]
      const tabIndex = row.elementList.findIndex(
        (element: any) => element.type === ElementType.TAB
      )
      const firstElement = row.elementList.find(
        (element: any) => element.value === 'A'
      )
      const nextRunWidth = row.elementList
        .slice(tabIndex + 1)
        .reduce((sum: number, element: any) => sum + element.metrics.width, 0)
      const scale = editor.command.getOptions().scale
      const expectedTabWidth =
        160 * scale - firstElement.metrics.width - nextRunWidth

      expect(row.elementList[tabIndex].metrics.width).to.be.closeTo(
        expectedTabWidth,
        0.5
      )
    })
  })

  it('renders bar aligned tab stop as a vertical line', () => {
    cy.getEditor().then((editor: Editor) => {
      const renderer = new ParagraphTextRunRenderer()
      const pathCalls: Array<{ name: string; args: number[] }> = []
      const ctx = {
        save() {
          return undefined
        },
        restore() {
          return undefined
        },
        beginPath() {
          return undefined
        },
        moveTo(...args: number[]) {
          pathCalls.push({ name: 'moveTo', args })
        },
        lineTo(...args: number[]) {
          pathCalls.push({ name: 'lineTo', args })
        },
        stroke() {
          return undefined
        },
        set lineWidth(value: number) {
          void value
        },
        set strokeStyle(value: string) {
          void value
        }
      }
      renderer.render({
        ctx: ctx as any,
        element: {
          type: ElementType.TAB,
          value: '',
          metrics: {
            width: 50,
            height: 16,
            boundingBoxAscent: 16,
            boundingBoxDescent: 0,
            tabStopAlignment: 'bar'
          }
        } as any,
        rowPosition: {
          coordinate: {
            leftTop: [10, 20],
            leftBottom: [10, 40],
            rightTop: [60, 20],
            rightBottom: [60, 40]
          }
        } as any,
        x: 10,
        y: 30,
        mode: editor.command.getOptions().mode,
        isPrintMode: false,
        options: editor.command.getOptions(),
        textParticle: {
          complete() {
            return undefined
          }
        } as any
      })

      expect(pathCalls).to.deep.eq([
        { name: 'moveTo', args: [60, 20] },
        { name: 'lineTo', args: [60, 40] }
      ])
    })
  })

  it('outputs bar aligned tab stop in worker page snapshot', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          {
            type: ElementType.TAB,
            value: '',
            color: '#336699',
            tabStops: [{ position: 120, alignment: 'bar' }]
          },
          { value: 'B' }
        ]
      })

      const draw = (editor as any).draw
      const pageNo = 0
      const row = draw.getPageRowList()[pageNo][0]
      const tabElement = row.elementList.find(
        (element: any) => element.type === ElementType.TAB
      )
      const tabPosition = draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => position.element === tabElement)
      expect(tabElement?.metrics?.tabStopAlignment).to.eq('bar')
      expect(tabPosition, 'bar tab position').to.not.eq(undefined)

      const snapshot = draw.getServices().pageRenderSnapshotBuilder.build({
        jobId: 1,
        pagePayload: {
          elementList: draw.getObjectResolver().getLayoutMainElementList(),
          positionList: draw.getCoordinate().getMainPositionList(),
          rowList: draw.getPageRowList()[pageNo],
          pageNo
        }
      })
      const expectedX =
        tabPosition.coordinate.leftTop[0] + tabElement.metrics.width
      const barCommand = snapshot.commandList.find((command: any) => {
        const segment = command.segmentList?.[0]
        return (
          command.type === 'strokePath' &&
          Math.abs(segment?.from?.[0] - expectedX) < 0.5 &&
          Math.abs(segment?.to?.[0] - expectedX) < 0.5 &&
          segment?.from?.[1] === tabPosition.coordinate.leftTop[1] &&
          segment?.to?.[1] === tabPosition.coordinate.leftBottom[1]
        )
      }) as any

      expect(barCommand, 'worker bar tab command').to.not.eq(undefined)
      expect(barCommand.strokeStyle).to.eq('#336699')
      expect(barCommand.segmentList[0].from[1]).to.eq(
        tabPosition.coordinate.leftTop[1]
      )
      expect(barCommand.segmentList[0].to[1]).to.eq(
        tabPosition.coordinate.leftBottom[1]
      )
    })
  })

  it('sets a bar tab stop from the toolbar menu', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          { type: ElementType.TAB, value: '' },
          { value: 'B' }
        ]
      })
      editor.command.executeSetRange(0, getOriginalElements(editor).length - 1)
    })

    cy.get('.menu-item__tab-stops').click({ force: true })
    cy.get('[data-tab-stop-preset="bar"]').click({ force: true })

    cy.getEditor().then((editor: Editor) => {
      const value = editor.command.getValue().data.main
      const firstElement = value.find((element: any) => element.value === 'A')
      expect(firstElement?.tabStops).to.deep.eq([
        { position: 120, alignment: 'bar' }
      ])
      cy.get('.menu-item__tab-stops').should('have.class', 'active')
      cy.get('[data-tab-stop-preset="bar"]').should('have.class', 'active')
    })
  })

  it('does not highlight toolbar tab stops for mixed paragraph selection', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: Array<{ tabStops: any }> = []
      editor.eventBus.on('rangeStyleChange', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [
          {
            value: 'A',
            tabStops: [{ position: 120, alignment: 'left' }]
          },
          { value: '\n' },
          {
            value: 'B',
            tabStops: [{ position: 120, alignment: 'bar' }]
          }
        ]
      })
      editor.command.executeSetRange(0, getOriginalElements(editor).length - 1)
      cy.wrap(payloads).as('mixedTabStylePayloads')
    })

    cy.get('@mixedTabStylePayloads').should(value => {
      const payloads = value as Array<{ tabStops: any }>
      expect(payloads.length).to.be.greaterThan(0)
      expect(payloads[payloads.length - 1].tabStops).to.eq(null)
    })
    cy.get('.menu-item__tab-stops').should('not.have.class', 'active')
  })

  it('sets tab stop position from the toolbar ruler', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          { type: ElementType.TAB, value: '' },
          { value: 'B' }
        ]
      })
      editor.command.executeSetRange(0, getOriginalElements(editor).length - 1)
    })

    cy.get('.menu-item__tab-stops').click({ force: true })
    cy.get('.tab-stops-ruler__track').then($track => {
      const rect = $track[0].getBoundingClientRect()
      cy.wrap($track).click(rect.width * 0.75, rect.height / 2, {
        force: true
      })
    })

    cy.getEditor().then((editor: Editor) => {
      const firstElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.value === 'A')
      expect(firstElement?.tabStops?.[0].position).to.be.closeTo(180, 1)
      expect(firstElement?.tabStops?.[0].alignment).to.eq('left')
    })
  })

  it('adds sorts and deletes multiple tab stops from the toolbar ruler', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'A' },
          { type: ElementType.TAB, value: '' },
          { value: 'B' }
        ]
      })
      editor.command.executeSetRange(0, getOriginalElements(editor).length - 1)
    })

    cy.get('.menu-item__tab-stops').click({ force: true })
    cy.get('.tab-stops-ruler__track').then($track => {
      const rect = $track[0].getBoundingClientRect()
      cy.wrap($track).click(rect.width * 0.75, rect.height / 2, {
        force: true
      })
      cy.wrap($track).click(rect.width * 0.25, rect.height / 2, {
        force: true
      })
    })

    cy.get('.tab-stops-ruler__handle').should('have.length', 2)
    cy.getEditor().then((editor: Editor) => {
      const firstElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.value === 'A')
      expect(firstElement?.tabStops?.map(tabStop => tabStop.position)).to.deep.eq([
        60,
        180
      ])
    })

    cy.get('.tab-stops-ruler__handle').first().dblclick({ force: true })

    cy.get('.tab-stops-ruler__handle').should('have.length', 1)
    cy.getEditor().then((editor: Editor) => {
      const firstElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.value === 'A')
      expect(firstElement?.tabStops?.[0].position).to.be.closeTo(180, 1)
    })
  })

  it('toggles whitespace markers from the toolbar menu', () => {
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().lineBreak.disabled).to.eq(true)
    })

    cy.get('.menu-item__format-marker').click({ force: true })
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().lineBreak.disabled).to.eq(false)
    })
    cy.get('.menu-item__format-marker').should('have.class', 'active')

    cy.get('.menu-item__format-marker').click({ force: true })
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().lineBreak.disabled).to.eq(true)
    })
    cy.get('.menu-item__format-marker').should('not.have.class', 'active')
  })

  it('respects whitespace marker option in main and worker rendering', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'A B' }]
      })
      const renderer = new ParagraphTextRunRenderer()
      const getSpaceRenderCount = (disabled: boolean) => {
        let arcCount = 0
        renderer.render({
          ctx: {
            save() {
              return undefined
            },
            restore() {
              return undefined
            },
            beginPath() {
              return undefined
            },
            arc() {
              arcCount++
            },
            fill() {
              return undefined
            },
            set fillStyle(value: string) {
              void value
            }
          } as any,
          element: {
            value: ' ',
            metrics: {
              width: 10,
              height: 16,
              boundingBoxAscent: 16,
              boundingBoxDescent: 0
            }
          } as any,
          rowPosition: {
            coordinate: {
              leftTop: [10, 20]
            },
            lineHeight: 24
          } as any,
          x: 10,
          y: 20,
          mode: editor.command.getOptions().mode,
          isPrintMode: false,
          options: {
            ...editor.command.getOptions(),
            lineBreak: {
              ...editor.command.getOptions().lineBreak,
              disabled
            }
          },
          textParticle: {
            record() {
              return undefined
            },
            complete() {
              return undefined
            }
          } as any
        })
        return arcCount
      }

      expect(getSpaceRenderCount(true)).to.eq(0)
      expect(getSpaceRenderCount(false)).to.eq(1)

      const buildSnapshot = () => {
        const draw = (editor as any).draw
        return draw.getServices().pageRenderSnapshotBuilder.build({
          jobId: 1,
          pagePayload: {
            elementList: draw.getObjectResolver().getLayoutMainElementList(),
            positionList: draw.getCoordinate().getMainPositionList(),
            rowList: draw.getPageRowList()[0],
            pageNo: 0
          }
        })
      }

      editor.command.executeUpdateOptions({
        lineBreak: {
          disabled: true
        }
      })
      expect(
        buildSnapshot().commandList.some(
          (command: any) => command.type === 'fillCircle'
        )
      ).to.eq(false)

      editor.command.executeUpdateOptions({
        lineBreak: {
          disabled: false
        }
      })
      expect(
        buildSnapshot().commandList.some(
          (command: any) => command.type === 'fillCircle'
        )
      ).to.eq(true)
    })
  })
})
