import { ControlComponent, ControlType } from '../../../dataset/enum/Control'
import { ElementType } from '../../../dataset/enum/Element'
import { resolveFormulaDisplayText } from '../../../core/modules/formula/model/FormulaTextModel'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElement, IElementPosition } from '../../../interface/Element'
import { measurePrintSvgTextWidth } from './core'

export type TPrintSvgInlineRenderKind =
  | 'control'
  | 'image'
  | 'latex'
  | 'text'
  | 'skip'

export function isPrintSvgControlAffixPosition(position: IElementPosition) {
  return (
    position.element?.controlComponent === ControlComponent.PREFIX ||
    position.element?.controlComponent === ControlComponent.POSTFIX
  )
}

/** 判断布局位置是否属于控件片段，用于把控件合并成最终展示文本。 */
export function isPrintSvgControlPosition(position: IElementPosition) {
  return Boolean(position.element?.controlId && position.element.controlComponent)
}

/** 解析单个行内位置在 SVG 打印中的渲染类别。 */
export function resolvePrintSvgInlineRenderKind(
  position: IElementPosition
): TPrintSvgInlineRenderKind {
  if (isPrintSvgControlPosition(position)) return 'control'
  if (isPrintSvgControlAffixPosition(position)) return 'skip'
  switch (position.element?.type) {
    case ElementType.IMAGE:
      return 'image'
    case ElementType.LATEX:
      return 'latex'
    case ElementType.TABLE:
      return 'skip'
    default:
      return 'text'
  }
}

export interface IPrintSvgControlRenderHooks {
  createText: (position: IElementPosition, text?: string) => string
  createHighlight: (position: IElementPosition) => string
}

export type TPrintSvgLatexRenderPayload =
  | {
      kind: 'image'
      src: string
      width: number
      height: number
    }
  | {
      kind: 'text'
      text: string
    }

/** 解析行内图片在 SVG 打印中的最终绘制载荷。 */
export function resolvePrintSvgInlineImagePayload(position: IElementPosition) {
  const element = position.element
  if (!element || element.type !== ElementType.IMAGE) return null
  return {
    src: element.value,
    x: position.coordinate.leftTop[0],
    y: position.coordinate.leftTop[1] + position.ascent,
    width: element.width || position.metrics.width,
    height: element.height || position.metrics.height
  }
}

/** 解析 LaTeX 打印载荷，无结构化 SVG 时退回到用户可见展示文本。 */
export function resolvePrintSvgLatexPayload(
  position: IElementPosition
): TPrintSvgLatexRenderPayload | null {
  const element = position.element
  if (!element || element.type !== ElementType.LATEX) return null
  if (element.laTexSVG) {
    return {
      kind: 'image',
      src: element.laTexSVG,
      width: position.metrics.width || element.width || 0,
      height: position.metrics.height || element.height || position.lineHeight
    }
  }
  const latex = element.formula?.latex ?? element.value
  return {
    kind: 'text',
    text: element.formula?.displayText || resolveFormulaDisplayText(latex)
  }
}

/** 从选择类控件配置中解析已选中的展示文本。 */
function getPrintSvgChoiceControlText(positionList: IElementPosition[]) {
  const control = positionList[0].element?.control
  if (
    !control ||
    (control.type !== ControlType.SELECT &&
      control.type !== ControlType.CHECKBOX &&
      control.type !== ControlType.RADIO) ||
    control.code === undefined ||
    control.code === null ||
    !Array.isArray(control.valueSets)
  ) {
    return ''
  }
  const codeList = String(control.code).split(',')
  return control.valueSets
    .filter(valueSet => codeList.includes(String(valueSet.code)))
    .map(valueSet => valueSet.value)
    .join(control.multiSelectDelimiter || '、')
}

/** 按控件组件读取文本，保留内部 preText/postText，移除外层 prefix/postfix。 */
function getPrintSvgControlComponentText(
  positionList: IElementPosition[],
  component: ControlComponent
) {
  return positionList
    .filter(position => position.element?.controlComponent === component)
    .map(position => position.value || '')
    .join('')
}

/** 查找控件指定片段的样式锚点，便于合并文本后仍保留占位提示颜色。 */
function findPrintSvgControlComponentAnchor(
  positionList: IElementPosition[],
  component: ControlComponent
) {
  return positionList.find(position => position.element?.controlComponent === component)
}

