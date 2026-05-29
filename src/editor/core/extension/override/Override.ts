export interface IOverrideResult {
  /** prevent默认开关，用于控制当前流程的判断分支。 */
  preventDefault?: boolean
}

export class Override {
  /** paste 回调入口，用于通知外部或响应对应事件。 */
  public paste:
    | ((evt?: ClipboardEvent) => unknown | IOverrideResult)
    | undefined
  /** copy 回调入口，用于通知外部或响应对应事件。 */
  public copy: (() => unknown | IOverrideResult) | undefined
  /** drop 回调入口，用于通知外部或响应对应事件。 */
  public drop: ((evt: DragEvent) => unknown | IOverrideResult) | undefined
}
