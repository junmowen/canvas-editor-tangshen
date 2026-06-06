# Control 目录索引

`control/` 存放控件业务能力。事件层只负责识别用户意图，具体控件状态切换、删除、拖拽规则等业务逻辑逐步收敛到这里。

| 目录 | 职责 |
| --- | --- |
| `command/` | 控件命令适配中的定位业务规则 |
| `contextmenu/` | 控件右键菜单配置和控件菜单回调 |
| `hittest/` | 控件参与位置命中、直接命中和控件结构识别 |
| `interaction/` | 鼠标、键盘等交互触发后的控件状态处理 |
| `layout/` | 控件参与行内布局的尺寸测量 |
| `navigation/` | 表单模式下控件之间的键盘导航和边界切换 |
| `particle/` | checkbox、radio 等控件业务元素绘制和状态切换 |
| `policy/` | 拖拽、删除、输入等跨事件复用的控件业务规则 |
| `render/` | 控件参与行绘制时的边框和覆盖层渲染编排 |
| `runtime/` | 控件管理器、具体控件实现、生命周期、值读写、搜索高亮和边框绘制 |
| `selection/` | 控件参与选区、光标落点和禁用态命中的业务规则 |

## 维护规则

- event/contextmenu 目录不直接承接控件业务实现，只调用 `control/` 暴露的 interaction、policy 或菜单配置。
- 控件命令中的 component 定位规则留在 `command/`，不要内联回 `core/command/CommandAdaptDomain.ts`。
- 控件生命周期、渲染和数据读写能力统一放在 `runtime/`，不要重新散回 `draw/control/`。
- 控件行内边框等渲染规则留在 `render/`，不要内联回 `draw/render/RowRenderer.ts`。
- 控件业务校验统一从 `ControlValueMethods.validateById()` 进入；模板级规则放在 `controlSchema`，声明式跨字段规则放在 `IEditorOption.controlCrossValidateRules`，后端/复杂业务规则放在 `controlValidator`。

## 位置说明

- 所属层级：业务模块层 / 控件
- 上游调用：event、command、range、render
- 下游依赖：`runtime/`、`interaction/`、`policy/`、`selection/`、`hittest/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 控件管理器和具体控件实现。 |
| `interaction/` | 控件点击、输入、拖拽等交互副作用。 |
| `policy/` | 控件删除、拖拽、输入等规则判断。 |
| `selection/` | 控件选区和光标落点。 |
| `render/` | 控件行内边框和覆盖层渲染。 |
| `command/` / `contextmenu/` / `hittest/` / `navigation/` / `layout/` / `particle/` | 控件命令、菜单、命中、导航、测量和绘制。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/Control.ts` | control runtime 方法 | 控件值读写、状态切换、渲染和生命周期。 | command、event、render |
| `runtime/ControlValueMethods.ts` | `validateById()` / `validateByContext()` | 汇总必填、正则、声明式跨字段和异步业务校验。 | command、业务初始化 |
| `runtime/*/*Control.ts` | `getValue()` / `setValue()` / `keydown()` / `cut()` | 具体控件的取值、设值和输入行为。 | `Control.ts` |
| `interaction/` | control interaction 函数 | 处理控件点击、输入和浮层副作用。 | pointer、keyboard |
| `policy/` | control policy 函数 | 判断控件是否可输入、删除或拖拽。 | event、command |
| `selection/` | selection helper | 解析控件选区和禁用态命中。 | range、pointer |
