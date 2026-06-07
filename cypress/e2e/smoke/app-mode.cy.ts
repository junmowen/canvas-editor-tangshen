import type Editor from '../../../src/editor'

describe('开箱即用模式', () => {
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

  it('通过默认 toolbar 插入表格', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()

      cy.get('.menu-item__table')
        .click()
        .then(() => {
          const data = editor.command.getValue().data.main
          const hasTable = data.some(element => element.type === 'table')

          expect(hasTable).to.eq(true)
        })
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
  })

  it('初始化并展示 demo 字体菜单', () => {
    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().defaultFont).to.eq('Microsoft YaHei')
    })

    cy.get('.menu-item__font').click()
    cy.get('.menu-item__font .options').should('be.visible')
    cy.get('.menu-item__font .options li').first().contains('微软雅黑')
  })

  it('同步缩放页脚状态', () => {
    cy.get('.page-scale-add').should('be.visible').click()

    cy.getEditor().then((editor: Editor) => {
      expect(editor.command.getOptions().scale).to.eq(1.1)
    })
    cy.get('.page-scale-percentage').contains('110%')
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
