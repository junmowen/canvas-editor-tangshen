import { EditorMode } from '../../../../dataset/enum/Editor'
import type { Draw } from '../../../draw/Draw'

/** 导出前按模式预加载背景图片。 */
export async function preloadExportBackgroundIfNeeded(
  draw: Draw,
  exportMode: EditorMode
) {
  const { background, modeRule } = draw.getRuntime().getOptions()
  const isPrintBackgroundDisabled =
    exportMode === EditorMode.PRINT && modeRule.print.backgroundDisabled
  if (background.image && !isPrintBackgroundDisabled) {
    await draw.getBackground().preloadImage()
  }
}
