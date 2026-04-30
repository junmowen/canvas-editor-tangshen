import { Draw } from '../../../draw/Draw'

export function finalizeDeletion(payload: {
  draw: Draw
  startIndex: number
  curIndex: number | null
}) {
  const { draw, startIndex, curIndex } = payload
  const components = draw.getComponents()
  const rangeManager = components.range
  components.globalEvent.setCanvasEventAbility()
  if (curIndex === null) {
    rangeManager.setRange(startIndex, startIndex)
    draw.render({
      curIndex: startIndex,
      isSubmitHistory: false
    })
  } else {
    rangeManager.setRange(curIndex, curIndex)
    draw.render({
      curIndex
    })
  }
}
