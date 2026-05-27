import { version } from '../../../../../package.json'
import {
  IGetOriginValueOption,
  IGetValueOption
} from '../../../interface/Draw'
import { IEditorData, IEditorResult } from '../../../interface/Editor'
import { deepClone } from '../../../utils'
import { zipElementList } from '../../../utils/element'
import type { Draw } from '../Draw'

/**
 * Draw 值访问服务。
 *
 * 负责原始 editorData 读取、公开 value 结果生成，以及
 * header/main/footer 数据写回运行时。
 */
export class DrawValueService {
  /**
   * 构造函数。
   *
   * @param draw - 关联的 Draw 门面对象，用于访问绘图组件和方法
   */
  constructor(private readonly draw: Draw) {}

  /**
   * 获取原始编辑器数据。
   *
   * 返回未经压缩的页眉、正文和页脚数据，支持按页码筛选正文数据。
   *
   * @param options - 获取选项
   * @param options.pageNo - 页码，不指定时返回所有页数据
   * @returns 原始编辑器数据
   */
  public getOriginValue(
    options: IGetOriginValueOption = {}
  ): Required<IEditorData> {
    const { pageNo } = options
    const data = this.draw.getObjectResolver().getOriginalEditorData()
    // 获取正文元素列表
    let mainElementList = data.main
    // 如果指定了有效页码，获取指定页的元素列表
    if (
      Number.isInteger(pageNo) &&
      pageNo! >= 0 &&
      pageNo! < this.draw.getPageRowList().length
    ) {
      // 从页面的行列表中展开元素列表
      mainElementList = this.draw.getPageRowList()[pageNo!].flatMap(
        row => row.elementList
      )
    }
    // 返回完整的编辑器数据
    return {
      header: data.header,
      main: mainElementList,
      footer: data.footer
    }
  }

  /**
   * 获取编辑器值结果。
   *
   * 返回经过压缩处理的编辑器数据，包含版本号和编辑器选项。
   *
   * @param options - 获取选项
   * @param options.extraPickAttrs - 额外需要提取的属性
   * @returns 编辑器结果对象，包含版本号、数据和选项
   */
  public getValue(options: IGetValueOption = {}): IEditorResult {
    // 获取原始数据
    const originData = this.getOriginValue(options)
    const { extraPickAttrs } = options
    // 压缩各区域的元素列表
    const data: IEditorData = {
      header: zipElementList(originData.header, {
        extraPickAttrs
      }),
      // 正文区域需要按区域分类
      main: zipElementList(originData.main, {
        extraPickAttrs,
        isClassifyArea: true
      }),
      footer: zipElementList(originData.footer, {
        extraPickAttrs
      })
    }
    // 返回完整的编辑器结果，包含版本号、数据和编辑器选项
    return {
      version,
      data,
      options: deepClone(this.draw.getRuntime().getOptions())
    }
  }

  /**
   * 设置编辑器数据。
   *
   * 将页眉、正文和页脚数据写入到对应的组件中。
   *
   * @param payload - 编辑器数据
   * @param payload.header - 页眉元素列表（可选）
   * @param payload.main - 正文元素列表（可选）
   * @param payload.footer - 页脚元素列表（可选）
   */
  public setEditorData(payload: Partial<IEditorData>) {
    const { header, main, footer } = payload
    // 如果有页眉数据，设置页眉元素列表
    if (header) {
      this.draw.getComponents().header.setElementList(header)
    }
    // 如果有正文数据，替换正文元素列表
    if (main) {
      this.draw.replaceMainElementList(main)
    }
    // 如果有页脚数据，设置页脚元素列表
    if (footer) {
      this.draw.getComponents().footer.setElementList(footer)
    }
    this.draw.syncEditor2DocumentTree()
  }
}
