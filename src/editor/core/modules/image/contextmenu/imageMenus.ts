import { INTERNAL_CONTEXT_MENU_KEY } from '../../../../dataset/constant/ContextMenu'
import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import {
  IContextMenuContext,
  IRegisterContextMenu
} from '../../../../interface/contextmenu/ContextMenu'
import { Dialog, IDialogConfirm } from '../../../../../components/dialog/Dialog'
import { Command } from '../../../command/Command'

type DialogPayload = IDialogConfirm[]

// 内置图片右键菜单 key，覆盖替换、保存和环绕方式切换。
const {
  IMAGE: {
    PROPERTY,
    CHANGE,
    SAVE_AS,
    TEXT_WRAP,
    TEXT_WRAP_EMBED,
    TEXT_WRAP_UP_DOWN,
    TEXT_WRAP_SURROUND,
    TEXT_WRAP_TIGHT,
    TEXT_WRAP_FLOAT_TOP,
    TEXT_WRAP_FLOAT_BOTTOM
  }
} = INTERNAL_CONTEXT_MENU_KEY

const getDialogValue = (payload: DialogPayload, name: string) => {
  return payload.find(item => item.name === name)?.value || ''
}

const parsePositiveNumber = (value: string): number | undefined => {
  const num = Number(value)
  return Number.isFinite(num) && num > 0 ? num : undefined
}

const parseNumber = (value: string): number | undefined => {
  const num = Number(value)
  return Number.isFinite(num) ? num : undefined
}

const normalizeColor = (color?: string) => {
  return /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color! : '#000000'
}

const isFloatingImageDisplay = (display?: ImageDisplay) => {
  return (
    display === ImageDisplay.SURROUND ||
    display === ImageDisplay.TIGHT ||
    display === ImageDisplay.FLOAT_TOP ||
    display === ImageDisplay.FLOAT_BOTTOM
  )
}

const getImageDisplayOptions = (command: Command) => [
  {
    label: command.executeTranslate('contextmenu.image.textWrapType.embed'),
    value: ImageDisplay.BLOCK
  },
  {
    label: command.executeTranslate('contextmenu.image.textWrapType.upDown'),
    value: ImageDisplay.INLINE
  },
  {
    label: command.executeTranslate('contextmenu.image.textWrapType.surround'),
    value: ImageDisplay.SURROUND
  },
  {
    label: command.executeTranslate('contextmenu.image.textWrapType.tight'),
    value: ImageDisplay.TIGHT
  },
  {
    label: command.executeTranslate('contextmenu.image.textWrapType.floatTop'),
    value: ImageDisplay.FLOAT_TOP
  },
  {
    label: command.executeTranslate(
      'contextmenu.image.textWrapType.floatBottom'
    ),
    value: ImageDisplay.FLOAT_BOTTOM
  }
]

