import { ZERO } from '../../dataset/constant/Common'
import {
  ICurrentPosition,
  IGetFloatPositionByXYPayload,
  IGetPositionByXYPayload
} from '../../interface/Position'
import {
  resolvePointerBoundaryAtPosition
} from './utils/resolvePointerBoundaryAtPosition'
import {
  isCheckboxHitElement,
  isElementInControl,
  isRadioHitElement
} from '../modules/control/hittest/ControlHitTest'
import {
  isFormulaDebugEnabled,
  logFormulaDebug,
  roundFormulaDebugNumber
} from '../modules/formula/debug/FormulaDebugLogger'
import { isFormulaTextElement } from '../modules/formula/layout/FormulaTextElementLayout'
import {
  getBackFloatImageHitDisplays,
  getFrontFloatImageHitDisplays,
  isFloatImageHitCandidate,
  isImageDirectHitElement,
  isPointInFloatImageElement
} from '../modules/image/hittest/ImageHitTestPolicy'
import {
  resolveListCheckboxTabHit
} from '../modules/list/hittest/ListCheckboxHitTestPolicy'
import { resolveTableFloatImageHit } from '../modules/table/hittest/resolveTableFloatImageHit'
import type { Position } from './Position'
import {
  resolveBestPageRowBandByPointer,
  resolveActiveRowBandBlankHit,
  resolveHeaderFooterZoneHit,
  resolveLastPageRowBoundaryIndex,
  resolvePageBoundaryHitIndex,
  TPageRowBand
} from './PositionHitTestPolicy'

/** 位置内部访问契约，用于在拆分模块间共享受控能力。 */
type PositionInternal = Record<string, any>

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
        ? this.getMainPositionList()
        : this.getOriginalPositionList()
    }
    elementList = elementList as NonNullable<typeof elementList>
    positionList = positionList as NonNullable<typeof positionList>
    const positionNo = isMainActive ? curPageNo : 0
    const pageRowBands =
      this.getPageRowBandsLookupMap(positionList).get(positionNo) || []
    const resolveRowBandRange = (rowBand: TPageRowBand) => {
      const pageRow = isMainActive
        ? this.draw.getPageRowList()?.[positionNo]?.[rowBand.rowNo]
        : null
      if (pageRow) {
        const column = this.draw
          .getServices()
          .pageColumnLayoutService.getColumn(
            positionNo,
            pageRow.columnIndex || 0,
            pageRow.columns
          )
        return {
          left: column.rect.x,
          right: column.rect.x + column.rect.width
        }
      }
      return {
        left: rowBand.left,
        right: rowBand.right
      }
    }
    const activeRowBand = resolveBestPageRowBandByPointer({
      x,
      y,
      pageRowBands,
      resolveRowBandRange
    })
    const resolvePreviousLogicalIndex = (
      positionCursor: number,
      boundaryIndex: number
    ) => {
      return positionList?.[positionCursor - 1]?.index ?? boundaryIndex - 1
    }
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
    // 1. 浮在文字上方的元素。
    const floatTopPosition = this.getFloatPositionByXY({
      ...payload,
      imgDisplays: getFrontFloatImageHitDisplays()
    })
    if (floatTopPosition) return floatTopPosition
    const directHitStart = activeRowBand?.start ?? 0
    const directHitEnd = activeRowBand?.end ?? -1
    // 2. 当前活动行带内的 direct-hit。
    for (let cursor = directHitStart; cursor <= directHitEnd; cursor++) {
      const position = positionList[cursor]
      if (!position) continue
      const element = elementList[cursor]
      if (!element) {
        continue
      }
      const {
        index,
        left,
        coordinate: { leftTop, rightTop, leftBottom }
      } = position
      const formulaHitPaddingX = isFormulaTextElement(element)
        ? Math.max(4, Math.min(12, position.metrics.width * 0.08))
        : 0
      const formulaHitPaddingY = isFormulaTextElement(element) ? 2 : 0
      // 公式本体中间区域用于打开编辑器，左右贴边区域用于放置光标。
      const formulaInlineEdgeInset = isFormulaTextElement(element)
        ? Math.max(4, Math.min(10, position.metrics.width * 0.08))
        : 0
      const isFormulaEdgeHit =
        isFormulaTextElement(element) &&
        (x <= leftTop[0] + formulaInlineEdgeInset ||
          x >= rightTop[0] - formulaInlineEdgeInset)
      if (
        leftTop[0] - left - formulaHitPaddingX > x ||
        rightTop[0] + formulaHitPaddingX < x ||
        leftTop[1] - formulaHitPaddingY > y ||
        leftBottom[1] + formulaHitPaddingY < y
      ) {
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
      if (isFormulaDebugEnabled() && isFormulaTextElement(element)) {
        logFormulaDebug('inline-hit-test', {
          index,
          boundaryIndex,
          value: element.value,
          latex: element.formula?.latex,
          x: roundFormulaDebugNumber(x),
          y: roundFormulaDebugNumber(y),
          left: roundFormulaDebugNumber(leftTop[0]),
          right: roundFormulaDebugNumber(rightTop[0]),
          top: roundFormulaDebugNumber(leftTop[1]),
          bottom: roundFormulaDebugNumber(leftBottom[1]),
          paddingX: roundFormulaDebugNumber(formulaHitPaddingX),
          paddingY: roundFormulaDebugNumber(formulaHitPaddingY),
          edgeInset: roundFormulaDebugNumber(formulaInlineEdgeInset),
          isFormulaEdgeHit
        })
      }
      const directHitPosition: TPointerHitResult = {
        isDirectHit: true,
        hitTargetIndex: index,
        index: boundaryIndex,
        isControl: isElementInControl(element),
        isFormulaEdgeHit
      }
      return directHitPosition
    }
    // 3. 浮在文字下层的元素。
    const floatBottomPosition = this.getFloatPositionByXY({
      ...payload,
      imgDisplays: getBackFloatImageHitDisplays()
    })
    if (floatBottomPosition) return floatBottomPosition
    // 4. 页内行带空白命中。
    const activeRowBandPosition = resolveActiveRowBandBlankHit({
      x,
      curPageLeftMargin: this.draw.getMargins(curPageNo)[3],
      activeRowBand,
      elementList,
      positionList,
      resolvePreviousLogicalIndex,
      resolveLogicalControlElement
    })
    if (activeRowBandPosition) {
      return activeRowBandPosition
    }

    // 5. 页眉 / 页脚区域切换。
    const header = this.draw.getHeader()
    const headerBottomY = header.getHeaderTop() + header.getHeight()
    const footer = this.draw.getFooter()
    const pageHeight = this.draw.getPageCanvasHost().getPageHeight(curPageNo)
    const footerTopY =
      pageHeight - (footer.getFooterBottom() + footer.getHeight())

    const headerFooterZoneHit = resolveHeaderFooterZoneHit({
      y,
      isMainActive,
      headerBottomY,
      footerTopY
    })
    if (headerFooterZoneHit) return headerFooterZoneHit

    // 6. 页边界 / 区域空白命中。
    const margins = this.draw.getMargins(curPageNo)
    const pageBoundaryHitIndex = resolvePageBoundaryHitIndex({
      x,
      y,
      margins,
      pageRowBands,
      positionList
    })
    if (pageBoundaryHitIndex !== null) {
      return {
        index: pageBoundaryHitIndex
      }
    }

    return {
      index: resolveLastPageRowBoundaryIndex({
        pageRowBands,
        positionList
      })
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
    for (let f = this.floatPositionList.length - 1; f >= 0; f--) {
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
        if (isPointInFloatImageElement({ element, floatPosition, x, y, scale })) {
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
