import { RangeManagerEdit } from './RangeManagerEdit'

/**
 * 统一的范围状态管理器。
 *
 * 对外保持原 RangeManager 入口，具体实现拆分到 RangeManager* 模块中。
 */
export class RangeManager extends RangeManagerEdit {}
