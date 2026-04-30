import { ICurrentPosition } from '../../../../interface/Position'
import { Position } from '../../../position/Position'

export function applyPointerPositionContext(
  position: Position,
  positionResult: ICurrentPosition
) {
  position.setPositionContext({
    isTable: !!positionResult.isTable,
    isCheckbox: positionResult.isCheckbox || false,
    isRadio: positionResult.isRadio || false,
    isControl: positionResult.isControl || false,
    isImage: positionResult.isImage || false,
    isDirectHit: positionResult.isDirectHit || false,
    index: positionResult.index,
    trIndex: positionResult.trIndex,
    tdIndex: positionResult.tdIndex,
    tdId: positionResult.tdId,
    trId: positionResult.trId,
    tableId: positionResult.tableId
  })
}
