import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import {
  createOoxmlDocxBytes,
  createOoxmlDocumentXml
} from '../../../src/editor/core/export/ooxml/OoxmlPackage'
import { createOoxmlZipPackage } from '../../../src/editor/core/export/ooxml/OoxmlZip'
import {
  extractOoxmlDocumentXml,
  importOoxmlDocxBytes,
  importOoxmlDocxBytesToEditorData,
  OOXML_DOCUMENT_XML_PART,
  parseOoxmlDocxParts,
  parseOoxmlDocxTextParts
} from '../../../src/editor/core/export/ooxml/OoxmlImport'
import {
  parseOoxmlDocumentXmlToEditorData,
  parseOoxmlHeaderFooterXmlToElementList
} from '../../../src/editor/core/export/ooxml/OoxmlDocumentImport'
import {
  getOoxmlRelationshipById,
  isOoxmlRelationshipType,
  OOXML_DOCUMENT_RELATIONSHIPS_PART,
  createOoxmlRelationshipsPartPath,
  resolveOoxmlDocumentRelationships
} from '../../../src/editor/core/export/ooxml/OoxmlImportRelationships'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { RowFlex } from '../../../src/editor/dataset/enum/Row'
import { TitleLevel } from '../../../src/editor/dataset/enum/Title'
import { ControlType } from '../../../src/editor/dataset/enum/Control'
import { VerticalAlign } from '../../../src/editor/dataset/enum/VerticalAlign'
import { TableBorder, TdBorder } from '../../../src/editor/dataset/enum/table/Table'
import { createOoxmlNumberingId } from '../../../src/editor/core/export/ooxml/OoxmlNumbering'

