import Editor from '../../../src/editor'
import { ImageDisplay } from '../../../src/editor/dataset/enum/Common'
import { ElementType } from '../../../src/editor/dataset/enum/Element'

const imageDataUrl =
  'data:image/svg+xml;base64,' +
  btoa(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">' +
      '<rect width="80" height="60" fill="#2563eb"/>' +
      '</svg>'
  )

describe('菜单-图片', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/index.html')

    cy.get('canvas[data-index]').first().as('canvas').should('have.length', 1)
  })

  it('图片', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSelectAll()

      editor.command.executeBackspace()

      cy.get('#image').attachFile('images/test.png')

      cy.wait(200).then(() => {
        const data = editor.command.getValue().data.main

        expect(data[0].type).to.eq('image')
      })
    })
  })

  it('通过右键菜单切换紧密型环绕', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            id: 'context-tight-image',
            type: ElementType.IMAGE,
            value: imageDataUrl,
            width: 80,
            height: 60
          },
          { value: 'image text wrap menu target' }
        ],
        footer: []
      })
      editor.command.executeSetRange(0, 0)
      ;(editor as any).draw.flushScheduledFrameRender?.()

      const imagePosition = editor.draw
        .getCoordinate()
        .getMainPositionList()
        .find((position: any) => position.element.id === 'context-tight-image')
      expect(imagePosition, '图片 position 必须存在').to.exist
      if (!imagePosition) {
        throw new Error('image position not found')
      }
      const [left, top] = imagePosition.coordinate.leftTop
      cy.wrap({ x: left + 40, y: top + 30 }).as('imageCenter')
    })

    cy.get<{ x: number; y: number }>('@imageCenter').then(({ x, y }) => {
      cy.get('canvas[data-index="0"]').rightclick(x, y, {
        force: true
      })
    })

    cy.contains('.ce-contextmenu-content .ce-contextmenu-item', /^文字环绕$/)
      .should('be.visible')
      .as('textWrapMenuItem')
    cy.get('@textWrapMenuItem').trigger('mouseenter')
    cy.contains('.ce-contextmenu-content .ce-contextmenu-item', /^紧密型环绕$/)
      .should('be.visible')
      .as('tightWrapMenuItem')
    cy.get('@tightWrapMenuItem').click()

    cy.getEditor().then((editor: Editor) => {
      const image = editor.command
        .getValue({ extraPickAttrs: ['id', 'imgDisplay', 'imgFloatPosition'] })
        .data.main.find(element => element.id === 'context-tight-image')
      expect(image?.imgDisplay).to.eq(ImageDisplay.TIGHT)
      expect(image?.imgFloatPosition).to.exist
    })
  })

  it('通过右键菜单打开图片属性并保存常用属性', () => {
    cy.getEditor().then((editor: Editor) => {
      editor.command.executeSetValue({
        header: [],
        main: [
          {
            id: 'context-property-image',
            type: ElementType.IMAGE,
            value: imageDataUrl,
            width: 80,
            height: 60
          },
          { value: 'image property menu target' }
        ],
        footer: []
      })
      editor.command.executeSetRange(0, 0)
      ;(editor as any).draw.flushScheduledFrameRender?.()

      const imagePosition = editor.draw
        .getCoordinate()
        .getMainPositionList()
        .find(
          (position: any) => position.element.id === 'context-property-image'
        )
      expect(imagePosition, '图片 position 必须存在').to.exist
      if (!imagePosition) {
        throw new Error('image position not found')
      }
      const [left, top] = imagePosition.coordinate.leftTop
      cy.wrap({ x: left + 40, y: top + 30 }).as('imagePropertyCenter')
    })

    cy.get<{ x: number; y: number }>('@imagePropertyCenter').then(
      ({ x, y }) => {
        cy.get('canvas[data-index="0"]').rightclick(x, y, {
          force: true
        })
      }
    )

    cy.contains('.ce-contextmenu-content .ce-contextmenu-item', /^图片属性$/)
      .should('be.visible')
      .click()
    cy.get('.dialog-container select[name="display"]').select(ImageDisplay.TIGHT)
    cy.get('.dialog-container input[name="width"]').clear().type('120')
    cy.get('.dialog-container input[name="height"]').clear().type('90')
    cy.get('.dialog-container select[name="lockAspectRatio"]').select('true')
    cy.get('.dialog-container select[name="sizeLocked"]').select('true')
    cy.get('.dialog-container input[name="floatX"]').clear().type('42')
    cy.get('.dialog-container input[name="floatY"]').clear().type('36')
    cy.get('.dialog-container input[name="borderColor"]')
      .invoke('val', '#123456')
      .trigger('input')
      .trigger('change')
    cy.get('.dialog-container input[name="borderWidth"]').clear().type('2')
    cy.get('.dialog-container input[name="borderRadius"]').clear().type('4')
    cy.get('.dialog-container input[name="shadowColor"]')
      .invoke('val', '#654321')
      .trigger('input')
      .trigger('change')
    cy.get('.dialog-container input[name="shadowBlur"]').clear().type('6')
    cy.get('.dialog-menu button[type="submit"]').click()

    cy.getEditor().then((editor: Editor) => {
      const image = editor.command
        .getValue({
          extraPickAttrs: [
            'id',
            'imgDisplay',
            'imgFloatPosition',
            'imgLockAspectRatio',
            'imgSizeLocked',
            'imgBorder',
            'imgShadow'
          ]
        })
        .data.main.find(element => element.id === 'context-property-image')

      expect(image?.imgDisplay).to.eq(ImageDisplay.TIGHT)
      expect(image?.width).to.eq(120)
      expect(image?.height).to.eq(90)
      expect(image?.imgFloatPosition).to.deep.include({
        x: 42,
        y: 36
      })
      expect(image?.imgLockAspectRatio).to.eq(true)
      expect(image?.imgSizeLocked).to.eq(true)
      expect(image?.imgBorder).to.deep.eq({
        color: '#123456',
        width: 2,
        radius: 4
      })
      expect(image?.imgShadow).to.deep.eq({
        color: '#654321',
        blur: 6
      })
    })
  })
})
