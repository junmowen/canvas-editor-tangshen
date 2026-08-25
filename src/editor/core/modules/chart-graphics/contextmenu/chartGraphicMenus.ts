import { INTERNAL_CONTEXT_MENU_KEY } from '../../../../dataset/constant/ContextMenu'
import {
  DentalToothStatus,
  IChartAnnotation,
  IChartDataPoint
} from '../../../../interface/ChartGraphic'
import {
  IContextMenuContext,
  IRegisterContextMenu
} from '../../../../interface/contextmenu/ContextMenu'
import { Dialog, IDialogConfirm } from '../../../../../components/dialog/Dialog'
import { Command } from '../../../command/Command'

const {
  CHART: {
    REFRESH_SOURCE,
    CLEAR_DENTAL_STATUS,
    EDIT_DENTAL_NOTE,
    INSERT_MARK,
    INSERT_ANNOTATION,
    INSERT_POINT,
    EDIT_POINT,
    EDIT_MARK,
    EDIT_REGION,
    EDIT_ANNOTATION,
    DELETE_POINT,
    DELETE_MARK,
    DELETE_REGION,
    DELETE_ANNOTATION,
    DENTAL_STATUS,
    DENTAL_STATUS_MISSING,
    DENTAL_STATUS_CARIES,
    DENTAL_STATUS_FILLED,
    DENTAL_STATUS_ROOT_CANAL,
    DENTAL_STATUS_CROWN,
    DENTAL_STATUS_IMPLANT
  }
} = INTERNAL_CONTEXT_MENU_KEY

type DialogPayload = IDialogConfirm[]

function isChartGraphicReadonly(context: IContextMenuContext) {
  return !!context.chartGraphicHit?.chart.interaction?.readonly
}

function isChartGraphicEditable(context: IContextMenuContext) {
  return !context.isReadonly && !isChartGraphicReadonly(context)
}

function isDentalChartHit(context: IContextMenuContext) {
  return (
    context.chartGraphicHit?.hit.target === 'dental-tooth' ||
    context.chartGraphicHit?.hit.target === 'dental-surface'
  )
}

function hasChartGraphicSource(context: IContextMenuContext) {
  return !!context.chartGraphicHit?.elementId && !!context.chartGraphicHit?.chart.source?.sourceId
}

function hasChartGraphicTarget(
  context: IContextMenuContext,
  target:
    | 'plot-area'
    | 'series-line'
    | 'series-point'
    | 'mark'
    | 'region'
    | 'annotation'
) {
  return context.chartGraphicHit?.hit.target === target
}

function hasChartGraphicAnnotationInsertTarget(context: IContextMenuContext) {
  return (
    hasChartGraphicTarget(context, 'plot-area') ||
    hasChartGraphicTarget(context, 'series-line') ||
    hasChartGraphicTarget(context, 'series-point')
  )
}

function toggleDentalStatus(
  command: Command,
  context: IContextMenuContext,
  status: DentalToothStatus
) {
  const hit = context.chartGraphicHit
  if (!hit?.elementId || !hit.hit.toothCode) return
  if (hit.hit.target === 'dental-surface' && hit.hit.dentalSurface) {
    command.executeToggleChartGraphicDentalSurfaceStatus(
      hit.elementId,
      hit.hit.toothCode,
      hit.hit.dentalSurface,
      status
    )
    return
  }
  if (hit.hit.target === 'dental-tooth') {
    command.executeToggleChartGraphicDentalToothStatus(
      hit.elementId,
      hit.hit.toothCode,
      status
    )
  }
}

