import { IElement } from '../../../interface/Element'

export interface IDrawMutationDeleteRecord {
  index: number
  signature: string
}

export function applySpliceInsertElements(payload: {
  elementList: IElement[]
  start: number
  items: IElement[]
  chunkSize: number
  markInsertList: (items: IElement[]) => void
}) {
  const { elementList, start, items, chunkSize, markInsertList } = payload
  markInsertList(items)
  for (let offset = 0; offset < items.length; offset += chunkSize) {
    const chunk = items.slice(offset, offset + chunkSize)
    elementList.splice(start + offset, 0, ...chunk)
  }
}

export function normalizeSpliceStart(start: number, length: number) {
  if (start < 0) {
    return Math.max(length + start, 0)
  }
  return Math.min(start, length)
}

export function resolveExternalSpliceMutationRecord(payload: {
  elementList: IElement[]
  start: number
  oldLength: number
  insertCount: number
  deleteRecordList: IDrawMutationDeleteRecord[]
  createSignature: (element: IElement) => string
}) {
  const {
    elementList,
    start,
    oldLength,
    insertCount,
    deleteRecordList,
    createSignature
  } = payload
  const actualDeleteCount = Math.max(
    0,
    oldLength + insertCount - elementList.length
  )
  const insertStart = normalizeSpliceStart(start, oldLength)
  const insertSignatureList = insertCount
    ? elementList.slice(insertStart, insertStart + insertCount).map(createSignature)
    : []
  return {
    start,
    deleteCount: actualDeleteCount,
    insertCount,
    insertSignatureList,
    deleteIndexList: deleteRecordList.map(record => record.index),
    deleteSignatureList: deleteRecordList.map(record => record.signature)
  }
}
