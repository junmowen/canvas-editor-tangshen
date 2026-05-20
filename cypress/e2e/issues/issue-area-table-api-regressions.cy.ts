import type Editor from '../../../src/editor'
import { AreaMode } from '../../../src/editor/dataset/enum/Area'
import { LocationPosition } from '../../../src/editor/dataset/enum/Common'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { EditorMode } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

describe('area and table API regressions', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #1202 preserves generated table id in getValue output', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetHTML({
        main: '<table><tr><td>cell</td></tr></table>'
      })

      const table = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.TABLE)
      expect(table?.id).to.be.a('string').and.not.eq('')
      expect(table?.trList?.[0].tdList[0].value[0].value).to.eq('cell')
    })
  })

  it('issue #1059 imports a custom table HTML string into editable table data', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetHTML({
        main:
          '<table><tbody><tr><td>姓名</td><td>张三</td></tr><tr><td>诊断</td><td>感冒</td></tr></tbody></table>'
      })

      const table = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.TABLE)

      expect(table?.trList).to.have.length(2)
      expect(table?.trList?.[0].tdList).to.have.length(2)
      expect(table?.trList?.[0].tdList[0].value.map(v => v.value).join('')).to.eq(
        '姓名'
      )
      expect(table?.trList?.[0].tdList[1].value.map(v => v.value).join('')).to.eq(
        '张三'
      )
      expect(table?.trList?.[1].tdList[0].value.map(v => v.value).join('')).to.eq(
        '诊断'
      )
      expect(table?.trList?.[1].tdList[1].value.map(v => v.value).join('')).to.eq(
        '感冒'
      )

      const html = editor.command.getHTML().main
      expect(html).to.contain('<table')
      expect(html).to.contain('姓名')
      expect(html).to.contain('感冒')
    })
  })

  it('issues #1223 and #1368 insert area elements at the cursor with the requested area id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([{ value: 'before' }])

      editor.command.executeInsertElementList([
        {
          type: ElementType.AREA,
          value: '',
          areaId: 'area-from-insert-element-list',
          area: {
            backgroundColor: 'rgba(5,0,0,0.07)'
          },
          valueList: [{ value: 'inside area' }]
        }
      ])

      const area = editor.command.getValue().data.main.find(
        element => element.type === ElementType.AREA
      )
      expect(area).to.include({
        type: ElementType.AREA,
        areaId: 'area-from-insert-element-list',
        value: ''
      })
      expect(area?.area?.backgroundColor).to.eq('rgba(5,0,0,0.07)')
      expect(area?.valueList?.map(element => element.value).join('')).to.eq(
        'inside area'
      )
    })
  })

  it('issue #1223 preserves insertArea id when inserting by range', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([{ value: 'anchor' }])
      editor.command.executeSetRange(0, 0)

      const areaId = editor.command.executeInsertArea({
        id: 'area-from-insert-area',
        area: {
          backgroundColor: 'rgba(5,0,0,0.07)'
        },
        value: [{ value: 'inserted area' }],
        position: LocationPosition.AFTER,
        range: {
          startIndex: 0,
          endIndex: 0
        }
      })

      expect(areaId).to.eq('area-from-insert-area')
      ;(editor as any).draw.flushScheduledFrameRender()
      const area = editor.command.getAreaValue({
        id: 'area-from-insert-area'
      })
      expect(area?.id).to.eq('area-from-insert-area')
      expect(area?.area.backgroundColor).to.eq('rgba(5,0,0,0.07)')
      expect(area?.value.map(element => element.value).join('')).to.eq(
        'inserted area'
      )
    })
  })

  it('issue #1281 can set area value after inserting an area through executeInsertElementList', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([
        {
          type: ElementType.AREA,
          value: '',
          areaId: 'area-set-value',
          area: {
            backgroundColor: 'rgba(5,0,0,0.07)'
          },
          valueList: [{ value: 'initial' }]
        }
      ])

      editor.command.executeSetAreaValue({
        id: 'area-set-value',
        value: [{ value: 'updated area value' }]
      })

      ;(editor as any).draw.flushScheduledFrameRender()
      const area = editor.command.getAreaValue({
        id: 'area-set-value'
      })
      expect(area?.id).to.eq('area-set-value')
      expect(area?.value.map(element => element.value).join('')).to.eq(
        'updated area value'
      )
    })
  })

  it('issue #1243 updates controls by area id without changing matching controls outside the area', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'target-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [
              {
                type: ElementType.CONTROL,
                value: '',
                control: {
                  conceptId: 'shared',
                  type: ControlType.TEXT,
                  value: null,
                  placeholder: 'inside'
                }
              },
              { value: ' ' },
              {
                type: ElementType.CONTROL,
                value: '',
                control: {
                  conceptId: 'inside-only',
                  type: ControlType.TEXT,
                  value: null,
                  placeholder: 'inside-only'
                }
              }
            ]
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'shared',
              type: ControlType.TEXT,
              value: null,
              placeholder: 'outside'
            }
          }
        ]
      })

      editor.command.executeSetControlValue({
        areaId: 'target-area',
        value: 'area-updated'
      })

      const insideValues = editor.command.getControlValue({
        areaId: 'target-area'
      })
      expect(insideValues.map(value => value.value)).to.deep.eq([
        'area-updated',
        'area-updated'
      ])
      const sharedValues = editor.command.getControlValue({
        conceptId: 'shared'
      })
      expect(sharedValues.map(value => value.value)).to.deep.eq([
        'area-updated',
        null
      ])
    })
  })

  it('issue #1147 preserves area valueList styles through setValue and getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '',
            type: ElementType.AREA,
            area: {
              mode: AreaMode.EDIT
            },
            valueList: [
              {
                value: '\n\n\n\n\n',
                font: '黑体',
                size: 21,
                bold: false,
                italic: false,
                rowFlex: 'center'
              },
              {
                value: '标题',
                size: 74,
                bold: true,
                color: 'rgb(46, 117, 181)',
                italic: false,
                rowFlex: 'center'
              }
            ]
          }
        ]
      })

      const area = editor.command.getValue().data.main[0]
      expect(area).to.include({
        type: ElementType.AREA,
        value: ''
      })
      expect(area.area?.mode).to.eq(AreaMode.EDIT)
      const newlineList =
        area.valueList?.filter(element => element.value === '\n') || []
      expect(newlineList).to.have.length.greaterThan(0)
      newlineList.forEach(element => {
        expect(element).to.include({
          font: '黑体',
          size: 21,
          bold: false,
          italic: false,
          rowFlex: 'center'
        })
      })
      const title = area.valueList?.find(element => element.value === '标题')
      expect(title).to.include({
        value: '标题',
        size: 74,
        bold: true,
        color: 'rgb(46, 117, 181)',
        italic: false,
        rowFlex: 'center'
      })
    })
  })

  it('issue #1381 keeps a list as the first table cell element without an extra leading line break', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'comment-table',
            type: ElementType.TABLE,
            value: '',
            width: 200,
            colgroup: [{ width: 200 }],
            trList: [
              {
                id: 'comment-tr',
                height: 40,
                tdList: [
                  {
                    id: 'comment-td',
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      {
                        type: ElementType.LIST,
                        value: '',
                        listType: ListType.UL,
                        listStyle: ListStyle.DISC,
                        valueList: [
                          {
                            value: '\n'
                          },
                          {
                            value: '单元格列表'
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      const tdValue = editor.command.getValue().data.main[0].trList?.[0]
        .tdList[0].value
      expect(tdValue?.[0]).to.include({
        type: ElementType.LIST,
        value: ''
      })
      expect(tdValue?.[0].valueList?.[0].value).to.eq('单元格列表')
      expect(
        tdValue?.[0].valueList?.some(element => element.value === '\n')
      ).to.eq(false)
      expect(tdValue?.slice(1).some(element => element.value === '\n')).to.eq(false)
    })
  })

  it('issue #1317 preserves area elements inserted inside table cells', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            width: 240,
            colgroup: [{ width: 240 }],
            trList: [
              {
                height: 40,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      {
                        type: ElementType.AREA,
                        value: '',
                        areaId: 'table-cell-area',
                        area: {
                          backgroundColor: 'rgba(0,0,255,0.08)'
                        },
                        valueList: [{ value: 'area in table' }]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      const tdValue = editor.command.getValue().data.main[0].trList?.[0]
        .tdList[0].value
      expect(tdValue?.[0]).to.include({
        type: ElementType.AREA,
        value: '',
        areaId: 'table-cell-area'
      })
      expect(tdValue?.[0].area?.backgroundColor).to.eq(
        'rgba(0,0,255,0.08)'
      )
      expect(tdValue?.[0].valueList?.map(element => element.value).join('')).to.eq(
        'area in table'
      )
    })
  })

  it('issue #1261 inserts area elements at a table-cell range without losing area properties', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'area-insert-table',
            type: ElementType.TABLE,
            value: '',
            width: 260,
            colgroup: [{ width: 260 }],
            trList: [
              {
                id: 'area-insert-row',
                height: 40,
                tdList: [
                  {
                    id: 'area-insert-cell',
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'cell anchor' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = editor.command.getValue({ extraPickAttrs: ['id'] }).data
        .main[0]
      editor.command.executeSetRange(0, 0, table.id, 0, 0, 0, 0)
      editor.command.executeInsertElementList([
        {
          type: ElementType.AREA,
          value: '',
          areaId: 'inserted-table-cell-area',
          area: {
            backgroundColor: '#F2F3F5'
          },
          valueList: [
            {
              type: ElementType.CONTROL,
              value: '',
              control: {
                conceptId: '$node_user',
                type: ControlType.TEXT,
                value: null,
                placeholder: '签名人'
              }
            },
            {
              conceptId: '$node_sign',
              width: 50,
              height: 25,
              type: ElementType.IMAGE,
              value:
                'data:image/png;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='
            }
          ]
        }
      ])

      const tdValue = editor.command.getValue().data.main[0].trList?.[0]
        .tdList[0].value
      const area = tdValue?.find(
        element => element.areaId === 'inserted-table-cell-area'
      )
      expect(area).to.include({
        type: ElementType.AREA,
        value: '',
        areaId: 'inserted-table-cell-area'
      })
      expect(area?.area?.backgroundColor).to.eq('#F2F3F5')
      expect(area?.valueList?.[0]).to.include({
        type: ElementType.CONTROL,
        value: ''
      })
      expect(area?.valueList?.[0].control).to.include({
        conceptId: '$node_user',
        type: ControlType.TEXT,
        placeholder: '签名人'
      })
      expect(area?.valueList?.[1]).to.include({
        conceptId: '$node_sign',
        type: ElementType.IMAGE,
        width: 50,
        height: 25
      })
    })
  })

  it('issue #1119 prevents normal editing commands from changing area content in readonly and print modes', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'readonly-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [{ value: 'locked area' }]
          }
        ]
      })

      const areaText = () =>
        editor.command
          .getAreaValue({ id: 'readonly-area' })
          ?.value.map(element => element.value)
          .join('')
      const areaIndex = (editor as any).draw
        .getOriginalMainElementList()
        .findIndex((element: any) => element.value === 'l')
      expect(areaIndex).to.be.greaterThan(-1)

      editor.command.executeSetRange(areaIndex, areaIndex)
      editor.command.executeMode(EditorMode.READONLY)
      editor.command.executeInsertElementList([{ value: 'X' }])
      editor.command.executeBackspace()
      expect(areaText()).to.eq('locked area')

      editor.command.executeMode(EditorMode.EDIT)
      editor.command.executeSetRange(areaIndex, areaIndex)
      editor.command.executeMode(EditorMode.PRINT)
      editor.command.executeInsertElementList([{ value: 'Y' }])
      editor.command.executeBackspace()
      expect(areaText()).to.eq('locked area')
    })
  })

  it('issue #1195 appends content at the end of an area after executeLocationArea with AFTER', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'append-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [{ value: 'first' }]
          }
        ]
      })

      editor.command.executeLocationArea('append-area', {
        position: LocationPosition.AFTER
      })
      editor.command.executeInsertElementList([{ value: ' second' }])

      const area = editor.command.getValue().data.main[0]
      expect(area).to.include({
        type: ElementType.AREA,
        areaId: 'append-area'
      })
      expect(area.valueList?.map(element => element.value).join('')).to.eq(
        'first second'
      )
    })
  })

  it('issue #1212 inserts after an area when executeLocationArea uses OUTER_AFTER', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'outer-after-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [{ value: 'inside' }]
          },
          { value: ' after' }
        ]
      })

      editor.command.executeLocationArea('outer-after-area', {
        position: LocationPosition.OUTER_AFTER
      })
      editor.command.executeInsertElementList([{ value: ' inserted' }])

      const value = editor.command.getValue().data.main
      expect(value[1]).to.include({
        type: ElementType.AREA,
        areaId: 'outer-after-area'
      })
      expect(value[1].valueList?.map(element => element.value).join('')).to.eq(
        'inside'
      )
      expect(value[2].value).to.contain('inserted')
      expect(value[2].value).to.contain('after')
      expect(value[2]).to.not.have.property('areaId')
    })
  })

  it('issue #1216 includes titles inside table cells in catalog results', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
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
                      {
                        value: 'Table catalog title',
                        titleId: 'table-catalog-title',
                        level: TitleLevel.SECOND
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      return editor.command.getCatalog().then(catalog => {
        expect(catalog).to.deep.eq([
          {
            id: 'table-catalog-title',
            name: 'Table catalog title',
            level: TitleLevel.SECOND,
            pageNo: 0,
            subCatalog: []
          }
        ])
      })
    })
  })

  it('issue #1377 deletes a specific area by id without removing adjacent content', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'delete-target-area',
            area: {
              backgroundColor: 'rgba(255,0,0,0.08)'
            },
            valueList: [{ value: 'remove me' }]
          },
          { value: '\nkeep outside' },
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'keep-area',
            area: {
              backgroundColor: 'rgba(0,255,0,0.08)'
            },
            valueList: [{ value: 'keep me' }]
          }
        ]
      })

      const deleted = editor.command.executeDeleteArea({
        id: 'delete-target-area'
      })

      expect(deleted).to.eq(true)
      expect(editor.command.getAreaValue({ id: 'delete-target-area' })).to.eq(
        null
      )
      expect(
        editor.command
          .getAreaValue({ id: 'keep-area' })
          ?.value.map(element => element.value)
          .join('')
      ).to.eq('keep me')
      const text = editor.command.getText().main
      expect(text).not.to.contain('remove me')
      expect(text).to.contain('keep outside')
      expect(text).to.contain('keep me')
    })
  })

  it('issue #1194 excludes hidden images from HTML export while preserving them in getValue', () => {
    const hiddenPng =
      'data:image/png;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'hidden-image',
            type: ElementType.IMAGE,
            value: hiddenPng,
            width: 24,
            height: 24,
            hide: true
          },
          {
            value: 'visible text'
          }
        ]
      })

      const image = editor.command.getValue().data.main.find(
        element => element.id === 'hidden-image'
      )
      expect(image).to.include({
        type: ElementType.IMAGE,
        hide: true,
        value: hiddenPng
      })
      const html = editor.command.getHTML().main
      expect(html).to.contain('visible text')
      expect(html).not.to.contain(hiddenPng)
      expect(html).not.to.contain('<img')
    })
  })

  it('issue #1410 excludes fully hidden rows from HTML export without blank row containers', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: 'hidden row',
            hide: true,
            rowIndentLeft: 24
          },
          {
            value: '\n',
            hide: true,
            rowIndentLeft: 24
          },
          {
            value: 'visible row',
            rowIndentLeft: 24
          }
        ]
      })

      const html = editor.command.getHTML().main
      expect(html).to.contain('visible row')
      expect(html).not.to.contain('hidden row')
      expect(html).not.to.contain('<div style="margin-left: 24px;"></div>')
    })
  })

  it('issue #1305 selects the whole document when select all starts inside a table', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before table' },
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
                    value: [{ value: 'inside table' }]
                  }
                ]
              }
            ]
          },
          { value: 'after table' }
        ]
      })

      const table = editor.command.getValue({ extraPickAttrs: ['id'] }).data
        .main[1]
      editor.command.executeSetPositionContext({
        startIndex: 0,
        endIndex: 0,
        tableId: table.id,
        startTdIndex: 0,
        endTdIndex: 0,
        startTrIndex: 0,
        endTrIndex: 0
      } as any)
      editor.command.executeSetRange(0, 0, table.id, 0, 0, 0, 0)

      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      const text = editor.command.getText().main
      expect(text).not.to.contain('before table')
      expect(text).not.to.contain('inside table')
      expect(text).not.to.contain('after table')
      expect((editor as any).draw.getPosition().getPositionContext().isTable).to.eq(
        false
      )
    })
  })

  it('issue #1227 applies group ids to text selected with table range parameters', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'comment-table',
            type: ElementType.TABLE,
            value: '',
            width: 200,
            colgroup: [{ width: 200 }],
            trList: [
              {
                id: 'comment-tr',
                height: 40,
                tdList: [
                  {
                    id: 'comment-td',
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'cell comment target' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = (editor as any).draw
        .getOriginalMainElementList()
        .find((element: any) => element.type === ElementType.TABLE)
      expect(table.id).to.be.a('string')
      expect(table.trList[0].id).to.be.a('string')
      expect(table.trList[0].tdList[0].id).to.be.a('string')
      editor.command.executeSetRange(0, 4, table.id, 0, 0, 0, 0)
      const groupId = editor.command.executeSetGroup()

      expect(groupId).to.be.a('string').and.not.eq('')
      const tdValue = editor.command.getValue().data.main[0].trList?.[0]
        .tdList[0].value
      expect(
        tdValue
          ?.filter(element => element.groupIds?.includes(groupId!))
          .map(element => element.value)
          .join('')
      ).to.eq('cell')
    })
  })

  it('issue #1084 updates an image inside an area without moving it out of the area', () => {
    const areaImage =
      'data:image/png;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs='

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'image-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [
              { value: 'before ' },
              {
                id: 'area-image',
                type: ElementType.IMAGE,
                value: areaImage,
                width: 24,
                height: 24
              },
              { value: ' after' }
            ]
          }
        ]
      })

      editor.command.executeUpdateElementById({
        id: 'area-image',
        properties: {
          width: 32,
          height: 16
        }
      })

      const value = editor.command.getValue().data.main
      expect(value).to.have.length(1)
      const area = value[0]
      expect(area).to.include({
        type: ElementType.AREA,
        areaId: 'image-area'
      })
      const image = area.valueList?.find(element => element.id === 'area-image')
      expect(image).to.include({
        id: 'area-image',
        type: ElementType.IMAGE,
        width: 32,
        height: 16,
        value: areaImage
      })
    })
  })

  it('issue #1014 refuses to delete areas configured as non-deletable', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'locked-area',
            area: {
              deletable: false,
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [{ value: 'locked content' }]
          },
          { value: ' after' }
        ]
      })

      const deleted = editor.command.executeDeleteArea({ id: 'locked-area' })

      expect(deleted).to.eq(false)
      const area = editor.command.getAreaValue({ id: 'locked-area' })
      expect(area?.area.deletable).to.eq(false)
      expect(area?.value.map(element => element.value).join('')).to.eq(
        'locked content'
      )
      expect(editor.command.getText().main).to.contain('locked content')
    })
  })

  it('issue #1134 refuses to delete grouped content when groups are non-deletable', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        group: {
          deletable: false
        }
      })
      editor.command.executeSetValue({
        main: [{ value: 'before grouped after' }]
      })

      const elementList = (editor as any).draw.getOriginalMainElementList()
      const startIndex = elementList.findIndex(
        (element: any) => element.value === 'g'
      )
      const endIndex = elementList.findIndex(
        (element: any) => element.value === 'd'
      )
      expect(startIndex).to.be.greaterThan(-1)
      expect(endIndex).to.be.greaterThan(startIndex)

      editor.command.executeSetRange(startIndex - 1, endIndex)
      const groupId = editor.command.executeSetGroup()
      expect(groupId).to.be.a('string').and.not.eq('')

      editor.command.executeSetRange(startIndex - 1, endIndex)
      editor.command.executeBackspace()

      const value = editor.command.getValue().data.main
      expect(value.map(element => element.value).join('')).to.eq(
        'before grouped after'
      )
      expect(
        value
          .filter(element => element.groupIds?.includes(groupId!))
          .map(element => element.value)
          .join('')
      ).to.eq('grouped')
    })
  })

  it('issue #1076 preserves area placeholder configuration in document data', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'placeholder-area',
            area: {
              placeholder: {
                data: '请输入区域内容',
                color: '#ff0000',
                opacity: 0.5,
                size: 18,
                font: 'Microsoft YaHei'
              }
            },
            valueList: []
          }
        ]
      })

      const area = editor.command.getValue().data.main[0]
      expect(area).to.include({
        type: ElementType.AREA,
        areaId: 'placeholder-area'
      })
      expect(area.area?.placeholder).to.deep.eq({
        data: '请输入区域内容',
        color: '#ff0000',
        opacity: 0.5,
        size: 18,
        font: 'Microsoft YaHei'
      })
    })
  })

  it('issue #1095 returns area metadata from getPositionContextByEvent', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before ' },
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'hover-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)',
              borderColor: '#ff0000'
            },
            valueList: [{ value: 'hover target' }]
          },
          { value: ' after' }
        ]
      })

      const draw = (editor as any).draw
      const elementList = draw.getOriginalMainElementList()
      const positionList = draw.getPosition().getOriginalPositionList()
      const areaIndex = elementList.findIndex(
        (element: any) => element.areaId === 'hover-area'
      )
      expect(areaIndex).to.be.greaterThan(-1)

      const position = positionList[areaIndex]
      expect(position).to.exist
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        position.pageNo
      ]
      const pageRect = pageWrapper.getBoundingClientRect()
      const leftTop = position.coordinate.leftTop
      const rightTop = position.coordinate.rightTop
      const event = new MouseEvent('mouseover', {
        clientX: pageRect.left + (leftTop[0] + rightTop[0]) / 2,
        clientY: pageRect.top + leftTop[1] + position.lineHeight / 2,
        bubbles: true
      })

      const context = editor.command.getPositionContextByEvent(event)

      expect(context?.pageNo).to.eq(position.pageNo)
      expect(context?.element).to.include({
        areaId: 'hover-area'
      })
      expect(context?.element?.value).to.be.a('string')
      expect(context?.element?.area).to.include({
        borderColor: '#ff0000'
      })
      const area = editor.command.getAreaValue({ id: 'hover-area' })
      expect(area?.value.map(element => element.value).join('')).to.contain(
        'hover target'
      )
      expect(context?.rangeRect).to.include({
        x: leftTop[0],
        width: rightTop[0] - leftTop[0],
        height: position.lineHeight
      })
      expect(context?.tableInfo).to.eq(null)
    })
  })

  it('issue #1010 returns table cell info from getPositionContextByEvent', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'hit-table',
            type: ElementType.TABLE,
            value: '',
            width: 260,
            colgroup: [{ width: 130 }, { width: 130 }],
            trList: [
              {
                id: 'hit-row-0',
                height: 40,
                tdList: [
                  {
                    id: 'hit-cell-0-0',
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'left cell' }]
                  },
                  {
                    id: 'hit-cell-0-1',
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'right cell' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const draw = (editor as any).draw
      const cellBounds = draw
        .getTableLayoutSnapshotAccessor()
        .getFragmentCellBounds('hit-table')
        .find((bounds: any) => bounds.trIndex === 0 && bounds.tdIndex === 1)
      expect(cellBounds).to.exist
      const pageWrapper = draw.getPageCanvasHost().getPageWrapperList()[
        cellBounds.pageNo
      ]
      const pageRect = pageWrapper.getBoundingClientRect()
      const event = new MouseEvent('click', {
        clientX: pageRect.left + cellBounds.x + cellBounds.width / 2,
        clientY: pageRect.top + cellBounds.y + cellBounds.height / 2,
        bubbles: true
      })

      const context = editor.command.getPositionContextByEvent(event)

      expect(context?.tableInfo).to.include({
        trIndex: 0,
        tdIndex: 1
      })
      expect(context?.tableInfo?.element).to.include({
        id: 'hit-table',
        type: ElementType.TABLE
      })
      expect(context?.element?.tdId).to.eq('hit-cell-0-1')
      expect(context?.element?.value).to.be.oneOf('right cell'.split(''))
      expect(
        context?.tableInfo?.element.trList?.[0].tdList[1].value
          .map(element => element.value)
          .join('')
          .replace(/\u200B/g, '')
      ).to.eq('right cell')
    })
  })

  it('issue #799 preserves custom extension data on table rows and cells', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'extension-table',
            type: ElementType.TABLE,
            value: '',
            width: 180,
            colgroup: [{ width: 180 }],
            trList: [
              {
                id: 'extension-row',
                height: 40,
                extension: {
                  rowBinding: 'diagnosis-list'
                },
                tdList: [
                  {
                    id: 'extension-cell',
                    colspan: 1,
                    rowspan: 1,
                    extension: {
                      field: 'diagnosisName',
                      mergeKey: 'diagnosis-id'
                    },
                    value: [{ value: '诊断' }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const table = editor.command.getValue().data.main[0]
      expect(table.trList?.[0].extension).to.deep.eq({
        rowBinding: 'diagnosis-list'
      })
      expect(table.trList?.[0].tdList[0].extension).to.deep.eq({
        field: 'diagnosisName',
        mergeKey: 'diagnosis-id'
      })

      editor.command.executeSetValue({
        main: [table]
      })

      const restoredTable = editor.command.getValue().data.main[0]
      expect(restoredTable.trList?.[0].extension).to.deep.eq({
        rowBinding: 'diagnosis-list'
      })
      expect(restoredTable.trList?.[0].tdList[0].extension).to.deep.eq({
        field: 'diagnosisName',
        mergeKey: 'diagnosis-id'
      })
    })
  })

  it('issues #1079, #1091, and #1098 insert an area at the cursor without a leading newline and allow text after it', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: 'A' }]
      })
      editor.command.executeSetRange(0, 0)

      const areaId = editor.command.executeInsertArea({
        id: 'cursor-area',
        area: {
          backgroundColor: 'rgba(5,0,0,0.07)'
        },
        value: [{ value: 'B' }],
        position: LocationPosition.AFTER,
        range: {
          startIndex: 0,
          endIndex: 0
        }
      })
      expect(areaId).to.eq('cursor-area')

      editor.command.executeLocationArea('cursor-area', {
        position: LocationPosition.OUTER_AFTER
      })
      editor.command.executeInsertElementList([{ value: 'C' }])

      const value = editor.command.getValue().data.main
      const areaIndex = value.findIndex(
        element => element.areaId === 'cursor-area'
      )
      expect(areaIndex).to.be.greaterThan(-1)
      const area = value[areaIndex]
      expect(area).to.include({
        type: ElementType.AREA,
        areaId: 'cursor-area'
      })
      expect(area.valueList?.[0].value).to.eq('B')
      expect(area.valueList?.[0].value).not.to.match(/^\n/)
      const afterArea = value.slice(areaIndex + 1)
      expect(afterArea.map(element => element.value).join('')).to.contain('C')
      afterArea.forEach(element => {
        expect(element).to.not.have.property('areaId')
      })
    })
  })

  it('issue #1248 preserves explicit table row height below the default option minimum through setValue and getValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        table: {
          defaultTrMinHeight: 40
        }
      })
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            width: 160,
            colgroup: [{ width: 160 }],
            trList: [
              {
                height: 32,
                minHeight: 32,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [{ value: 'short row', size: 8 }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const saved = editor.command.getValue().data.main[0]
      expect(saved.trList?.[0]).to.include({
        height: 32,
        minHeight: 32
      })

      editor.command.executeSetValue({
        main: [saved]
      })

      const restored = editor.command.getValue().data.main[0]
      expect(restored.trList?.[0]).to.include({
        height: 32,
        minHeight: 32
      })
      expect(restored.trList?.[0].tdList[0].value[0].value).to.eq('short row')
    })
  })

  it('issue #1127 preserves explicit page break elements supplied in document data', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'before break' },
          { type: ElementType.PAGE_BREAK, value: '\n' },
          { value: 'after break' }
        ]
      })

      const value = editor.command.getValue().data.main
      expect(value[0].value).to.eq('before break')
      expect(value[1]).to.include({
        type: ElementType.PAGE_BREAK,
        value: '\n'
      })
      expect(value[2].value).to.eq('after break')

      editor.command.executeSetValue({
        main: value
      })
      expect(
        editor.command
          .getValue()
          .data.main.some(element => element.type === ElementType.PAGE_BREAK)
      ).to.eq(true)
    })
  })

  it('issue #1139 supports hiding areas and preserving area extension metadata', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.AREA,
            value: '',
            areaId: 'conditional-area',
            area: {
              backgroundColor: 'rgba(5,0,0,0.07)'
            },
            valueList: [{ value: 'conditional content' }]
          },
          { value: 'visible content' }
        ]
      })

      editor.command.executeSetAreaProperties({
        id: 'conditional-area',
        properties: {
          hide: true,
          extension: {
            group: 'child-section'
          }
        }
      })

      const area = editor.command.getAreaValue({ id: 'conditional-area' })
      expect(area?.area.hide).to.eq(true)
      expect(area?.area.extension).to.deep.eq({
        group: 'child-section'
      })
      const valueArea = editor.command.getValue().data.main.find(
        element => element.areaId === 'conditional-area'
      )
      expect(valueArea?.area?.hide).to.eq(true)
      expect(valueArea?.area?.extension).to.deep.eq({
        group: 'child-section'
      })
      const html = editor.command.getHTML().main
      expect(html).not.to.contain('conditional content')
      expect(html).to.contain('visible content')
    })
  })
})
