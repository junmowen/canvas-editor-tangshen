import { version } from '../../../../package.json'
import { Draw } from '../draw/Draw'
import WordCountWorker from './works/wordCount?worker&inline'
import CatalogWorker from './works/catalog?worker&inline'
import GroupWorker from './works/group?worker&inline'
import ValueWorker from './works/value?worker&inline'
import { ICatalog } from '../../interface/Catalog'
import { IEditorResult } from '../../interface/Editor'
import { IGetValueOption } from '../../interface/Draw'
import { deepClone } from '../../utils'

export class WorkerManager {
  private draw: Draw
  private wordCountWorker: Worker
  private groupWorker: Worker
  private valueWorker: Worker

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
        positionList: this.draw.getCoordinate().getLayoutMainPositionList()
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
        data: ReturnType<Draw['getOriginValue']>
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

type IGetOriginalMainElementListPayload = ReturnType<
  WorkerManager['getOriginalMainElementListPayload']
>