describe('OOXML DOCX import skeleton', () => {
  /** 验证当前无压缩 DOCX ZIP 可以被导入骨架解析回 package parts。 */
  it('parses uncompressed DOCX bytes into package parts and document XML', () => {
    const bytes = createOoxmlDocxBytes(
      {
        main: [{ value: `导入DOCX${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        mirrorMargins: true,
        gutterPosition: 'top'
      }
    )

    const parts = parseOoxmlDocxParts(bytes)
    const textParts = parseOoxmlDocxTextParts(bytes)
    const documentXml = extractOoxmlDocumentXml(bytes)
    const importedPackage = importOoxmlDocxBytes(bytes)

    expect(Object.keys(parts)).to.include.members([
      '[Content_Types].xml',
      '_rels/.rels',
      'docProps/app.xml',
      'docProps/core.xml',
      OOXML_DOCUMENT_XML_PART,
      'word/settings.xml',
      'word/styles.xml'
    ])
    expect(parts[OOXML_DOCUMENT_XML_PART]).to.be.instanceOf(Uint8Array)
    expect(textParts[OOXML_DOCUMENT_XML_PART]).to.eq(documentXml)
    expect(documentXml).to.contain('<w:document')
    expect(documentXml).to.contain('导入DOCX')
    expect(importedPackage.documentXml).to.eq(documentXml)
    expect(importedPackage.textParts[OOXML_DOCUMENT_XML_PART]).to.eq(documentXml)
  })

  /** 验证 ZIP 可解析但缺少主文档部件时，导入入口会抛出明确错误。 */
  it('reports missing document XML part from parsed DOCX package', () => {
    const bytes = createOoxmlZipPackage({
      '[Content_Types].xml':
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      '_rels/.rels':
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
    })

    expect(() => importOoxmlDocxBytes(bytes)).to.throw(
      'Missing OOXML word/document.xml part'
    )
  })

  /** 验证主文档 relationships 可以解析为后续 hyperlink/image 导入使用的 rId 映射。 */
  it('resolves document relationships by rId from text parts', () => {
    /** 构造包含外部超链接和包内图片的最小 document.xml.rels 文本部件。 */
    const textParts = {
      [OOXML_DOCUMENT_RELATIONSHIPS_PART]:
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdHyperlink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com?a=1&amp;b=2" TargetMode="External"/>' +
        '<Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/rIdImage1.png"/>' +
        '</Relationships>'
    }

    const relationships = resolveOoxmlDocumentRelationships(textParts)
    const hyperlinkRelationship = getOoxmlRelationshipById(
      relationships,
      'rIdHyperlink1'
    )
    const imageRelationship = getOoxmlRelationshipById(relationships, 'rIdImage1')

    expect(hyperlinkRelationship).to.deep.eq({
      id: 'rIdHyperlink1',
      type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink',
      target: 'https://example.com?a=1&b=2',
      targetMode: 'External'
    })
    expect(imageRelationship).to.deep.eq({
      id: 'rIdImage1',
      type: 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image',
      target: 'media/rIdImage1.png'
    })
    expect(isOoxmlRelationshipType(hyperlinkRelationship, 'hyperlink')).to.eq(true)
    expect(isOoxmlRelationshipType(imageRelationship, 'image')).to.eq(true)
    expect(resolveOoxmlDocumentRelationships({})).to.deep.eq({})
    expect(createOoxmlRelationshipsPartPath('word/header1.xml')).to.eq(
      'word/_rels/header1.xml.rels'
    )
  })

  /** 验证 word/document.xml 的最小正文结构可以转换为内部 main 元素。 */
  it('parses document XML paragraphs into editor main data', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p><w:r><w:t>第一段</w:t><w:tab/><w:t>尾部</w:t></w:r></w:p>',
      '<w:p><w:r><w:t>第二</w:t><w:br/><w:t>行</w:t><w:br w:type="page"/></w:r></w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.data.main).to.eq(imported.elementList)
    expect(imported.elementList).to.deep.eq([
      { value: '第一段' },
      { type: ElementType.TAB, value: '' },
      { value: `尾部${ZERO}` },
      { value: '第二' },
      { value: '\n' },
      { value: '行' },
      { type: ElementType.PAGE_BREAK, value: '' },
      { value: ZERO }
    ])
  })

  /** 验证 w:hyperlink 可以结合 document relationships 回导为内部超链接元素。 */
  it('imports hyperlink runs with URL from document relationships', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
      '<w:body>',
      '<w:p><w:r><w:t>前</w:t></w:r><w:hyperlink r:id="rIdHyperlink1"><w:r><w:t>链接</w:t></w:r></w:hyperlink><w:r><w:t>后</w:t></w:r></w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')
    const relationships = resolveOoxmlDocumentRelationships({
      [OOXML_DOCUMENT_RELATIONSHIPS_PART]:
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdHyperlink1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>' +
        '</Relationships>'
    })

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml, {
      relationships
    })

    expect(imported.elementList).to.deep.eq([
      { value: '前' },
      {
        type: ElementType.HYPERLINK,
        value: '链接',
        hyperlinkId: 'rIdHyperlink1',
        url: 'https://example.com'
      },
      { value: `后${ZERO}` }
    ])
  })

  /** 验证 DrawingML 内联图片可以结合 document relationships 回导为内部图片元素。 */
  it('imports inline drawing images with size and relationship target', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<w:body>',
      '<w:p><w:r><w:t>图前</w:t></w:r><w:r><w:drawing><wp:inline><wp:extent cx="952500" cy="476250"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImage1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r><w:r><w:t>图后</w:t></w:r></w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')
    const relationships = resolveOoxmlDocumentRelationships({
      [OOXML_DOCUMENT_RELATIONSHIPS_PART]:
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/rIdImage1.png"/>' +
        '</Relationships>'
    })

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml, {
      relationships
    })

    expect(imported.elementList).to.deep.eq([
      { value: '图前' },
      {
        type: ElementType.IMAGE,
        value: 'media/rIdImage1.png',
        id: 'rIdImage1',
        width: 100,
        height: 50
      },
      { value: `图后${ZERO}` }
    ])
  })

  it('imports anchored drawing images with display and float position', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<w:body>',
      '<w:p><w:r><w:drawing><wp:anchor behindDoc="0"><wp:positionH relativeFrom="page"><wp:posOffset>114300</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>323850</wp:posOffset></wp:positionV><wp:extent cx="952500" cy="476250"/><wp:wrapTight wrapText="bothSides"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImage1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')
    const relationships = resolveOoxmlDocumentRelationships({
      [OOXML_DOCUMENT_RELATIONSHIPS_PART]:
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/rIdImage1.png"/>' +
        '</Relationships>'
    })

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml, {
      relationships
    })

    expect(imported.elementList).to.deep.eq([
      {
        type: ElementType.IMAGE,
        value: 'media/rIdImage1.png',
        id: 'rIdImage1',
        width: 100,
        height: 50,
        imgDisplay: ImageDisplay.TIGHT,
        imgFloatPosition: {
          x: 12,
          y: 34
        }
      },
      { value: ZERO }
    ])
  })

  /** 验证 DOCX package 中的图片媒体资源可以在导入正文时回填为 data URL。 */
  it('imports exported inline image media as data URL from package parts', () => {
    const imageDataUrl = 'data:image/png;base64,AQIDBA=='
    const packageResult = importOoxmlDocxBytes(
      createOoxmlDocxBytes(
        {
          main: [
            { value: '前' },
            {
              type: ElementType.IMAGE,
              value: imageDataUrl,
              width: 32,
              height: 18
            },
            { value: `后${ZERO}` }
          ]
        },
        {
          width: 794,
          height: 1123,
          paperDirection: PaperDirection.VERTICAL,
          margins: [96, 96, 96, 96]
        }
      )
    )
    const relationships = resolveOoxmlDocumentRelationships(packageResult.textParts)

    const imported = parseOoxmlDocumentXmlToEditorData(packageResult.documentXml, {
      relationships,
      packageParts: packageResult.parts
    })
    const image = imported.elementList[1]

    expect(imported.elementList[0]).to.deep.eq({ value: '前' })
    expect(imported.elementList[2]).to.deep.eq({ value: `后${ZERO}` })
    expect(image.type).to.eq(ElementType.IMAGE)
    expect(image.value).to.eq(imageDataUrl)
    expect(image.width).to.eq(32)
    expect(image.height).to.eq(18)
    expect(image.id).to.match(/^rIdImage/)
  })

  /** 验证同一媒体 part 被多次引用时只在请求级 cache 中保存一份 data URL。 */
  it('reuses imported image data URLs for repeated media parts', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
      '<w:body>',
      '<w:p>',
      '<w:r><w:drawing><wp:inline><wp:extent cx="95250" cy="95250"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImage1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>',
      '<w:r><w:drawing><wp:inline><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImage2"/></pic:blipFill><pic:spPr><a:xfrm><a:ext cx="190500" cy="95250"/></a:xfrm></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')
    const relationships = resolveOoxmlDocumentRelationships({
      [OOXML_DOCUMENT_RELATIONSHIPS_PART]:
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/shared.png"/>' +
        '<Relationship Id="rIdImage2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/shared.png"/>' +
        '</Relationships>'
    })
    const imageDataUrlCache = new Map<string, string>()

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml, {
      relationships,
      packageParts: {
        'word/media/shared.png': new Uint8Array([1, 2, 3])
      },
      imageDataUrlCache
    })

    expect(imported.elementList[0].value).to.eq('data:image/png;base64,AQID')
    expect(imported.elementList[1].value).to.eq('data:image/png;base64,AQID')
    expect(imported.elementList[1].width).to.eq(20)
    expect(imported.elementList[1].height).to.eq(10)
    expect(imageDataUrlCache.size).to.eq(1)
    expect(imageDataUrlCache.get('word/media/shared.png')).to.eq(
      'data:image/png;base64,AQID'
    )
  })

  /** 验证高层 DOCX 导入可以把默认页眉页脚部件解析回 IEditorData。 */
  it('imports exported default header and footer data from docx package', () => {
    const bytes = createOoxmlDocxBytes(
      {
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [
              { value: '页眉-' },
              {
                type: ElementType.HYPERLINK,
                value: '链接',
                url: 'https://header.example'
              },
              { value: ZERO }
            ]
          }
        ],
        main: [{ value: `正文${ZERO}` }],
        footerPageScopes: [
          {
            pageScope: 'all',
            elementList: [{ value: `页脚${ZERO}` }]
          }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        mirrorMargins: true,
        gutterPosition: 'top'
      }
    )

    const imported = importOoxmlDocxBytesToEditorData(bytes)

    expect(imported.data.main).to.deep.eq([{ value: `正文${ZERO}` }])
    expect(imported.data.header).to.deep.eq([
      { value: '页眉-' },
      {
        type: ElementType.HYPERLINK,
        value: '链接',
        hyperlinkId: imported.data.header?.[1].hyperlinkId,
        url: 'https://header.example'
      },
      { value: ZERO }
    ])
    expect(imported.data.footer).to.deep.eq([{ value: `页脚${ZERO}` }])
    expect(imported.options.width).to.eq(794)
    expect(imported.options.height).to.eq(1123)
    expect(imported.options.paperDirection).to.eq(PaperDirection.VERTICAL)
    expect(imported.options.margins).to.deep.eq([96, 96, 96, 96])
    expect(imported.options.mirrorMargins).to.eq(true)
    expect(imported.options.gutterPosition).to.eq('top')
  })

  /** 验证高层入口一次返回编辑器数据、页面设置和可复用的 package 上下文。 */
  it('imports editor data, options, package parts, and relationships from one docx entry', () => {
    const drawingXml =
      '<w:r><w:drawing><wp:inline><wp:extent cx="304800" cy="190500"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdFooterImage"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>'
    const bytes = createOoxmlZipPackage({
      '[Content_Types].xml':
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      'word/document.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
        '<w:body>',
        '<w:p><w:r><w:t>正文-</w:t></w:r><w:hyperlink r:id="rIdMainHyperlink"><w:r><w:t>主链接</w:t></w:r></w:hyperlink><w:r><w:t>尾</w:t></w:r></w:p>',
        '<w:sectPr>',
        '<w:pgSz w:w="11910" w:h="16845" w:orient="portrait"/>',
        '<w:pgMar w:top="1440" w:right="1080" w:bottom="1440" w:left="1080" w:gutter="180"/>',
        '<w:headerReference w:type="default" r:id="rIdHeader1"/>',
        '<w:footerReference w:type="default" r:id="rIdFooter1"/>',
        '</w:sectPr>',
        '</w:body>',
        '</w:document>'
      ].join(''),
      'word/_rels/document.xml.rels': [
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Id="rIdMainHyperlink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://main.example/import" TargetMode="External"/>',
        '<Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>',
        '<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>',
        '</Relationships>'
      ].join(''),
      'word/header1.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
        '<w:p><w:r><w:t>页眉-</w:t></w:r><w:hyperlink r:id="rIdHeaderHyperlink"><w:r><w:t>页眉链接</w:t></w:r></w:hyperlink></w:p>',
        '</w:hdr>'
      ].join(''),
      'word/_rels/header1.xml.rels':
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdHeaderHyperlink" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://header.example/import" TargetMode="External"/></Relationships>',
      'word/footer1.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        `<w:p>${drawingXml}</w:p>`,
        '</w:ftr>'
      ].join(''),
      'word/_rels/footer1.xml.rels':
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdFooterImage" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/footer.png"/></Relationships>',
      'word/settings.xml':
        '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:mirrorMargins/><w:gutterAtTop/></w:settings>',
      'word/media/footer.png': new Uint8Array([1, 2, 3])
    })

    const imported = importOoxmlDocxBytesToEditorData(bytes)

    expect(imported.documentXml).to.eq(imported.textParts[OOXML_DOCUMENT_XML_PART])
    expect(imported.textParts['word/header1.xml']).to.contain('页眉链接')
    expect(imported.textParts['word/footer1.xml']).to.contain('rIdFooterImage')
    expect(Array.from(imported.parts['word/media/footer.png'])).to.deep.eq([
      1,
      2,
      3
    ])
    expect(imported.data.main).to.deep.eq([
      { value: '正文-' },
      {
        type: ElementType.HYPERLINK,
        value: '主链接',
        hyperlinkId: 'rIdMainHyperlink',
        url: 'https://main.example/import'
      },
      { value: `尾${ZERO}` }
    ])
    expect(imported.data.header).to.deep.eq([
      { value: '页眉-' },
      {
        type: ElementType.HYPERLINK,
        value: '页眉链接',
        hyperlinkId: 'rIdHeaderHyperlink',
        url: 'https://header.example/import'
      },
      { value: ZERO }
    ])
    expect(imported.data.footer).to.deep.eq([
      {
        type: ElementType.IMAGE,
        value: 'data:image/png;base64,AQID',
        id: 'rIdFooterImage',
        width: 32,
        height: 20
      },
      { value: ZERO }
    ])
    expect(imported.options).to.deep.include({
      width: 794,
      height: 1123,
      paperDirection: PaperDirection.VERTICAL,
      gutter: 12,
      mirrorMargins: true,
      gutterPosition: 'top'
    })
    expect(imported.options.margins).to.deep.eq([96, 72, 96, 72])
  })

  /** 验证页眉页脚图片使用各自 part-local 关系表，不会串用 document.xml.rels。 */
  it('imports header and footer images from their own relationships', () => {
    const drawingXml =
      '<w:p><w:r><w:drawing><wp:inline><wp:extent cx="304800" cy="190500"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="rIdImage1"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>'
    const bytes = createOoxmlZipPackage({
      '[Content_Types].xml':
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      'word/document.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
        '<w:body><w:p><w:r><w:t>正文</w:t></w:r></w:p><w:sectPr>',
        '<w:headerReference w:type="default" r:id="rIdHeader1"/>',
        '<w:footerReference w:type="default" r:id="rIdFooter1"/>',
        '</w:sectPr></w:body></w:document>'
      ].join(''),
      'word/_rels/document.xml.rels': [
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>',
        '<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>',
        '<Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/document.png"/>',
        '</Relationships>'
      ].join(''),
      'word/header1.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        drawingXml,
        '</w:hdr>'
      ].join(''),
      'word/footer1.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">',
        drawingXml,
        '</w:ftr>'
      ].join(''),
      'word/_rels/header1.xml.rels':
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/header.png"/></Relationships>',
      'word/_rels/footer1.xml.rels':
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdImage1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/footer.png"/></Relationships>',
      'word/media/document.png': new Uint8Array([7, 8, 9]),
      'word/media/header.png': new Uint8Array([1, 2, 3]),
      'word/media/footer.png': new Uint8Array([4, 5, 6])
    })

    const imported = importOoxmlDocxBytesToEditorData(bytes)

    expect(imported.data.header?.[0]).to.deep.include({
      type: ElementType.IMAGE,
      value: 'data:image/png;base64,AQID',
      id: 'rIdImage1',
      width: 32,
      height: 20
    })
    expect(imported.data.footer?.[0]).to.deep.include({
      type: ElementType.IMAGE,
      value: 'data:image/png;base64,BAUG',
      id: 'rIdImage1',
      width: 32,
      height: 20
    })
  })

  /** 验证页眉页脚共享块级解析器可以识别表格和原生公式。 */
  it('parses header and footer block tables and formulas', () => {
    const header = parseOoxmlHeaderFooterXmlToElementList(
      [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:tbl><w:tblGrid><w:gridCol w:w="1440"/></w:tblGrid><w:tr><w:tc><w:p><w:r><w:t>页眉表格</w:t></w:r></w:p></w:tc></w:tr></w:tbl>',
        '</w:hdr>'
      ].join(''),
      { rootLocalName: 'hdr' }
    )
    const footer = parseOoxmlHeaderFooterXmlToElementList(
      [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">',
        '<m:oMathPara><m:oMath><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath></m:oMathPara>',
        '</w:ftr>'
      ].join(''),
      { rootLocalName: 'ftr' }
    )

    expect(header[0].type).to.eq(ElementType.TABLE)
    expect(header[0].trList?.[0].tdList?.[0].value?.[0]).to.deep.eq({
      value: `页眉表格${ZERO}`
    })
    expect(footer[0].type).to.eq(ElementType.LATEX)
    expect(footer[0].value).to.eq('x^{2}')
    expect(footer[1]).to.deep.eq({ value: ZERO })
  })

  /** 验证 Word 原生 m:oMath 公式可以回导为内部结构化公式元素。 */
  it('imports native OOXML math as structured formula elements', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">',
      '<w:body>',
      '<w:p>',
      '<w:r><w:t>公式：</w:t></w:r>',
      '<m:oMath>',
      '<m:sSub><m:e><m:r><m:t>E</m:t></m:r></m:e><m:sub><m:r><m:t>k</m:t></m:r></m:sub></m:sSub>',
      '<m:r><m:t>=</m:t></m:r>',
      '<m:f><m:num><m:r><m:t>1</m:t></m:r></m:num><m:den><m:r><m:t>n</m:t></m:r></m:den></m:f>',
      '</m:oMath>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const formulaElement = imported.elementList[1]

    expect(imported.elementList[0]).to.deep.eq({ value: '公式：' })
    expect(imported.elementList[2]).to.deep.eq({ value: ZERO })
    expect(formulaElement.type).to.eq(ElementType.LATEX)
    expect(formulaElement.value).to.eq('E_{k}=\\frac{1}{n}')
    expect(formulaElement.formula?.sourceFormat).to.eq('ooxml')
    expect(formulaElement.formula?.ast.children?.[0]).to.deep.eq({
      type: 'subscript',
      base: { type: 'text', value: 'E' },
      subscript: { type: 'text', value: 'k' }
    })
    expect(formulaElement.formula?.ast.children?.[2]).to.deep.eq({
      type: 'fraction',
      numerator: { type: 'text', value: '1' },
      denominator: { type: 'text', value: 'n' }
    })
    expect(formulaElement.formula?.ooxml).to.contain('<m:oMath')
  })

  /** 验证 Word 块级公式 m:oMathPara 不会在正文导入时被跳过。 */
  it('imports native OOXML math paragraphs as formula elements', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">',
      '<w:body>',
      '<m:oMathPara><m:oMath>',
      '<m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup>',
      '</m:oMath></m:oMathPara>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const formulaElement = imported.elementList[0]

    expect(formulaElement.type).to.eq(ElementType.LATEX)
    expect(formulaElement.value).to.eq('x^{2}')
    expect(formulaElement.formula?.ast.children?.[0]).to.deep.eq({
      type: 'superscript',
      base: { type: 'text', value: 'x' },
      superscript: { type: 'text', value: '2' }
    })
    expect(imported.elementList[1]).to.deep.eq({ value: ZERO })
  })

  /** 验证 OOXML 高级公式结构不会在导入时退化成普通文本。 */
  it('imports native OOXML nary limits functions and accents', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">',
      '<w:body>',
      '<w:p><m:oMath>',
      '<m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub><m:r><m:t>i=1</m:t></m:r></m:sub><m:sup><m:r><m:t>n</m:t></m:r></m:sup><m:e><m:sSub><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sub><m:r><m:t>i</m:t></m:r></m:sub></m:sSub></m:e></m:nary>',
      '<m:r><m:t>+</m:t></m:r>',
      '<m:bar><m:e><m:r><m:t>x</m:t></m:r></m:e></m:bar>',
      '<m:r><m:t>+</m:t></m:r>',
      '<m:func><m:fName><m:r><m:t>sin</m:t></m:r></m:fName><m:e><m:r><m:t>x</m:t></m:r></m:e></m:func>',
      '<m:r><m:t>+</m:t></m:r>',
      '<m:limLow><m:e><m:r><m:t>lim</m:t></m:r></m:e><m:lim><m:r><m:t>x→0</m:t></m:r></m:lim></m:limLow>',
      '</m:oMath></w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const formulaElement = imported.elementList[0]

    expect(formulaElement.type).to.eq(ElementType.LATEX)
    expect(formulaElement.value).to.eq(
      '\\sum_{i=1}^{n}x_{i}+\\bar{x}+sin(x)+lim_{x→0}'
    )
    expect(formulaElement.formula?.displayText).to.eq(
      '∑ᵢ₌₁ⁿxᵢ+x̄+sin(x)+limₓ→₀'
    )
    expect(formulaElement.formula?.ast.children?.[0]).to.deep.include({
      type: 'group'
    })
    expect(formulaElement.formula?.ast.children?.[2]).to.deep.include({
      type: 'group',
      value: '\\bar'
    })
    expect(imported.elementList[1]).to.deep.eq({ value: ZERO })
  })

  /** 验证 OOXML 分隔符、方程组和装饰公式可以回导为结构化公式。 */
  it('imports native OOXML delimiters equation arrays and formula boxes', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">',
      '<w:body>',
      '<w:p><m:oMath>',
      '<m:d><m:dPr><m:begChr m:val="["/><m:endChr m:val="]"/></m:dPr><m:e><m:r><m:t>x+1</m:t></m:r></m:e></m:d>',
      '<m:r><m:t>+</m:t></m:r>',
      '<m:eqArr><m:e><m:r><m:t>x=1</m:t></m:r></m:e><m:e><m:r><m:t>y=2</m:t></m:r></m:e></m:eqArr>',
      '<m:r><m:t>+</m:t></m:r>',
      '<m:groupChr><m:groupChrPr><m:chr m:val="⏞"/><m:pos m:val="top"/></m:groupChrPr><m:e><m:r><m:t>x+y</m:t></m:r></m:e></m:groupChr>',
      '<m:r><m:t>+</m:t></m:r>',
      '<m:borderBox><m:e><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:e></m:borderBox>',
      '<m:r><m:t>+</m:t></m:r>',
      '<m:phant><m:e><m:r><m:t>z</m:t></m:r></m:e></m:phant>',
      '</m:oMath></w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const formulaElement = imported.elementList[0]

    expect(formulaElement.type).to.eq(ElementType.LATEX)
    expect(formulaElement.value).to.eq(
      '[x+1]+\\begin{matrix}x=1\\\\y=2\\end{matrix}+\\overbrace{x+y}+\\boxed{x^{2}}+\\phantom{z}'
    )
    expect(formulaElement.formula?.displayText).to.eq(
      '[x+1]+x=1;y=2+x+y+x²+z'
    )
    expect(formulaElement.formula?.ast.children?.[0]).to.deep.include({
      type: 'group'
    })
    expect(formulaElement.formula?.ast.children?.[2]).to.deep.include({
      type: 'matrix'
    })
    expect(formulaElement.formula?.ast.children?.[4]).to.deep.include({
      type: 'group',
      value: '\\overbrace'
    })
    expect(formulaElement.formula?.ast.children?.[6]).to.deep.include({
      type: 'group',
      value: '\\boxed'
    })
    expect(formulaElement.formula?.ast.children?.[8]).to.deep.include({
      type: 'group',
      value: '\\phantom'
    })
    expect(imported.elementList[1]).to.deep.eq({ value: ZERO })
  })

  /** 验证基础字符样式导出后可以通过 w:rPr 回导为内部元素字段。 */
  it('imports exported basic run styles into editor elements', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: '样式',
            font: 'SimSun',
            size: 18,
            bold: true,
            italic: true,
            underline: true,
            strikeout: true,
            color: '#336699',
            highlight: '#F8EACC'
          },
          {
            value: '高级',
            letterSpacing: 2,
            textScale: 80,
            textPosition: 4,
            textOutline: {
              hollow: true
            },
            textShadow: {
              color: '#000000'
            },
            textCombine: true
          },
          {
            type: ElementType.SUPERSCRIPT,
            value: '上标'
          },
          {
            type: ElementType.SUBSCRIPT,
            value: '下标'
          },
          {
            value: ZERO
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

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList).to.deep.eq([
      {
        value: '样式',
        font: 'SimSun',
        size: 18,
        bold: true,
        italic: true,
        underline: true,
        strikeout: true,
        color: '#336699',
        highlight: '#F8EACC'
      },
      {
        value: '高级',
        letterSpacing: 2,
        textScale: 80,
        textPosition: 4,
        textOutline: {
          hollow: true
        },
        textShadow: {},
        textCombine: true
      },
      {
        type: ElementType.SUPERSCRIPT,
        value: '上标'
      },
      {
        type: ElementType.SUBSCRIPT,
        value: '下标'
      },
      {
        value: ZERO
      }
    ])
  })

  /** 验证 OOXML 修订结构可以回导为内部 trackChange 标记。 */
  it('imports OOXML insertion deletion and delText revisions into track changes', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p>',
      '<w:ins w:id="11" w:author="Alice" w:date="2026-06-02T08:00:00.000Z"><w:r><w:t>新增</w:t></w:r></w:ins>',
      '<w:del w:id="12" w:author="Bob" w:date="2026-06-02T09:00:00.000Z"><w:r><w:delText>删除</w:delText></w:r></w:del>',
      '<w:r><w:delText>独立删除</w:delText></w:r>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList).to.deep.eq([
      {
        value: '新增',
        trackChange: {
          id: '11',
          type: 'insert',
          author: 'Alice',
          timestamp: Date.UTC(2026, 5, 2, 8, 0, 0)
        }
      },
      {
        value: '删除',
        trackChange: {
          id: '12',
          type: 'delete',
          author: 'Bob',
          timestamp: Date.UTC(2026, 5, 2, 9, 0, 0)
        }
      },
      {
        value: `独立删除${ZERO}`,
        trackChange: {
          id: 'ooxml-delete',
          type: 'delete',
          timestamp: 0
        }
      }
    ])
  })

  /** 验证页眉、页脚和表格单元格内的修订结构共用段落导入逻辑且不丢 trackChange。 */
  it('imports track changes from header footer and table cell paragraphs', () => {
    const bytes = createOoxmlZipPackage({
      '[Content_Types].xml':
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
      '_rels/.rels':
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>',
      [OOXML_DOCUMENT_XML_PART]: [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
        '<w:body>',
        '<w:tbl><w:tblGrid><w:gridCol w:w="1800"/></w:tblGrid><w:tr><w:tc><w:p>',
        '<w:ins w:id="21" w:author="CellAuthor" w:date="2026-06-02T10:00:00.000Z"><w:r><w:t>单元格新增</w:t></w:r></w:ins>',
        '<w:del w:id="22" w:author="CellAuthor" w:date="2026-06-02T11:00:00.000Z"><w:r><w:delText>单元格删除</w:delText></w:r></w:del>',
        '</w:p></w:tc></w:tr></w:tbl>',
        '<w:sectPr><w:headerReference w:type="default" r:id="rIdHeader1"/><w:footerReference w:type="default" r:id="rIdFooter1"/></w:sectPr>',
        '</w:body>',
        '</w:document>'
      ].join(''),
      'word/_rels/document.xml.rels': [
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">',
        '<Relationship Id="rIdHeader1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>',
        '<Relationship Id="rIdFooter1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>',
        '</Relationships>'
      ].join(''),
      'word/header1.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:p><w:ins w:id="31" w:author="HeaderAuthor" w:date="2026-06-02T12:00:00.000Z"><w:r><w:t>页眉新增</w:t></w:r></w:ins></w:p>',
        '</w:hdr>'
      ].join(''),
      'word/footer1.xml': [
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
        '<w:ftr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
        '<w:p><w:del w:id="41" w:author="FooterAuthor" w:date="2026-06-02T13:00:00.000Z"><w:r><w:delText>页脚删除</w:delText></w:r></w:del></w:p>',
        '</w:ftr>'
      ].join('')
    })

    const imported = importOoxmlDocxBytesToEditorData(bytes)
    const table = imported.data.main[0]
    const cellValue = table.trList?.[0].tdList?.[0].value || []

    expect(table.type).to.eq(ElementType.TABLE)
    expect(cellValue).to.deep.eq([
      {
        value: '单元格新增',
        trackChange: {
          id: '21',
          type: 'insert',
          author: 'CellAuthor',
          timestamp: Date.UTC(2026, 5, 2, 10, 0, 0)
        }
      },
      {
        value: `单元格删除${ZERO}`,
        trackChange: {
          id: '22',
          type: 'delete',
          author: 'CellAuthor',
          timestamp: Date.UTC(2026, 5, 2, 11, 0, 0)
        }
      }
    ])
    expect(imported.data.header).to.deep.eq([
      {
        value: `页眉新增${ZERO}`,
        trackChange: {
          id: '31',
          type: 'insert',
          author: 'HeaderAuthor',
          timestamp: Date.UTC(2026, 5, 2, 12, 0, 0)
        }
      }
    ])
    expect(imported.data.footer).to.deep.eq([
      {
        value: `页脚删除${ZERO}`,
        trackChange: {
          id: '41',
          type: 'delete',
          author: 'FooterAuthor',
          timestamp: Date.UTC(2026, 5, 2, 13, 0, 0)
        }
      }
    ])
  })

  /** 验证导出的修订 run 可以通过 DOCX 高层入口闭环回导。 */
  it('round trips exported track changes through DOCX import', () => {
    const bytes = createOoxmlDocxBytes(
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

    const imported = importOoxmlDocxBytesToEditorData(bytes)
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

  /** 验证段落高级属性导出后可以通过 w:pPr 回导为内部段落字段。 */
  it('imports exported paragraph properties into editor elements', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: `高级段落${ZERO}`,
            rowFlex: RowFlex.RIGHT,
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

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList).to.deep.eq([
      {
        value: `高级段落${ZERO}`,
        rowFlex: RowFlex.RIGHT,
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
          { position: 80, alignment: 'bar' },
          { position: 120, alignment: 'right' }
        ]
      },
      {
        value: `悬挂段落${ZERO}`,
        rowIndentLeft: 32,
        rowHangingIndent: 32
      },
      {
        value: `倍数行距${ZERO}`,
        lineSpacingType: 'multiple',
        lineSpacing: 2
      }
    ])
  })

  /** 验证段落语义样式和列表编号可以从 w:pPr 回导。 */
  it('imports exported paragraph style and numbering semantics', () => {
    const listNumberId = createOoxmlNumberingId('plan-list')
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            value: `二级标题${ZERO}`,
            level: TitleLevel.SECOND
          },
          {
            value: `自定义样式${ZERO}`,
            styleId: 'Custom-Report'
          },
          {
            value: `列表项${ZERO}`,
            listId: 'plan-list',
            listLevel: 1
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

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList).to.deep.eq([
      {
        value: `二级标题${ZERO}`,
        level: TitleLevel.SECOND
      },
      {
        value: `自定义样式${ZERO}`,
        styleId: 'Custom-Report'
      },
      {
        value: `列表项${ZERO}`,
        listId: `ooxml-num-${listNumberId}`,
        listLevel: 1
      }
    ])
  })

  /** 验证外部 Word 业务内容控件可以回导为内部 CONTROL 元素和外部候选项。 */
  it('imports Word select content controls into editor controls', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p>',
      '<w:sdt><w:sdtPr>',
      '<w:tag w:val="controlId=patient-city-control;conceptId=patientCity;externalId=patient.city;type=select;code=gz;required=true"/>',
      '<w:dropDownList><w:listItem w:displayText="广州" w:value="gz"/><w:listItem w:displayText="深圳" w:value="sz"/></w:dropDownList>',
      '</w:sdtPr><w:sdtContent><w:r><w:t>广州</w:t></w:r></w:sdtContent></w:sdt>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList[0]).to.deep.eq({
      type: ElementType.CONTROL,
      value: '广州',
      controlId: 'patient-city-control',
      externalId: 'patient.city',
      control: {
        type: ControlType.SELECT,
        conceptId: 'patientCity',
        code: 'gz',
        required: true,
        value: [{ value: '广州' }],
        valueSets: [
          { value: '广州', code: 'gz' },
          { value: '深圳', code: 'sz' }
        ]
      }
    })
    expect(imported.elementList[1]).to.deep.eq({ value: ZERO })
  })

  /** 验证 Word comboBox 控件和缺省 value 的选项可以回导为外部 valueSets。 */
  it('imports Word comboBox content controls into editor value sets', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p>',
      '<w:sdt><w:sdtPr>',
      '<w:tag w:val="controlId=patient-city-control;externalId=patient.city;type=select;code=gz"/>',
      '<w:comboBox><w:listItem w:displayText="广州"/><w:listItem w:displayText="深圳" w:value="sz"/></w:comboBox>',
      '</w:sdtPr><w:sdtContent><w:r><w:t>广州</w:t></w:r></w:sdtContent></w:sdt>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const control = imported.elementList[0]

    expect(control.type).to.eq(ElementType.CONTROL)
    expect(control.control?.valueSets).to.deep.eq([
      { value: '广州', code: '广州' },
      { value: '深圳', code: 'sz' }
    ])
    expect(imported.elementList[1]).to.deep.eq({ value: ZERO })
  })

  /** 验证外部 Word 日期、复选框和单选框内容控件可以回导为内部专用元素。 */
  it('imports Word date checkbox and radio content controls', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p>',
      '<w:sdt><w:sdtPr><w:tag w:val="dateId=report-date;dateFormat=yyyy-MM-dd;externalId=report.date"/><w:date><w:dateFormat w:val="yyyy-MM-dd"/></w:date></w:sdtPr><w:sdtContent><w:r><w:t>2026-06-02</w:t></w:r></w:sdtContent></w:sdt>',
      '<w:sdt><w:sdtPr><w:tag w:val="type=checkbox;code=agree;checked=true;disabled=true"/></w:sdtPr><w:sdtContent><w:r><w:t>☑</w:t></w:r></w:sdtContent></w:sdt>',
      '<w:sdt><w:sdtPr><w:tag w:val="type=radio;code=male;checked=false"/></w:sdtPr><w:sdtContent><w:r><w:t>○</w:t></w:r></w:sdtContent></w:sdt>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList).to.deep.eq([
      {
        type: ElementType.DATE,
        value: '2026-06-02',
        valueList: [{ value: '2026-06-02' }],
        dateId: 'report-date',
        dateFormat: 'yyyy-MM-dd',
        externalId: 'report.date'
      },
      {
        type: ElementType.CHECKBOX,
        value: '',
        checkbox: {
          value: true,
          code: 'agree',
          disabled: true
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
    ])
  })

  /** 验证缺少 checked 标记时，可按 Word/WPS 常见符号恢复勾选状态。 */
  it('detects Word checkable content control states from symbols', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p>',
      '<w:sdt><w:sdtPr><w:tag w:val="type=checkbox;code=agree"/></w:sdtPr><w:sdtContent><w:r><w:t>☒</w:t></w:r></w:sdtContent></w:sdt>',
      '<w:sdt><w:sdtPr><w:tag w:val="type=radio;code=male"/></w:sdtPr><w:sdtContent><w:r><w:t>●</w:t></w:r></w:sdtContent></w:sdt>',
      '<w:sdt><w:sdtPr><w:tag w:val="type=checkbox;code=empty"/></w:sdtPr><w:sdtContent><w:r><w:t>☐</w:t></w:r></w:sdtContent></w:sdt>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList[0].checkbox?.value).to.eq(true)
    expect(imported.elementList[1].radio?.value).to.eq(true)
    expect(imported.elementList[2].checkbox?.value).to.eq(false)
    expect(imported.elementList[3]).to.deep.eq({ value: ZERO })
  })

  /** 验证未知 sdt 走普通内容回退，且段落包裹内容不会丢失内部 ZERO。 */
  it('falls back unknown Word content controls to plain text with ZERO', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:p>',
      '<w:sdt><w:sdtPr><w:tag w:val="type=unknown"/></w:sdtPr><w:sdtContent>',
      '<w:p><w:r><w:t>未知内容</w:t></w:r></w:p>',
      '</w:sdtContent></w:sdt>',
      '</w:p>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.elementList).to.deep.eq([
      { value: `未知内容${ZERO}${ZERO}` }
    ])
  })

  /** 验证导出的基础表格可以回导为内部表格对象，覆盖几何、样式和合并主路径。 */
  it('imports exported basic tables into editor table elements', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            borderType: TableBorder.DASH,
            borderColor: '#1864ab',
            borderWidth: 2,
            tableStyleId: 'ReportGrid',
            colgroup: [{ width: 120 }, { width: 100 }],
            trList: [
              {
                height: 32,
                minHeight: 32,
                repeatOnPageStart: true,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 2,
                    colIndex: 0,
                    backgroundColor: '#f3f4f6',
                    verticalAlign: VerticalAlign.MIDDLE,
                    textDirection: 'vertical',
                    borderTypes: [
                      TdBorder.TOP,
                      TdBorder.RIGHT,
                      TdBorder.BOTTOM,
                      TdBorder.LEFT
                    ],
                    borderColor: '#f08c00',
                    borderWidth: 4,
                    value: [{ value: `合并${ZERO}` }]
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
                minHeight: 32,
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

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const table = imported.elementList[0]
    const firstCell = table.trList?.[0].tdList[0]

    expect(table.type).to.eq(ElementType.TABLE)
    expect(table.tableStyleId).to.eq('ReportGrid')
    expect(table.borderType).to.eq(TableBorder.DASH)
    expect(table.borderColor).to.eq('#1864AB')
    expect(table.borderWidth).to.eq(2)
    expect(table.colgroup).to.deep.eq([{ width: 120 }, { width: 100 }])
    expect(table.trList?.[0].repeatOnPageStart).to.eq(true)
    expect(table.trList?.[0].minHeight).to.eq(32)
    expect(firstCell?.rowspan).to.eq(2)
    expect(firstCell?.colIndex).to.eq(0)
    expect(firstCell?.width).to.eq(120)
    expect(firstCell?.backgroundColor).to.eq('#F3F4F6')
    expect(firstCell?.verticalAlign).to.eq(VerticalAlign.MIDDLE)
    expect(firstCell?.textDirection).to.eq('vertical')
    expect(firstCell?.borderTypes).to.deep.eq([
      TdBorder.TOP,
      TdBorder.RIGHT,
      TdBorder.BOTTOM,
      TdBorder.LEFT
    ])
    expect(firstCell?.borderColor).to.eq('#F08C00')
    expect(firstCell?.borderWidth).to.eq(4)
    expect(firstCell?.value).to.deep.eq([{ value: `合并${ZERO}` }])
    expect(table.trList?.[1].tdList).to.deep.eq([
      {
        colspan: 1,
        rowspan: 1,
        colIndex: 1,
        width: 100,
        value: [{ value: `右下${ZERO}` }]
      }
    ])
  })

  /** 验证高层 DOCX bytes 往返会保留已支持的表格字段级属性。 */
  it('round trips supported table field properties through DOCX bytes', () => {
    const bytes = createOoxmlDocxBytes(
      {
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            tableStyleId: 'RoundTripGrid',
            borderType: TableBorder.DASH,
            borderColor: '#1864ab',
            borderWidth: 2,
            colgroup: [{ width: 120 }, { width: 100 }],
            trList: [
              {
                height: 96,
                minHeight: 34,
                repeatOnPageStart: true,
                tdList: [
                  {
                    colspan: 1,
                    rowspan: 1,
                    colIndex: 0,
                    backgroundColor: '#f3f4f6',
                    verticalAlign: VerticalAlign.MIDDLE,
                    borderTypes: [
                      TdBorder.TOP,
                      TdBorder.RIGHT,
                      TdBorder.BOTTOM,
                      TdBorder.LEFT
                    ],
                    borderColor: '#f08c00',
                    borderWidth: 4,
                    value: [{ value: `字段A${ZERO}` }]
                  },
                  {
                    colspan: 1,
                    rowspan: 1,
                    colIndex: 1,
                    backgroundColor: 'rgba(5, 16, 255, 0.2)',
                    verticalAlign: VerticalAlign.BOTTOM,
                    value: [{ value: `字段B${ZERO}` }]
                  }
                ]
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

    const imported = importOoxmlDocxBytesToEditorData(bytes)
    const table = imported.data.main[0]
    const firstRow = table.trList?.[0]
    const firstCell = firstRow?.tdList[0]
    const secondCell = firstRow?.tdList[1]

    expect(table.type).to.eq(ElementType.TABLE)
    expect(table.tableStyleId).to.eq('RoundTripGrid')
    expect(table.borderType).to.eq(TableBorder.DASH)
    expect(table.borderColor).to.eq('#1864AB')
    expect(table.borderWidth).to.eq(2)
    expect(table.colgroup).to.deep.eq([{ width: 120 }, { width: 100 }])
    expect(firstRow?.repeatOnPageStart).to.eq(true)
    expect(firstRow?.minHeight).to.eq(34)
    expect(firstRow?.height).to.eq(34)
    expect(firstCell?.backgroundColor).to.eq('#F3F4F6')
    expect(firstCell?.verticalAlign).to.eq(VerticalAlign.MIDDLE)
    expect(firstCell?.borderTypes).to.deep.eq([
      TdBorder.TOP,
      TdBorder.RIGHT,
      TdBorder.BOTTOM,
      TdBorder.LEFT
    ])
    expect(firstCell?.borderColor).to.eq('#F08C00')
    expect(firstCell?.borderWidth).to.eq(4)
    expect(firstCell?.value).to.deep.eq([{ value: `字段A${ZERO}` }])
    expect(secondCell?.backgroundColor).to.eq('#0510FF')
    expect(secondCell?.verticalAlign).to.eq(VerticalAlign.BOTTOM)
    expect(secondCell?.value).to.deep.eq([{ value: `字段B${ZERO}` }])
  })

  /** 验证外部 Word 缺少 tblGrid 时可从单元格宽度兜底推导列宽。 */
  it('infers table colgroup from cell widths when tblGrid is missing', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:tbl>',
      '<w:tblPr><w:tblW w:w="4500" w:type="dxa"/></w:tblPr>',
      '<w:tr>',
      '<w:tc><w:tcPr><w:tcW w:w="1800" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>左</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r><w:t>右</w:t></w:r></w:p></w:tc>',
      '</w:tr>',
      '</w:tbl>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const table = imported.elementList[0]

    expect(table.type).to.eq(ElementType.TABLE)
    expect(table.width).to.eq(300)
    expect(table.colgroup).to.deep.eq([{ width: 120 }, { width: 160 }])
    expect(table.trList?.[0].tdList[0].width).to.eq(120)
    expect(table.trList?.[0].tdList[1].width).to.eq(160)
  })

  /** 验证缺少 tblGrid 和 tcW 时，可按 tblW 与最大列数等分兜底列宽。 */
  it('infers table colgroup evenly from tblW when grid and cell widths are missing', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:tbl>',
      '<w:tblPr><w:tblW w:w="4500" w:type="dxa"/></w:tblPr>',
      '<w:tr>',
      '<w:tc><w:p><w:r><w:t>一</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>二</w:t></w:r></w:p></w:tc>',
      '</w:tr>',
      '<w:tr>',
      '<w:tc><w:p><w:r><w:t>三</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>四</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>五</w:t></w:r></w:p></w:tc>',
      '</w:tr>',
      '</w:tbl>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const table = imported.elementList[0]

    expect(table.type).to.eq(ElementType.TABLE)
    expect(table.width).to.eq(300)
    expect(table.colgroup).to.deep.eq([
      { width: 100 },
      { width: 100 },
      { width: 100 }
    ])
  })

  /** 验证百分比表格宽度不会被误当作 dxa 列宽。 */
  it('does not infer fallback colgroup from pct table width', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:tbl>',
      '<w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr>',
      '<w:tr>',
      '<w:tc><w:p><w:r><w:t>一</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:p><w:r><w:t>二</w:t></w:r></w:p></w:tc>',
      '</w:tr>',
      '</w:tbl>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const table = imported.elementList[0]

    expect(table.type).to.eq(ElementType.TABLE)
    expect(table.width).to.eq(undefined)
    expect(table.colgroup).to.eq(undefined)
  })

  /** 验证表格外框宽度和内线宽度不一致时可回导 borderExternalWidth。 */
  it('imports table external border width separately from inner border width', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:tbl>',
      '<w:tblPr><w:tblBorders>',
      '<w:top w:val="single" w:sz="40" w:color="1864AB"/>',
      '<w:left w:val="single" w:sz="40" w:color="1864AB"/>',
      '<w:bottom w:val="single" w:sz="40" w:color="1864AB"/>',
      '<w:right w:val="single" w:sz="40" w:color="1864AB"/>',
      '<w:insideH w:val="single" w:sz="16" w:color="1864AB"/>',
      '<w:insideV w:val="single" w:sz="16" w:color="1864AB"/>',
      '</w:tblBorders></w:tblPr>',
      '<w:tblGrid><w:gridCol w:w="1800"/></w:tblGrid>',
      '<w:tr><w:tc><w:p><w:r><w:t>边框</w:t></w:r></w:p></w:tc></w:tr>',
      '</w:tbl>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const table = imported.elementList[0]

    expect(table.type).to.eq(ElementType.TABLE)
    expect(table.borderType).to.eq(TableBorder.ALL)
    expect(table.borderColor).to.eq('#1864AB')
    expect(table.borderWidth).to.eq(2)
    expect(table.borderExternalWidth).to.eq(5)
  })

  /** 验证 Word 常见竖排 textDirection 变体能归一到内部 vertical。 */
  it('imports table cell vertical text direction variants', () => {
    const documentXml = [
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      '<w:body>',
      '<w:tbl>',
      '<w:tblGrid><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/><w:gridCol w:w="1800"/></w:tblGrid>',
      '<w:tr>',
      '<w:tc><w:tcPr><w:textDirection w:val="tbRlV"/></w:tcPr><w:p><w:r><w:t>一</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:tcPr><w:textDirection w:val="btLr"/></w:tcPr><w:p><w:r><w:t>二</w:t></w:r></w:p></w:tc>',
      '<w:tc><w:tcPr><w:textDirection w:val="lrTb"/></w:tcPr><w:p><w:r><w:t>三</w:t></w:r></w:p></w:tc>',
      '</w:tr>',
      '</w:tbl>',
      '</w:body>',
      '</w:document>'
    ].join('')

    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)
    const tdList = imported.elementList[0].trList?.[0].tdList || []

    expect(tdList[0].textDirection).to.eq('vertical')
    expect(tdList[1].textDirection).to.eq('vertical')
    expect(tdList[2].textDirection).to.eq(undefined)
  })

  /** 验证导出的 document.xml 可以通过主文档解析增量回到内部正文数据。 */
  it('imports exported document XML into editor main data', () => {
    const bytes = createOoxmlDocxBytes(
      {
        main: [
          { value: '导出' },
          { type: ElementType.TAB, value: '' },
          { value: `回导${ZERO}` }
        ]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    const documentXml = extractOoxmlDocumentXml(bytes)
    const imported = parseOoxmlDocumentXmlToEditorData(documentXml)

    expect(imported.data.main).to.deep.eq([
      { value: '导出' },
      { type: ElementType.TAB, value: '' },
      { value: `回导${ZERO}` }
    ])
  })
})