function openDentalNoteDialog(
  command: Command,
  context: IContextMenuContext
) {
  const hit = context.chartGraphicHit
  if (!hit?.elementId || !hit.hit.toothCode || !isDentalChartHit(context)) {
    return
  }
  const tooth = hit.chart.dental?.teeth.find(item => item.code === hit.hit.toothCode)
  if (!tooth) return
  new Dialog({
    title: command.executeTranslate('contextmenu.chart.editDentalNote'),
    data: [
      {
        type: 'textarea',
        label: 'Note',
        name: 'notes',
        value: tooth.notes ?? '',
        width: 260,
        height: 96
      }
    ],
    onConfirm: dialogPayload => {
      command.executeUpdateChartGraphicDentalTooth(hit.elementId!, tooth.code, {
        notes: getDialogValue(dialogPayload, 'notes') || undefined
      })
    }
  })
}

function getDialogValue(payload: DialogPayload, name: string) {
  return payload.find(item => item.name === name)?.value || ''
}

function parseNumber(value: string): number | undefined {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function openSeriesPointDialog(
  command: Command,
  context: IContextMenuContext
) {
  const hit = context.chartGraphicHit
  const payload = context.chartGraphicHitPayload
  if (
    !hit?.elementId ||
    !payload ||
    hit.hit.target !== 'series-point' ||
    !hit.hit.seriesId ||
    hit.hit.dataIndex === undefined
  ) {
    return
  }
  const series = hit.chart.series?.find(item => item.id === hit.hit.seriesId)
  const point = series?.data?.[hit.hit.dataIndex]
  if (point === undefined) return
  if (typeof point === 'number') {
    new Dialog({
      title: command.executeTranslate('contextmenu.chart.editPoint'),
      data: [
        {
          type: 'number',
          label: 'Y',
          name: 'y',
          value: `${point}`
        }
      ],
      onConfirm: dialogPayload => {
        const y = parseNumber(getDialogValue(dialogPayload, 'y'))
        if (y === undefined) return
        command.executeUpdateChartGraphicSeriesPointByHit({
          ...payload,
          patch: y
        })
      }
    })
    return
  }
  const dataPoint = point as IChartDataPoint
  new Dialog({
    title: command.executeTranslate('contextmenu.chart.editPoint'),
    data: [
      {
        type: 'text',
        label: 'X',
        name: 'x',
        value: `${dataPoint.x ?? ''}`
      },
      {
        type: 'number',
        label: 'Y',
        name: 'y',
        value: `${dataPoint.y ?? ''}`
      },
      {
        type: 'text',
        label: 'Label',
        name: 'label',
        value: `${dataPoint.label ?? ''}`
      }
    ],
    onConfirm: dialogPayload => {
      const xValue = getDialogValue(dialogPayload, 'x')
      const yValue = parseNumber(getDialogValue(dialogPayload, 'y'))
      const labelValue = getDialogValue(dialogPayload, 'label')
      const nextX =
        typeof dataPoint.x === 'number'
          ? parseNumber(xValue) ?? dataPoint.x
          : xValue || dataPoint.x
      command.executeUpdateChartGraphicSeriesPointByHit({
        ...payload,
        patch: {
          x: nextX,
          y: yValue ?? dataPoint.y,
          label: labelValue || undefined
        }
      })
    }
  })
}

function openAnnotationInsertDialog(
  command: Command,
  context: IContextMenuContext
) {
  const payload = context.chartGraphicHitPayload
  if (!payload || !hasChartGraphicAnnotationInsertTarget(context)) return
  new Dialog({
    title: command.executeTranslate('contextmenu.chart.insertAnnotation'),
    data: [
      {
        type: 'text',
        label: 'Text',
        name: 'text',
        value: ''
      }
    ],
    onConfirm: dialogPayload => {
      const text = getDialogValue(dialogPayload, 'text').trim()
      if (!text) return
      command.executeInsertChartGraphicAnnotationByHit({
        ...payload,
        text
      })
    }
  })
}

function openMarkInsertDialog(
  command: Command,
  context: IContextMenuContext
) {
  const payload = context.chartGraphicHitPayload
  if (!payload || !hasChartGraphicAnnotationInsertTarget(context)) return
  new Dialog({
    title: command.executeTranslate('contextmenu.chart.insertMark'),
    data: [
      {
        type: 'select',
        label: 'Type',
        name: 'type',
        value: 'event',
        options: [
          { label: '事件', value: 'event' },
          { label: '用药', value: 'medication' },
          { label: '警示', value: 'warning' },
          { label: '自定义', value: 'custom' }
        ]
      },
      {
        type: 'text',
        label: 'Label',
        name: 'label',
        value: ''
      }
    ],
    onConfirm: dialogPayload => {
      command.executeInsertChartGraphicMarkByHit({
        ...payload,
        type:
          (getDialogValue(dialogPayload, 'type') as
            | 'event'
            | 'medication'
            | 'warning'
            | 'custom') || 'event',
        label: getDialogValue(dialogPayload, 'label').trim() || undefined
      })
    }
  })
}

function resolveChartAxisValue(
  rawValue: number | string | undefined,
  inputValue: string
) {
  if (rawValue === undefined) return inputValue
  if (typeof rawValue === 'number') {
    return parseNumber(inputValue) ?? rawValue
  }
  return inputValue || rawValue
}

function openMarkDialog(command: Command, context: IContextMenuContext) {
  const hit = context.chartGraphicHit
  if (!hit?.elementId || hit.hit.target !== 'mark' || !hit.hit.markId) return
  const mark = hit.chart.marks?.find(item => item.id === hit.hit.markId)
  if (!mark) return
  new Dialog({
    title: command.executeTranslate('contextmenu.chart.editMark'),
    data: [
      {
        type: 'text',
        label: 'X',
        name: 'x',
        value: mark.x !== undefined ? `${mark.x}` : ''
      },
      {
        type: 'number',
        label: 'Y',
        name: 'y',
        value: mark.y !== undefined ? `${mark.y}` : ''
      },
      {
        type: 'text',
        label: 'Label',
        name: 'label',
        value: mark.label ?? ''
      }
    ],
    onConfirm: payload => {
      command.executeUpsertChartGraphicMark(hit.elementId!, {
        ...mark,
        x: resolveChartAxisValue(mark.x, getDialogValue(payload, 'x')),
        y: parseNumber(getDialogValue(payload, 'y')) ?? mark.y,
        label: getDialogValue(payload, 'label') || undefined
      })
    }
  })
}

function openRegionDialog(command: Command, context: IContextMenuContext) {
  const hit = context.chartGraphicHit
  if (!hit?.elementId || hit.hit.target !== 'region' || !hit.hit.regionId) {
    return
  }
  const region = hit.chart.regions?.find(item => item.id === hit.hit.regionId)
  if (!region) return
  new Dialog({
    title: command.executeTranslate('contextmenu.chart.editRegion'),
    data: [
      {
        type: 'text',
        label: 'X Start',
        name: 'xStart',
        value: region.xStart !== undefined ? `${region.xStart}` : ''
      },
      {
        type: 'text',
        label: 'X End',
        name: 'xEnd',
        value: region.xEnd !== undefined ? `${region.xEnd}` : ''
      },
      {
        type: 'number',
        label: 'Y Start',
        name: 'yStart',
        value: region.yStart !== undefined ? `${region.yStart}` : ''
      },
      {
        type: 'number',
        label: 'Y End',
        name: 'yEnd',
        value: region.yEnd !== undefined ? `${region.yEnd}` : ''
      },
      {
        type: 'text',
        label: 'Label',
        name: 'label',
        value: region.label ?? ''
      }
    ],
    onConfirm: payload => {
      command.executeUpsertChartGraphicRegion(hit.elementId!, {
        ...region,
        xStart: resolveChartAxisValue(region.xStart, getDialogValue(payload, 'xStart')),
        xEnd: resolveChartAxisValue(region.xEnd, getDialogValue(payload, 'xEnd')),
        yStart: parseNumber(getDialogValue(payload, 'yStart')) ?? region.yStart,
        yEnd: parseNumber(getDialogValue(payload, 'yEnd')) ?? region.yEnd,
        label: getDialogValue(payload, 'label') || undefined
      })
    }
  })
}

function openAnnotationDialog(command: Command, context: IContextMenuContext) {
  const hit = context.chartGraphicHit
  if (
    !hit?.elementId ||
    hit.hit.target !== 'annotation' ||
    !hit.hit.annotationId
  ) {
    return
  }
  const annotation = hit.chart.annotations?.find(
    item => item.id === hit.hit.annotationId
  ) as IChartAnnotation | undefined
  if (!annotation) return
  new Dialog({
    title: command.executeTranslate('contextmenu.chart.editAnnotation'),
    data: [
      {
        type: 'text',
        label: 'X',
        name: 'x',
        value: annotation.x !== undefined ? `${annotation.x}` : ''
      },
      {
        type: 'number',
        label: 'Y',
        name: 'y',
        value: annotation.y !== undefined ? `${annotation.y}` : ''
      },
      {
        type: 'text',
        label: 'Text',
        name: 'text',
        value: annotation.text ?? ''
      }
    ],
    onConfirm: payload => {
      command.executeUpsertChartGraphicAnnotation(hit.elementId!, {
        ...annotation,
        x: resolveChartAxisValue(annotation.x, getDialogValue(payload, 'x')),
        y: parseNumber(getDialogValue(payload, 'y')) ?? annotation.y,
        text: getDialogValue(payload, 'text') || annotation.text
      })
    }
  })
}

function createDentalStatusMenu(
  key: string,
  i18nPath: string,
  status: DentalToothStatus
): IRegisterContextMenu {
  return {
    key,
    i18nPath,
    when: context => isChartGraphicEditable(context) && isDentalChartHit(context),
    callback: (command: Command, context: IContextMenuContext) => {
      toggleDentalStatus(command, context, status)
    }
  }
}

export const chartGraphicMenus: IRegisterContextMenu[] = [
  {
    key: REFRESH_SOURCE,
    i18nPath: 'contextmenu.chart.refreshSource',
    when: context => isChartGraphicEditable(context) && hasChartGraphicSource(context),
    callback: (command: Command, context: IContextMenuContext) => {
      const elementId = context.chartGraphicHit?.elementId
      if (!elementId) return
      void command.executeRefreshChartGraphicSource(elementId)
    }
  },
  {
    key: CLEAR_DENTAL_STATUS,
    i18nPath: 'contextmenu.chart.clearDentalStatus',
    when: context => isChartGraphicEditable(context) && isDentalChartHit(context),
    callback: (command: Command, context: IContextMenuContext) => {
      if (!context.chartGraphicHitPayload) return
      command.executeDeleteChartGraphicTargetByHit(
        context.chartGraphicHitPayload
      )
    }
  },
  {
    key: INSERT_MARK,
    i18nPath: 'contextmenu.chart.insertMark',
    when: context =>
      isChartGraphicEditable(context) &&
      hasChartGraphicAnnotationInsertTarget(context),
    callback: openMarkInsertDialog
  },
  {
    key: INSERT_ANNOTATION,
    i18nPath: 'contextmenu.chart.insertAnnotation',
    when: context =>
      isChartGraphicEditable(context) &&
      hasChartGraphicAnnotationInsertTarget(context),
    callback: openAnnotationInsertDialog
  },
  {
    key: INSERT_POINT,
    i18nPath: 'contextmenu.chart.insertPoint',
    when: context =>
      isChartGraphicEditable(context) &&
      hasChartGraphicTarget(context, 'series-line'),
    callback: (command: Command, context: IContextMenuContext) => {
      if (!context.chartGraphicHitPayload) return
      command.executeInsertChartGraphicSeriesPointByHit(
        context.chartGraphicHitPayload
      )
    }
  },
  {
    key: EDIT_DENTAL_NOTE,
    i18nPath: 'contextmenu.chart.editDentalNote',
    when: context => isChartGraphicEditable(context) && isDentalChartHit(context),
    callback: openDentalNoteDialog
  },
  {
    key: EDIT_POINT,
    i18nPath: 'contextmenu.chart.editPoint',
    when: context =>
      isChartGraphicEditable(context) &&
      hasChartGraphicTarget(context, 'series-point'),
    callback: openSeriesPointDialog
  },
  {
    key: EDIT_MARK,
    i18nPath: 'contextmenu.chart.editMark',
    when: context => isChartGraphicEditable(context) && hasChartGraphicTarget(context, 'mark'),
    callback: openMarkDialog
  },
  {
    key: EDIT_REGION,
    i18nPath: 'contextmenu.chart.editRegion',
    when: context =>
      isChartGraphicEditable(context) && hasChartGraphicTarget(context, 'region'),
    callback: openRegionDialog
  },
  {
    key: EDIT_ANNOTATION,
    i18nPath: 'contextmenu.chart.editAnnotation',
    when: context =>
      isChartGraphicEditable(context) &&
      hasChartGraphicTarget(context, 'annotation'),
    callback: openAnnotationDialog
  },
  {
    key: DELETE_POINT,
    i18nPath: 'contextmenu.chart.deletePoint',
    when: context =>
      isChartGraphicEditable(context) &&
      hasChartGraphicTarget(context, 'series-point'),
    callback: (command: Command, context: IContextMenuContext) => {
      if (!context.chartGraphicHitPayload) return
      command.executeDeleteChartGraphicTargetByHit(
        context.chartGraphicHitPayload
      )
    }
  },
  {
    key: DELETE_MARK,
    i18nPath: 'contextmenu.chart.deleteMark',
    when: context => isChartGraphicEditable(context) && hasChartGraphicTarget(context, 'mark'),
    callback: (command: Command, context: IContextMenuContext) => {
      if (!context.chartGraphicHitPayload) return
      command.executeDeleteChartGraphicTargetByHit(
        context.chartGraphicHitPayload
      )
    }
  },
  {
    key: DELETE_REGION,
    i18nPath: 'contextmenu.chart.deleteRegion',
    when: context =>
      isChartGraphicEditable(context) && hasChartGraphicTarget(context, 'region'),
    callback: (command: Command, context: IContextMenuContext) => {
      if (!context.chartGraphicHitPayload) return
      command.executeDeleteChartGraphicTargetByHit(
        context.chartGraphicHitPayload
      )
    }
  },
  {
    key: DELETE_ANNOTATION,
    i18nPath: 'contextmenu.chart.deleteAnnotation',
    when: context =>
      isChartGraphicEditable(context) &&
      hasChartGraphicTarget(context, 'annotation'),
    callback: (command: Command, context: IContextMenuContext) => {
      if (!context.chartGraphicHitPayload) return
      command.executeDeleteChartGraphicTargetByHit(
        context.chartGraphicHitPayload
      )
    }
  },
  {
    key: DENTAL_STATUS,
    i18nPath: 'contextmenu.chart.dentalStatus',
    when: context => isChartGraphicEditable(context) && isDentalChartHit(context),
    childMenus: [
      createDentalStatusMenu(
        DENTAL_STATUS_MISSING,
        'contextmenu.chart.missing',
        'missing'
      ),
      createDentalStatusMenu(
        DENTAL_STATUS_CARIES,
        'contextmenu.chart.caries',
        'caries'
      ),
      createDentalStatusMenu(
        DENTAL_STATUS_FILLED,
        'contextmenu.chart.filled',
        'filled'
      ),
      createDentalStatusMenu(
        DENTAL_STATUS_ROOT_CANAL,
        'contextmenu.chart.rootCanal',
        'rootCanal'
      ),
      createDentalStatusMenu(
        DENTAL_STATUS_CROWN,
        'contextmenu.chart.crown',
        'crown'
      ),
      createDentalStatusMenu(
        DENTAL_STATUS_IMPLANT,
        'contextmenu.chart.implant',
        'implant'
      )
    ]
  }
]
