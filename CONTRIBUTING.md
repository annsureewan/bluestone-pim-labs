# Contributing to Bluestone PIM Labs

## Adding your project

1. Fork this repo and create a branch.
2. Edit `projects.json` and add your entry:

```json
{
  "name": "Your Project",
  "description": "One or two sentences.",
  "url": "https://your-project.com",
  "github": "https://github.com/your-org/your-repo",
  "author": "Your Name",
  "authorUrl": "https://github.com/your-handle",
  "status": "live",
  "cta": "View setup guide",
  "icon": "terminal"
}
```

**Required fields:** `name`, `description`, `github`, `status`

The project card links to `url` if provided, otherwise falls back to `github`. Include `url` only if your project has a separate landing page or documentation site.

**Optional fields:** `author`, `authorUrl`, `cta`, `icon`, `url`

If `author` is omitted, the card shows the GitHub repo owner as `@username`, linked to their profile.

**`status` options:** `live`, `beta`, `wip`, `archived`

**`icon` options:** `terminal`, `template`, `builder`, `browser`, `default`

3. Open a pull request. The `validate-projects.json` GitHub Actions check runs automatically and will catch any schema errors before review.

Not ready to open a PR? [Open an issue](https://github.com/bspim-labs/bluestone-pim-labs/issues/new/choose) using the project submission template instead.

## Contributing a blog post

Bluestone PIM Labs welcomes blog posts from customers, partners, and builders. Good topics include tools you have built around Bluestone PIM, reusable integration patterns, lessons from an implementation, or experiments with MCP, AI agents, imports, enrichment, and publishing workflows.

To add a post:

1. Create a Markdown file in `posts/your-post-slug.md`.
2. Add frontmatter with `title`, `date`, `description`, `tags`, and author details:

```markdown
---
title: Your Post Title
date: 2026-04-28
description: One sentence describing the post.
tags: mcp, integration, community
author: Your Name
authorUrl: https://github.com/your-handle
---
```

3. Put any images in `public/posts/your-post-slug/`.
4. If you add a hero image, use WebP and reference it in the frontmatter:

```markdown
heroImage: /public/posts/your-post-slug/banner.webp
```

5. Run `npm run build` to regenerate `posts.json`, `blog/`, `sitemap.xml`, and OG images.
6. Open a pull request.

Keep the post practical and useful. Labs is a dev log and community notebook, not a marketing channel.

## What gets listed

Any project that relates to Bluestone PIM in a useful way. Customers, SI partners, and independent builders are all welcome. The only requirement is that the project is real and accessible via the URL you provide.

## Naming conventions

If you are building a new community repo under `bspim-labs`, follow this pattern:

- Use the prefix `bluestone-pim-unofficial-` for all community-built tools and integrations
- Name by function, not technology: `bluestone-pim-unofficial-mcp-catalogue` rather than `bluestone-pim-unofficial-mcp-2`
- Keep "unofficial" in the name to make clear it is a community project, not an official Bluestone PIM product

## Building a docs site for your project

If your project needs a documentation page beyond what GitHub offers, the [Site Template](https://github.com/leafleaf90/bluestone-pim-labs-site-template) is the starting point. Fork it, replace the content, and deploy to Vercel. It gives you a sidebar, dark mode, copyable markdown source, and the same visual identity as other Labs projects, all in a single HTML file.

## Other contributions

Bug reports and improvements to the site itself are welcome too. Use the bug report issue template or open a PR directly.
