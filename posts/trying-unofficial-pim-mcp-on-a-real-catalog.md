---
title: Trying the Unofficial Bluestone PIM MCP Server on a Real Catalog
date: 2026-04-28
description: What happens when an AI assistant can browse Bluestone PIM catalogs, compare draft and published data, switch language context, and fetch product images.
tags: mcp, ai, examples
author: Viktor Lövgren
authorUrl: https://github.com/leafleaf90/
heroImage: /public/posts/trying-unofficial-pim-mcp-on-a-real-catalog/banner.webp
---

The [unofficial Bluestone PIM MCP server](https://bluestone-mcp-unofficial.vercel.app/connect) is meant to give partners and customers some inspiration. It is a working example of how an AI assistant can connect to Bluestone PIM, but the bigger goal is to help teams build their own versions, aligned with their own workflows, data model, client needs, and guardrails.

Bluestone PIM has also published its [official communication around MCP](https://www.bluestonepim.com/mcp), which is the best place to understand the product direction. This Labs project sits beside that as a community example: open, forkable, and intentionally practical.

Think of it as a starting point. Fork it, change the tools, tune the descriptions, deploy it under your own URL, and make it behave the way your team needs it to behave.

The unofficial server is intentionally small. The important piece is the reusable pattern: OAuth connection, encrypted session tokens, a remote MCP endpoint, and tool calls that can reach Bluestone PIM safely from an AI client. The current tools are examples on top of that foundation: browse catalogs, list products, switch language context, check published data, fetch a product image, and create products. Treat the rest as a blank canvas for the workflows you want to build.

## Start by naming the source

The most reliable first prompt is explicit:

```text
Using Bluestone PIM, what catalogs do I have?
```

That opening matters. AI assistants often have several tool types available at the same time: code execution, web search, artifacts, local files, and MCP tools. If you ask "show me my catalogs", the assistant may try the wrong path first. Starting with "Using Bluestone PIM" points it at the MCP tools.

If it goes wrong mid-conversation, redirect it:

```text
Don't write code. Use the Bluestone PIM tools directly.
```

The same applies to images. Ask for "the product image from Bluestone PIM" rather than just "show me the image", especially in clients where web search is also available.

## Browse a working catalog

The basic flow is simple:

```text
User: Using Bluestone PIM, what catalogs do I have?
Assistant: You have 5 catalogs: Enrichment Structure, Skincare, Clothes, Outputs, Intake - ERP.

User: Show me products in Clothes
Assistant: There is currently one product in the Clothes catalog: T-shirt - Green, type Single, status Draft.
```

By default, the unofficial server reads working data from Bluestone PIM (MAPI, for those familiar with the Bluestone PIM API structure). That means it can show changes your team has made today, including products that have not been published yet. For enrichment work, that is usually what you want. If you want only live data, ask for published products explicitly.

This is a small example, but it shows the basic shape: the assistant is not answering from a static export. It is calling a tool, reading the catalog, and summarizing what it finds.

## Create a product

The unofficial server can also create a product by name:

```text
User: Create "T-shirt - Blue"
Assistant: To confirm, should I create a new product named "T-shirt - Blue" in the Clothes catalog?

User: Yes
Assistant: T-shirt - Blue has been created and added to the Clothes catalog.
```

The confirmation is intentional. Creating a product is a write operation, and the tool is marked so clients can treat it cautiously. Claude Desktop responds by inserting a confirmation turn before the tool call.

There is still plenty missing here. The tool cannot add attributes or images at creation time. It also does not group variants. If "T-shirt - Green" and "T-shirt - Blue" should be variants under a product group, that logic needs either explicit user intent or a careful naming convention check. That is the kind of detail a partner-specific fork can improve.

Another example from testing showed the same gap from a different angle. When asked to create "Red T-shirt" in the Clothes catalog, the assistant did not notice that the existing products followed the pattern "T-shirt - Green" and "T-shirt - Blue". It had listed catalogs, but it had not listed products in the target catalog before creating. A better version of the tool flow could check neighboring product names first and suggest "T-shirt - Red" before committing.

That is exactly the kind of behavior this project is meant to inspire.

## Switch language context

Language switching is where the AI layer starts to add value beyond retrieval.

```text
User: Using Bluestone PIM, show me the Clothes catalog in Dutch
Assistant: Here is the Kleren catalog in Dutch. 4 products found, all currently in Draft state:

1. T-shirt - Groen
2. T-shirt - Blauw
3. T-shirt - Rood
4. T-shirt - Yellow

Worth noting: "T-shirt - Yellow" has not been translated to Dutch yet.
```

The tool returns data. The model notices the pattern. Three product names are localized, one is still in English, so it flags the gap without being asked.

That is a useful shape for future QA tools. The unofficial server does not need a special "find missing translations" endpoint to make this possible in small catalogs. It needs to expose enough structured data for the model to reason over. For larger catalogs, a purpose-built audit tool would be better, but the principle is the same.

What is missing today: the assistant can spot the missing translation, but it cannot write the Dutch name back to Bluestone PIM. Update tools are not implemented yet.

## Compare draft and published data

Bluestone PIM has working data and published data. The unofficial MCP server keeps those paths separate, because they answer different questions.

```text
User: Using Bluestone PIM, show me only what's published in Clothes, not drafts
Assistant: Only 1 published product in the Clothes catalog: T-shirt - Green.

User: Compare to draft
Assistant: Here is the comparison:

T-shirt - Green is published, but the draft name is "T-shirt - Green and Great!"
T-shirt - Blue is in draft and not published.
T-shirt - Red is in draft and not published.
T-shirt - Yellow is in draft and not published.
```

This is the kind of multi-step comparison that works well in a conversation. You can ask what is live, then ask how it differs from working state, and the assistant keeps the thread of the task.

It also surfaces a practical distinction for builders: read tools should be clear about which layer they use. An enrichment assistant usually wants working state. A storefront QA assistant usually wants published state. A migration assistant may need both.

## Fetch a product image

The `get_product_image` tool was added so an assistant can fetch a product image from the Bluestone PIM CDN:

```text
User: Show me the product image from Bluestone PIM
Assistant: The image is available. You can open it directly here: T-shirt - Green.
```

There is a client limitation hiding behind that simple exchange. MCP can return image content, but Claude Desktop currently shows the image inside the collapsed tool result panel rather than inline in the chat. The unofficial server works around this by telling the model to provide the direct image URL, so the user has something useful to click.

That kind of detail matters when designing MCP tools. You are not only shaping data for an API consumer. You are shaping data for a model, a client UI, and a person reading the final answer.

## Why this matters for partners and customers

The shared unofficial server is intentionally modest. It proves the connection pattern: OAuth, encrypted session tokens, a remote MCP endpoint, tool descriptions, response shaping, and a few working Bluestone PIM operations.

The interesting part is what a team can build from there:

- An enrichment assistant that checks naming patterns, missing translations, and incomplete images before a product goes live.
- A migration assistant that validates incoming product data before import and explains what needs cleanup.
- A demo setup assistant that creates safe sample catalogs in a test environment.
- A partner-specific assistant that matches one client's approval flow and terminology.

Those versions should not all behave the same. Different teams need different autonomy levels, different confirmations, different data access, and different write permissions. MCP makes that possible because the tool surface is yours to design.

## What works now

Today, the unofficial Bluestone PIM MCP server can browse catalogs, list products in a category, switch language context, read published products, compare published and draft state through conversation, fetch product images, and create products by name.

That is not a full PIM interface. It is a foundation. The next step is for customers and partners to take the pattern, fork it, and make it fit the real workflows they know best.

[Open the unofficial MCP setup guide and examples.](https://bluestone-mcp-unofficial.vercel.app/connect)

For the official Bluestone PIM perspective on MCP, see [bluestonepim.com/mcp](https://www.bluestonepim.com/mcp).
