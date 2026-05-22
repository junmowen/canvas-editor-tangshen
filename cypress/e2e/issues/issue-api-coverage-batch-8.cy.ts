import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

const createStableTitleDocument = () => ({
  main: [
    {
      id: 'stable-title-root-element',
      type: ElementType.TITLE,
      value: '',
      titleId: 'stable-title-root',
      level: TitleLevel.FIRST,
      valueList: [
        {
          id: 'stable-title-root-label',
          value: 'Stable Root Title'
        }
      ]
    },
    { value: 'body text between titles' },
    {
      id: 'stable-title-child-element',
      type: ElementType.TITLE,
      value: '',
      titleId: 'stable-title-child',
      level: TitleLevel.SECOND,
      valueList: [
        {
          id: 'stable-title-child-label',
          value: 'Stable Child Title'
        }
      ]
    }
  ]
})

function pickCatalogShape(catalog: any[] | null): any[] {
  return (catalog || []).map(item => ({
    id: item.id,
    name: item.name,
    level: item.level,
    subCatalog: pickCatalogShape(item.subCatalog)
  }))
}

describe('issue API coverage batch 8', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #335 keeps fixed title ids stable across repeated executeSetValue catalog reads', () => {
    cy.getEditor().then((editor: Editor) => {
      const expectedCatalog = [
        {
          id: 'stable-title-root',
          name: 'Stable Root Title',
          level: TitleLevel.FIRST,
          subCatalog: [
            {
              id: 'stable-title-child',
              name: 'Stable Child Title',
              level: TitleLevel.SECOND,
              subCatalog: []
            }
          ]
        }
      ]

      editor.command.executeSetValue(createStableTitleDocument())
      editor.command.executeSetValue(createStableTitleDocument())

      return editor.command.getCatalog().then(firstCatalog => {
        expect(pickCatalogShape(firstCatalog)).to.deep.eq(expectedCatalog)

        const titleElements = editor.command
          .getValue({ extraPickAttrs: ['id'] })
          .data.main.filter(element => element.type === ElementType.TITLE)
        expect(titleElements.map(element => element.titleId)).to.deep.eq([
          'stable-title-root',
          'stable-title-child'
        ])
        expect(titleElements.map(element => element.valueList?.[0].id)).to.deep.eq(
          ['stable-title-root-label', 'stable-title-child-label']
        )

        editor.command.executeSetValue(createStableTitleDocument())
        editor.command.executeSetValue(createStableTitleDocument())

        return editor.command.getCatalog().then(secondCatalog => {
          expect(pickCatalogShape(secondCatalog)).to.deep.eq(expectedCatalog)
          expect(pickCatalogShape(secondCatalog)).to.deep.eq(
            pickCatalogShape(firstCatalog)
          )
        })
      })
    })
  })

  it('issue #1104 preserves long table cell text and explicit line breaks through getHTML', () => {
    cy.getEditor().then((editor: Editor) => {
      const longCellText = `Long table cell text ${'content '.repeat(
        80
      )}tail`
      const afterBreakText = 'Text after explicit table cell break'

      editor.command.executeSetValue({
        main: [
          {
            id: 'long-text-table',
            type: ElementType.TABLE,
            value: '',
            width: 320,
            colgroup: [{ width: 320 }],
            trList: [
              {
                height: 64,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    value: [
                      { value: longCellText },
                      { value: '\n' },
                      { value: afterBreakText }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      })

      const html = editor.command.getHTML().main
      expect(html).to.contain('<table')
      expect(html).to.contain(longCellText)
      expect(html).to.contain(afterBreakText)
      expect(html).to.satisfy(
        (value: string) => value.includes('<br') || value.includes('\n')
      )

      editor.command.executeSetHTML({
        main: html
      })

      const table = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.TABLE)
      const cellText = table?.trList?.[0].tdList[0].value
        .map(element => element.value)
        .join('')
        .replace(/\u200B/g, '')

      expect(cellText).to.eq(`${longCellText}\n${afterBreakText}`)
    })
  })
})
