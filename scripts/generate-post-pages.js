#!/usr/bin/env node
// Generates blog/{slug}/index.html (with baked-in meta + content) and
// public/posts/{slug}/og-image.jpg for each post in posts/*.md
const fs   = require('fs');
const path = require('path');
const sharp = require('sharp');
const { marked } = require('marked');

const BASE_URL  = 'https://labs.bluestonepim.com';
const POSTS_DIR = path.join(__dirname, '../posts');
const BLOG_DIR  = path.join(__dirname, '../blog');
const PUBLIC    = path.join(__dirname, '../public');
const LOGO      = path.join(PUBLIC, 'bluestone_pim_logo_white.webp');

// ─── helpers ────────────────────────────────────────────────────────────────

function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const k = line.slice(0, colon).trim();
    const v = line.slice(colon + 1).trim();
    if (k) meta[k] = v;
  }
  return { meta, body: m[2] };
}

function esc(s) {
  return (s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildArticleMetaTags(meta) {
  if (!meta.date) return '';
  const published = `${meta.date}T12:00:00.000Z`;
  const modDate = meta.updated || meta.date;
  const modified = `${modDate}T12:00:00.000Z`;
  return `  <meta property="article:published_time" content="${published}">
  <meta property="article:modified_time" content="${modified}">
`;
}

function buildBlogPostingJsonLd(slug, meta, pageUrl, ogImage) {
  const title = meta.title || slug;
  const o = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: title,
    url: pageUrl,
    image: ogImage,
    publisher: {
      '@type': 'Organization',
      name: 'Bluestone PIM Labs',
      url: `${BASE_URL}/`
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': pageUrl }
  };
  if (meta.description) o.description = meta.description;
  if (meta.author) {
    o.author = {
      '@type': 'Person',
      name: meta.author
    };
    if (meta.authorUrl) o.author.url = meta.authorUrl;
  }
  if (meta.date) {
    o.datePublished = `${meta.date}T12:00:00.000Z`;
    o.dateModified = `${(meta.updated || meta.date)}T12:00:00.000Z`;
  }
  return `  <script type="application/ld+json">${JSON.stringify(o)}</script>
`;
}

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function readingTime(body) {
  return Math.max(1, Math.ceil(body.trim().split(/\s+/).length / 200)) + ' min read';
}

function wrapTitle(title, max = 28) {
  const words = title.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? cur + ' ' + w : w;
    if (candidate.length > max && cur) { lines.push(cur); cur = w; }
    else cur = candidate;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

// ─── per-post OG image ───────────────────────────────────────────────────────

async function generateOgImage(title, outputPath) {
  const lines = wrapTitle(title);
  const fontSize = 58;
  const lineHeight = 74;
  const totalTextH = lines.length * lineHeight;
  const startY = Math.round((630 - totalTextH) / 2) + fontSize;

  const textRows = lines.map((l, i) =>
    `<text x="80" y="${startY + i * lineHeight}" font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold" fill="#f1f5f9">${esc(l)}</text>`
  ).join('\n  ');

  const svg = `<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0f172a"/>
  ${textRows}
  <text x="80" y="565" font-family="Arial,sans-serif" font-size="22" fill="#475569">Bluestone PIM Labs</text>
</svg>`;

  const logo = await sharp(LOGO).resize(200, null).toBuffer();
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, top: 52, left: 80 }])
    .jpeg({ quality: 90 })
    .toFile(outputPath);
}

// ─── HTML template ───────────────────────────────────────────────────────────

