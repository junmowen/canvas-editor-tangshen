import { PaperDirection } from '../../../dataset/enum/Editor'
import { DeepRequired } from '../../../interface/Common'
import { IEditorOption } from '../../../interface/Editor'
import { IElementPosition } from '../../../interface/Element'
import { IMargin } from '../../../interface/Margin'
import { IFloatPosition } from '../../../interface/Position'
import { IRow } from '../../../interface/Row'
/** SVG打印单页指标，保存按页计算后的边距和可用区域。 */
export interface IPrintSvgPageMetric {
  /** 当前页边距，已经包含镜像页边距和装订线换算结果。 */
  margins: IMargin
  /** 当前页正文内部宽度。 */
  innerWidth: number
  /** 页眉额外撑开的正文偏移。 */
  headerExtraHeight: number
  /** 页脚额外撑开的正文偏移。 */
  footerExtraHeight: number
}

/** SVG打印签章项，复用渲染层已经计算好的图片位置。 */
export interface IPrintSvgBadgeItem {
  /** 横向起点。 */
  x: number
  /** 纵向起点。 */
  y: number
  /** 图片宽度。 */
  width: number
  /** 图片高度。 */
  height: number
  /** 图片数据地址。 */
  value: string
}

/** SVG打印文档载荷，聚合正文、页眉页脚、表格和页面装饰数据。 */
export interface IPrintSvgDocumentPayload {
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** 纸张方向，用于设置浏览器打印页方向。 */
  direction?: PaperDirection
  /** 正文布局位置列表。 */
  mainPositionList: IElementPosition[]
  /** 正文分页行列表，用于解析表格片段等块级结构。 */
  pageRowList?: IRow[][]
  /** 每页页眉行列表，用于解析页眉里的分隔线、控件边框等粒子。 */
  headerRowListByPage?: IRow[][]
  /** 每页页眉位置列表。 */
  headerPositionListByPage?: IElementPosition[][]
  /** 每页页脚行列表，用于解析页脚里的分隔线、控件边框等粒子。 */
  footerRowListByPage?: IRow[][]
  /** 每页页脚位置列表。 */
  footerPositionListByPage?: IElementPosition[][]
  /** 浮动图片位置列表。 */
  floatPositionList?: IFloatPosition[]
  /** 每页签章/徽章列表。 */
  badgeListByPage?: IPrintSvgBadgeItem[][]
  /** 当前编辑器完整配置，用于还原页码、水印、背景和页边框。 */
  editorOptions?: DeepRequired<IEditorOption>
  /** 每页布局指标，用于避免 SVG 打印重新推导镜像边距。 */
  pageMetricList?: IPrintSvgPageMetric[]
  /** 显式页数，避免纯页眉/页脚或空白页被正文位置列表漏掉。 */
  pageCount?: number
}


