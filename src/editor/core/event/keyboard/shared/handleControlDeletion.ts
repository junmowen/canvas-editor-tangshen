import { Control } from '../../../draw/control/Control'

export function handleControlDeletion(
  control: Control,
  evt: KeyboardEvent,
  guard: () => boolean
) {
  if (!guard()) return null
  const curIndex = control.keydown(evt)
  if (curIndex) {
    control.emitControlContentChange()
  }
  return curIndex
}
