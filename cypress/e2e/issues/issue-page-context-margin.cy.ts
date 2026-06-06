import { createPrintSvgPageListFromDocument } from '../../../src/editor/utils/print'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { PageMode } from '../../../src/editor/dataset/enum/Editor'
import { DrawLayoutPipeline } from '../../../src/editor/core/draw/layout/DrawLayoutPipeline'
import { DrawRenderFinalizeService } from '../../../src/editor/core/draw/render/DrawRenderFinalizeService'
import { FloatImageRenderer } from '../../../src/editor/core/modules/image/render/FloatImageRenderer'
import { resolveWorkerSnapshotFloatingImageRect } from '../../../src/editor/core/modules/image/render/WorkerSnapshotImageRenderPolicy'

describe('page context margins', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 覆盖 TS-04 镜像页边距和内侧装订线的页码上下文计算。 */
  it('resolves mirror margins and inside gutter by page number', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        margins: [10, 20, 30, 40],
        gutter: 6,
        gutterPosition: 'inside',
        mirrorMargins: true,
        columns: {
          count: 2,
          gap: 12
        }
      })

      expect(editor.command.getPaperMargin(0)).to.deep.eq([10, 20, 30, 46])
      expect(editor.command.getPaperMargin(1)).to.deep.eq([10, 46, 30, 20])

      const draw = (editor as any).draw
      const pageZeroLayout = draw
        .getServices()
        .pageColumnLayoutService.getPageColumnLayout(0)
      const pageOneLayout = draw
        .getServices()
        .pageColumnLayoutService.getPageColumnLayout(1)
      const columnGap = 12 * draw.getOptions().scale
      const columnWidth = (pageOneLayout.contentRect.width - columnGap) / 2
      expect(pageZeroLayout.contentRect.x).to.eq(46)
      expect(pageOneLayout.contentRect.x).to.eq(20)
      expect(pageOneLayout.contentRect.width).to.eq(draw.getWidth() - 46 - 20)
      expect(pageOneLayout.contentRect.height).to.eq(
        draw.getHeight() - draw.getMainOuterHeight(1)
      )
      expect(pageZeroLayout.columnList.map((column: any) => column.pageNo)).to.deep.eq([0, 0])
      expect(pageOneLayout.columnList.map((column: any) => column.pageNo)).to.deep.eq([1, 1])
      expect(pageOneLayout.columnList[0].rect).to.deep.eq({
        x: pageOneLayout.contentRect.x,
        y: pageOneLayout.contentRect.y,
        width: columnWidth,
        height: pageOneLayout.contentRect.height
      })
      expect(pageOneLayout.columnList[1].rect.x).to.eq(
        pageOneLayout.contentRect.x + columnWidth + columnGap
      )
    })
  })

  /** 覆盖 TS-04 顶部装订线，保证非镜像场景仍能增加顶部边距。 */
  it('applies top gutter to top margin', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        margins: [10, 20, 30, 40],
        gutter: 8,
        gutterPosition: 'top',
        mirrorMargins: false
      })

      expect(editor.command.getPaperMargin(0)).to.deep.eq([18, 20, 30, 40])
      expect(editor.command.getPaperMargin(1)).to.deep.eq([18, 20, 30, 40])

      const draw = (editor as any).draw
      const pageOneLayout = draw
        .getServices()
        .pageColumnLayoutService.getPageColumnLayout(1, {
          count: 2,
          gap: 10
        })
      expect(pageOneLayout.contentRect.y).to.eq(
        18 + draw.getHeader().getExtraHeight()
      )
      expect(pageOneLayout.contentRect.height).to.eq(
        draw.getHeight() - draw.getMainOuterHeight(1)
      )
      expect(pageOneLayout.columnList[0].rect.y).to.eq(
        pageOneLayout.contentRect.y
      )
      expect(pageOneLayout.columnList[0].rect.height).to.eq(
        pageOneLayout.contentRect.height
      )
    })
  })

  /** 覆盖 TS-04 页边距指示器使用当前页码边距，避免奇偶页提示线仍画在首页边距。 */
  it('draws margin indicator with page specific mirrored margins', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        margins: [10, 20, 30, 40],
        gutter: 6,
        gutterPosition: 'inside',
        mirrorMargins: true,
        marginIndicatorSize: 5
      })

      const draw = (editor as any).draw
      const pathCalls: Array<{ name: string; args: number[] }> = []
      const ctx = {
        save() {},
        translate() {},
        beginPath() {},
        moveTo(...args: number[]) {
          pathCalls.push({ name: 'moveTo', args })
        },
        lineTo(...args: number[]) {
          pathCalls.push({ name: 'lineTo', args })
        },
        stroke() {},
        restore() {},
        set strokeStyle(_value: string) {}
      }

      draw.getMargin().render(ctx, 1)

      const [top, right, bottom, left] = editor.command.getPaperMargin(1)
      const width = draw.getWidth()
      const height = draw.getHeight()
      expect(pathCalls.some(call =>
        call.name === 'lineTo' &&
        call.args[0] === left &&
        call.args[1] === top
      )).to.eq(true)
      expect(pathCalls.some(call =>
        call.name === 'lineTo' &&
        call.args[0] === width - right &&
        call.args[1] === top
      )).to.eq(true)
      expect(pathCalls.some(call =>
        call.name === 'lineTo' &&
        call.args[0] === left &&
        call.args[1] === height - bottom
      )).to.eq(true)
    })
  })

  /** 覆盖 TS-04 主线程页边框使用当前页边距，避免奇偶页边框沿用首页左边距。 */
  it('draws page border with page specific mirrored margins', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        margins: [10, 20, 30, 40],
        gutter: 6,
        gutterPosition: 'inside',
        mirrorMargins: true,
        pageBorder: {
          disabled: false,
          padding: [0, 0, 0, 0],
          lineWidth: 1,
          color: '#123456'
        }
      })

      const draw = (editor as any).draw
      const rectCalls: Array<{ x: number; y: number; width: number; height: number }> = []
      const ctx = {
        save() {},
        translate() {},
        rect(x: number, y: number, width: number, height: number) {
          rectCalls.push({ x, y, width, height })
        },
        stroke() {},
        restore() {},
        set strokeStyle(_value: string) {},
        set lineWidth(_value: number) {}
      }

      draw.getPageBorder().render(ctx, 1)

      const [, right, , left] = editor.command.getPaperMargin(1)
      expect(rectCalls[0].x).to.eq(left)
      expect(rectCalls[0].width).to.eq(draw.getWidth() - left - right)
    })
  })

  /** 覆盖 TS-04 worker 快照中的页码、行号和页边框均使用目标页边距。 */
  it('builds worker page decorations with page specific mirrored margins', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        margins: [10, 20, 30, 40],
        gutter: 6,
        gutterPosition: 'inside',
        mirrorMargins: true,
        pageBorder: {
          disabled: false,
          padding: [0, 0, 0, 0],
          lineWidth: 1,
          color: '#123456'
        },
        lineNumber: {
          disabled: false,
          color: '#654321',
          right: 0,
          size: 12,
          font: 'Microsoft YaHei',
          type: 'page'
        },
        pageNumber: {
          disabled: false,
          color: '#987654',
          rowFlex: 'left',
          format: '{pageNo}',
          fromPageNo: 0,
          startPageNo: 1
        }
      })
      editor.command.executeSetValue({
        headerPageScopes: [
          {
            pageScope: 'all',
            elementList: [{ value: '页眉镜像边距', color: '#112233' }]
          }
        ],
        main: Array.from({ length: 90 }, (_, index) => ({
          value: `镜像页边距 worker 快照测试-${index}\n`
        })),
        footerPageScopes: [
          {
            pageScope: 'all',
            elementList: [{ value: '页脚镜像边距', color: '#332211' }]
          }
        ]
      })
    })

    cy.getEditor().then((editor: any) => {
      const draw = (editor as any).draw
      expect(draw.getPageRowList().length).to.be.greaterThan(1)

      const pageNo = 1
      const [, right, , left] = editor.command.getPaperMargin(pageNo)
      const firstPageLeft = editor.command.getPaperMargin(0)[3]
      const snapshot = draw.getServices().pageRenderSnapshotBuilder.build({
        jobId: 1,
        pagePayload: {
          elementList: draw.getObjectResolver().getLayoutMainElementList(),
          positionList: draw.getCoordinate().getMainPositionList(),
          rowList: draw.getPageRowList()[pageNo],
          pageNo
        }
      })

      const pageBorderCommand = snapshot.commandList.find((command: any) => {
        return command.type === 'strokeRect' && command.strokeStyle === '#123456'
      }) as any
      expect(pageBorderCommand.rect.x).to.eq(left)
      expect(pageBorderCommand.rect.width).to.eq(draw.getWidth() - left - right)

      const lineNumberCommand = snapshot.commandList.find((command: any) => {
        return command.type === 'fillText' && command.fillStyle === '#654321'
      }) as any
      expect(lineNumberCommand.x).to.be.lessThan(left)
      expect(lineNumberCommand.x).to.be.lessThan(firstPageLeft)

      const pageNumberCommand = snapshot.commandList.find((command: any) => {
        return command.type === 'fillText' && command.fillStyle === '#987654'
      }) as any
      expect(pageNumberCommand.x).to.eq(left)

      const pageOnePosition = draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => position.pageNo === pageNo && position.isFirstLetter)
      expect(pageOnePosition.coordinate.leftTop[0]).to.eq(left)

      const headerCommand = snapshot.commandList.find((command: any) => {
        return command.type === 'fillText' && command.fillStyle === '#112233'
      }) as any
      expect(headerCommand.x).to.eq(left)

      const footerCommand = snapshot.commandList.find((command: any) => {
        return command.type === 'fillText' && command.fillStyle === '#332211'
      }) as any
      expect(footerCommand.x).to.eq(left)
    })
  })

  /** 覆盖 TS-04 局部行测量跨页后继续读取真实页码高度，避免输入 patch 仍沿用首页高度。 */
  it('measures row layout with page specific main height after local page break', () => {
    cy.getEditor().then((editor: any) => {
      const draw = (editor as any).draw
      const originalGetMainOuterHeight = draw.getMainOuterHeight.bind(draw)
      const visitedPageNoList: number[] = []
      draw.getMainOuterHeight = (pageNo = 0) => {
        visitedPageNoList.push(pageNo)
        return originalGetMainOuterHeight(pageNo)
      }

      try {
        const rowList = draw.computeRowList({
          startX: 0,
          startY: 0,
          pageHeight: 80,
          mainOuterHeight: 20,
          startPageNo: 5,
          isPagingPageMode: true,
          innerWidth: 10,
          surroundElementList: [],
          elementList: Array.from({ length: 40 }, (_, index) => ({
            value: index % 2 ? '测' : '试'
          }))
        })

        expect(rowList.length).to.be.greaterThan(1)
        expect(visitedPageNoList).to.include(6)
      } finally {
        draw.getMainOuterHeight = originalGetMainOuterHeight
      }
    })
  })

  /** 覆盖 TS-04 SVG 打印读取 pageMetricList 中的目标页边距，而不是用首页或 options 兜底。 */
  it('exports SVG page decorations with page specific mirrored margins', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        margins: [10, 20, 30, 40],
        gutter: 6,
        gutterPosition: 'inside',
        mirrorMargins: true,
        pageBorder: {
          disabled: false,
          padding: [0, 0, 0, 0],
          lineWidth: 1,
          color: '#123456'
        },
        pageNumber: {
          disabled: false,
          color: '#987654',
          rowFlex: 'left',
          format: '{pageNo}',
          fromPageNo: 0,
          startPageNo: 1
        }
      })

      const draw = (editor as any).draw
      const svgPageList = createPrintSvgPageListFromDocument({
        mainPositionList: [],
        pageRowList: [[], []],
        editorOptions: draw.getOptions(),
        pageMetricList: [0, 1].map(pageNo => ({
          margins: draw.getMargins(pageNo),
          innerWidth: draw.getInnerWidth(pageNo),
          headerExtraHeight: draw.getHeader().getExtraHeight(),
          footerExtraHeight: draw.getFooter().getExtraHeight()
        })),
        pageCount: 2,
        width: draw.getWidth(),
        height: draw.getHeight(),
        direction: draw.getOptions().paperDirection
      })

      const parseSvg = (svg: string) =>
        new DOMParser().parseFromString(svg, 'image/svg+xml')
      const pageZeroDoc = parseSvg(svgPageList[0])
      const pageOneDoc = parseSvg(svgPageList[1])
      const pageZeroLeft = editor.command.getPaperMargin(0)[3]
      const pageOneMargins = editor.command.getPaperMargin(1)
      const pageOneLeft = pageOneMargins[3]
      const pageOneRight = pageOneMargins[1]

      expect(
        Number(pageZeroDoc.querySelector('text[fill="#987654"]')?.getAttribute('x'))
      ).to.eq(pageZeroLeft)
      expect(
        Number(pageOneDoc.querySelector('text[fill="#987654"]')?.getAttribute('x'))
      ).to.eq(pageOneLeft)
      expect(
        Number(pageOneDoc.querySelector('rect[stroke="#123456"]')?.getAttribute('x'))
      ).to.eq(pageOneLeft)
      expect(
        Number(pageOneDoc.querySelector('rect[stroke="#123456"]')?.getAttribute('width'))
      ).to.eq(draw.getWidth() - pageOneLeft - pageOneRight)
    })
  })

  /** 覆盖 TS-04 页眉页脚全宽分隔线按当前页边距绘制。 */
  it('draws header separator with page specific mirrored margins', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        margins: [10, 20, 30, 40],
        gutter: 6,
        gutterPosition: 'inside',
        mirrorMargins: true
      })

      const draw = (editor as any).draw
      const pathCalls: Array<{ name: string; args: number[] }> = []
      const ctx = {
        save() {},
        restore() {},
        setLineDash() {},
        translate() {},
        beginPath() {},
        moveTo(...args: number[]) {
          pathCalls.push({ name: 'moveTo', args })
        },
        lineTo(...args: number[]) {
          pathCalls.push({ name: 'lineTo', args })
        },
        stroke() {},
        set lineWidth(_value: number) {},
        get lineWidth() {
          return 1
        },
        set strokeStyle(_value: string) {}
      }
      const pageNo = 1
      const [, right, , left] = editor.command.getPaperMargin(pageNo)
      const edgeGap =
        draw.getServices().metricsService.getMarginIndicatorSize() / 4

      draw.getComponents().separatorParticle.render(
        ctx as any,
        {
          value: '',
          width: draw.getInnerWidth(pageNo) / draw.getOptions().scale
        },
        0,
        0,
        'header',
        pageNo
      )

      expect(pathCalls.find(call => call.name === 'moveTo')?.args[0]).to.eq(
        left + edgeGap
      )
      expect(pathCalls.find(call => call.name === 'lineTo')?.args[0]).to.eq(
        draw.getWidth() - right - edgeGap
      )
    })
  })

  /** 覆盖 TS-03/TS-11 浮动图片导出和渲染使用布局缓存坐标，而不是陈旧元素坐标。 */
  it('renders floating images from float position coordinates across SVG worker and canvas paths', () => {
    cy.getEditor().then((editor: any) => {
      const element = {
        id: 'stale-floating-image',
        type: ElementType.IMAGE,
        value: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
        width: 20,
        height: 10,
        imgDisplay: ImageDisplay.FLOAT_TOP,
        imgFloatPosition: {
          pageNo: 0,
          x: 12,
          y: 14
        }
      }
      const floatPosition = {
        pageNo: 0,
        element,
        position: {
          pageNo: 0,
          index: 0,
          value: element.value,
          element,
          rowIndex: 0,
          rowNo: 0,
          ascent: 0,
          lineHeight: 10,
          left: 0,
          metrics: {
            width: 20,
            height: 10,
            boundingBoxAscent: 10,
            boundingBoxDescent: 0
          },
          isFirstLetter: true,
          isLastLetter: true,
          coordinate: {
            leftTop: [46, 28],
            leftBottom: [46, 38],
            rightTop: [66, 28],
            rightBottom: [66, 38]
          }
        }
      }

      const workerRect = resolveWorkerSnapshotFloatingImageRect({
        pageNo: 0,
        floatPosition,
        imageLayerList: [ImageDisplay.FLOAT_TOP],
        scale: 1
      })
      expect(workerRect).to.deep.eq({
        x: 46,
        y: 28,
        width: 20,
        height: 10
      })

      const [svg] = createPrintSvgPageListFromDocument({
        mainPositionList: [],
        floatPositionList: [floatPosition],
        pageCount: 1,
        pageRowList: [[]],
        editorOptions: {
          ...editor.draw.getOptions(),
          scale: 1
        },
        width: 120,
        height: 80
      })
      const svgDoc = new DOMParser().parseFromString(svg, 'image/svg+xml')
      const image = svgDoc.querySelector('image')
      expect(Number(image?.getAttribute('x'))).to.eq(46)
      expect(Number(image?.getAttribute('y'))).to.eq(28)

      const renderCalls: Array<{ x: number; y: number }> = []
      const renderer = new FloatImageRenderer({
        getOptions: () => ({ scale: 1 }),
        getCoordinate: () => ({
          getFloatPositionList: () => [floatPosition]
        }),
        getImageParticle: () => ({
          render(
            _ctx: CanvasRenderingContext2D,
            _element: unknown,
            x: number,
            y: number
          ) {
            renderCalls.push({ x, y })
          }
        })
      } as any)
      renderer.drawFloat({} as CanvasRenderingContext2D, {
        pageNo: 0,
        imgDisplays: [ImageDisplay.FLOAT_TOP]
      })
      expect(renderCalls).to.deep.eq([{ x: 46, y: 28 }])

      const surroundElement = {
        ...element,
        id: 'surround-floating-image',
        imgDisplay: ImageDisplay.SURROUND
      }
      const surroundFloatPosition = {
        ...floatPosition,
        element: surroundElement,
        position: {
          ...floatPosition.position,
          element: surroundElement
        }
      }
      const surroundWorkerRect = resolveWorkerSnapshotFloatingImageRect({
        pageNo: 0,
        floatPosition: surroundFloatPosition,
        imageLayerList: [ImageDisplay.SURROUND],
        scale: 1
      })
      expect(surroundWorkerRect).to.deep.eq({
        x: 12,
        y: 14,
        width: 20,
        height: 10
      })

      const [surroundSvg] = createPrintSvgPageListFromDocument({
        mainPositionList: [],
        floatPositionList: [surroundFloatPosition],
        pageCount: 1,
        pageRowList: [[]],
        editorOptions: {
          ...editor.draw.getOptions(),
          scale: 1
        },
        width: 120,
        height: 80
      })
      const surroundSvgDoc = new DOMParser().parseFromString(
        surroundSvg,
        'image/svg+xml'
      )
      const surroundImage = surroundSvgDoc.querySelector('image')
      expect(Number(surroundImage?.getAttribute('x'))).to.eq(12)
      expect(Number(surroundImage?.getAttribute('y'))).to.eq(14)

      const surroundRenderCalls: Array<{ x: number; y: number }> = []
      const surroundRenderer = new FloatImageRenderer({
        getOptions: () => ({ scale: 1 }),
        getCoordinate: () => ({
          getFloatPositionList: () => [surroundFloatPosition]
        }),
        getImageParticle: () => ({
          render(
            _ctx: CanvasRenderingContext2D,
            _element: unknown,
            x: number,
            y: number
          ) {
            surroundRenderCalls.push({ x, y })
          }
        })
      } as any)
      surroundRenderer.drawFloat({} as CanvasRenderingContext2D, {
        pageNo: 0,
        imgDisplays: [ImageDisplay.SURROUND]
      })
      expect(surroundRenderCalls).to.deep.eq([{ x: 12, y: 14 }])

      const tightElement = {
        ...element,
        id: 'tight-floating-image',
        imgDisplay: ImageDisplay.TIGHT
      }
      const tightFloatPosition = {
        ...floatPosition,
        element: tightElement,
        position: {
          ...floatPosition.position,
          element: tightElement
        }
      }
      expect(
        resolveWorkerSnapshotFloatingImageRect({
          pageNo: 0,
          floatPosition: tightFloatPosition,
          imageLayerList: [ImageDisplay.TIGHT],
          scale: 1
        })
      ).to.deep.eq({
        x: 12,
        y: 14,
        width: 20,
        height: 10
      })

      const [tightSvg] = createPrintSvgPageListFromDocument({
        mainPositionList: [],
        floatPositionList: [tightFloatPosition],
        pageCount: 1,
        pageRowList: [[]],
        editorOptions: {
          ...editor.draw.getOptions(),
          scale: 1
        },
        width: 120,
        height: 80
      })
      const tightSvgDoc = new DOMParser().parseFromString(
        tightSvg,
        'image/svg+xml'
      )
      const tightImage = tightSvgDoc.querySelector('image')
      expect(Number(tightImage?.getAttribute('x'))).to.eq(12)
      expect(Number(tightImage?.getAttribute('y'))).to.eq(14)

      const tightRenderCalls: Array<{ x: number; y: number }> = []
      const tightRenderer = new FloatImageRenderer({
        getOptions: () => ({ scale: 1 }),
        getCoordinate: () => ({
          getFloatPositionList: () => [tightFloatPosition]
        }),
        getImageParticle: () => ({
          render(
            _ctx: CanvasRenderingContext2D,
            _element: unknown,
            x: number,
            y: number
          ) {
            tightRenderCalls.push({ x, y })
          }
        })
      } as any)
      tightRenderer.drawFloat({} as CanvasRenderingContext2D, {
        pageNo: 0,
        imgDisplays: [ImageDisplay.TIGHT]
      })
      expect(tightRenderCalls).to.deep.eq([{ x: 12, y: 14 }])
    })
  })

  /** 覆盖 TS-03/TS-11 隐藏浮动图片不会进入 worker、SVG 或 canvas 浮动层。 */
  it('skips hidden floating images across SVG worker and canvas paths', () => {
    cy.getEditor().then((editor: any) => {
      ;[ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND].forEach(
        (imgDisplay, index) => {
          const element = {
            id: `hidden-floating-image-${imgDisplay}`,
            type: ElementType.IMAGE,
            value: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
            width: 20,
            height: 10,
            hide: true,
            imgDisplay,
            imgFloatPosition: {
              pageNo: 0,
              x: 12,
              y: 14
            }
          }
          const floatPosition = {
            pageNo: 0,
            element,
            position: {
              pageNo: 0,
              index,
              value: element.value,
              element,
              rowIndex: 0,
              rowNo: 0,
              ascent: 0,
              lineHeight: 10,
              left: 0,
              metrics: {
                width: 20,
                height: 10,
                boundingBoxAscent: 10,
                boundingBoxDescent: 0
              },
              isFirstLetter: true,
              isLastLetter: true,
              coordinate: {
                leftTop: [46, 28],
                leftBottom: [46, 38],
                rightTop: [66, 28],
                rightBottom: [66, 38]
              }
            }
          }

          const workerRect = resolveWorkerSnapshotFloatingImageRect({
            pageNo: 0,
            floatPosition,
            imageLayerList: [imgDisplay],
            scale: 1
          })
          expect(workerRect).to.eq(null)

          const [svg] = createPrintSvgPageListFromDocument({
            mainPositionList: [],
            floatPositionList: [floatPosition],
            pageCount: 1,
            pageRowList: [[]],
            editorOptions: {
              ...editor.draw.getOptions(),
              scale: 1
            },
            width: 120,
            height: 80
          })
          const svgDoc = new DOMParser().parseFromString(svg, 'image/svg+xml')
          expect(svgDoc.querySelector('image')).to.eq(null)

          const renderCalls: Array<{ x: number; y: number }> = []
          const renderer = new FloatImageRenderer({
            getOptions: () => ({ scale: 1 }),
            getCoordinate: () => ({
              getFloatPositionList: () => [floatPosition]
            }),
            getImageParticle: () => ({
              render(
                _ctx: CanvasRenderingContext2D,
                _element: unknown,
                x: number,
                y: number
              ) {
                renderCalls.push({ x, y })
              }
            })
          } as any)
          renderer.drawFloat({} as CanvasRenderingContext2D, {
            pageNo: 0,
            imgDisplays: [imgDisplay]
          })
          expect(renderCalls).to.deep.eq([])
        }
      )
    })
  })

  /** 覆盖 TS-03/TS-11 连页高度使用浮动位置缓存坐标，而不是陈旧元素坐标。 */
  it('measures continuous page height from float position coordinates', () => {
    cy.getEditor().then((editor: any) => {
      const element = {
        id: 'stale-floating-image-height',
        type: ElementType.IMAGE,
        value: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
        width: 20,
        height: 10,
        imgDisplay: ImageDisplay.FLOAT_TOP,
        imgFloatPosition: {
          pageNo: 0,
          x: 12,
          y: 14
        }
      }
      const floatPosition = {
        pageNo: 0,
        element,
        position: {
          pageNo: 0,
          index: 0,
          value: element.value,
          element,
          rowIndex: 0,
          rowNo: 0,
          ascent: 0,
          lineHeight: 10,
          left: 0,
          metrics: {
            width: 20,
            height: 10,
            boundingBoxAscent: 10,
            boundingBoxDescent: 0
          },
          isFirstLetter: true,
          isLastLetter: true,
          coordinate: {
            leftTop: [46, 128],
            leftBottom: [46, 138],
            rightTop: [66, 128],
            rightBottom: [66, 138]
          }
        }
      }

      const layoutPipeline = new DrawLayoutPipeline({
        getIsPagingMode: () => false,
        getMargins: () => [0, 0, 10, 0],
        getRuntime: () => ({
          getOptions: () => ({ scale: 1 })
        }),
        getCoordinate: () => ({
          getMainPositionList: () => [],
          getFloatPositionList: () => [floatPosition]
        }),
        getObjectResolver: () => ({
          getLayoutMainElementList: () => []
        })
      } as any)

      expect((layoutPipeline as any).resolveContinuousPageHeight(80)).to.eq(148)

      let resizedHeight = 0
      const finalizeService = new DrawRenderFinalizeService({
        getOptions: () => ({
          ...editor.draw.getOptions(),
          pageMode: PageMode.CONTINUITY,
          scale: 1,
          footer: {
            disabled: true
          }
        }),
        getMargins: () => [0, 0, 10, 0],
        getMainOuterHeight: () => 0,
        getHeight: () => 80,
        getObjectResolver: () => ({
          getRowList: () => [],
          getLayoutMainElementList: () => []
        }),
        getCoordinate: () => ({
          getMainPositionList: () => [],
          getFloatPositionList: () => [floatPosition]
        }),
        getPageCanvasHost: () => ({
          resizeContinuousPage(
            _pageNo: number,
            height: number
          ) {
            resizedHeight = height
          }
        })
      } as any)

      finalizeService.syncContinuousPageHeight()
      expect(resizedHeight).to.eq(148)
    })
  })

})
