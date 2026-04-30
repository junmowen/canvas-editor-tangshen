import { Draw } from '../../../draw/Draw'

export function applyTableToolState(draw: Draw, disposeTableTool: boolean) {
  if (disposeTableTool) {
    draw.getComponents().tableTool.dispose()
  } else {
    draw.getComponents().tableTool.render()
  }
}
