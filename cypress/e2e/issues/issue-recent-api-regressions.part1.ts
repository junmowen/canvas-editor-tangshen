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
  it('issue #1398 finds and updates elements inside list valueList by id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '',
            type: ElementType.LIST,
            listType: ListType.UL,
            listStyle: ListStyle.DISC,
            valueList: [
              {
                value: '\n',
                checkbox: {
                  value: false
                }
              },
              {
                value: '梯度：'
              },
              {
                id: 'list-image',
                value: transparentPng,
                width: 24,
                height: 24,
                type: ElementType.IMAGE
              }
            ]
          }
        ]
      })

      const found = editor.command.getElementById({ id: 'list-image' })
      expect(found).to.have.length(1)
      expect(found[0]).to.include({
        type: ElementType.IMAGE,
        width: 24,
        height: 24
      })
      expect(found[0].id).to.eq('list-image')

      editor.command.executeUpdateElementById({
        id: 'list-image',
        properties: {
          width: 32,
          height: 32
        }
      })

      const data = editor.command.getValue().data.main
      const listImage = data[0].valueList?.find(
        element => element.id === 'list-image'
      )
      expect(listImage).to.include({
        id: 'list-image',
        type: ElementType.IMAGE,
        width: 32,
        height: 32
      })
      expect(data).to.have.length(1)
    })
  })

  it('issue #1396 keeps ordered list spacing stable after the 10th item', () => {
    cy.getEditor().then((editor: Editor) => {
      const elementList = createOrderedListElements(12)
      editor.command.executeSetValue(
        {
          main: elementList
        },
        {
          isSetCursor: true
        }
      )

      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const positionList = draw.getPosition().getPositionList()
      const itemStartIndexes = elementList.flatMap((element, index) =>
        element.value === ZERO ? [index] : []
      )
      const contentLeftList = itemStartIndexes.map(index =>
        Math.round(positionList[index + 1].coordinate.leftTop[0])
      )

      expect(new Set(contentLeftList).size).to.eq(1)
      expect(contentLeftList[8]).to.eq(contentLeftList[9])
      expect(contentLeftList[9]).to.eq(contentLeftList[10])
    })
  })

  it('issue #1282 preserves valueList text style when inserting a hyperlink', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([{ value: 'anchor' }])
      editor.command.executeSetRange(0, 0)

      editor.command.executeHyperlink({
        type: ElementType.HYPERLINK,
        value: '',
        url: 'https://example.com',
        valueList: [
          {
            value: 'Styled link',
            size: 50,
            color: '#ff0000',
            bold: true
          }
        ]
      })

      const hyperlink = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.HYPERLINK)
      expect(hyperlink).to.include({
        type: ElementType.HYPERLINK,
        value: '',
        url: 'https://example.com'
      })
      expect(hyperlink?.valueList?.[0]).to.include({
        value: 'Styled link',
        size: 50,
        color: '#ff0000',
        bold: true
      })
    })
  })

  it('issue #1311 keeps rowFlex from executeInsertElementList input', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'Centered test value',
          rowFlex: RowFlex.CENTER
        },
        {
          value: '\nSecond line, left',
          rowFlex: RowFlex.LEFT
        }
      ])

      const data = editor.command.getValue().data.main
      expect(data[0]).to.include({
        value: 'Centered test value',
        rowFlex: RowFlex.CENTER
      })
      expect(data[1]).to.include({
        value: '\nSecond line, left'
      })
      expect(data[1].rowFlex).to.be.oneOf([undefined, RowFlex.LEFT])
    })
  })

  it('issue #754 keeps right rowFlex from executeInsertElementList input', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          value: 'Right aligned inserted text',
          rowFlex: RowFlex.RIGHT
        }
      ])

      expect(editor.command.getValue().data.main[0]).to.include({
        value: 'Right aligned inserted text',
        rowFlex: RowFlex.RIGHT
      })
    })
  })

  it('issue #1357 exports and imports groupIds through HTML data attributes', () => {
    const dom = createDomFromElementList([
      {
        value: 'grouped',
        groupIds: ['comment-a', 'comment-b']
      }
    ])
    const html = dom.innerHTML

    expect(html).to.contain('data-group-ids="comment-a,comment-b"')

    const imported = getElementListByHTML(html, { innerWidth: 500 })
    expect(imported[0].groupIds).to.deep.eq(['comment-a', 'comment-b'])
  })

  it('issues #819 and #890 convert editor JSON to HTML/text and HTML back to JSON without an editor instance', () => {
    const elementList = [
      {
        value: 'standalone conversion',
        bold: true,
        rowFlex: RowFlex.CENTER
      }
    ]
    const html = createDomFromElementList(elementList).innerHTML
    const text = getTextFromElementList(elementList)
    const imported = getElementListByHTML(html, { innerWidth: 500 })

    expect(html).to.contain('standalone conversion')
    expect(html).to.contain('font-weight: 600')
    expect(text).to.eq('standalone conversion')
    expect(imported[0]).to.include({
      value: 'standalone conversion',
      bold: true,
      rowFlex: RowFlex.CENTER
    })
  })

  it('issue #1393 preserves table cell background color through HTML round-trip', () => {
    const dom = createDomFromElementList([
      {
        value: '',
        type: ElementType.TABLE,
        width: 200,
        colgroup: [{ width: 200 }],
        trList: [
          {
            height: 40,
            tdList: [
              {
                colspan: 1,
                rowspan: 1,
                backgroundColor: 'rgb(255, 0, 0)',
                value: [{ value: 'red cell' }]
              }
            ]
          }
        ]
      }
    ])
    const html = dom.innerHTML

    expect(html).to.contain('background-color: rgb(255, 0, 0)')

    const imported = getElementListByHTML(html, { innerWidth: 500 })
    expect(imported[0].trList?.[0].tdList[0].backgroundColor).to.eq(
      'rgb(255, 0, 0)'
    )
  })

  it('issue #1354 applies parent rowFlex when importing centered images from HTML', () => {
    const imported = getElementListByHTML(
      `<div style="text-align: center;"><img src="${transparentPng}" width="24" height="24" /></div>`,
      { innerWidth: 500 }
    )

    expect(imported[0]).to.include({
      type: ElementType.IMAGE,
      rowFlex: RowFlex.CENTER,
      width: 24,
      height: 24
    })
  })

  it('issue #973 preserves floating image display through HTML export and import', () => {
    const html = createDomFromElementList([
      {
        value: transparentPng,
        type: ElementType.IMAGE,
        width: 24,
        height: 24,
        imgDisplay: ImageDisplay.FLOAT_TOP,
        imgFloatPosition: {
          pageNo: 0,
          x: 12,
          y: 34
        }
      }
    ]).innerHTML

    expect(html).to.contain('data-ce-image-display="float-top"')
    expect(html).to.contain('position: absolute')

    const imported = getElementListByHTML(html, { innerWidth: 500 })
    expect(imported[0]).to.include({
      type: ElementType.IMAGE,
      imgDisplay: ImageDisplay.FLOAT_TOP
    })
    expect(imported[0].imgFloatPosition).to.deep.eq({
      pageNo: 0,
      x: 12,
      y: 34
    })
  })

  it('issue #1300 applies format painter to the current word without a selection', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        { value: 'styled', bold: true, color: '#ff0000', size: 20 },
        { value: ' ' },
        { value: 'target' }
      ])

      editor.command.executeSetRange(0, 6)
      editor.command.executePainter({ isDblclick: false })
      editor.command.executeSetRange(8, 8)
      editor.command.executeApplyPainterStyle()

      const elementList = (editor as any).draw.getElementList()
      const targetStartIndex = elementList.findIndex(
        (element: any, index: number) =>
          element.value === 't' &&
          elementList
            .slice(index, index + 6)
            .map((item: any) => item.value)
            .join('') === 'target'
      )
      const targetElements = elementList.slice(
        targetStartIndex,
        targetStartIndex + 6
      )
      expect(targetElements.map(element => element.value).join('')).to.eq(
        'target'
      )
      targetElements.forEach(element => {
        expect(element).to.include({
          bold: true,
          color: '#ff0000',
          size: 20
        })
      })
    })
  })

  it('issue #906 supports setting a specific page scale through executePageScale', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePageScale(1.3)

      expect(editor.command.getOptions().scale).to.eq(1.3)

      editor.command.executePageScale(1)
      expect(editor.command.getOptions().scale).to.eq(1)
    })
  })

  it('issue #622 updates paper width and height through executeUpdateOptions', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        width: 640,
        height: 900
      })

      const options = editor.command.getOptions()
      expect(options.width).to.eq(640)
      expect(options.height).to.eq(900)
    })
  })

  it('issue #1153 applies width and height from constructor options', () => {
    cy.document().then(doc => {
      const container = doc.createElement('div')
      container.style.width = '1000px'
      container.style.height = '1000px'
      doc.body.append(container)

      const EditorConstructor = ((doc.defaultView as any).editor as Editor)
        .constructor
      const customEditor = new EditorConstructor(
        container,
        {
          main: [{ value: 'custom paper size' }]
        },
        {
          width: 560,
          height: 780
        }
      ) as Editor

      const options = customEditor.command.getOptions()
      const draw = (customEditor as any).draw
      expect(options.width).to.eq(560)
      expect(options.height).to.eq(780)
      expect(draw.getOriginalWidth()).to.eq(560)
      expect(draw.getOriginalHeight()).to.eq(780)
      expect(draw.getWidth()).to.eq(560)
      expect(draw.getHeight()).to.eq(780)

      customEditor.destroy()
      container.remove()
    })
  })

  it('issue #1156 emits input events from the internal cursor textarea', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: Event[] = []
      editor.eventBus.on('input', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [{ value: 'start' }]
      })
      editor.command.executeSetRange(4, 4)
      cy.wrap(payloads).as('inputEvents')
    })

    cy.get('.ce-inputarea').type('@', { force: true })

    cy.get('@inputEvents').then(value => {
      const payloads = value as Event[]
      expect(payloads.length).to.be.greaterThan(0)
      expect(payloads[payloads.length - 1]).to.include({
        type: 'input'
      })
    })
  })

  it('issue #1016 emits updated range style after executing size command', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: Array<{ size: number }> = []
      editor.eventBus.on('rangeStyleChange', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [{ value: 'range style size' }]
      })
      editor.command.executeSetRange(0, 5)
      editor.command.executeSize(18)
      cy.wrap(payloads).as('rangeStylePayloads')
    })

    cy.get('@rangeStylePayloads').should(value => {
      const payloads = value as Array<{ size: number }>
      expect(payloads.length).to.be.greaterThan(0)
      expect(payloads[payloads.length - 1].size).to.eq(18)
    })
  })

  it('issue #862 updates word count after typed input', () => {
    const waitForWordCount = (
      editor: Editor,
      validateText: (text: string) => void = () => undefined,
      attempt = 0
    ): Cypress.Chainable<void> => {
      return cy.wrap(editor.command.getWordCount()).then(count => {
        const currentText = editor.command
          .getValue()
          .data.main.map(element => element.value)
          .join('')
        const expected = countWordsLikeWorker(currentText)
        if (count === expected) {
          validateText(currentText)
          return
        }
        if (attempt >= 20) {
          expect(count).to.eq(expected)
        }
        return cy.wait(100).then(() =>
          waitForWordCount(editor, validateText, attempt + 1)
        )
      })
    }

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'Hello' }]
      })
      editor.command.executeSetRange(4, 4)

      return waitForWordCount(editor)
    })

    cy.getEditor().then((editor: Editor) => {
      (editor as any).draw.getComponents().canvasEvent.input(' world')
    })

    cy.getEditor().should((editor: Editor) => {
      const currentText = editor.command
        .getValue()
        .data.main.map(element => element.value)
        .join('')
      expect(currentText).to.contain('world')
    })

    cy.getEditor().then((editor: Editor) => {
      return waitForWordCount(editor, currentText => {
        expect(currentText).to.contain('world')
      })
    })
  })

  it('issue #1164 configures inactive alpha for header and footer separately', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        header: {
          inactiveAlpha: 0.35
        },
        footer: {
          inactiveAlpha: 0.45
        }
      })

      const options = editor.command.getOptions()
      expect(options.header.inactiveAlpha).to.eq(0.35)
      expect(options.footer.inactiveAlpha).to.eq(0.45)
      expect(options.inactiveAlpha).to.eq(0.6)
    })
  })

  it('issues #1043 and #1267 preserve image watermark options from executeAddWatermark', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeAddWatermark({
        data: transparentPng,
        type: WatermarkType.IMAGE,
        width: 24,
        height: 16,
        opacity: 0.5,
        repeat: true,
        gap: [12, 18]
      })

      const watermark = editor.command.getValue().options.watermark
      expect(watermark).to.include({
        data: transparentPng,
        type: WatermarkType.IMAGE,
        width: 24,
        height: 16,
        opacity: 0.5,
        repeat: true
      })
      expect(watermark?.gap).to.deep.eq([12, 18])
    })
  })

  it('issue #1296 preserves custom image id through insert and getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          id: 'custom-image-id',
          conceptId: 'image-field',
          type: ElementType.IMAGE,
          value: transparentPng,
          width: 24,
          height: 24
        }
      ])

      const image = editor.command.getValue().data.main[0]
      expect(image).to.include({
        id: 'custom-image-id',
        conceptId: 'image-field',
        type: ElementType.IMAGE,
        width: 24,
        height: 24
      })
    })
  })

  it('issue #1160 emits imageMousedown with the clicked image element', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: any[] = []
      editor.eventBus.on('imageMousedown', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [
          {
            id: 'event-image',
            type: ElementType.IMAGE,
            value: transparentPng,
            width: 36,
            height: 36
          }
        ]
      })

      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const imageIndex = draw
        .getElementList()
        .findIndex((element: any) => element.id === 'event-image')
      const position = draw.getPosition().getPositionList()[imageIndex]
      const clickPoint = {
        x: Math.floor(
          (position.coordinate.leftTop[0] + position.coordinate.rightTop[0]) /
            2
        ),
        y: Math.floor(
          (position.coordinate.leftTop[1] + position.coordinate.leftBottom[1]) /
            2
        )
      }
      cy.wrap({ clickPoint, payloads }).as('imageMousedownCase')
    })

    cy.get('@imageMousedownCase').then(value => {
      const { clickPoint } = value as {
        clickPoint: { x: number; y: number }
        payloads: any[]
      }
      cy.get('canvas[data-index="0"]').trigger(
        'mousedown',
        clickPoint.x,
        clickPoint.y,
        { button: 0, force: true }
      )
    })

    cy.get('@imageMousedownCase').then(value => {
      const { payloads } = value as { payloads: any[] }
      expect(payloads).to.have.length(1)
      expect(payloads[0].element).to.include({
        id: 'event-image',
        type: ElementType.IMAGE
      })
      expect(payloads[0].evt).to.include({
        type: 'mousedown',
        button: 0
      })
    })
  })

  it('issue #1028 does not draw image tools when imgToolDisabled is enabled', () => {
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const previewer = draw.getComponents().previewer
      const enabledImage = {
        id: 'enabled-image-tool',
        type: ElementType.IMAGE,
        value: transparentPng,
        width: 36,
        height: 36
      }
      const disabledImage = {
        ...enabledImage,
        id: 'disabled-image-tool',
        imgToolDisabled: true
      }

      previewer.drawResizer(enabledImage)
      expect(Cypress.$('.ce-resizer-selection').css('display')).to.eq('block')

      previewer.clearResizer()
      previewer.drawResizer(disabledImage)
      expect(Cypress.$('.ce-resizer-selection').css('display')).to.eq('none')

      editor.command.executeMode(EditorMode.DESIGN)
      previewer.drawResizer(disabledImage)
      expect(Cypress.$('.ce-resizer-selection').css('display')).to.eq('block')
    })
  })

  it('issue #1132 can disable image selection and preview in readonly and print modes', () => {
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const previewer = draw.getComponents().previewer
      const image = {
        id: 'mode-disabled-image-preview',
        type: ElementType.IMAGE,
        value: transparentPng,
        width: 36,
        height: 36
      }

      editor.command.executeUpdateOptions({
        modeRule: {
          readonly: {
            imagePreviewerDisabled: true
          },
          print: {
            imagePreviewerDisabled: true
          }
        }
      })

      editor.command.executeMode(EditorMode.READONLY)
      previewer.drawResizer(image)
      expect(Cypress.$('.ce-resizer-selection').css('display')).to.eq('none')
      previewer.updateResizer(image)
      previewer.render()
      expect(Cypress.$('.ce-image-previewer')).to.have.length(0)

      editor.command.executeMode(EditorMode.PRINT)
      previewer.drawResizer(image)
      expect(Cypress.$('.ce-resizer-selection').css('display')).to.eq('none')
      previewer.updateResizer(image)
      previewer.render()
      expect(Cypress.$('.ce-image-previewer')).to.have.length(0)
    })
  })
})
