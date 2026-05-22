import type Editor from '../../../src/editor'
import { BlockType } from '../../../src/editor/dataset/enum/Block'
import { LocationPosition } from '../../../src/editor/dataset/enum/Common'
import { PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import {
  createDomFromElementList,
  getElementListByHTML
} from '../../../src/editor/utils/element'

describe('issue API coverage batch', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('issue #205 keeps multiple editor instances isolated', () => {
    cy.document().then(doc => {
      const containers = ['first', 'second'].map(name => {
        const container = doc.createElement('div')
        container.dataset.testEditor = name
        container.style.width = '800px'
        container.style.height = '600px'
        doc.body.append(container)
        return container
      })
      const EditorConstructor = ((doc.defaultView as any).editor as Editor)
        .constructor
      const firstEditor = new EditorConstructor(
        containers[0],
        { main: [{ value: 'first editor' }] },
        { width: 500, height: 600 }
      ) as Editor
      const secondEditor = new EditorConstructor(
        containers[1],
        { main: [{ value: 'second editor' }] },
        { width: 520, height: 620 }
      ) as Editor

      firstEditor.command.executeSetValue({
        main: [{ value: 'first isolated value' }]
      })
      secondEditor.command.executeSetValue({
        main: [{ value: 'second isolated value' }]
      })

      expect(firstEditor.command.getText().main).to.eq('first isolated value')
      expect(secondEditor.command.getText().main).to.eq('second isolated value')
      expect(firstEditor.command.getOptions().width).to.eq(500)
      expect(secondEditor.command.getOptions().width).to.eq(520)

      firstEditor.destroy()
      secondEditor.destroy()
      containers.forEach(container => container.remove())
    })
  })

  it('issues #218 and #223 export and import HTML content', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            value: 'HTML export',
            size: 22,
            color: '#ff0000'
          }
        ]
      })

      const exported = editor.command.getHTML().main
      expect(exported).to.contain('HTML export')
      expect(exported).to.contain('font-size')

      editor.command.executeSetHTML({
        main:
          '<p><strong>Imported HTML</strong><span style="color:#00ff00"> ok</span></p>'
      })

      expect(editor.command.getText().main).to.eq('Imported HTML ok')
      const imported = editor.command.getValue().data.main
      expect(imported.some(element => element.bold)).to.eq(true)
      expect(
        imported.some(
          element => element.color === '#00ff00' || element.color === 'rgb(0, 255, 0)'
        )
      ).to.eq(true)
    })
  })

  it('issue #230 converts HTML strings into editor element lists', () => {
    const elementList = getElementListByHTML(
      '<p><span style="font-size: 18px; color: #336699;">HTML parser</span></p>',
      { innerWidth: 500 }
    )

    expect(elementList.map(element => element.value).join('')).to.eq(
      'HTML parser'
    )
    expect(elementList[0].size).to.eq(18)
    expect(elementList[0].color).to.eq('rgb(51, 102, 153)')
  })

  it('issue #1236 exports and imports video block HTML', () => {
    const html = createDomFromElementList([
      {
        value: '',
        type: ElementType.BLOCK,
        width: 240,
        height: 120,
        block: {
          type: BlockType.VIDEO,
          videoBlock: {
            src: 'https://example.com/video.mp4'
          }
        }
      }
    ]).innerHTML

    expect(html).to.contain('<video')
    expect(html).to.contain('https://example.com/video.mp4')

    const imported = getElementListByHTML(html, { innerWidth: 500 })
    expect(imported[0].block?.type).to.eq(BlockType.VIDEO)
    expect(imported[0].block?.videoBlock?.src).to.eq(
      'https://example.com/video.mp4'
    )
  })

  it('issue #248 exposes the active locale after locale changes', () => {
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getLocale()).to.eq('zhCN')

      editor.command.executeSetLocale('en')

      expect(editor.command.getLocale()).to.eq('en')
      expect(editor.command.executeTranslate('contextmenu.global.cut')).to.eq(
        'Cut'
      )
    })
  })

  it('issue #251 applies size changes to the whole selected document', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: 'Alpha' },
          { value: '\n' },
          { value: 'Beta' }
        ]
      })

      editor.command.executeSelectAll()
      editor.command.executeSize(24)

      const textElements = editor.command
        .getValue()
        .data.main.filter(element => element.value.trim())
      expect(textElements.map(element => element.value).join('')).to.eq(
        'Alpha\nBeta'
      )
      expect(textElements.every(element => element.size === 24)).to.eq(true)
    })
  })

  it('issue #790 updates text elements by id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'text-to-update',
            value: 'before',
            color: '#000000',
            type: ElementType.TEXT
          }
        ]
      })

      editor.command.executeUpdateElementById({
        id: 'text-to-update',
        properties: {
          value: 'after',
          color: '#ff0000'
        }
      })

      const updated = editor.command.getElementById({ id: 'text-to-update' })
      expect(updated.map(element => element.value).join('')).to.eq('after')
      expect(
        updated.every(
          element => element.id === 'text-to-update' && element.color === '#ff0000'
        )
      ).to.eq(true)
      expect(editor.command.getText().main).to.eq('after')
    })
  })

  it('issue #1257 switches JSON template data through executeSetValue', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [{ value: 'Template A header' }],
        main: [{ value: 'Template A body' }],
        footer: [{ value: 'Template A footer' }]
      })
      expect(editor.command.getText()).to.deep.eq({
        header: 'Template A header',
        main: 'Template A body',
        footer: 'Template A footer'
      })

      editor.command.executeSetValue({
        header: [{ value: 'Template B header' }],
        main: [{ value: 'Template B body' }],
        footer: [{ value: 'Template B footer' }]
      })

      expect(editor.command.getText()).to.deep.eq({
        header: 'Template B header',
        main: 'Template B body',
        footer: 'Template B footer'
      })
    })
  })

  it('issue #1204 focuses the cursor by an explicit range', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: 'focus-target'.split('').map(value => ({ value }))
      })

      editor.command.executeFocus({
        range: {
          startIndex: 5,
          endIndex: 5
        },
        position: LocationPosition.BEFORE,
        isMoveCursorToVisible: false
      })

      expect(editor.command.getRange()).to.include({
        startIndex: 5,
        endIndex: 5
      })
      expect(editor.command.getCursorPosition()).to.not.eq(null)
    })
  })

  it('issue #181 keeps paper size and direction in sync', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executePaperDirection(PaperDirection.HORIZONTAL)
      editor.command.executePaperSize(640, 900)

      const options = editor.command.getOptions()
      const draw = (editor as any).draw
      expect(options.paperDirection).to.eq(PaperDirection.HORIZONTAL)
      expect(options.width).to.eq(640)
      expect(options.height).to.eq(900)
      expect(draw.getOriginalWidth()).to.eq(900)
      expect(draw.getOriginalHeight()).to.eq(640)
    })
  })

  it('issues #168 and #214 use defaultTrMinHeight for inserted table rows', () => {
    cy.document().then(doc => {
      const container = doc.createElement('div')
      container.style.width = '800px'
      container.style.height = '600px'
      doc.body.append(container)
      const EditorConstructor = ((doc.defaultView as any).editor as Editor)
        .constructor
      const customEditor = new EditorConstructor(
        container,
        { main: [{ value: '\u200B' }] },
        {
          defaultRowMargin: 6,
          table: {
            defaultTrMinHeight: 88
          }
        }
      ) as Editor

      const editor = customEditor
      editor.command.executeSetRange(0, 0)
      editor.command.executeInsertTable(2, 2)

      const table = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.TABLE)
      expect(table?.trList).to.have.length(2)
      expect(table?.trList?.every(tr => tr.height >= 88)).to.eq(true)

      customEditor.destroy()
      container.remove()
    })
  })
})
