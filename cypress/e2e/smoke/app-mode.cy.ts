import type Editor from '../../../src/editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { PageMode, PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'

describe('开箱即用模式', () => {
  const readCanvasNonWhitePixels = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext('2d')
    if (!context) return 0
    const image = context.getImageData(0, 0, canvas.width, canvas.height).data
    let nonWhite = 0
    for (let index = 0; index < image.length; index += 4) {
      const r = image[index]
      const g = image[index + 1]
      const b = image[index + 2]
      const a = image[index + 3]
      if (a > 0 && (r < 250 || g < 250 || b < 250)) {
        nonWhite++
      }
    }
    return nonWhite
  }

  const revealInScroller = (scrollerSelector: string, itemSelector: string) => {
    cy.get(itemSelector).then($item => {
      $item[0].scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'center'
      })
      cy.get(scrollerSelector).then($scroller => {
        $scroller[0].dispatchEvent(new Event('scroll'))
        window.scrollTo(0, window.scrollY)
      })
    })
    cy.get(itemSelector).should('be.visible')
  }

  const revealToolbarItem = (selector: string) =>
    revealInScroller('.ce-toolbar', selector)

  const revealFooterItem = (selector: string) =>
    revealInScroller('.ce-footer', selector)

  const expectInViewport = (
    selector: string,
    viewportWidth: number,
    viewportHeight: number
  ) => {
    cy.get(selector)
      .should('be.visible')
      .then($node => {
        const rect = $node[0].getBoundingClientRect()
        expect(rect.left, `${selector} left`).to.be.at.least(0)
        expect(rect.top, `${selector} top`).to.be.at.least(0)
        expect(rect.right, `${selector} right`).to.be.at.most(viewportWidth)
        expect(rect.bottom, `${selector} bottom`).to.be.at.most(viewportHeight)
      })
  }

  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/app.html')

    cy.get('.ce-app').should('have.length', 1)
    cy.get('.ce-toolbar').should('be.visible')
    cy.get('.ce-footer').should('be.visible')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('初始化 app 并暴露核心 editor', () => {
    cy.getEditor().then((editor: Editor) => {
      const value = editor.command.getValue().data
      const options = editor.command.getOptions()

      expect(value.main.length).to.be.greaterThan(10)
      expect(value.main[0].type).to.eq('title')
      expect(options.width).to.eq(794)
      expect(options.height).to.eq(1123)
    })
  })

  it('通过默认 toolbar 执行富文本命令', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([{ value: 'toolbar' }])
      editor.command.executeSetRange(0, 7)

      cy.get('.menu-item__bold')
        .click()
        .then(() => {
          const data = editor.command.getValue().data.main

          expect(data[0].bold).to.eq(true)
        })
    })
  })

  it('格式刷支持单次和双击连续模式', () => {
    cy.getEditor().then((editor: Editor) => {
      cy.stub(editor.command, 'executePainter').as('executePainter')
    })

    cy.get('.menu-item__painter').click()
    cy.get('@executePainter').should('have.been.calledWith', {
      isDblclick: false
    })

    cy.get('.menu-item__painter').dblclick()
    cy.get('@executePainter').should('have.been.calledWith', {
      isDblclick: true
    })
  })

  it('通过默认 toolbar 配置段落缩进和制表位', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList(
        Array.from('zzindent').map(value => ({ value }))
      )
      editor.command.executeForceUpdate()
      editor.command.executeSetRange(0, 0)
      const executeRowIndent = editor.command.executeRowIndent.bind(
        editor.command
      )
      cy.stub(editor.command, 'executeRowIndent')
        .callsFake(payload => executeRowIndent(payload))
        .as('executeRowIndent')
    })

    cy.get('.page-columns').click()
    cy.get('.ce-app-page-columns-panel').should('be.visible')
    cy.contains('.ce-app-tool-panel__actions button', '自定义').click()
    cy.get('.dialog-title').should('contain', '分栏')
    cy.get('input[name="count"]').clear().type('2')
    cy.get('input[name="gap"]').clear().type('36')
    cy.get('input[name="widths"]').clear().type('180,220')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().columns).to.deep.eq({
        count: 2,
        gap: 36,
        widths: [180, 220]
      })
    })

    cy.get('.menu-item__row-indent').click()
    cy.get('.ce-app-row-indent-panel').should('be.visible')
    cy.get('.ce-app-row-indent-panel input[name="left"]').clear().type('1')
    cy.get('.ce-app-row-indent-panel input[name="right"]').clear().type('2')
    cy.get('.ce-app-row-indent-panel input[name="firstLine"]')
      .clear()
      .type('1.5')
    cy.get('.ce-app-row-indent-panel input[name="hanging"]')
      .clear()
      .type('0.5')
    cy.get('.ce-app-row-indent-panel__apply').click()
    cy.get('@executeRowIndent').should('have.been.calledWithMatch', {
      left: 16,
      right: 32,
      firstLine: 24,
      hanging: 8
    })
    cy.getEditor().then((editor: Editor) => {
      const indented = editor.command
        .getValue()
        .data.main.find(
          element =>
            ['zzindent', 'z'].includes(element.value || '') &&
            element.rowIndentLeft === 16
        )
      expect(indented?.rowIndentRight).to.eq(32)
      expect(indented?.rowIndent).to.eq(24)
      expect(indented?.rowHangingIndent).to.eq(8)
    })

    cy.get('.menu-item__tab-stops').click()
    cy.get('.ce-app-tab-stops-panel').should('be.visible')
    cy.get('.ce-app-tab-stops-panel__track').click(120, 14)
    cy.getEditor().then((editor: Editor) => {
      const tabStops = editor.command
        .getValue()
        .data.main.find(
          element =>
            ['zzindent', 'z'].includes(element.value || '') && element.tabStops
        )
        ?.tabStops
      expect(tabStops).to.have.length(1)
      expect(tabStops?.[0].position).to.be.greaterThan(0)
    })
    cy.contains('.ce-app-tool-panel__actions button', '自定义').click()
    cy.get('.dialog-title').should('contain', '制表位')
    cy.get('textarea[name="tabStops"]').clear().type('88:right\n176:center')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      const tabStops = editor.command
        .getValue()
        .data.main.find(
          element =>
            ['zzindent', 'z'].includes(element.value || '') && element.tabStops
        )
        ?.tabStops
      expect(tabStops).to.deep.eq([
        { position: 88, alignment: 'right' },
        { position: 176, alignment: 'center' }
      ])
    })
  })

  it('通过默认 toolbar 插入表格', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      cy.get('.menu-item__table').click()
      cy.get('.ce-app-table-picker').should('be.visible')
      cy.get(
        '.ce-app-table-picker__cell[data-row="4"][data-col="4"]'
      )
        .trigger('mouseenter')
        .click()
        .then(() => {
          const data = editor.command.getValue().data.main
          const table = data.find(element => element.type === 'table')

          expect(table).to.exist
        })
    })
  })

  it('通过默认 toolbar 上传并插入图片', () => {
    cy.window().then(win => {
      const uploadImage = cy
        .stub()
        .resolves({ url: 'https://example.com/app-image.png', width: 120, height: 80 })
        .as('uploadImage')
      const app = Reflect.get(win, 'canvasEditorApp') as {
        updateOptions: (options: Record<string, unknown>) => void
        editor: Editor
      }
      app.updateOptions({
        handlers: {
          uploadImage
        }
      })
      app.editor.command.executeSelectAll()
      app.editor.command.executeBackspace()
      app.editor.command.executeInsertElementList([{ value: 'image anchor' }])
      app.editor.command.executeSetRange(0, 0)
    })

    cy.get('.menu-item__image').click()
    cy.get('.ce-app input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('app image'),
        fileName: 'app-image.png',
        mimeType: 'image/png'
      },
      { force: true }
    )
    cy.get('@uploadImage').should('have.been.calledOnce')
    cy.getEditor().then((editor: Editor) => {
      const image = editor.command
        .getValue()
        .data.main.find(element => element.type === ElementType.IMAGE)
      expect(image?.value).to.eq('https://example.com/app-image.png')
      expect(image?.width).to.eq(120)
      expect(image?.height).to.eq(80)
    })
  })

  it('通过默认 toolbar 插入图表图形', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([{ value: 'chart anchor' }])
      editor.command.executeSetRange(0, 0)
    })

    cy.get('.menu-item__chart-graphic').click()
    cy.contains('.menu-item__chart-graphic .options li', '牙位图').click()

    cy.getEditor().then((editor: Editor) => {
      const chart = editor.command
        .getValue()
        .data.main.find(
          element =>
            element.type === ElementType.CHART_GRAPHIC &&
            element.chartGraphic?.kind === 'dental'
        )
      expect(chart?.chartGraphic?.presetId).to.eq('medical.dental.fdi')
      expect(chart?.chartGraphic?.dental?.teeth.length).to.be.greaterThan(0)
    })
  })

  it('调用保存 handler', () => {
    cy.get('.menu-item__save').click()

    cy.window()
      .its('lastSavedDocument')
      .should('have.nested.property', 'data.main')
  })

  it('渲染 demo 菜单和底栏入口', () => {
    const menuSelectors = [
      '.menu-item__painter',
      '.menu-item__format',
      '.menu-item__format-marker',
      '.menu-item__watermark',
      '.menu-item__latex',
      '.menu-item__track-change'
    ]
    menuSelectors.forEach(selector => {
      cy.get(selector).should('exist')
    })

    const footerSelectors = [
      '.catalog-mode',
      '.paper-size',
      '.paper-direction',
      '.paper-margin',
      '.page-number-range',
      '.fullscreen',
      '.editor-option'
    ]
    footerSelectors.forEach(selector => {
      cy.get(selector).should('be.visible')
    })

    cy.get('.menu-item__chart-graphic > i').should('have.length', 1)
    cy.get('.menu-item__chart-graphic > .select i').should('not.exist')
    cy.get('.menu-item__track-change > i').should('have.length', 1)
    cy.get('.menu-item__track-change > .select i').should('not.exist')
  })

  it('通过视觉 smoke 检查画布、工具栏、页脚和浮层层级', () => {
    cy.get<HTMLCanvasElement>('canvas[data-index="0"]').then($canvas => {
      expect(
        readCanvasNonWhitePixels($canvas[0]),
        '首屏 canvas 非白像素'
      ).to.be.greaterThan(500)
    })

    cy.get('.ce-toolbar').then($toolbar => {
      cy.get('.ce-editor').then($editor => {
        const toolbarRect = $toolbar[0].getBoundingClientRect()
        const editorRect = $editor[0].getBoundingClientRect()
        expect(toolbarRect.bottom).to.be.at.most(editorRect.top)
      })
    })
    cy.get('.ce-footer').then($footer => {
      cy.get('.ce-editor').then($editor => {
        const footerRect = $footer[0].getBoundingClientRect()
        const editorRect = $editor[0].getBoundingClientRect()
        expect(editorRect.bottom).to.be.at.most(footerRect.top)
      })
    })

    revealToolbarItem('.menu-item__search')
    cy.get('.menu-item__search').click()
    cy.get('.ce-app-search-panel').then($panel => {
      cy.get('.ce-toolbar').then($toolbar => {
        const panelRect = $panel[0].getBoundingClientRect()
        const toolbarRect = $toolbar[0].getBoundingClientRect()
        expect(panelRect.top).to.be.at.least(toolbarRect.bottom - 12)
      })
    })
    cy.get('.ce-app-search-panel__close').click()
  })

  it('显示 app 演示留痕右侧审阅面板', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList(
        Array.from('abcdef').map(value => ({ value }))
      )
      editor.command.executeSetRange(0, 3)
    })

    revealToolbarItem('.menu-item__track-change')
    cy.get('.menu-item__track-change').click()
    cy.contains('.menu-item__track-change .options li', '开启留痕').click()

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeBackspace()
    })

    cy.get('.track-change-panel.is-visible').should('exist')
    cy.get('.track-change-card')
      .should('contain', '君莫问')
      .and('contain', '删除')
  })

  it('显示 app 演示批注右侧卡片和连线', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeLocationGroup('1')
    })

    cy.get('.comment-item')
      .should('be.visible')
      .and('contain', '血细胞比容')
      .and('contain', 'Hufe')
      .click()
      .should('have.class', 'active')

    cy.get('.track-change-link-layer.is-visible path')
      .its('length')
      .should('be.greaterThan', 0)
  })

  it('通过开箱即用右键菜单创建批注', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList(
        Array.from('comment target').map(value => ({ value }))
      )
      editor.command.executeSetRange(0, 7)
    })

    cy.get('canvas[data-index="0"]').rightclick(170, 190)
    cy.contains('.ce-contextmenu-item', '批注').click()
    cy.get('textarea[name="value"]').type('app 右键批注')
    cy.contains('.dialog-menu button', '确定').click()

    cy.get('.comment-item')
      .should('contain', 'comment')
      .and('contain', 'app 右键批注')
  })

  it('通过批注卡片删除批注并调用业务回调', () => {
    cy.window().then(win => {
      const comments = [
        {
          id: '1',
          content: '待删除批注',
          userName: 'App User',
          rangeText: '血细胞比容',
          createdDate: '2026-07-13'
        }
      ]
      const deleteComment = cy
        .stub()
        .callsFake((commentId: string) => {
          const index = comments.findIndex(comment => comment.id === commentId)
          if (index >= 0) comments.splice(index, 1)
        })
        .as('deleteComment')
      const app = Reflect.get(win, 'canvasEditorApp') as {
        updateOptions: (options: Record<string, unknown>) => void
      }
      app.updateOptions({
        handlers: {
          getComments: () => comments,
          deleteComment
        }
      })
      const editor = Reflect.get(win, 'editor') as Editor
      editor.command.executeLocationGroup('1')
    })

    cy.get('.comment-item[data-id="1"]')
      .should('be.visible')
      .should('contain', '待删除批注')
      .find('.comment-item__title i')
      .click()
    cy.get('@deleteComment').should('have.been.calledWith', '1')
    cy.get('.comment-item[data-id="1"]').should('not.exist')
    cy.getEditor()
      .then((editor: Editor) => editor.command.getGroupIds())
      .should('not.include', '1')
  })

  it('打开目录并通过标题项定位正文', () => {
    cy.getEditor().then((editor: Editor) => {
      cy.spy(editor.command, 'executeLocationCatalog').as(
        'executeLocationCatalog'
      )
    })

    cy.get('.catalog-mode').click()
    cy.get('.catalog.is-visible').should('be.visible')
    cy.contains('.catalog-item__content', '主诉').click()
    cy.get('@executeLocationCatalog').should('have.been.calledOnce')
    cy.get('.catalog__header__close').click()
    cy.get('.catalog').should('not.have.class', 'is-visible')
  })

  it('通过公式右键入口编辑已有公式', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'app-editable-formula',
            type: ElementType.LATEX,
            value: 'x^{2}',
            formula: {
              id: 'app-editable-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'x^{2}',
              ast: {
                type: 'superscript',
                base: { type: 'text', value: 'x' },
                superscript: { type: 'text', value: '2' }
              }
            }
          }
        ]
      })
      const formulaElement = editor.command
        .getValue()
        .data.main.find(element => element.id === 'app-editable-formula')
      const editFormulaMenu = editor.register
        .getContextMenuList()
        .find(menu => menu.key === 'formula-edit')

      expect(editFormulaMenu).to.exist
      editFormulaMenu!.callback!(editor.command, {
        startElement: formulaElement,
        endElement: formulaElement,
        isReadonly: false,
        editorHasSelection: false,
        editorTextFocus: false,
        isInTable: false,
        isCrossRowCol: false,
        zone: 'main',
        trIndex: null,
        tdIndex: null,
        tableElement: null,
        options: {}
      } as any)
    })

    cy.get('.dialog-title').should('contain', '编辑公式')
    cy.get('textarea[name="latex"]').should('have.value', 'x^{2}')
    cy.get('textarea[name="latex"]').clear().type('y^{{}3{}}')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find(element => element.id === 'app-editable-formula')
      expect(formulaElement?.value).to.eq('y^{3}')
      expect(formulaElement?.formula?.latex).to.eq('y^{3}')
    })
  })

  it('默认打印入口和 Ctrl+P 快捷键执行核心打印命令', () => {
    cy.getEditor().then((editor: Editor) => {
      cy.stub(editor.command, 'executePrint').as('executePrint')
    })

    cy.get('.menu-item__print').click()
    cy.get('@executePrint').should('have.been.calledOnce')
    cy.document().then(document => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'p',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        })
      )
    })
    cy.get('@executePrint').should('have.been.calledTwice')
  })

  it('在手机窄屏内约束工具栏、浮层、目录和审阅卡片', () => {
    cy.viewport(375, 667)
    const shouldStayInViewport = (selector: string) => {
      expectInViewport(selector, 375, 667)
    }

    cy.get('.ce-toolbar').then($toolbar => {
      const toolbar = $toolbar[0]
      expect(toolbar.scrollWidth).to.be.greaterThan(toolbar.clientWidth)
    })
    cy.get('.ce-footer').then($footer => {
      const footer = $footer[0]
      expect(footer.scrollWidth).to.be.greaterThan($footer[0].clientWidth)
    })
    cy.document().then(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(375)
    })

    revealToolbarItem('.menu-item__latex')
    cy.get('.menu-item__latex').click()
    shouldStayInViewport('.ce-app-formula-picker')
    cy.get('.ce-app-formula-picker__header button').click()

    revealToolbarItem('.menu-item__row-indent')
    cy.get('.menu-item__row-indent').click()
    shouldStayInViewport('.ce-app-row-indent-panel')
    cy.get('.ce-app-tool-panel__header button').click()

    revealToolbarItem('.menu-item__search')
    cy.get('.menu-item__search').click()
    shouldStayInViewport('.ce-app-search-panel')
    cy.get('.ce-app-search-panel__close').click()

    revealToolbarItem('.page-columns')
    cy.get('.page-columns').click()
    cy.contains('.ce-app-tool-panel__actions button', '自定义').click()
    shouldStayInViewport('.dialog')
    cy.get('.dialog-option__item input').each($input => {
      const rect = $input[0].getBoundingClientRect()
      expect(rect.right).to.be.at.most(363)
      expect(rect.left).to.be.at.least(12)
    })
    cy.contains('.dialog-menu button', '取消').click()

    revealFooterItem('.catalog-mode')
    cy.get('.catalog-mode').click()
    shouldStayInViewport('.catalog.is-visible')
    cy.get('.catalog__header__close').click()

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeLocationGroup('1')
    })
    shouldStayInViewport('.comment-item[data-id="1"]')
    cy.get('.track-change-link-layer').should('not.be.visible')

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList(
        Array.from('mobile review').map(value => ({ value }))
      )
      editor.command.executeSetTrackChange({
        enabled: true,
        author: 'Mobile User'
      })
      editor.command.executeSetRange(0, 5)
      editor.command.executeBackspace()
    })
    shouldStayInViewport('.track-change-card')
    shouldStayInViewport('.track-change-panel__header')
  })

  it('在 320px 极窄屏保持触摸命中区和浮层边界', () => {
    cy.viewport(320, 568)
    cy.document().then(document => {
      expect(document.documentElement.scrollWidth).to.be.at.most(320)
    })

    cy.get('.menu-item__bold').then($node => {
      const rect = $node[0].getBoundingClientRect()
      expect(rect.width).to.be.at.least(32)
      expect(rect.height).to.be.at.least(32)
    })
    cy.get('.page-scale-add').then($node => {
      const rect = $node[0].getBoundingClientRect()
      expect(rect.width).to.be.at.least(32)
      expect(rect.height).to.be.at.least(32)
    })

    revealToolbarItem('.menu-item__search')
    cy.get('.menu-item__search').click()
    expectInViewport('.ce-app-search-panel', 320, 568)
    cy.get('.ce-app-search-panel input[name="search"]')
      .should('be.visible')
      .type('门诊')
    cy.get('.ce-app-search-panel__close').click()

    revealToolbarItem('.menu-item__latex')
    cy.get('.menu-item__latex').click()
    expectInViewport('.ce-app-formula-picker', 320, 568)
    cy.get('.ce-app-formula-picker__header button').click()

    revealFooterItem('.catalog-mode')
    cy.get('.catalog-mode').click()
    expectInViewport('.catalog.is-visible', 320, 568)
  })

  it('在平板窄屏保留右侧审阅连线和目录布局', () => {
    cy.viewport(768, 900)
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeLocationGroup('1')
    })
    expectInViewport('.comment-item[data-id="1"]', 768, 900)
    cy.get('.track-change-link-layer.is-visible path')
      .its('length')
      .should('be.greaterThan', 0)

    revealFooterItem('.catalog-mode')
    cy.get('.catalog-mode').click()
    expectInViewport('.catalog.is-visible', 768, 900)
  })

  it('打开 app 页脚配置弹窗', () => {
    cy.get('.page-mode').click()
    cy.get('.page-mode .options').should('be.visible')
    cy.contains('.page-mode .options li', '连页').click()
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().pageMode).to.eq(PageMode.CONTINUITY)
    })
    cy.get('.page-mode').click()
    cy.contains('.page-mode .options li.active', '连页')
    cy.get('body').click(0, 0)

    cy.get('.paper-size').click()
    cy.contains('.paper-size .options li', 'A5').click()
    cy.getEditor().then((editor: Editor) => {
      const options = editor.command.getOptions()
      expect(options.width).to.eq(565)
      expect(options.height).to.eq(796)
    })
    cy.get('.paper-size').click()
    cy.contains('.paper-size .options li.active', 'A5')
    cy.get('body').click(0, 0)

    cy.get('.paper-direction').click()
    cy.contains('.paper-direction .options li', '横向').click()
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().paperDirection).to.eq(
        PaperDirection.HORIZONTAL
      )
    })
    cy.get('.paper-direction').click()
    cy.contains('.paper-direction .options li.active', '横向')
    cy.get('body').click(0, 0)

    cy.get('.ce-footer .paper-margin').should('be.visible').click()
    cy.get('.dialog-title').should('contain', '页边距')
    cy.get('input[name="top"]').clear().type('88')
    cy.contains('.dialog-menu button', '确定').click()

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().margins?.[0]).to.eq(88)
    })

    cy.get('.page-number-range').click()
    cy.get('.dialog-title').should('contain', '页码范围')
    cy.get('select[name="mode"]').select('restart')
    cy.get('input[name="startPageNo"]').clear().type('3')
    cy.get('input[name="fromPageNo"]').clear().type('2')
    cy.get('input[name="maxPageNo"]').clear().type('5')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().pageNumber).to.include({
        startPageNo: 3,
        fromPageNo: 1,
        maxPageNo: 5
      })
    })

    cy.get('.editor-option').click()
    cy.get('.dialog-title').should('contain', '编辑器配置')
  })

  it('通过默认 toolbar 使用弹窗类插入能力', () => {
    cy.get('.menu-item__watermark').click()
    cy.contains('.menu-item__watermark .options li', '添加水印').click()
    cy.get('.dialog-title').should('contain', '水印')
    cy.get('input[name="data"]').clear().type('APP-WATERMARK')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().watermark?.data).to.eq('APP-WATERMARK')
    })

    cy.get('.menu-item__codeblock').click()
    cy.get('.dialog-title').should('contain', '代码块')
    cy.get('textarea[name="codeblock"]').type('const app = true')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      const data = editor.command.getValue().data.main
      expect(data.map(element => element.value || '').join('')).to.contain(
        'const app = true'
      )
    })

    cy.get('.menu-item__hyperlink').click()
    cy.get('.dialog-title').should('contain', '超链接')
    cy.get('input[name="name"]').type('Canvas Editor')
    cy.get('input[name="url"]').type('example.com')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      const data = editor.command.getValue().data.main
      expect(
        data.some(
          element =>
            element.type === 'hyperlink' &&
            element.url === 'https://example.com'
        )
      ).to.eq(true)
    })

    cy.get('.menu-item__control').click()
    cy.contains('.menu-item__control .options li', '下拉控件').click()
    cy.get('.dialog-title').should('contain', '下拉控件')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      const data = editor.command.getValue().data.main
      expect(
        data.some(
          element =>
            element.type === 'control' &&
            element.control?.type === 'select' &&
            element.control?.valueSets?.length === 2
        )
      ).to.eq(true)
    })

    cy.get('.menu-item__latex').click()
    cy.get('.ce-app-formula-picker')
      .should('be.visible')
      .and('contain', '专业符号')
    cy.contains('.ce-app-formula-picker button', '自定义公式').click()
    cy.get('.dialog-title').should('contain', '自定义公式')
    cy.get('textarea[name="latex"]').clear().type('E=mc^2')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      const data = editor.command.getValue().data.main
      expect(
        data.some(
          element =>
            element.type === 'latex' && element.formula?.latex === 'E=mc^2'
        )
      ).to.eq(true)
    })

    cy.get('.menu-item__date').click()
    cy.get('.menu-item__date .options li').first().click()
    cy.getEditor().then((editor: Editor) => {
      const data = editor.command.getValue().data.main
      expect(
        data.some(
          element =>
            element.type === 'date' &&
            element.dateFormat === 'yyyy' &&
            /^\d{4}$/.test(element.valueList?.[0]?.value || '')
        )
      ).to.eq(true)
    })

    cy.get('.menu-item__block').click()
    cy.get('.dialog-title').should('contain', '内容块')
    cy.get('textarea[name="srcdoc"]').type('<p>App Block</p>')
    cy.contains('.dialog-menu button', '确定').click()
    cy.getEditor().then((editor: Editor) => {
      const block = editor.command
        .getValue()
        .data.main.find(element => element.type === 'block')
      expect(block?.block?.type).to.eq('iframe')
      expect(block?.block?.iframeBlock?.srcdoc).to.contain('App Block')
    })

    cy.getEditor().then((editor: Editor) => {
      cy.stub(editor.command, 'executeSearch').as('executeSearch')
      cy.stub(editor.command, 'executeReplace').as('executeReplace')
      cy.stub(editor.command, 'executeSearchNavigatePre').as(
        'executeSearchNavigatePre'
      )
      cy.stub(editor.command, 'executeSearchNavigateNext').as(
        'executeSearchNavigateNext'
      )
    })
    cy.get('.menu-item__search').click()
    cy.get('.ce-app-search-panel').should('be.visible')
    cy.get('.ce-app-search-panel input[name="search"]').type('门诊')
    cy.get('.ce-app-search-panel input[name="replace"]').type('急诊')
    cy.get('.ce-app-search-panel__nav').first().click()
    cy.get('.ce-app-search-panel__nav').last().click()
    cy.get('.ce-app-search-panel__replace').click()
    cy.get('@executeSearch').should('have.been.calledWith', '门诊')
    cy.get('@executeReplace').should('have.been.calledWith', '急诊')
    cy.get('@executeSearchNavigatePre').should('have.been.calledOnce')
    cy.get('@executeSearchNavigateNext').should('have.been.calledOnce')
    cy.get('.ce-app-search-panel__close').click()
    cy.get('.ce-app-search-panel').should('not.exist')
    cy.document().then(document => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'f',
          ctrlKey: true,
          bubbles: true,
          cancelable: true
        })
      )
    })
    cy.get('.ce-app-search-panel').should('be.visible')
  })

  it('同步 app 留痕菜单状态文案', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList(
        Array.from('abcdef').map(value => ({ value }))
      )
      editor.command.executeSetRange(0, 3)
    })

    revealToolbarItem('.menu-item__track-change')
    cy.get('.menu-item__track-change').click()
    cy.contains('.menu-item__track-change .options li', '开启留痕').click()

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeBackspace()
    })
    cy.get('.track-change-card')
      .should('contain', '君莫问')
      .and('contain', '删除')

    revealToolbarItem('.menu-item__track-change')
    cy.get('.menu-item__track-change').click()
    cy.contains('.menu-item__track-change .options li', '关闭留痕')
    cy.contains('.menu-item__track-change .options li', '关闭留痕面板')
  })

  it('通过 app 留痕卡片接受和拒绝单条修订', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList(
        Array.from('abcdef').map(value => ({ value }))
      )
      editor.command.executeSetRange(0, 3)
    })
    revealToolbarItem('.menu-item__track-change')
    cy.get('.menu-item__track-change').click()
    cy.contains('.menu-item__track-change .options li', '开启留痕').click()
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeBackspace()
    })
    cy.get('.track-change-card')
      .should('contain', '删除')
      .find('.track-change-card__accept')
      .click()
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getTrackChangeList()).to.have.length(0)
    })

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetTrackChange({ enabled: false })
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList(
        Array.from('abcdef').map(value => ({ value }))
      )
      editor.command.executeSetTrackChange({
        enabled: true,
        author: '君莫问'
      })
      editor.command.executeSetRange(0, 3)
      editor.command.executeBackspace()
    })
    cy.get('.track-change-card')
      .should('contain', '删除')
      .find('.track-change-card__reject')
      .click()
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getTrackChangeList()).to.have.length(0)
      expect(
        editor.command
          .getValue()
          .data.main.map(element => element.value || '')
          .join('')
      ).to.contain('abcdef')
    })
  })

  it('初始化并展示 demo 字体菜单', () => {
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().defaultFont).to.eq('Microsoft YaHei')
    })

    cy.get('.menu-item__font').click()
    cy.get('.menu-item__font .options').should('be.visible')
    cy.get('.menu-item__font .options li').first().contains('微软雅黑')
  })

  it('同步 toolbar 下拉状态回显', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeInsertElementList([{ value: 'state sync' }])
      editor.command.executeForceUpdate()
      editor.command.executeSetRange(0, 0)
      editor.command.executeFont('Arial')
      editor.command.executeSize(24)
      editor.command.executeRowMargin(2)
    })

    cy.get('.menu-item__font .select').should('contain', 'Arial')
    cy.get('.menu-item__size .select').should('contain', '小二')
    cy.get('.menu-item__row-margin').click()
    cy.get('.menu-item__row-margin li[data-value="2"]').should(
      'have.class',
      'active'
    )
    cy.get('body').click(0, 0)

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeTitle(TitleLevel.FIRST)
    })
    cy.get('.menu-item__title .select').should('contain', '标题1')

    cy.getEditor().then((editor: Editor) => {
      editor.command.executeList(ListType.UL, ListStyle.SQUARE)
    })
    cy.get('.menu-item__list .select').should('contain', '方块列表')
  })

  it('同步缩放页脚状态', () => {
    cy.get('.page-scale-add').should('be.visible').click()

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().scale).to.eq(1.1)
    })
    cy.get('.page-scale-percentage').contains('110%')
  })

  it('通过页脚明确切换编辑模式并同步 toolbar 权限', () => {
    cy.get('.editor-mode').click()
    cy.get('.editor-mode .options').should('be.visible')
    cy.contains('.editor-mode .options li', '只读模式').click()

    cy.get('.editor-mode__label').should('contain', '只读模式')
    cy.get('.menu-item__bold').should('have.class', 'disable')
    cy.get('.menu-item__search').should('not.have.class', 'disable')
    cy.get('.menu-item__print').should('not.have.class', 'disable')

    cy.get('.editor-mode').click()
    cy.contains('.editor-mode .options li', '编辑模式').click()
    cy.get('.editor-mode__label').should('contain', '编辑模式')
    cy.get('.menu-item__bold').should('not.have.class', 'disable')
  })

  it('PDF 导出注入 demo 字体', () => {
    cy.window().then(win => {
      const app = Reflect.get(win, 'canvasEditorApp') as { editor: Editor }

      cy.stub(app.editor.command, 'getPdfBlob')
        .callsFake((options?: { fonts?: unknown[] }) => {
          expect(options?.fonts).to.have.length(2)
          return Promise.resolve(new Blob(['pdf']))
        })
        .as('getPdfBlob')
    })

    cy.get('.menu-item__pdf').click()
    cy.get('@getPdfBlob').should('have.been.calledOnce')
  })

  it('DOCX 导出使用开箱即用下载入口', () => {
    cy.window().then(win => {
      const app = Reflect.get(win, 'canvasEditorApp') as { editor: Editor }

      cy.stub(app.editor.command, 'getOoxmlDocxBlob')
        .returns(new Blob(['docx']))
        .as('getOoxmlDocxBlob')
    })

    cy.get('.menu-item__docx').click()
    cy.get('@getOoxmlDocxBlob').should('have.been.calledOnce')
  })

  it('支持业务覆盖打印导出和上传错误处理', () => {
    cy.window().then(win => {
      const print = cy.stub().as('printHandler')
      const exportDocx = cy.stub().resolves().as('exportDocxHandler')
      const exportPdf = cy.stub().resolves().as('exportPdfHandler')
      const uploadImage = cy
        .stub()
        .rejects(new Error('upload failed'))
        .as('uploadImageHandler')
      const onError = cy.stub().as('appErrorHandler')
      const app = Reflect.get(win, 'canvasEditorApp') as {
        updateOptions: (options: Record<string, unknown>) => void
        editor: Editor
      }

      cy.stub(app.editor.command, 'executePrint').as('executePrint')
      cy.stub(app.editor.command, 'getOoxmlDocxBlob').as('getOoxmlDocxBlob')
      cy.stub(app.editor.command, 'getPdfBlob').as('getPdfBlob')
      app.updateOptions({
        handlers: {
          print,
          exportDocx,
          exportPdf,
          uploadImage,
          onError
        }
      })
    })

    cy.get('.menu-item__print').click()
    cy.get('.menu-item__docx').click()
    cy.get('.menu-item__pdf').click()
    cy.get('@printHandler').should('have.been.calledOnce')
    cy.get('@exportDocxHandler').should('have.been.calledOnce')
    cy.get('@exportPdfHandler').should('have.been.calledOnce')
    cy.get('@executePrint').should('not.have.been.called')
    cy.get('@getOoxmlDocxBlob').should('not.have.been.called')
    cy.get('@getPdfBlob').should('not.have.been.called')

    cy.get('.menu-item__image').click()
    cy.get('.ce-app input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('broken image'),
        fileName: 'broken.png',
        mimeType: 'image/png'
      },
      { force: true }
    )
    cy.get('@uploadImageHandler').should('have.been.calledOnce')
    cy.get('@appErrorHandler').should('have.been.calledOnce')
  })

  it('支持配置 toolbar、footer、右键菜单、注册入口和事件监听', () => {
    cy.window().then(win => {
      const pageScaleChange = cy.stub().as('pageScaleChange')
      const app = Reflect.get(win, 'canvasEditorApp') as {
        updateOptions: (options: Record<string, unknown>) => void
        register: (options: Record<string, unknown>) => void
        on: (listeners: Record<string, unknown>) => () => void
      }

      app.updateOptions({
        ui: {
          toolbar: {
            include: ['bold']
          },
          footer: {
            include: ['scale', 'paper-size', 'custom-status'],
            replace: {
              'paper-size': {
                id: 'paper-size',
                className: 'custom-paper-size',
                label: 'A4固定'
              }
            },
            append: [
              {
                id: 'custom-status',
                align: 'left',
                className: 'custom-status',
                label: '业务状态'
              }
            ]
          },
          contextMenu: {
            mode: 'custom',
            menus: [
              {
                name: 'App菜单',
                when: () => true,
                callback: () => Reflect.set(win, 'appContextMenuClicked', true)
              }
            ]
          }
        }
      })
      app.on({
        pageScaleChange
      })
      app.register({
        contextMenus: [
          {
            name: '注册菜单',
            when: () => true,
            callback: () => Reflect.set(win, 'appRegisteredContextMenu', true)
          }
        ],
        shortcuts: [],
        setup: (ctx: { root: HTMLElement }) => {
          Reflect.set(win, 'appRegisterRootClass', ctx.root.className)
        }
      })
      app.updateOptions({
        register: {
          setup: (ctx: { root: HTMLElement }) => {
            Reflect.set(win, 'appUpdateRegisterRootClass', ctx.root.className)
          }
        }
      })
    })

    cy.get('.menu-item__bold').should('exist')
    cy.get('.menu-item__table').should('not.exist')
    cy.get('.page-scale-add').should('exist')
    cy.get('.custom-status').should('contain', '业务状态')
    cy.get('.custom-paper-size').should('contain', 'A4固定')
    cy.get('.paper-size').should('not.exist')
    cy.get('.catalog-mode').should('not.exist')
    cy.window()
      .its('appRegisterRootClass')
      .should('contain', 'ce-app')
    cy.window()
      .its('appUpdateRegisterRootClass')
      .should('contain', 'ce-app')

    cy.get('.page-scale-add').click()
    cy.get('@pageScaleChange').should('have.been.calledOnce')
    cy.getEditor().then(editor => {
      expect(editor.command.getOptions().contextMenuDisableKeys).to.include(
        'globalCopy'
      )
    })
  })
})
