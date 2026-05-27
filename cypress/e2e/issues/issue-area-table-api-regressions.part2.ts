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
      const valueArea = editor.command
        .getValue()
        .data.main.find(element => element.areaId === 'conditional-area')
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