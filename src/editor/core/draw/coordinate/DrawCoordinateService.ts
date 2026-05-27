import { IPointerCoordinatePayload } from '../../event/pointer/coordinates/PointerCoordinateTypes'
import {
  IComputePageRowPositionPayload,
  IComputePageRowPositionResult,
  IComputeRowPositionPayload,
  ICurrentPosition,
  IFloatPosition,
  IGetPositionByXYPayload,
  IGetFloatPositionByXYPayload,
  IPositionContext
} from '../../../interface/Position'
import { IElementPosition } from '../../../interface/Element'
import { ISetSurroundPositionPayload } from '../../../interface/Position'
import type { Draw } from '../Draw'

/**
 * Draw 坐标统一入口。
 *
 * 这个服务不重新实现坐标逻辑，只负责把分散在 viewport / position / event
 * 层的坐标能力收口到一个稳定门面上，方便后续逐步替换直接调用点。
 */
export class DrawCoordinateService {
  constructor(private readonly draw: Draw) {}

  public getPointerCoordinates(
    evt: MouseEvent | DragEvent,
    prev: IPointerCoordinatePayload | null = null
  ) {
    return this.draw.getServices().viewportService.getPointerCoordinates(evt, prev)
  }

  public getPointerDelta(
    prev: IPointerCoordinatePayload | null,
    next: IPointerCoordinatePayload
  ) {
    return this.draw.getServices().viewportService.getPointerDelta(prev, next)
  }

  public getPositionList(): IElementPosition[] {
    return this.draw.getInternalPosition().getPositionList()
  }

  public getOriginalPositionList(): IElementPosition[] {
    return this.draw.getInternalPosition().getOriginalPositionList()
  }

  public getLayoutMainPositionList(): IElementPosition[] {
    return this.draw.getInternalPosition().getLayoutMainPositionList()
  }

  public getLayoutMainPositionListByPage(pageNo: number): IElementPosition[] {
    return this.draw.getInternalPosition().getLayoutMainPositionListByPage(pageNo)
  }

  public getFloatPositionList(): IFloatPosition[] {
    return this.draw.getInternalPosition().getFloatPositionList()
  }

  public setFloatPositionList(payload: IFloatPosition[]) {
    this.draw.getInternalPosition().setFloatPositionList(payload)
  }

  public setPositionList(payload: IElementPosition[]) {
    this.draw.getInternalPosition().setPositionList(payload)
  }

  public getPositionByXY(payload: IGetPositionByXYPayload): ICurrentPosition {
    return this.draw.getInternalPosition().getPositionByXY(payload)
  }

  public getFloatPositionByXY(
    payload: IGetFloatPositionByXYPayload
  ): ICurrentPosition | void {
    return this.draw.getInternalPosition().getFloatPositionByXY(payload)
  }

  public getPositionContext(): IPositionContext {
    return this.draw.getInternalPosition().getPositionContext()
  }

  public setPositionContext(payload: IPositionContext) {
    this.draw.getInternalPosition().setPositionContext(payload)
  }

  public setCursorPosition(position: IElementPosition | null) {
    this.draw.getInternalPosition().setCursorPosition(position)
  }

  public getCursorPosition(): IElementPosition | null {
    return this.draw.getInternalPosition().getCursorPosition()
  }

  public setCursorLogicalIndex(index: number | null) {
    this.draw.getInternalPosition().setCursorLogicalIndex(index)
  }

  public computePositionList() {
    this.draw.getInternalPosition().computePositionList()
  }

  public computePositionListFromPage(startPageNo: number) {
    this.draw.getInternalPosition().computePositionListFromPage(startPageNo)
  }

  public computePageRowPosition(
    payload: IComputePageRowPositionPayload
  ): IComputePageRowPositionResult {
    return this.draw.getInternalPosition().computePageRowPosition(payload)
  }

  public computeRowPosition(
    payload: IComputeRowPositionPayload
  ): IElementPosition[] {
    return this.draw.getInternalPosition().computeRowPosition(payload)
  }

  public setSurroundPosition(payload: ISetSurroundPositionPayload) {
    return this.draw.getInternalPosition().setSurroundPosition(payload)
  }
}
