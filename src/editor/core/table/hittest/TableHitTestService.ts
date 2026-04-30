import { Draw } from '../../draw/Draw'
import {
  createCollapsedLeftCursorPosition,
  resolvePointerBoundaryAtPosition
} from '../../position/utils/resolvePointerBoundaryAtPosition'
import { ZERO } from '../../../dataset/constant/Common'
import { ControlComponent } from '../../../dataset/enum/Control'
import { EditorMode } from '../../../dataset/enum/Editor'
import { ElementType } from '../../../dataset/enum/Element'
import { ListStyle } from '../../../dataset/enum/List'
import { IElement, IElementPosition } from '../../../interface/Element'
import { ICurrentPosition, IGetPositionByXYPayload } from '../../../interface/Position'
import {
  ITableLayoutCellSlice,
  ITableLayoutSliceRowBand
} from '../layout/TableLayoutSnapshotTypes'
import {
  IResolvedSelectionBoundary,
  ITableHitTestRequest,
  ITableHitTestResult
} from './TableHitTestTypes'

// 命中服务内部结果。
// 对外只暴露公共 ICurrentPosition；
// service 内部可以保留命中链继续裁决所需的辅助字段。
type TResolvedPointerPosition = ICurrentPosition & {
  hitTargetIndex?: number
}

type TResolvedTableFragmentByPagePoint = {
  pageNo: number
  activeFragmentPosition: IElementPosition
  activeFragment: NonNullable<IElementPosition['tableFragment']> | IElement
}

// 表格 cell 命中后的内部结果。
// 除了 fragment 命中坐标，还保留当前 cell 的局部字符索引与 activeSlice，
// 供 selection-start / drag / boundary 继续裁决。
type TResolvedTableCellPositionByPagePoint = {
  index: number
  trIndex: number
  tdIndex: number
  tdValueIndex: number
  tdId: string
  trId: string
  tableId: string
  hitTargetIndex?: number
  cursorPosition?: IElementPosition
  isLeftSideBlank?: boolean
  activeSlice?: ITableLayoutCellSlice | null
}

export class TableHitTestService {
  private readonly draw: Draw

  constructor(draw: Draw) {
    this.draw = draw
  }

  // 先把 page-point 缩到“当前页有哪些表格 fragment”这一层，
  // 后续 cell / glyph 命中都只在命中的 fragment 内继续做。
  private resolveTableFragmentByPagePoint(
    pagePoint: ITableHitTestRequest['pagePoint']
  ): TResolvedTableFragmentByPagePoint | null {
    if (!pagePoint?.pageIndex) return null
    const pageNo = Number(pagePoint.pageIndex)
    if (!Number.isFinite(pageNo)) return null

    const pageFragmentPositions = this.draw
      .getTableLayoutSnapshotAccessor()
      .getPageFragmentPositions(pageNo)
    let activeFragmentPosition: IElementPosition | null = null
    for (let i = 0; i < pageFragmentPositions.length; i++) {
      const item = pageFragmentPositions[i]
      const { leftTop, rightBottom } = item.coordinate
      if (
        item.element?.type === ElementType.TABLE &&
        pagePoint.x >= leftTop[0] &&
        pagePoint.x <= rightBottom[0] &&
        pagePoint.y >= leftTop[1] &&
        pagePoint.y <= rightBottom[1]
      ) {
        activeFragmentPosition = item
        break
      }
    }

    const activeFragment =
      activeFragmentPosition?.tableFragment || activeFragmentPosition?.element || null
    if (!activeFragmentPosition || !activeFragment?.trList?.length) {
      return null
    }

    return {
      pageNo,
      activeFragmentPosition,
      activeFragment
    }
  }

