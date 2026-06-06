import type Editor from '../../../src/editor'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { getFrontFloatImageHitDisplays } from '../../../src/editor/core/modules/image/hittest/ImageHitTestPolicy'
import {
  getWorkerSnapshotTopFloatImageLayerList,
  isWorkerSnapshotFloatingImage,
  resolveFloatingImageRenderPosition,
  resolveWorkerSnapshotFloatingImageRect
} from '../../../src/editor/core/modules/image/render/WorkerSnapshotImageRenderPolicy'

const imageDataUrl =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">' +
      '<rect width="80" height="60" fill="#0f766e"/>' +
      '<rect x="8" y="8" width="64" height="44" fill="#5eead4"/>' +
      '</svg>'
  )

function buildSurroundDocument() {
  return [
    { value: '\u200B' },
    {
      id: 'surround-image',
      value: imageDataUrl,
      type: 'image',
      width: 80,
      height: 60,
      imgDisplay: 'surround',
      imgFloatPosition: {
        pageNo: 0,
        x: 120,
        y: 120
      }
    },
    {
      value:
        'Surround image wrapping should keep this text beside the floating image instead of letting the image cover the characters.',
      size: 16
    }
  ]
}

function buildMultiColumnSurroundDocument() {
  return [
    ...Array.from({ length: 16 }).flatMap((_, index) => [
      { value: `双栏前置正文第${index + 1}行` },
      { value: '\n' }
    ]),
    {
      id: 'surround-column-image',
      value: imageDataUrl,
      type: 'image',
      width: 80,
      height: 60,
      imgDisplay: 'surround',
      imgFloatPosition: {
        pageNo: 0,
        x: 230,
        y: 132
      }
    },
    {
      value:
        '双栏中的环绕图片只应让同栏文字避让，不应把其他栏的文字也挤进图片盒里。'.repeat(
          3
        ),
      size: 16
    }
  ]
}

function buildTightDocument() {
  return [
    { value: '\u200B' },
    {
      id: 'tight-image',
      value: imageDataUrl,
      type: 'image',
      width: 80,
      height: 60,
      imgDisplay: ImageDisplay.TIGHT,
      imgFloatPosition: {
        pageNo: 0,
        x: 120,
        y: 120
      }
    },
    {
      value:
        'Tight image wrapping should share the same top floating support set as surround images.',
      size: 16
    }
  ]
}

function buildLocalTypingWrapDocument(display: ImageDisplay) {
  return [
    { value: '\u200B' },
    {
      id: `local-typing-${display}-image`,
      value: imageDataUrl,
      type: 'image',
      width: 80,
      height: 60,
      imgDisplay: display,
      imgFloatPosition: {
        pageNo: 0,
        x: 120,
        y: 120
      }
    },
    {
      value:
        'Local typing should keep every previewed and patched character outside the active wrap box.',
      size: 16
    }
  ]
}

function buildHiddenSurroundDocument() {
  return [
    { value: '\u200B' },
    {
      id: 'hidden-surround-image',
      value: imageDataUrl,
      type: 'image',
      width: 80,
      height: 60,
      hide: true,
      imgDisplay: 'surround',
      imgFloatPosition: {
        pageNo: 0,
        x: 120,
        y: 120
      }
    },
    {
      value: 'Hidden surround images should not reserve wrapping space.',
      size: 16
    }
  ]
}

function buildOverlappingFrontFloatDocument(displays: ImageDisplay[]) {
  return [
    { value: '\u200B' },
    ...displays.map((display, index) => ({
      id: `overlap-float-${index}`,
      value: imageDataUrl,
      type: 'image',
      width: 80,
      height: 60,
      imgDisplay: display,
      imgFloatPosition: {
        pageNo: 0,
        x: 120,
        y: 120
      }
    })),
    { value: 'overlapping floating images should hit the top visual layer.' }
  ]
}

function findFirstTextPosition(editor: Editor) {
  const positionList = editor.draw.getCoordinate().getOriginalPositionList()
  const position = positionList.find(
    item => !item.element.type && item.element.value.trim()
  )
  if (!position) {
    throw new Error('text position not found')
  }
  return position
}

