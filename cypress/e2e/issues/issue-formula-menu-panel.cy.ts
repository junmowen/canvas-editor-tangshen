import type Editor from '../../../src/editor'

/** 覆盖 TS-01 公式菜单和可编辑公式控件，避免菜单停留在单一 LaTeX 文本框。 */
describe('typesetting formula menu panel', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证常用结构按钮会写入结构化公式模型。 */
  it('inserts a structured formula from the visual template panel', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({ main: [{ value: '公式菜单测试' }] })
      editor.command.executeSetRange(0, 0)
    })
    cy.get('.menu-item__latex').click()
    cy.get('.formula-menu-options [data-formula-action="custom"]').click()
    cy.get('.formula-dialog').should('be.visible')
    cy.get('.formula-dialog__template[data-template-id="fraction"]').click()
    cy.get('.formula-dialog__textarea').should('have.value', '\\frac{a}{b}')
    cy.get('.formula-dialog__preview-image')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'data:image/svg+xml;base64')
    cy.get('.formula-dialog__confirm').click()

    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find((element: any) => {
          return element.type === 'latex' && element.value === '\\frac{a}{b}'
        })
      expect(formulaElement).to.exist
      expect(formulaElement.value).to.eq('\\frac{a}{b}')
      expect(formulaElement.formula.ast.type).to.eq('fraction')
      expect(formulaElement.formula.latex).to.eq('\\frac{a}{b}')
    })
  })

  /** 验证医院/工厂专业符号库可从菜单直接插入并保留领域标签。 */
  it('inserts domain formula symbols with business metadata', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({ main: [{ value: '公式符号测试' }] })
      editor.command.executeSetRange(0, 0)
    })
    cy.get('.menu-item__latex').click()
    cy.get('.formula-menu-options [data-formula-action="custom"]').click()
    cy.get('.formula-dialog').should('be.visible')
    cy.get('.formula-dialog__domain-list button[data-domain="hospital"]').click()
    cy.get('.formula-dialog__symbol[data-symbol-id="hospital-dose"]').click()
    cy.get('.formula-dialog__textarea').should('have.value', 'mg/kg')
    cy.get('.formula-dialog__preview-image')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'data:image/svg+xml;base64')
    cy.get('.formula-dialog__confirm').click()

    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find((element: any) => {
          return element.type === 'latex' && element.value === 'mg/kg'
        })
      expect(formulaElement).to.exist
      expect(formulaElement.value).to.eq('mg/kg')
      expect(formulaElement.formula.domainTags).to.deep.eq(['hospital'])
      expect(formulaElement.formula.symbolIds).to.deep.eq(['hospital-dose'])
    })
  })

  /** 验证手动输入下标类专业公式时，预览区域显示 SVG 公式而不是普通文本。 */
  it('renders manual latex input as an svg preview', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({ main: [{ value: '公式预览测试' }] })
      editor.command.executeSetRange(0, 0)
    })
    cy.get('.menu-item__latex').click()
    cy.get('.formula-menu-options [data-formula-action="custom"]').click()
    cy.get('.formula-dialog__textarea').type('C=D_{{}hole{}}-D_{{}shaft{}}')
    cy.get('.formula-dialog__preview-image')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'data:image/svg+xml;base64')
    cy.get('.formula-dialog__preview').should('not.contain.text', 'C=D_{hole}')
  })

  /** 验证公式菜单下拉项可直接插入数学公式，不再强制先打开弹窗。 */
  it('directly inserts a math formula from the dropdown menu', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({ main: [{ value: '公式直插测试' }] })
      editor.command.executeSetRange(0, 0)
    })
    cy.get('.menu-item__latex').click()
    cy.get('.formula-menu-category[data-formula-category="math"]')
      .should('be.visible')
      .find('.formula-menu-sublist')
      .invoke('css', 'display', 'block')
    cy.get('.formula-menu-category[data-formula-category="physics"]').should('be.visible')
    cy.get('.formula-menu-category[data-formula-category="chemistry"]').should('be.visible')
    cy.get('.formula-menu-category[data-formula-category="common"]').should('not.exist')
    cy.get('.formula-menu-options [data-formula-latex="a^{2}+b^{2}=c^{2}"] img')
      .should('have.attr', 'src')
      .and('include', 'data:image/svg+xml;base64')
    cy.get('.formula-menu-options [data-formula-latex="a^{2}+b^{2}=c^{2}"]').click({
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.type === 'latex')
      expect(formulaElement).to.exist
      expect(formulaElement.value).to.eq('a^{2}+b^{2}=c^{2}')
      expect(formulaElement.formula.latex).to.eq('a^{2}+b^{2}=c^{2}')
      expect(formulaElement.formula.ast.type).to.eq('root')
      expect(formulaElement.formula.domainTags).to.deep.eq(['math'])
    })
  })

  /** 验证快捷菜单一级为业务公式类目，悬停二级公式后可直插并保留专业元数据。 */
  it('inserts a domain formula from a second-level quick category', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({ main: [{ value: '公式类目直插测试' }] })
      editor.command.executeSetRange(0, 0)
    })
    cy.get('.menu-item__latex').click()
    cy.get('.formula-menu-category[data-formula-category="hospital"]').should('be.visible')
    cy.get('.formula-menu-category[data-formula-category="chemistry"]').should('be.visible')
    cy.get('.formula-menu-category[data-formula-category="chemistry"]')
      .find('.formula-menu-sublist')
      .invoke('css', 'display', 'block')
    cy.get('.formula-menu-options [data-formula-symbol-ids="chemistry-ph"]').click({
      force: true
    })

    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.type === 'latex')
      expect(formulaElement).to.exist
      expect(formulaElement.value).to.eq('pH=-\\log[H^+]')
      expect(formulaElement.formula.domainTags).to.deep.eq(['chemistry'])
      expect(formulaElement.formula.symbolIds).to.deep.eq(['chemistry-ph'])
    })
  })

  /** 验证 LaTeX 空白公式作为文本型可编辑控件插入，正文中不再降级成图片。 */
  it('inserts a blank editable formula control from the dropdown menu', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({ main: [{ value: '空公式控件测试' }] })
      editor.command.executeSetRange(0, 0)
    })
    cy.get('.menu-item__latex').click()
    cy.get('.formula-menu-options [data-formula-action="blank"]').click()

    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.type === 'latex')
      const renderedFormulaElement = (editor as any).draw
        .getObjectResolver().getOriginalMainElementList()
        .find((element: any) => element.type === 'latex')
      expect(formulaElement).to.exist
      expect(formulaElement.value).to.eq('')
      expect(formulaElement.formula.latex).to.eq('')
      expect(formulaElement.formula.placeholderLatex).to.eq('\\Box')
      expect(formulaElement.formula.placeholderText).to.eq('请输入公式')
      expect(formulaElement.formula.placeholderColor).to.eq('#9ca3af')
      expect(renderedFormulaElement.laTexSVG).to.be.undefined
      expect(renderedFormulaElement.formula.displayText).to.eq('请输入公式')
    })
  })

  /** 验证点击页面内公式会进入覆盖层编辑态，并能直接改写角标内容。 */
  it('edits an existing formula in place from the page control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'inline-formula',
            type: 'latex',
            value: 'x^{2}',
            formula: {
              id: 'inline-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'x^{2}',
              placeholderLatex: '\\Box',
              ast: {
                type: 'superscript',
                base: { type: 'text', value: 'x' },
                superscript: { type: 'text', value: '2' }
              }
            }
          } as any
        ]
      })
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const position = draw
        .getCoordinate()
        .getMainPositionList()
        .find((item: any) => item.index === 0)
      const pageWrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[position.pageNo] as HTMLDivElement
      const rect = pageWrapper.getBoundingClientRect()
      const clientX = rect.left + position.coordinate.leftTop[0] + 4
      const clientY = rect.top + position.coordinate.leftTop[1] + 4
      cy.get('.ce-page-container')
        .trigger('mousedown', { clientX, clientY, button: 0 })
        .trigger('mouseup', { clientX, clientY, button: 0 })
        .trigger('click', { clientX, clientY, button: 0 })
    })

    cy.get('.formula-inline-editor').should('be.visible')
    cy.get('.formula-inline-editor__toolbar').should('not.exist')
    cy.get('.formula-inline-editor__script-sup').should('be.visible')
    cy.get('.formula-inline-editor__field--script')
      .should('have.text', '2')
      .clear()
      .type('3')
    cy.get('body').click(5, 5)

    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.id === 'inline-formula')
      expect(formulaElement.value).to.eq('x^{3}')
      expect(formulaElement.formula.ast.type).to.eq('superscript')
      expect(formulaElement.formula.ast.superscript.value).to.eq('3')
    })
  })

  /** 验证公式左右边缘点击时，光标可以稳定落到公式前后。 */
  it('allows cursor placement before and after a formula by clicking near its edges', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: '前文' },
          {
            id: 'edge-formula',
            type: 'latex',
            value: 'C=2\\pi r',
            formula: {
              id: 'edge-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'C=2\\pi r',
              ast: {
                type: 'root',
                children: [{ type: 'text', value: 'C=2\\pi r' }]
              }
            }
          },
          { value: '后文' }
        ]
      })
    })

    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const resolver = draw.getObjectResolver()
      const position = draw
        .getCoordinate()
        .getMainPositionList()
        .find((item: any) => {
          return resolver.getLayoutMainElement(item.index)?.id === 'edge-formula'
        })
      expect(position).to.exist
      const pageWrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[position.pageNo] as HTMLDivElement
      const rect = pageWrapper.getBoundingClientRect()
      const leftClientX = rect.left + position.coordinate.leftTop[0] - 2
      const rightClientX = rect.left + position.coordinate.rightTop[0] + 2
      const clientY = rect.top + position.coordinate.leftTop[1] + 4

      cy.get('.ce-page-container')
        .trigger('mousedown', { clientX: leftClientX, clientY, button: 0 })
        .trigger('mouseup', { clientX: leftClientX, clientY, button: 0 })
        .trigger('click', { clientX: leftClientX, clientY, button: 0 })

      cy.getEditor().then((afterLeftClickEditor: Editor) => {
        const leftCursor = afterLeftClickEditor.command.getCursorPosition()
        expect(leftCursor?.index).to.be.lessThan(position.index)
      })
      cy.get('.formula-inline-editor').should('not.exist')

      cy.get('.ce-page-container')
        .trigger('mousedown', { clientX: rightClientX, clientY, button: 0 })
        .trigger('mouseup', { clientX: rightClientX, clientY, button: 0 })
        .trigger('click', { clientX: rightClientX, clientY, button: 0 })

      cy.getEditor().then((afterRightClickEditor: Editor) => {
        const rightCursor = afterRightClickEditor.command.getCursorPosition()
        expect(rightCursor?.index).to.be.gte(position.index)
      })
      cy.get('.formula-inline-editor').should('not.exist')
    })
  })

  /** 验证求和上下限在公式编辑态保持上下堆叠，不被压平成普通文本。 */
  it('keeps summation limits stacked in the inline formula editor', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'inline-sum-formula',
            type: 'latex',
            value: '\\sum_{i=1}^{n}x_i',
            formula: {
              id: 'inline-sum-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: '\\sum_{i=1}^{n}x_i',
              ast: {
                type: 'root',
                children: [{ type: 'text', value: '\\sum_{i=1}^{n}x_i' }]
              }
            }
          }
        ]
      })
      editor.command.executeSetRange(0, 0)
      const draw = (editor as any).draw
      const position = draw
        .getCoordinate()
        .getMainPositionList()
        .find((item: any) => item.index === 0)
      const pageWrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[position.pageNo] as HTMLDivElement
      const rect = pageWrapper.getBoundingClientRect()
      const clientX = rect.left + position.coordinate.leftTop[0] + 4
      const clientY = rect.top + position.coordinate.leftTop[1] + 4
      cy.get('.ce-page-container')
        .trigger('mousedown', { clientX, clientY, button: 0 })
        .trigger('mouseup', { clientX, clientY, button: 0 })
        .trigger('click', { clientX, clientY, button: 0 })
    })

    cy.get('.formula-inline-editor__input').should('contain', '∑')
    cy.get('.formula-inline-editor__input').should('not.contain', 'sum')
    cy.get('.formula-inline-editor__subsup-stack').should('be.visible')
    cy.get('.formula-inline-editor__subsup-sup .formula-inline-editor__field')
      .should('have.text', 'n')
    cy.get('.formula-inline-editor__subsup-sub .formula-inline-editor__field')
      .should('have.text', 'i=1')
  })

  /** 验证复杂公式点击编辑时仍保持根式和分式结构，不回退到 LaTeX 字符串输入。 */
  it('edits a complex formula with visual fraction and sqrt fields', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'inline-bsa-formula',
            type: 'latex',
            value: 'BSA=\\sqrt{\\frac{H\\times W}{3600}}',
            formula: {
              id: 'inline-bsa-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'BSA=\\sqrt{\\frac{H\\times W}{3600}}',
              ast: {
                type: 'root',
                children: [{ type: 'text', value: 'BSA=\\sqrt{\\frac{H\\times W}{3600}}' }]
              }
            }
          },
          { value: '体格检查：' }
        ]
      })
      editor.command.executeSetRange(0, 0)
      const draw = (editor as any).draw
      const position = draw
        .getCoordinate()
        .getMainPositionList()
        .find((item: any) => item.index === 0)
      const pageWrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[position.pageNo] as HTMLDivElement
      const rect = pageWrapper.getBoundingClientRect()
      const clientX = rect.left + position.coordinate.leftTop[0] + 4
      const clientY = rect.top + position.coordinate.leftTop[1] + 4
      cy.get('.ce-page-container')
        .trigger('mousedown', { clientX, clientY, button: 0 })
        .trigger('mouseup', { clientX, clientY, button: 0 })
        .trigger('click', { clientX, clientY, button: 0 })
    })

    cy.get('.formula-inline-editor__sqrt').should('be.visible')
    cy.get('.formula-inline-editor__fraction').should('be.visible')
    cy.get('.formula-inline-editor__input').should('not.contain', '\\sqrt')
    cy.get('.formula-inline-editor__fraction-denominator .formula-inline-editor__field')
      .clear()
      .type('4000')
    cy.get('body').click(5, 5)

    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command
        .getValue()
        .data.main.find((element: any) => element.id === 'inline-bsa-formula')
      expect(formulaElement.value).to.eq('BSA=\\sqrt{\\frac{H\\times W}{4000}}')
    })
  })

  /** 验证根式内上标编辑态会预留顶部空间，避免上标压到根号横线。 */
  it('keeps superscript below the sqrt overline while editing', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'inline-sqrt-sup-formula',
            type: 'latex',
            value: 'x=\\sqrt{b^{2}-4ac}',
            formula: {
              id: 'inline-sqrt-sup-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'x=\\sqrt{b^{2}-4ac}',
              ast: {
                type: 'root',
                children: [{ type: 'text', value: 'x=\\sqrt{b^{2}-4ac}' }]
              }
            }
          }
        ]
      })
      editor.command.executeSetRange(0, 0)
      const draw = (editor as any).draw
      const position = draw
        .getCoordinate()
        .getMainPositionList()
        .find((item: any) => item.index === 0)
      const pageWrapper = draw
        .getPageCanvasHost()
        .getPageWrapperList()[position.pageNo] as HTMLDivElement
      const rect = pageWrapper.getBoundingClientRect()
      const clientX = rect.left + position.coordinate.leftTop[0] + 4
      const clientY = rect.top + position.coordinate.leftTop[1] + 4
      cy.get('.ce-page-container')
        .trigger('mousedown', { clientX, clientY, button: 0 })
        .trigger('mouseup', { clientX, clientY, button: 0 })
        .trigger('click', { clientX, clientY, button: 0 })
    })

    cy.get('.formula-inline-editor__sqrt-radicand').then($radicand => {
      const radicandRect = $radicand[0].getBoundingClientRect()
      cy.get(
        '.formula-inline-editor__sqrt-radicand .formula-inline-editor__script-sup'
      ).then($sup => {
        const supRect = $sup[0].getBoundingClientRect()
        expect(supRect.top).to.be.greaterThan(radicandRect.top + 1)
      })
    })
  })

  /** 验证公式文本控件拥有稳定行内宽度，后续普通文字不会压到公式绘制区域。 */
  it('reserves inline width before following text after formula insertion', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'inline-quadratic-formula',
            type: 'latex',
            value: 'x=\\sqrt{b^{2}}',
            formula: {
              id: 'inline-quadratic-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'x=\\sqrt{b^{2}}',
              ast: {
                type: 'root',
                children: [{ type: 'text', value: 'x=\\sqrt{b^{2}}' }]
              }
            }
          },
          { value: '后续文字' }
        ]
      })
      const positionList = (editor as any).draw
        .getCoordinate()
        .getMainPositionList()
      const resolver = (editor as any).draw.getObjectResolver()
      const formulaPosition = positionList.find((item: any) => {
        const element = resolver.getLayoutMainElement(item.index)
        return (
          element?.id === 'inline-quadratic-formula' ||
          element?.type === 'latex' ||
          element?.value === 'x=\\sqrt{b^{2}}'
        )
      })
      expect(formulaPosition).to.exist
      const textPosition = positionList
        .filter((item: any) => {
          return (
            item.index > formulaPosition.index &&
            item.coordinate.leftTop[1] === formulaPosition.coordinate.leftTop[1] &&
            item.coordinate.rightTop[0] > item.coordinate.leftTop[0]
          )
        })
        .sort((a: any, b: any) => a.coordinate.leftTop[0] - b.coordinate.leftTop[0])[0]
      expect(textPosition).to.exist
      expect(formulaPosition.coordinate.rightTop[0]).to.be.greaterThan(
        formulaPosition.coordinate.leftTop[0] + 20
      )
      expect(textPosition.coordinate.leftTop[0]).to.be.gte(
        formulaPosition.coordinate.rightTop[0]
      )
    })
  })

  /** 验证已有公式从短公式更新成长公式后，会重新计算行内宽度并推开后续文字。 */
  it('reflows following text after updating an existing formula to a wider formula', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'inline-updated-formula',
            type: 'latex',
            value: 'x',
            formula: {
              id: 'inline-updated-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'x',
              ast: {
                type: 'root',
                children: [{ type: 'text', value: 'x' }]
              }
            }
          },
          { value: '低吸症状；否则14天内接触过纳入隔离观察的' }
        ]
      })
      editor.command.executeUpdateElementById({
        id: 'inline-updated-formula',
        properties: {
          type: 'latex',
          value: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i',
          formula: {
            id: 'inline-updated-formula',
            displayMode: 'inline',
            sourceFormat: 'latex',
            latex: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i',
            ast: {
              type: 'root',
              children: [
                {
                  type: 'text',
                  value: '\\bar{x}=\\frac{1}{n}\\sum_{i=1}^{n}x_i'
                }
              ]
            }
          }
        }
      } as any)

      const draw = (editor as any).draw
      const positionList = draw.getCoordinate().getMainPositionList()
      const resolver = draw.getObjectResolver()
      const formulaPosition = positionList.find((item: any) => {
        return resolver.getLayoutMainElement(item.index)?.id === 'inline-updated-formula'
      })
      expect(formulaPosition).to.exist
      const followingTextPosition = positionList
        .filter((item: any) => {
          const element = resolver.getLayoutMainElement(item.index)
          return (
            item.index > formulaPosition.index &&
            element?.type !== 'latex' &&
            item.coordinate.rightTop[0] > item.coordinate.leftTop[0]
          )
        })
        .sort((a: any, b: any) => {
          return (
            a.coordinate.leftTop[1] - b.coordinate.leftTop[1] ||
            a.coordinate.leftTop[0] - b.coordinate.leftTop[0]
          )
        })[0]
      expect(followingTextPosition).to.exist
      expect(formulaPosition.coordinate.rightTop[0]).to.be.greaterThan(
        formulaPosition.coordinate.leftTop[0] + 70
      )
      const isHorizontalOverlap =
        followingTextPosition.coordinate.leftTop[0] <
          formulaPosition.coordinate.rightTop[0] &&
        followingTextPosition.coordinate.rightTop[0] >
          formulaPosition.coordinate.leftTop[0]
      const isVerticalOverlap =
        followingTextPosition.coordinate.leftTop[1] <
          formulaPosition.coordinate.leftBottom[1] &&
        followingTextPosition.coordinate.leftBottom[1] >
          formulaPosition.coordinate.leftTop[1]
      expect(isHorizontalOverlap && isVerticalOverlap).to.eq(false)
    })
  })

  /** 验证根式、分式、求和组合的复杂公式按普通文本行内占位，不压住后续正文。 */
  it('keeps sqrt fraction summation formulas as inline text without overlap', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: '否则14天内与以下场所工作人员密切接触' },
          {
            id: 'inline-complex-stat-formula',
            type: 'latex',
            value: '\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2}',
            formula: {
              id: 'inline-complex-stat-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: '\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2}',
              ast: {
                type: 'root',
                children: [
                  {
                    type: 'text',
                    value:
                      '\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2}'
                  }
                ]
              }
            }
          },
          { value: '触水、肉类批发市场、农贸市场、大型超市' }
        ]
      })
      const draw = (editor as any).draw
      const resolver = draw.getObjectResolver()
      const positionList = draw.getCoordinate().getMainPositionList()
      const formulaPosition = positionList.find((item: any) => {
        return resolver.getLayoutMainElement(item.index)?.id === 'inline-complex-stat-formula'
      })
      expect(formulaPosition).to.exist
      expect(formulaPosition.coordinate.rightTop[0]).to.be.greaterThan(
        formulaPosition.coordinate.leftTop[0] + 90
      )
      expect(formulaPosition.lineHeight).to.be.greaterThan(20)
      const followingTextPosition = positionList.find((item: any) => {
        const element = resolver.getLayoutMainElement(item.index)
        return (
          item.index > formulaPosition.index &&
          element?.type !== 'latex' &&
          item.coordinate.rightTop[0] > item.coordinate.leftTop[0]
        )
      })
      expect(followingTextPosition).to.exist
      const isHorizontalOverlap =
        followingTextPosition.coordinate.leftTop[0] <
          formulaPosition.coordinate.rightTop[0] &&
        followingTextPosition.coordinate.rightTop[0] >
          formulaPosition.coordinate.leftTop[0]
      const isVerticalOverlap =
        followingTextPosition.coordinate.leftTop[1] <
          formulaPosition.coordinate.leftBottom[1] &&
        followingTextPosition.coordinate.leftBottom[1] >
          formulaPosition.coordinate.leftTop[1]
      expect(isHorizontalOverlap && isVerticalOverlap).to.eq(false)
    })
  })

  /** 验证菜单/命令插入复杂公式后继续输入正文时，后续文字保持行内顺排且不压入公式。 */
  it('keeps typed text after an inserted complex formula inline without overlap', () => {
    const latex = '\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2}'
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: '否则14天内与以下场所工作人员密切接触' }]
      })
      editor.command.executeSetRange(0, 0)
      editor.command.executeInsertElementList([
        {
          id: 'typed-after-complex-formula',
          type: 'latex' as any,
          value: latex,
          formula: {
            id: 'typed-after-complex-formula',
            displayMode: 'inline',
            sourceFormat: 'latex',
            latex,
            ast: {
              type: 'root',
              children: [{ type: 'text', value: latex }]
            }
          }
        }
      ])
    })
    cy.wait(100)
    cy.getEditor().then((editor: Editor) => {
      editor.resetRenderBackendStats()
    })
    cy.get('.ce-inputarea').type('触水、肉类批发市场、农贸市场、大型超市', {
      force: true,
      delay: 0
    })
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const stats = (editor as any).getRenderBackendStats()
      const resolver = draw.getObjectResolver()
      const positionList = draw.getCoordinate().getMainPositionList()
      const formulaPosition = positionList.find((item: any) => {
        return resolver.getLayoutMainElement(item.index)?.id === 'typed-after-complex-formula'
      })
      expect(formulaPosition).to.exist
      const followingTextPosition = positionList.find((item: any) => {
        const element = resolver.getLayoutMainElement(item.index)
        return (
          item.index > formulaPosition.index &&
          element?.type !== 'latex' &&
          element?.value === '触'
        )
      })
      expect(followingTextPosition).to.exist
      expect(followingTextPosition.coordinate.leftTop[1]).to.eq(
        formulaPosition.coordinate.leftTop[1]
      )
      expect(followingTextPosition.coordinate.leftTop[0]).to.be.at.least(
        formulaPosition.coordinate.rightTop[0]
      )
      const isHorizontalOverlap =
        followingTextPosition.coordinate.leftTop[0] <
          formulaPosition.coordinate.rightTop[0] &&
        followingTextPosition.coordinate.rightTop[0] >
          formulaPosition.coordinate.leftTop[0]
      const isVerticalOverlap =
        followingTextPosition.coordinate.leftTop[1] <
          formulaPosition.coordinate.leftBottom[1] &&
        followingTextPosition.coordinate.leftBottom[1] >
          formulaPosition.coordinate.leftTop[1]
      expect(isHorizontalOverlap && isVerticalOverlap).to.eq(false)
      expect(
        stats.chunkLayout.patchSuccessCount +
          stats.typingLinePatch.patchSuccessCount,
        JSON.stringify({
          chunkLayout: stats.chunkLayout,
          typingLinePatch: stats.typingLinePatch,
          typingPreview: stats.typingPreview,
          layout: stats.layout
        })
      ).to.be.greaterThan(0)
    })
  })

  /** 验证非当前页 worker 快照也使用公式文本控件渲染，不再退化成旧图片路径。 */
  it('renders complex formula controls through the worker snapshot without fallback', () => {
    const latex = '\\sigma=\\sqrt{\\frac{1}{n}\\sum_{i=1}^{n}(x_i-\\mu)^2}'
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      const options = draw.getRuntime().getOptions()
      options.renderBackend.offscreenCanvas.enabled = true
      options.renderBackend.offscreenCanvas.nonCurrentPageBase = true
      editor.command.executeSetValue(
        {
          main: [
            { value: 'worker公式前置文本' },
            {
              id: 'worker-complex-formula',
              type: 'latex',
              value: latex,
              formula: {
                id: 'worker-complex-formula',
                displayMode: 'inline',
                sourceFormat: 'latex',
                latex,
                ast: {
                  type: 'root',
                  children: [{ type: 'text', value: latex }]
                }
              }
            },
            { value: 'worker公式后置文本\n' },
            ...Array.from({ length: 180 }, (_, index) => ({
              value: `worker公式分页填充-${index}\n`
            }))
          ]
        },
        { isSetCursor: true }
      )
    })
    cy.wait(500)
    cy.getEditor().then((editor: Editor) => {
      const draw = (editor as any).draw
      expect(draw.getPageRowList().length).to.be.greaterThan(1)
      draw.setPageNo(1)
      draw.getRange().setRange(-1, -1)
      draw.getCoordinate().setCursorPosition(null)
      draw.getPageCanvasHost().invalidateAllBitmapCache()
      draw.getServices().workerRenderScheduler.dispose()
      ;(editor as any).resetRenderBackendStats()
      draw.enqueueExtraVisibleRenderPages([0])
      draw.render({
        isCompute: false,
        isSubmitHistory: false,
        isSetCursor: false,
        isLazy: false,
        pageRenderScope: 'visible'
      })
    })
    cy.getEditor().then((editor: Editor) => {
      cy.wrap(null, { timeout: 10000 }).should(() => {
        const stats = (editor as any).getRenderBackendStats()
        expect(stats.workerRender.submitCount, '公式 worker 提交').to.be.greaterThan(0)
        expect(
          stats.workerRender.fallbackCount,
          `公式 worker fallback，最近原因：${stats.workerRender.lastFallbackReason}`
        ).to.eq(0)
        expect(stats.workerRender.successCount, '公式 worker 成功').to.be.greaterThan(0)
      })
    })
  })

  /** 验证公式作为可编辑对象存在，可通过公式菜单回填并更新原公式。 */
  it('opens the formula panel for an existing formula and updates it', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'editable-formula',
            type: 'latex',
            value: 'x^{2}',
            formula: {
              id: 'editable-formula',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: 'x^{2}',
              ast: {
                type: 'superscript',
                base: { type: 'text', value: 'x' },
                superscript: { type: 'text', value: '2' }
              }
            }
          } as any
        ]
      })
      const formulaElement = editor.command.getValue().data.main.find((element: any) => {
        return element.id === 'editable-formula'
      })
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

    cy.get('.formula-dialog__title').should('contain.text', '编辑公式')
    cy.get('.formula-dialog__textarea').should('have.value', 'x^{2}')
    cy.get('.formula-dialog__textarea').clear().type('y^{{}3{}}')
    cy.get('.formula-dialog__confirm').click()
    cy.getEditor().then((editor: Editor) => {
      const formulaElement = editor.command.getValue().data.main.find((element: any) => {
        return element.id === 'editable-formula'
      })
      expect(formulaElement.value).to.eq('y^{3}')
      expect(formulaElement.formula.ast.type).to.eq('superscript')
      expect(formulaElement.formula.ast.superscript.value).to.eq('3')
    })
  })
})
