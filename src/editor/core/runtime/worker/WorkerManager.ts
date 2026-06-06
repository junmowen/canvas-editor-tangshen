import { version } from '../../../../../package.json'
import { Draw } from '../../draw/Draw'
import WordCountWorker from './works/wordCount?worker&inline'
import CatalogWorker from './works/catalog?worker&inline'
import GroupWorker from './works/group?worker&inline'
import ValueWorker from './works/value?worker&inline'
import { ICatalog } from '../../../interface/Catalog'
import { IEditorResult } from '../../../interface/Editor'
import { IGetValueOption } from '../../../interface/Draw'
import { deepClone } from '../../../utils'

export class WorkerManager {
  /** Draw 门面实例，用于访问编辑器布局、渲染、数据和组件服务。 */
  private draw: Draw
  /** 字数统计 worker 实例，用于异步计算文档字数。 */
  private wordCountWorker: Worker
  /** 分组计算 worker 实例，用于异步整理分组信息。 */
  private groupWorker: Worker
  /** 取值 worker 实例，用于异步导出文档内容。 */
  private valueWorker: Worker

  /** 初始化 WorkerManager 实例并注入运行依赖。 */
  constructor(draw: Draw) {
    this.draw = draw
    this.wordCountWorker = new WordCountWorker()
    this.groupWorker = new GroupWorker()
    this.valueWorker = new ValueWorker()
  }

  public getWordCount(): Promise<number> {
    return this.requestWorker<IGetOriginalMainElementListPayload, number>(
      this.wordCountWorker,
      this.getOriginalMainElementListPayload()
    )
  }

  public getCatalog(): Promise<ICatalog | null> {
    // 目录生成可能被 contentChange 和外部 API 并发触发；每次请求独立 worker，避免复用实例覆盖回调导致 Promise 悬挂。
    return this.requestWorker(
      new CatalogWorker(),
      {
        elementList: this.getOriginalMainElementListPayload(),
        positionList: this.draw.getCoordinate().getMainPositionList()
      },
      {
        isTerminateAfterSettled: true
      }
    )
  }

  public getGroupIds(): Promise<string[]> {
    return this.requestWorker<IGetOriginalMainElementListPayload, string[]>(
      this.groupWorker,
      this.getOriginalMainElementListPayload()
    )
  }

  public async getValue(options?: IGetValueOption): Promise<IEditorResult> {
    const data = await this.requestWorker<
      {
        /** 业务数据载荷，供当前操作读取或提交。 */
        data: ReturnType<Draw['getOriginValue']>
        /** 操作配置项，用于调整当前流程的可选行为。 */
        options?: IGetValueOption
      },
      IEditorResult['data']
    >(this.valueWorker, {
      data: this.draw.getOriginValue(options),
      options
    })
    return {
      version,
      data,
      options: deepClone(this.draw.getOptions())
    }
  }

  /** 统一 worker 请求生命周期，避免各统计入口重复维护回调和释放逻辑。 */
  private requestWorker<TPayload, TResult>(
    worker: Worker,
    payload: TPayload,
    options: { isTerminateAfterSettled?: boolean } = {}
  ): Promise<TResult> {
    return new Promise((resolve, reject) => {
      const settle = () => {
        if (options.isTerminateAfterSettled) {
          worker.terminate()
        }
      }
      worker.onmessage = evt => {
        settle()
        resolve(evt.data)
      }
      worker.onerror = evt => {
        settle()
        reject(evt)
      }
      worker.postMessage(payload)
    })
  }

  /** worker 只接收正文原始数据，来源统一收敛到 ObjectResolver。 */
  private getOriginalMainElementListPayload() {
    return this.draw.getObjectResolver().getOriginalMainElementList()
  }
}

/** 获取originalmain元素列表调用载荷，聚合执行该操作所需的输入数据。 */
type IGetOriginalMainElementListPayload = ReturnType<
  WorkerManager['getOriginalMainElementListPayload']
>