const openImagePropertyDialog = (
  command: Command,
  context: IContextMenuContext
) => {
  const image = context.startElement
  if (!image?.id || image.type !== ElementType.IMAGE) return
  const display = image.imgDisplay || ImageDisplay.INLINE
  new Dialog({
    title: command.executeTranslate('contextmenu.image.property'),
    data: [
      {
        type: 'select',
        label: command.executeTranslate('contextmenu.image.display'),
        name: 'display',
        value: display,
        options: getImageDisplayOptions(command)
      },
      {
        type: 'number',
        label: command.executeTranslate('contextmenu.image.width'),
        name: 'width',
        value: image.width ? `${image.width}` : '',
        placeholder: '100'
      },
      {
        type: 'number',
        label: command.executeTranslate('contextmenu.image.height'),
        name: 'height',
        value: image.height ? `${image.height}` : '',
        placeholder: '100'
      },
      {
        type: 'select',
        label: command.executeTranslate('contextmenu.image.lockAspectRatio'),
        name: 'lockAspectRatio',
        value: image.imgLockAspectRatio === false ? 'false' : 'true',
        options: [
          {
            label: command.executeTranslate('contextmenu.image.yes'),
            value: 'true'
          },
          {
            label: command.executeTranslate('contextmenu.image.no'),
            value: 'false'
          }
        ]
      },
      {
        type: 'select',
        label: command.executeTranslate('contextmenu.image.sizeLocked'),
        name: 'sizeLocked',
        value: image.imgSizeLocked ? 'true' : 'false',
        options: [
          {
            label: command.executeTranslate('contextmenu.image.no'),
            value: 'false'
          },
          {
            label: command.executeTranslate('contextmenu.image.yes'),
            value: 'true'
          }
        ]
      },
      {
        type: 'number',
        label: command.executeTranslate('contextmenu.image.floatX'),
        name: 'floatX',
        value:
          image.imgFloatPosition?.x !== undefined
            ? `${image.imgFloatPosition.x}`
            : '',
        placeholder: '0'
      },
      {
        type: 'number',
        label: command.executeTranslate('contextmenu.image.floatY'),
        name: 'floatY',
        value:
          image.imgFloatPosition?.y !== undefined
            ? `${image.imgFloatPosition.y}`
            : '',
        placeholder: '0'
      },
      {
        type: 'color',
        label: command.executeTranslate('contextmenu.image.borderColor'),
        name: 'borderColor',
        value: normalizeColor(image.imgBorder?.color || '#000000')
      },
      {
        type: 'number',
        label: command.executeTranslate('contextmenu.image.borderWidth'),
        name: 'borderWidth',
        value: image.imgBorder?.width ? `${image.imgBorder.width}` : '',
        placeholder: '0'
      },
      {
        type: 'number',
        label: command.executeTranslate('contextmenu.image.borderRadius'),
        name: 'borderRadius',
        value: image.imgBorder?.radius ? `${image.imgBorder.radius}` : '',
        placeholder: '0'
      },
      {
        type: 'color',
        label: command.executeTranslate('contextmenu.image.shadowColor'),
        name: 'shadowColor',
        value: normalizeColor(image.imgShadow?.color || '#000000')
      },
      {
        type: 'number',
        label: command.executeTranslate('contextmenu.image.shadowBlur'),
        name: 'shadowBlur',
        value: image.imgShadow?.blur ? `${image.imgShadow.blur}` : '',
        placeholder: '0'
      }
    ],
    onConfirm: payload => {
      const nextDisplay = getDialogValue(payload, 'display') as ImageDisplay
      const width =
        parsePositiveNumber(getDialogValue(payload, 'width')) || image.width
      const height =
        parsePositiveNumber(getDialogValue(payload, 'height')) || image.height
      const floatX =
        parseNumber(getDialogValue(payload, 'floatX')) ??
        image.imgFloatPosition?.x
      const floatY =
        parseNumber(getDialogValue(payload, 'floatY')) ??
        image.imgFloatPosition?.y
      const borderWidth = parseNumber(getDialogValue(payload, 'borderWidth'))
      const borderRadius = parseNumber(getDialogValue(payload, 'borderRadius'))
      const shadowBlur = parseNumber(getDialogValue(payload, 'shadowBlur'))
      const imgFloatPosition = isFloatingImageDisplay(nextDisplay)
        ? {
            pageNo: image.imgFloatPosition?.pageNo,
            x: floatX ?? image.imgFloatPosition?.x ?? 0,
            y: floatY ?? image.imgFloatPosition?.y ?? 0
          }
        : undefined

      command.executeUpdateElementById({
        id: image.id,
        properties: {
          imgDisplay: nextDisplay,
          imgFloatPosition,
          width,
          height,
          imgLockAspectRatio:
            getDialogValue(payload, 'lockAspectRatio') === 'true',
          imgSizeLocked: getDialogValue(payload, 'sizeLocked') === 'true',
          imgBorder:
            borderWidth !== undefined || borderRadius !== undefined
              ? {
                  color: normalizeColor(getDialogValue(payload, 'borderColor')),
                  width: borderWidth || 0,
                  radius: borderRadius || 0
                }
              : undefined,
          imgShadow: shadowBlur
            ? {
                color: normalizeColor(getDialogValue(payload, 'shadowColor')),
                blur: shadowBlur
              }
            : undefined
        }
      })
    }
  })
}

