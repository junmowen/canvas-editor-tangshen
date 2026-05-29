/** richtext选项，用于约束调用方可传入的可选配置。 */
export interface IRichtextOption {
  /** 是否忽略禁用规则，用于允许特殊场景绕过控件限制。 */
  isIgnoreDisabledRule: boolean
}

/** 设置trackchange选项，用于约束调用方可传入的可选配置。 */
export interface ISetTrackChangeOption {
  /** 是否开启留痕。 */
  enabled?: boolean
  /** 当前修订作者。 */
  author?: string
}
