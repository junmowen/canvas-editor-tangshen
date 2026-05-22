import { CommandAdaptDomain } from './CommandAdaptDomain'

/**
 * 命令适配层。
 *
 * 该类保持原有对外入口，具体命令实现拆分在同目录的 CommandAdapt* 模块中。
 */
export class CommandAdapt extends CommandAdaptDomain {}