  private resolveTableCellPositionByPagePoint(
    pagePoint: ITableHitTestRequest['pagePoint'],
    startPosition: ITableHitTestRequest['startPosition'] = null
  ): TResolvedTableCellPositionByPagePoint | null {
    // 这条 helper 负责把 page-point 缩到“当前命中的表格 cell + cell 内字符边界”。
    // 命中域后续所有表格 direct-hit 判断都建立在这里的返回值上。
    const fragmentMatch = this.resolveTableFragmentByPagePoint(pagePoint)
    if (!fragmentMatch) return null

    const { activeFragment, activeFragmentPosition } = fragmentMatch
    const sourceTableId =
      'tableId' in activeFragment ? activeFragment.tableId : activeFragment.id
    if (!sourceTableId) {
      return null
    }

    let trIndex = -1
    let tdIndex = -1
    let tr:
      | NonNullable<TResolvedTableFragmentByPagePoint['activeFragment']['trList']>[number]
      | undefined
    let td:
      | NonNullable<
          NonNullable<
            TResolvedTableFragmentByPagePoint['activeFragment']['trList']
          >[number]['tdList']
        >[number]
      | undefined

    const cellBoundsList = this.draw
      .getTableLayoutSnapshotAccessor()
      .getFragmentCellBounds(sourceTableId)
    for (let index = 0; index < cellBoundsList.length; index++) {
      const cellBounds = cellBoundsList[index]
      if (
        pagePoint!.x < cellBounds.x ||
        pagePoint!.x > cellBounds.x + cellBounds.width ||
        pagePoint!.y < cellBounds.y ||
        pagePoint!.y > cellBounds.y + cellBounds.height
      ) {
        continue
      }
      const nextTr = activeFragment.trList?.[cellBounds.trIndex]
      const nextTd = nextTr?.tdList?.[cellBounds.tdIndex]
      if (!nextTr || !nextTd) {
        continue
      }
      trIndex = cellBounds.trIndex
      tdIndex = cellBounds.tdIndex
      tr = nextTr
      td = nextTd
      break
    }

    if (!tr || !td || trIndex < 0 || tdIndex < 0) {
      return null
    }

    const resolvedTr = tr
    const resolvedTd = td

    const activeSlice =
      resolvedTr.id && resolvedTd.id
        ? this.draw.getTableLayoutSnapshotAccessor().resolveSliceByFragmentContext({
            tableId: sourceTableId,
            trId: resolvedTr.id,
            tdId: resolvedTd.id
          })
        : null

    const fragmentPositionList =
      activeSlice?.positionList || resolvedTd.positionList || []
    const rowBands =
      activeSlice?.rowBands ||
      (fragmentPositionList.length
        ? [
            {
              rowNo: fragmentPositionList[0].rowNo,
              top: fragmentPositionList[0].coordinate.leftTop[1],
              bottom:
                fragmentPositionList[fragmentPositionList.length - 1].coordinate
                  .leftBottom[1],
              startOffset: 0,
              endOffset: fragmentPositionList.length - 1
            }
          ]
        : [])
    const firstPosition = fragmentPositionList[0]
    const firstVisiblePosition =
      activeSlice?.firstVisibleOffset !== null &&
      activeSlice?.firstVisibleOffset !== undefined
        ? fragmentPositionList[activeSlice.firstVisibleOffset]
        : (() => {
            for (let i = 0; i < fragmentPositionList.length; i++) {
              const item = fragmentPositionList[i]
              if (item.coordinate.rightTop[0] > item.coordinate.leftTop[0]) {
                return item
              }
            }
            return undefined
          })()
    const fragmentStartThreshold = firstVisiblePosition
      ? firstVisiblePosition.coordinate.leftTop[0] +
        Math.min(
          6,
          Math.max(
            2,
            (firstVisiblePosition.coordinate.rightTop[0] -
              firstVisiblePosition.coordinate.leftTop[0]) /
              2
          )
        )
      : firstPosition?.coordinate.leftTop[0]
    const isLeadingArea = !!(
      firstPosition &&
      fragmentStartThreshold !== undefined &&
      pagePoint &&
      pagePoint.x < fragmentStartThreshold
    )

    const resolvePositionAbsoluteIndex = (
      position: IElementPosition,
      offset: number
    ) => {
      if (!activeSlice) return position.index
      if (
        position.index >= activeSlice.absoluteStart &&
        position.index < activeSlice.absoluteEnd
      ) {
        return position.index
      }
      return activeSlice.absoluteStart + offset
    }

    let rowBand: ITableLayoutSliceRowBand | null = null
    if (pagePoint) {
      for (let i = 0; i < rowBands.length; i++) {
        const band = rowBands[i]
        if (pagePoint.y >= band.top && pagePoint.y <= band.bottom) {
          rowBand = band
          break
        }
      }
    }
    const resolveRowStartVisibleOffset = (
      band: ITableLayoutSliceRowBand
    ) => {
      for (let offset = band.startOffset; offset <= band.endOffset; offset++) {
        const position = fragmentPositionList[offset]
        if (
          position &&
          position.value !== ZERO &&
          position.coordinate.rightTop[0] > position.coordinate.leftTop[0]
        ) {
          return offset
        }
      }
      return band.startOffset
    }

    const firstRowBand = rowBands[0] || null
    const lastRowBand = rowBands[rowBands.length - 1] || null
    const isBelowLastTextRow = !!(
      !startPosition &&
      pagePoint &&
      lastRowBand &&
      pagePoint.y > lastRowBand.bottom
    )
    const isAboveFirstTextRow = !!(
      pagePoint &&
      firstRowBand &&
      pagePoint.y < firstRowBand.top
    )

    // 把局部 cell 命中结果统一折叠成 service 内部结构，
    // 便于后续再投成公共 ICurrentPosition。
    const buildResolvedPosition = (payload: {
      boundaryIndex: number
      hitTargetIndex?: number
      cursorPosition?: IElementPosition
      isLeftSideBlank?: boolean
    }): TResolvedTableCellPositionByPagePoint => {
      const fallbackTableIndex = activeFragmentPosition.index
      const fallbackTrIndex = resolvedTd.rowIndex ?? trIndex
      const fallbackTdIndex = resolvedTd.colIndex ?? tdIndex

      if (!activeSlice) {
        return {
          index: fallbackTableIndex,
          trIndex: fallbackTrIndex,
          tdIndex: fallbackTdIndex,
          tdValueIndex: payload.boundaryIndex,
          tdId: resolvedTd.id!,
          trId: resolvedTr.id!,
          tableId: sourceTableId,
          hitTargetIndex: payload.hitTargetIndex,
          cursorPosition: payload.cursorPosition,
          isLeftSideBlank: payload.isLeftSideBlank,
          activeSlice: null
        }
      }

      return {
        index: activeSlice.logicalTableIndex,
        trIndex: activeSlice.logicalTrIndex,
        tdIndex: activeSlice.logicalTdIndex,
        tdValueIndex: payload.boundaryIndex,
        tdId: activeSlice.fragmentTdId,
        trId: activeSlice.fragmentTrId,
        tableId: activeSlice.fragmentTableId,
        hitTargetIndex: payload.hitTargetIndex,
        cursorPosition: payload.cursorPosition,
        isLeftSideBlank: payload.isLeftSideBlank,
        activeSlice
      }
    }

    let directHitPosition: IElementPosition | null = null
    let directHitOffset = -1
    if (pagePoint && rowBand) {
      for (
        let offset = rowBand.startOffset;
        offset <= rowBand.endOffset;
        offset++
      ) {
        const position = fragmentPositionList[offset]
        if (!position) continue
        const { leftTop, rightTop, leftBottom } = position.coordinate
        if (
          pagePoint.x >= leftTop[0] &&
          pagePoint.x <= rightTop[0] &&
          pagePoint.y >= leftTop[1] &&
          pagePoint.y <= leftBottom[1]
        ) {
          directHitPosition = position
          directHitOffset = offset
          break
        }
      }
    }

    const resolveDragHitTargetIndex = (
      position: IElementPosition,
      offset: number
    ): number => {
      const positionIndex = resolvePositionAbsoluteIndex(position, offset)
      if (!pagePoint || !startPosition) return positionIndex
      const startX = startPosition.x
      if (startX === undefined || startPosition.y === undefined) {
        return positionIndex
      }
      if (
        startPosition.tableId !== sourceTableId ||
        startPosition.trId !== resolvedTr.id ||
        startPosition.tdId !== resolvedTd.id
      ) {
        return positionIndex
      }
      const leftX = position.coordinate.leftTop[0]
      const rightX = position.coordinate.rightTop[0]
      const midX = Math.floor((leftX + rightX) / 2)
      if (pagePoint.x > startX && pagePoint.x < midX) {
        const startHitTargetIndex = startPosition.hitTargetIndex
        return Math.max(
          startHitTargetIndex ?? 0,
          Math.max(0, positionIndex - 1)
        )
      }
      if (pagePoint.x < startX && pagePoint.x > midX) {
        const targetMaxIndex = activeSlice
          ? activeSlice.absoluteEnd - 1
          : resolvedTd.value.length - 1
        return Math.min(targetMaxIndex, positionIndex + 1)
      }
      return positionIndex
    }

    if (directHitPosition && pagePoint && rowBand) {
      const directHitLocalIndex = directHitOffset
      const directHitIndex = resolvePositionAbsoluteIndex(
        directHitPosition,
        directHitOffset
      )
      const directHitTargetIndex =
        resolveDragHitTargetIndex(directHitPosition, directHitOffset)
      const directHitElement = resolvedTd.value[directHitLocalIndex]
      const [directLeftX, directRightX] = [
        directHitPosition.coordinate.leftTop[0],
        directHitPosition.coordinate.rightTop[0]
      ]
      const isRowStartDirectHit =
        directHitPosition.isFirstLetter ||
        directHitOffset === resolveRowStartVisibleOffset(rowBand)
      const { boundaryIndex: boundaryLocalIndex } =
        resolvePointerBoundaryAtPosition({
          x: pagePoint.x,
          position: directHitPosition,
          currentBoundaryIndex: directHitIndex,
          previousBoundaryIndex: Math.max(0, directHitIndex - 1),
          collapseToPreviousThresholdX: isRowStartDirectHit
            ? directLeftX + (directRightX - directLeftX) / 2
            : directLeftX +
              Math.min(2, Math.max(1, (directRightX - directLeftX) * 0.15)),
          canCollapseToPrevious:
            directHitElement?.value !== undefined &&
            directHitElement.value !== ''
        })
      const cursorPosition =
        boundaryLocalIndex !== directHitIndex
          ? createCollapsedLeftCursorPosition(
              directHitPosition,
              boundaryLocalIndex
            )
          : undefined

      return buildResolvedPosition({
        boundaryIndex: boundaryLocalIndex,
        hitTargetIndex: directHitTargetIndex,
        cursorPosition
      })
    }

    if (pagePoint && rowBand) {
      let rowCandidate: IElementPosition | null = null
      let rowCandidateOffset = -1
      for (
        let offset = rowBand.startOffset;
        offset <= rowBand.endOffset;
        offset++
      ) {
        const position = fragmentPositionList[offset]
        if (!position) continue
        const { rightTop } = position.coordinate
        if (pagePoint.x <= rightTop[0]) {
          rowCandidate = position
          rowCandidateOffset = offset
          break
        }
      }

      if (rowCandidate) {
        const candidateLocalIndex = rowCandidateOffset
        const candidateIndex = resolvePositionAbsoluteIndex(
          rowCandidate,
          rowCandidateOffset
        )
        const candidateHitTargetIndex =
          resolveDragHitTargetIndex(rowCandidate, rowCandidateOffset)
        const candidateElement = resolvedTd.value[candidateLocalIndex]
        const [candidateLeftX, candidateRightX] = [
          rowCandidate.coordinate.leftTop[0],
          rowCandidate.coordinate.rightTop[0]
        ]
        const { boundaryIndex: boundaryLocalIndex } =
          resolvePointerBoundaryAtPosition({
            x: pagePoint.x,
            position: rowCandidate,
            currentBoundaryIndex: candidateIndex,
            previousBoundaryIndex: Math.max(0, candidateIndex - 1),
            collapseToPreviousThresholdX:
              candidateLeftX +
              Math.min(2, Math.max(1, (candidateRightX - candidateLeftX) * 0.15)),
            canCollapseToPrevious:
              candidateElement?.value !== undefined &&
              candidateElement.value !== ''
          })
        const cursorPosition =
          boundaryLocalIndex !== candidateIndex
            ? createCollapsedLeftCursorPosition(
                rowCandidate,
                boundaryLocalIndex
              )
            : undefined

        return buildResolvedPosition({
          boundaryIndex: boundaryLocalIndex,
          hitTargetIndex: candidateHitTargetIndex,
          cursorPosition,
          isLeftSideBlank: !!cursorPosition
        })
      }
    }

    if (!activeSlice) {
      const fallbackEndIndex = Math.max(
        0,
        resolvedTd.positionList?.[resolvedTd.positionList.length - 1]?.index ?? 0
      )
      return {
        index: activeFragmentPosition.index,
        trIndex: resolvedTd.rowIndex ?? trIndex,
        tdIndex: resolvedTd.colIndex ?? tdIndex,
        tdValueIndex:
          isBelowLastTextRow && !isAboveFirstTextRow
            ? fallbackEndIndex
            : isLeadingArea
              ? 0
              : Math.max(0, resolvedTd.positionList?.[0]?.index ?? 0),
        tdId: resolvedTd.id!,
        trId: resolvedTr.id!,
        tableId: sourceTableId,
        hitTargetIndex:
          isBelowLastTextRow && !isAboveFirstTextRow ? fallbackEndIndex : 0
      }
    }

    const fallbackFragmentEndIndex = Math.max(
      activeSlice.absoluteStart,
      activeSlice.absoluteEnd - 1
    )
    return {
      index: activeSlice.logicalTableIndex,
      trIndex: activeSlice.logicalTrIndex,
      tdIndex: activeSlice.logicalTdIndex,
        tdValueIndex:
          isBelowLastTextRow && !isAboveFirstTextRow
            ? fallbackFragmentEndIndex
          : activeSlice.absoluteStart,
      tdId: activeSlice.fragmentTdId,
      trId: activeSlice.fragmentTrId,
      tableId: activeSlice.fragmentTableId,
      hitTargetIndex:
        isBelowLastTextRow && !isAboveFirstTextRow
          ? fallbackFragmentEndIndex
          : activeSlice.absoluteStart
    }
  }

