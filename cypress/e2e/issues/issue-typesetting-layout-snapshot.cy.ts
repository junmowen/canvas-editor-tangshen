import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

const ZERO = '\u200B'

function createTextElements(value: string, attrs: Record<string, unknown> = {}) {
  return value.split('').map(char => ({
    value: char,
    ...attrs
  }))
}

/** 覆盖 TS-00 段落块、栏、页排版快照的公开查询能力。 */
describe('typesetting layout snapshot', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证标题和正文行可以被整理为段落块，并能读取双栏区域。 */
  it('exposes page column and paragraph block structure after layout', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '标题',
            titleId: 'title-1',
            level: TitleLevel.FIRST
          },
          { value: '\n' },
          { value: '正文段落' }
        ]
      })
      editor.command.executeUpdateOptions({
        columns: {
          count: 2,
          gap: 18,
          widths: [160, 120]
        }
      })

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      expect(snapshot).to.not.eq(null)
      expect(snapshot!.pageCount).to.be.greaterThan(0)
      expect(snapshot!.rowCount).to.be.greaterThan(0)
      expect(snapshot!.paragraphBlockCount).to.be.greaterThan(0)
      expect(snapshot!.pageList[0].columnList).to.have.length(2)
      expect(snapshot!.pageList[0].columnList[0].rect.width).to.eq(160)
      expect(snapshot!.paragraphBlockList.some(block => block.type === 'title'))
        .to.eq(true)
      expect(
        snapshot!.paragraphBlockList.every(block => {
          return block.startRowIndex <= block.endRowIndex &&
            block.startIndex <= block.endIndex
        })
      ).to.eq(true)
    })
  })

  /** 标题后直接输入普通文本时，视觉上不强制换行，但快照不能把普通文本归为标题。 */
  it('splits inline title and paragraph semantic blocks without forcing a row break', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '标题',
            titleId: 'inline-title',
            level: TitleLevel.FIRST
          },
          { value: '后续正文' }
        ]
      })

      const rowList = editor.draw.getObjectResolver().getRowList()
      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const titleBlock = snapshot!.paragraphBlockList.find(
        (block: any) => block.type === 'title'
      )
      const paragraphBlock = snapshot!.paragraphBlockList.find(
        (block: any) => block.type === 'paragraph'
      )

      expect(rowList).to.have.length(1)
      expect(titleBlock.titleId).to.eq('inline-title')
      expect(paragraphBlock.titleId).to.eq(undefined)
      expect(paragraphBlock.startIndex).to.be.greaterThan(titleBlock.endIndex)
      expect(paragraphBlock.startRowIndex).to.eq(titleBlock.startRowIndex)
      expect(paragraphBlock.rect.x).to.be.greaterThan(titleBlock.rect.x)
    })
  })

  /** 标题、列表、普通文本紧邻时，段落块顺序和语义不能互相污染。 */
  it('keeps title list and paragraph blocks separated in snapshot order', () => {
    cy.getEditor().then((editor: any) => {
      const listId = 'snapshot-list'
      editor.command.executeSetValue({
        main: [
          {
            value: '标题',
            titleId: 'title-before-list',
            level: TitleLevel.SECOND
          },
          {
            value: ZERO,
            listId,
            listType: 'ol',
            listLevel: 0
          },
          ...createTextElements('列表项', {
            listId,
            listType: 'ol',
            listLevel: 0
          }),
          { value: ZERO },
          { value: '普通正文' }
        ]
      })

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const blocks = snapshot!.paragraphBlockList.filter((block: any) =>
        ['title', 'list', 'paragraph'].includes(block.type)
      )

      expect(blocks.map((block: any) => block.type)).to.deep.eq([
        'title',
        'list',
        'paragraph'
      ])
      expect(blocks[0].titleId).to.eq('title-before-list')
      expect(blocks[1].listId).to.eq(listId)
      expect(blocks[2].titleId).to.eq(undefined)
      expect(blocks[2].listId).to.eq(undefined)
      expect(blocks[0].endIndex).to.be.lessThan(blocks[1].startIndex)
      expect(blocks[1].endIndex).to.be.lessThan(blocks[2].startIndex)
    })
  })
})
