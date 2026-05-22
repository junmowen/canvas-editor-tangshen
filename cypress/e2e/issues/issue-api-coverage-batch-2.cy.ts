import type Editor from '../../../src/editor'
import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

describe('issue API coverage batch 2', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #1185 reads structured form data from control values', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'zs',
              type: ControlType.TEXT,
              value: null,
              placeholder: '主诉'
            }
          },
          { value: '\n' },
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'gms',
              type: ControlType.TEXT,
              value: null,
              placeholder: '过敏史'
            }
          }
        ]
      })

      editor.command.executeSetControlValueList([
        { conceptId: 'zs', value: '咳嗽三天' },
        { conceptId: 'gms', value: '花粉过敏' }
      ])

      const formData = ['zs', 'gms'].map(conceptId =>
        editor.command.getControlValue({ conceptId })[0]
      ).reduce(
        (result, control) => ({
          ...result,
          [control.conceptId!]: control.innerText
        }),
        {} as Record<string, string | null>
      )
      expect(formData).to.deep.eq({
        zs: '咳嗽三天',
        gms: '花粉过敏'
      })
    })
  })

  it('issue #188 sets control values, properties, and extension data', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            control: {
              conceptId: 'patientName',
              type: ControlType.TEXT,
              value: null,
              placeholder: '姓名'
            }
          }
        ]
      })

      editor.command.executeSetControlValueList([
        { conceptId: 'patientName', value: '张三' }
      ])
      editor.command.executeSetControlPropertiesList([
        {
          conceptId: 'patientName',
          properties: {
            color: '#ff0000',
            bold: true
          }
        }
      ])
      editor.command.executeSetControlExtension({
        conceptId: 'patientName',
        extension: {
          source: 'regression'
        }
      })

      expect(
        editor.command.getControlValue({ conceptId: 'patientName' })[0]
      ).to.include({
        value: '张三',
        innerText: '张三',
        color: '#ff0000',
        bold: true
      })
      expect(
        editor.command.getControlValue({ conceptId: 'patientName' })[0]
          .extension
      ).to.deep.eq({
        source: 'regression'
      })
    })
  })

  it('issue #134 inserts repeated control payloads without extra duplication', () => {
    cy.getEditor().then((editor: Editor) => {
      const controlElement = {
        type: ElementType.CONTROL,
        value: '',
        control: {
          conceptId: 'repeatControl',
          type: ControlType.TEXT,
          value: [{ value: 'A' }],
          placeholder: 'repeat'
        }
      }
      editor.command.executeSetValue({
        main: [{ value: ZERO }]
      })
      editor.command.executeSetRange(0, 0)

      editor.command.executeInsertElementList([controlElement])
      editor.command.executeInsertElementList([controlElement])

      const controls = editor.command
        .getValue()
        .data.main.filter(
          element => element.control?.conceptId === 'repeatControl'
        )
      expect(controls.length).to.be.within(2, 10)
      expect(editor.command.getText().main.replace(/\n/g, '')).to.eq('AA')
    })
  })

  it('issue #183 updates page numbering options through commands', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePageNumberRestart({
        startPageNo: 3,
        fromPageNo: 2
      })
      expect(editor.command.getOptions().pageNumber).to.include({
        startPageNo: 3,
        fromPageNo: 2
      })

      editor.command.executePageNumberRange({
        fromPageNo: 1,
        maxPageNo: 5
      })
      expect(editor.command.getOptions().pageNumber).to.include({
        fromPageNo: 1,
        maxPageNo: 5
      })

      editor.command.executePageNumberContinue()
      expect(editor.command.getOptions().pageNumber).to.include({
        startPageNo: 1,
        fromPageNo: 0
      })
    })
  })

  it('issue #729 preserves background applyPageNumbers configuration', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        background: {
          color: '#ffffff',
          image: 'data:image/png;base64,AA==',
          applyPageNumbers: [1, 3]
        }
      })

      expect(editor.command.getOptions().background).to.include({
        color: '#ffffff',
        image: 'data:image/png;base64,AA=='
      })
      expect(editor.command.getOptions().background.applyPageNumbers).to.deep.eq(
        [1, 3]
      )
    })
  })

  it('issue #149 returns catalog entries for title elements', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'catalog-root',
            level: TitleLevel.FIRST,
            valueList: [{ value: '第一章' }]
          },
          { value: '正文' },
          {
            type: ElementType.TITLE,
            value: '',
            titleId: 'catalog-child',
            level: TitleLevel.SECOND,
            valueList: [{ value: '第一节' }]
          }
        ]
      })

      return editor.command.getCatalog().then(catalog => {
        expect(catalog?.[0]).to.include({
          id: 'catalog-root',
          name: '第一章',
          level: TitleLevel.FIRST,
          pageNo: 0
        })
        expect(catalog?.[0].subCatalog[0]).to.include({
          id: 'catalog-child',
          name: '第一节',
          level: TitleLevel.SECOND,
          pageNo: 0
        })
      })
    })
  })

  it('issue #1271 keeps long table cell data inserted with executeInsertElementList', () => {
    cy.getEditor().then((editor: Editor) => {
      const longText = '表格长内容'.repeat(80)
      editor.command.executeSetValue({
        main: [{ value: ZERO }]
      })
      editor.command.executeSetRange(0, 0)

      editor.command.executeInsertElementList([
        {
          value: '',
          type: ElementType.TABLE,
          colgroup: [{ width: 240 }],
          trList: [
            {
              height: 42,
              tdList: [
                {
                  colspan: 1,
                  rowspan: 1,
                  value: [{ value: longText }]
                }
              ]
            }
          ]
        }
      ])

      const table = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.TABLE)
      expect(table?.trList?.[0].tdList[0].value[0].value).to.eq(longText)
      expect(editor.command.getText().main).to.contain(longText)
    })
  })
})
