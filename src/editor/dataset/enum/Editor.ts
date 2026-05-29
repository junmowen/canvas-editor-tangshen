/** 编辑器 DOM 分区标识，用于挂载主编辑区、菜单、弹层等节点。 */
export enum EditorComponent {
  COMPONENT = 'component',
  MENU = 'menu',
  MAIN = 'main',
  FOOTER = 'footer',
  CONTEXTMENU = 'contextmenu',
  POPUP = 'popup',
  CATALOG = 'catalog',
  COMMENT = 'comment'
}

/** 编辑器命中上下文，区分页级操作和表格内操作。 */
export enum EditorContext {
  PAGE = 'page',
  TABLE = 'table'
}

/** 编辑器运行模式，控制编辑、只读、表单、打印和设计态行为。 */
export enum EditorMode {
  EDIT = 'edit', // 编辑模式（文档可编辑、辅助元素均存在）
  CLEAN = 'clean', // 清洁模式（隐藏辅助元素）
  READONLY = 'readonly', // 只读模式（文档不可编辑）
  FORM = 'form', // 表单模式（仅控件内可编辑）
  PRINT = 'print', // 打印模式（文档不可编辑、隐藏辅助元素、选区、未书写控件及边框）
  DESIGN = 'design' // 设计模式（不可删除、只读等配置不控制）
}

/** 编辑区域分区，区分页眉、正文和页脚。 */
export enum EditorZone {
  HEADER = 'header',
  MAIN = 'main',
  FOOTER = 'footer'
}

/** 页面展示模式，控制分页视图或连续滚动视图。 */
export enum PageMode {
  PAGING = 'paging',
  CONTINUITY = 'continuity'
}

/** 纸张方向，控制页面纵向或横向排版。 */
export enum PaperDirection {
  VERTICAL = 'vertical',
  HORIZONTAL = 'horizontal'
}

/** 英文换行策略，控制长词在行尾的断行方式。 */
export enum WordBreak {
  BREAK_ALL = 'break-all',
  BREAK_WORD = 'break-word'
}

/** 渲染优先级模式，在性能优先和兼容优先之间切换。 */
export enum RenderMode {
  SPEED = 'speed',
  COMPATIBILITY = 'compatibility'
}
