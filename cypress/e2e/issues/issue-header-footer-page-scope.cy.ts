import {
  resolveHeaderFooterPageScope,
  resolveHeaderFooterScopedElementList
} from '../../../src/editor/core/modules/page-setup/runtime/HeaderFooterPageScope'
import { FloatImageRenderer } from '../../../src/editor/core/modules/image/render/FloatImageRenderer'
import { resolveWorkerSnapshotFloatingImageRect } from '../../../src/editor/core/modules/image/render/WorkerSnapshotImageRenderPolicy'
import { createPrintSvgPageListFromDocument } from '../../../src/editor/utils/print/svg'
import { ZERO } from '../../../src/editor/dataset/constant/Common'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { EditorZone } from '../../../src/editor/dataset/enum/Editor'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import type { IElement } from '../../../src/editor/interface/Element'
import type { IHeaderFooterPageScopeData } from '../../../src/editor/interface/Editor'
import type { IFloatPosition } from '../../../src/editor/interface/Position'

const getText = (elementList: IElement[] | undefined) => {
  return (elementList || [])
    .map(element => element.value)
    .join('')
    .replace(new RegExp(ZERO, 'g'), '')
    .replace(/\n/g, '')
}

const getPositionTop = (positionList: any[]) => {
  return Math.min(...positionList.map(position => position.coordinate.leftTop[1]))
}

const createFloatPosition = (
  pageNo: number,
  zone: EditorZone,
  value: string
): IFloatPosition => {
  return {
    pageNo,
    zone,
    element: {
      type: ElementType.IMAGE,
      value,
      width: 16,
      height: 16,
      imgDisplay: ImageDisplay.SURROUND,
      imgFloatPosition: { x: 8 + pageNo, y: 12 + pageNo }
    },
    position: {
      pageNo,
      index: 0,
      value,
      element: {} as IElement,
      rowIndex: 0,
      rowNo: 0,
      metrics: { width: 16, height: 16 } as any,
      left: 0,
      ascent: 0,
      lineHeight: 16,
      isFirstLetter: true,
      isLastLetter: true,
      coordinate: {
        leftTop: [8 + pageNo, 12 + pageNo],
        leftBottom: [8 + pageNo, 28 + pageNo],
        rightTop: [24 + pageNo, 12 + pageNo],
        rightBottom: [24 + pageNo, 28 + pageNo]
      }
    }
  }
}

