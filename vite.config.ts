import { defineConfig } from 'vite'
import typescript from '@rollup/plugin-typescript'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import * as path from 'path'

export default defineConfig(({ mode }) => {
  const name = 'canvas-editor'
  if (mode === 'lib') {
    return {
      plugins: [
        cssInjectedByJsPlugin({
          styleId: `${name}-style`,
          topExecutionPriority: true
        }),
        {
          ...typescript({
            tsconfig: './tsconfig.json',
            include: ['./src/editor/**']
          }),
          apply: 'build',
          declaration: true,
          declarationDir: 'types/',
          rootDir: '/'
        }
      ],
      build: {
        lib: {
          name,
          fileName: name,
          entry: path.resolve(__dirname, 'src/editor/index.ts')
        },
        rollupOptions: {
          output: {
            sourcemap: true,
            inlineDynamicImports: true
          }
        }
      }
    }
  }
  if (mode === 'lib-app') {
    return {
      plugins: [
        {
          ...typescript({
            tsconfig: './tsconfig.json',
            include: ['./src/app/**', './src/editor/**']
          }),
          apply: 'build',
          declaration: true,
          declarationDir: 'types/',
          rootDir: '/'
        }
      ],
      build: {
        emptyOutDir: false,
        lib: {
          name: `${name}App`,
          formats: ['es'],
          fileName: `${name}-app`,
          entry: path.resolve(__dirname, 'src/app/index.ts')
        },
        rollupOptions: {
          output: {
            sourcemap: true,
            assetFileNames: assetInfo =>
              assetInfo.name === 'style.css'
                ? `${name}-app.css`
                : 'assets/[name][extname]'
          }
        }
      }
    }
  }
  return {
    base: `/${name}/`,
    server: {
      host: '0.0.0.0'
    }
  }
})
