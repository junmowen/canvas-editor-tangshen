import type Editor from '../../../src/editor'
import { BlockType } from '../../../src/editor/dataset/enum/Block'
import { INTERNAL_SHORTCUT_KEY } from '../../../src/editor/dataset/constant/Shortcut'
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

  it.skip('issue #1406 adds group ids to selected main text in form mode', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'comment target' }]
      })
      editor.command.executeMode(EditorMode.FORM)
      editor.command.executeSetRange(0, 6)

      expect((editor as any).draw.getMode()).to.eq(EditorMode.FORM)
      expect((editor as any).draw.getZone().getZone()).to.eq('main')
      const groupId = editor.command.executeSetGroup()

      expect(groupId).to.be.a('string').and.not.eq('')
      const groupedText = editor.command
        .getValue()
        .data.main.filter(element => element.groupIds?.includes(groupId!))
        .map(element => element.value)
        .join('')
      expect(groupedText).to.eq('comment')
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

  it('issue #862 updates word count after typed input', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'Hello' }]
      })
      editor.command.executeSetRange(4, 4)

      return editor.command.getWordCount().then(count => {
        const currentText = editor.command
          .getValue()
          .data.main.map(element => element.value)
          .join('')
        expect(count).to.eq(countWordsLikeWorker(currentText))
      })
    })

    cy.get('.ce-inputarea').type(' world 你好', { force: true })

    cy.getEditor().then((editor: Editor) => {
      return editor.command.getWordCount().then(count => {
        const currentText = editor.command
          .getValue()
          .data.main.map(element => element.value)
          .join('')
        expect(count).to.eq(countWordsLikeWorker(currentText))
        expect(currentText).to.contain('world')
        expect(currentText).to.contain('你好')
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

  it('issue #1267 preserves image watermark options from executeAddWatermark', () => {
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

  it('issue #1264 keeps inline font-family when importing HTML', () => {
    const imported = getElementListByHTML(
      '<span style="font-family: Microsoft YaHei; font-size: 16px;">测试文本</span>',
      { innerWidth: 500 }
    )

    expect(imported[0]).to.include({
      value: '测试文本',
      font: 'Microsoft YaHei',
      size: 16
    })
  })

  it('issues #380, #488, and #1088 preserve font-family through HTML import and round-trip', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetHTML({
        main:
          '<span style="font-family: STKaiti; color: rgb(0, 0, 0); font-size: 16px;">测试文字</span>'
      })

      const value = editor.command.getValue().data.main[0]
      expect(value).to.include({
        value: '测试文字',
        font: 'STKaiti',
        color: 'rgb(0, 0, 0)',
        size: 16
      })

      const html = editor.command.getHTML().main
      expect(html).to.contain('font-family')

      editor.command.executeSetHTML({
        main: html
      })

      const restored = editor.command.getValue().data.main[0]
      expect(restored).to.include({
        value: '测试文字',
        font: 'STKaiti',
        size: 16
      })
    })
  })

  it('issue #1286 parses table HTML without requiring explicit options', () => {
    const imported = getElementListByHTML(
      '<table><tr style="height: 48px;"><td>cell</td></tr></table>'
    )

    expect(imported[0]).to.include({
      type: ElementType.TABLE
    })
    expect(imported[0].trList?.[0].tdList[0].value[0].value).to.eq('cell')
  })

  it('issue #1039 preserves extension and externalId on list getValue output', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '',
            type: ElementType.LIST,
            listType: ListType.OL,
            extension: {
              a: 1
            },
            externalId: 'diagnosis-list',
            valueList: [
              {
                value: '\n高血压\n糖尿病'
              }
            ]
          }
        ]
      })

      const list = editor.command.getValue().data.main[0]
      expect(list).to.include({
        type: ElementType.LIST,
        externalId: 'diagnosis-list'
      })
      expect(list.extension).to.deep.eq({ a: 1 })
    })
  })

  it('issue #1067 exposes getValueAsync with the same zipped data contract as getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '',
            type: ElementType.LIST,
            listType: ListType.OL,
            externalId: 'async-list',
            valueList: [{ value: '异步读取列表' }]
          },
          {
            value: '\n'
          },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'async-control',
              type: ControlType.TEXT,
              value: [{ value: '异步控件值' }],
              placeholder: '异步控件'
            }
          }
        ]
      })

      const syncValue = editor.command.getValue()
      return editor.command.getValueAsync().then(asyncValue => {
        expect(asyncValue.data.main).to.deep.eq(syncValue.data.main)
        expect(asyncValue.data.main[0]).to.include({
          type: ElementType.LIST,
          externalId: 'async-list'
        })
        expect(asyncValue.data.main[2].control).to.include({
          conceptId: 'async-control',
          type: ControlType.TEXT
        })
      })
    })
  })

  it('issue #1135 exports paragraph spacing and line spacing to HTML styles', () => {
    const html = createDomFromElementList([
      {
        value: 'spaced',
        rowMargin: 1.5,
        spaceBefore: 12,
        spaceAfter: 18
      }
    ]).innerHTML

    expect(html).to.contain('line-height: 1.5')
    expect(html).to.contain('margin-top: 12px')
    expect(html).to.contain('margin-bottom: 18px')
  })

  it('issue #1251 preserves table row height through HTML import', () => {
    const imported = getElementListByHTML(
      '<table><tr style="height: 104px;"><td>tall</td></tr><tr style="height: 40px;"><td>short</td></tr></table>',
      { innerWidth: 500 }
    )

    expect(imported[0].trList?.[0]).to.include({
      height: 104,
      minHeight: 104
    })
    expect(imported[0].trList?.[1]).to.include({
      height: 40,
      minHeight: 40
    })
  })

  it('issue #771 preserves leading line breaks through repeated getValue and setValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: '\n' }, { value: 'after leading break' }]
      })

      const firstRound = editor.command.getValue().data.main
      editor.command.executeSetValue({ main: firstRound })
      const secondRound = editor.command.getValue().data.main
      editor.command.executeSetValue({ main: secondRound })
      const thirdRound = editor.command.getValue().data.main

      const roundTripText = thirdRound.map(element => element.value).join('')
      expect(roundTripText.startsWith('\n')).to.eq(true)
      expect(roundTripText).to.contain('after leading break')
    })
  })

  it('issues #664 and #677 import base64 images from executeSetHTML in a single call', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetHTML({
        main: `<p>before</p><p><img src="${transparentPng}" alt="" /></p><p>after</p>`
      })

      const image = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.IMAGE)
      expect(image).to.include({
        type: ElementType.IMAGE,
        value: transparentPng
      })
      expect(editor.command.getHTML().main).to.contain(transparentPng)
    })
  })

  it('issue #704 does not inject rgba alpha color when importing plain styled HTML', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetHTML({
        main: '<p style="font-family: 仿宋; text-align: center; font-size: 32px;">下午好</p>'
      })

      const html = editor.command.getHTML().main
      expect(html).to.contain('下午好')
      expect(html).not.to.contain('rgba(0, 0, 0, 0.65)')
    })
  })

  it('issue #1049 preserves titleId when reading getValue output', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'fixed-title-id',
            level: TitleLevel.FOURTH,
            valueList: [
              {
                type: ElementType.TEXT,
                value: '标题内容'
              }
            ]
          }
        ]
      })

      const title = editor.command.getValue().data.main[0]
      expect(title).to.include({
        type: ElementType.TITLE,
        titleId: 'fixed-title-id',
        level: TitleLevel.FOURTH,
        value: ''
      })
      expect(title.valueList?.[0]).to.include({
        value: '标题内容'
      })
    })
  })

  it('issue #536 reads content that belongs to a title concept id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'history-title',
            level: TitleLevel.FIRST,
            title: {
              conceptId: 'history'
            },
            valueList: [{ value: '现病史' }]
          },
          { value: '患者发热三天' },
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'diagnosis-title',
            level: TitleLevel.FIRST,
            title: {
              conceptId: 'diagnosis'
            },
            valueList: [{ value: '诊断' }]
          },
          { value: '上呼吸道感染' }
        ]
      })

      const history = editor.command.getTitleValue({ conceptId: 'history' })?.[0]
      expect(history).to.include({
        conceptId: 'history',
        value: '患者发热三天',
        zone: 'main'
      })
      expect(history?.elementList?.[0]).to.include({
        value: '患者发热三天'
      })
    })
  })

  it('issues #1097 and #1094 keep title valueList separate from title body values and update it by id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'title-element',
            type: ElementType.TITLE,
            value: '',
            titleId: 'title-concept',
            level: TitleLevel.FIRST,
            title: {
              conceptId: 'titleConcept'
            },
            valueList: [{ id: 'title-label', value: '原标题' }]
          },
          { value: '标题下正文' }
        ]
      })

      const titleValue = editor.command.getTitleValue({
        conceptId: 'titleConcept'
      })?.[0]
      expect(titleValue).to.include({
        conceptId: 'titleConcept',
        value: '标题下正文'
      })
      expect(editor.command.getValue().data.main[0].valueList?.[0]).to.include({
        id: 'title-label',
        value: '原标题'
      })

      editor.command.executeUpdateElementById({
        id: 'title-label',
        properties: {
          value: '新标题'
        }
      })

      expect(editor.command.getValue().data.main[0].valueList?.[0]).to.include({
        id: 'title-label',
        value: '新标题'
      })
      expect(
        editor.command.getTitleValue({ conceptId: 'titleConcept' })?.[0].value
      ).to.eq('标题下正文')
    })
  })

  it('issue #738 exposes catalog title ids, levels, names, and page numbers', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'catalog-a',
            level: TitleLevel.FIRST,
            valueList: [{ value: '第一章' }]
          },
          { value: '正文' },
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'catalog-b',
            level: TitleLevel.SECOND,
            valueList: [{ value: '第一节' }]
          }
        ]
      })

      return editor.command.getCatalog().then(catalog => {
        expect(catalog?.[0]).to.include({
          id: 'catalog-a',
          name: '第一章',
          level: TitleLevel.FIRST,
          pageNo: 0
        })
        expect(catalog?.[0].subCatalog[0]).to.include({
          id: 'catalog-b',
          name: '第一节',
          level: TitleLevel.SECOND,
          pageNo: 0
        })
      })
    })
  })

  it('issue #812 returns page numbers for catalog title ids', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'page-title-id',
            level: TitleLevel.FIRST,
            valueList: [{ value: '目录页码标题' }]
          },
          { value: '标题正文' }
        ]
      })

      return editor.command.getCatalog().then(catalog => {
        const item = catalog?.find(entry => entry.id === 'page-title-id')
        expect(item).to.include({
          id: 'page-title-id',
          pageNo: 0
        })
      })
    })
  })

  it('issue #715 can set the cursor at the end after executeSetValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue(
        {
          main: [{ value: 'streamed' }, { value: ' content' }]
        },
        {
          isSetCursor: true
        }
      )

      const range = editor.command.getRange()
      const endIndex = (editor as any).draw.getOriginalMainElementList().length - 1
      expect(range.startIndex).to.eq(endIndex)
      expect(range.endIndex).to.eq(endIndex)
      expect(editor.command.getCursorPosition()?.index).to.eq(endIndex)
    })
  })

  it('issues #917, #918, and #919 configure main and area badges including text values', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'badge-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [{ value: '区域内容' }]
          }
        ]
      })
      editor.command.executeSetMainBadge({
        value: transparentPng,
        width: 20,
        height: 10,
        left: 2,
        top: 3
      })
      editor.command.executeSetAreaBadge([
        {
          areaId: 'badge-area',
          badge: {
            value: '草稿',
            width: 30,
            height: 12,
            left: 4,
            top: 5
          }
        }
      ])

      const badge = (editor as any).draw.getBadge()
      const renderable = badge.getRenderableBadgeList(0)
      expect(renderable).to.have.length(2)
      expect(renderable.find((item: any) => item.value === transparentPng)).to.include({
        width: 20,
        height: 10
      })
      expect(renderable.find((item: any) => item.value === '草稿')).to.include({
        width: 30,
        height: 12
      })
    })
  })

  it('issue #683 returns plain control elements from titles and lists in getControlList', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'title-with-control',
            level: TitleLevel.FIRST,
            valueList: [
              { value: '标题' },
              {
                type: ElementType.CONTROL,
                value: '',
                control: {
                  conceptId: 'titleControl',
                  type: ControlType.TEXT,
                  value: [{ value: '标题控件' }],
                  placeholder: '标题控件'
                }
              }
            ]
          },
          {
            type: ElementType.LIST,
            value: '',
            listType: ListType.OL,
            valueList: [
              { value: '\n列表' },
              {
                type: ElementType.CONTROL,
                value: '',
                control: {
                  conceptId: 'listControl',
                  type: ControlType.TEXT,
                  value: [{ value: '列表控件' }],
                  placeholder: '列表控件'
                }
              }
            ]
          }
        ]
      })

      const controlList = editor.command.getControlList()
      const conceptIds = controlList.map(element => element.control?.conceptId)
      expect(conceptIds).to.include.members(['titleControl', 'listControl'])
      expect(controlList.every(element => element.type === ElementType.CONTROL)).to.eq(
        true
      )
      expect(controlList.some(element => element.type === ElementType.TITLE)).to.eq(
        false
      )
      expect(controlList.some(element => element.type === ElementType.LIST)).to.eq(
        false
      )
    })
  })

  it('issue #604 preserves title conceptId when inserting title elements', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          type: ElementType.TITLE,
          value: '',
          titleId: 'inserted-title-id',
          level: TitleLevel.FIRST,
          title: {
            conceptId: 'chief-complaint'
          },
          valueList: [
            {
              value: '主诉：',
              size: 18
            }
          ]
        },
        {
          value: '发'
        },
        {
          value: '热三天'
        }
      ])

      const title = editor.command.getValue().data.main[0]
      expect(title).to.include({
        type: ElementType.TITLE,
        titleId: 'inserted-title-id',
        level: TitleLevel.FIRST,
        value: ''
      })
      expect(title.title?.conceptId).to.eq('chief-complaint')
      expect(title.valueList?.[0].value).to.eq('主诉：')
      const titleValue = editor.command.getTitleValue({
        conceptId: 'chief-complaint'
      })[0]
      expect(titleValue).to.include({
        conceptId: 'chief-complaint',
        value: '发热三天',
        zone: 'main'
      })
      expect(titleValue.elementList?.[0].value).to.eq('发热三天')
    })
  })

  it('issue #1389 does not insert extra line breaks between adjacent list blocks', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            level: TitleLevel.FOURTH,
            valueList: [
              {
                type: ElementType.TEXT,
                value: '无序列表'
              }
            ]
          },
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
                type: ElementType.TEXT,
                value: '第一项'
              },
              {
                value: '\n',
                checkbox: {
                  value: false
                }
              },
              {
                type: ElementType.TEXT,
                value: '第二项'
              }
            ]
          },
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
                type: ElementType.TAB,
                value: ''
              },
              {
                type: ElementType.TEXT,
                value: '嵌套无序项'
              },
              {
                value: '\n',
                checkbox: {
                  value: false
                }
              },
              {
                type: ElementType.TAB,
                value: ''
              },
              {
                type: ElementType.TEXT,
                value: '另一个嵌套项'
              }
            ]
          },
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
                type: ElementType.TEXT,
                value: '第三项'
              }
            ]
          }
        ]
      })

      const data = editor.command.getValue().data.main
      const listBlocks = data.filter(
        element => element.type === ElementType.LIST
      )
      expect(listBlocks).to.have.length(3)
      expect(data.map(element => element.type)).to.deep.eq([
        ElementType.TITLE,
        ElementType.LIST,
        ElementType.LIST,
        ElementType.LIST
      ])
      expect(data.some(element => element.value === '\n')).to.eq(false)
    })
  })

  it('issue #1167 disables Ctrl wheel page scaling through shortcutDisableKeys', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        shortcutDisableKeys: [INTERNAL_SHORTCUT_KEY.PAGE_SCALE]
      })

      cy.document().trigger('wheel', {
        deltaY: -100,
        ctrlKey: true,
        bubbles: true,
        cancelable: true
      })

      cy.getEditor().then((nextEditor: Editor) => {
        expect(nextEditor.command.getOptions().scale).to.eq(1)
      })
    })
  })

  it('issue #1278 removes disabled header and footer from layout and editing zones', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [{ value: 'Header value' }],
        main: [{ value: 'Main value' }],
        footer: [{ value: 'Footer value' }]
      })

      const draw = (editor as any).draw
      expect(draw.getHeader().getHeight()).to.be.greaterThan(0)
      expect(draw.getFooter().getHeight()).to.be.greaterThan(0)

      editor.command.executeUpdateOptions({
        header: { disabled: true },
        footer: { disabled: true }
      })
      editor.command.executeForceUpdate()

      expect(draw.getHeader().getHeight()).to.eq(0)
      expect(draw.getFooter().getHeight()).to.eq(0)
      expect(draw.getMainOuterHeight()).to.eq(
        draw.getMargins()[0] + draw.getMargins()[2]
      )

      const pageHeight = draw.getPageCanvasHost().getPageHeight(0)
      expect(draw.getZone().getZoneByY(1, 0)).to.eq(EditorZone.MAIN)
      expect(draw.getZone().getZoneByY(pageHeight - 1, 0)).to.eq(
        EditorZone.MAIN
      )
    })
  })

  it('issue #1260 allows iframe blocks to request fullscreen and popup navigation', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'youtube-embed',
            value: '',
            type: ElementType.BLOCK,
            width: 320,
            height: 180,
            block: {
              type: BlockType.IFRAME,
              iframeBlock: {
                src: 'https://www.youtube.com/embed/dQw4w9WgXcQ'
              }
            }
          }
        ]
      })
    })

    cy.get('iframe[data-id="youtube-embed"]')
      .should('have.attr', 'allow')
      .and('include', 'fullscreen')
    cy.get('iframe[data-id="youtube-embed"]')
      .should('have.prop', 'allowFullscreen', true)
      .invoke('attr', 'sandbox')
      .then(sandbox => {
        expect(sandbox).to.contain('allow-presentation')
        expect(sandbox).to.contain('allow-popups')
        expect(sandbox).to.contain('allow-popups-to-escape-sandbox')
        expect(sandbox).to.contain('allow-top-navigation-by-user-activation')
      })
  })

  it('issue #1369 syncs edited iframe srcdoc content before getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'srcdoc-block',
            value: '',
            type: ElementType.BLOCK,
            width: 160,
            height: 80,
            block: {
              type: BlockType.IFRAME,
              iframeBlock: {
                srcdoc:
                  '<!DOCTYPE html><html><body><button id="cell">1</button></body></html>'
              }
            }
          }
        ]
      })
    })

    cy.get('iframe[data-id="srcdoc-block"]').should($iframe => {
      const button = $iframe[0].contentDocument?.querySelector('#cell')
      expect(button).not.to.eq(null)
    })
    cy.get('iframe[data-id="srcdoc-block"]').then($iframe => {
      const button = $iframe[0].contentDocument!.querySelector('#cell')!
      button.classList.add('selected')
      button.textContent = 'selected'
    })

    cy.getEditor().then((editor: Editor) => {
      const block = editor.command.getValue().data.main[0]
      expect(block.block?.iframeBlock?.srcdoc).to.contain('selected')
      expect(block.block?.iframeBlock?.srcdoc).to.contain(
        'class="selected"'
      )
    })
  })

  it('issue #1373 disables iframe block interaction in readonly and print modes', () => {
    const srcdoc =
      '<html><body><input id="field" value="locked"><button id="cell">cell</button></body></html>'

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'readonly-iframe-block',
            value: '',
            type: ElementType.BLOCK,
            width: 260,
            height: 120,
            block: {
              type: BlockType.IFRAME,
              iframeBlock: {
                srcdoc
              }
            }
          }
        ]
      })
      editor.command.executeMode(EditorMode.READONLY)
    })

    cy.get('iframe[data-id="readonly-iframe-block"]').should($iframe => {
      const iframe = $iframe[0] as HTMLIFrameElement
      expect(iframe.hasAttribute('inert')).to.eq(true)
      expect(iframe.tabIndex).to.eq(-1)
      expect(iframe.style.pointerEvents).to.eq('none')
      const input = iframe.contentDocument?.querySelector(
        '#field'
      ) as HTMLInputElement | null
      expect(input?.value).to.eq('locked')
      if (input) {
        input.value = 'changed while readonly'
      }
    })

    cy.getEditor().then((editor: Editor) => {
      const block = editor.command.getValue().data.main[0]
      expect(block.block?.iframeBlock?.srcdoc).to.contain('locked')
      expect(block.block?.iframeBlock?.srcdoc).not.to.contain(
        'changed while readonly'
      )

      editor.command.executeMode(EditorMode.PRINT)
    })

    cy.get('iframe[data-id="readonly-iframe-block"]').should($iframe => {
      const iframe = $iframe[0] as HTMLIFrameElement
      expect(iframe.hasAttribute('inert')).to.eq(true)
      expect(iframe.tabIndex).to.eq(-1)
      expect(iframe.style.pointerEvents).to.eq('none')
    })
  })

  it('issue #1374 keeps iframe block position stable in print mode', () => {
    const srcdoc =
      '<div style="width:260px;height:120px;background:#1f6feb;color:white">PRINT POSITION</div>'

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeMode(EditorMode.PRINT)
      editor.command.executeSetValue({
        main: [
          {
            value: 'before print block\n'
          },
          {
            id: 'print-position-iframe',
            value: '',
            type: ElementType.BLOCK,
            width: 260,
            height: 120,
            block: {
              type: BlockType.IFRAME,
              iframeBlock: {
                srcdoc
              }
            }
          }
        ]
      })
    })

    cy.get('iframe[data-id="print-position-iframe"]')
      .parents('.ce-block-item')
      .should($blockItem => {
        expect($blockItem).to.have.length(1)
        const top = Number.parseFloat($blockItem[0].style.top)
        const left = Number.parseFloat($blockItem[0].style.left)
        const width = Number.parseFloat($blockItem[0].style.width)
        const height = Number.parseFloat($blockItem[0].style.height)
        expect(top, 'print block top').to.be.greaterThan(0)
        expect(left, 'print block left').to.be.greaterThan(0)
        expect(width, 'print block width').to.eq(260)
        expect(height, 'print block height').to.eq(120)
      })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const rowList = draw.getRowList()
      let blockRow: any
      let blockIndex = -1
      let positionOffset = 0
      for (const row of rowList) {
        blockIndex = row.elementList.findIndex(
          (element: any) => element.id === 'print-position-iframe'
        )
        if (blockIndex !== -1) {
          blockRow = row
          break
        }
        positionOffset += row.elementList.length
      }
      const rowPosition = draw
        .getPosition()
        .getPositionList()[positionOffset + blockIndex]
      const blockElement = blockRow.elementList.find(
        (element: any) => element.id === 'print-position-iframe'
      )
      const expectedTop =
        rowPosition.coordinate.leftTop[1] + rowPosition.ascent
      const expectedLeft = rowPosition.coordinate.leftTop[0]

      cy.get('iframe[data-id="print-position-iframe"]')
        .parents('.ce-block-item')
        .should($blockItem => {
          expect(Number.parseFloat($blockItem[0].style.top)).to.be.closeTo(
            expectedTop,
            1
          )
          expect(Number.parseFloat($blockItem[0].style.left)).to.be.closeTo(
            expectedLeft,
            1
          )
        })
      expect(blockElement.metrics.width).to.eq(260)
      expect(blockElement.metrics.height).to.eq(120)
      editor.command.executeMode(EditorMode.EDIT)
    })
  })

  it('issue #1375 prints iframe blocks through image export', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: Editor) => {
        editor.command.executeMode(EditorMode.PRINT)
        editor.command.executeSetValue({
          main: [
            {
              value: 'iframe print export\n'
            },
            {
              id: 'print-export-iframe',
              type: ElementType.BLOCK,
              value: '',
              width: 240,
              height: 100,
              block: {
                type: BlockType.IFRAME,
                iframeBlock: {
                  srcdoc:
                    '<div style="width:240px;height:100px;background:#d1242f;color:white;font:22px sans-serif;display:flex;align-items:center;justify-content:center">IFRAME PRINT</div>'
                }
              }
            }
          ]
        })

        return cy.wrap(editor.command.getImage()).then((dataUrlList: string[]) => {
          expect(dataUrlList.length).to.be.greaterThan(0)
          expect(dataUrlList[0]).to.match(/^data:image\/png/)
          return countNonWhitePixels(win, dataUrlList[0]).then(nonWhite => {
            expect(
              nonWhite,
              'print mode iframe block should be rasterized into output'
            ).to.be.greaterThan(500)
          })
        })
      })
    })
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeMode(EditorMode.EDIT)
    })
  })

  it('issue #1380 exports iframe blocks through getImage', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: Editor) => {
        editor.command.executeSetValue({
          main: [
            {
              value: 'iframe image export\n'
            },
            {
              id: 'get-image-iframe',
              type: ElementType.BLOCK,
              value: '',
              width: 220,
              height: 80,
              block: {
                type: BlockType.IFRAME,
                iframeBlock: {
                  srcdoc:
                    '<div style="width:220px;height:80px;background:#1f6feb;color:white;font:20px sans-serif;display:flex;align-items:center;justify-content:center">IFRAME EXPORT</div>'
                }
              }
            }
          ]
        })

        return cy.wrap(editor.command.getImage()).then((dataUrlList: string[]) => {
          expect(dataUrlList.length).to.be.greaterThan(0)
          expect(dataUrlList[0]).to.match(/^data:image\/png/)
          return countNonWhitePixels(win, dataUrlList[0]).then(nonWhite => {
            expect(
              nonWhite,
              'iframe block should be rasterized into getImage output'
            ).to.be.greaterThan(500)
          })
        })
      })
    })
  })

  it('issue #1314 disables page background in print image export', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: Editor) => {
        editor.command.executeSetValue({
          main: [{ value: 'print without page background' }]
        })
        editor.command.executeUpdateOptions({
          background: {
            color: '#ff0000'
          },
          modeRule: {
            print: {
              backgroundDisabled: true
            }
          }
        })

        return cy.wrap(editor.command.getImage({ pixelRatio: 1 })).then(
          (normalDataUrlList: string[]) => {
            return getImagePixel(win, normalDataUrlList[0], 10, 10).then(
              normalPixel => {
                expect(normalPixel[0]).to.be.greaterThan(240)
                expect(normalPixel[1]).to.be.lessThan(20)
                expect(normalPixel[2]).to.be.lessThan(20)
                return cy
                  .wrap(
                    editor.command.getImage({
                      mode: EditorMode.PRINT,
                      pixelRatio: 1
                    })
                  )
                  .then((printDataUrlList: string[]) => {
                    return getImagePixel(win, printDataUrlList[0], 10, 10).then(
                      printPixel => {
                        expect(printPixel[0]).to.be.lessThan(20)
                        expect(printPixel[1]).to.be.lessThan(20)
                        expect(printPixel[2]).to.be.lessThan(20)
                        expect(printPixel[3]).to.eq(0)
                      }
                    )
                  })
              }
            )
          }
        )
      })
    })
  })

  it('issue #1218 can export images without page margin indicators in print mode', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: Editor) => {
        editor.command.executeUpdateOptions({
          marginIndicatorColor: '#ff0000',
          marginIndicatorSize: 60
        })
        editor.command.executeSetValue({
          main: [{ value: 'image export without margin indicators' }]
        })

        const countRedPixels = (dataUrl: string) =>
          countImagePixels(
            win,
            dataUrl,
            (red, green, blue, alpha) =>
              alpha > 0 && red > 220 && green < 40 && blue < 40
          )

        return cy.wrap(editor.command.getImage({ pixelRatio: 1 })).then(
          (normalDataUrlList: string[]) => {
            return countRedPixels(normalDataUrlList[0]).then(normalRedPixels => {
              expect(
                normalRedPixels,
                'normal image export should include visible margin indicators'
              ).to.be.greaterThan(100)
              return cy
                .wrap(
                  editor.command.getImage({
                    mode: EditorMode.PRINT,
                    pixelRatio: 1
                  })
                )
                .then((printDataUrlList: string[]) => {
                  return countRedPixels(printDataUrlList[0]).then(
                    printRedPixels => {
                      expect(
                        printRedPixels,
                        'print image export should omit margin indicators'
                      ).to.eq(0)
                    }
                  )
                })
            })
          }
        )
      })
    })
  })

  it('issue #1308 supports regular expression search patterns', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'item-123 plain item-456 item-abc' }]
      })

      editor.command.executeSearch('item-\\d+', {
        isRegEnable: true
      })
      expect(editor.command.getSearchNavigateInfo()?.count).to.eq(2)

      editor.command.executeSearch('item-\\d+')
      expect(editor.command.getSearchNavigateInfo()).to.eq(null)
    })
  })

  it('issue #1392 keeps Ctrl+Shift+Arrow word selection inside the current row', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'alpha beta gamma\nnext row' }]
      })
      editor.command.executeSetRange(16, 16)
    })

    dispatchKeyboard('ArrowLeft', {
      ctrlKey: true,
      shiftKey: true
    })

    cy.getEditor().then((editor: Editor) => {
      let range = editor.command.getRange()
      expect(range.endIndex - range.startIndex).to.be.lessThan(8)
      expect(editor.command.getRangeContext()?.selectionText).to.contain(
        'gamma'
      )
      expect(editor.command.getRangeContext()?.selectionText).not.to.contain(
        'alpha'
      )

      editor.command.executeSetRange(6, 6)
    })

    dispatchKeyboard('ArrowRight', {
      ctrlKey: true,
      shiftKey: true
    })

    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      expect(range.endIndex - range.startIndex).to.be.lessThan(8)
      expect(editor.command.getRangeContext()?.selectionText).to.contain('beta')
      expect(editor.command.getRangeContext()?.selectionText).not.to.contain(
        'gamma'
      )
    })
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
})