describe('header footer page scope model', () => {
  it('returns empty content without scoped data', () => {
    expect(resolveHeaderFooterScopedElementList(undefined, 0)).to.deep.eq([])
    expect(resolveHeaderFooterScopedElementList([], 1)).to.deep.eq([])
  })

  it('resolves first odd even and all scopes by zero based page number', () => {
    const all: IElement[] = [{ value: 'all' }]
    const first: IElement[] = [{ value: 'first' }]
    const odd: IElement[] = [{ value: 'odd' }]
    const even: IElement[] = [{ value: 'even' }]
    const scopedData: IHeaderFooterPageScopeData[] = [
      { pageScope: 'all', elementList: all },
      { pageScope: 'first', elementList: first },
      { pageScope: 'odd', elementList: odd },
      { pageScope: 'even', elementList: even }
    ]

    expect(resolveHeaderFooterPageScope(0)).to.eq('first')
    expect(resolveHeaderFooterPageScope(1)).to.eq('even')
    expect(resolveHeaderFooterPageScope(2)).to.eq('odd')
    expect(resolveHeaderFooterScopedElementList(scopedData, 0)).to.eq(first)
    expect(resolveHeaderFooterScopedElementList(scopedData, 1)).to.eq(even)
    expect(resolveHeaderFooterScopedElementList(scopedData, 2)).to.eq(odd)
  })

  it('falls back from first to odd and then all within scoped data only', () => {
    const all: IElement[] = [{ value: 'all' }]
    const odd: IElement[] = [{ value: 'odd' }]

    expect(
      resolveHeaderFooterScopedElementList(
        [{ pageScope: 'odd', elementList: odd }],
        0
      )
    ).to.eq(odd)
    expect(
      resolveHeaderFooterScopedElementList(
        [{ pageScope: 'all', elementList: all }],
        1
      )
    ).to.eq(all)
    expect(resolveHeaderFooterScopedElementList([], 2)).to.deep.eq([])
  })

  it('keeps header and footer floating images scoped to their own page', () => {
    const floatPositionList = [
      createFloatPosition(0, EditorZone.HEADER, 'first-header-float'),
      createFloatPosition(1, EditorZone.HEADER, 'even-header-float'),
      createFloatPosition(2, EditorZone.FOOTER, 'odd-footer-float'),
      createFloatPosition(3, EditorZone.HEADER, 'outside-page-float')
    ]
    const renderedValueList: string[] = []
    const draw = {
      getOptions: () => ({ scale: 1 }),
      getCoordinate: () => ({ getFloatPositionList: () => floatPositionList }),
      getImageParticle: () => ({
        render: (
          _ctx: CanvasRenderingContext2D,
          element: IElement
        ) => renderedValueList.push(element.value)
      })
    }

    new FloatImageRenderer(draw as any).renderHeaderFooterFloatList(
      {} as CanvasRenderingContext2D,
      { pageNo: 1 } as any,
      [ImageDisplay.SURROUND]
    )
    expect(renderedValueList).to.deep.eq(['even-header-float'])

    expect(
      resolveWorkerSnapshotFloatingImageRect({
        pageNo: 1,
        floatPosition: floatPositionList[1],
        imageLayerList: [ImageDisplay.SURROUND],
        scale: 1
      })
    ).to.not.eq(null)
    expect(
      resolveWorkerSnapshotFloatingImageRect({
        pageNo: 1,
        floatPosition: floatPositionList[0],
        imageLayerList: [ImageDisplay.SURROUND],
        scale: 1
      })
    ).to.eq(null)

    const svgPageList = createPrintSvgPageListFromDocument({
      width: 120,
      height: 160,
      pageCount: 4,
      mainPositionList: [],
      floatPositionList,
      editorOptions: { scale: 1 } as any
    })
    expect(svgPageList[0]).to.contain('first-header-float')
    expect(svgPageList[1]).to.contain('even-header-float')
    expect(svgPageList[1]).not.to.contain('first-header-float')
    expect(svgPageList[1]).not.to.contain('odd-footer-float')
    expect(svgPageList[1]).not.to.contain('outside-page-float')
    expect(svgPageList[2]).to.contain('odd-footer-float')
  })
})

