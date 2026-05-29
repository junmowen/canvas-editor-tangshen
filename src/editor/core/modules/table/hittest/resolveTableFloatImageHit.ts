import { ICurrentPosition, IFloatPosition } from '../../../../interface/Position'

export function resolveTableFloatImageHit(
  floatPosition: IFloatPosition
): ICurrentPosition | null {
  const { element, isTable, index, trIndex, tdIndex, tdValueIndex } = floatPosition
  if (!isTable) {
    return null
  }
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
