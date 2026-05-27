---
title: Welcome to Bluestone PIM Labs
date: 2026-04-17
description: What Labs is, why it exists, and what you can look forward to as we keep building.
tags: meta, community
author: Viktor Lövgren
authorUrl: https://github.com/leafleaf90/
heroImage: /public/posts/welcome-to-bluestone-labs/banner.webp
---

Bluestone PIM Labs is a community space for builders working on and for Bluestone PIM. Not an official product, not a roadmap item: a place where people who use and work with Bluestone PIM can ship things, share them, and learn together.

## Why Labs exists

Bluestone PIM is a flexible platform. A lot of what makes it genuinely useful in production comes from the integrations, automations, and tooling that teams build around it: custom import pipelines, enrichment scripts, AI-assisted workflows, internal dashboards.

Most of that work stays internal. It solves one team's problem, lives in a private repo, and never gets shared. Labs is a nudge in the other direction. Build it in the open, put it here, let others build on it.

There is no formal review process, no approval committee. If it relates to Bluestone PIM and it works, it belongs here.

## The first project: Unofficial PIM MCP

The first project is an unofficial MCP server for Bluestone PIM. MCP (Model Context Protocol) is the standard that lets AI assistants like Claude, Cursor, and others connect to external tools and data sources.

With the unofficial Bluestone PIM MCP server, you can point an AI assistant directly at your Bluestone PIM organisation and interact with your catalogue through natural language:

```bash
# Ask your AI assistant:
"Show me all products in the Electronics category missing a description"
"Which products were updated in the last 7 days?"
"Find all variants of SKU ABC-123"
```

It connects over your existing Bluestone API credentials, runs entirely client-side, and does not store or proxy your data. You can read the setup guide and connect in under five minutes.

For Cursor, add this to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "bluestone-pim": {
      "command": "npx",
      "args": ["-y", "bluestone-pim-mcp"],
      "env": {
        "BLUESTONE_BASE_URL": "https://your-org.bluestonepim.com",
        "BLUESTONE_USERNAME": "your-username",
        "BLUESTONE_PASSWORD": "your-password"
      }
    }
  }
}
```

For chat clients like Claude.ai or ChatGPT, use their dedicated MCP configuration UI: no config file needed, just paste your credentials when prompted.

That is it. Restart your client and your catalogue is available as context.

[See the full setup guide on the unofficial MCP server site.](https://bluestone-mcp-unofficial.vercel.app/connect)

## What to look forward to

Labs is early. The unofficial MCP server is project one. Here is the direction we are heading:

**More integration patterns.** Connectors, import/export utilities, and patterns for common Bluestone workflows that teams keep rebuilding from scratch.

**AI-native tools.** The unofficial MCP server is the foundation. On top of it: enrichment agents, bulk-edit assistants, automated QA checks for catalogue data quality.

**Community contributions.** If you have built something useful on Bluestone PIM, Labs is the right place for it. The contribution bar is low: open a PR, add your entry to `projects.json`, done.

This blog is where we document what gets built, explain the decisions behind the tools, and share patterns worth knowing. Not a marketing channel: a dev log.

## Get involved

Everything Labs is open source. The Labs landing page and the unofficial MCP server are both on GitHub. If you have built something or have an idea, open an issue or a pull request.

If you are a Bluestone PIM customer, SI partner, or independent builder: this is your space too.
