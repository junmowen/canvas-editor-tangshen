import { IElement } from '../../../../interface/Element'
import { walkElementTree } from '../../../shared/traversal/ElementTreeTraversal'

/** 文档元素类型，决定元素参与布局、渲染和编辑时使用的处理分支。 */
enum ElementType {
  TEXT = 'text',
  HYPERLINK = 'hyperlink'
}

/** 控件组成片段类型，用于识别前后缀、占位符和值域等子元素。 */
enum ControlComponent {
  VALUE = 'value'
}

// 零宽占位字符，用于表示空文本节点或占位元素。
const ZERO = '\u200B'
// 换行符常量，用于文本拆分和换行元素转换。
const WRAP = '\n'

function pickText(elementList: IElement[]): string {
  let text = ''
  walkElementTree({
    elementList,
    visitor: ({ element, elementList, index }): number | void => {
      if (element.type === ElementType.HYPERLINK) {
        const hyperlinkId = element.hyperlinkId
        const valueList: IElement[] = []
        let nextIndex = index
        while (nextIndex < elementList.length) {
          const hyperlinkE = elementList[nextIndex]
          if (hyperlinkId !== hyperlinkE.hyperlinkId) {
            break
          }
          delete hyperlinkE.type
          valueList.push(hyperlinkE)
          nextIndex++
        }
        text += pickText(valueList)
        return nextIndex
      }
      if (element.controlId) {
        if (!element.control?.hide) {
          const controlId = element.controlId
          const valueList: IElement[] = []
          let nextIndex = index
          while (nextIndex < elementList.length) {
            const controlE = elementList[nextIndex]
            if (controlId !== controlE.controlId) {
              break
            }
            if (controlE.controlComponent === ControlComponent.VALUE) {
              delete controlE.controlId
              valueList.push(controlE)
            }
            nextIndex++
          }
          text += pickText(valueList)
          return nextIndex
        }
        return undefined
      }
      if (
        (!element.type || element.type === ElementType.TEXT) &&
        !element.area?.hide
      ) {
        text += element.value
      }
      return undefined
    }
  })
  return text
}

function groupText(text: string): string[] {
  const characterList: string[] = []
  // 英文或数字整体分隔为一个字数
  const numberReg = /[0-9]/
  const letterReg = /[A-Za-z]/
  const blankReg = /\s/
  // for of 循环字符
  let isPreLetter = false
  let isPreNumber = false
  let compositionText = ''
  // 处理组合文本
  function pushCompositionText() {
    if (compositionText) {
      characterList.push(compositionText)
      compositionText = ''
    }
  }
  for (const t of text) {
    if (letterReg.test(t)) {
      if (!isPreLetter) {
        pushCompositionText()
      }
      compositionText += t
      isPreLetter = true
      isPreNumber = false
    } else if (numberReg.test(t)) {
      if (!isPreNumber) {
        pushCompositionText()
      }
      compositionText += t
      isPreLetter = false
      isPreNumber = true
    } else {
      pushCompositionText()
      isPreLetter = false
      isPreNumber = false
      if (!blankReg.test(t)) {
        characterList.push(t)
      }
    }
  }
  pushCompositionText()
  return characterList
}

onmessage = evt => {
  const elementList = <IElement[]>evt.data
  // 提取文本
  const originText = pickText(elementList)
  // 过滤文本
  const filterText = originText
    .replace(new RegExp(`^${ZERO}`), '')
    .replace(new RegExp(ZERO, 'g'), WRAP)
  // 文本分组
  const textGroup = groupText(filterText)
  postMessage(textGroup.length)
}
