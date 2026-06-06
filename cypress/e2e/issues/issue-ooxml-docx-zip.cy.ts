import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { PaperDirection } from '../../../src/editor/dataset/enum/Editor'
import type Editor from '../../../src/editor'
import {
  createOoxmlDocxBytes,
  createOoxmlDocxPackageBlob,
  createOoxmlPackageParts
} from '../../../src/editor/core/export/ooxml/OoxmlPackage'
import {
  computeOoxmlCrc32,
  OOXML_DOCX_MIME_TYPE
} from '../../../src/editor/core/export/ooxml/OoxmlZip'

/** 读取 ZIP 文件签名，便于验证生成的 DOCX 包结构。 */
function readUint32(bytes: Uint8Array, offset: number) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    true
  )
}

describe('OOXML DOCX zip package', () => {
  it('computes stable CRC32 values for zip entries', () => {
    const bytes = new TextEncoder().encode('123456789')
    expect(computeOoxmlCrc32(bytes)).to.eq(0xcbf43926)
  })

  it('packages OOXML parts as a valid uncompressed zip byte stream', () => {
    const parts = createOoxmlPackageParts(
      {
        main: [{ value: `DOCX${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const bytes = createOoxmlDocxBytes(
      {
        main: [{ value: `DOCX${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )
    const zipText = new TextDecoder().decode(bytes)

    expect(readUint32(bytes, 0)).to.eq(0x04034b50)
    expect(readUint32(bytes, bytes.length - 22)).to.eq(0x06054b50)
    expect(zipText).to.contain('[Content_Types].xml')
    expect(zipText).to.contain('docProps/core.xml')
    expect(zipText).to.contain('docProps/app.xml')
    expect(zipText).to.contain('word/document.xml')
    expect(zipText).to.contain(parts['docProps/core.xml'])
    expect(zipText).to.contain(parts['docProps/app.xml'])
    expect(zipText).to.contain(parts['word/document.xml'])
  })

  it('creates a DOCX blob with the Office Open XML MIME type', () => {
    const blob = createOoxmlDocxPackageBlob(
      {
        main: [{ value: `Blob${ZERO}` }]
      },
      {
        width: 794,
        height: 1123,
        paperDirection: PaperDirection.VERTICAL,
        margins: [96, 96, 96, 96]
      }
    )

    expect(blob.type).to.eq(OOXML_DOCX_MIME_TYPE)
    expect(blob.size).to.be.greaterThan(0)
  })

  it('exposes a DOCX blob from the editor command API', () => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [{ value: `命令Blob${ZERO}` }]
      })

      const blob = editor.command.getOoxmlDocxBlob()
      expect(blob.type).to.eq(OOXML_DOCX_MIME_TYPE)
      expect(blob.size).to.be.greaterThan(0)
    })
  })

  it('downloads DOCX from the demo toolbar entry', () => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('exist')
    cy.window().then(win => {
      cy.stub(win.URL, 'createObjectURL').as('createObjectURL').returns('blob:docx')
      cy.stub(win.URL, 'revokeObjectURL').as('revokeObjectURL')
    })

    cy.get('.menu-item__docx').click({ force: true })
    cy.get('@createObjectURL').should('have.been.calledOnce')
    cy.get('@revokeObjectURL').should('have.been.calledWith', 'blob:docx')
  })
})