describe('header footer page scope runtime', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('selects first odd even and all scoped data while reading by page number', () => {
    cy.getEditor().then((editor: any) => {
      const headerAll: IElement[] = [{ value: 'header-all', size: 18 }]
      const headerFirst: IElement[] = [
        { value: 'header-first', size: 28 },
        { value: '\n' }
      ]
      const headerOdd: IElement[] = [
        { value: 'header-odd', size: 34 },
        { value: '\n' },
        { value: '\n' }
      ]
      const headerEven: IElement[] = [{ value: 'header-even', size: 22 }]
      const footerAll: IElement[] = [{ value: 'footer-all', size: 20 }]
      const footerFirst: IElement[] = [
        { value: 'footer-first', size: 30 },
        { value: '\n' }
      ]

      editor.command.executeSetValue({
        headerPageScopes: [
          { pageScope: 'all', elementList: headerAll },
          { pageScope: 'first', elementList: headerFirst },
          { pageScope: 'odd', elementList: headerOdd },
          { pageScope: 'even', elementList: headerEven }
        ],
        main: [
          { value: 'page-one' },
          { type: ElementType.PAGE_BREAK, value: '\n' },
          { value: 'page-two' },
          { type: ElementType.PAGE_BREAK, value: '\n' },
          { value: 'page-three' }
        ],
        footerPageScopes: [
          { pageScope: 'all', elementList: footerAll },
          { pageScope: 'first', elementList: footerFirst }
        ]
      })
      editor.draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = editor.draw
      const header = draw.getHeader()
      const footer = draw.getFooter()
      expect(draw.getPageCount()).to.be.greaterThan(2)

      expect(getText(header.getElementList(0))).to.eq('header-first')
      expect(getText(header.getElementList(1))).to.eq('header-even')
      expect(getText(header.getElementList(2))).to.eq('header-odd')
      expect(getText(footer.getElementList(0))).to.eq('footer-first')
      expect(getText(footer.getElementList(1))).to.eq('footer-all')
      expect(getText(footer.getElementList(2))).to.eq('footer-all')

      expect(getText(header.getRowList(0)[0].elementList)).to.eq(
        'header-first'
      )
      expect(getText(header.getRowList(1)[0].elementList)).to.eq(
        'header-even'
      )
      expect(getText(header.getRowList(2)[0].elementList)).to.eq('header-odd')
      expect(header.getPositionList(1)[0].pageNo).to.eq(1)
      expect(footer.getPositionList(2)[0].pageNo).to.eq(2)

      expect(header.getRowList(0)).to.have.length(2)
      expect(header.getRowList(1)).to.have.length(1)
      expect(header.getRowList(2)).to.have.length(3)
      expect(header.getPositionList(0)).to.have.length.greaterThan(
        header.getPositionList(1).length
      )
      expect(header.getPositionList(2)).to.have.length.greaterThan(
        header.getPositionList(1).length
      )
      expect(footer.getRowList(0)).to.have.length(2)
      expect(footer.getRowList(1)).to.have.length(1)
      expect(footer.getPositionList(0)).to.have.length.greaterThan(
        footer.getPositionList(1).length
      )
      expect(getPositionTop(footer.getPositionList(0))).to.be.lessThan(
        getPositionTop(footer.getPositionList(1))
      )

      expect(getText(editor.command.getValue({ pageNo: 0 }).data.header)).to.eq(
        'header-first'
      )
      expect(getText(editor.command.getValue({ pageNo: 1 }).data.header)).to.eq(
        'header-even'
      )
      expect(getText(editor.command.getValue({ pageNo: 2 }).data.header)).to.eq(
        'header-odd'
      )
      expect(getText(editor.command.getValue({ pageNo: 1 }).data.footer)).to.eq(
        'footer-all'
      )

      const fullValue = editor.command.getValue().data
      expect(fullValue.header).to.eq(undefined)
      expect(fullValue.footer).to.eq(undefined)
      expect(fullValue.headerPageScopes).to.have.length(4)
      expect(fullValue.footerPageScopes).to.have.length(2)
    })
  })

  it('ignores header and footer payloads without scoped data', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeSetValue({
        header: [{ value: 'ignored-header' }],
        headerPageScopes: [],
        main: [
          { value: 'page-one' },
          { type: ElementType.PAGE_BREAK, value: '\n' },
          { value: 'page-two' }
        ],
        footer: [{ value: 'ignored-footer' }],
        footerPageScopes: []
      })
      editor.draw.getServices().renderInvalidationManager.flushScheduledFrameRender()

      const draw = editor.draw
      expect(draw.getPageCount()).to.be.greaterThan(1)
      expect(getText(draw.getHeader().getElementList(1))).to.eq('')
      expect(getText(draw.getFooter().getElementList(1))).to.eq('')
      expect(getText(editor.command.getValue({ pageNo: 1 }).data.header)).to.eq('')
      expect(getText(editor.command.getValue({ pageNo: 1 }).data.footer)).to.eq('')
      expect(editor.command.getValue().data.headerPageScopes).to.have.length(0)
      expect(editor.command.getValue().data.footerPageScopes).to.have.length(0)
    })
  })
})
