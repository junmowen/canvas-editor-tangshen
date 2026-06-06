import { IEditorOption } from '../../../interface/Editor'
import { IWatermark } from '../../../interface/Watermark'
import { normalizeOoxmlHexColor } from './OoxmlUnit'
import {
  convertOoxmlWatermarkSizeToPoint,
  createOoxmlWatermarkOpacity,
  createOoxmlWatermarkShapeMetrics,
  resolveOoxmlTextWatermark
} from './OoxmlWatermarkExportAdapter'

export { hasOoxmlTextWatermark } from './OoxmlWatermarkExportAdapter'

/** 转义水印 VML 中的 XML 属性或文本内容，避免特殊字符破坏文档结构。 */
function escapeOoxmlWatermarkText(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 生成 Word 可识别的文本水印 run；图片水印和 repeat 平铺留给后续批次单独扩展。 */
function createOoxmlTextWatermarkRunXml(watermark: IWatermark | undefined, options: IEditorOption) {
  const textWatermark = resolveOoxmlTextWatermark(watermark)
  if (!textWatermark) return ''
  const text = escapeOoxmlWatermarkText(textWatermark.data)
  const color = normalizeOoxmlHexColor(textWatermark.color)
  const opacity = createOoxmlWatermarkOpacity(textWatermark.opacity)
  const font = escapeOoxmlWatermarkText(textWatermark.font || options.defaultFont || 'Microsoft YaHei')
  const fontSize = convertOoxmlWatermarkSizeToPoint(textWatermark.size || options.defaultSize)
  const shape = createOoxmlWatermarkShapeMetrics(
    textWatermark.data,
    fontSize,
    options
  )

  // Word 的内置水印也是通过页眉承载 VML shape；这里先只生成 run，避免有页眉内容时额外制造空段。
  return [
    '<w:r><w:pict>',
    '<v:shapetype id="_x0000_t136" coordsize="21600,21600" o:spt="136" adj="10800" path="m@7,l@8,m@5,21600l@6,21600e">',
    '<v:formulas><v:f eqn="sum #0 0 10800"/><v:f eqn="prod #0 2 1"/><v:f eqn="sum 21600 0 @1"/><v:f eqn="sum 0 0 @2"/><v:f eqn="sum 21600 0 @3"/><v:f eqn="if @0 @3 0"/><v:f eqn="if @0 21600 @1"/><v:f eqn="if @0 0 @2"/><v:f eqn="if @0 @4 21600"/><v:f eqn="mid @5 @6"/><v:f eqn="mid @8 @5"/><v:f eqn="mid @7 @8"/><v:f eqn="mid @6 @7"/><v:f eqn="sum @6 0 @5"/></v:formulas>',
    '<v:path textpathok="t" o:connecttype="custom" o:connectlocs="@9,0;@10,10800;@11,21600;@12,10800" o:connectangles="270,180,90,0"/><v:textpath on="t" fitshape="f"/></v:shapetype>',
    `<v:shape id="canvas-editor-watermark" type="#_x0000_t136" style="position:absolute;left:${shape.left}pt;top:${shape.top}pt;width:${shape.width}pt;height:${shape.height}pt;rotation:315;z-index:-251654144;mso-position-horizontal:center;mso-position-horizontal-relative:page;mso-position-vertical:center;mso-position-vertical-relative:page;mso-wrap-edited:f" o:allowincell="f" fillcolor="#${color}" stroked="f">`,
    `<v:fill opacity="${opacity}"/><v:textpath fitshape="f" style="font-family:${font};font-size:${shape.fontSize}pt" string="${text}"/><w10:wrap type="none"/></v:shape>`,
    '</w:pict></w:r>'
  ].join('')
}

/** 生成独立水印段落，仅在文档没有真实页眉段落时作为备用段落使用。 */
export function createOoxmlTextWatermarkParagraphXml(
  watermark: IWatermark | undefined,
  options: IEditorOption
) {
  const watermarkRunXml = createOoxmlTextWatermarkRunXml(watermark, options)
  if (!watermarkRunXml) return ''
  // 水印段落压成 1twip，并隐藏段落标记；有真实页眉时会放在最后，避免顶出标题前空行。
  return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="1" w:lineRule="exact"/><w:rPr><w:vanish/></w:rPr></w:pPr>${watermarkRunXml}</w:p>`
}
