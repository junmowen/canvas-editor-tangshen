import { Draw } from '../../draw/Draw'
import { ITableLayoutSnapshot } from './TableLayoutSnapshotTypes'

export class TableLayoutSnapshotStore {
  constructor(private readonly draw: Draw) {}

  public invalidate() {
    const draw = this.draw as any
    draw.tableLayoutSnapshotVersion = (draw.tableLayoutSnapshotVersion ?? 0) + 1
    draw.tableLayoutSnapshot = null
  }

  public syncLogicalTableState() {
    const draw = this.draw as any
    draw.tableLayoutSnapshot = this.draw.getServices().tableLayoutSnapshotBuilder.build({
      version: draw.tableLayoutSnapshotVersion ?? 0
    })
  }

  public getSnapshot(): ITableLayoutSnapshot {
    const draw = this.draw as any
    if (!draw.tableLayoutSnapshot) {
      draw.tableLayoutSnapshot = this.draw.getServices().tableLayoutSnapshotBuilder.build({
        version: draw.tableLayoutSnapshotVersion ?? 0
      })
    }
    return draw.tableLayoutSnapshot
  }
}
