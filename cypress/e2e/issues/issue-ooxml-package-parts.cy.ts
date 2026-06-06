import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { ListStyle, ListType } from '../../../src/editor/dataset/enum/List'
import { ControlComponent, ControlType } from '../../../src/editor/dataset/enum/Control'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import type Editor from '../../../src/editor'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'
import { VerticalAlign } from '../../../src/editor/dataset/enum/VerticalAlign'
import { TableBorder, TdBorder, TdSlash } from '../../../src/editor/dataset/enum/table/Table'
import { WatermarkType } from '../../../src/editor/dataset/enum/Watermark'
import {
  createOoxmlBodyContentXml,
  createOoxmlCorePropertiesXml,
  createOoxmlDocumentRelationshipsXml,
  createOoxmlDocumentXml,
  createOoxmlExtendedPropertiesXml,
  createOoxmlFooterXml,
  createOoxmlHeaderXml,
  createOoxmlPackageParts,
  createOoxmlParagraphModels,
  createOoxmlTable,
  escapeOoxmlText
} from '../../../src/editor/core/export/ooxml/OoxmlPackage'
import { createOoxmlSettingsXml } from '../../../src/editor/core/export/ooxml/OoxmlSettings'
import {
  createPrintSvgPageCssSize,
  createPrintSvgPageListFromDocument
} from '../../../src/editor/utils/print/svg/document'
import { parseOoxmlDocumentXmlToEditorData } from '../../../src/editor/core/export/ooxml/OoxmlDocumentImport'
import { createFormulaAstFromLatex } from '../../../src/editor/core/modules/formula/model/FormulaModel'

const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lwH8sgAAAABJRU5ErkJggg=='

