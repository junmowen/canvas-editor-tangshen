import { ElementType } from '../../../src/editor/dataset/enum/Element'
import { IElement } from '../../../src/editor/interface/Element'
import {
  toggleSubscriptSelection,
  toggleSuperscriptSelection
} from '../../../src/editor/core/modules/richtext/command/ScriptCommandPolicy'

function text(value: string, type?: ElementType, actualSize?: number): IElement {
  return {
    value,
    type,
    actualSize
  } as IElement
}

function elementTypes(elementList: IElement[]) {
  return elementList.map(element => element.type)
}

describe('richtext script command policy', () => {
  it('switches superscript and subscript mutually exclusively', () => {
    const fromText = [text('a'), text('b', ElementType.TEXT)]

    toggleSuperscriptSelection(fromText)
    expect(elementTypes(fromText)).to.deep.eq([
      ElementType.SUPERSCRIPT,
      ElementType.SUPERSCRIPT
    ])

    toggleSubscriptSelection(fromText)
    expect(elementTypes(fromText)).to.deep.eq([
      ElementType.SUBSCRIPT,
      ElementType.SUBSCRIPT
    ])

    const fromSubscript = [text('x', ElementType.SUBSCRIPT), text('y', ElementType.TEXT)]

    toggleSuperscriptSelection(fromSubscript)
    expect(elementTypes(fromSubscript)).to.deep.eq([
      ElementType.SUPERSCRIPT,
      ElementType.SUPERSCRIPT
    ])
  })

  it('restores existing superscript and subscript runs to normal text on repeated toggle', () => {
    const superscripts = [
      text('a', ElementType.SUPERSCRIPT, 10),
      text('b', ElementType.SUPERSCRIPT, 10)
    ]

    toggleSuperscriptSelection(superscripts)
    expect(elementTypes(superscripts)).to.deep.eq([
      ElementType.TEXT,
      ElementType.TEXT
    ])
    expect(superscripts.map(element => element.actualSize)).to.deep.eq([
      undefined,
      undefined
    ])

    const subscripts = [
      text('x', ElementType.SUBSCRIPT, 9),
      text('y', ElementType.SUBSCRIPT, 9)
    ]

    toggleSubscriptSelection(subscripts)
    expect(elementTypes(subscripts)).to.deep.eq([ElementType.TEXT, ElementType.TEXT])
    expect(subscripts.map(element => element.actualSize)).to.deep.eq([
      undefined,
      undefined
    ])
  })

  it('only clears the matching script type in mixed text, subscript, and superscript selections', () => {
    const mixedForSuperscript = [
      text('a', ElementType.TEXT),
      text('b', ElementType.SUBSCRIPT, 8),
      text('c', ElementType.SUPERSCRIPT, 8)
    ]

    toggleSuperscriptSelection(mixedForSuperscript)
    expect(elementTypes(mixedForSuperscript)).to.deep.eq([
      ElementType.TEXT,
      ElementType.SUBSCRIPT,
      ElementType.TEXT
    ])
    expect(mixedForSuperscript.map(element => element.actualSize)).to.deep.eq([
      undefined,
      8,
      undefined
    ])

    const mixedForSubscript = [
      text('a', ElementType.TEXT),
      text('b', ElementType.SUBSCRIPT, 8),
      text('c', ElementType.SUPERSCRIPT, 8)
    ]

    toggleSubscriptSelection(mixedForSubscript)
    expect(elementTypes(mixedForSubscript)).to.deep.eq([
      ElementType.TEXT,
      ElementType.TEXT,
      ElementType.SUPERSCRIPT
    ])
    expect(mixedForSubscript.map(element => element.actualSize)).to.deep.eq([
      undefined,
      undefined,
      8
    ])
  })
})
