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
  getElementListByHTML
} from '../../../src/editor/utils/elementDom'
import { getTextFromElementList } from '../../../src/editor/utils/elementText'

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
        headerPageScopes: [
          { pageScope: 'all', elementList: [{ value: 'Header value' }] }
        ],
        main: [{ value: 'Main value' }],
        footerPageScopes: [
          { pageScope: 'all', elementList: [{ value: 'Footer value' }] }
        ]
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
      const rowList = draw.getObjectResolver().getRowList()
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
        .getCoordinate()
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

  it('issue #1249 includes configured background images in getImage output', () => {
    cy.window().then(win => {
      cy.getEditor().then((editor: Editor) => {
        editor.command.executeSetValue({
          main: [{ value: 'export with background image' }]
        })
        editor.command.executeUpdateOptions({
          background: {
            image: redBackgroundSvg,
            size: BackgroundSize.COVER
          }
        })

        return cy.wrap(editor.command.getImage({ pixelRatio: 1 })).then(
          (dataUrlList: string[]) => {
            return getImagePixel(win, dataUrlList[0], 10, 10).then(pixel => {
              expect(pixel[0]).to.be.greaterThan(240)
              expect(pixel[1]).to.be.lessThan(20)
              expect(pixel[2]).to.be.lessThan(20)
              expect(pixel[3]).to.eq(255)
            })
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
      const range = editor.command.getRange()
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

  it('issue #1328 keeps uncommon characters on the same wrapped row', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        width: 240,
        margins: [40, 40, 40, 40]
      })
      editor.command.executeSetValue({
        main: [
          {
            value:
              'The quick brown fox jumps over the lazy dog the quick brown fox jumps ove presença'
          }
        ]
      })

      const draw = (editor as any).draw
      draw.getServices().renderInvalidationManager.flushScheduledFrameRender()
      const rowTexts = draw.getObjectResolver().getOriginalRowList().map((row: any) =>
        row.elementList
          .map((element: any) => element.value)
          .join('')
          .replace(/\u200B/g, '')
      )
      const targetRowText = rowTexts.find((text: string) => text.includes('pres'))

      expect(rowTexts.length).to.be.greaterThan(1)
      expect(targetRowText).to.exist
      expect(targetRowText).to.contain('presença')
      expect(rowTexts.some((text: string) => text.includes('presen') && !text.includes('presença'))).to.eq(false)
    })
  })

  it('issue #1149 emits positionContextChange when the keyboard moves the cursor', () => {
    cy.getEditor().then((editor: Editor) => {
      const payloads: any[] = []
      editor.eventBus.on('positionContextChange', payload => {
        payloads.push(payload)
      })
      editor.command.executeSetValue({
        main: [{ value: 'keyboard cursor move' }]
      })
      editor.command.executeSetRange(8, 8)
      cy.wrap(payloads).as('positionContextChangePayloads')
    })

    dispatchKeyboard('ArrowLeft')

    cy.get('@positionContextChangePayloads').then(value => {
      const payloads = value as any[]
      expect(payloads.length).to.be.greaterThan(0)
      expect(payloads[payloads.length - 1].value).to.include({
        isTable: false
      })
    })
    cy.getEditor().then((editor: Editor) => {
      const range = editor.command.getRange()
      expect(range.startIndex).to.eq(7)
      expect(range.endIndex).to.eq(7)
    })
  })
})
