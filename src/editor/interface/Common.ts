/** 基础值类型集合，用于排除对象和函数等复合结构。 */
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | undefined
  | null

/** 内置类型集合，用于递归工具类型中保留原生对象形态。 */
export type Builtin = Primitive | Function | Date | Error | RegExp

/** 深度必填工具类型，用于递归移除对象属性的可选标记。 */
export type DeepRequired<T> = T extends Error
  ? Required<T>
  : T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? Map<DeepRequired<K>, DeepRequired<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
  : T extends WeakMap<infer K, infer V>
  ? WeakMap<DeepRequired<K>, DeepRequired<V>>
  : T extends Set<infer U>
  ? Set<DeepRequired<U>>
  : T extends ReadonlySet<infer U>
  ? ReadonlySet<DeepRequired<U>>
  : T extends WeakSet<infer U>
  ? WeakSet<DeepRequired<U>>
  : T extends Promise<infer U>
  ? Promise<DeepRequired<U>>
  : T extends {}
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : Required<T>

/** 深度可选工具类型，用于递归放宽对象属性约束。 */
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>
}

/** 内边距四元组，按上、右、下、左的顺序保存内容留白。 */
export type IPadding = [
  top: number,
  right: number,
  bottom: number,
  left: number
]
