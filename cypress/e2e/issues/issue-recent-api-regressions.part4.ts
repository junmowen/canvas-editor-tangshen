import type Editor from '../../../src/editor'
import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { BlockType } from '../../../src/editor/dataset/enum/Block'
import { BackgroundSize } from '../../../src/editor/dataset/enum/Background'
import { INTERNAL_SHORTCUT_KEY } from '../../../src/editor/dataset/constant/Shortcut'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { EditorMode, EditorZone } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'
import { WatermarkType } from '../../../src/editor/dataset/enum/Watermark'
import {
  createDomFromElementList,
  getElementListByHTML,
  getTextFromElementList
} from '../../../src/editor/utils/element'

const transparentPng =
  'data:image/png;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
const redBackgroundSvg =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#ff0000"/></svg>'
  )
const createSvgDataUrl = (fill: string) =>
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="${fill}"/></svg>`
  )

function createOrderedListElements(itemCount: number) {
  const listId = `ordered-list-${Date.now()}-${Math.random()}`
  const elementList: any[] = []
  for (let index = 0; index < itemCount; index++) {
    elementList.push({
      value: ZERO,
      listId,
      listType: ListType.OL,
      listStyle: ListStyle.DECIMAL,
      listLevel: 0
    })
    const text = `列表项${index + 1}`
    text.split('').forEach(value => {
      elementList.push({
        value,
        listId,
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL,
        listLevel: 0
      })
    })
    if (index < itemCount - 1) {
      elementList.push({
        value: '\n',
        listId,
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL,
        listLevel: 0
      })
    }
  }
  return elementList
}

function countNonWhitePixels(win: Window, dataUrl: string) {
  return new Cypress.Promise<number>((resolve, reject) => {
    const image = new win.Image()
    image.onload = () => {
      const canvas = win.document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let nonWhite = 0
      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3]
        const red = data[index]
        const green = data[index + 1]
        const blue = data[index + 2]
        if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) {
          nonWhite++
        }
      }
      resolve(nonWhite)
    }
    image.onerror = () => reject(new Error('failed to decode exported image'))
    image.src = dataUrl
  })
}

function getImagePixel(win: Window, dataUrl: string, x: number, y: number) {
  return new Cypress.Promise<[number, number, number, number]>(
    (resolve, reject) => {
      const image = new win.Image()
      image.onload = () => {
        const canvas = win.document.createElement('canvas')
        canvas.width = image.naturalWidth
        canvas.height = image.naturalHeight
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        const data = ctx.getImageData(x, y, 1, 1).data
        resolve([data[0], data[1], data[2], data[3]])
      }
      image.onerror = () => reject(new Error('failed to decode exported image'))
      image.src = dataUrl
    }
  )
}

function countImagePixels(
  win: Window,
  dataUrl: string,
  predicate: (red: number, green: number, blue: number, alpha: number) => boolean
) {
  return new Cypress.Promise<number>((resolve, reject) => {
    const image = new win.Image()
    image.onload = () => {
      const canvas = win.document.createElement('canvas')
      canvas.width = image.naturalWidth
      canvas.height = image.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      let count = 0
      for (let index = 0; index < data.length; index += 4) {
        if (
          predicate(
            data[index],
            data[index + 1],
            data[index + 2],
            data[index + 3]
          )
        ) {
          count++
        }
      }
      resolve(count)
    }
    image.onerror = () => reject(new Error('failed to decode exported image'))
    image.src = dataUrl
  })
}

function dispatchKeyboard(key: string, options: KeyboardEventInit = {}) {
  cy.get('.ce-inputarea').then($input => {
    const input = $input[0] as HTMLTextAreaElement
    const KeyboardEventCtor = input.ownerDocument.defaultView!.KeyboardEvent
    input.dispatchEvent(
      new KeyboardEventCtor('keydown', {
        key,
        bubbles: true,
        cancelable: true,
        ...options
      })
    )
  })
}

function countWordsLikeWorker(text: string) {
  const filtered = text.replace(/^\u200B/, '').replace(/\u200B/g, '\n')
  const characterList: string[] = []
  let compositionText = ''
  let isPreLetter = false
  let isPreNumber = false
  const pushCompositionText = () => {
    if (compositionText) {
      characterList.push(compositionText)
      compositionText = ''
    }
  }
  for (const char of filtered) {
    if (/[A-Za-z]/.test(char)) {
      if (!isPreLetter) pushCompositionText()
      compositionText += char
      isPreLetter = true
      isPreNumber = false
    } else if (/[0-9]/.test(char)) {
      if (!isPreNumber) pushCompositionText()
      compositionText += char
      isPreLetter = false
      isPreNumber = true
    } else {
      pushCompositionText()
      isPreLetter = false
      isPreNumber = false
      if (!/\s/.test(char)) {
        characterList.push(char)
      }
    }
  }
  pushCompositionText()
  return characterList.length
}

describe('recent issue API regressions', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })
  it('issue #1361 supports Home and End keyboard navigation', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'first line\nsecond line' }]
      })
      const positionList = (editor as any).draw
        .getPosition()
        .getPositionList()
      const rowIndexPositions = positionList.filter(
        (position: any) => position.rowIndex === 1
      )
      expect(rowIndexPositions.length).to.be.greaterThan(2)
      const middlePosition =
        rowIndexPositions[Math.floor(rowIndexPositions.length / 2)]
      const secondRowPositions = positionList.filter(
        (position: any) =>
          position.pageNo === middlePosition.pageNo &&
          position.rowNo === middlePosition.rowNo
      )
      expect(secondRowPositions.length).to.be.greaterThan(2)
      cy.wrap(secondRowPositions[0].index).as('secondRowStartIndex')
      cy.wrap(secondRowPositions[secondRowPositions.length - 1].index).as(
        'secondRowEndIndex'
      )
      editor.command.executeSetRange(middlePosition.index, middlePosition.index)
      cy.wrap(middlePosition.index).as('secondRowMiddleIndex')
    })

    dispatchKeyboard('Home')

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      expect(range.startIndex).to.eq(range.endIndex)
      cy.get('@secondRowMiddleIndex').then(middleIndex => {
        expect(range.startIndex).to.be.lessThan(Number(middleIndex))
      })
    })

    dispatchKeyboard('End', {
      shiftKey: true
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const context = editor.command.getRangeContext()
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(context?.selectionText).to.contain('second line')
      expect(context?.selectionText).not.to.contain('first')
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      editor.command.executeSetRange(range.endIndex, range.endIndex)
    })

    dispatchKeyboard('Home', {
      shiftKey: true
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      const context = editor.command.getRangeContext()
      expect(range.endIndex).to.be.greaterThan(range.startIndex)
      expect(context?.selectionText).to.contain('second')
      expect(context?.selectionText).not.to.contain('first')
    })
  })

  it('issue #1376 keeps arrow navigation at the first position of wrapped visual lines', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        width: 260,
        margins: [40, 40, 40, 40]
      })
      editor.command.executeSetValue({
        main: [
          {
            value:
              'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda'
          }
        ]
      })

      const positionList = (editor as any).draw.getPosition().getPositionList()
      const secondVisualRow = positionList.filter(
        (position: any) => position.rowIndex === 1
      )
      expect(secondVisualRow.length).to.be.greaterThan(2)
      cy.wrap(secondVisualRow[0].index).as('wrappedRowStartIndex')
      cy.wrap(secondVisualRow[1].index).as('wrappedRowSecondIndex')
      editor.command.executeSetRange(
        secondVisualRow[1].index,
        secondVisualRow[1].index
      )
    })

    dispatchKeyboard('ArrowLeft')

    cy.get('@wrappedRowStartIndex').then(startIndex => {
      cy.getEditor().then((editor: Editor) => {
        const range = editor.command.getRange()
        const cursor = editor.command.getCursorPosition()
        expect(range.startIndex).to.eq(startIndex)
        expect(range.endIndex).to.eq(startIndex)
        expect(cursor?.rowIndex).to.eq(1)
      })
    })

    dispatchKeyboard('ArrowRight')

    cy.get('@wrappedRowSecondIndex').then(secondIndex => {
      cy.getEditor().then((editor: Editor) => {
        const range = editor.command.getRange()
        const cursor = editor.command.getCursorPosition()
        expect(range.startIndex).to.eq(secondIndex)
        expect(range.endIndex).to.eq(secondIndex)
        expect(cursor?.rowIndex).to.eq(1)
      })
    })
  })

  it('issue #1240 updates cursor coordinates after paper margin changes', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'margin coordinate cursor' }]
      })
      editor.command.executeSetRange(8, 8)
      editor.command.executeFocus({
        range: {
          startIndex: 8,
          endIndex: 8
        },
        isMoveCursorToVisible: false
      })

      const before = editor.command.getCursorPosition()
      expect(before).to.not.eq(null)
      const beforeY = before!.coordinate.leftTop[1]
      const cursorIndex = before!.index
      const margins = editor.command.getPaperMargin()
      editor.command.executeSetPaperMargin([
        margins[0] + 40,
        margins[1],
        margins[2],
        margins[3] + 60
      ])
      const after = editor.command.getCursorPosition()
      const expected = (editor as any).draw
        .getPosition()
        .getPositionList()[cursorIndex]

      expect(after).to.not.eq(null)
      expect(after!.index).to.eq(cursorIndex)
      expect(after!.coordinate.leftTop[1]).to.be.greaterThan(beforeY)
      expect(after!.coordinate.leftTop[1]).to.eq(
        expected.coordinate.leftTop[1]
      )
    })
  })

  it('issue #1175 keeps cursor coordinates aligned after scaling with Songti', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        defaultFont: '宋体'
      })
      editor.command.executeSetValue({
        main: [{ value: '宋体缩放光标测试' }]
      })
      editor.command.executeSetRange(4, 4)
      editor.command.executeFocus({
        range: {
          startIndex: 4,
          endIndex: 4
        },
        isMoveCursorToVisible: false
      })

      const draw = (editor as any).draw
      const before = editor.command.getCursorPosition()
      expect(before).to.not.eq(null)
      const cursorIndex = before!.index

      editor.command.executePageScale(1.1)

      const after = editor.command.getCursorPosition()
      const expected = draw.getPosition().getPositionList()[cursorIndex]

      expect(after).to.not.eq(null)
      expect(after!.index).to.eq(cursorIndex)
      expect(after!.coordinate.leftTop[0]).to.eq(
        expected.coordinate.leftTop[0]
      )
      expect(after!.coordinate.leftTop[1]).to.eq(
        expected.coordinate.leftTop[1]
      )
    })
  })

  it('issues #225 and #261 export and import page breaks through HTML', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'before page break' }]
      })
      editor.command.executeSetRange(16, 16)
      editor.command.executePageBreak()

      const html = editor.command.getHTML().main
      expect(html).to.contain('data-ce-page-break="true"')

      const imported = getElementListByHTML(html)
      expect(
        imported.some(element => element.type === ElementType.PAGE_BREAK)
      ).to.eq(true)
    })
  })

  it('issue #273 renders content when initialized in readonly mode', () => {
    cy.document().then(doc => {
      const container = doc.createElement('div')
      container.style.width = '800px'
      container.style.height = '600px'
      doc.body.append(container)

      const EditorConstructor = ((doc.defaultView as any).editor as Editor)
        .constructor
      const readonlyEditor = new EditorConstructor(
        container,
        {
          main: [{ value: 'readonly content visible' }]
        },
        {
          mode: EditorMode.READONLY
        }
      ) as Editor

      expect(readonlyEditor.command.getValue().data.main[0].value).to.eq(
        'readonly content visible'
      )
      expect((readonlyEditor as any).draw.getRowList().length).to.be.greaterThan(
        0
      )
      readonlyEditor.destroy()
      container.remove()
    })
  })

  it('issue #369 can switch document data repeatedly with executeSetValue', () => {
    cy.getEditor().then((editor: Editor) => {
      for (let index = 0; index < 12; index++) {
        editor.command.executeSetValue({
          main: [
            {
              value: `template switch ${index}`
            }
          ]
        })
        expect(editor.command.getValue().data.main[0].value).to.eq(
          `template switch ${index}`
        )
        expect((editor as any).draw.getRowList().length).to.be.greaterThan(0)
      }
    })
  })

  it('issue #1335 preserves the current selection when executing search', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'alpha beta alpha' }]
      })
      editor.command.executeSetRange(0, 5)
      const beforeRange = editor.command.getRange()

      editor.command.executeSearch('alpha')

      expect(editor.command.getSearchNavigateInfo()?.count).to.eq(2)
      expect(editor.command.getRange()).to.deep.include({
        startIndex: beforeRange.startIndex,
        endIndex: beforeRange.endIndex
      })
      expect(editor.command.getRangeText()).to.eq('alpha')
    })
  })

  it('issue #1336 limits search matches to the current selection', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'target one target two target three' }]
      })
      editor.command.executeSetRange(0, 21)

      editor.command.executeSearch('target', {
        isLimitSelection: true
      })
      expect(editor.command.getSearchNavigateInfo()?.count).to.eq(2)

      editor.command.executeSearch('target')
      expect(editor.command.getSearchNavigateInfo()?.count).to.eq(3)
    })
  })

  it('issue #1346 searches radio control option text without offsetting later matches', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'radio-search',
              type: ControlType.RADIO,
              code: '1',
              value: null,
              valueSets: [
                { value: 'q1', code: '1' },
                { value: 'q2', code: '2' }
              ]
            }
          },
          { value: ' after q1' }
        ]
      })

      editor.command.executeSearch('q1')

      expect(editor.command.getSearchNavigateInfo()?.count).to.eq(2)
    })
  })

  it('issue #1365 lets a custom paste handler delegate non-image data to the built-in paste flow', () => {
    const pastedText = 'delegated plain text paste'

    cy.window().then(win => {
      const clipboardItem = {
        types: ['text/plain'],
        getType: () =>
          Promise.resolve(new Blob([pastedText], { type: 'text/plain' }))
      }
      Object.defineProperty(win.navigator, 'clipboard', {
        configurable: true,
        value: {
          readText: () => Promise.resolve(pastedText),
          read: () => Promise.resolve([clipboardItem])
        }
      })
    })

    cy.getEditor().then((editor: Editor) => {
      let pasteCallCount = 0
      editor.override.paste = () => {
        pasteCallCount++
        return { preventDefault: false }
      }

      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executePaste({ isPlainText: true })

      return cy.wrap(null).should(() => {
        expect(pasteCallCount).to.eq(1)
        expect(editor.command.getText().main).to.eq(pastedText)
      })
    })
  })

  it('issue #1359 keeps pasted plain HTML from inheriting global text color', () => {
    const pastedText = 'plain black paste'
    const htmlText = '<p>plain black paste</p>'

    cy.window().then(win => {
      const style = win.document.createElement('style')
      style.setAttribute('data-cy', 'issue-1359-global-color')
      style.textContent = 'body, p { color: rgb(108, 117, 125); }'
      win.document.head.append(style)

      const clipboardItem = {
        types: ['text/plain', 'text/html'],
        getType: (type: string) =>
          Promise.resolve(
            new Blob([type === 'text/html' ? htmlText : pastedText], { type })
          )
      }
      Object.defineProperty(win.navigator, 'clipboard', {
        configurable: true,
        value: {
          readText: () => Promise.resolve(pastedText),
          read: () => Promise.resolve([clipboardItem])
        }
      })
    })

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executePaste()

      return cy.wrap(null).should(() => {
        const pastedElements = editor.command
          .getValue()
          .data.main.filter(element => element.value.trim())
        expect(pastedElements.map(element => element.value).join('')).to.eq(
          pastedText
        )
        expect(pastedElements.every(element => element.color === undefined)).to.eq(
          true
        )
        expect(editor.command.getHTML().main).not.to.contain('rgb(108, 117, 125)')
      })
    })
  })

  it('issues #1003 and #951 find, update, and delete elements by id including table cells', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { id: 'keep-before', value: 'before ' },
          { id: 'delete-target', value: 'remove' },
          { id: 'keep-after', value: ' after' },
          {
            type: ElementType.TABLE,
            value: '',
            width: 200,
            colgroup: [{ width: 200 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      { id: 'table-keep', value: 'table ' },
                      { id: 'table-delete', value: 'delete' }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      expect(
        editor.command
          .getElementById({ id: 'table-delete' })
          .map(element => element.value)
          .join('')
      ).to.eq('delete')

      editor.command.executeUpdateElementById({
        id: 'table-delete',
        properties: {
          value: 'updated table text',
          color: '#ff0000'
        }
      })

      const updatedTableElements = editor.command.getElementById({
        id: 'table-delete'
      })
      expect(updatedTableElements.map(element => element.value).join('')).to.eq(
        'updated table text'
      )
      expect(updatedTableElements.every(element => element.id === 'table-delete')).to.eq(
        true
      )
      expect(updatedTableElements.every(element => element.color === '#ff0000')).to.eq(
        true
      )

      editor.command.executeDeleteElementById({ id: 'delete-target' })
      editor.command.executeDeleteElementById({ id: 'table-delete' })

      expect(editor.command.getElementById({ id: 'delete-target' })).to.deep.eq(
        []
      )
      expect(editor.command.getElementById({ id: 'table-delete' })).to.deep.eq(
        []
      )
      expect(
        editor.command
          .getElementById({ id: 'keep-before' })
          .map(element => element.value)
          .join('')
      ).to.eq('before ')
      expect(
        editor.command
          .getElementById({ id: 'keep-after' })
          .map(element => element.value)
          .join('')
      ).to.eq(' after')
      expect(
        editor.command
          .getElementById({ id: 'table-keep' })
          .map(element => element.value)
          .join('')
      ).to.eq('table ')
      const text = editor.command.getText().main
      expect(text).to.contain('before')
      expect(text).to.contain('after')
      expect(text).to.contain('table')
      expect(text).not.to.contain('remove')
      expect(text).not.to.contain('delete')
    })
  })

  it('issue #989 returns the inserted image id from executeImage and preserves it in getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([{ value: 'anchor' }])
      editor.command.executeSetRange(0, 0)

      const imageId = editor.command.executeImage({
        value: transparentPng,
        width: 20,
        height: 12
      })

      expect(imageId).to.be.a('string').and.not.eq('')
      const image = editor.command.getValue().data.main.find(
        element => element.id === imageId
      )
      expect(image).to.include({
        id: imageId,
        type: ElementType.IMAGE,
        value: transparentPng,
        width: 20,
        height: 12
      })
    })
  })

  it('issue #959 updates image elements next to controls without breaking subsequent control updates', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'signatureDate',
              type: ControlType.DATE,
              value: null,
              placeholder: 'date'
            }
          },
          {
            id: 'signature-image',
            type: ElementType.IMAGE,
            value: transparentPng,
            width: 24,
            height: 12
          },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'signatureName',
              type: ControlType.TEXT,
              value: null,
              placeholder: 'name'
            }
          }
        ]
      })

      editor.command.executeUpdateElementById({
        id: 'signature-image',
        properties: {
          value: transparentPng,
          width: 36,
          height: 18
        }
      })
      editor.command.executeSetControlValue({
        conceptId: 'signatureDate',
        value: '2026-05-20'
      })
      editor.command.executeSetControlValue({
        conceptId: 'signatureName',
        value: 'Dr. Canvas'
      })

      const image = editor.command.getElementById({ id: 'signature-image' })[0]
      expect(image).to.include({
        id: 'signature-image',
        type: ElementType.IMAGE,
        width: 36,
        height: 18,
        value: transparentPng
      })
      expect(
        editor.command.getControlValue({ conceptId: 'signatureDate' })[0]
      ).to.include({
        value: '2026-05-20',
        innerText: '2026-05-20'
      })
      expect(
        editor.command.getControlValue({ conceptId: 'signatureName' })[0]
      ).to.include({
        value: 'Dr. Canvas',
        innerText: 'Dr. Canvas'
      })
    })
  })

  it('issue #1086 keeps explicit control ids in saved listener payloads', () => {
    cy.getEditor().then((editor: Editor) => {
      let savedPayload: ReturnType<Editor['command']['getValue']> | null = null
      editor.listener.saved = payload => {
        savedPayload = payload
      }
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'saved-control-id',
            control: {
              conceptId: 'savedConcept',
              type: ControlType.TEXT,
              value: [{ value: 'saved value' }],
              placeholder: 'saved'
            }
          }
        ]
      })

      cy.get('canvas[data-index]').first().type('{ctrl+s}')

      cy.wrap(null).should(() => {
        expect(savedPayload).not.to.eq(null)
        const control = savedPayload!.data.main[0]
        expect(control).to.include({
          type: ElementType.CONTROL,
          controlId: 'saved-control-id'
        })
        expect(control.control).to.include({
          conceptId: 'savedConcept',
          type: ControlType.TEXT
        })
      })
    })
  })

  it('issue #1245 dynamically hides and shows image elements by id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'toggle-image',
            type: ElementType.IMAGE,
            value: transparentPng,
            width: 24,
            height: 24
          },
          { value: 'visible text' }
        ]
      })

      editor.command.executeUpdateElementById({
        id: 'toggle-image',
        properties: { hide: true }
      })
      let image = editor.command.getValue().data.main.find(
        element => element.id === 'toggle-image'
      )
      expect(image).to.include({
        id: 'toggle-image',
        type: ElementType.IMAGE,
        hide: true
      })
      expect(editor.command.getHTML().main).not.to.contain('<img')

      editor.command.executeUpdateElementById({
        id: 'toggle-image',
        properties: { hide: false }
      })
      image = editor.command.getValue().data.main.find(
        element => element.id === 'toggle-image'
      )
      expect(image).to.include({
        id: 'toggle-image',
        type: ElementType.IMAGE,
        hide: false
      })
      expect(editor.command.getHTML().main).to.contain('<img')
    })
  })
})