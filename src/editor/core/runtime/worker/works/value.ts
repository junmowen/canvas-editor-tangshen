import { IGetValueOption } from '../../../../interface/Draw'
import { IEditorData } from '../../../../interface/Editor'
import { zipElementList } from '../../../../utils/element'

/** 获取值后台线程选项，用于约束调用方可传入的可选配置。 */
interface IGetValueWorkerOption {
  /** 业务数据载荷，供当前操作读取或提交。 */
  data: Required<IEditorData>
  /** 操作配置项，用于调整当前流程的可选行为。 */
  options: IGetValueOption
}

onmessage = evt => {
  const payload = <IGetValueWorkerOption>evt.data
  const { options, data } = payload
  const { extraPickAttrs = [] } = options || {}

  const editorData: IEditorData = {
    header: zipElementList(data.header, {
      extraPickAttrs,
      isClone: false
    }),
    main: zipElementList(data.main, {
      extraPickAttrs,
      isClassifyArea: true,
      isClone: false
    }),
    footer: zipElementList(data.footer, {
      extraPickAttrs,
      isClone: false
    })
  }

  postMessage(editorData)
}
