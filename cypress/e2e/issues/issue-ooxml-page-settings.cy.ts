import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { NumberType } from '../../../src/editor/dataset/enum/Common'
import { PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { LineNumberType } from '../../../src/editor/dataset/enum/LineNumber'
import {
  convertFontSizeToHalfPoint,
  convertPxToTwip,
  createOoxmlLineNumberType,
  createOoxmlDocumentBackground,
  createOoxmlSectionProperties,
  createOoxmlPageBorders,
  createOoxmlPageColumns,
  createOoxmlPageMargin,
  createOoxmlPageNumberType,
  createOoxmlPageSize,
  normalizeOoxmlHexColor
} from '../../../src/editor/core/export/ooxml/OoxmlUnit'
import { createOoxmlDocumentXml } from '../../../src/editor/core/export/ooxml/OoxmlPackage'
import { importOoxmlDocumentOptions } from '../../../src/editor/core/export/ooxml/OoxmlDocumentOptionImport'
import { createOoxmlSettingsXml } from '../../../src/editor/core/export/ooxml/OoxmlSettings'
import { importOoxmlSettingsOptions } from '../../../src/editor/core/export/ooxml/OoxmlSettingsImport'

describe('OOXML page settings mapping', () => {
  it('converts editor units and colors to OOXML values', () => {
    expect(convertPxToTwip(100)).to.eq(1500)
    expect(convertFontSizeToHalfPoint(10.5)).to.eq(16)
    expect(normalizeOoxmlHexColor('#00aaCC')).to.eq('00AACC')
    expect(normalizeOoxmlHexColor('rgba(5, 16, 255, 0.2)')).to.eq('0510FF')
    expect(normalizeOoxmlHexColor('invalid')).to.eq('000000')
  })

  it('serializes page size margin and section properties', () => {
    const options = {
      width: 794,
      height: 1123,
      paperDirection: PaperDirection.HORIZONTAL,
      margins: [100, 120, 100, 120],
      gutter: 20,
      header: {
        top: 30
      },
      footer: {
        bottom: 40
      }
    }

    expect(createOoxmlPageSize(options)).to.eq(
      '<w:pgSz w:w="11910" w:h="16845" w:orient="landscape"/>'
    )
    expect(createOoxmlPageMargin(options)).to.eq(
      '<w:pgMar w:top="1500" w:right="1800" w:bottom="1500" w:left="1800" w:gutter="300" w:header="450" w:footer="600"/>'
    )
    expect(createOoxmlSectionProperties(options)).to.eq(
      '<w:sectPr><w:pgSz w:w="11910" w:h="16845" w:orient="landscape"/><w:pgMar w:top="1500" w:right="1800" w:bottom="1500" w:left="1800" w:gutter="300" w:header="450" w:footer="600"/></w:sectPr>'
    )
  })

  it('serializes global page columns to section properties', () => {
    expect(
      createOoxmlPageColumns({
        columns: {
          count: 3,
          gap: 20
        }
      })
    ).to.eq('<w:cols w:num="3" w:space="300"/>')

    expect(
      createOoxmlPageColumns({
        columns: {
          count: 2,
          gap: 16,
          widths: [180, 220]
        }
      })
    ).to.eq(
      '<w:cols w:num="2" w:equalWidth="0"><w:col w:w="2700" w:space="240"/><w:col w:w="3300"/></w:cols>'
    )
  })

  it('serializes page number start and format to section properties', () => {
    expect(
      createOoxmlPageNumberType({
        pageNumber: {
          startPageNo: 3,
          numberType: NumberType.CHINESE
        }
      })
    ).to.eq('<w:pgNumType w:start="3" w:fmt="chineseCounting"/>')

    expect(
      createOoxmlPageNumberType({
        pageNumber: {
          startPageNo: 1,
          numberType: NumberType.ARABIC,
          disabled: true
        }
      })
    ).to.eq('')

    expect(
      createOoxmlSectionProperties({
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        pageNumber: {
          startPageNo: 5,
          numberType: NumberType.ARABIC
        }
      })
    ).to.contain('<w:pgNumType w:start="5" w:fmt="decimal"/>')
  })

  it('serializes line number settings to section properties', () => {
    expect(
      createOoxmlLineNumberType({
        lineNumber: {
          disabled: false,
          right: 18,
          type: LineNumberType.PAGE
        }
      })
    ).to.eq(
      '<w:lnNumType w:countBy="1" w:restart="newPage" w:distance="270"/>'
    )

    expect(
      createOoxmlLineNumberType({
        lineNumber: {
          disabled: true,
          right: 18,
          type: LineNumberType.CONTINUITY
        }
      })
    ).to.eq('')

    expect(
      createOoxmlSectionProperties({
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        lineNumber: {
          disabled: false,
          right: 20,
          type: LineNumberType.CONTINUITY
        }
      })
    ).to.contain(
      '<w:lnNumType w:countBy="1" w:restart="continuous" w:distance="300"/>'
    )
  })

  it('serializes page borders to section properties', () => {
    expect(
      createOoxmlPageBorders({
        pageBorder: {
          disabled: false,
          color: '#336699',
          lineWidth: 2,
          style: 'double',
          padding: [1, 2, 3, 4]
        }
      })
    ).to.eq(
      '<w:pgBorders w:offsetFrom="page"><w:top w:val="double" w:sz="16" w:space="1" w:color="336699"/><w:left w:val="double" w:sz="16" w:space="4" w:color="336699"/><w:bottom w:val="double" w:sz="16" w:space="3" w:color="336699"/><w:right w:val="double" w:sz="16" w:space="2" w:color="336699"/></w:pgBorders>'
    )

    expect(
      createOoxmlPageBorders({
        pageBorder: {
          disabled: true
        }
      })
    ).to.eq('')

    expect(
      createOoxmlSectionProperties({
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        pageBorder: {
          disabled: false,
          style: 'dashed',
          color: 'rgba(5, 16, 255, 0.2)',
          lineWidth: 1,
          padding: [0, 5, 0, 5]
        }
      })
    ).to.contain('<w:pgBorders w:offsetFrom="page">')
  })

  it('serializes document page background outside section properties', () => {
    expect(
      createOoxmlDocumentBackground({
        background: {
          color: '#f8EACC'
        }
      })
    ).to.eq('<w:background w:color="F8EACC"/>')

    expect(
      createOoxmlDocumentBackground({
        background: {
          color: 'rgba(5, 16, 255, 0.2)'
        }
      })
    ).to.eq('<w:background w:color="0510FF"/>')

    expect(
      createOoxmlDocumentBackground({
        background: {}
      })
    ).to.eq('')

    expect(
      createOoxmlSectionProperties({
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        background: {
          color: '#f8EACC'
        }
      })
    ).not.to.contain('<w:background')
  })

  it('imports settings options from OOXML settings XML', () => {
    const settingsXml = createOoxmlSettingsXml({
      mirrorMargins: true,
      gutterPosition: 'top'
    })

    expect(settingsXml).to.contain('<w:mirrorMargins/>')
    expect(settingsXml).to.contain('<w:gutterAtTop/>')
    expect(importOoxmlSettingsOptions(settingsXml)).to.deep.eq({
      mirrorMargins: true,
      gutterPosition: 'top'
    })
    expect(importOoxmlSettingsOptions(createOoxmlSettingsXml({}))).to.deep.eq({})
  })

  it('imports page options from OOXML document XML', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [{ value: '页面设置往返\u200B' }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.HORIZONTAL,
        margins: [100, 120, 90, 80],
        gutter: 18,
        header: {
          top: 30
        },
        footer: {
          bottom: 40
        },
        columns: {
          count: 2,
          gap: 16,
          widths: [180, 220]
        },
        lineNumber: {
          disabled: false,
          right: 20,
          type: LineNumberType.PAGE
        },
        pageNumber: {
          disabled: false,
          startPageNo: 3,
          numberType: NumberType.CHINESE
        },
        pageBorder: {
          disabled: false,
          color: '#336699',
          lineWidth: 2,
          style: 'double',
          padding: [1, 2, 3, 4]
        },
        background: {
          color: '#f8EACC'
        }
      }
    )

    const importedOptions = importOoxmlDocumentOptions(documentXml)

    expect(importedOptions.width).to.eq(794)
    expect(importedOptions.height).to.eq(1123)
    expect(importedOptions.paperDirection).to.eq(PaperDirection.HORIZONTAL)
    expect(importedOptions.margins).to.deep.eq([100, 120, 90, 80])
    expect(importedOptions.gutter).to.eq(18)
    expect(importedOptions.header).to.deep.eq({ top: 30 })
    expect(importedOptions.footer).to.deep.eq({ bottom: 40 })
    expect(importedOptions.columns).to.deep.eq({
      count: 2,
      gap: 16,
      widths: [180, 220]
    })
    expect(importedOptions.lineNumber).to.deep.eq({
      disabled: false,
      right: 20,
      type: LineNumberType.PAGE
    })
    expect(importedOptions.pageNumber).to.deep.eq({
      disabled: false,
      startPageNo: 3,
      numberType: NumberType.CHINESE
    })
    expect(importedOptions.pageBorder).to.deep.eq({
      disabled: false,
      style: 'double',
      color: '#336699',
      lineWidth: 2,
      padding: [1, 2, 3, 4]
    })
    expect(importedOptions.background).to.deep.eq({
      color: '#F8EACC'
    })
  })

  it('imports table default cell margins from OOXML document XML', () => {
    const documentXml = createOoxmlDocumentXml(
      {
        main: [
          {
            type: ElementType.TABLE,
            value: '',
            colgroup: [{ width: 120 }],
            trList: [
              {
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
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96],
        table: {
          tdPadding: [2, 4, 6, 8]
        }
      }
    )

    expect(importOoxmlDocumentOptions(documentXml).table).to.deep.eq({
      tdPadding: [2, 4, 6, 8]
    })
  })

  it('keeps explicit zero table default cell margins from OOXML document XML', () => {
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:tbl>
            <w:tblPr>
              <w:tblCellMar>
                <w:top w:w="0" w:type="dxa"/>
                <w:left w:w="0" w:type="dxa"/>
                <w:bottom w:w="0" w:type="dxa"/>
                <w:right w:w="0" w:type="dxa"/>
              </w:tblCellMar>
            </w:tblPr>
          </w:tbl>
        </w:body>
      </w:document>`

    expect(importOoxmlDocumentOptions(documentXml).table).to.deep.eq({
      tdPadding: [0, 0, 0, 0]
    })
  })

  it('imports page settings without materializing DOM query collections', () => {
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:background w:color="F8EACC"/>
        <w:body>
          <w:tbl>
            <w:tblPr>
              <w:tblCellMar>
                <w:top w:w="30" w:type="dxa"/>
                <w:left w:w="60" w:type="dxa"/>
                <w:bottom w:w="90" w:type="dxa"/>
                <w:right w:w="120" w:type="dxa"/>
              </w:tblCellMar>
            </w:tblPr>
          </w:tbl>
          <w:sectPr>
            <w:pgSz w:w="11910" w:h="16845" w:orient="landscape"/>
            <w:pgMar w:top="1500" w:right="1800" w:bottom="1350" w:left="1200" w:gutter="270" w:header="450" w:footer="600"/>
            <w:pgBorders w:offsetFrom="page">
              <w:top w:val="double" w:sz="16" w:space="1" w:color="336699"/>
              <w:left w:val="double" w:sz="16" w:space="4" w:color="336699"/>
              <w:bottom w:val="double" w:sz="16" w:space="3" w:color="336699"/>
              <w:right w:val="double" w:sz="16" w:space="2" w:color="336699"/>
            </w:pgBorders>
            <w:lnNumType w:countBy="1" w:restart="newPage" w:distance="300"/>
            <w:pgNumType w:start="3" w:fmt="chineseCounting"/>
          </w:sectPr>
        </w:body>
      </w:document>`
    const arrayFrom = Array.from
    let importedOptions!: ReturnType<typeof importOoxmlDocumentOptions>

    Array.from = (() => {
      throw new Error('Array.from should not run for page setting DOM lookup')
    }) as typeof Array.from
    try {
      importedOptions = importOoxmlDocumentOptions(documentXml)
    } finally {
      Array.from = arrayFrom
    }

    expect(importedOptions.width).to.eq(794)
    expect(importedOptions.margins).to.deep.eq([100, 120, 90, 80])
    expect(importedOptions.lineNumber).to.deep.eq({
      disabled: false,
      right: 20,
      type: LineNumberType.PAGE
    })
    expect(importedOptions.pageNumber).to.deep.eq({
      disabled: false,
      startPageNo: 3,
      numberType: NumberType.CHINESE
    })
    expect(importedOptions.pageBorder).to.deep.eq({
      disabled: false,
      style: 'double',
      color: '#336699',
      lineWidth: 2,
      padding: [1, 2, 3, 4]
    })
    expect(importedOptions.background).to.deep.eq({
      color: '#F8EACC'
    })
    expect(importedOptions.table).to.deep.eq({
      tdPadding: [2, 8, 6, 4]
    })
  })
})
