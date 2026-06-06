import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

/** 覆盖 TS-06 标题父子树的同步查询能力。 */
describe('title tree query', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证一到三级标题可以按层级生成父子关系、路径和顺序。 */
  it('builds parent child title tree from heading levels', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            value: '第一章',
            titleId: 'chapter-1',
            level: TitleLevel.FIRST
          },
          { value: '\n' },
          { value: '第一章正文' },
          { value: '\n' },
          {
            value: '第一节',
            titleId: 'section-1',
            level: TitleLevel.SECOND
          },
          { value: '\n' },
          { value: '第一节正文' },
          { value: '\n' },
          {
            value: '第一小节',
            titleId: 'sub-section-1',
            level: TitleLevel.THIRD
          },
          { value: '\n' },
          { value: '第一小节正文' },
          { value: '\n' },
          {
            value: '第二章',
            titleId: 'chapter-2',
            level: TitleLevel.FIRST
          },
          { value: '\n' },
          { value: '第二章正文' }
        ]
      })

      const titleTree = editor.command.getTitleTree()
      expect(titleTree).to.not.eq(null)
      expect(titleTree!.rootList.map(node => node.id)).to.deep.eq([
        'chapter-1',
        'chapter-2'
      ])
      expect(titleTree!.nodeList.map(node => node.parentTitleId)).to.deep.eq([
        null,
        'chapter-1',
        'section-1',
        null
      ])
      expect(titleTree!.nodeList.map(node => node.path)).to.deep.eq([
        ['chapter-1'],
        ['chapter-1', 'section-1'],
        ['chapter-1', 'section-1', 'sub-section-1'],
        ['chapter-2']
      ])
      expect(titleTree!.nodeList.map(node => node.order)).to.deep.eq([
        0,
        1,
        2,
        3
      ])
      expect(titleTree!.nodeList.every(node => node.pageNo === 0)).to.eq(true)
      const [chapterNode, sectionNodeInTree, subSectionNode, nextChapterNode] =
        titleTree!.nodeList
      expect(chapterNode.rangeStartIndex).to.eq(chapterNode.startIndex)
      expect(chapterNode.rangeEndIndex).to.eq(
        nextChapterNode.startIndex - 1
      )
      expect(chapterNode.contentStartIndex).to.eq(chapterNode.endIndex + 1)
      expect(chapterNode.contentEndIndex).to.eq(chapterNode.rangeEndIndex)
      expect(chapterNode.nextBoundaryTitleId).to.eq('chapter-2')
      expect(sectionNodeInTree.rangeStartIndex).to.eq(
        sectionNodeInTree.startIndex
      )
      expect(sectionNodeInTree.rangeEndIndex).to.eq(
        nextChapterNode.startIndex - 1
      )
      expect(sectionNodeInTree.contentStartIndex).to.eq(
        sectionNodeInTree.endIndex + 1
      )
      expect(sectionNodeInTree.nextBoundaryTitleId).to.eq('chapter-2')
      expect(subSectionNode.rangeStartIndex).to.eq(subSectionNode.startIndex)
      expect(subSectionNode.rangeEndIndex).to.eq(nextChapterNode.startIndex - 1)
      expect(subSectionNode.nextBoundaryTitleId).to.eq('chapter-2')
      expect(nextChapterNode.rangeStartIndex).to.eq(nextChapterNode.startIndex)
      expect(nextChapterNode.contentStartIndex).to.eq(
        nextChapterNode.endIndex + 1
      )
      expect(nextChapterNode.nextBoundaryTitleId).to.eq(null)
      const sectionNode = editor.command.getTitleTreeNode('section-1')
      expect(sectionNode).to.include({
        id: 'section-1',
        parentTitleId: 'chapter-1',
        depth: 1,
        order: 1
      })
      expect(sectionNode!.childrenTitleIds).to.deep.eq(['sub-section-1'])
      expect(sectionNode!.path).to.deep.eq(['chapter-1', 'section-1'])
      expect(editor.getTitleTreeNode('missing-title')).to.eq(null)

      const batchNodes = editor.command.getTitleTreeNodeList([
        'chapter-2',
        'missing-title',
        'chapter-1'
      ])
      expect(batchNodes.map(node => node.id)).to.deep.eq([
        'chapter-2',
        'chapter-1'
      ])
      expect(
        editor.getTitleTreeChildList('chapter-1')!.map((node: any) => node.id)
      ).to.deep.eq(['section-1'])
      expect(editor.command.getTitleTreeChildList('missing-title')).to.eq(null)

      titleTree!.nodeList[0].childrenTitleIds.length = 0
      titleTree!.nodeList[0].childList.length = 0
      expect(
        editor.command.getTitleTree()!.nodeList[0].childrenTitleIds
      ).to.deep.eq(['section-1'])

      const chapterRange = editor.command.getTitleTreeRange('chapter-1')
      expect(chapterRange).to.include({
        titleId: 'chapter-1',
        startIndex: chapterNode.rangeStartIndex,
        endIndex: chapterNode.rangeEndIndex,
        contentStartIndex: chapterNode.contentStartIndex,
        contentEndIndex: chapterNode.contentEndIndex,
        nextBoundaryTitleId: 'chapter-2'
      })
      expect(
        chapterRange!.elementList
          .map((element: any) => element.value)
          .join('')
          .replace(/\u200B/g, '')
      ).to.eq('第一章第一章正文第一节第一节正文第一小节第一小节正文')
      chapterRange!.elementList[0].value = '污染标题'
      expect(
        editor
          .getTitleTreeRange('chapter-1')!
          .elementList.map((element: any) => element.value)
          .join('')
          .replace(/\u200B/g, '')
          .startsWith('第一章')
      ).to.eq(true)
      expect(editor.command.getTitleTreeRange('missing-title')).to.eq(null)

      editor.command.executeLocationTitle('section-1')
      expect(editor.command.getRangeContext()).to.include({
        titleId: 'section-1'
      })
    })
  })
})
