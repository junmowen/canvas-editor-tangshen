import { Draw } from '../../../draw/Draw'
import { IPositionContext } from '../../../../interface/Position'
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
import { resolveVerticalFragmentTransition } from './TableNavigationVerticalFragment'
import { resolveVerticalNavigation } from './TableNavigationVertical'

export class TableNavigationService {
  /** 只读绘制核心实例，提供布局、渲染和命中查询能力。 */
  private readonly draw: Draw

  /** 初始化 TableNavigationService 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
  }

  public resolveFragmentTransitionIndex(
    payload: ITableFragmentTransitionRequest
  ): number | null {
    return resolveFragmentTransitionIndex(
      {
        resolveLogicalCellFromContext: this.draw
          .getTargetResolver()
          .resolveLogicalTableCellByPositionContext.bind(
            this.draw.getTargetResolver()
          ),
        resolveTableTdByIndex: this.draw
          .getTargetResolver()
          .resolveOriginalTableTdByIndex.bind(this.draw.getTargetResolver()),
        resolveSliceByPositionContext: this.draw
          .getTargetResolver()
          .resolveTableSliceByPositionContext.bind(this.draw.getTargetResolver()),
        getCellSlicesByLogicalCell: this.draw
          .getTargetResolver()
          .getCellSlicesByLogicalCell.bind(this.draw.getTargetResolver())
      },
      payload
    )
  }

  public resolveHorizontalBoundaryNavigation(
    payload: ITableHorizontalBoundaryNavigationRequest
  ): ITableAdjacentCellNavigationResult | null {
    return resolveHorizontalBoundaryNavigation(
      {
        getOriginalElement: this.draw.getObjectResolver().getOriginalElement.bind(
          this.draw.getObjectResolver()
        ),
        getElement: this.draw.getObjectResolver().getElement.bind(
          this.draw.getObjectResolver()
        ),
        resolveLogicalCellFromContext: this.draw
          .getTargetResolver()
          .resolveLogicalTableCellByPositionContext.bind(
            this.draw.getTargetResolver()
          ),
        resolveSliceByPositionContext: this.draw
          .getTargetResolver()
          .resolveTableSliceByPositionContext.bind(this.draw.getTargetResolver()),
        getLogicalCellSliceList: this.draw
          .getTargetResolver()
          .getLogicalCellSliceList.bind(this.draw.getTargetResolver())
      },
      payload
    )
  }

  public resolveVerticalNavigation(
    payload: ITableVerticalNavigationRequest
  ): ITableVerticalNavigationResult | null {
    return resolveVerticalNavigation(
      {
        getOriginalElement: this.draw.getObjectResolver().getOriginalElement.bind(
          this.draw.getObjectResolver()
        ),
        getPositionList: this.draw.getCoordinate().getPositionList.bind(
          this.draw.getCoordinate()
        ),
        getCursorPosition: this.draw.getCoordinate().getCursorPosition.bind(
          this.draw.getCoordinate()
        ),
        resolveLogicalCellFromContext: this.draw
          .getTargetResolver()
          .resolveLogicalTableCellByPositionContext.bind(
            this.draw.getTargetResolver()
          ),
        resolveSliceByPositionContext: this.draw
          .getTargetResolver()
          .resolveTableSliceByPositionContext.bind(this.draw.getTargetResolver()),
        getLogicalCellSliceList: this.draw
          .getTargetResolver()
          .getLogicalCellSliceList.bind(this.draw.getTargetResolver()),
        resolveFragmentTransitionIndex: this.resolveFragmentTransitionIndex.bind(this)
      },
      payload
    )
  }

  public resolveVerticalFragmentTransition(payload: {
    /** 命中位置上下文，连接元素索引、行列和区域信息。 */
    positionContext: IPositionContext
    /** 光标元素索引，用于定位插入点所在元素。 */
    cursorIndex: number
    /** 光标页面no，用于定位对应页、行或序号。 */
    cursorPageNo: number
    /** 下一个位置页面no，用于定位对应页、行或序号。 */
    nextPositionPageNo?: number
    /** 是否Shiftkey，用于控制当前流程的判断分支。 */
    isShiftKey: boolean
  }): number | null {
    return resolveVerticalFragmentTransition({
      ...payload,
      resolveLogicalCellFromContext: this.draw
        .getTargetResolver()
        .resolveLogicalTableCellByPositionContext.bind(
          this.draw.getTargetResolver()
        ),
      getLogicalCellSliceList: this.draw
        .getTargetResolver()
        .getLogicalCellSliceList.bind(this.draw.getTargetResolver()),
      resolveFragmentTransitionIndex: this.resolveFragmentTransitionIndex.bind(this)
    })
  }

  public resolveBackspaceNavigation(
    payload: ITableBackspaceNavigationRequest
  ): ITableBackspaceNavigationResult | null {
    return resolveBackspaceNavigation({
      positionContext: payload.positionContext,
      resolvePreviousPagingTable: this.draw
        .getTargetResolver()
        .resolvePreviousPagingTable.bind(this.draw.getTargetResolver())
    })
  }

  public resolveVerticalEntryNavigation(
    payload: ITableVerticalEntryNavigationRequest
  ): ITableVerticalEntryNavigationResult | null {
    return resolveVerticalEntryNavigation({
      tableIndex: payload.tableIndex,
      cursorX: payload.cursorX,
      direction: payload.direction,
      getElement: this.draw.getObjectResolver().getElement.bind(
        this.draw.getObjectResolver()
      ),
      getOptions: this.draw.getOptions.bind(this.draw),
      getMargins: this.draw.getMargins.bind(this.draw)
    })
  }

}
