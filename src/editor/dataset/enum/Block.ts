/** 块级元素类型，区分 iframe、视频、SVG、HTML 等嵌入内容。 */
export enum BlockType {
  IFRAME = 'iframe',
  VIDEO = 'video',
  TEXT_BOX = 'text-box',
  SHAPE = 'shape',
  WORD_ART = 'word-art',
  SVG = 'svg',
  HTML = 'html'
}
