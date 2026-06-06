import { ElementType } from '../../../src/editor/dataset/enum/Element'

/** 覆盖 TS-01 结构化公式模型和专业符号库的第一批 API。 */
describe('typesetting formula structured model', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 验证 LATEX 元素可携带结构化公式 AST，并可查询数学、物理、化学、医院和工厂符号库。 */
  it('preserves formula ast and exposes domain symbol library', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'formula-dose',
            type: ElementType.LATEX,
            value: '\\frac{mg}{kg}',
            width: 120,
            height: 40,
            formula: {
              id: 'formula-dose',
              displayMode: 'inline',
              sourceFormat: 'latex',
              latex: '\\frac{mg}{kg}',
              ast: {
                type: 'fraction',
                numerator: {
                  type: 'unit',
                  value: 'mg'
                },
                denominator: {
                  type: 'unit',
                  value: 'kg'
                }
              },
              domainTags: ['hospital'],
              symbolIds: ['hospital-dose']
            }
          }
        ]
      })

      const formula = editor.command.getFormulaById('formula-dose')
      expect(formula.ast.type).to.eq('fraction')
      expect(formula.mathML).to.contain('<mfrac>')
      expect(formula.ooxml).to.contain('<m:f>')
      expect(formula.domainTags).to.deep.eq(['hospital'])
      expect(editor.command.getValue().data.main[0].formula.ast.type).to.eq(
        'fraction'
      )

      const hospitalSymbols = editor.command.getFormulaSymbolList('hospital')
      const factorySymbols = editor.command.getFormulaSymbolList('factory')
      const mathSymbols = editor.command.getFormulaSymbolList('math')
      const physicsSymbols = editor.command.getFormulaSymbolList('physics')
      const chemistrySymbols = editor.command.getFormulaSymbolList('chemistry')
      const allSymbols = editor.command.getFormulaSymbolList()
      expect(hospitalSymbols.some((symbol: any) => symbol.id === 'hospital-dose'))
        .to.eq(true)
      expect(factorySymbols.some((symbol: any) => symbol.id === 'factory-tolerance'))
        .to.eq(true)
      expect(mathSymbols.some((symbol: any) => symbol.id === 'math-quadratic-formula'))
        .to.eq(true)
      expect(physicsSymbols.some((symbol: any) => symbol.id === 'physics-ohm-law'))
        .to.eq(true)
      expect(chemistrySymbols.some((symbol: any) => symbol.id === 'chemistry-ideal-gas'))
        .to.eq(true)
      expect(mathSymbols.length).to.be.gte(28)
      expect(physicsSymbols.length).to.be.gte(15)
      expect(chemistrySymbols.length).to.be.gte(16)
      expect(allSymbols.some((symbol: any) => symbol.domain === 'common')).to.eq(false)
      expect(hospitalSymbols.length).to.be.gte(18)
      expect(factorySymbols.length).to.be.gte(18)
      expect(new Set(mathSymbols.map((symbol: any) => symbol.category))).to.include(
        '大型运算'
      )
      expect(new Set(physicsSymbols.map((symbol: any) => symbol.category))).to.include(
        '电学'
      )
      expect(new Set(chemistrySymbols.map((symbol: any) => symbol.category))).to.include(
        '物质的量'
      )
      expect(new Set(hospitalSymbols.map((symbol: any) => symbol.category))).to.include(
        '生命体征'
      )
      expect(new Set(factorySymbols.map((symbol: any) => symbol.category))).to.include(
        '质量'
      )
    })
  })

  /** 验证裸 LATEX 元素不会再临时生成结构化模型，结构化公式必须显式写入 formula 字段。 */
  it('does not synthesize a formula model for a bare latex element', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'legacy-formula',
            type: ElementType.LATEX,
            value: 'x=1',
            width: 80,
            height: 30
          }
        ]
      })

      expect(editor.command.getFormulaById('legacy-formula')).to.eq(null)
    })
  })

  /** 验证根式、上下标和矩阵 AST 可以生成 MathML/OOXML 交换结构。 */
  it('serializes structured formula ast to MathML and OOXML fragments', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        main: [
          {
            id: 'formula-matrix',
            type: ElementType.LATEX,
            value: 'A_i^2',
            width: 120,
            height: 40,
            formula: {
              id: 'formula-matrix',
              displayMode: 'block',
              sourceFormat: 'latex',
              latex: 'A_i^2',
              ast: {
                type: 'matrix',
                rows: [
                  [
                    {
                      type: 'subsup',
                      base: { type: 'symbol', value: 'A' },
                      subscript: { type: 'text', value: 'i' },
                      superscript: { type: 'text', value: '2' }
                    }
                  ],
                  [
                    {
                      type: 'sqrt',
                      radicand: { type: 'text', value: 'x' }
                    }
                  ]
                ]
              }
            }
          }
        ]
      })

      const formula = editor.command.getFormulaById('formula-matrix')
      expect(formula.mathML).to.contain('<mtable>')
      expect(formula.mathML).to.contain('<msubsup>')
      expect(formula.mathML).to.contain('<msqrt>')
      expect(formula.ooxml).to.contain('<m:m>')
      expect(formula.ooxml).to.contain('<m:sSubSup>')
      expect(formula.ooxml).to.contain('<m:rad>')
    })
  })

  /** 验证外部 MathML 可以反向解析为内部 AST，并继续派生 LaTeX 和 OOXML。 */
  it('parses MathML into structured formula model and derived formats', () => {
    cy.getEditor().then((editor: any) => {
      const formula = editor.command.parseFormulaMathML(
        [
          '<math xmlns="http://www.w3.org/1998/Math/MathML">',
          '<mrow>',
          '<msub><mi>E</mi><mi>k</mi></msub>',
          '<mo>=</mo>',
          '<mfrac><mn>1</mn><mi>n</mi></mfrac>',
          '<mo>+</mo>',
          '<msqrt><msup><mi>x</mi><mn>2</mn></msup></msqrt>',
          '</mrow>',
          '</math>'
        ].join(''),
        'mathml-formula'
      )

      expect(formula.id).to.eq('mathml-formula')
      expect(formula.sourceFormat).to.eq('mathml')
      expect(formula.ast.type).to.eq('root')
      expect(formula.ast.children[0].type).to.eq('group')
      expect(formula.latex).to.contain('E_{k}')
      expect(formula.latex).to.contain('\\frac{1}{n}')
      expect(formula.latex).to.contain('\\sqrt{x^{2}}')
      expect(formula.displayText).to.contain('E')
      expect(formula.mathML).to.contain('<mfrac>')
      expect(formula.ooxml).to.contain('<m:f>')
      expect(formula.ooxml).to.contain('<m:sSub>')
      expect(formula.ooxml).to.contain('<m:rad>')
    })
  })

  /** 验证 MathML 矩阵可回导为内部 matrix 节点，避免表格公式退化成纯文本。 */
  it('parses MathML matrix rows into structured formula rows', () => {
    cy.getEditor().then((editor: any) => {
      const formula = editor.command.parseFormulaMathML(
        [
          '<math xmlns="http://www.w3.org/1998/Math/MathML">',
          '<mtable>',
          '<mtr><mtd><mi>a</mi></mtd><mtd><mi>b</mi></mtd></mtr>',
          '<mtr><mtd><mi>c</mi></mtd><mtd><mi>d</mi></mtd></mtr>',
          '</mtable>',
          '</math>'
        ].join('')
      )

      const matrix = formula.ast.children[0]
      expect(matrix.type).to.eq('matrix')
      expect(matrix.rows).to.have.length(2)
      expect(matrix.rows[0]).to.have.length(2)
      expect(formula.latex).to.contain('\\begin{matrix}')
      expect(formula.mathML).to.contain('<mtable>')
      expect(formula.ooxml).to.contain('<m:m>')
    })
  })
})