  private resolveAdjustedPointerPosition(
    payload: IGetPositionByXYPayload
  ): TResolvedPointerPosition | null {
    // 非表格命中最后统一回退到 Position 基础命中，
    // 同时把 Position 内部结果重新包装成命中服务可继续消费的结构。
    const positionResult = this.draw.getPosition().getPositionByXY(
      payload
    ) as TResolvedPointerPosition
    if (!~positionResult.index) return null
    if (
      positionResult.isControl &&
      this.draw.getMode() !== EditorMode.READONLY
    ) {
      const { index, isTable, trIndex, tdIndex, tdValueIndex } = positionResult
      const { newIndex } = this.draw.getControl().moveCursor({
        index,
        isTable,
        trIndex,
        tdIndex,
        tdValueIndex
      })
      if (isTable) {
        positionResult.tdValueIndex = newIndex
      } else {
        positionResult.index = newIndex
      }
    }
    return positionResult
  }

  private resolveSelectionBoundary(
    positionResult: TResolvedPointerPosition
  ): IResolvedSelectionBoundary {
    // 命中服务内部统一在这里把 public position -> boundary，
    // 事件层不再自己解释表格 fragment / line-start / hitTarget 关系。
    const {
      index,
      isTable,
      tableId,
      trIndex,
      tdIndex,
      tdValueIndex,
      hitTargetIndex
    } = positionResult

    if (
      !isTable ||
      !tableId ||
      trIndex === undefined ||
      tdIndex === undefined ||
      tdValueIndex === undefined
    ) {
      return {
        absoluteIndex: index,
        localIndex: index,
        localBoundaryIndex: index,
        hitTargetIndex
      }
    }

    return {
      absoluteIndex: tdValueIndex,
      localIndex: tdValueIndex,
      localBoundaryIndex: tdValueIndex,
      hitTargetIndex
    }
  }

