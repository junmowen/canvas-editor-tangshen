import { ICurrentPosition } from '../../../../interface/Position'
import type { DrawCoordinateService } from '../../../draw/coordinate/DrawCoordinateService'

export function applyPointerPositionContext(
  coordinate: DrawCoordinateService,
  positionResult: ICurrentPosition
) {
  coordinate.setPositionContext({
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
