import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { getFrontFloatImageHitDisplays } from '../../../src/editor/core/modules/image/hittest/ImageHitTestPolicy'
import {
  dragFloatingImageOnHover,
  isFloatingImageElement,
  isSurroundImageElement,
  moveDraggedImagePosition,
  shouldSkipDragCursorForFloatingImage
} from '../../../src/editor/core/modules/image/interaction/ImageDragInteraction'
import { handleImageSelectionStart } from '../../../src/editor/core/modules/image/interaction/handleImageSelectionStart'

/** 覆盖 TS-03-B：内联图片在多栏中应按栏宽自适应。 */
describe('typesetting page columns inline image width', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().should('have.length', 1)
  })

  /** 图片原始宽度超过栏宽时，应等比缩放并保持 position 在当前栏内。 */
  it('keeps an inline image inside the current column bounds', () => {
    cy.getEditor().then((editor: any) => {
      const prefix = Array.from({ length: 6 }).flatMap((_, index) => [
        { value: `填充${index + 1}` },
        { value: '\n' }
      ])

      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
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
        main: [
          ...prefix,
          {
            id: 'column-inline-image',
            type: ElementType.IMAGE,
            value:
              'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
            width: 260,
            height: 120,
            imgDisplay: ImageDisplay.INLINE
          }
        ]
      })

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const resolver = editor.draw.getObjectResolver()
      const imagePosition = editor.draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => {
          return resolver.getLayoutMainElement(position.index)?.id === 'column-inline-image'
        })
      const imageRow = editor.draw.getPageRowList()[imagePosition.pageNo][
        imagePosition.rowNo
      ]
      const column = snapshot.pageList[imagePosition.pageNo].columnList[
        imageRow.columnIndex || 0
      ]

      expect(imagePosition, '图片 position 必须存在').to.exist
      expect(imageRow.columnIndex, '图片应落在第二栏').to.eq(1)
      expect(imagePosition.metrics.width, '图片测量宽度不能超过栏宽').to.be.lte(
        column.rect.width + 0.5
      )
      expect(imagePosition.coordinate.rightTop[0], '图片右边界不能越过当前栏').to.be.lte(
        column.rect.x + column.rect.width + 0.5
      )
    })
  })

  /** 浮动图片落在第二栏时，坐标缓存、命中和拖动提交都应保持同页同栏归属。 */
  it('keeps a floating image anchored and hittable in the current column', () => {
    cy.getEditor().then((editor: any) => {
      const prefix = Array.from({ length: 10 }).flatMap((_, index) => [
        { value: `填充${index + 1}` },
        { value: '\n' }
      ])

      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
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
        main: [
          ...prefix,
          {
            id: 'column-floating-image',
            type: ElementType.IMAGE,
            value:
              'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
            width: 80,
            height: 60,
            imgDisplay: ImageDisplay.FLOAT_TOP
          }
        ]
      })

      const draw = editor.draw
      const resolver = draw.getObjectResolver()
      const imageElement = resolver
        .getLayoutMainElementList()
        .find((element: any) => element.id === 'column-floating-image')
      const imagePosition = draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => {
          return resolver.getLayoutMainElement(position.index)?.id === 'column-floating-image'
        })
      const floatPosition = draw
        .getCoordinate()
        .getFloatPositionList()
        .find((position: any) => position.element.id === 'column-floating-image')

      expect(imageElement, '浮动图片元素必须存在').to.exist
      expect(imagePosition, '浮动图片 position 必须存在').to.exist
      expect(floatPosition, '浮动图片缓存必须存在').to.exist

      const snapshot = editor.command.getTypesettingLayoutSnapshot()
      const imageRow = draw.getPageRowList()[imagePosition.pageNo][
        imagePosition.rowNo
      ]
      const column = snapshot.pageList[imagePosition.pageNo].columnList[
        imageRow.columnIndex || 0
      ]

      expect(imageRow.columnIndex, '浮动图片锚点应落在第二栏').to.eq(1)
      expect(floatPosition.pageNo, '浮动图片缓存页码应跟随锚点页').to.eq(
        imagePosition.pageNo
      )
      expect(imageElement.imgFloatPosition.pageNo, '浮动图片坐标页码应跟随锚点页').to.eq(
        imagePosition.pageNo
      )
      expect(imageElement.imgFloatPosition.x, '浮动图片左边界应在当前栏内').to.be.gte(
        column.rect.x
      )
      expect(imageElement.imgFloatPosition.x + imageElement.width, '浮动图片右边界应在当前栏内').to.be.lte(
        column.rect.x + column.rect.width + 0.5
      )

      const hit = draw.getCoordinate().getPositionByXY({
        x: imageElement.imgFloatPosition.x + imageElement.width / 2,
        y: imageElement.imgFloatPosition.y + imageElement.height / 2,
        pageNo: imagePosition.pageNo,
        elementList: resolver.getLayoutMainElementList(),
        positionList: draw.getCoordinate().getMainPositionList()
      })

      expect(hit.index, '浮动图片命中应回到图片逻辑索引').to.eq(imagePosition.index)
      expect(hit.isImage, '浮动图片应被识别为图片命中').to.eq(true)
      expect(hit.isDirectHit, '浮动图片应是直接命中').to.eq(true)

      moveDraggedImagePosition({
        draw,
        element: imageElement,
        viewport: {
          x: 8,
          y: 4
        },
        startViewport: {
          x: 0,
          y: 0
        }
      })

      expect(imageElement.imgFloatPosition.pageNo, '拖动后仍应停留在锚点页').to.eq(
        imagePosition.pageNo
      )
      expect(imageElement.imgFloatPosition.x, '拖动后左边界仍应在当前栏内').to.be.gte(
        column.rect.x
      )
      expect(imageElement.imgFloatPosition.x + imageElement.width, '拖动后右边界仍应在当前栏内').to.be.lte(
        column.rect.x + column.rect.width + 0.5
      )
    })
  })

  /** TIGHT 图片应复用环绕/浮于文字上方图片的选中、预览和拖动交互链路。 */
  it('treats a tight image as floating for selection and drag preview', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
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
        main: [
          { value: '\u200B' },
          {
            id: 'column-tight-interaction-image',
            type: ElementType.IMAGE,
            value:
              'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
            width: 80,
            height: 60,
            imgDisplay: ImageDisplay.TIGHT,
            imgFloatPosition: {
              x: 230,
              y: 70,
              pageNo: 0
            }
          },
          {
            value: 'TIGHT 图片应当和 SURROUND/FLOAT_TOP 走同一套交互预览。'
          }
        ]
      })

      const draw = editor.draw
      const imageElement = draw
        .getObjectResolver()
        .getLayoutMainElementList()
        .find((element: any) => element.id === 'column-tight-interaction-image')
      const floatPosition = draw
        .getCoordinate()
        .getFloatPositionList()
        .find((position: any) => {
          return position.element.id === 'column-tight-interaction-image'
        })

      expect(imageElement, 'tight 图片元素必须存在').to.exist
      expect(floatPosition, 'tight 图片浮动 position 必须存在').to.exist
      expect(isFloatingImageElement(imageElement), 'tight 应被视为浮动图片').to.eq(
        true
      )
      expect(
        isSurroundImageElement(imageElement),
        'tight 拖动提交应触发环绕重排'
      ).to.eq(true)
      expect(
        shouldSkipDragCursorForFloatingImage({
          dragFloatImageDisabled: true,
          element: imageElement
        }),
        '禁用浮动拖拽光标时 tight 应跳过普通拖拽光标'
      ).to.eq(true)

      const originFloatPosition = { ...imageElement.imgFloatPosition }
      let capturedSnapshot = false
      handleImageSelectionStart({
        draw,
        evt: new MouseEvent('mousedown'),
        element: imageElement,
        position: floatPosition.position,
        isReadonly: false,
        isDirectHitImage: true,
        captureDragSnapshot: () => {
          capturedSnapshot = true
        }
      })

      expect(capturedSnapshot, 'mousedown 应捕获拖拽快照').to.eq(true)
      const floatImageContainer = Cypress.$('.ce-float-image')
      expect(floatImageContainer.length, 'mousedown 应创建浮动预览容器').to.eq(1)
      expect(floatImageContainer.css('display'), '预览初始应隐藏').to.eq('none')
      const initialLeft = parseFloat(floatImageContainer.css('left'))
      const initialTop = parseFloat(floatImageContainer.css('top'))

      expect(
        dragFloatingImageOnHover({
          draw,
          element: imageElement,
          deltaX: 9,
          deltaY: 6
        }),
        'hover 拖动应接管 tight 浮动预览'
      ).to.eq(true)
      expect(floatImageContainer.css('display'), 'hover 后预览应显示').to.eq(
        'block'
      )
      expect(parseFloat(floatImageContainer.css('left'))).to.eq(initialLeft + 9)
      expect(parseFloat(floatImageContainer.css('top'))).to.eq(initialTop + 6)

      moveDraggedImagePosition({
        draw,
        element: imageElement,
        viewport: {
          x: 9,
          y: 6
        },
        startViewport: {
          x: 0,
          y: 0
        }
      })

      expect(imageElement.imgFloatPosition.pageNo).to.eq(
        originFloatPosition.pageNo
      )
      expect(imageElement.imgFloatPosition.x).to.eq(originFloatPosition.x + 9)
      expect(imageElement.imgFloatPosition.y).to.eq(originFloatPosition.y + 6)
      expect(floatImageContainer.css('display'), '提交后应隐藏预览').to.eq(
        'none'
      )
    })
  })

  /** 当前布局坐标与元素缓存坐标不一致时，命中和预览应跟随布局缓存。 */
  it('uses current floating image layout coordinates for hit-test and preview', () => {
    cy.getEditor().then((editor: any) => {
      const prefix = Array.from({ length: 10 }).flatMap((_, index) => [
        { value: `填充${index + 1}` },
        { value: '\n' }
      ])

      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
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
        main: [
          ...prefix,
          {
            id: 'column-floating-image-stale-position',
            type: ElementType.IMAGE,
            value:
              'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
            width: 80,
            height: 60,
            imgDisplay: ImageDisplay.FLOAT_TOP,
            imgFloatPosition: {
              x: 20,
              y: 20,
              pageNo: 0
            }
          }
        ]
      })

      const draw = editor.draw
      const resolver = draw.getObjectResolver()
      const imageElement = resolver
        .getLayoutMainElementList()
        .find((element: any) => element.id === 'column-floating-image-stale-position')
      const floatPosition = draw
        .getCoordinate()
        .getFloatPositionList()
        .find((position: any) => {
          return position.element.id === 'column-floating-image-stale-position'
        })
      const currentLeft = floatPosition.position.coordinate.leftTop[0]
      const currentTop = floatPosition.position.coordinate.leftTop[1]

      expect(imageElement, '浮动图片元素必须存在').to.exist
      expect(floatPosition, '浮动图片缓存必须存在').to.exist
      expect(currentLeft, '当前布局横坐标应不同于旧元素缓存').to.not.eq(
        imageElement.imgFloatPosition.x
      )

      const hit = draw.getCoordinate().getPositionByXY({
        x: currentLeft + imageElement.width / 2,
        y: currentTop + imageElement.height / 2,
        pageNo: floatPosition.pageNo,
        elementList: resolver.getLayoutMainElementList(),
        positionList: draw.getCoordinate().getMainPositionList()
      })

      expect(hit.index, '浮动图片命中应使用当前布局坐标').to.eq(
        floatPosition.position.index
      )
      expect(hit.isImage, '浮动图片应被识别为图片命中').to.eq(true)
      expect(hit.isDirectHit, '浮动图片应是直接命中').to.eq(true)

      draw.getComponents().previewer.drawResizer(
        imageElement,
        floatPosition.position
      )
      const resizer = Cypress.$('.ce-resizer-selection')
      expect(parseFloat(resizer.css('left')), '预览框横坐标应使用当前布局坐标').to.eq(
        currentLeft
      )
      expect(parseFloat(resizer.css('top')), '预览框纵坐标应使用当前布局坐标').to.eq(
        currentTop
      )
      draw.getComponents().previewer.clearResizer()
    })
  })

  /** 隐藏 FLOAT_TOP 图片后不应保留浮动缓存和命中，重新显示后应恢复。 */
  it('removes a hidden FLOAT_TOP image from float hit-test cache and restores it when shown', () => {
    cy.getEditor().then((editor: any) => {
      editor.command.executeUpdateOptions({
        width: 420,
        height: 260,
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
        main: [
          { value: '\u200B' },
          {
            id: 'hidden-float-top-image',
            type: ElementType.IMAGE,
            value:
              'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
            width: 80,
            height: 60,
            imgDisplay: ImageDisplay.FLOAT_TOP,
            imgFloatPosition: {
              x: 230,
              y: 70,
              pageNo: 0
            }
          },
          {
            value: 'FLOAT_TOP hidden images should not remain hittable.'
          }
        ]
      })

      const draw = editor.draw
      const findFloatPosition = () =>
        draw
          .getCoordinate()
          .getFloatPositionList()
          .find((position: any) => position.element.id === 'hidden-float-top-image')
      const hitImage = (position: any) =>
        draw.getCoordinate().getFloatPositionByXY({
          x: position.position.coordinate.leftTop[0] + position.element.width / 2,
          y: position.position.coordinate.leftTop[1] + position.element.height / 2,
          pageNo: position.pageNo,
          imgDisplays: getFrontFloatImageHitDisplays()
        })

      const visibleFloatPosition = findFloatPosition()
      expect(visibleFloatPosition, '显示状态应进入浮动缓存').to.exist
      expect(
        hitImage(visibleFloatPosition)?.isDirectHit,
        '显示状态应可直接命中 FLOAT_TOP 图片'
      ).to.eq(true)

      editor.command.executeUpdateElementById({
        id: 'hidden-float-top-image',
        properties: { hide: true }
      })

      expect(findFloatPosition(), '隐藏后不应进入浮动缓存').to.not.exist
      expect(
        hitImage(visibleFloatPosition),
        '隐藏后不应继续命中 FLOAT_TOP 图片'
      ).to.eq(undefined)

      editor.command.executeUpdateElementById({
        id: 'hidden-float-top-image',
        properties: { hide: false }
      })

      const restoredFloatPosition = findFloatPosition()
      expect(restoredFloatPosition, '重新显示后应恢复浮动缓存').to.exist
      expect(
        hitImage(restoredFloatPosition)?.isDirectHit,
        '重新显示后应恢复 FLOAT_TOP 图片直接命中'
      ).to.eq(true)
    })
  })
})
