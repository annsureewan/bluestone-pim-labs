# Project structure

## Overview

Bluestone PIM Labs is an index of community-built tools for Bluestone PIM. Each project is fully independent: its own repo, its own deployment, its own lifecycle. Labs is the discovery layer, not a monorepo.

## Repository layout

All project repos live under the [`bspim-labs`](https://github.com/bspim-labs) GitHub organization, not under a personal account. The org is what makes this feel like a community initiative rather than a personal side project.

```
bspim-labs/
  bluestone-labs-landing          # this repo: the index page + blog
  bluestone-pim-unofficial-mcp    # project 1: MCP server
  bluestone-pim-google-sheets     # project 2: Google Sheets sync
  some-partner-tool               # future: partner-contributed project
```

## Adding a project to Labs

Open a PR to `bluestone-labs-landing` and add an entry to `projects.json`:

```json
{
  "name": "Project Name",
  "description": "One or two sentences.",
  "url": "https://...",
  "github": "https://github.com/bspim-labs/...",
  "status": "live",
  "icon": "terminal"
}
```

That is the only requirement to appear on the Labs index. The bar for this is intentionally low.

## First-class vs community projects

First-class projects (like the MCP server) meet a higher bar:

- Repo lives under the org
- Has maintainer/development guidance
- Has a setup or connect page (can be a README or a hosted page)
- Includes an unofficial disclaimer

Community projects can live under a personal or partner GitHub account and still be listed on Labs. The `github` field in `projects.json` points wherever the repo actually lives.

## Contribution model

| What you want to do | How |
|---|---|
| Fix a bug or improve an existing project | PR directly to that project's repo |
| Register a new project on the Labs index | PR to `bluestone-labs-landing`, add entry in `projects.json` |
| Publish a new project as first-class | Repo under the org, meets the bar above, then add to `projects.json` |

## Per-project structure

Each project is self-contained. Minimum expected:

- `README.md` with setup instructions and credential requirements
- Unofficial disclaimer (not affiliated with or endorsed by Bluestone Commerce)

Projects with a hosted UI (like the MCP server) should have a connect or setup page. Projects that are scripts or CLIs can rely on the README alone.

### Google Sheets sync (example)

Script-only project, no hosted deployment needed:

```
bluestone-pim-google-sheets/
  src/Code.gs         # the Apps Script
  README.md           # setup steps, credentials, how to run
  .clasp.json         # optional: for version-controlled script deploys via clasp
```

### MCP server (example)

Hosted project with its own deployment:

```
bluestone-pim-unofficial-mcp/
  src/                # TypeScript source
  api/                # Vercel serverless entry point
  public/connect/     # setup and connect page
  docs/               # design decisions, patterns, API reference
```

## What does not belong here

- Anything that duplicates built-in Bluestone PIM features (AI Enrich, Linguist, Analyst, completeness scoring, validation)
- Internal tooling that requires Bluestone employee access to run or maintain