export const imageMenus: IRegisterContextMenu[] = [
  {
    key: PROPERTY,
    i18nPath: 'contextmenu.image.property',
    icon: 'image',
    when: payload => {
      return (
        !payload.isReadonly &&
        !payload.editorHasSelection &&
        payload.startElement?.type === ElementType.IMAGE
      )
    },
    callback: openImagePropertyDialog
  },
  {
    key: CHANGE,
    i18nPath: 'contextmenu.image.change',
    icon: 'image-change',
    when: payload => {
      return (
        !payload.isReadonly &&
        !payload.editorHasSelection &&
        payload.startElement?.type === ElementType.IMAGE
      )
    },
    callback: (command: Command) => {
      // 创建代理元素。
      const proxyInputFile = document.createElement('input')
      proxyInputFile.type = 'file'
      proxyInputFile.accept = '.png, .jpg, .jpeg'
      // 监听上传。
      proxyInputFile.onchange = () => {
        const file = proxyInputFile.files![0]!
        // 创建 file Reader 实例。
        const fileReader = new FileReader()
        fileReader.readAsDataURL(file)
        fileReader.onload = () => {
          const value = fileReader.result as string
          command.executeReplaceImageElement(value)
        }
      }
      proxyInputFile.click()
    }
  },
  {
    key: SAVE_AS,
    i18nPath: 'contextmenu.image.saveAs',
    icon: 'image',
    when: payload => {
      return (
        !payload.editorHasSelection &&
        payload.startElement?.type === ElementType.IMAGE
      )
    },
    callback: (command: Command) => {
      command.executeSaveAsImageElement()
    }
  },
  {
    key: TEXT_WRAP,
    i18nPath: 'contextmenu.image.textWrap',
    when: payload => {
      return (
        !payload.isReadonly &&
        !payload.editorHasSelection &&
        payload.startElement?.type === ElementType.IMAGE
      )
    },
    childMenus: [
      {
        key: TEXT_WRAP_EMBED,
        i18nPath: 'contextmenu.image.textWrapType.embed',
        when: () => true,
        callback: (command: Command, context: IContextMenuContext) => {
          command.executeChangeImageDisplay(
            context.startElement!,
            ImageDisplay.BLOCK
          )
        }
      },
      {
        key: TEXT_WRAP_UP_DOWN,
        i18nPath: 'contextmenu.image.textWrapType.upDown',
        when: () => true,
        callback: (command: Command, context: IContextMenuContext) => {
          command.executeChangeImageDisplay(
            context.startElement!,
            ImageDisplay.INLINE
          )
        }
      },
      {
        key: TEXT_WRAP_SURROUND,
        i18nPath: 'contextmenu.image.textWrapType.surround',
        when: () => true,
        callback: (command: Command, context: IContextMenuContext) => {
          command.executeChangeImageDisplay(
            context.startElement!,
            ImageDisplay.SURROUND
          )
        }
      },
      {
        key: TEXT_WRAP_TIGHT,
        i18nPath: 'contextmenu.image.textWrapType.tight',
        when: () => true,
        callback: (command: Command, context: IContextMenuContext) => {
          command.executeChangeImageDisplay(
            context.startElement!,
            ImageDisplay.TIGHT
          )
        }
      },
      {
        key: TEXT_WRAP_FLOAT_TOP,
        i18nPath: 'contextmenu.image.textWrapType.floatTop',
        when: () => true,
        callback: (command: Command, context: IContextMenuContext) => {
          command.executeChangeImageDisplay(
            context.startElement!,
            ImageDisplay.FLOAT_TOP
          )
        }
      },
      {
        key: TEXT_WRAP_FLOAT_BOTTOM,
        i18nPath: 'contextmenu.image.textWrapType.floatBottom',
        when: () => true,
        callback: (command: Command, context: IContextMenuContext) => {
          command.executeChangeImageDisplay(
            context.startElement!,
            ImageDisplay.FLOAT_BOTTOM
          )
        }
      }
    ]
  }
]
