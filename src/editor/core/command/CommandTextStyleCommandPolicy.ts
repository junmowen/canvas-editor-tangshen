import { ZERO } from '../../dataset/constant/Common'
import { IElement } from '../../interface/Element'
import { IRangeElementStyle } from '../../interface/Range'
import { ITextDecoration } from '../../interface/Text'
import { isObjectEqual } from '../../utils'
import type { Draw } from '../draw/Draw'
import type { RangeManager } from '../range/RangeManager'

type TBooleanTextStyleKey = 'bold' | 'italic' | 'strikeout'
type TNullableColorStyleKey = 'color' | 'highlight'

function resolveAnchorElement(draw: Draw) {
  const elementList = draw.getObjectResolver().getElementList()
  return draw.getTargetResolver().resolveRangeAnchorElement({ elementList })
}

function renderCollapsedTextStyle(payload: {
  draw: Draw
  endIndex: number
  isSubmitHistory: boolean
  isCompute: boolean
}) {
  const { draw, endIndex, isSubmitHistory, isCompute } = payload
  draw.render({
    isSubmitHistory,
    curIndex: endIndex,
    isCompute,
    pageRenderScope: 'visible'
  })
}

export function executeFontCommand(payload: {
  draw: Draw
  range: RangeManager
  endIndex: number
  font: string
}) {
  const { draw, range, endIndex, font } = payload
  const selection = range.getSelectionElementList()
  if (selection?.length) {
    selection.forEach(element => {
      element.font = font
    })
    draw.render({ isSetCursor: false })
    return
  }
  const enterElement = resolveAnchorElement(draw)
  range.setDefaultStyle({ font })
  const isSubmitHistory = enterElement?.value === ZERO
  if (isSubmitHistory) {
    enterElement.font = font
  }
  renderCollapsedTextStyle({
    draw,
    endIndex,
    isSubmitHistory,
    isCompute: false
  })
}

export function executeSizeCommand(payload: {
  draw: Draw
  range: RangeManager
  endIndex: number
  size: number
  defaultSize: number
}) {
  const { draw, range, endIndex, size, defaultSize } = payload
  const selection = range.getTextLikeSelectionElementList()
  let renderOption = {}
  let changeElementList: IElement[] = []
  if (selection?.length) {
    changeElementList = selection
    renderOption = { isSetCursor: false }
  } else {
    const enterElement = resolveAnchorElement(draw)
    range.setDefaultStyle({ size })
    if (enterElement?.value === ZERO) {
      changeElementList.push(enterElement)
      renderOption = { curIndex: endIndex }
    } else {
      renderCollapsedTextStyle({
        draw,
        endIndex,
        isSubmitHistory: false,
        isCompute: false
      })
    }
  }
  if (!changeElementList.length) return
  let isExistUpdate = false
  changeElementList.forEach(element => {
    if (
      (!element.size && size === defaultSize) ||
      (element.size && element.size === size)
    ) {
      return
    }
    element.size = size
    isExistUpdate = true
  })
  if (isExistUpdate) {
    draw.render(renderOption)
  }
}

export function executeSizeDeltaCommand(payload: {
  draw: Draw
  range: RangeManager
  endIndex: number
  delta: number
  defaultSize: number
  minSize: number
  maxSize: number
}) {
  const { draw, range, endIndex, delta, defaultSize, minSize, maxSize } = payload
  const selection = range.getTextLikeSelectionElementList()
  let renderOption = {}
  let changeElementList: IElement[] = []
  if (selection?.length) {
    changeElementList = selection
    renderOption = { isSetCursor: false }
  } else {
    const enterElement = resolveAnchorElement(draw)
    const style = range.getDefaultStyle()
    const anchorSize = style?.size || enterElement?.size || defaultSize
    const nextSize = Math.min(maxSize, Math.max(minSize, anchorSize + delta))
    range.setDefaultStyle({ size: nextSize })
    if (enterElement?.value === ZERO) {
      changeElementList.push(enterElement)
      renderOption = { curIndex: endIndex }
    } else {
      renderCollapsedTextStyle({
        draw,
        endIndex,
        isSubmitHistory: false,
        isCompute: false
      })
    }
  }
  if (!changeElementList.length) return
  let isExistUpdate = false
  changeElementList.forEach(element => {
    if (!element.size) {
      element.size = defaultSize
    }
    const nextSize = Math.min(maxSize, Math.max(minSize, element.size + delta))
    if (nextSize === element.size) return
    element.size = nextSize
    isExistUpdate = true
  })
  if (isExistUpdate) {
    draw.render(renderOption)
  }
}

