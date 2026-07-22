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
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ffffff" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1" />
    <meta name="baiduspider" content="index, follow" />
    <meta name="description" content="Gary Lau｜刘耕宇，AI co-founder、Google 认证 AI 教育家、Anthropic 官方认证 AI 应用专家。专注 AI Agent 部署、知识库搭建、AI 工作流搭建与 GEO 优化。" />
    <link rel="canonical" href="https://garylau.ai/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://garylau.ai/" />
    <meta property="og:site_name" content="garylau.ai" />
    <meta property="og:title" content="Gary Lau｜刘耕宇" />
    <meta property="og:description" content="AI co-founder、Google 认证 AI 教育家、Anthropic 官方认证 AI 应用专家。专注 AI Agent 部署、知识库搭建、AI 工作流搭建与 GEO 优化。" />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="Gary Lau｜刘耕宇" />
    <meta name="twitter:description" content="AI co-founder、Google 认证 AI 教育家、Anthropic 官方认证 AI 应用专家。专注 AI Agent 部署、知识库搭建、AI 工作流搭建与 GEO 优化。" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "Person",
        "name": "Gary Lau",
        "alternateName": "刘耕宇",
        "url": "https://garylau.ai/",
        "jobTitle": "AI co-founder",
        "affiliation": {
          "@type": "CollegeOrUniversity",
          "name": "华南理工大学"
        },
        "knowsAbout": ["AI Agent 部署", "知识库搭建", "AI 工作流搭建", "GEO 优化"],
        "sameAs": [
          "https://x.com/GaryLau0101",
          "https://www.xiaohongshu.com/user/profile/60c395d00000000001007109"
        ]
      }
    </script>
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" defer></script>
    <title>Gary Lau｜刘耕宇</title>
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
