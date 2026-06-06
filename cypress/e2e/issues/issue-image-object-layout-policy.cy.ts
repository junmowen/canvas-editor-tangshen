import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { applyImageDisplayChange } from '../../../src/editor/core/modules/image/command/ImageCommandPolicy'
import { resolveTableFloatImageHit } from '../../../src/editor/core/modules/table/hittest/resolveTableFloatImageHit'

describe('image object layout policy', () => {
  it('stores and clears floating image anchor coordinates when display changes', () => {
    const image = {
      id: 'image-anchor-policy',
      type: ElementType.IMAGE,
      value: '',
      width: 80,
      height: 40
    }
    const positionList = [
      {
        index: 0,
        pageNo: 2,
        coordinate: {
          leftTop: [36, 48],
          rightTop: [116, 48],
          rightBottom: [116, 88],
          leftBottom: [36, 88]
        }
      }
    ] as any

    expect(
      applyImageDisplayChange({
        element: image,
        display: ImageDisplay.TIGHT,
        startIndex: 0,
        positionList
      })
    ).to.eq(true)
    expect(image.imgDisplay).to.eq(ImageDisplay.TIGHT)
    expect(image.imgFloatPosition).to.deep.eq({
      pageNo: 2,
      x: 36,
      y: 48
    })

    expect(
      applyImageDisplayChange({
        element: image,
        display: ImageDisplay.INLINE,
        startIndex: 0,
        positionList
      })
    ).to.eq(true)
    expect(image.imgDisplay).to.eq(ImageDisplay.INLINE)
    expect(image.imgFloatPosition).to.eq(undefined)
  })

  it('keeps table cell context when resolving a table floating image hit', () => {
    expect(
      resolveTableFloatImageHit({
        isTable: true,
        index: 8,
        trIndex: 1,
        tdIndex: 2,
        tdValueIndex: 3,
        element: {
          tdId: 'td-anchor',
          trId: 'tr-anchor',
          tableId: 'table-anchor'
        }
      } as any)
    ).to.deep.eq({
      index: 8,
      isDirectHit: true,
      isImage: true,
      isTable: true,
      trIndex: 1,
      tdIndex: 2,
      tdValueIndex: 3,
      tdId: 'td-anchor',
      trId: 'tr-anchor',
      tableId: 'table-anchor'
    })

    expect(
      resolveTableFloatImageHit({
        isTable: false,
        element: {}
      } as any)
    ).to.eq(null)
  })
})