function findSurroundTextPositionAfterImage(editor: Editor, imageId: string) {
  const positionList = editor.draw.getCoordinate().getMainPositionList()
  const imageIndex = editor.draw
    .getObjectResolver()
    .getLayoutMainElementList()
    .findIndex((element: any) => element.id === imageId)
  const position = positionList.find((item: any) => {
    const row = editor.draw.getPageRowList()[item.pageNo]?.[item.rowNo]
    return (
      item.index > imageIndex &&
      row?.isSurround &&
      !item.element?.type &&
      item.element?.value !== '\u200B' &&
      String(item.element?.value || '').trim()
    )
  })
  if (!position) {
    throw new Error(`surround text position after ${imageId} not found`)
  }
  return position
}

function resolveFloatImageRect(editor: Editor, imageId: string) {
  const draw = editor.draw
  const imageElement = draw
    .getObjectResolver()
    .getLayoutMainElementList()
    .find((element: any) => element.id === imageId)
  const floatPosition = draw
    .getCoordinate()
    .getFloatPositionList()
    .find((position: any) => position.element.id === imageId)
  expect(imageElement, `${imageId} 图片元素必须存在`).to.exist
  expect(floatPosition, `${imageId} 浮动 position 必须存在`).to.exist
  if (!imageElement || !floatPosition) {
    throw new Error(`${imageId} float image not found`)
  }
  const scale = draw.getRuntime().getOptions().scale
  const renderPosition = resolveFloatingImageRenderPosition({
    floatPosition,
    scale
  })
  expect(renderPosition, `${imageId} 绘制坐标必须存在`).to.exist
  if (!renderPosition) {
    throw new Error(`${imageId} render position not found`)
  }
  return {
    pageNo: floatPosition.pageNo,
    x: renderPosition.x,
    y: renderPosition.y,
    width: imageElement.width * scale,
    height: imageElement.height * scale
  }
}

function assertNoTextPositionInsideRect(
  editor: Editor,
  rect: { pageNo: number; x: number; y: number; width: number; height: number },
  label: string
) {
  const overlapPositionList = editor.draw
    .getCoordinate()
    .getMainPositionList()
    .filter((position: any) => {
      return (
        position.pageNo === rect.pageNo &&
        !position.element?.type &&
        position.element?.value !== '\u200B' &&
        String(position.element?.value || '').trim() &&
        isPositionInsideRect(position, rect)
      )
    })

  expect(
    overlapPositionList.map((position: any) => ({
      index: position.index,
      value: position.element?.value,
      leftTop: position.coordinate.leftTop,
      rightBottom: position.coordinate.rightBottom
    })),
    label
  ).to.have.length(0)
}

function summarizeTypingStats(stats: any) {
  return JSON.stringify({
    typingPreview: stats.typingPreview,
    chunkLayout: {
      patchSuccessCount: stats.chunkLayout.patchSuccessCount,
      patchFailCount: stats.chunkLayout.patchFailCount,
      lastFailReason: stats.chunkLayout.lastFailReason,
      pageRebalanceSyncPatchCount:
        stats.chunkLayout.pageRebalanceSyncPatchCount
    },
    typingLinePatch: stats.typingLinePatch,
    layout: {
      computeCount: stats.layout.computeCount
    }
  })
}

function getUnsafeLocalPatchCount(stats: any) {
  const nonPageChunkPatchCount = Math.max(
    0,
    stats.chunkLayout.patchSuccessCount -
      stats.chunkLayout.pageRebalanceSyncPatchCount -
      stats.chunkLayout.pageRebalanceAsyncPatchCount
  )
  return nonPageChunkPatchCount + stats.typingLinePatch.patchSuccessCount
}

function isPositionInsideRect(
  position: { coordinate: any },
  rect: { x: number; y: number; width: number; height: number }
) {
  const { coordinate } = position
  return !(
    coordinate.rightTop[0] <= rect.x ||
    coordinate.leftTop[0] >= rect.x + rect.width ||
    coordinate.leftBottom[1] <= rect.y ||
    coordinate.leftTop[1] >= rect.y + rect.height
  )
}

