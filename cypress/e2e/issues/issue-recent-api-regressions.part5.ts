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
  it('issue #1234 can restore a document directly from getValue data', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [{ value: 'Header value' }],
        main: [
          { value: 'Plain value ' },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'roundtrip-control',
            control: {
              conceptId: 'roundtripConcept',
              type: ControlType.TEXT,
              value: [{ value: 'control value' }],
              placeholder: 'control'
            }
          },
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
                    value: [{ value: 'cell value' }]
                  }
                ]
              }
            ]
          }
        ],
        footer: [{ value: 'Footer value' }]
      })
      const saved = editor.command.getValue()

      editor.command.executeSetValue(saved.data)
      const restored = editor.command.getValue()

      expect(restored.data).to.deep.eq(saved.data)
      expect(editor.command.getText().main).to.contain('Plain value')
      expect(editor.command.getText().main).to.contain('control value')
      expect(editor.command.getText().main).to.contain('cell value')
    })
  })

  it('issue #1241 exports header, main, and footer content through getHTML', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [{ value: 'Header HTML' }],
        main: [
          { value: 'Main HTML ' },
          {
            type: ElementType.HYPERLINK,
            value: '',
            url: 'https://example.com',
            valueList: [{ value: 'link text' }]
          }
        ],
        footer: [{ value: 'Footer HTML' }]
      })

      const html = editor.command.getHTML()

      expect(html.header).to.contain('Header HTML')
      expect(html.main).to.contain('Main HTML')
      expect(html.main).to.contain('https://example.com')
      expect(html.main).to.contain('link text')
      expect(html.footer).to.contain('Footer HTML')
    })
  })

  it('issue #1236 exports and re-imports video and iframe block HTML', () => {
    const html = createDomFromElementList([
      {
        value: '',
        type: ElementType.BLOCK,
        width: 240,
        height: 120,
        block: {
          type: BlockType.VIDEO,
          videoBlock: {
            src: 'https://example.com/video.mp4'
          }
        }
      },
      {
        value: '',
        type: ElementType.BLOCK,
        width: 260,
        height: 140,
        block: {
          type: BlockType.IFRAME,
          iframeBlock: {
            srcdoc: '<html><body><strong>iframe block</strong></body></html>'
          }
        }
      }
    ]).innerHTML

    expect(html).to.contain('<video')
    expect(html).to.contain('https://example.com/video.mp4')
    expect(html).to.contain('<iframe')
    expect(html).to.contain('iframe block')

    const imported = getElementListByHTML(html, { innerWidth: 500 })
    expect(imported[0]).to.include({
      type: ElementType.BLOCK,
      width: 240,
      height: 120
    })
    expect(imported[0].block?.type).to.eq(BlockType.VIDEO)
    expect(imported[0].block?.videoBlock?.src).to.eq(
      'https://example.com/video.mp4'
    )
    expect(imported[1]).to.include({
      type: ElementType.BLOCK,
      width: 260,
      height: 140
    })
    expect(imported[1].block?.type).to.eq(BlockType.IFRAME)
    expect(imported[1].block?.iframeBlock?.srcdoc).to.contain('iframe block')
  })

  it('issue #1201 preserves custom image metadata through getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'image-with-metadata',
            type: ElementType.IMAGE,
            value: transparentPng,
            width: 32,
            height: 16,
            conceptId: 'signature-image',
            externalId: 'external-image-001',
            extension: {
              customTag: 'myExtraValue',
              source: 'template'
            }
          }
        ]
      })

      const image = editor.command.getValue().data.main[0]
      expect(image).to.include({
        id: 'image-with-metadata',
        type: ElementType.IMAGE,
        value: transparentPng,
        width: 32,
        height: 16,
        conceptId: 'signature-image',
        externalId: 'external-image-001'
      })
      expect(image.extension).to.deep.eq({
        customTag: 'myExtraValue',
        source: 'template'
      })
    })
  })

  it('issue #1182 keeps full-width image dimensions after margins and value round-trip', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: transparentPng,
            type: ElementType.IMAGE,
            width: 634,
            height: 551.7027707808564
          }
        ]
      })
      editor.command.executeUpdateOptions({
        width: 794,
        height: 1123,
        margins: [100, 80, 100, 80]
      })

      const saved = editor.command.getValue()
      const image = saved.data.main[0]
      expect(image).to.include({
        type: ElementType.IMAGE,
        width: 634,
        height: 551.7027707808564
      })

      editor.command.executeSetValue(saved.data)
      const restored = editor.command.getValue().data.main[0]
      expect(restored).to.include({
        type: ElementType.IMAGE,
        width: 634,
        height: 551.7027707808564
      })
    })
  })

  it('issue #1215 can read an inserted image id from getValue and delete by that id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          type: ElementType.IMAGE,
          value: transparentPng,
          width: 24,
          height: 24,
          extension: {
            name: 'inserted image',
            value: 'image-record-1'
          }
        },
        { value: ' after image' }
      ])

      const image = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.IMAGE)
      expect(image?.id).to.be.a('string').and.not.eq('')
      expect(image?.extension).to.deep.eq({
        name: 'inserted image',
        value: 'image-record-1'
      })

      editor.command.executeDeleteElementById({ id: image!.id })

      const value = editor.command.getValue().data.main
      expect(value.some(element => element.id === image!.id)).to.eq(false)
      expect(value.some(element => element.type === ElementType.IMAGE)).to.eq(
        false
      )
      expect(editor.command.getText().main).to.contain('after image')
    })
  })

  it('issue #981 replaces page number placeholders in watermark text', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeAddWatermark({
        data: 'Page {pageNo}/{pageCount}',
        size: 24,
        repeat: false
      })
      editor.command.executeSetValue({
        main: [{ value: 'watermark placeholder page' }]
      })

      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const canvas = Cypress.$('canvas[data-index="0"]')[0] as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!
      const fillTextCalls: string[] = []
      const originalFillText = ctx.fillText.bind(ctx)
      cy.stub(ctx, 'fillText').callsFake(
        (
          text: string,
          x: number,
          y: number,
          maxWidth?: number
        ): void => {
          fillTextCalls.push(String(text))
          if (maxWidth === undefined) {
            originalFillText(text, x, y)
          } else {
            originalFillText(text, x, y, maxWidth)
          }
        }
      )

      draw.getComponents().waterMark.renderText(ctx, 0)

      expect(fillTextCalls).to.include('Page 1/1')
      expect(fillTextCalls).not.to.include('Page {pageNo}/{pageCount}')
    })
  })
})