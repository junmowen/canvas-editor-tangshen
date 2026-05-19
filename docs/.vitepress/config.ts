import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/canvas-editor-docs/',
  title: 'canvas-editor',
  description: 'rich text editor by canvas/svg',
  themeConfig: {
    i18nRouting: false,
    algolia: {
      appId: 'RWSVW6F3S5',
      apiKey: 'e462fffb4d2e9ab4a78c29e0b457ab33',
      indexName: 'hufe'
    },
    logo: '/favicon.png',
    nav: [
      {
        text: '指南',
        link: '/guide/start',
        activeMatch: '/guide/'
      },
      {
        text: 'Demo',
        link: 'https://hufe.club/canvas-editor'
      },
      {
        text: '官方插件',
        link: '/guide/plugin-internal.html'
      },
      {
        text: '赞助',
        link: 'https://hufe.club/donate.jpg'
      }
    ],
    sidebar: [
      {
        text: '开始',
        items: [
          { text: '入门', link: '/guide/start' },
          { text: '配置', link: '/guide/option' },
          { text: '国际化', link: '/guide/i18n' },
          { text: '数据结构', link: '/guide/schema' }
        ]
      },
      {
        text: '技术方案',
        items: [
          { text: '性能优化方案', link: '/guide/performance-optimization-plan' },
          {
            text: 'Canvas 池与多引擎渲染后端',
            link: '/guide/canvas-pool-render-backend-plan'
          },
          {
            text: '渲染后端调试面板',
            link: '/guide/canvas-pool-render-backend-debug-panel'
          },
          {
            text: 'Canvas 后端架构',
            link: '/guide/canvas-pool-render-backend-architecture'
          },
          {
            text: 'Canvas 核心接口',
            link: '/guide/canvas-pool-render-backend-architecture-core'
          },
          {
            text: '多引擎调度策略',
            link: '/guide/canvas-pool-render-backend-engine-strategy'
          },
          {
            text: 'Worker 协议与调度',
            link: '/guide/canvas-pool-render-backend-worker-protocol'
          },
          {
            text: 'WebGL 与 Block 边界',
            link: '/guide/canvas-pool-render-backend-webgl-svg-boundary'
          },
          {
            text: 'Canvas 迁移路径',
            link: '/guide/canvas-pool-render-backend-migration'
          },
          {
            text: 'Chunk 稳定性记录',
            link: '/guide/canvas-pool-render-backend-progress-2026-05-15'
          },
          {
            text: '表格与大粘贴记录',
            link: '/guide/canvas-pool-render-backend-progress-2026-05-16'
          },
          {
            text: 'Dirty Range 推进',
            link: '/guide/canvas-pool-render-backend-next-stage'
          },
          {
            text: 'Dirty Range Planner',
            link: '/guide/canvas-pool-render-backend-dirty-range'
          },
          {
            text: '大粘贴事务',
            link: '/guide/canvas-pool-render-backend-async-insert'
          },
          {
            text: '真实模板压测',
            link: '/guide/canvas-pool-render-backend-clinic-template'
          },
          {
            text: '正文 Store 预研',
            link: '/guide/canvas-pool-render-backend-text-store'
          },
          {
            text: '渲染引擎收口',
            link: '/guide/canvas-pool-render-backend-render-engine'
          },
          {
            text: '渲染引擎实施',
            link: '/guide/canvas-pool-render-backend-render-engine-implementation'
          },
          {
            text: 'Worker 覆盖验收',
            link: '/guide/canvas-pool-render-backend-render-engine-acceptance'
          },
          {
            text: 'Snapshot 模块图',
            link: '/guide/canvas-pool-render-backend-render-engine-module-map'
          },
          {
            text: '排期与结束定义',
            link: '/guide/canvas-pool-render-backend-rollout-closure'
          }
        ]
      },
      {
        text: '命令',
        items: [
          { text: '执行动作命令', link: '/guide/command-execute' },
          { text: '获取数据命令', link: '/guide/command-get' }
        ]
      },
      {
        text: '监听',
        items: [
          { text: '事件监听(listener)', link: '/guide/listener' },
          { text: '事件监听(eventBus)', link: '/guide/eventbus' }
        ]
      },
      {
        text: '快捷键',
        items: [
          { text: '内部快捷键', link: '/guide/shortcut-internal' },
          { text: '自定义快捷键', link: '/guide/shortcut-custom' }
        ]
      },
      {
        text: '右键菜单',
        items: [
          { text: '内部右键菜单', link: '/guide/contextmenu-internal' },
          { text: '自定义右键菜单', link: '/guide/contextmenu-custom' }
        ]
      },
      {
        text: '重写方法',
        items: [{ text: '重写方法', link: '/guide/override' }]
      },
      {
        text: 'API',
        items: [
          { text: '实例API', link: '/guide/api-instance' },
          { text: '通用API', link: '/guide/api-common' }
        ]
      },
      {
        text: '插件',
        items: [
          { text: '自定义插件', link: '/guide/plugin-custom' },
          { text: '官方插件', link: '/guide/plugin-internal' }
        ]
      }
    ],
    socialLinks: [
      {
        icon: 'github',
        link: 'https://github.com/Hufe921/canvas-editor'
      }
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2021-present Hufe'
    }
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN'
    },
    en: {
      label: 'English',
      lang: 'en',
      link: '/en/',
      themeConfig: {
        nav: [
          {
            text: 'Guide',
            link: '/en/guide/start',
            activeMatch: '/en/guide/'
          },
          {
            text: 'Demo',
            link: 'https://hufe.club/canvas-editor'
          },
          {
            text: 'Official plugin',
            link: '/en/guide/plugin-internal.html'
          },
          {
            text: 'Donate',
            link: 'https://hufe.club/donate.jpg'
          }
        ],
        sidebar: [
          {
            text: 'Start',
            items: [
              { text: 'start', link: '/en/guide/start' },
              { text: 'option', link: '/en/guide/option' },
              { text: 'i18n', link: '/en/guide/i18n' },
              { text: 'schema', link: '/en/guide/schema' }
            ]
          },
          {
            text: 'Command',
            items: [
              { text: 'execute', link: '/en/guide/command-execute' },
              { text: 'get', link: '/en/guide/command-get' }
            ]
          },
          {
            text: 'Listener',
            items: [
              { text: 'listener', link: '/en/guide/listener' },
              { text: 'eventbus', link: '/en/guide/eventbus' }
            ]
          },
          {
            text: 'Shortcut',
            items: [
              { text: 'internal', link: '/en/guide/shortcut-internal' },
              { text: 'custom', link: '/en/guide/shortcut-custom' }
            ]
          },
          {
            text: 'Contextmenu',
            items: [
              { text: 'internal', link: '/en/guide/contextmenu-internal' },
              { text: 'custom', link: '/en/guide/contextmenu-custom' }
            ]
          },
          {
            text: 'Override',
            items: [{ text: 'override', link: '/en/guide/override' }]
          },
          {
            text: 'Api',
            items: [
              { text: 'instance', link: '/en/guide/api-instance' },
              { text: 'common', link: '/en/guide/api-common' }
            ]
          },
          {
            text: 'Plugin',
            items: [
              { text: 'custom', link: '/en/guide/plugin-custom' },
              { text: 'official', link: '/en/guide/plugin-internal' }
            ]
          }
        ]
      }
    }
  }
})