function buildHtml(slug, meta, bodyHtml, ogImage, allPosts) {
  const title    = meta.title || slug;
  const pageTitle = `${title} - Bluestone PIM Labs`;
  const pageUrl  = `${BASE_URL}/blog/${slug}`;
  const desc     = meta.description || '';

  const tags = meta.tags
    ? meta.tags.split(',').map(t =>
        `<span class="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 uppercase tracking-wide">${esc(t.trim())}</span>`
      ).join('')
    : '';

  const rt = readingTime(bodyHtml);
  const authorHtml = meta.author
    ? (meta.authorUrl
        ? `<span class="text-sm text-slate-400 dark:text-slate-500">By <a href="${esc(meta.authorUrl)}" target="_blank" rel="noopener noreferrer" class="text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors no-underline">${esc(meta.author)}</a></span>`
        : `<span class="text-sm text-slate-400 dark:text-slate-500">By ${esc(meta.author)}</span>`)
    : '';
  const metaRow = [
    authorHtml ? `${authorHtml}<span class="text-slate-300 dark:text-slate-700">·</span>` : '',
    meta.date ? `<span class="text-sm text-slate-400 dark:text-slate-500">${formatDate(meta.date)}</span><span class="text-slate-300 dark:text-slate-700">·</span>` : '',
    `<span class="text-sm text-slate-400 dark:text-slate-500">${rt}</span>`,
    tags ? `<span class="text-slate-300 dark:text-slate-700">·</span>${tags}` : '',
  ].filter(Boolean).join('\n        ');

  const heroHtml = meta.heroImage
    ? `<div class="mb-10"><img src="${esc(meta.heroImage)}" alt="${esc(title)}" class="w-full rounded-xl object-cover border border-slate-200 dark:border-slate-700/60" style="max-height:420px;" loading="eager"></div>`
    : '';

  const articleMeta = buildArticleMetaTags(meta);
  const jsonLd      = buildBlogPostingJsonLd(slug, meta, pageUrl, ogImage);

  const idx   = allPosts.findIndex(p => p.slug === slug);
  const older = allPosts[idx + 1] || null;
  const newer = allPosts[idx - 1] || null;
  const contributeUrl = 'https://github.com/bspim-labs/bluestone-pim-labs/blob/main/CONTRIBUTING.md';
  const contributeHtml = `
      <section class="mt-14 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 p-6">
        <p class="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Contribute</p>
        <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-3">Want to contribute a blog post to Bluestone PIM Labs?</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">If you have built something useful around Bluestone PIM, learned something while integrating with it, or want to share a pattern others can reuse, open a PR with a post. Labs is meant to be a shared space for customers, partners, and builders.</p>
        <a href="${contributeUrl}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 font-medium no-underline">
          Open a PR
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </a>
      </section>`;
  const navHtml = (older || newer) ? `
      <nav class="mt-14 pt-8 border-t border-slate-200 dark:border-slate-800">
        <div class="grid grid-cols-2 gap-6">
          <div>${older ? `<a href="/blog/${older.slug}" class="group block no-underline"><div class="text-xs text-slate-400 dark:text-slate-500 mb-1">← Older</div><div class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">${esc(older.title)}</div></a>` : ''}</div>
          <div class="text-right">${newer ? `<a href="/blog/${newer.slug}" class="group block no-underline"><div class="text-xs text-slate-400 dark:text-slate-500 mb-1">Newer →</div><div class="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-snug">${esc(newer.title)}</div></a>` : ''}</div>
        </div>
      </nav>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="google-site-verification" content="SrPQ-t1ZwwZnENad1yjV7GCiBOjb5IMjMNvYBvI-UcU" />
  <title>${esc(pageTitle)}</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Bluestone PIM Labs">
  <meta property="og:title" content="${esc(pageTitle)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(pageTitle)}">
  <meta name="twitter:description" content="${esc(desc)}">
  <meta name="twitter:image" content="${ogImage}">
  <meta property="og:locale" content="en_US">
${articleMeta}${jsonLd}  <link rel="icon" type="image/png" href="/public/bluestone_pim_logo.png">
  <link id="hljs-light" rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <link id="hljs-dark"  rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css" disabled>
  <script>
    (function () {
      const stored = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (stored === 'dark' || (!stored && prefersDark)) {
        document.documentElement.classList.add('dark');
        document.getElementById('hljs-light').disabled = true;
        document.getElementById('hljs-dark').disabled  = false;
      }
    })();
  </script>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' };</script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
  <style>
    html { scroll-behavior: smooth; }
    #reading-progress { position:fixed; top:0; left:0; height:2px; width:0%; background:#3b82f6; z-index:50; transition:width 0.1s linear; }
    .prose { max-width:68ch; color:inherit; line-height:1.8; }
    .prose > * + * { margin-top:1.25em; }
    .prose h2 { font-size:1.45em; font-weight:700; line-height:1.3; margin-top:2.25em; margin-bottom:0.6em; color:inherit; padding-bottom:0.3em; border-bottom:1px solid #e2e8f0; }
    .dark .prose h2 { border-bottom-color:#1e293b; }
    .prose h3 { font-size:1.2em; font-weight:600; line-height:1.4; margin-top:2em; margin-bottom:0.4em; color:inherit; }
    .prose h4 { font-size:1em; font-weight:600; margin-top:1.75em; margin-bottom:0.3em; color:inherit; }
    .prose p { margin-bottom:0; }
    .prose a { color:#2563eb; text-decoration:underline; text-underline-offset:2px; text-decoration-color:#93c5fd; transition:color 0.15s; }
    .dark .prose a { color:#60a5fa; text-decoration-color:#1e3a5f; }
    .prose a:hover { color:#1d4ed8; }
    .dark .prose a:hover { color:#93c5fd; }
    .prose strong { font-weight:600; }
    .prose em { font-style:italic; }
    .prose ul { list-style-type:disc; padding-left:1.5em; margin-top:0.75em; margin-bottom:0.75em; }
    .prose ol { list-style-type:decimal; padding-left:1.5em; margin-top:0.75em; margin-bottom:0.75em; }
    .prose li { line-height:1.7; }
    .prose li + li { margin-top:0.3em; }
    .prose code:not(pre code) { font-family:ui-monospace,'Cascadia Code','Fira Code',monospace; font-size:0.875em; background:#f1f5f9; color:#0f172a; padding:0.15em 0.45em; border-radius:4px; border:1px solid #e2e8f0; }
    .dark .prose code:not(pre code) { background:#1e293b; color:#e2e8f0; border-color:#334155; }
    .prose pre { border-radius:10px; overflow-x:auto; font-size:0.875em; line-height:1.7; border:1px solid #e2e8f0; margin-top:1.5em; margin-bottom:1.5em; position:relative; }
    .dark .prose pre { border-color:#1e293b; }
    .prose pre > code.hljs { padding:1.25em 1.5em; border-radius:10px; }
    .prose pre code { font-family:ui-monospace,'Cascadia Code','Fira Code',monospace; font-size:inherit; }
    .copy-btn { position:absolute; top:0.6rem; right:0.6rem; font-size:11px; font-weight:500; padding:3px 9px; border-radius:5px; cursor:pointer; font-family:system-ui,sans-serif; transition:background 0.15s,color 0.15s; background:rgba(0,0,0,0.07); color:#64748b; border:1px solid rgba(0,0,0,0.10); line-height:1.6; }
    .dark .copy-btn { background:rgba(255,255,255,0.08); color:#94a3b8; border-color:rgba(255,255,255,0.10); }
    .copy-btn:hover { background:rgba(0,0,0,0.13); color:#334155; }
    .dark .copy-btn:hover { background:rgba(255,255,255,0.15); color:#e2e8f0; }
    .prose blockquote { border-left:3px solid #3b82f6; padding:0.5em 0 0.5em 1.25em; color:#475569; font-style:italic; margin-top:1.5em; margin-bottom:1.5em; }
    .dark .prose blockquote { color:#94a3b8; }
    .prose hr { border:none; border-top:1px solid #e2e8f0; margin-top:3em; margin-bottom:3em; }
    .dark .prose hr { border-top-color:#1e293b; }
    .prose img { max-width:100%; height:auto; border-radius:10px; border:1px solid #e2e8f0; margin-top:1.5em; margin-bottom:1.5em; display:block; }
    .dark .prose img { border-color:#1e293b; }
    .prose table { width:100%; border-collapse:collapse; font-size:0.9em; margin-top:1.75em; margin-bottom:1.75em; display:block; overflow-x:auto; }
    .prose th { text-align:left; padding:0.5em 1em; border-bottom:2px solid #e2e8f0; font-weight:600; white-space:nowrap; }
    .dark .prose th { border-bottom-color:#334155; }
    .prose td { padding:0.5em 1em; border-bottom:1px solid #f1f5f9; }
    .dark .prose td { border-bottom-color:#1e293b; }
    .prose tr:last-child td { border-bottom:none; }
    .prose h2 .anchor, .prose h3 .anchor { opacity:0; margin-left:0.4em; color:#94a3b8; text-decoration:none; font-weight:400; font-size:0.85em; transition:opacity 0.15s; }
    .prose h2:hover .anchor, .prose h3:hover .anchor { opacity:1; }
  </style>
</head>
<body class="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased min-h-screen">

  <div id="reading-progress"></div>

  <header class="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/60 sticky top-0 z-10">
    <div class="max-w-4xl mx-auto px-3 sm:px-6 py-4 flex items-center justify-between gap-2 sm:gap-4">
      <a href="/" class="flex items-center gap-2 sm:gap-3 no-underline min-w-0 shrink-0">
        <img src="/public/bluestone_pim_logo.png" alt="Bluestone PIM" class="h-7 sm:h-8 w-auto object-contain">
        <span class="font-semibold text-slate-900 dark:text-slate-100 text-[11px] leading-tight sm:hidden">
          <span class="block">Bluestone PIM</span>
          <span class="block">Labs 🧪</span>
        </span>
        <span class="font-semibold text-slate-900 dark:text-slate-100 text-sm hidden sm:inline">Bluestone PIM Labs 🧪</span>
      </a>
      <nav class="flex items-center gap-0.5 sm:gap-1 ml-auto sm:mr-1 shrink-0">
        <a href="/" class="text-sm px-2 sm:px-3 py-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Projects</a>
        <a href="/blog" class="text-sm px-2 sm:px-3 py-1.5 rounded-lg font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50">Blog</a>
      </nav>
      <button id="theme-toggle" aria-label="Toggle dark mode" class="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0">
        <svg id="icon-sun" xmlns="http://www.w3.org/2000/svg" class="hidden dark:block w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>
        <svg id="icon-moon" xmlns="http://www.w3.org/2000/svg" class="block dark:hidden w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      </button>
    </div>
  </header>

  <div class="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60">
    <div class="max-w-4xl mx-auto px-6 py-2 flex items-start gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
      <p class="text-sm text-slate-500 dark:text-slate-400">A Bluestone PIM Labs community project. Not an official product. No SLA, no support commitments. Contributions and forks welcome.</p>
    </div>
  </div>

  <main class="max-w-4xl mx-auto px-6 py-12">
    <a href="/blog" class="inline-flex items-center gap-1.5 text-sm text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors mb-10 no-underline group">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      Back to Blog
    </a>

    <article>
      ${heroHtml}
      <header class="mb-10">
        <div class="flex flex-wrap items-center gap-2 mb-4">
          ${metaRow}
        </div>
        <h1 class="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-slate-100 leading-tight mb-4">${esc(title)}</h1>
        ${desc ? `<p class="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">${esc(desc)}</p>` : ''}
      </header>

      <div class="border-t border-slate-200 dark:border-slate-800 mb-10"></div>

      <div id="post-body" class="prose text-slate-700 dark:text-slate-300">
        ${bodyHtml}
      </div>

      ${contributeHtml}

      ${navHtml}
    </article>
  </main>

  <footer class="border-t border-slate-200 dark:border-slate-800 mt-16">
    <div class="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <p class="text-sm text-slate-400 dark:text-slate-600">Bluestone PIM Labs &middot; Community projects, not official products</p>
    </div>
  </footer>

  <script>
    // Dark mode
    const themeBtn  = document.getElementById('theme-toggle');
    const hljsLight = document.getElementById('hljs-light');
    const hljsDark  = document.getElementById('hljs-dark');
    themeBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      hljsLight.disabled = isDark;
      hljsDark.disabled  = !isDark;
    });

    // Reading progress
    window.addEventListener('scroll', () => {
      const total = document.body.scrollHeight - window.innerHeight;
      document.getElementById('reading-progress').style.width =
        (total > 0 ? (window.scrollY / total) * 100 : 0) + '%';
    }, { passive: true });

    // Syntax highlight
    document.querySelectorAll('#post-body pre code').forEach(el => hljs.highlightElement(el));

    // Copy buttons
    document.querySelectorAll('#post-body pre').forEach(pre => {
      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = 'Copy';
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(pre.querySelector('code').textContent).then(() => {
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        }).catch(() => {
          btn.textContent = 'Failed';
          setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
        });
      });
      pre.appendChild(btn);
    });

    // Lazy images
    document.querySelectorAll('#post-body img').forEach(img => { img.loading = 'lazy'; });

    // Anchor links on headings
    function slugify(t) { return t.toLowerCase().replace(/[^\\w\\s-]/g,'').replace(/\\s+/g,'-').replace(/-+/g,'-').trim(); }
    document.querySelectorAll('#post-body h2, #post-body h3').forEach(h => {
      h.id = slugify(h.textContent);
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.className = 'anchor';
      a.setAttribute('aria-hidden', 'true');
      a.textContent = '#';
      h.appendChild(a);
    });
  </script>
</body>
</html>`;
}

// ─── main ────────────────────────────────────────────────────────────────────

async function main() {
  const files = fs.readdirSync(POSTS_DIR).filter(f => f.endsWith('.md'));
  const allPosts = files
    .map(f => {
      const src  = fs.readFileSync(path.join(POSTS_DIR, f), 'utf8');
      const { meta } = parseFrontmatter(src);
      return { slug: path.basename(f, '.md'), title: meta.title || path.basename(f, '.md'), date: meta.date || '' };
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const file of files) {
    const slug = path.basename(file, '.md');
    const src  = fs.readFileSync(path.join(POSTS_DIR, file), 'utf8');
    const { meta, body } = parseFrontmatter(src);

    // OG image
    const ogDir = path.join(PUBLIC, 'posts', slug);
    fs.mkdirSync(ogDir, { recursive: true });
    const ogImagePath = path.join(ogDir, 'og-image.jpg');
    await generateOgImage(meta.title || slug, ogImagePath);
    const ogImageUrl = `${BASE_URL}/public/posts/${slug}/og-image.jpg`;

    // Markdown → HTML
    marked.setOptions({ gfm: true, breaks: false });
    const bodyHtml = marked.parse(body);

    // Write blog/{slug}/index.html
    const outDir = path.join(BLOG_DIR, slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, 'index.html'),
      buildHtml(slug, meta, bodyHtml, ogImageUrl, allPosts)
    );
    console.log(`Generated blog/${slug}/index.html`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
