# chart-graphics presets

`presets/` 是图表预设的模块边界，统一导出内置预设和注册表 API。

预设的归一化与注册状态当前由 `presets/ChartGraphicPreset.ts` 管理。业务侧应优先
使用编辑器公开命令 `registerChartGraphicPreset` 和
`getChartGraphicPresetList`，不要直接依赖内部注册表。
