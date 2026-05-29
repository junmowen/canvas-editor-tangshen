# Core 目录索引

`core/` 存放编辑器公共基础设施、命令、事件、布局、渲染后端、运行时和业务模块。

## 位置说明

- 所属层级：编辑器核心层
- 主要下钻：`command/`、`draw/`、`event/`、`modules/`、`position/`、`range/`、`render-backend/`、`runtime/`、`shared/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 对外命令门面和命令适配 |
| `draw/` | 布局、渲染、数据访问和页面调度 |
| `event/` | 输入、键盘、指针、剪贴板和事件控制器 |
| `modules/` | 业务模块实现 |
| `position/` | 位置、命中和坐标计算 |
| `range/` | range 状态、编辑和查询 |
| `render-backend/` | Canvas / WebGL / SVG / worker 渲染后端 |
| `runtime/` | 通用运行时对象 |
| `shared/` | 公共遍历和工具 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `command/` | `Command` / command adapter | 对外命令和查询入口。 | 编辑器外部 API、快捷键、菜单 |
| `draw/` | `Draw` | 文档数据、布局、渲染、导出和运行时服务总入口。 | 编辑器初始化和运行时主链路 |
| `event/` | `CanvasEvent` / `GlobalEvent` | 注册并分发 DOM、键盘、指针和剪贴板事件。 | 编辑器容器 DOM |
| `position/` | `Position` | 计算 positionList、命中和光标位置。 | layout、event pointer、range |
| `range/` | `RangeManager` | 管理选区状态、查询和编辑。 | keyboard、pointer、command |
| `render-backend/` | `RenderBackendManager` / `RenderSurfaceManager` | 管理渲染后端和 canvas surface。 | draw render pipeline |
| `runtime/` | `Cursor` / `HistoryManager` / `Zone` / `Listener` | 通用运行时对象。 | `DrawComponentRegistry` |
| `modules/` | 各业务模块 runtime / command / render | 表格、图片、控件等业务能力。 | draw、event、command |
