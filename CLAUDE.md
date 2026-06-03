# Bluestone PIM Labs Landing Page

Landing page for Bluestone PIM Labs, a community space for builders working on and for Bluestone PIM.

## What this is

A stakeholder mockup / community landing page. Single static HTML file, no framework. **Hosting and build are configured in the AWS Amplify console** (not via files in this repo).

- Live URL: https://labs.bluestonepim.com
- GitHub: https://github.com/bspim-labs/bluestone-pim-labs

## Related projects

- **MCP Server**: the first Labs project, design reference for this page
  - Site: https://bluestone-mcp-unofficial.vercel.app/connect
  - GitHub: https://github.com/leafleaf90/bluestone-pim-unofficial-mcp
  - The `public/connect/index.html` in that repo is the visual reference for this page: same color palette, card patterns, disclaimer banner, and Tailwind setup. When making design changes here, check alignment with that file.

- **Site Template**: single-file documentation site template for Labs projects
  - Site: https://bluestone-pim-labs-site-template.vercel.app
  - GitHub: https://github.com/leafleaf90/bluestone-pim-labs-site-template

## Org and contribution model

`bspim-labs` is the hub: it owns the landing page repo and the org profile README. Contributed projects live on the contributor's personal or org GitHub account and are listed on the landing page via `projects.json`. The org is a directory, not a host.

## Stack

- `index.html`: single file, all styles inline via a `<style>` block + Tailwind CSS from CDN
- `projects.json`: project cards data, rendered by JS at page load via `fetch('projects.json')`
- `public/`: static assets (logo, og-image)

## Design

Matches the visual language of the MCP server page (`bluestone-pim-unofficial-mcp` repo):
- Color palette: slate-50/slate-950 backgrounds, blue-600/blue-400 accents, amber for warnings
- Tailwind dark mode via `class` strategy, toggled with localStorage
- Same disclaimer banner style (full-width slate strip directly below header)

## Adding a project

Edit `projects.json` and open a PR. The `.github/workflows/validate-projects.yml` GitHub Actions check runs automatically on any PR that touches `projects.json`, validating against `.github/projects.schema.json`. Each entry takes:

```json
{
  "name": "Project Name",
  "description": "One or two sentences.",
  "github": "https://github.com/...",
  "url": "https://...",
  "status": "live",
  "cta": "Project website",
  "icon": "terminal"
}
```

Required: `name`, `description`, `github`, `status`. The card links to `url` if provided, otherwise falls back to `github`. Optional `cta` labels the website link (defaults to **Project website**).

Available icons: `terminal`, `template` (layout grid), `builder` (sparkles), `browser` (window), `default` (plus icon). Add more in the `icons` object in `index.html`.
The grid lists all projects from the file plus one open **Your project here** card.

## Content constraints

- No em dashes anywhere (use commas or colons instead)
- No AI-filler contrast constructions
- No trailing AI-filler summary paragraphs

## Assets

- `public/bluestone_pim_logo.png`: Bluestone PIM logo, used in navbar and as favicon
- `public/og-image.jpg`: OG image (1200x630), referenced with absolute URLs in meta tags
- `llms.txt` (site root): Markdown-oriented summary for AI discovery (see common `llms.txt` conventions). Listed in `sitemap.xml`. Update when scope, contact paths, or key URLs change.

If the domain changes, update the absolute URLs in the `og:image`, `twitter:image`, and `og:url` meta tags in `index.html`, `blog.html`, and `post.html`, set `BASE_URL` in `scripts/generate-post-pages.js` and `scripts/generate-sitemap.js`, update the `Sitemap:` line in `robots.txt`, edit all links in `llms.txt`, then run `npm run build` to refresh `blog/**/index.html` and `sitemap.xml`. The OG image is generated at build time by `scripts/generate-og-image.js` (uses `sharp`) and output to `public/og-image.jpg`.

## Local development

```bash
npm run serve
```

Open http://localhost:8000. Handles clean URLs and blog routing locally. Do NOT use `python3 -m http.server`: it doesn't handle hosting rewrites, so `/blog/...` will not work like production.

## Deploy

Pushes to the connected branch trigger **Amplify**. The pipeline is owned and configured in the Amplify app. The `build` script in `package.json` is what the pipeline should run so `posts.json`, `public/og-image.jpg`, and `blog/**/index.html` stay fresh.

## Blog

Posts live in `posts/*.md` with frontmatter:

```markdown
---
title: Post Title
date: 2026-04-17
description: One sentence.
tags: meta, community
heroImage: /public/posts/slug/banner.webp
---
```

To add a post:
1. Write `posts/your-slug.md`
2. Drop images in `public/posts/your-slug/`, run `node scripts/optimize-images.js` (needs `npm install` once for sharp)
3. Run `npm run build` to regenerate `posts.json`, `public/og-image.jpg`, and `blog/{slug}/index.html` (static page with baked-in meta for crawlers)
4. Push to main, committing the generated `blog/` and `public/posts/` files alongside the post

`posts.json` is also regenerated automatically on each Amplify build via the `build` script.

## Hosting (AWS Amplify)

No Amplify or routing settings live in the repo. URL rewrites and the build (install command, `npm run build`, artifact root) are **already** defined in the Amplify app. For how the app behaves, `post.html` loads the post slug from `window.location.pathname`, and `blog/{slug}/index.html` is the static page generated at build time for the same slugs.
