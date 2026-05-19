import type Editor from '../../../src/editor'

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

function findFirstTextPosition(editor: Editor) {
  const positionList = editor.draw.getPosition().getOriginalPositionList()
  const position = positionList.find(
    item => !item.element.type && item.element.value.trim()
  )
  if (!position) {
    throw new Error('text position not found')
  }
  return position
}

describe('issues #1372 and #1200 image surround wrapping', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000/canvas-editor/')
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
        editor.draw.getRowList().some(row => row.isSurround),
        'row marked as surround'
      ).to.eq(true)

      const hit = editor.draw.getPosition().getPositionByXY({
        x: 130,
        y: 130,
        pageNo: 0,
        elementList: editor.draw.getLayoutMainElementList(),
        positionList: editor.draw.getPosition().getOriginalPositionList()
      })

      expect(hit.isImage).to.eq(true)
      expect(hit.isDirectHit).to.eq(true)
    })
  })
})
