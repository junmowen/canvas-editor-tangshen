import { ElementType, ListStyle } from '../..'
import { ZERO } from '../../dataset/constant/Common'
import { ImageDisplay } from '../../dataset/enum/Common'
import { ControlComponent } from '../../dataset/enum/Control'
import { EditorZone } from '../../dataset/enum/Editor'
import { IElementPosition } from '../../interface/Element'
import {
  ICurrentPosition,
  IGetFloatPositionByXYPayload,
  IGetPositionByXYPayload
} from '../../interface/Position'
import {
  createCollapsedLeftCursorPosition,
  resolvePointerBoundaryAtPosition
} from './utils/resolvePointerBoundaryAtPosition'
import type { Position } from './Position'

type PositionInternal = Record<string, any>

type TPageRowBand = {
  rowNo: number
  top: number
  bottom: number
  start: number
  end: number
}

type TPointerHitResult = ICurrentPosition & {
  hitTargetIndex?: number
}

declare module './Position' {
  interface Position {
    getPositionByXY(payload: IGetPositionByXYPayload): ICurrentPosition
    getFloatPositionByXY(
      payload: IGetFloatPositionByXYPayload
    ): ICurrentPosition | void
  }
}

const positionHitTestMethods = {
  getPositionByXY(this: PositionInternal, payload: IGetPositionByXYPayload): ICurrentPosition {
    const { x, y } = payload
    let { elementList, positionList } = payload
    const zoneManager = this.draw.getZone()
    const curPageNo = payload.pageNo ?? this.draw.getPageNo()
    const isMainActive = zoneManager.isMainActive()
    const currentZone = zoneManager.getZone()
    const pointerZone = zoneManager.getZoneByY(y, curPageNo)
    if (pointerZone !== currentZone) {
      return {
        index: -1,
        zone: pointerZone
      }
    }
    if (!elementList) {
      elementList = isMainActive
        ? this.draw.getObjectResolver().getLayoutMainElementList()
        : this.draw.getObjectResolver().getOriginalElementList()
    }
    if (!positionList) {
      positionList = isMainActive
        ? this.getLayoutMainPositionList()
        : this.getOriginalPositionList()
    }
    elementList = elementList as NonNullable<typeof elementList>
    positionList = positionList as NonNullable<typeof positionList>
    const positionNo = isMainActive ? curPageNo : 0
    const pageRowBands =
      this.getPageRowBandsLookupMap(positionList).get(positionNo) || []
    let activeRowBand: TPageRowBand | null = null
    let left = 0
    let right = pageRowBands.length - 1
    while (left <= right) {
      const middle = Math.floor((left + right) / 2)
      const rowBand = pageRowBands[middle]
      if (y < rowBand.top) {
        right = middle - 1
      } else if (y > rowBand.bottom) {
        left = middle + 1
      } else {
        activeRowBand = rowBand
        break
      }
    }
    // 命中左半区时，需要回退到前一个逻辑边界；
    // 这里统一把“当前位置 cursor -> 逻辑边界索引”的回退规则抽成局部函数。
    const resolvePreviousLogicalIndex = (
      positionCursor: number,
      fallbackIndex: number
    ) => {
      return positionList?.[positionCursor - 1]?.index ?? fallbackIndex - 1
    }
    // 页内行带兜底命中可能需要根据逻辑索引回查真实元素，
    // 例如判断当前位置是否落在控件上。
    const resolveLogicalControlElement = (logicalIndex: number) => {
      const logicalPosition = this.getPositionByPageAndIndex(
        positionNo,
        logicalIndex,
        positionList
      )
      if (!logicalPosition) {
        return undefined
      }
      return elementList?.[logicalPosition.index]
    }
    // 第一层：优先验证浮在文字上方的元素。
    // 这层命中需要早于正文字符盒，否则会被正文文字错误吞掉。
    const floatTopPosition = this.getFloatPositionByXY({
      ...payload,
      imgDisplays: [ImageDisplay.FLOAT_TOP, ImageDisplay.SURROUND]
    })
    if (floatTopPosition) return floatTopPosition
    const directHitStart = activeRowBand?.start ?? 0
    const directHitEnd = activeRowBand?.end ?? -1
    // 第二层：只在当前活动行带内做 direct-hit 命中，
    // 避免跨整页线性扫描。
    for (let cursor = directHitStart; cursor <= directHitEnd; cursor++) {
      const position = positionList[cursor]
      if (!position) continue
      const {
        index,
        left,
        coordinate: { leftTop, rightTop, leftBottom }
      } = position
      if (
        leftTop[0] - left > x ||
        rightTop[0] < x ||
        leftTop[1] > y ||
        leftBottom[1] < y
      ) {
        continue
      }
      const element = elementList[cursor]
      if (!element) {
        continue
      }
      if (
        element.type === ElementType.IMAGE ||
        element.type === ElementType.LATEX
      ) {
        return {
          index,
          hitTargetIndex: index,
          isDirectHit: true,
          isImage: true
        }
      }
      if (
        element.type === ElementType.CHECKBOX ||
        element.controlComponent === ControlComponent.CHECKBOX
      ) {
        return {
          index,
          hitTargetIndex: index,
          isDirectHit: true,
          isCheckbox: true
        }
      }
      if (
        element.type === ElementType.TAB &&
        element.listStyle === ListStyle.CHECKBOX
      ) {
        let searchCursor = cursor - 1
        while (searchCursor > 0) {
          const searchElement = elementList[searchCursor]
          if (!searchElement) {
            searchCursor--
            continue
          }
          if (
            searchElement.value === ZERO &&
            searchElement.listStyle === ListStyle.CHECKBOX
          ) {
            break
          }
          searchCursor--
        }
        return {
          index: positionList[searchCursor]?.index ?? searchCursor,
          hitTargetIndex: positionList[searchCursor]?.index ?? searchCursor,
          isDirectHit: true,
          isCheckbox: true
        }
      }
      if (
        element.type === ElementType.RADIO ||
        element.controlComponent === ControlComponent.RADIO
      ) {
        return {
          index,
          hitTargetIndex: index,
          isDirectHit: true,
          isRadio: true
        }
      }

      const { boundaryIndex } =
        resolvePointerBoundaryAtPosition({
          x,
          position,
          currentBoundaryIndex: index,
          previousBoundaryIndex: resolvePreviousLogicalIndex(cursor, index),
          canCollapseToPrevious: element.value !== ZERO
        })
      const directHitPosition: TPointerHitResult = {
        isDirectHit: true,
        hitTargetIndex: index,
        index: boundaryIndex,
        isControl: !!element.controlId
      }
      return directHitPosition
    }
    // 第三层：再处理浮在文字下层的元素。
    // 这类元素优先级低于正文 direct-hit，但高于行带/页边界兜底。
    const floatBottomPosition = this.getFloatPositionByXY({
      ...payload,
      imgDisplays: [ImageDisplay.FLOAT_BOTTOM]
    })
    if (floatBottomPosition) return floatBottomPosition
    // 第四层：页内行带兜底。
    // 当没有命中具体字符盒时，仍需要在当前行带内给出一个稳定边界，
    // 以保证点击空白区、行首前侧区域时的落点一致性。
    let activeRowBandPosition: TPointerHitResult | null = null
    if (activeRowBand) {
      const headIndex = activeRowBand.start
      const tailIndex = activeRowBand.end
      const headElement = elementList[headIndex]
      const headPosition = positionList[headIndex]
      const tailPosition = positionList[tailIndex]
      if (headElement && headPosition && tailPosition) {
        let curPositionIndex = -1
        const headStartX =
          headElement.listStyle === ListStyle.CHECKBOX
            ? this.draw.getMargins()[3]
            : headPosition.coordinate.leftTop[0]
        if (x < headStartX) {
          const lineStartBoundaryIndex =
            headPosition.value === ZERO
              ? headPosition.index
              : resolvePreviousLogicalIndex(headIndex, headPosition.index)
          activeRowBandPosition = {
            index: lineStartBoundaryIndex,
            hitTargetIndex: headPosition.index,
            cursorPosition: createCollapsedLeftCursorPosition(
              headPosition,
              lineStartBoundaryIndex
            ),
            isLeftSideBlank: true,
            isControl: !!resolveLogicalControlElement(lineStartBoundaryIndex)?.controlId
          }
        } else if (
          headElement.listStyle === ListStyle.CHECKBOX &&
          x < headPosition.coordinate.leftTop[0]
        ) {
          activeRowBandPosition = {
            index: headPosition.index,
            isDirectHit: true,
            isCheckbox: true
          }
        } else {
          curPositionIndex = tailPosition.index
        }

        if (!activeRowBandPosition && curPositionIndex >= 0) {
          activeRowBandPosition = {
            index: curPositionIndex,
            isControl: !!resolveLogicalControlElement(curPositionIndex)?.controlId
          }
        }
      }
    }
    if (activeRowBandPosition) {
      return activeRowBandPosition
    }

    // 第五层：页眉 / 页脚区域切换。
    // 这里保留命中计算完成后的 zone 回退，避免在区域切换时直接
    // 跳过正文命中，导致第一次点击只切区不落点。
    const header = this.draw.getHeader()
    const headerBottomY = header.getHeaderTop() + header.getHeight()
    const footer = this.draw.getFooter()
    const pageHeight = this.draw.getPageCanvasHost().getPageHeight(curPageNo)
    const footerTopY =
      pageHeight - (footer.getFooterBottom() + footer.getHeight())

    if (isMainActive) {
      if (y < headerBottomY) {
        return {
          index: -1,
          zone: EditorZone.HEADER
        }
      }
      if (y > footerTopY) {
        return {
          index: -1,
          zone: EditorZone.FOOTER
        }
      }
    } else if (y <= footerTopY && y >= headerBottomY) {
      return {
        index: -1,
        zone: EditorZone.MAIN
      }
    }

    // 第六层：页边界 / 区域兜底。
    // 当前页内没有任何直接命中时，再判断是否切到页眉页脚，
    // 或回退到首行 / 末行边界。
    const margins = this.draw.getMargins()
    if (y <= margins[0]) {
      const firstRowBand = pageRowBands[0] || null
      let firstRowPosition: IElementPosition | null = null
      if (firstRowBand) {
        for (let cursor = firstRowBand.start; cursor <= firstRowBand.end; cursor++) {
          const position = positionList[cursor]
          if (!position) continue
          const { leftTop, rightTop } = position.coordinate
          if (
            x <= margins[3] ||
            (x >= leftTop[0] && x <= rightTop[0]) ||
            cursor === firstRowBand.end
          ) {
            firstRowPosition = position
            break
          }
        }
      }
      if (firstRowPosition) {
        return {
          index: firstRowPosition.index
        }
      }
    } else {
      const lastRowBand = pageRowBands[pageRowBands.length - 1] || null
      let lastRowPosition: IElementPosition | null = null
      if (lastRowBand) {
        for (let cursor = lastRowBand.start; cursor <= lastRowBand.end; cursor++) {
          const position = positionList[cursor]
          if (!position) continue
          const { leftTop, rightTop } = position.coordinate
          if (
            x <= margins[3] ||
            (x >= leftTop[0] && x <= rightTop[0]) ||
            cursor === lastRowBand.end
          ) {
            lastRowPosition = position
            break
          }
        }
      }
      if (lastRowPosition) {
        return {
          index: lastRowPosition.index
        }
      }
    }

    const lastRowBand = pageRowBands[pageRowBands.length - 1]
    return {
      index:
        (lastRowBand ? positionList[lastRowBand.end]?.index : undefined) ||
        positionList[positionList.length - 1]?.index ||
        positionList.length - 1
    }
  },

  getFloatPositionByXY(
    this: PositionInternal,
    payload: IGetFloatPositionByXYPayload
  ): ICurrentPosition | void {
    const { x, y } = payload
    const currentPageNo = payload.pageNo ?? this.draw.getPageNo()
    const currentZone = this.draw.getZone().getZone()
    const { scale } = this.options
    for (let f = 0; f < this.floatPositionList.length; f++) {
      const {
        position,
        element,
        isTable,
        index,
        trIndex,
        tdIndex,
        tdValueIndex,
        zone: floatElementZone,
        pageNo
      } = this.floatPositionList[f]
      if (
        currentPageNo === pageNo &&
        element.type === ElementType.IMAGE &&
        element.imgDisplay &&
        payload.imgDisplays.includes(element.imgDisplay) &&
        (!floatElementZone || floatElementZone === currentZone)
      ) {
        const imgFloatPosition = element.imgFloatPosition!
        const imgFloatPositionX = imgFloatPosition.x * scale
        const imgFloatPositionY = imgFloatPosition.y * scale
        const elementWidth = element.width! * scale
        const elementHeight = element.height! * scale
        if (
          x >= imgFloatPositionX &&
          x <= imgFloatPositionX + elementWidth &&
          y >= imgFloatPositionY &&
          y <= imgFloatPositionY + elementHeight
        ) {
          if (isTable) {
            return {
              index: index!,
              isDirectHit: true,
              isImage: true,
              isTable,
              trIndex,
              tdIndex,
              tdValueIndex,
              tdId: element.tdId,
              trId: element.trId,
              tableId: element.tableId
            }
          }
          return {
            index: position.index,
            isDirectHit: true,
            isImage: true
          }
        }
      }
    }
  }
}

export function installPositionHitTestMethods(PositionClass: typeof Position) {
  Object.assign(PositionClass.prototype, positionHitTestMethods)
}
