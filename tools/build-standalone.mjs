import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const builtHtml = await readFile(resolve(dist, 'index.html'), 'utf8')

const cssMatch = builtHtml.match(/href="\/?(?:\.\/)?(assets\/[^\"]+\.css)"/)
const jsMatch = builtHtml.match(/src="\/?(?:\.\/)?(assets\/[^\"]+\.js)"/)

if (!cssMatch || !jsMatch) {
  throw new Error('Could not locate the Vite CSS/JS bundles in dist/index.html')
}

const css = await readFile(resolve(dist, cssMatch[1]), 'utf8')
const bundledJs = await readFile(resolve(dist, jsMatch[1]), 'utf8')
const js = bundledJs
  .replaceAll('/assets/', './public/assets/')
  .replaceAll('</script>', '<\\/script>')

const standalone = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="description" content="Mainframe — an independent creative studio for ideas with a pulse." />
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
    <title>GaryLau｜刘耕宇</title>
    <style>${css}</style>
  </head>
  <body>
    <div id="root"></div>
    <script>${js}</script>
  </body>
</html>
`

await writeFile(resolve(root, 'mainframe-standalone.html'), standalone)
console.log('Generated mainframe-standalone.html for direct file:// viewing')
