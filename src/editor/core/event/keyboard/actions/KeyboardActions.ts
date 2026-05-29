import { runCopyAction, runCutAction } from './ClipboardActions'
import { runDeletionAction } from './DeletionAction'
import { runEnterAction } from './EnterAction'
import { runEscapeAction } from './EscapeAction'
import { KeyboardAction } from './KeyboardAction'
import { runNavigationAction } from './NavigationAction'
import { runRedoAction } from './RedoAction'
import { runSaveAction } from './SaveAction'
import { runSelectAllAction } from './SelectAllAction'
import { runTabAction } from './TabAction'
import { runUndoAction } from './UndoAction'

export const KEYBOARD_ACTIONS: KeyboardAction[] = [
  runDeletionAction,
  runEnterAction,
  runNavigationAction,
  runUndoAction,
  runRedoAction,
  runCopyAction,
  runCutAction,
  runSelectAllAction,
  runSaveAction,
  runEscapeAction,
  runTabAction
]
