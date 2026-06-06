import type { Control } from './Control'
import { controlCascadeMethods } from './ControlCascadeMethods'
import { controlExtensionMethods } from './ControlExtensionMethods'
import { controlPropertiesMethods } from './ControlPropertiesMethods'
import { controlRemoteOptionMethods } from './ControlRemoteOptionMethods'
import { controlValueReadMethods } from './ControlValueReadMethods'
import { controlValueSetMethods } from './ControlValueSetMethods'
import { controlValueValidateMethods } from './ControlValueValidateMethods'

/** 安装控件值 methods，把拆分方法挂载到目标原型。 */
export function installControlValueMethods(ControlClass: typeof Control) {
  Object.assign(
    ControlClass.prototype,
    controlValueReadMethods,
    controlRemoteOptionMethods,
    controlValueValidateMethods,
    controlExtensionMethods,
    controlPropertiesMethods,
    controlCascadeMethods,
    controlValueSetMethods
  )
}
