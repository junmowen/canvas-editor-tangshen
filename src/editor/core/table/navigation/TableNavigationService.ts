import { Draw } from '../../draw/Draw'
import { IPositionContext } from '../../../interface/Position'
import { ITableLayoutCellSlice } from '../layout/TableLayoutSnapshotTypes'
import {
  ITableBackspaceNavigationRequest,
  ITableBackspaceNavigationResult,
  ITableAdjacentCellNavigationResult,
  ITableFragmentTransitionRequest,
  ITableHorizontalBoundaryNavigationRequest,
  ITableVerticalEntryNavigationRequest,
  ITableVerticalEntryNavigationResult,
  ITableVerticalNavigationRequest,
  ITableVerticalNavigationResult
} from './TableNavigationTypes'
import { resolveBackspaceNavigation } from './TableNavigationBackspace'
import { resolveVerticalEntryNavigation } from './TableNavigationEntry'
import { resolveFragmentTransitionIndex } from './TableNavigationFragment'
import { resolveHorizontalBoundaryNavigation } from './TableNavigationHorizontal'
import {
} from './TableNavigationAlgorithms'
import { resolveVerticalFragmentTransition } from './TableNavigationVerticalFragment'
import { resolveVerticalNavigation } from './TableNavigationVertical'

export class TableNavigationService {
  private readonly draw: Draw

  constructor(draw: Draw) {
    this.draw = draw
  }

  // navigation 层内部统一读取逻辑 cell 的全部 slice，
  // 后续 fragment 前后跳转、同 cell 垂直导航都复用这份数据。
  private getLogicalCellSliceList(
    tableIndex: number,
    trIndex: number,
    tdIndex: number
  ): ITableLayoutCellSlice[] {
    const table = this.draw.getOriginalElementList()[tableIndex]
    const tr = table?.trList?.[trIndex]
    const td = tr?.tdList?.[tdIndex]
    if (!table?.id || !tr?.id || !td?.id) {
      return []
    }

    return this.draw
      .getTableLayoutSnapshotAccessor()
      .getCellSlicesByLogicalCell({
        tableId: table.id,
        trId: tr.id,
        tdId: td.id
      })
      .slice()
  }


  public resolveFragmentTransitionIndex(
    payload: ITableFragmentTransitionRequest
  ): number | null {
    return resolveFragmentTransitionIndex(
      {
        resolveSliceByPositionContext: this.draw
          .getTableLayoutSnapshotAccessor()
          .resolveSliceByPositionContext.bind(this.draw.getTableLayoutSnapshotAccessor()),
        getOriginalElementList: this.draw.getOriginalElementList.bind(this.draw),
        getCellSlicesByLogicalCell: this.draw
          .getTableLayoutSnapshotAccessor()
          .getCellSlicesByLogicalCell.bind(this.draw.getTableLayoutSnapshotAccessor())
      },
      payload
    )
  }

  public resolveHorizontalBoundaryNavigation(
    payload: ITableHorizontalBoundaryNavigationRequest
  ): ITableAdjacentCellNavigationResult | null {
    return resolveHorizontalBoundaryNavigation(
      {
        getOriginalElementList: this.draw.getOriginalElementList.bind(this.draw),
        getElementList: this.draw.getElementList.bind(this.draw),
        resolveSliceByPositionContext: this.draw
          .getTableLayoutSnapshotAccessor()
          .resolveSliceByPositionContext.bind(this.draw.getTableLayoutSnapshotAccessor()),
        getLogicalCellSliceList: this.getLogicalCellSliceList.bind(this)
      },
      payload
    )
  }

  public resolveVerticalNavigation(
    payload: ITableVerticalNavigationRequest
  ): ITableVerticalNavigationResult | null {
    return resolveVerticalNavigation(
      {
        getOriginalElementList: this.draw.getOriginalElementList.bind(this.draw),
        getPositionList: this.draw.getPosition().getPositionList.bind(
          this.draw.getPosition()
        ),
        getCursorPosition: this.draw.getPosition().getCursorPosition.bind(
          this.draw.getPosition()
        ),
        resolveSliceByPositionContext: this.draw
          .getTableLayoutSnapshotAccessor()
          .resolveSliceByPositionContext.bind(this.draw.getTableLayoutSnapshotAccessor()),
        getLogicalCellSliceList: this.getLogicalCellSliceList.bind(this),
        resolveFragmentTransitionIndex: this.resolveFragmentTransitionIndex.bind(this)
      },
      payload
    )
  }

  public resolveVerticalFragmentTransition(payload: {
    positionContext: IPositionContext
    cursorIndex: number
    cursorPageNo: number
    nextPositionPageNo?: number
    isShiftKey: boolean
  }): number | null {
    return resolveVerticalFragmentTransition({
      ...payload,
      resolveSliceByPositionContext: this.draw
        .getTableLayoutSnapshotAccessor()
        .resolveSliceByPositionContext.bind(this.draw.getTableLayoutSnapshotAccessor()),
      getOriginalElementList: this.draw.getOriginalElementList.bind(this.draw),
      getLogicalCellSliceList: this.getLogicalCellSliceList.bind(this),
      resolveFragmentTransitionIndex: this.resolveFragmentTransitionIndex.bind(this)
    })
  }

  public resolveBackspaceNavigation(
    payload: ITableBackspaceNavigationRequest
  ): ITableBackspaceNavigationResult | null {
    return resolveBackspaceNavigation({
      positionContext: payload.positionContext,
      getOriginalElementList: this.draw.getOriginalElementList.bind(this.draw)
    })
  }

  public resolveVerticalEntryNavigation(
    payload: ITableVerticalEntryNavigationRequest
  ): ITableVerticalEntryNavigationResult | null {
    return resolveVerticalEntryNavigation({
      tableIndex: payload.tableIndex,
      cursorX: payload.cursorX,
      direction: payload.direction,
      getElementList: this.draw.getElementList.bind(this.draw),
      getOptions: this.draw.getOptions.bind(this.draw),
      getMargins: this.draw.getMargins.bind(this.draw)
    })
  }

}