/** 克隆控件锚点并偏移横坐标，用于分段输出控件文本。 */
function clonePrintSvgControlAnchorWithX(
  anchor: IElementPosition,
  x: number,
  override?: Partial<IElement>
): IElementPosition {
  const deltaX = x - anchor.coordinate.leftTop[0]
  return {
    ...anchor,
    element: {
      ...(anchor.element || ({} as IElement)),
      ...override
    },
    coordinate: {
      leftTop: [anchor.coordinate.leftTop[0] + deltaX, anchor.coordinate.leftTop[1]],
      leftBottom: [
        anchor.coordinate.leftBottom[0] + deltaX,
        anchor.coordinate.leftBottom[1]
      ],
      rightTop: [
        anchor.coordinate.rightTop[0] + deltaX,
        anchor.coordinate.rightTop[1]
      ],
      rightBottom: [
        anchor.coordinate.rightBottom[0] + deltaX,
        anchor.coordinate.rightBottom[1]
      ]
    }
  }
}

/** 测量 SVG 文本片段宽度，用于控件分段样式连续输出。 */
function measurePrintSvgPositionTextWidth(position: IElementPosition, text: string) {
  const element = position.element || ({} as IElement)
  const size = element.actualSize || element.size || 16
  const font = element.font || 'Microsoft YaHei'
  const fontWeight = element.bold ? '700 ' : ''
  const fontStyle = element.italic ? 'italic ' : ''
  return measurePrintSvgTextWidth(text, `${fontStyle}${fontWeight}${size}px ${font}`)
}

/** 创建控件打印片段，保留 pre/post/value/placeholder 各自样式。 */
export function createPrintSvgControlContent(
  positionList: IElementPosition[],
  hooks: IPrintSvgControlRenderHooks,
  options?: DeepRequired<IEditorOption>
) {
  const control = positionList[0].element?.control
  const preText =
    getPrintSvgControlComponentText(positionList, ControlComponent.PRE_TEXT) ||
    control?.preText ||
    ''
  const postText =
    getPrintSvgControlComponentText(positionList, ControlComponent.POST_TEXT) ||
    control?.postText ||
    ''
  const choiceText = getPrintSvgChoiceControlText(positionList)
  const valueText =
    choiceText ||
    getPrintSvgControlComponentText(positionList, ControlComponent.VALUE) ||
    getPrintSvgControlComponentText(positionList, ControlComponent.PLACEHOLDER) ||
    control?.placeholder ||
    ''
  if (!valueText) return ''
  const valueAnchor =
    findPrintSvgControlComponentAnchor(positionList, ControlComponent.VALUE) ||
    findPrintSvgControlComponentAnchor(positionList, ControlComponent.PLACEHOLDER) ||
    positionList.find(item => !isPrintSvgControlAffixPosition(item)) ||
    positionList[0]
  const preAnchor =
    findPrintSvgControlComponentAnchor(positionList, ControlComponent.PRE_TEXT) ||
    valueAnchor
  const postAnchor =
    findPrintSvgControlComponentAnchor(positionList, ControlComponent.POST_TEXT) ||
    valueAnchor
  const isPlaceholder =
    !choiceText &&
    !getPrintSvgControlComponentText(positionList, ControlComponent.VALUE) &&
    Boolean(
      getPrintSvgControlComponentText(positionList, ControlComponent.PLACEHOLDER) ||
        control?.placeholder
    )
  const contentList: string[] = []
  // 打印时移除控件外层前后缀后，输出起点必须落在第一个真实片段上，避免保留占位片段前的空白。
  const outputStartAnchor = preText ? preAnchor : valueAnchor
  let x = outputStartAnchor.coordinate.leftTop[0]
  if (preText) {
    const anchor = clonePrintSvgControlAnchorWithX(preAnchor, x)
    contentList.push(hooks.createText(anchor, preText))
    x += measurePrintSvgPositionTextWidth(anchor, preText)
  }
  if (valueText) {
    const anchor = clonePrintSvgControlAnchorWithX(valueAnchor, x, {
      color: isPlaceholder
        ? options?.control.placeholderColor || '#9c9b9b'
        : valueAnchor.element?.color
    })
    contentList.push(hooks.createHighlight(anchor))
    contentList.push(hooks.createText(anchor, valueText))
    x += measurePrintSvgPositionTextWidth(anchor, valueText)
  }
  if (postText) {
    const anchor = clonePrintSvgControlAnchorWithX(postAnchor, x)
    contentList.push(hooks.createText(anchor, postText))
  }
  return contentList.join('')
}