  private toPublicPointerPosition(
    positionResult: TResolvedPointerPosition
  ): ICurrentPosition {
    // 对外公共结果只保留调用方真正需要的命中语义，
    // 内部辅助字段不继续泄露到事件层之外。
    return {
      index: positionResult.index,
      cursorPosition: positionResult.cursorPosition,
      isLeftSideBlank: positionResult.isLeftSideBlank,
      hitTargetIndex: positionResult.hitTargetIndex,
      x: positionResult.x,
      y: positionResult.y,
      isCheckbox: positionResult.isCheckbox,
      isRadio: positionResult.isRadio,
      isControl: positionResult.isControl,
      isImage: positionResult.isImage,
      isTable: positionResult.isTable,
      isDirectHit: positionResult.isDirectHit,
      trIndex: positionResult.trIndex,
      tdIndex: positionResult.tdIndex,
      tdValueIndex: positionResult.tdValueIndex,
      tdId: positionResult.tdId,
      trId: positionResult.trId,
      tableId: positionResult.tableId,
      zone: positionResult.zone
    }
  }

  private resolveSnapshotTableElementHit(payload: {
    x: number
    y: number
    pageNo: number
    currentTableId: string
    tableSource: NonNullable<IElementPosition['tableFragment']> | IElement
    startPosition: ITableHitTestRequest['startPosition']
  }): TResolvedPointerPosition | null {
    // snapshot 命中主链：
    // fragment -> cell -> glyph box -> public position。
    const { x, y, pageNo, currentTableId, tableSource, startPosition } = payload
    const snapshotHit = this.resolveTableCellPositionByPagePoint(
      {
        x,
        y,
        pageIndex: String(pageNo)
      },
      startPosition
    )
    if (
      !snapshotHit ||
      snapshotHit.tableId !== currentTableId ||
      !snapshotHit.trId ||
      !snapshotHit.tdId
    ) {
      return null
    }

    const fragmentTr = tableSource.trList?.find(item => item.id === snapshotHit.trId)
    const fragmentTd = fragmentTr?.tdList.find(
      item => item.id === snapshotHit.tdId
    )
    if (!fragmentTr || !fragmentTd) {
      return null
    }

    const activeSlice =
      snapshotHit.activeSlice ||
      this.draw.getTableLayoutSnapshotAccessor().resolveSliceByFragmentContext({
        tableId: currentTableId,
        trId: snapshotHit.trId,
        tdId: snapshotHit.tdId
      }) ||
      null
    const hitTargetIndex = snapshotHit.hitTargetIndex ?? snapshotHit.tdValueIndex
    if (fragmentTd.value.length && hitTargetIndex === undefined) {
      return null
    }

    const localHitTargetIndex =
      hitTargetIndex === undefined
        ? -1
        : activeSlice
          ? hitTargetIndex - activeSlice.absoluteStart
          : hitTargetIndex
    const hitElement =
      localHitTargetIndex >= 0
        ? fragmentTd.value[localHitTargetIndex]
        : undefined
    if (fragmentTd.value.length && !hitElement) {
      return null
    }

    let tdValueIndex = snapshotHit.tdValueIndex
    if (
      hitElement?.type === ElementType.TAB &&
      hitElement.listStyle === ListStyle.CHECKBOX
    ) {
      let searchCursor = Math.max(0, localHitTargetIndex - 1)
      while (searchCursor > 0) {
        const searchElement = fragmentTd.value[searchCursor]
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
      tdValueIndex = activeSlice
        ? activeSlice.absoluteStart + searchCursor
        : searchCursor
    }

    return {
      index: snapshotHit.index,
      isTable: true,
      trIndex: snapshotHit.trIndex,
      tdIndex: snapshotHit.tdIndex,
      tdValueIndex,
      tdId: snapshotHit.tdId,
      trId: snapshotHit.trId,
      tableId: snapshotHit.tableId,
      hitTargetIndex: snapshotHit.hitTargetIndex,
      cursorPosition: snapshotHit.cursorPosition,
      isLeftSideBlank: snapshotHit.isLeftSideBlank,
      isDirectHit: true,
      isCheckbox:
        hitElement?.type === ElementType.CHECKBOX ||
        hitElement?.controlComponent === ControlComponent.CHECKBOX ||
        (hitElement?.type === ElementType.TAB &&
          hitElement.listStyle === ListStyle.CHECKBOX),
      isRadio:
        hitElement?.type === ElementType.RADIO ||
        hitElement?.controlComponent === ControlComponent.RADIO,
      isControl: !!hitElement?.controlId,
      isImage:
        hitElement?.type === ElementType.IMAGE ||
        hitElement?.type === ElementType.LATEX
    }
  }

  private resolveTablePointerPositionByPagePoint(
    pagePoint: ITableHitTestRequest['pagePoint'],
    startPosition: ITableHitTestRequest['startPosition'] = null
  ): TResolvedPointerPosition | null {
    // 表格 page-point 主入口：
    // 先找 fragment，再把命中继续缩到 fragment 内部。
    const fragmentMatch = this.resolveTableFragmentByPagePoint(pagePoint)
    if (!fragmentMatch || !pagePoint) {
      return null
    }

    const tableSource = fragmentMatch.activeFragment
    const currentTableId =
      ('tableId' in tableSource ? tableSource.tableId : tableSource.id) || null
    if (!currentTableId) {
      return null
    }

    return this.resolveSnapshotTableElementHit({
      x: pagePoint.x,
      y: pagePoint.y,
      pageNo: fragmentMatch.pageNo,
      currentTableId,
      tableSource,
      startPosition
    })
  }

  public resolve(payload: ITableHitTestRequest): ITableHitTestResult {
    // 对外统一入口：
    // 1. 先尝试表格 snapshot 命中；
    // 2. 表格拖选跨页时允许按 pageIndex 扩大搜索；
    // 3. 最后回退到正文 Position 基础命中。
    const { x, y, pageNo, pagePoint, startPosition } = payload
    let positionResult = this.resolveTablePointerPositionByPagePoint(
      pagePoint,
      startPosition
    )

    if (!positionResult && startPosition?.isTable && pagePoint) {
      const pageList = this.draw.getPageList()
      for (let pageCursor = 0; pageCursor < pageList.length; pageCursor++) {
        positionResult = this.resolveTablePointerPositionByPagePoint(
          {
            ...pagePoint,
            pageIndex: String(pageCursor)
          },
          startPosition
        )
        if (positionResult) {
          break
        }
      }
    }

    if (!positionResult) {
      positionResult = this.resolveAdjustedPointerPosition({
        x,
        y,
        pageNo
      })
    }

    if (!positionResult) {
      return {
        positionResult: null,
        boundary: null
      }
    }
    return {
      positionResult: this.toPublicPointerPosition(positionResult),
      boundary: this.resolveSelectionBoundary(positionResult)
    }
  }

}
