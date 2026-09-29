import { resolve } from 'node:path'
import { defineConfig, mergeConfig, type Plugin } from 'vite'
import { sharedConfig } from '../build/shared.ts'
import { generatePages } from './plugins/pages.ts'

const repo = resolve(import.meta.dirname, '..')

// content / examples / custom-elements.json が変わったら再生成してリロードする
function docsPages(): Plugin {
  return {
    name: 'jimble-docs-pages',
    configureServer(server) {
      const watch = [
        resolve(import.meta.dirname, 'content'),
        resolve(import.meta.dirname, 'examples'),
        resolve(repo, 'custom-elements.json'),
      ]
      server.watcher.add(watch)
      const regen = async (file: string) => {
        if (!watch.some((w) => file.startsWith(w))) return
        await generatePages()
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('change', regen).on('add', regen).on('unlink', regen)
    },
  }
}

export default defineConfig(async ({ mode }) => {
  const pages = await generatePages()
  return mergeConfig(sharedConfig(mode), {
    root: import.meta.dirname,
    base: process.env.SITE_BASE ?? '/',
    plugins: [docsPages()],
    resolve: { alias: { '@hidemikimura/jimble-ui': resolve(repo, 'src/index.ts') } },
    server: { fs: { allow: [repo] } },
    build: { outDir: 'dist', emptyOutDir: true, rollupOptions: { input: pages } },
  })
})
