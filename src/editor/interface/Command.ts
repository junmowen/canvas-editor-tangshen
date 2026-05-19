export interface IRichtextOption {
  isIgnoreDisabledRule: boolean
}

/** 修订留痕开关配置。 */
export interface ISetTrackChangeOption {
  /** 是否开启留痕。 */
  enabled?: boolean
  /** 当前修订作者。 */
  author?: string
}
