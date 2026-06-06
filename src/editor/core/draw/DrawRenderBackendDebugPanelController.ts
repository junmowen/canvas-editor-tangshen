import {
  IRenderBackendDebugSnapshot,
  RenderBackendDebugPanel
} from '../render-backend/RenderBackendDebugPanel'

/** 管理渲染后端调试面板生命周期。 */
export class DrawRenderBackendDebugPanelController {
  private panel: RenderBackendDebugPanel | null = null

  public sync(payload: {
    enabled: boolean
    container: HTMLElement
    getSnapshot: () => IRenderBackendDebugSnapshot
  }) {
    if (!payload.enabled) {
      this.destroy()
      return
    }
    if (!this.panel) {
      this.panel = new RenderBackendDebugPanel(
        payload.container,
        payload.getSnapshot
      )
    }
    this.panel.update()
  }

  public destroy() {
    this.panel?.destroy()
    this.panel = null
  }
}