export function executeBooleanTextStyleToggleCommand(payload: {
  draw: Draw
  range: RangeManager
  endIndex: number
  key: TBooleanTextStyleKey
  selectionRenderOptions?: Parameters<Draw['render']>[0]
}) {
  const { draw, range, endIndex, key, selectionRenderOptions } = payload
  const selection = range.getSelectionElementList()
  if (selection?.length) {
    const missingStyleIndex = selection.findIndex(element => !element[key])
    selection.forEach(element => {
      element[key] = !!~missingStyleIndex
    })
    draw.render(selectionRenderOptions || { isSetCursor: false })
    return
  }
  const enterElement = resolveAnchorElement(draw)
  if (!enterElement) return
  const defaultStyle = range.getDefaultStyle() as IRangeElementStyle | null
  range.setDefaultStyle({
    [key]: enterElement[key] ? false : !defaultStyle?.[key]
  })
  const isSubmitHistory = enterElement.value === ZERO
  if (isSubmitHistory) {
    enterElement[key] = !enterElement[key]
  }
  renderCollapsedTextStyle({
    draw,
    endIndex,
    isSubmitHistory,
    isCompute: false
  })
}

export function executeUnderlineCommand(payload: {
  draw: Draw
  range: RangeManager
  endIndex: number
  textDecoration?: ITextDecoration
}) {
  const { draw, range, endIndex, textDecoration } = payload
  const selection = range.getSelectionElementList()
  if (selection?.length) {
    const isSetUnderline = selection.some(
      element =>
        !element.underline ||
        (!textDecoration && element.textDecoration) ||
        (textDecoration && !element.textDecoration) ||
        (textDecoration &&
          element.textDecoration &&
          !isObjectEqual(element.textDecoration, textDecoration))
    )
    selection.forEach(element => {
      element.underline = isSetUnderline
      if (isSetUnderline && textDecoration) {
        element.textDecoration = textDecoration
      } else {
        delete element.textDecoration
      }
    })
    draw.render({
      isSetCursor: false,
      isCompute: false,
      pageRenderScope: 'visible'
    })
    return
  }
  const enterElement = resolveAnchorElement(draw)
  if (!enterElement) return
  range.setDefaultStyle({
    underline: enterElement.underline ? false : !range.getDefaultStyle()?.underline
  })
  const isSubmitHistory = enterElement.value === ZERO
  if (isSubmitHistory) {
    enterElement.underline = !enterElement.underline
  }
  renderCollapsedTextStyle({
    draw,
    endIndex,
    isSubmitHistory,
    isCompute: false
  })
}

export function executeNullableColorStyleCommand(payload: {
  draw: Draw
  range: RangeManager
  endIndex: number
  key: TNullableColorStyleKey
  value: string | null
  isCompute: boolean
}) {
  const { draw, range, endIndex, key, value, isCompute } = payload
  const selection = range.getSelectionElementList()
  if (selection?.length) {
    selection.forEach(element => {
      if (value) {
        element[key] = value
      } else {
        delete element[key]
      }
    })
    draw.render({
      isSetCursor: false,
      isCompute,
      pageRenderScope: 'visible'
    })
    return
  }
  const enterElement = resolveAnchorElement(draw)
  range.setDefaultStyle({ [key]: value || undefined })
  const isSubmitHistory = enterElement?.value === ZERO
  if (isSubmitHistory) {
    if (value) {
      enterElement[key] = value
    } else {
      delete enterElement[key]
    }
  }
  renderCollapsedTextStyle({
    draw,
    endIndex,
    isSubmitHistory,
    isCompute
  })
}
