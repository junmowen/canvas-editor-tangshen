import type Editor from '../../../src/editor'
import { BlockType } from '../../../src/editor/dataset/enum/Block'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'
import {
  createDomFromElementList,
  getElementListByHTML
} from '../../../src/editor/utils/element'

const transparentPng =
  'data:image/png;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='

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

  it('issue #1088 preserves font-family through executeSetHTML and getValue', () => {
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

  it('issue #1003 deletes elements by id without removing adjacent content', () => {
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
})
