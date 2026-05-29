import { ZERO } from '../../dataset/constant/Common'
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
import {
  isCheckboxHitElement,
  isElementInControl,
  isRadioHitElement
} from '../modules/control/hittest/ControlHitTest'
import {
  getBackFloatImageHitDisplays,
  getFrontFloatImageHitDisplays,
  isFloatImageHitCandidate,
  isImageDirectHitElement,
  isPointInFloatImageElement
} from '../modules/image/hittest/ImageHitTestPolicy'
import {
  resolveListCheckboxHeadHit,
  resolveListCheckboxHeadStartX,
  resolveListCheckboxTabHit
} from '../modules/list/hittest/ListCheckboxHitTestPolicy'
import { resolveTableFloatImageHit } from '../modules/table/hittest/resolveTableFloatImageHit'
import type { Position } from './Position'

/** 位置内部访问契约，用于在拆分模块间共享受控能力。 */
type PositionInternal = Record<string, any>

/** 页面行band类型，用于约束内部流程中传递的数据结构。 */
type TPageRowBand = {
  /** 行号，用于定位页面内的目标行。 */
  rowNo: number
  /** 上侧偏移或边距，用于计算区域边界。 */
  top: number
  /** 下侧偏移或边距，用于计算区域边界。 */
  bottom: number
  /** 起始位置，用于描述范围、拖拽或扫描的入口。 */
  start: number
  /** 结束数值，用于当前布局、统计或索引计算。 */
  end: number
}

type TPointerHitResult = ICurrentPosition & {
  /** 命中目标索引，用于定位指针事件落点对应的元素。 */
  hitTargetIndex?: number
}

declare module './Position' {
  /** 位置契约，用于约束内部流程中传递的数据结构。 */
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
      imgDisplays: getFrontFloatImageHitDisplays()
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
      if (isImageDirectHitElement(element)) {
        return {
          index,
          hitTargetIndex: index,
          isDirectHit: true,
          isImage: true
        }
      }
      if (isCheckboxHitElement(element)) {
        return {
          index,
          hitTargetIndex: index,
          isDirectHit: true,
          isCheckbox: true
        }
      }
      const listCheckboxTabHit = resolveListCheckboxTabHit({
        element,
        cursor,
        elementList,
        positionList
      })
      if (listCheckboxTabHit) return listCheckboxTabHit
      if (isRadioHitElement(element)) {
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
        isControl: isElementInControl(element)
      }
      return directHitPosition
    }
    // 第三层：再处理浮在文字下层的元素。
    // 这类元素优先级低于正文 direct-hit，但高于行带/页边界兜底。
    const floatBottomPosition = this.getFloatPositionByXY({
      ...payload,
      imgDisplays: getBackFloatImageHitDisplays()
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
        const headStartX = resolveListCheckboxHeadStartX({
          headElement,
          defaultStartX: headPosition.coordinate.leftTop[0],
          leftMargin: this.draw.getMargins()[3]
        })
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
            isControl: isElementInControl(
              resolveLogicalControlElement(lineStartBoundaryIndex)
            )
          }
        } else {
          const listCheckboxHeadHit = resolveListCheckboxHeadHit({
            headElement,
            headPosition,
            x
          })
          if (listCheckboxHeadHit) {
            activeRowBandPosition = listCheckboxHeadHit
          } else {
            curPositionIndex = tailPosition.index
          }
        }

        if (!activeRowBandPosition && curPositionIndex >= 0) {
          activeRowBandPosition = {
            index: curPositionIndex,
            isControl: isElementInControl(
              resolveLogicalControlElement(curPositionIndex)
            )
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
      const floatPosition = this.floatPositionList[f]
      const { position, element, zone: floatElementZone, pageNo } = floatPosition
      if (
        currentPageNo === pageNo &&
        isFloatImageHitCandidate({
          element,
          imgDisplays: payload.imgDisplays
        }) &&
        (!floatElementZone || floatElementZone === currentZone)
      ) {
        if (isPointInFloatImageElement({ element, x, y, scale })) {
          const tableFloatHit = resolveTableFloatImageHit(floatPosition)
          if (tableFloatHit) {
            return tableFloatHit
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

/** 安装位置命中testmethods，把拆分方法挂载到目标原型。 */
export function installPositionHitTestMethods(PositionClass: typeof Position) {
  Object.assign(PositionClass.prototype, positionHitTestMethods)
}