describe('OOXML package parts mapping', () => {
  it('escapes XML text and splits paragraphs by ZERO marker', () => {
    expect(escapeOoxmlText('A&B<中>"')).to.eq('A&amp;B&lt;中&gt;&quot;')

    const paragraphList = createOoxmlParagraphModels([
      { value: `第一段${ZERO}`, rowFlex: RowFlex.CENTER },
      { value: `第二段${ZERO}` }
    ])

    expect(paragraphList).to.have.length(2)
    expect(paragraphList[0].elementList.map(element => element.value).join('')).to.eq('第一段')
    expect(paragraphList[0].styleElement?.rowFlex).to.eq(RowFlex.CENTER)
    expect(paragraphList[1].elementList.map(element => element.value).join('')).to.eq('第二段')
  })

  it('skips empty plain text placeholders to avoid extra header and body paragraphs', () => {
    const parts = createOoxmlPackageParts(
      {
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              { value: '' },
              { value: ZERO },
              { value: `页眉标题${ZERO}`, color: '#000000' }
            ]
          }
        ],
        main: [
          { value: '' },
          { value: ZERO },
          { value: `正文首段${ZERO}` }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const bodyParagraphList = parts['word/document.xml'].match(/<w:p>.*?<\/w:p>/g) || []
    const headerParagraphList = parts['word/header1.xml'].match(/<w:p>.*?<\/w:p>/g) || []

    expect(bodyParagraphList[0]).to.contain('<w:t>正文首段</w:t>')
    expect(headerParagraphList).to.have.length(1)
    expect(headerParagraphList[0]).to.contain('<w:t>页眉标题</w:t>')
    expect(parts['word/document.xml']).to.not.contain('<w:p></w:p>')
    expect(parts['word/header1.xml']).to.not.contain('<w:p></w:p>')
  })

  it('serializes explicit document styles into styles xml and references them from paragraphs', () => {
    const parts = createOoxmlPackageParts(
      {
        styles: [
          {
            id: 'QuoteStyle',
            name: '引用样式',
            type: 'paragraph',
            basedOn: 'Normal',
            next: 'Normal',
            paragraph: {
              rowFlex: RowFlex.CENTER,
              rowIndentLeft: 24,
              rowIndent: 12,
              spaceBefore: 6,
              spaceAfter: 8,
              lineSpacing: 24,
              lineSpacingType: 'exact',
              keepWithNext: true,
              tabStops: [{ position: 120, alignment: 'right' }]
            },
            text: {
              font: 'SimSun',
              size: 18,
              italic: true,
              color: '#666666',
              highlight: '#FFF2CC'
            }
          }
        ],
        main: [
          { value: `引用正文${ZERO}`, styleId: 'QuoteStyle' }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const stylesXml = parts['word/styles.xml']

    expect(stylesXml).to.contain('<w:style w:type="paragraph" w:styleId="QuoteStyle">')
    expect(stylesXml).to.contain('<w:name w:val="引用样式"/>')
    expect(stylesXml).to.contain('<w:basedOn w:val="Normal"/>')
    expect(stylesXml).to.contain('<w:next w:val="Normal"/>')
    expect(stylesXml).to.contain('<w:jc w:val="center"/>')
    expect(stylesXml).to.contain('<w:spacing w:before="90" w:after="120" w:line="360" w:lineRule="exact"/>')
    expect(stylesXml).to.contain('<w:ind w:left="360" w:firstLine="180"/>')
    expect(stylesXml).to.contain('<w:tab w:val="right" w:pos="1800"/>')
    expect(stylesXml).to.contain('<w:keepNext/>')
    expect(stylesXml).to.contain('<w:rFonts w:ascii="SimSun"')
    expect(stylesXml).to.contain('<w:sz w:val="27"/><w:szCs w:val="27"/>')
    expect(stylesXml).to.contain('<w:i/>')
    expect(stylesXml).to.contain('<w:color w:val="666666"/>')
    expect(stylesXml).to.contain('<w:shd w:val="clear" w:color="auto" w:fill="FFF2CC"/>')
    expect(parts['word/document.xml']).to.contain('<w:pStyle w:val="QuoteStyle"/>')
  })

  it('serializes document text styles spaces formulas and section properties', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: ' 标题 ',
            rowFlex: RowFlex.CENTER,
            font: 'Microsoft YaHei',
            size: 16,
            bold: true,
            color: '#336699',
            highlight: 'rgba(255, 238, 170, 0.4)'
          },
          { value: ZERO },
          {
            type: ElementType.LATEX,
            value: '\\frac{a}{b}',
            formula: {
              sourceFormat: 'latex',
              latex: '\\frac{a}{b}',
              ast: {
                type: 'fraction',
                numerator: { type: 'text', value: 'a' },
                denominator: { type: 'text', value: 'b' }
              }
            }
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<w:jc w:val="center"/>')
    expect(documentXml).to.contain('<w:rFonts w:ascii="Microsoft YaHei"')
    expect(documentXml).to.contain('<w:sz w:val="24"/>')
    expect(documentXml).to.contain('<w:b/>')
    expect(documentXml).to.contain('<w:color w:val="336699"/>')
    expect(documentXml).to.contain(
      '<w:shd w:val="clear" w:color="auto" w:fill="FFEEAA"/>'
    )
    expect(documentXml).to.contain('<w:t xml:space="preserve"> 标题 </w:t>')
    expect(documentXml).to.contain('<m:oMath')
    expect(documentXml).to.contain('<m:f><m:num><m:r><m:t>a</m:t></m:r></m:num>')
    expect(documentXml).to.contain('<w:sectPr><w:pgSz')
  })

  it('does not reparse legacy latex text formulas during OOXML export', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            type: ElementType.LATEX,
            value: '{E_k} = hv - {W_0}',
            formula: {
              sourceFormat: 'latex',
              latex: '{E_k} = hv - {W_0}',
              ast: {
                type: 'root',
                children: [
                  {
                    type: 'text',
                    value: '{E_k} = hv - {W_0}'
                  }
                ]
              }
            }
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<m:oMath')
    expect(documentXml).to.contain('<m:t>{E_k} = hv - {W_0}</m:t>')
    expect(documentXml).to.not.contain('<m:sSub>')
  })

  /** 验证重复和相邻不同公式导出时不会因导出缓存串用 OOXML。 */
  it('serializes repeated and adjacent formulas without cache pollution', () => {
    const repeatedFormula = {
      type: ElementType.LATEX,
      value: '\\frac{a}{b}',
      formula: {
        sourceFormat: 'latex',
        latex: '\\frac{a}{b}',
        ast: createFormulaAstFromLatex('\\frac{a}{b}')
      }
    }
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          repeatedFormula,
          { value: '+' },
          repeatedFormula,
          { value: '+' },
          {
            type: ElementType.LATEX,
            value: 'x_{1}',
            formula: {
              sourceFormat: 'latex',
              latex: 'x_{1}',
              ast: createFormulaAstFromLatex('x_{1}')
            }
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml.match(/<m:oMath/g)).to.have.length(3)
    expect(documentXml.match(/<m:f>/g)).to.have.length(2)
    expect(documentXml).to.contain('<m:sSub>')
    expect(documentXml).to.contain('<m:t>x</m:t>')
    expect(documentXml).to.contain('<m:t>1</m:t>')
  })

  it('serializes separator elements as visible Word paragraph borders', () => {
    const parts = createOoxmlPackageParts(
      {
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              {
                type: ElementType.SEPARATOR,
                value: '\n',
                dashArray: [1, 1]
              }
            ]
          }
        ],
        main: [
          { value: `分隔线前${ZERO}` },
          {
            type: ElementType.SEPARATOR,
            value: '\n',
            dashArray: [7, 3, 3, 3],
            color: '#ff8800'
          },
          { value: `分隔线后${ZERO}` }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        separator: {
          lineWidth: 2,
          strokeStyle: '#336699'
        }
      }
    )

    expect(parts['word/document.xml']).to.contain('<w:pBdr><w:bottom')
    expect(parts['word/document.xml']).to.contain(
      '<w:bottom w:val="dotDash" w:sz="16" w:space="1" w:color="FF8800"/>'
    )
    expect(parts['word/document.xml']).to.contain('<w:t>分隔线前</w:t>')
    expect(parts['word/document.xml']).to.contain('<w:t>分隔线后</w:t>')
    expect(parts['word/document.xml']).to.not.contain('<w:t></w:t>')
    expect(parts['word/header1.xml']).to.contain(
      '<w:bottom w:val="dotted" w:sz="16" w:space="1" w:color="336699"/>'
    )
  })

  it('serializes document background as a document-level Word node', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [{ value: `背景色${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        background: {
          color: 'rgba(5, 16, 255, 0.2)'
        }
      }
    )

    expect(documentXml).to.contain('<w:background w:color="0510FF"/>')
    expect(documentXml).to.match(
      /<w:document [^>]+><w:background w:color="0510FF"\/><w:body>/
    )
    expect(documentXml).to.not.contain('<w:sectPr><w:background')
  })

  it('serializes built-in paragraph styles and creates styles part relations', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [
          { value: `一级标题${ZERO}`, level: TitleLevel.FIRST },
          { value: `自定义样式${ZERO}`, styleId: 'Custom-Report' }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(parts['word/document.xml']).to.contain('<w:pStyle w:val="Heading1"/>')
    expect(parts['word/document.xml']).to.contain('<w:pStyle w:val="Custom-Report"/>')
    expect(parts['word/styles.xml']).to.contain('w:styleId="Normal"')
    expect(parts['word/styles.xml']).to.contain('w:styleId="Heading1"')
    expect(parts['word/styles.xml']).to.not.contain('w:styleId="Custom-Report"')
    expect(parts['word/_rels/document.xml.rels']).to.contain('Target="styles.xml"')
    expect(parts['[Content_Types].xml']).to.contain('/word/styles.xml')
  })

  it('serializes default font and size into doc defaults and Normal style', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [{ value: `默认字体文本${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        defaultFont: 'SimSun',
        defaultSize: 14
      }
    )
    const stylesXml = parts['word/styles.xml']

    expect(stylesXml).to.contain(
      '<w:rFonts w:hint="eastAsia" w:ascii="SimSun" w:hAnsi="SimSun" w:eastAsia="SimSun" w:cs="SimSun"/>'
    )
    expect(stylesXml).to.contain('<w:sz w:val="21"/>')
    expect(stylesXml).to.contain('<w:szCs w:val="21"/>')
    expect(stylesXml).to.contain(
      '<w:lang w:val="zh-CN" w:eastAsia="zh-CN" w:bidi="zh-CN"/>'
    )
    expect(stylesXml).to.contain(
      '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
    )
    expect(stylesXml).to.contain('<w:style w:type="paragraph" w:styleId="Heading1">')
    expect(parts['word/fontTable.xml']).to.contain('<w:font w:name="SimSun">')
    expect(parts['word/fontTable.xml']).to.contain('<w:charset w:val="86"/>')
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'relationships/fontTable'
    )
    expect(parts['[Content_Types].xml']).to.contain('/word/fontTable.xml')
  })

  it('does not leak heading style from paragraph end marker to following plain text', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          { value: '普通文本' },
          {
            value: ZERO,
            level: TitleLevel.FIRST,
            titleId: 'stale-title'
          },
          {
            value: `后续普通文本${ZERO}`
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const paragraphXmlList = documentXml.match(/<w:p>.*?<\/w:p>/g) || []

    expect(paragraphXmlList).to.have.length(2)
    expect(paragraphXmlList[0]).to.contain('普通文本')
    expect(paragraphXmlList[0]).not.to.contain('<w:pStyle w:val="Heading1"/>')
    expect(paragraphXmlList[0]).not.to.contain('<w:bookmarkStart')
    expect(paragraphXmlList[1]).to.contain('后续普通文本')
    expect(paragraphXmlList[1]).not.to.contain('<w:pStyle')
  })

  it('keeps heading label and following plain text inline without exporting whole paragraph as heading', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: '其他记录：',
            level: TitleLevel.SECOND,
            titleId: 'other-record'
          },
          {
            value: `是否同意以上内容：{同意同意 否定}${ZERO}`
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const paragraphXmlList = documentXml.match(/<w:p>.*?<\/w:p>/g) || []

    expect(paragraphXmlList).to.have.length(1)
    expect(paragraphXmlList[0]).to.contain('其他记录')
    expect(paragraphXmlList[0]).to.contain('是否同意以上内容')
    expect(paragraphXmlList[0]).not.to.contain('<w:pStyle')
    expect(paragraphXmlList[0]).not.to.contain('<w:bookmarkStart')
  })

  it('serializes advanced font properties and soft line breaks', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: `字体高级\n软换行${ZERO}`,
            letterSpacing: 2,
            textScale: 80,
            textPosition: 4,
            textOutline: {
              hollow: true
            },
            textShadow: {
              color: '#999999',
              offsetX: 1,
              offsetY: 1
            },
            textCombine: true
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<w:spacing w:val="30"/>')
    expect(documentXml).to.contain('<w:w w:val="80"/>')
    expect(documentXml).to.contain('<w:position w:val="6"/>')
    expect(documentXml).to.contain('<w:outline/>')
    expect(documentXml).to.contain('<w:shadow/>')
    expect(documentXml).to.contain('<w:eastAsianLayout w:combine="1"/>')
    expect(documentXml).to.contain('<w:t>字体高级</w:t><w:br/><w:t>软换行</w:t>')
  })

  it('serializes settings part and mirror margins option', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [{ value: `镜像页边距${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        mirrorMargins: true
      }
    )

    expect(createOoxmlSettingsXml({ mirrorMargins: true })).to.contain(
      '<w:mirrorMargins/>'
    )
    expect(parts['word/settings.xml']).to.contain('<w:mirrorMargins/>')
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'relationships/settings'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="settings.xml"'
    )
    expect(parts['[Content_Types].xml']).to.contain('/word/settings.xml')
  })

  it('serializes paragraph spacing indentation pagination and tabs', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: `高级段落${ZERO}`,
            rowIndentLeft: 24,
            rowIndentRight: 16,
            rowIndent: 12,
            spaceBefore: 8,
            spaceAfter: 10,
            lineSpacingType: 'exact',
            lineSpacing: 30,
            pageBreakBefore: true,
            keepWithNext: true,
            keepLines: true,
            widowControl: true,
            tabStops: [
              { position: 120, alignment: 'right' },
              { position: 80, alignment: 'bar' }
            ]
          },
          {
            value: `悬挂段落${ZERO}`,
            rowHangingIndent: 32
          },
          {
            value: `倍数行距${ZERO}`,
            lineSpacingType: 'multiple',
            lineSpacing: 2
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain(
      '<w:tabs><w:tab w:val="bar" w:pos="1200"/><w:tab w:val="right" w:pos="1800"/></w:tabs>'
    )
    expect(documentXml).to.contain(
      '<w:spacing w:before="120" w:after="150" w:line="450" w:lineRule="exact"/>'
    )
    expect(documentXml).to.contain(
      '<w:ind w:left="360" w:right="240" w:firstLine="180"/>'
    )
    expect(documentXml).to.contain('<w:pageBreakBefore/>')
    expect(documentXml).to.contain('<w:keepNext/>')
    expect(documentXml).to.contain('<w:keepLines/>')
    expect(documentXml).to.contain('<w:widowControl/>')
    expect(documentXml).to.contain('<w:ind w:left="480" w:hanging="480"/>')
    expect(documentXml).to.contain('<w:spacing w:line="480" w:lineRule="auto"/>')
  })

  it('serializes list numbering properties and numbering part relations', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [
          {
            value: `有序列表${ZERO}`,
            listId: 'ordered-list',
            listType: ListType.OL,
            listStyle: ListStyle.DECIMAL,
            listLevel: 1
          },
          {
            value: `复选框列表${ZERO}`,
            listId: 'checkbox-list',
            listType: ListType.UL,
            listStyle: ListStyle.CHECKBOX,
            listLevel: 0
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(parts['word/document.xml']).to.contain('<w:numPr><w:ilvl w:val="1"/>')
    expect(parts['word/document.xml']).to.contain('<w:numPr><w:ilvl w:val="0"/>')
    expect(parts['word/numbering.xml']).to.contain('<w:numFmt w:val="decimal"/>')
    expect(parts['word/numbering.xml']).to.contain('<w:numFmt w:val="bullet"/>')
    expect(parts['word/numbering.xml']).to.contain('<w:lvlText w:val="☑"/>')
    expect(parts['word/_rels/document.xml.rels']).to.contain('Target="numbering.xml"')
    expect(parts['[Content_Types].xml']).to.contain('/word/numbering.xml')
  })

  it('does not leak list numbering from paragraph end marker to adjacent headings', () => {
    const paragraphList = createOoxmlParagraphModels([
      { value: '门诊诊断：', bold: true },
      {
        value: ZERO,
        listId: 'diagnosis-list',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: `高血压${ZERO}`,
        listId: 'diagnosis-list',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: `糖尿病${ZERO}`,
        listId: 'diagnosis-list',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      { value: '处置治疗：', bold: true },
      {
        value: ZERO,
        listId: 'diagnosis-list',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      },
      {
        value: `治疗项${ZERO}`,
        listId: 'treatment-list',
        listType: ListType.OL,
        listStyle: ListStyle.DECIMAL
      }
    ])
    const documentXml = createOoxmlDocumentXml(
      {
        main: paragraphList.flatMap(paragraph => [
          ...paragraph.elementList,
          paragraph.styleElement?.value === ZERO
            ? paragraph.styleElement
            : { value: ZERO }
        ])
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(paragraphList[0].styleElement?.listId).to.eq(undefined)
    expect(paragraphList[1].styleElement?.listId).to.eq('diagnosis-list')
    expect(paragraphList[2].styleElement?.listId).to.eq('diagnosis-list')
    expect(paragraphList[3].styleElement?.listId).to.eq(undefined)
    expect(paragraphList[4].styleElement?.listId).to.eq('treatment-list')
    expect(documentXml.split('<w:numPr>')).to.have.length(4)
  })

  it('splits implicit paragraph boundary between list items and adjacent headings', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          { value: '门诊诊断：', bold: true },
          {
            value: `高血压${ZERO}`,
            listId: 'diagnosis-list',
            listType: ListType.OL,
            listStyle: ListStyle.DECIMAL
          },
          {
            value: '过敏性鼻炎',
            listId: 'diagnosis-list',
            listType: ListType.OL,
            listStyle: ListStyle.DECIMAL
          },
          { value: `处置治疗：${ZERO}`, bold: true },
          {
            value: `治疗项${ZERO}`,
            listId: 'treatment-list',
            listType: ListType.OL,
            listStyle: ListStyle.DECIMAL
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const paragraphXmlList = documentXml.match(/<w:p>.*?<\/w:p>/g) || []

    expect(paragraphXmlList).to.have.length(5)
    expect(paragraphXmlList[0]).to.contain('门诊诊断')
    expect(paragraphXmlList[0]).not.to.contain('<w:numPr>')
    expect(paragraphXmlList[1]).to.contain('高血压')
    expect(paragraphXmlList[1]).to.contain('<w:numPr>')
    expect(paragraphXmlList[2]).to.contain('过敏性鼻炎')
    expect(paragraphXmlList[2]).to.contain('<w:numPr>')
    expect(paragraphXmlList[3]).to.contain('处置治疗')
    expect(paragraphXmlList[3]).not.to.contain('<w:numPr>')
    expect(paragraphXmlList[4]).to.contain('治疗项')
    expect(paragraphXmlList[4]).to.contain('<w:numPr>')
  })

  it('serializes inline images as media parts and drawing relationships', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [
          {
            id: 'image-one',
            type: ElementType.IMAGE,
            value: TINY_PNG,
            width: 20,
            height: 10
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const mediaPath = Object.keys(parts).find(path =>
      path.startsWith('word/media/')
    )

    expect(mediaPath).to.not.eq(undefined)
    expect(parts[mediaPath!]).to.be.instanceOf(Uint8Array)
    expect(parts['word/document.xml']).to.contain('<w:drawing>')
    expect(parts['word/document.xml']).to.contain('r:embed="rIdImage')
    expect(parts['word/document.xml']).to.contain('cx="190500"')
    expect(parts['word/document.xml']).to.contain('cy="95250"')
    expect(parts['word/_rels/document.xml.rels']).to.contain('relationships/image')
    expect(parts['word/_rels/document.xml.rels']).to.contain('Target="media/')
    expect(parts['[Content_Types].xml']).to.contain('ContentType="image/png"')
  })

  it('serializes floating images as DrawingML anchors', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [
          {
            id: 'float-image-one',
            type: ElementType.IMAGE,
            value: TINY_PNG,
            width: 20,
            height: 10,
            imgDisplay: ImageDisplay.SURROUND,
            imgFloatPosition: {
              x: 12,
              y: 34,
              pageNo: 0
            }
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const documentXml = parts['word/document.xml'] as string

    expect(documentXml).to.contain('<wp:anchor')
    expect(documentXml).to.contain('<wp:positionH relativeFrom="page">')
    expect(documentXml).to.contain('<wp:positionV relativeFrom="page">')
    expect(documentXml).to.contain('<wp:posOffset>114300</wp:posOffset>')
    expect(documentXml).to.contain('<wp:posOffset>323850</wp:posOffset>')
    expect(documentXml).to.contain('<wp:wrapSquare wrapText="bothSides"/>')
    expect(documentXml).to.contain('r:embed="rIdImage')
  })

  it('does not decode malformed image data URLs when only creating relationships', () => {
    const relationshipsXml = createOoxmlDocumentRelationshipsXml([
      {
        id: 'malformed-image',
        type: ElementType.IMAGE,
        value: 'data:image/png;base64,%%%',
        width: 20,
        height: 10
      }
    ])

    expect(relationshipsXml).to.contain('relationships/image')
    expect(relationshipsXml).to.contain('Target="media/rIdImage')
  })

  /** 验证相同 data URL 的多图片导出复用解码字节，同时保留各自关系 id。 */
  it('reuses decoded media bytes for repeated image data URLs', () => {
    const parts = createOoxmlPackageParts(
      {
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              {
                id: 'header-logo',
                type: ElementType.IMAGE,
                value: TINY_PNG,
                width: 8,
                height: 8
              },
              { value: ZERO }
            ]
          }
        ],
        main: [
          {
            id: 'main-logo',
            type: ElementType.IMAGE,
            value: TINY_PNG,
            width: 8,
            height: 8
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const mediaPaths = Object.keys(parts).filter(path =>
      path.startsWith('word/media/')
    )

    expect(mediaPaths).to.have.length(2)
    expect(parts[mediaPaths[0]]).to.eq(parts[mediaPaths[1]])
    expect(parts['word/_rels/header1.xml.rels']).to.contain('rIdImage')
    expect(parts['word/_rels/document.xml.rels']).to.contain('rIdImage')
  })

  it('serializes external hyperlinks as relationships', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [
          {
            id: 'link-one',
            type: ElementType.HYPERLINK,
            value: `打开链接${ZERO}`,
            url: 'https://example.com/report?a=1&b=2',
            underline: true,
            color: '#0563C1'
          }
        ],
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              {
                id: 'header-link',
                type: ElementType.HYPERLINK,
                value: `页眉链接${ZERO}`,
                url: 'https://example.com/header'
              }
            ]
          }
        ],
        footerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              {
                id: 'footer-link',
                type: ElementType.HYPERLINK,
                value: `页脚链接${ZERO}`,
                url: 'https://example.com/footer'
              }
            ]
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(parts['word/document.xml']).to.contain('<w:hyperlink r:id="rIdHyperlink')
    expect(parts['word/document.xml']).to.contain('<w:t>打开链接</w:t>')
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'relationships/hyperlink'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="https://example.com/report?a=1&amp;b=2"'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'TargetMode="External"'
    )
    expect(parts['word/_rels/header1.xml.rels']).to.contain(
      'Target="https://example.com/header"'
    )
    expect(parts['word/_rels/footer1.xml.rels']).to.contain(
      'Target="https://example.com/footer"'
    )
  })

  it('serializes editor controls as plain Word text', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'patient-name-control',
            externalId: 'patient.name',
            control: {
              type: ControlType.TEXT,
              value: [{ value: '张三' }],
              conceptId: 'patientName',
              placeholder: '请输入姓名',
              preText: '姓名：'
            }
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<w:r><w:t>姓名：张三</w:t></w:r>')
    expect(documentXml).to.not.contain('<w:sdt')
    expect(documentXml).to.not.contain('patient-name-control')
  })

  it('serializes expanded controls without brackets', () => {
    const commonControl = {
      type: ControlType.TEXT,
      value: null,
      placeholder: '内容。',
      preText: '其他：'
    }
    const filledControl = {
      type: ControlType.TEXT,
      value: [{ value: '已填写' }],
      placeholder: '填写内容'
    }
    const checkboxControl = {
      type: ControlType.CHECKBOX,
      value: null,
      code: 'infectious',
      placeholder: '请选择既往史',
      valueSets: [
        { code: 'infectious', value: '传染性疾病' },
        { code: 'diabetes', value: '糖尿病' }
      ]
    }
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            type: ElementType.CONTROL,
            value: '{',
            controlId: 'empty-control',
            control: commonControl,
            controlComponent: ControlComponent.PREFIX
          },
          {
            type: ElementType.CONTROL,
            value: '其他：',
            controlId: 'empty-control',
            control: commonControl,
            controlComponent: ControlComponent.PRE_TEXT,
            color: '#000000'
          },
          {
            type: ElementType.CONTROL,
            value: '内容。',
            controlId: 'empty-control',
            control: commonControl,
            controlComponent: ControlComponent.PLACEHOLDER,
            color: '#9c9b9b'
          },
          {
            type: ElementType.CONTROL,
            value: '}',
            controlId: 'empty-control',
            control: commonControl,
            controlComponent: ControlComponent.POSTFIX
          },
          { value: '，' },
          {
            type: ElementType.CONTROL,
            value: '{',
            controlId: 'filled-control',
            control: filledControl,
            controlComponent: ControlComponent.PREFIX
          },
          {
            type: ElementType.TEXT,
            value: '已填写',
            controlId: 'filled-control',
            control: filledControl,
            controlComponent: ControlComponent.VALUE
          },
          {
            type: ElementType.CONTROL,
            value: '}',
            controlId: 'filled-control',
            control: filledControl,
            controlComponent: ControlComponent.POSTFIX
          },
          { value: '，' },
          {
            type: ElementType.CONTROL,
            value: '{',
            controlId: 'checkbox-control',
            control: checkboxControl,
            controlComponent: ControlComponent.PREFIX
          },
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'checkbox-control',
            control: checkboxControl,
            controlComponent: ControlComponent.CHECKBOX
          },
          {
            type: ElementType.TEXT,
            value: '传染性疾病',
            controlId: 'checkbox-control',
            control: checkboxControl,
            controlComponent: ControlComponent.VALUE
          },
          {
            type: ElementType.TEXT,
            value: '糖尿病',
            controlId: 'checkbox-control',
            control: checkboxControl,
            controlComponent: ControlComponent.VALUE
          },
          {
            type: ElementType.CONTROL,
            value: '}',
            controlId: 'checkbox-control',
            control: checkboxControl,
            controlComponent: ControlComponent.POSTFIX
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<w:t>其他：</w:t>')
    expect(documentXml).to.contain('<w:t>内容。</w:t>')
    expect(documentXml).to.contain(
      '<w:rPr><w:color w:val="9C9B9B"/></w:rPr><w:t>内容。</w:t>'
    )
    expect(documentXml).to.not.contain(
      '<w:rPr><w:color w:val="9C9B9B"/></w:rPr><w:t>其他：</w:t>'
    )
    expect(documentXml).to.contain('<w:t>已填写</w:t>')
    expect(documentXml).to.contain('<w:t>传染性疾病</w:t>')
    expect(documentXml).to.not.contain('<w:t>糖尿病</w:t>')
    expect(documentXml).to.not.contain('<w:t>{</w:t>')
    expect(documentXml).to.not.contain('<w:t>}</w:t>')
    expect(documentXml).to.not.contain('<w:sdt')

    const createPosition = (
      value: string,
      x: number,
      component?: ControlComponent,
      color?: string
    ) =>
      ({
        pageNo: 0,
        index: x,
        value,
        element: {
          value,
          controlId: component ? 'svg-control' : undefined,
          control: component ? commonControl : undefined,
          controlComponent: component,
          color
        },
        rowIndex: 0,
        rowNo: 0,
        ascent: 16,
        lineHeight: 24,
        left: x,
        metrics: { width: 10 },
        isFirstLetter: x === 0,
        isLastLetter: false,
        coordinate: {
          leftTop: [x, 20],
          leftBottom: [x, 44],
          rightTop: [x + 10, 20],
          rightBottom: [x + 10, 44]
        }
      }) as any
    const [printSvg] = createPrintSvgPageListFromDocument({
      mainPositionList: [
        createPosition('{', 0, ControlComponent.PREFIX),
        createPosition('其他：', 10, ControlComponent.PRE_TEXT),
        createPosition('内容。', 20, ControlComponent.PLACEHOLDER, '#000000'),
        createPosition('}', 30, ControlComponent.POSTFIX)
      ],
      width: 794,
      height: 1123,
      direction: PaperDirection.VERTICAL
    })
    expect(printSvg).to.contain('其他：')
    expect(printSvg).to.contain('内容。')
    expect(printSvg).to.contain('<text x="10"')
    expect(printSvg).to.contain('fill="#9c9b9b"')
    expect(printSvg).to.not.contain('{')
    expect(printSvg).to.not.contain('}')
  })

  it('serializes select controls as their display text only', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            type: ElementType.CONTROL,
            value: '',
            controlId: 'patient-city-control',
            externalId: 'patient.city',
            control: {
              type: ControlType.SELECT,
              value: null,
              code: 'gz',
              conceptId: 'patientCity',
              required: true,
              valueSets: [
                { code: 'gz', value: '广州' },
                { code: 'sz', value: '深圳' }
              ]
            }
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<w:t>广州</w:t>')
    expect(documentXml).to.not.contain('<w:sdt')
    expect(documentXml).to.not.contain('<w:dropDownList>')
    expect(documentXml).to.not.contain('patient-city-control')
    expect(documentXml).to.not.contain('<w:listItem')
  })

  it('creates print SVG page CSS size for standard and custom paper', () => {
    expect(
      createPrintSvgPageCssSize({
        width: 794,
        height: 1123,
        direction: PaperDirection.VERTICAL
      })
    ).to.eq('a4 portrait')
    expect(
      createPrintSvgPageCssSize({
        width: 900,
        height: 1200,
        direction: PaperDirection.VERTICAL
      })
    ).to.eq('900px 1200px')
    expect(
      createPrintSvgPageCssSize({
        width: 900,
        height: 1200,
        direction: PaperDirection.HORIZONTAL
      })
    ).to.eq('1200px 900px')
  })

  it('creates SVG print pages with table frame header footer watermark page number and images', () => {
    const createPosition = (
      value: string,
      x: number,
      y: number,
      element: any = { value }
    ) =>
      ({
        pageNo: 0,
        index: x,
        value,
        element,
        rowIndex: 0,
        rowNo: 0,
        ascent: 16,
        lineHeight: 24,
        left: x,
        metrics: { width: element.width || 10, height: element.height || 16 },
        isFirstLetter: false,
        isLastLetter: false,
        coordinate: {
          leftTop: [x, y],
          leftBottom: [x, y + 24],
          rightTop: [x + (element.width || 10), y],
          rightBottom: [x + (element.width || 10), y + 24]
        }
      }) as any
    const cellTextPosition = createPosition('单元格', 106, 126)
    const tableFragment = {
      tableId: 'fragment-table',
      logicalTableId: 'logical-table',
      logicalTableIndex: 0,
      fragmentOrder: 0,
      colgroup: [{ width: 120 }],
      width: 120,
      height: 48,
      borderType: TableBorder.DASH,
      borderColor: '#123456',
      borderWidth: 2,
      trList: [
        {
          height: 48,
          tdList: [
            {
              id: 'td-1',
              x: 0,
              y: 0,
              width: 120,
              height: 48,
              colspan: 1,
              rowspan: 1,
              value: [],
              backgroundColor: '#ffeeaa',
              borderTypes: [TdBorder.TOP, TdBorder.RIGHT],
              slashTypes: [TdSlash.BACK],
              positionList: [cellTextPosition]
            }
          ]
        }
      ]
    } as any
    const tableElement = {
      type: ElementType.TABLE,
      value: '',
      width: 120,
      height: 48
    }
    const tablePosition = createPosition('', 100, 120, tableElement)
    tablePosition.tableFragment = tableFragment
    const separatorPosition = createPosition('', 40, 210, {
      type: ElementType.SEPARATOR,
      value: '\n',
      width: 80,
      color: '#abcdef',
      dashArray: [2, 2]
    })
    const checkboxPosition = createPosition('', 40, 240, {
      type: ElementType.CHECKBOX,
      value: '',
      checkbox: { value: true },
      width: 16,
      height: 12
    })
    checkboxPosition.metrics = { width: 16, height: 12 }
    const radioPosition = createPosition('', 70, 240, {
      type: ElementType.RADIO,
      value: '',
      radio: { value: true },
      width: 16,
      height: 12
    })
    radioPosition.metrics = { width: 16, height: 12 }
    const decoratedTextPosition = createPosition('装饰', 100, 240, {
      value: '装饰',
      underline: true,
      textDecoration: { style: 'dashed' },
      controlId: 'decorated-control',
      control: { border: true },
      groupIds: ['group-a']
    })
    decoratedTextPosition.metrics = { width: 32, height: 16 }
    const listMarkerPosition = createPosition(ZERO, 40, 270, {
      value: ZERO,
      listType: ListType.UL,
      listStyle: ListStyle.DISC,
      listLevel: 0
    })
    const subscriptPosition = createPosition('2', 120, 300, {
      type: ElementType.SUBSCRIPT,
      value: '2',
      size: 16,
      actualSize: 10
    })
    subscriptPosition.metrics = { width: 6, height: 10 }
    const formulaPosition = createPosition('{E_k} = hv - {W_0}', 150, 300, {
      type: ElementType.LATEX,
      value: '{E_k} = hv - {W_0}',
      formula: {
        sourceFormat: 'latex',
        latex: '{E_k} = hv - {W_0}'
      },
      size: 16
    })
    formulaPosition.metrics = { width: 100, height: 20 }
    const imagePosition = createPosition('', 240, 120, {
      type: ElementType.IMAGE,
      value: TINY_PNG,
      width: 12,
      height: 12
    })
    const headerTextPosition = createPosition('页眉', 40, 30)
    const headerSeparatorPosition = createPosition('', 40, 60, {
      type: ElementType.SEPARATOR,
      value: '\n',
      width: 320,
      color: '#445566'
    })
    const [printSvg] = createPrintSvgPageListFromDocument({
      width: 400,
      height: 600,
      mainPositionList: [
        tablePosition,
        separatorPosition,
        checkboxPosition,
        radioPosition,
        decoratedTextPosition,
        listMarkerPosition,
        subscriptPosition,
        formulaPosition,
        imagePosition
      ],
      pageRowList: [
        [
          {
            width: 120,
            height: 48,
            ascent: 16,
            startIndex: 0,
            rowIndex: 0,
            elementList: [tableElement],
            tableFragment
          } as any,
          {
            width: 160,
            height: 28,
            ascent: 16,
            startIndex: 1,
            rowIndex: 1,
            elementList: [
              { ...separatorPosition.element, metrics: separatorPosition.metrics },
              { ...checkboxPosition.element, metrics: checkboxPosition.metrics },
              { ...radioPosition.element, metrics: radioPosition.metrics },
              {
                ...decoratedTextPosition.element,
                metrics: decoratedTextPosition.metrics
              }
            ]
          } as any,
          {
            width: 40,
            height: 24,
            ascent: 16,
            startIndex: 5,
            rowIndex: 2,
            isList: true,
            elementList: [
              {
                ...listMarkerPosition.element,
                metrics: listMarkerPosition.metrics
              }
            ]
          } as any,
          {
            width: 18,
            height: 24,
            ascent: 16,
            startIndex: 6,
            rowIndex: 3,
            elementList: [
              {
                ...subscriptPosition.element,
                metrics: subscriptPosition.metrics
              },
              {
                ...formulaPosition.element,
                metrics: formulaPosition.metrics
              },
              {
                ...imagePosition.element,
                metrics: imagePosition.metrics
              }
            ]
          } as any
        ]
      ],
      headerRowListByPage: [
        [
          {
            width: 40,
            height: 24,
            ascent: 16,
            startIndex: 0,
            rowIndex: 0,
            elementList: [{ ...headerTextPosition.element, metrics: headerTextPosition.metrics }]
          } as any,
          {
            width: 320,
            height: 8,
            ascent: 0,
            startIndex: 1,
            rowIndex: 1,
            elementList: [
              {
                ...headerSeparatorPosition.element,
                metrics: headerSeparatorPosition.metrics
              }
            ]
          } as any
        ]
      ],
      headerPositionListByPage: [[headerTextPosition, headerSeparatorPosition]],
      footerPositionListByPage: [[createPosition('页脚', 40, 540)]],
      badgeListByPage: [[{ x: 300, y: 300, width: 20, height: 20, value: TINY_PNG }]],
      editorOptions: {
        scale: 1,
        margins: [40, 40, 40, 40],
        table: { defaultBorderColor: '#000000' },
        defaultTabWidth: 32,
        defaultFont: 'Microsoft YaHei',
        defaultSize: 16,
        defaultColor: '#000000',
        underlineColor: '#000000',
        strikeoutColor: '#000000',
        separator: { lineWidth: 2, strokeStyle: '#333333' },
        checkbox: {
          gap: 0,
          lineWidth: 1,
          fillStyle: '#111111',
          strokeStyle: '#ffffff'
        },
        radio: {
          gap: 0,
          lineWidth: 1,
          fillStyle: '#222222',
          strokeStyle: '#333333'
        },
        control: {
          borderColor: '#ff00aa',
          borderWidth: 1
        },
        group: {
          backgroundColor: '#ddeeff',
          opacity: 0.5,
          activeBackgroundColor: '#ddeeff',
          activeOpacity: 0.5
        },
        background: { color: '#ffffff', applyPageNumbers: [] },
        pageNumber: {
          disabled: false,
          fromPageNo: 0,
          startPageNo: 1,
          format: '{pageNo} / {pageCount}',
          numberType: 'arabic',
          rowFlex: RowFlex.CENTER,
          size: 12,
          font: 'Microsoft YaHei',
          color: '#111111',
          bottom: 30
        },
        watermark: {
          data: '内部',
          type: WatermarkType.TEXT,
          repeat: false,
          opacity: 0.2,
          size: 40,
          font: 'Microsoft YaHei',
          color: '#999999',
          gap: [80, 80]
        },
        pageBorder: {
          disabled: false,
          color: '#111111',
          lineWidth: 1,
          padding: [4, 4, 4, 4],
          style: 'solid'
        }
      } as any,
      pageMetricList: [
        {
          margins: [40, 40, 40, 40],
          innerWidth: 320,
          headerExtraHeight: 10,
          footerExtraHeight: 10
        }
      ],
      pageCount: 1
    })

    expect(printSvg).to.contain('页眉')
    expect(printSvg).to.contain('页脚')
    expect(printSvg).to.contain('内部')
    expect(printSvg).to.contain('1 / 1')
    expect(printSvg).to.contain('单元格')
    expect(printSvg).to.contain('#ffeeaa')
    expect(printSvg).to.contain('stroke="#123456"')
    expect(printSvg).to.contain('stroke-dasharray="3 3"')
    expect(printSvg).to.contain('stroke="#abcdef"')
    expect(printSvg).to.contain('stroke="#445566"')
    expect(printSvg).to.contain('stroke="#ff00aa"')
    expect(printSvg).to.contain('#ddeeff')
    expect(printSvg).to.contain('装饰')
    expect(printSvg).to.contain('stroke-dasharray="3 1"')
    expect(printSvg).to.contain('•')
    expect(printSvg).to.contain('font-size="10"')
    expect(printSvg).to.contain('y="321"')
    expect(printSvg).to.contain('Eₖ = hv - W₀')
    expect(printSvg).to.not.contain('{E_k}')
    expect(printSvg).to.contain('<image')
    expect(printSvg).to.contain('stroke="#111111"')
  })

  it('serializes date checkbox radio as plain text and title bookmarks', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: `章节标题${ZERO}`,
            level: TitleLevel.SECOND,
            titleId: 'chapter-1'
          },
          {
            type: ElementType.DATE,
            value: '',
            dateId: 'report-date',
            dateFormat: 'yyyy-MM-dd',
            valueList: [{ value: '2026-06-02' }]
          },
          {
            type: ElementType.CHECKBOX,
            value: '',
            checkbox: {
              value: true,
              code: 'agree'
            }
          },
          {
            type: ElementType.RADIO,
            value: '',
            radio: {
              value: false,
              code: 'male'
            }
          },
          { value: ZERO }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<w:pStyle w:val="Heading2"/>')
    expect(documentXml).to.contain('<w:bookmarkStart')
    expect(documentXml).to.contain('w:name="ce_title_')
    expect(documentXml).to.contain('<w:bookmarkEnd')
    expect(documentXml).to.contain('<w:t>2026-06-02</w:t>')
    expect(documentXml).to.contain('<w:t>☑</w:t>')
    expect(documentXml).to.contain('<w:t>○</w:t>')
    expect(documentXml).to.not.contain('<w:sdt')
    expect(documentXml).to.not.contain('<w:dateFormat')
    expect(documentXml).to.not.contain('dateId=report-date')
    expect(documentXml).to.not.contain('type=checkbox')
    expect(documentXml).to.not.contain('type=radio')
  })

  it('serializes track changes as Word insertion and deletion runs', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: '新增',
            trackChange: {
              id: 'rev-insert-1',
              type: 'insert',
              author: '测试用户',
              timestamp: Date.UTC(2026, 5, 2, 8, 0, 0)
            }
          },
          {
            value: `删除${ZERO}`,
            trackChange: {
              id: 'rev-delete-1',
              type: 'delete',
              author: '测试用户',
              timestamp: Date.UTC(2026, 5, 2, 9, 0, 0)
            }
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(documentXml).to.contain('<w:ins ')
    expect(documentXml).to.contain('<w:del ')
    expect(documentXml).to.contain('w:author="测试用户"')
    expect(documentXml).to.contain('w:date="2026-06-02T08:00:00.000Z"')
    expect(documentXml).to.contain('w:date="2026-06-02T09:00:00.000Z"')
    expect(documentXml).to.contain('<w:t>新增</w:t>')
    expect(documentXml).to.contain('<w:t>删除</w:t>')
  })

  it('round trips package part track changes through document XML import', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [
          {
            value: '新增',
            trackChange: {
              id: 'rev-insert-1',
              type: 'insert',
              author: '测试用户',
              timestamp: Date.UTC(2026, 5, 2, 8, 0, 0)
            }
          },
          {
            value: `删除${ZERO}`,
            trackChange: {
              id: 'rev-delete-1',
              type: 'delete',
              author: '测试用户',
              timestamp: Date.UTC(2026, 5, 2, 9, 0, 0)
            }
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    const imported = parseOoxmlDocumentXmlToEditorData(parts['word/document.xml'])
    const [inserted, deleted] = imported.data.main

    expect(inserted.value).to.eq('新增')
    expect(inserted.trackChange).to.deep.include({
      type: 'insert',
      author: '测试用户',
      timestamp: Date.UTC(2026, 5, 2, 8, 0, 0)
    })
    expect(inserted.trackChange?.id).to.match(/^\d+$/)
    expect(deleted.value).to.eq(`删除${ZERO}`)
    expect(deleted.trackChange).to.deep.include({
      type: 'delete',
      author: '测试用户',
      timestamp: Date.UTC(2026, 5, 2, 9, 0, 0)
    })
    expect(deleted.trackChange?.id).to.match(/^\d+$/)
  })

  it('serializes default header and footer parts with document references', () => {
    const parts = createOoxmlPackageParts(
      {
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [{ value: `页眉内容${ZERO}`, bold: true }]
          }
        ],
        main: [{ value: `正文内容${ZERO}` }],
        footerPageScopes: [
          {
            pageScope: 'all',
            elementList: [{ value: `页脚内容${ZERO}`, italic: true }]
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(createOoxmlHeaderXml([{ value: `页眉${ZERO}` }])).to.contain('<w:hdr')
    expect(createOoxmlFooterXml([{ value: `页脚${ZERO}` }])).to.contain('<w:ftr')
    expect(parts['word/document.xml']).to.contain(
      '<w:headerReference w:type="default" r:id="rIdHeader1"/>'
    )
    expect(parts['word/document.xml']).to.contain(
      '<w:footerReference w:type="default" r:id="rIdFooter1"/>'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain('relationships/header')
    expect(parts['word/_rels/document.xml.rels']).to.contain('Target="header1.xml"')
    expect(parts['word/_rels/document.xml.rels']).to.contain('relationships/footer')
    expect(parts['word/_rels/document.xml.rels']).to.contain('Target="footer1.xml"')
    expect(parts['[Content_Types].xml']).to.contain('/word/header1.xml')
    expect(parts['[Content_Types].xml']).to.contain('/word/footer1.xml')
    expect(parts['word/header1.xml']).to.contain('<w:t>页眉内容</w:t>')
    expect(parts['word/header1.xml']).to.contain('<w:b/>')
    expect(parts['word/footer1.xml']).to.contain('<w:t>页脚内容</w:t>')
    expect(parts['word/footer1.xml']).to.contain('<w:i/>')
  })

  it('serializes scoped header and footer parts as default first and even references', () => {
    const parts = createOoxmlPackageParts(
      {
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [{ value: `默认页眉${ZERO}` }]
          },
          {
            pageScope: 'first',
            elementList: [{ value: `首页页眉${ZERO}`, bold: true }]
          },
          {
            pageScope: 'even',
            elementList: [{ value: `偶数页眉${ZERO}`, italic: true }]
          }
        ],
        main: [{ value: `正文内容${ZERO}` }],
        footerPageScopes: [
          {
            pageScope: 'all',
            elementList: [{ value: `默认页脚${ZERO}`, underline: true }]
          },
          {
            pageScope: 'first',
            elementList: [{ value: `首页页脚${ZERO}` }]
          },
          {
            pageScope: 'even',
            elementList: [{ value: `偶数页脚${ZERO}` }]
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(parts['word/document.xml']).to.contain(
      '<w:headerReference w:type="default" r:id="rIdHeader1"/>'
    )
    expect(parts['word/document.xml']).to.contain(
      '<w:headerReference w:type="first" r:id="rIdHeader2"/>'
    )
    expect(parts['word/document.xml']).to.contain(
      '<w:headerReference w:type="even" r:id="rIdHeader3"/>'
    )
    expect(parts['word/document.xml']).to.contain(
      '<w:footerReference w:type="default" r:id="rIdFooter1"/>'
    )
    expect(parts['word/document.xml']).to.contain(
      '<w:footerReference w:type="first" r:id="rIdFooter2"/>'
    )
    expect(parts['word/document.xml']).to.contain(
      '<w:footerReference w:type="even" r:id="rIdFooter3"/>'
    )

    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Id="rIdHeader1"'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="header1.xml"'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="header2.xml"'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="header3.xml"'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="footer1.xml"'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="footer2.xml"'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'Target="footer3.xml"'
    )

    expect(parts['[Content_Types].xml']).to.contain('/word/header3.xml')
    expect(parts['[Content_Types].xml']).to.contain('/word/footer3.xml')
    expect(parts['word/header1.xml']).to.contain('<w:t>默认页眉</w:t>')
    expect(parts['word/header2.xml']).to.contain('<w:t>首页页眉</w:t>')
    expect(parts['word/header2.xml']).to.contain('<w:b/>')
    expect(parts['word/header3.xml']).to.contain('<w:t>偶数页眉</w:t>')
    expect(parts['word/header3.xml']).to.contain('<w:i/>')
    expect(parts['word/footer1.xml']).to.contain('<w:t>默认页脚</w:t>')
    expect(parts['word/footer1.xml']).to.contain('<w:u w:val="single"/>')
    expect(parts['word/footer2.xml']).to.contain('<w:t>首页页脚</w:t>')
    expect(parts['word/footer3.xml']).to.contain('<w:t>偶数页脚</w:t>')
  })

  it('serializes text watermark as Word header VML shape', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [{ value: `正文水印${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        watermark: {
          data: '内部草稿&A',
          type: WatermarkType.TEXT,
          color: '#AEB5C0',
          opacity: 0.18,
          size: 120,
          font: 'Microsoft YaHei',
          repeat: true
        }
      }
    )

    expect(parts['word/document.xml']).to.contain(
      '<w:headerReference w:type="default" r:id="rIdHeader1"/>'
    )
    expect(parts['word/_rels/document.xml.rels']).to.contain(
      'relationships/header'
    )
    expect(parts['[Content_Types].xml']).to.contain('/word/header1.xml')
    expect(parts['word/header1.xml']).to.contain('<w:pict>')
    expect(parts['word/header1.xml']).to.contain('<v:shape')
    expect(parts['word/header1.xml']).to.contain('rotation:315')
    expect(parts['word/header1.xml']).to.contain(
      '<w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/>'
    )
    expect(parts['word/header1.xml']).to.contain('<w:vanish/>')
    expect(parts['word/header1.xml']).to.contain('fillcolor="#AEB5C0"')
    expect(parts['word/header1.xml']).to.contain('<v:fill opacity="18%"/>')
    expect(parts['word/header1.xml']).to.contain(
      'style="position:absolute;left:7pt;top:365pt;width:583pt;height:113pt;rotation:315;z-index:-251654144'
    )
    expect(parts['word/header1.xml']).to.contain('<w10:wrap type="none"/>')
    expect(parts['word/header1.xml']).to.contain('<v:textpath fitshape="f"')
    expect(parts['word/header1.xml']).to.contain('font-size:87pt')
    expect(parts['word/header1.xml']).to.contain('string="内部草稿&amp;A"')
  })

  it('keeps existing header paragraph before the hidden watermark paragraph', () => {
    const parts = createOoxmlPackageParts(
      {
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              {
                value: `第一人民医院${ZERO}`,
                bold: true,
                color: '#000000'
              }
            ]
          }
        ],
        main: [{ value: `正文${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        watermark: {
          data: 'COPY',
          type: WatermarkType.TEXT,
          color: '#AEB5C0',
          opacity: 0.18,
          size: 120,
          font: 'Microsoft YaHei'
        }
      }
    )
    const headerParagraphList = parts['word/header1.xml'].match(/<w:p>.*?<\/w:p>/g) || []

    expect(headerParagraphList).to.have.length(2)
    expect(headerParagraphList[0]).to.contain('<w:t>第一人民医院</w:t>')
    expect(headerParagraphList[0]).to.contain('<w:color w:val="000000"/>')
    expect(headerParagraphList[0]).not.to.contain('<w:pict>')
    expect(headerParagraphList[1]).to.contain('<w:pict>')
    expect(headerParagraphList[1]).to.contain('<w:vanish/>')
  })

  it('does not serialize image watermark in the first OOXML watermark batch', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [{ value: `正文${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        watermark: {
          data: TINY_PNG,
          type: WatermarkType.IMAGE,
          width: 120,
          height: 80
        }
      }
    )

    expect(parts['word/document.xml']).to.not.contain('rIdHeader1')
    expect(parts['word/header1.xml']).to.eq(undefined)
    expect(parts['[Content_Types].xml']).to.not.contain('/word/header1.xml')
  })

  it('uses explicit header styles and collects numbering definitions from footer', () => {
    const parts = createOoxmlPackageParts(
      {
        styles: [
          {
            id: 'HeaderCustomStyle',
            name: '页眉样式',
            paragraph: {
              rowFlex: RowFlex.CENTER
            }
          }
        ],
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              { value: `页眉样式${ZERO}`, styleId: 'HeaderCustomStyle' }
            ]
          }
        ],
        main: [{ value: `正文${ZERO}` }],
        footerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              {
                value: `页脚列表${ZERO}`,
                listId: 'footer-list',
                listType: ListType.OL,
                listStyle: ListStyle.DECIMAL
              }
            ]
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(parts['word/styles.xml']).to.contain(
      'w:styleId="HeaderCustomStyle"'
    )
    expect(parts['word/header1.xml']).to.contain(
      '<w:pStyle w:val="HeaderCustomStyle"/>'
    )
    expect(parts['word/numbering.xml']).to.contain('<w:numFmt w:val="decimal"/>')
    expect(parts['word/footer1.xml']).to.contain('<w:numPr>')
  })

  it('creates the first DOCX package part set without zip dependency', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [{ value: `正文${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.HORIZONTAL,
        margins: [100, 120, 100, 120]
      }
    )

    expect(Object.keys(parts).sort()).to.deep.eq([
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/app.xml',
      'docProps/core.xml',
      'word/_rels/document.xml.rels',
      'word/document.xml',
      'word/fontTable.xml',
      'word/numbering.xml',
      'word/settings.xml',
      'word/styles.xml'
    ])
    expect(parts['[Content_Types].xml']).to.contain('/word/document.xml')
    expect(parts['[Content_Types].xml']).to.contain('/docProps/core.xml')
    expect(parts['[Content_Types].xml']).to.contain('/docProps/app.xml')
    expect(parts['_rels/.rels']).to.contain('officeDocument')
    expect(parts['_rels/.rels']).to.contain('core-properties')
    expect(parts['_rels/.rels']).to.contain('extended-properties')
    expect(parts['docProps/core.xml']).to.contain('<dc:creator>canvas-editor</dc:creator>')
    expect(parts['docProps/app.xml']).to.contain('<Application>canvas-editor</Application>')
    expect(parts['word/document.xml']).to.contain('w:orient="landscape"')
    expect(parts['word/_rels/document.xml.rels']).to.contain('<Relationships')
  })

  it('serializes standard DOCX document property parts', () => {
    expect(createOoxmlCorePropertiesXml()).to.contain('<cp:coreProperties')
    expect(createOoxmlCorePropertiesXml()).to.contain(
      '<cp:lastModifiedBy>canvas-editor</cp:lastModifiedBy>'
    )
    expect(createOoxmlExtendedPropertiesXml()).to.contain('<Properties')
    expect(createOoxmlExtendedPropertiesXml()).to.contain(
      '<AppVersion>1.0</AppVersion>'
    )
  })

  it('serializes basic tables as block-level WordprocessingML', () => {
    const tableElement = {
      type: ElementType.TABLE,
      value: '',
      colgroup: [{ width: 120 }, { width: 160 }],
      trList: [
        {
          height: 32,
          repeatOnPageStart: true,
          tdList: [
            {
              colspan: 2,
              rowspan: 1,
              colIndex: 0,
              value: [{ value: `合并表头${ZERO}`, bold: true }]
            }
          ]
        },
        {
          height: 40,
          tdList: [
            {
              colspan: 1,
              rowspan: 2,
              colIndex: 0,
              value: [{ value: `左侧${ZERO}` }]
            },
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 1,
              value: [{ value: `右侧${ZERO}` }]
            }
          ]
        }
      ]
    }

    const tableXml = createOoxmlTable(tableElement)
    expect(tableXml).to.contain('<w:tblW w:w="4200" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:tblLayout w:type="fixed"/>')
    expect(tableXml).to.contain('<w:tblCellMar>')
    expect(tableXml).to.contain('<w:top w:w="0" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:left w:w="75" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:bottom w:w="75" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:right w:w="75" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="2400"/></w:tblGrid>')
    expect(tableXml).to.contain('<w:cantSplit w:val="0"/>')
    expect(tableXml).to.contain('<w:tblHeader/>')
    expect(tableXml).to.contain('<w:trHeight w:val="480" w:hRule="atLeast"/>')
    expect(tableXml).to.contain('<w:gridSpan w:val="2"/>')
    expect(tableXml).to.contain('<w:vMerge w:val="restart"/>')
    expect(tableXml).to.contain('<w:t>合并表头</w:t>')

    const bodyXml = createOoxmlBodyContentXml([
      { value: `表格前${ZERO}` },
      tableElement,
      { value: `表格后${ZERO}` }
    ])
    expect(bodyXml).to.match(/<w:p>.*表格前.*<\/w:p><w:tbl>/)
    expect(bodyXml).to.match(/<\/w:tbl><w:p>.*表格后.*<\/w:p>/)
  })

  it('serializes table width without requiring colgroup', () => {
    const tableXml = createOoxmlTable({
      type: ElementType.TABLE,
      value: '',
      width: 260,
      trList: [
        {
          height: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 0,
              width: 120,
              value: [{ value: `单元格${ZERO}` }]
            }
          ]
        }
      ]
    })

    expect(tableXml).to.contain('<w:tblW w:w="3900" w:type="dxa"/>')
    expect(tableXml).not.to.contain('<w:tblGrid>')
  })

  it('serializes table cell margins from editor table options', () => {
    const tableElement = {
      type: ElementType.TABLE,
      value: '',
      colgroup: [{ width: 100 }],
      trList: [
        {
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 0,
              value: [{ value: `内边距${ZERO}` }]
            }
          ]
        }
      ]
    }

    const tableXml = createOoxmlTable(tableElement, {
      table: {
        tdPadding: [2, 4, 6, 8]
      }
    })
    const bodyXml = createOoxmlBodyContentXml([tableElement], {
      table: {
        tdPadding: [2, 4, 6, 8]
      }
    })

    expect(tableXml).to.contain('<w:top w:w="30" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:left w:w="120" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:bottom w:w="90" w:type="dxa"/>')
    expect(tableXml).to.contain('<w:right w:w="60" w:type="dxa"/>')
    expect(bodyXml).to.contain('<w:left w:w="120" w:type="dxa"/>')
  })

  it('serializes vertical merge continuation cells for rowspans', () => {
    const tableXml = createOoxmlTable({
      type: ElementType.TABLE,
      value: '',
      colgroup: [{ width: 120 }, { width: 160 }],
      trList: [
        {
          height: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 2,
              colIndex: 0,
              value: [{ value: `左跨行${ZERO}` }]
            },
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 1,
              value: [{ value: `右上${ZERO}` }]
            }
          ]
        },
        {
          height: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 1,
              value: [{ value: `右下${ZERO}` }]
            }
          ]
        }
      ]
    })

    expect(tableXml).to.contain('<w:vMerge w:val="restart"/>')
    expect(tableXml).to.contain('<w:vMerge/>')
    expect(tableXml).to.contain('<w:t>左跨行</w:t>')
    expect(tableXml).to.contain('<w:t>右下</w:t>')
  })

  it('serializes table row minHeight instead of expanded runtime height', () => {
    const tableXml = createOoxmlTable({
      type: ElementType.TABLE,
      value: '',
      colgroup: [{ width: 120 }],
      trList: [
        {
          height: 180,
          minHeight: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 0,
              value: [{ value: `跨页长内容${ZERO}` }]
            }
          ]
        }
      ]
    })

    expect(tableXml).to.contain('<w:trHeight w:val="480" w:hRule="atLeast"/>')
    expect(tableXml).to.not.contain('<w:trHeight w:val="2700"')
  })

  it('serializes table and cell borders to WordprocessingML', () => {
    const tableElement = {
      type: ElementType.TABLE,
      value: '',
      tableStyleId: 'ReportGrid',
      borderType: TableBorder.DASH,
      borderColor: '#1864ab',
      borderWidth: 2,
      colgroup: [{ width: 100 }, { width: 100 }],
      trList: [
        {
          height: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 0,
              borderTypes: [TdBorder.TOP, TdBorder.LEFT],
              slashTypes: [TdSlash.FORWARD, TdSlash.BACK],
              borderColor: '#ff0000',
              borderWidth: 4,
              value: [{ value: `左${ZERO}` }]
            },
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 1,
              value: [{ value: `右${ZERO}` }]
            }
          ]
        }
      ]
    }

    const tableXml = createOoxmlTable(tableElement)
    expect(tableXml).to.contain('<w:tblStyle w:val="ReportGrid"/>')
    expect(tableXml).to.contain('<w:tblBorders>')
    expect(tableXml).to.contain('<w:top w:val="dashed" w:sz="16" w:color="1864AB"')
    expect(tableXml).to.contain('<w:insideH w:val="dashed" w:sz="16" w:color="1864AB"')
    expect(tableXml).to.contain('<w:tcBorders>')
    expect(tableXml).to.contain('<w:top w:val="dashed" w:sz="32" w:color="FF0000"')
    expect(tableXml).to.contain('<w:left w:val="dashed" w:sz="32" w:color="FF0000"')
    expect(tableXml).to.contain('<w:tr2bl w:val="dashed" w:sz="32" w:color="FF0000"')
    expect(tableXml).to.contain('<w:tl2br w:val="dashed" w:sz="32" w:color="FF0000"')
  })

  it('serializes default table borders and direct cell border formatting', () => {
    const tableXml = createOoxmlTable({
      type: ElementType.TABLE,
      value: '',
      borderColor: '#1971c2',
      borderWidth: 3,
      colgroup: [{ width: 100 }],
      trList: [
        {
          height: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 0,
              borderColor: '#f08c00',
              borderWidth: 4,
              value: [{ value: `边框${ZERO}` }]
            }
          ]
        }
      ]
    })

    expect(tableXml).to.contain('<w:tblBorders>')
    expect(tableXml).to.contain('<w:top w:val="single" w:sz="24" w:color="1971C2"')
    expect(tableXml).to.contain('<w:insideV w:val="single" w:sz="24" w:color="1971C2"')
    expect(tableXml).to.contain('<w:tcBorders>')
    expect(tableXml).to.contain('<w:top w:val="single" w:sz="32" w:color="F08C00"')
    expect(tableXml).to.contain('<w:left w:val="single" w:sz="32" w:color="F08C00"')
    expect(tableXml).to.contain('<w:bottom w:val="single" w:sz="32" w:color="F08C00"')
    expect(tableXml).to.contain('<w:right w:val="single" w:sz="32" w:color="F08C00"')
  })

  it('serializes external table border width separately', () => {
    const tableXml = createOoxmlTable({
      type: ElementType.TABLE,
      value: '',
      borderType: TableBorder.EXTERNAL,
      borderColor: '#1864ab',
      borderWidth: 2,
      borderExternalWidth: 5,
      colgroup: [{ width: 100 }],
      trList: [
        {
          height: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 0,
              value: [{ value: `外框${ZERO}` }]
            }
          ]
        }
      ]
    })

    expect(tableXml).to.contain('<w:top w:val="single" w:sz="40" w:color="1864AB"')
    expect(tableXml).to.contain('<w:left w:val="single" w:sz="40" w:color="1864AB"')
    expect(tableXml).to.contain('<w:bottom w:val="single" w:sz="40" w:color="1864AB"')
    expect(tableXml).to.contain('<w:right w:val="single" w:sz="40" w:color="1864AB"')
    expect(tableXml).to.contain('<w:insideH w:val="nil"/>')
    expect(tableXml).to.contain('<w:insideV w:val="nil"/>')
  })

  it('serializes table cell shading vertical alignment and text direction', () => {
    const tableElement = {
      type: ElementType.TABLE,
      value: '',
      colgroup: [{ width: 100 }, { width: 100 }],
      trList: [
        {
          height: 32,
          tdList: [
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 0,
              backgroundColor: '#f3f4f6',
              verticalAlign: VerticalAlign.MIDDLE,
              textDirection: 'vertical' as const,
              value: [{ value: `竖排${ZERO}` }]
            },
            {
              colspan: 1,
              rowspan: 1,
              colIndex: 1,
              backgroundColor: 'rgba(5, 16, 255, 0.2)',
              verticalAlign: VerticalAlign.BOTTOM,
              value: [{ value: `底部${ZERO}` }]
            }
          ]
        }
      ]
    }

    const tableXml = createOoxmlTable(tableElement)
    expect(tableXml).to.contain(
      '<w:shd w:val="clear" w:color="auto" w:fill="F3F4F6"/>'
    )
    expect(tableXml).to.contain('<w:vAlign w:val="center"/>')
    expect(tableXml).to.contain('<w:textDirection w:val="tbRl"/>')
    expect(tableXml).to.contain(
      '<w:shd w:val="clear" w:color="auto" w:fill="0510FF"/>'
    )
    expect(tableXml).to.contain('<w:vAlign w:val="bottom"/>')
  })

  it('exposes OOXML package parts from the editor command API', () => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          { value: `命令导出${ZERO}`, bold: true },
          {
            type: ElementType.TABLE,
            value: '',
            colgroup: [{ width: 120 }],
            trList: [
              {
                height: 32,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    colIndex: 0,
                    value: [{ value: `单元格${ZERO}` }]
                  }
                ]
              }
            ]
          }
        ]
      })

      const parts = editor.command.getOoxmlPackageParts()
      expect(parts['word/document.xml']).to.match(/命.*令.*导.*出/)
      expect(parts['word/document.xml']).to.contain('<w:b/>')
      expect(parts['word/document.xml']).to.contain('<w:tbl>')
      expect(parts['[Content_Types].xml']).to.contain('document.main+xml')
    })
  })

  it('exposes document style commands and keeps styles for OOXML export', () => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: `样式命令${ZERO}` }]
      })
      editor.command.executeSetDocumentStyles([
        {
          id: 'BodyQuote',
          name: '正文引用',
          paragraph: {
            rowFlex: RowFlex.RIGHT,
            spaceAfter: 10
          },
          text: {
            bold: true,
            color: '#225588'
          }
        }
      ])

      expect(editor.command.getDocumentStyles()).to.have.length(1)
      editor.command.executeSetRange(0, 0)
      editor.command.executeApplyDocumentStyle('BodyQuote')

      const value = editor.command.getValue()
      expect(value.data.styles?.[0].id).to.eq('BodyQuote')
      expect(value.data.main[0].styleId).to.eq('BodyQuote')
      expect(value.data.main[0].styleName).to.eq('正文引用')

      const parts = editor.command.getOoxmlPackageParts()
      expect(parts['word/styles.xml']).to.contain('w:styleId="BodyQuote"')
      expect(parts['word/styles.xml']).to.contain('<w:b/>')
      expect(parts['word/document.xml']).to.contain('<w:pStyle w:val="BodyQuote"/>')
    })
  })

})
