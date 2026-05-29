export class ImageObserver {
  private promiseList: Promise<unknown>[]

  /** 初始化 ImageObserver 实例并注入运行依赖。 */
  constructor() {
    this.promiseList = []
  }

  public add(payload: Promise<unknown>) {
    this.promiseList.push(payload)
  }

  public clearAll() {
    this.promiseList = []
  }

  public allSettled() {
    return Promise.allSettled(this.promiseList)
  }
}
