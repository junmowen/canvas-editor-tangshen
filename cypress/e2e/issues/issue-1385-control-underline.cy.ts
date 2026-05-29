import type Editor from '../../../src/editor'

function countDarkPixelsInDataUrl(
  dataUrl: string,
  box: { left: number; top: number; width: number; height: number }
) {
  return new Cypress.Promise<number>(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const imageData = ctx.getImageData(
        Math.max(0, Math.floor(box.left)),
        Math.max(0, Math.floor(box.top)),
        Math.max(1, Math.ceil(box.width)),
        Math.max(1, Math.ceil(box.height))
      ).data
      let darkPixels = 0
      for (let index = 0; index < imageData.length; index += 4) {
        const r = imageData[index]
        const g = imageData[index + 1]
        const b = imageData[index + 2]
        const alpha = imageData[index + 3]
        if (alpha > 0 && r < 80 && g < 80 && b < 80) {
          darkPixels++
        }
      }
      resolve(darkPixels)
    }
    image.src = dataUrl
  })
}

function countDarkestRowInDataUrl(
  dataUrl: string,
  box: { left: number; top: number; width: number; height: number }
) {
  return new Cypress.Promise<number>(resolve => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      const x = Math.max(0, Math.floor(box.left))
      const y = Math.max(0, Math.floor(box.top))
      const width = Math.max(1, Math.ceil(box.width))
      const height = Math.max(1, Math.ceil(box.height))
      const imageData = ctx.getImageData(x, y, width, height).data
      let maxDarkPixels = 0
      for (let row = 0; row < height; row++) {
        let darkPixels = 0
        for (let col = 0; col < width; col++) {
          const index = (row * width + col) * 4
          const r = imageData[index]
          const g = imageData[index + 1]
          const b = imageData[index + 2]
          const alpha = imageData[index + 3]
          if (alpha > 0 && r < 80 && g < 80 && b < 80) {
            darkPixels++
          }
        }
        maxDarkPixels = Math.max(maxDarkPixels, darkPixels)
      }
      resolve(maxDarkPixels)
    }
    image.src = dataUrl
  })
}

describe('issue #1385 - control underline rendering', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')
    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('keeps underline on text control values and HTML output', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: [{ value: '文本控件' }],
              placeholder: '文本控件',
              underline: true
            }
          }
        ]
      })

      const data = (editor as any).draw.getOriginalMainElementList()
      const valueElements = data.filter(
        element => element.controlComponent === 'value'
      )
      expect(valueElements).to.have.length('文本控件'.length)
      valueElements.forEach(element => {
        expect(element.underline).to.eq(true)
      })
      expect(editor.command.getHTML().main).to.contain(
        'text-decoration: underline'
      )
    })
  })

  it('keeps underline after selecting an option in select control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: 'control',
            value: '',
            control: {
              type: 'select',
              value: null,
              placeholder: '列举控件',
              underline: true,
              valueSets: [
                {
                  value: '有',
                  code: '98175'
                },
                {
                  value: '无',
                  code: '98176'
                }
              ]
            }
          }
        ]
      })
      const controlId = (editor as any).draw
        .getOriginalMainElementList()
        .find((element: any) => element.controlId).controlId

      editor.command.executeSetControlValue({
        id: controlId,
        value: '98175'
      })

      const data = (editor as any).draw.getOriginalMainElementList()
      const valueElements = data.filter(
        element => element.controlComponent === 'value'
      )
      expect(valueElements.map(element => element.value).join('')).to.eq('有')
      valueElements.forEach(element => {
        expect(element.underline).to.eq(true)
      })
      expect(editor.command.getHTML().main).to.contain(
        'text-decoration: underline'
      )
    })
  })

  it('renders underline in print image output', () => {
    cy.getEditor().then(async (editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: [
                {
                  value: '打印下划线'
                }
              ],
              placeholder: '文本控件',
              underline: true
            }
          }
        ]
      })

      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const valueElementIndex = draw
        .getOriginalMainElementList()
        .findIndex((element: any) => element.controlComponent === 'value')
      const position = draw.getPosition().getOriginalPositionList()[
        valueElementIndex
      ]
      const imageList = await editor.command.getImage({
        pixelRatio: 1,
        mode: 'print' as any
      })
      const left = position.coordinate.leftTop[0]
      const right = position.coordinate.rightTop[0]
      const underlineTop = position.coordinate.leftTop[1] + position.lineHeight
      const darkPixels = await countDarkPixelsInDataUrl(imageList[0], {
        left,
        top: underlineTop - 12,
        width: right - left,
        height: 24
      })
      const darkestRowPixels = await countDarkestRowInDataUrl(imageList[0], {
        left,
        top: underlineTop - 12,
        width: right - left,
        height: 24
      })
      expect(darkPixels).to.be.greaterThan(8)
      expect(darkestRowPixels).to.be.greaterThan(8)
    })
  })

  it('renders blank underline for empty underlined controls in print image output', () => {
    cy.getEditor().then(async (editor: Editor) => {
      editor.command.executeSetValue({
        main: [
          {
            type: 'control',
            value: '',
            control: {
              type: 'text',
              value: null,
              placeholder: '空白控件',
              underline: true
            }
          }
        ]
      })

      const draw = (editor as any).draw
      draw.flushScheduledFrameRender()
      const placeholderIndex = draw
        .getOriginalMainElementList()
        .findIndex(
          (element: any) => element.controlComponent === 'placeholder'
        )
      const position = draw.getPosition().getOriginalPositionList()[
        placeholderIndex
      ]
      const imageList = await editor.command.getImage({
        pixelRatio: 1,
        mode: 'print' as any
      })
      const left = position.coordinate.leftTop[0]
      const right = position.coordinate.rightTop[0]
      const underlineTop = position.coordinate.leftTop[1] + position.lineHeight
      const darkestRowPixels = await countDarkestRowInDataUrl(imageList[0], {
        left,
        top: underlineTop - 12,
        width: right - left,
        height: 24
      })

      expect(darkestRowPixels).to.be.greaterThan(8)
    })
  })

  it('inherits pending underline style when inserting an empty control', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()
      editor.command.executeBackspace()
      editor.command.executeUnderline()
      editor.command.executeInsertControl({
        type: 'control',
        value: '',
        control: {
          type: 'text',
          value: null,
          placeholder: '空白控件'
        }
      } as any)

      const data = (editor as any).draw.getOriginalMainElementList()
      const controlElement = data.find((element: any) => element.controlId)
      expect(controlElement?.control?.underline).to.eq(true)
      expect(editor.command.getHTML().main).to.contain(
        'text-decoration: underline'
      )
    })
  })
})
