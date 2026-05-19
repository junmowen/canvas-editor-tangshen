import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

/** 生成带目录标题的大文档，用于覆盖 chunk 增量后目录 worker 的位置容错。 */
function createCatalogDocument(lineCount: number) {
  return [
    {
      value: '目录标题',
      titleId: 'catalog-title-1',
      level: TitleLevel.FIRST
    },
    { value: '\n' },
    ...Array.from({ length: lineCount }, (_, index) => ({
      value: `catalog-position-miss-${index} 正文内容用于撑开多页。\n`
    }))
  ]
}

describe('目录位置容错', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('does not crash catalog worker after chunk typing', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue(
        {
          header: [],
          main: createCatalogDocument(1200),
          footer: []
        },
        {
          isSetCursor: true
        }
      )

      editor.resetRenderBackendStats()
      editor.command.executeSetRange(12, 12)
      cy.get('.ce-inputarea')
        .type('catalogsafe', { force: true, delay: 0 })
        .then(() => editor.command.getCatalog())
        .then((catalog: any) => {
          const stats = editor.getRenderBackendStats()

          expect(stats.chunkLayout.patchSuccessCount).to.be.greaterThan(0)
          expect(stats.layout.computeCount).to.eq(0)
          expect(catalog === null || Array.isArray(catalog)).to.eq(true)
        })
    })
  })
})
