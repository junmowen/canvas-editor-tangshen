import { EditorMode } from '../../../../dataset/enum/Editor'
import { Draw } from '../../../draw/Draw'

export function disposeTableTool(draw: Draw) {
  draw.getComponents().tableTool.dispose()
}

export function renderTableToolIfNeeded(payload: {
  draw: Draw
  isTable: boolean
  isReadonly: boolean
}) {
  const { draw, isTable, isReadonly } = payload
  if (isTable && !isReadonly && draw.getMode() !== EditorMode.FORM) {
    draw.getComponents().tableTool.render()
  }
}
