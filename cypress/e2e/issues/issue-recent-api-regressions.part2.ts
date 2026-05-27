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
  it('issue #1173 supports previous and next navigation in the image previewer', () => {
    const imageA = createSvgDataUrl('#ff0000')
    const imageB = createSvgDataUrl('#00ff00')
    const imageC = createSvgDataUrl('#0000ff')

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'preview-image-a',
            type: ElementType.IMAGE,
            value: imageA,
            width: 16,
            height: 16
          },
          { value: ' ' },
          {
            id: 'preview-image-b',
            type: ElementType.IMAGE,
            value: imageB,
            width: 16,
            height: 16
          },
          { value: ' ' },
          {
            id: 'preview-image-c',
            type: ElementType.IMAGE,
            value: imageC,
            width: 16,
            height: 16
          }
        ]
      })

      const imageList = editor.command
        .getValue()
        .data.main.filter(element => element.type === ElementType.IMAGE)
      const previewer = (editor as any).draw.getComponents().previewer
      previewer.drawResizer(imageList[1])
      previewer.render()
    })

    cy.get('.ce-image-previewer .image-count').should('have.text', '2 / 3')
    cy.get('.ce-image-previewer .ce-image-container img')
      .should('have.attr', 'src')
      .and('eq', imageB)
    cy.get('.ce-image-previewer .image-next').click()
    cy.get('.ce-image-previewer .image-count').should('have.text', '3 / 3')
    cy.get('.ce-image-previewer .image-next').should('have.class', 'disabled')
    cy.get('.ce-image-previewer .ce-image-container img')
      .should('have.attr', 'src')
      .and('eq', imageC)
    cy.get('.ce-image-previewer .image-pre').click()
    cy.get('.ce-image-previewer .image-count').should('have.text', '2 / 3')
    cy.get('.ce-image-previewer .ce-image-container img')
      .should('have.attr', 'src')
      .and('eq', imageB)
  })

  it('issue #1124 can disable and re-enable history recording', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'history base' }]
      })
      editor.command.executeSetRange(0, 0)

      editor.command.executeDisableHistory()
      editor.command.executeInsertElementList([{ value: ' no history' }])
      expect(editor.command.getText().main).to.contain('no history')
      const disabledBaseline = editor.command.getText().main
      editor.command.executeUndo()
      expect(editor.command.getText().main).to.eq(disabledBaseline)

      editor.command.executeEnableHistory()
      editor.command.executeInsertElementList([{ value: ' recorded' }])
      expect(editor.command.getText().main).to.contain('recorded')
      editor.command.executeForceUpdate({ isSubmitHistory: true })
      editor.command.executeUndo()
      expect(editor.command.getText().main).to.eq(disabledBaseline)
      expect(editor.command.getText().main).not.to.contain('recorded')
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

  it('issue #985 keeps the cursor after an inserted element list', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'ABCD' }]
      })
      editor.command.executeSetRange(1, 1)
      editor.command.executeInsertElementList([{ value: 'X' }])

      const range = editor.command.getRange()
      expect(editor.command.getText().main).to.eq('AXBCD')
      expect(range.startIndex).to.eq(2)
      expect(range.endIndex).to.eq(2)
      expect(editor.command.getCursorPosition()?.index).to.eq(2)
    })
  })

  it('issue #1247 restores editor focus after closing the codeblock modal', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
    })

    cy.get('.menu-item__codeblock').click()
    cy.get('.dialog-title i').click()

    cy.focused().should('have.class', 'ce-inputarea')
    cy.focused().type('restored', { force: true })

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getText().main).to.eq('restored')
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
})