describe('issues #1372 and #1200 image surround wrapping', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  it('keeps surround text outside the floating image and hits the image first', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: buildSurroundDocument(),
        footer: []
      })

      const imageElement = editor.command
        .getValue({ extraPickAttrs: ['id', 'imgDisplay', 'imgFloatPosition'] })
        .data.main.find(element => element.id === 'surround-image')

      expect(imageElement?.imgDisplay).to.eq('surround')
      expect(imageElement?.imgFloatPosition).to.deep.include({
        pageNo: 0,
        x: 120,
        y: 120
      })

      const firstTextPosition = findFirstTextPosition(editor)
      expect(firstTextPosition.coordinate.leftTop[0]).to.be.greaterThan(195)
      expect(
        editor.draw.getObjectResolver().getRowList().some(row => row.isSurround),
        'row marked as surround'
      ).to.eq(true)

      const floatPosition = editor.draw
        .getCoordinate()
        .getFloatPositionList()
        .find((position: any) => position.element.id === 'surround-image')
      expect(floatPosition, 'surround 图片浮动 position 必须存在').to.exist
      if (!floatPosition) {
        throw new Error('surround image float position not found')
      }
      const renderPosition = resolveFloatingImageRenderPosition({
        floatPosition,
        scale: editor.draw.getRuntime().getOptions().scale
      })
      expect(renderPosition, 'surround 图片绘制坐标必须存在').to.exist
      if (!renderPosition) {
        throw new Error('surround image render position not found')
      }
      const hit = editor.draw.getCoordinate().getFloatPositionByXY({
        x: renderPosition.x + 10,
        y: renderPosition.y + 10,
        pageNo: 0,
        imgDisplays: getFrontFloatImageHitDisplays()
      })

      expect(hit?.isImage).to.eq(true)
      expect(hit?.isDirectHit).to.eq(true)
    })
  })

  it('keeps surround text outside the image box on a multi-column page', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 320,
        margins: [20, 20, 20, 20],
        columns: {
          count: 2,
          gap: 20,
          widths: [160, 160]
        },
        header: {
          disabled: true
        },
        footer: {
          disabled: true
        },
        pageNumber: {
          disabled: true
        }
      })
      editor.command.executeSetValue({
        header: [],
        main: buildMultiColumnSurroundDocument(),
        footer: []
      })

      const draw = editor.draw
      const resolver = draw.getObjectResolver()
      const imageElement = draw
        .getObjectResolver()
        .getLayoutMainElementList()
        .find((element: any) => element.id === 'surround-column-image')
      const imagePosition = draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => {
          return (
            resolver.getLayoutMainElement(position.index)?.id ===
            'surround-column-image'
          )
        })
      const floatPosition = draw
        .getCoordinate()
        .getFloatPositionList()
        .find((position: any) => position.element.id === 'surround-column-image')

      expect(imageElement, 'surround 图片必须存在').to.exist
      expect(imagePosition, 'surround 图片 position 必须存在').to.exist
      expect(floatPosition, 'surround 图片浮动 position 必须存在').to.exist
      if (!floatPosition) {
        throw new Error('surround image float position not found')
      }

      const pageRows = draw.getPageRowList()[floatPosition.pageNo]
      const imageRow = pageRows[imagePosition.rowNo]
      const scale = draw.getRuntime().getOptions().scale
      const renderPosition = resolveFloatingImageRenderPosition({
        floatPosition,
        scale
      })
      expect(renderPosition, 'surround 图片绘制坐标必须存在').to.exist
      if (!renderPosition) {
        throw new Error('surround image render position not found')
      }
      const imageRect = {
        x: renderPosition.x,
        y: renderPosition.y,
        width: imageElement.width * scale,
        height: imageElement.height * scale
      }
      const columnList = draw
        .getServices()
        .pageColumnLayoutService.getPageColumnLayout(
          floatPosition.pageNo,
          imageRow.columns
        )
        .columnList.map((column: any) => ({
          columnIndex: column.index,
          column
        }))
      const imageColumn = columnList.find(({ column }) => {
        return (
          imageRect.x < column.rect.x + column.rect.width &&
          imageRect.x + imageRect.width > column.rect.x
        )
      })
      expect(imageColumn, '应能从当前图片坐标解析图片所在栏').to.exist

      const surroundRows = pageRows.filter((row: any) => row.isSurround)
      if (surroundRows.length) {
        expect(
          new Set(surroundRows.map((row: any) => row.columnIndex || 0)).size,
          '环绕避让行只应落在图片所在栏'
        ).to.eq(1)
        expect(
          surroundRows[0].columnIndex,
          '环绕避让行栏索引应与图片一致'
        ).to.eq(imageColumn?.columnIndex)
      }

      const textPositionList = draw
        .getCoordinate()
        .getMainPositionList()
        .filter((position: any) => {
          return (
            position.pageNo === floatPosition.pageNo &&
            !position.element?.type &&
            position.element?.value !== '\u200B' &&
            String(position.element?.value || '').trim()
          )
        })
      const overlapPositionList = textPositionList.filter((position: any) =>
        isPositionInsideRect(position, imageRect)
      )
      const otherColumn = columnList.find(
        ({ columnIndex }) => columnIndex !== imageColumn?.columnIndex
      )
      expect(otherColumn, '双栏页面必须存在图片之外的另一栏').to.exist
      const otherColumnSameHeightTextPositionList = textPositionList.filter(
        (position: any) => {
          return (
            position.coordinate.leftTop[0] >= otherColumn!.column.rect.x &&
            position.coordinate.leftTop[0] <
              otherColumn!.column.rect.x + otherColumn!.column.rect.width &&
            position.coordinate.leftBottom[1] > imageRect.y &&
            position.coordinate.leftTop[1] < imageRect.y + imageRect.height
          )
        }
      )

      expect(
        overlapPositionList.length,
        JSON.stringify(overlapPositionList.slice(0, 3))
      ).to.eq(0)
      expect(
        otherColumnSameHeightTextPositionList.length,
        '图片之外的另一栏必须存在同高度文字'
      ).to.be.greaterThan(0)
      expect(
        Math.min(
          ...otherColumnSameHeightTextPositionList.map(
            (position: any) => position.coordinate.leftTop[0]
          )
        ),
        '环绕图片不应推开其他栏同高度文字'
      ).to.be.lessThan(otherColumn!.column.rect.x + 40)
      const hit = draw.getCoordinate().getFloatPositionByXY({
        x: imageRect.x + imageRect.width / 2,
        y: imageRect.y + imageRect.height / 2,
        pageNo: floatPosition.pageNo,
        imgDisplays: getFrontFloatImageHitDisplays()
      })
      expect(
        hit?.isImage,
        '图片盒内命中应保持图片直接命中'
      ).to.eq(true)
      expect(hit?.isDirectHit).to.eq(true)
    })
  })

  it('treats tight as a top surround-class floating image in worker and hit policies', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: buildTightDocument(),
        footer: []
      })

      expect(getWorkerSnapshotTopFloatImageLayerList()).to.include(
        ImageDisplay.TIGHT
      )
      expect(getFrontFloatImageHitDisplays()).to.include(ImageDisplay.TIGHT)
      expect(
        findFirstTextPosition(editor).coordinate.leftTop[0],
        'tight 图片应参与环绕避让'
      ).to.be.greaterThan(195)

      const draw = editor.draw
      const tightElement = draw
        .getObjectResolver()
        .getLayoutMainElementList()
        .find((element: any) => element.id === 'tight-image')
      const floatPosition = draw
        .getCoordinate()
        .getFloatPositionList()
        .find((position: any) => position.element.id === 'tight-image')

      expect(tightElement, 'tight 图片必须存在').to.exist
      expect(floatPosition, 'tight 图片浮动 position 必须存在').to.exist
      if (!tightElement || !floatPosition) {
        throw new Error('tight image layout not found')
      }
      const renderPosition = resolveFloatingImageRenderPosition({
        floatPosition,
        scale: draw.getRuntime().getOptions().scale
      })
      expect(renderPosition, 'tight 图片绘制坐标必须存在').to.exist
      if (!renderPosition) {
        throw new Error('tight image render position not found')
      }
      expect(isWorkerSnapshotFloatingImage(tightElement)).to.eq(true)
      expect(
        resolveWorkerSnapshotFloatingImageRect({
          pageNo: 0,
          floatPosition,
          imageLayerList: getWorkerSnapshotTopFloatImageLayerList(),
          scale: draw.getRuntime().getOptions().scale
        })
      ).to.deep.eq({
        x: renderPosition.x,
        y: renderPosition.y,
        width: 80,
        height: 60
      })
      const hit = draw.getCoordinate().getFloatPositionByXY({
        x: renderPosition.x + 10,
        y: renderPosition.y + 10,
        pageNo: 0,
        imgDisplays: getFrontFloatImageHitDisplays()
      })
      expect(
        hit?.isImage,
        'tight 图片盒内命中应保持图片直接命中'
      ).to.eq(true)
      expect(hit?.isDirectHit).to.eq(true)
    })
  })

  it('keeps DOM typing stable without unsafe local patch on surround and tight rows', () => {
    cy.getEditor().then((editor: Editor) => {
      const runFallbackCase = (display: ImageDisplay) => {
        const imageId = `local-typing-${display}-image`
        editor.command.executeSetValue({
          header: [],
          main: buildLocalTypingWrapDocument(display),
          footer: []
        })
        const wrapRect = resolveFloatImageRect(editor, imageId)
        const textPosition = findSurroundTextPositionAfterImage(editor, imageId)

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(textPosition.index, textPosition.index)
        return cy
          .get('.ce-inputarea')
          .type('x', { force: true, delay: 0 })
          .then(() => cy.wrap(null, { timeout: 20000 }))
          .should(() => {
            const stats = editor.getRenderBackendStats()

            expect(
              getUnsafeLocalPatchCount(stats),
              `${display} DOM 环绕行输入不应走 chunk/line 局部 patch ${summarizeTypingStats(stats)}`
            ).to.eq(0)
            expect(
              stats.typingPreview.lastFailReason,
              `${display} typing preview 应识别环绕行并跳过 ${summarizeTypingStats(stats)}`
            ).to.eq('line-surround-row')
            expect(
              stats.layout.computeCount +
                stats.chunkLayout.pageRebalanceSyncPatchCount,
              `${display} DOM 输入应回退完整 layout 或由页级重排稳定接管 ${summarizeTypingStats(stats)}`
            ).to.be.greaterThan(0)
          })
          .then(() => {
            assertNoTextPositionInsideRect(
              editor,
              wrapRect,
              `${display} DOM 局部输入后正文不应落入环绕盒`
            )
          })
      }

      return runFallbackCase(ImageDisplay.SURROUND).then(() =>
        runFallbackCase(ImageDisplay.TIGHT)
      )
    })
  })

  it('skips typing preview when cursor is already on surround and tight rows', () => {
    cy.getEditor().then((editor: Editor) => {
      const runPreviewCase = (display: ImageDisplay) => {
        const imageId = `local-typing-${display}-image`
        editor.command.executeSetValue({
          header: [],
          main: buildLocalTypingWrapDocument(display),
          footer: []
        })
        const wrapRect = resolveFloatImageRect(editor, imageId)
        const textPosition = findSurroundTextPositionAfterImage(editor, imageId)
        const sourceRow = editor.draw.getPageRowList()[textPosition.pageNo]?.[
          textPosition.rowNo
        ]
        expect(
          sourceRow?.isSurround,
          `${display} preview 旧行应命中环绕行`
        ).to.eq(true)
        const pageRenderer = editor.draw.getServices().pageRenderer
        const originalRenderTypingChunkPreview =
          pageRenderer.renderTypingChunkPreview.bind(pageRenderer)
        const previewCursorList: any[] = []

        pageRenderer.renderTypingChunkPreview = (payload: any) => {
          const rendered = originalRenderTypingChunkPreview(payload)
          const cursorPosition = editor.draw
            .getCoordinate()
            .getCursorPosition()
          previewCursorList.push({
            rendered,
            cursorPosition: cursorPosition
              ? {
                  pageNo: cursorPosition.pageNo,
                  coordinate: cursorPosition.coordinate
                }
              : null
          })
          return rendered
        }

        editor.resetRenderBackendStats()
        editor.command.executeSetRange(textPosition.index, textPosition.index)
        return cy
          .get('.ce-inputarea')
          .type('W', { force: true, delay: 0 })
          .then(() => {
            pageRenderer.renderTypingChunkPreview =
              originalRenderTypingChunkPreview
            const stats = editor.getRenderBackendStats()
            const renderedPreview = previewCursorList.find(item => item.rendered)
            expect(
              renderedPreview,
              `${display} 环绕行 typing preview 不应局部渲染 ${summarizeTypingStats(stats)}`
            ).to.not.exist
            expect(
              stats.typingPreview.lastFailReason,
              `${display} typing preview 应识别环绕行 ${summarizeTypingStats(stats)}`
            ).to.eq('line-surround-row')
            assertNoTextPositionInsideRect(
              editor,
              wrapRect,
              `${display} preview 回退后正式布局正文不应落入环绕盒`
            )
          })
      }

      return runPreviewCase(ImageDisplay.SURROUND).then(() =>
        runPreviewCase(ImageDisplay.TIGHT)
      )
    })
  })

  it('ignores hidden surround images in layout cache hit-test and worker policy', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: buildHiddenSurroundDocument(),
        footer: []
      })

      const draw = editor.draw
      const hiddenElement = draw
        .getObjectResolver()
        .getLayoutMainElementList()
        .find((element: any) => element.id === 'hidden-surround-image')
      const hiddenFloatPosition = draw
        .getCoordinate()
        .getFloatPositionList()
        .find((position: any) => position.element.id === 'hidden-surround-image')

      expect(hiddenElement, '隐藏环绕图片元素必须存在').to.exist
      expect(hiddenFloatPosition, '隐藏环绕图片不应进入浮动缓存').to.not.exist
      expect(
        findFirstTextPosition(editor).coordinate.leftTop[0],
        '隐藏环绕图片不应推开正文'
      ).to.be.lessThan(140)
      expect(
        draw.getObjectResolver().getRowList().some(row => row.isSurround),
        '隐藏环绕图片不应标记环绕行'
      ).to.eq(false)
      expect(isWorkerSnapshotFloatingImage(hiddenElement)).to.eq(false)

      const hit = draw.getCoordinate().getFloatPositionByXY({
        x: 130,
        y: 130,
        pageNo: 0,
        imgDisplays: getFrontFloatImageHitDisplays()
      })
      expect(hit, '隐藏环绕图片不应被命中').to.eq(undefined)
    })
  })

  it('refreshes surround layout cache when a floating image is hidden and shown by id', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: buildSurroundDocument(),
        footer: []
      })

      const findFloatPosition = () =>
        editor.draw
          .getCoordinate()
          .getFloatPositionList()
          .find((position: any) => position.element.id === 'surround-image')
      const hitImage = () =>
        editor.draw.getCoordinate().getFloatPositionByXY({
          x: 130,
          y: 130,
          pageNo: 0,
          imgDisplays: getFrontFloatImageHitDisplays()
        })

      expect(findFloatPosition(), '显示状态应进入浮动缓存').to.exist
      expect(
        findFirstTextPosition(editor).coordinate.leftTop[0],
        '显示状态应触发环绕避让'
      ).to.be.greaterThan(195)
      expect(hitImage()?.isDirectHit, '显示状态应可直接命中图片').to.eq(true)

      editor.command.executeUpdateElementById({
        id: 'surround-image',
        properties: { hide: true }
      })
      expect(findFloatPosition(), '隐藏后应移出浮动缓存').to.not.exist
      expect(
        findFirstTextPosition(editor).coordinate.leftTop[0],
        '隐藏后不应继续占用环绕空间'
      ).to.be.lessThan(140)
      expect(hitImage(), '隐藏后不应继续命中图片').to.eq(undefined)

      editor.command.executeUpdateElementById({
        id: 'surround-image',
        properties: { hide: false }
      })
      expect(findFloatPosition(), '重新显示后应恢复浮动缓存').to.exist
      expect(
        findFirstTextPosition(editor).coordinate.leftTop[0],
        '重新显示后应恢复环绕避让'
      ).to.be.greaterThan(195)
      expect(hitImage()?.isDirectHit, '重新显示后应恢复图片直接命中').to.eq(true)
    })
  })

  it('hits the latest drawn front floating image when front images overlap', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: buildOverlappingFrontFloatDocument([
          ImageDisplay.SURROUND,
          ImageDisplay.TIGHT
        ]),
        footer: []
      })

      const hit = editor.draw.getCoordinate().getFloatPositionByXY({
        x: 130,
        y: 130,
        pageNo: 0,
        imgDisplays: getFrontFloatImageHitDisplays()
      })
      expect(hit?.isDirectHit, '重叠区域应直接命中前景浮动图').to.eq(true)
      expect(
        editor.draw.getObjectResolver().getLayoutMainElement(hit!.index)?.id,
        '后绘制的 TIGHT 应作为视觉最上层被命中'
      ).to.eq('overlap-float-1')

      editor.command.executeSetValue({
        header: [],
        main: buildOverlappingFrontFloatDocument([
          ImageDisplay.TIGHT,
          ImageDisplay.SURROUND
        ]),
        footer: []
      })
      const reverseHit = editor.draw.getCoordinate().getFloatPositionByXY({
        x: 130,
        y: 130,
        pageNo: 0,
        imgDisplays: getFrontFloatImageHitDisplays()
      })
      expect(reverseHit?.isDirectHit, '反向顺序也应命中后绘制图片').to.eq(true)
      expect(
        editor.draw
          .getObjectResolver()
          .getLayoutMainElement(reverseHit!.index)?.id,
        '后绘制的 SURROUND 应作为视觉最上层被命中'
      ).to.eq('overlap-float-1')
    })
  })
})
