export class EventBus<EventMap> {
  /** event Hub 映射缓存，用于按 key 快速定位对应数据。 */
  private eventHub: Map<string, Set<Function>>

  /** 初始化 EventBus 实例并注入运行依赖。 */
  constructor() {
    this.eventHub = new Map()
  }

  /** 注册事件监听器，并返回后续可触发的事件订阅。 */
  public on<K extends string & keyof EventMap>(
    eventName: K,
    callback: EventMap[K]
  ) {
    if (!eventName || typeof callback !== 'function') return
    const eventSet = this.eventHub.get(eventName) || new Set()
    eventSet.add(callback)
    this.eventHub.set(eventName, eventSet)
  }

  /** 派发事件，把载荷传递给已注册的监听器。 */
  public emit<K extends string & keyof EventMap>(
    eventName: K,
    payload?: EventMap[K] extends (payload: infer P) => void ? P : never
  ) {
    if (!eventName) return
    const callBackSet = this.eventHub.get(eventName)
    if (!callBackSet) return
    if (callBackSet.size === 1) {
      // 初始化 call Back 列表。
      const callBack = [...callBackSet]
      return callBack[0](payload)
    }
    callBackSet.forEach(callBack => callBack(payload))
  }

  /** 移除事件监听器，避免后续继续收到事件通知。 */
  public off<K extends string & keyof EventMap>(
    eventName: K,
    callback: EventMap[K]
  ) {
    if (!eventName || typeof callback !== 'function') return
    const callBackSet = this.eventHub.get(eventName)
    if (!callBackSet) return
    callBackSet.delete(callback)
  }

  public isSubscribe<K extends string & keyof EventMap>(eventName: K): boolean {
    const eventSet = this.eventHub.get(eventName)
    return !!eventSet && eventSet.size > 0
  }
}
