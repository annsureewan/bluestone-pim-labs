---
title: CLA, VLA, and Validation Reads in the Unofficial Bluestone PIM MCP Server
date: 2026-05-27
description: Six new read tools for category level attributes, variant level attributes, and sync validation issues. What they call, where they complement the UI for cross-product QA, and what you can ask in chat.
tags: mcp, ai, data-quality, bluestone-pim
author: Viktor Lövgren
authorUrl: https://github.com/leafleaf90/
heroImage: /public/posts/cla-vla-and-validation-reads-unofficial-pim-mcp/banner.webp
---

The [unofficial Bluestone PIM MCP server](https://bluestone-mcp-unofficial.vercel.app/connect) already supported completeness scores: find incomplete products, drill into failing requirements, and see what is missing per context. That covers one slice of data quality.

It did not cover **Category Level Attributes (CLA)**, **Variant Level Attributes (VLA)**, or **sync validation errors**. Those rules live in a different layer of Bluestone PIM. A product can score 85% on completeness and still fail validation because a locked CLA says Brand must match the category, or a mandatory VLA says every variant must have Size filled in.

Six new read tools close that gap. They expose the rules on categories and variant groups, and the validation issues on products, through the same OAuth-backed unofficial MCP connection you already use for catalog browsing and enrichment.

## Completeness vs validation

These sound similar in conversation. In Bluestone PIM they are not the same thing.

**Completeness** is a weighted score (0 to 100%) built from configurable requirements: attribute has value, media with label, product in category, and so on. `search_products`, `list_product_completeness_scores`, and `get_product_completeness_detail` read scores from MAPI `/completeness-score`.

**Validation** checks whether product data satisfies sync rules, including CLA lock/mandatory and VLA inheritance. When a product fails those rules, the failures appear as validation issues. `get_product_validation_issues` and `list_product_validation_issues` read those issues from MAPI `/completeness-score` validation endpoints (replacing the deprecated `POST /pim/validate/product`).

**CLA and VLA rules** live on categories and variant groups, not in the completeness score. The four CLA and VLA read tools fetch rule configuration from MAPI `/pim`.

| Question | Tool to use |
|---|---|
| How complete is this product? | `get_product_completeness_detail` |
| Which products are below 70% complete in this catalog? | `search_products` |
| Why is this product invalid for sync? | `get_product_validation_issues` |
| What CLA rules apply to Laptops? | `list_category_level_attributes` |
| What VLAs are configured on this variant group? | `list_variant_level_attributes` |

## What CLA and VLA mean (briefly)

**Category Level Attributes (CLA)** are not "attributes stored on the category" in the everyday sense. They are rules attached to a catalog node that control how **product** attributes behave for everything in that category (and subcategories when propagated):

- **Propagate:** push the CLA value down to products (overwrite all, or only fill empty values)
- **Lock:** products must have the **same value** as the CLA
- **Mandatory:** products must **have a value** for that attribute

**Variant Level Attributes (VLA)** are configured on a **variant group** (`GROUP` product). They control how attributes are shared with child variants:

- **Copy:** inherit the group value to variants (override existing or only fill empty, like CLA propagate)
- **Locked:** all variants must match the group value
- **Mandatory:** variants must have a value
- **Variant defining:** the attribute distinguishes variants (for example Color)

Bluestone documents this in [The data model](https://help.bluestonepim.com/the-data-model) and the [CLA help page](https://help.bluestonepim.com/category-level-attributes).

## Six new tools

All six are read-only. They use working-state MAPI with the same Bearer token as the rest of the unofficial server.

### Category level attributes

**`list_category_level_attributes`:** CLAs on one category or catalog node.

Returns attribute name, value, and whether each CLA is propagated, locked, or mandatory. Use when someone asks "what rules apply to this category?" before auditing products underneath it.

**`list_categories_with_cla`:** reverse lookup: which categories use a given attribute definition as a CLA.

Use when you know the attribute (Brand, Material, etc.) and want to see every category where it is configured as a CLA.

### Variant level attributes

**`list_variant_level_attributes`:** all VLAs on a variant group.

There is no "list all VLAs" API in Bluestone. The tool reads the group's attributes, then probes each definition (up to 50 per call). If the group has more attributes, the response includes `truncated: true` and a `nextOffset` so you can fetch the rest.

**`get_variant_level_attribute`:** VLA flags for one attribute on one group (`copy`, `locked`, `mandatory`, `variantDefining`).

Use when you already know the attribute and only need its VLA settings.

### Validation issues

**`get_product_validation_issues`:** all sync validation issues for one product in one context.

Issues are grouped by kind (CLA, VLA, attribute restrictions, compound, dictionary) with resolved attribute names. An empty list means the product is valid in that context, not an error.

**`list_product_validation_issues`:** bulk check for up to 100 product IDs in one context.

Workflow: list products in a category, pass IDs to this tool, get back which products fail and why. For larger catalogs, paginate manually (100 IDs per call).

## API endpoints behind the tools

Everything goes through Bluestone's Management API (MAPI): all working-state endpoints that are not PAPI, including `/pim` and `/completeness-score`. Base domain: `api.test.bluestonepim.com` (production: `api.bluestonepim.com`).

### CLA (MAPI `/pim`)

| MCP tool | HTTP | Path |
|---|---|---|
| `list_category_level_attributes` | GET | `/pim/catalogs/nodes/{categoryId}/attributes` |
| `list_categories_with_cla` | GET | `/pim/catalogs/nodes/attributeDefinition/{definitionId}` |

Use the `/attributes` path, not `/category-attributes`. The richer response includes `copySetOn`, `lockedSetOn`, and `mandatorySetOn`, which map to propagate, lock, and mandatory in the tool output.

### VLA (MAPI `/pim`)

| MCP tool | HTTP | Path |
|---|---|---|
| `get_variant_level_attribute` | GET | `/pim/products/{groupId}/variants/attributes/{definitionId}` |
| `list_variant_level_attributes` | GET | `/pim/products/{groupId}` (full product) + GET per definition as above |

The `{groupId}` must be a **GROUP** product, not a variant. If you pass a variant ID, the tool tells you to use `variantParentId` from `get_product`.

### Validation (MAPI `/completeness-score`)

| MCP tool | HTTP | Path |
|---|---|---|
| `get_product_validation_issues` | GET | `/completeness-score/validations/{productId}/{context}` |
| `list_product_validation_issues` | POST | `/completeness-score/validations/by-ids` |

Validation issue types that map to CLA and VLA:

- `MISSING_CATEGORY_ATTRIBUTE`, `MISSING_CATEGORY_VALUE`, `INVALID_CATEGORY_VALUE`
- `MISSING_VARIANT_ATTRIBUTE`, `MISSING_VARIANT_VALUE`, `INVALID_VARIANT_VALUE`

Plus attribute-level types such as `INVALID_ATTRIBUTE_VALUE` and dictionary filter violations.

## Example prompts

Start with the source, same as other unofficial MCP workflows:

```text
Using Bluestone PIM, what CLA rules apply to the Laptops category?
```

```text
Using Bluestone PIM, show validation errors for T-shirt Green in English.
```

```text
Using Bluestone PIM, which of these products fail CLA or VLA rules?
```

A practical audit thread:

```text
User: Using Bluestone PIM, list category level attributes on Electronics > Laptops.
Assistant: Found 4 CLAs: Brand (locked, propagated), Material (mandatory), ...

User: List products in that category, then check validation issues for the first 50 in English.
Assistant: 8 of 50 products have validation issues: 5 CLA (locked Brand mismatch), 2 VLA (missing Size on variants), 1 attribute format error.
```

For variant groups:

```text
User: Using Bluestone PIM, what variant level attributes are set on the T-shirt group?
Assistant: Color (variant-defining, copy to variants), Size (mandatory), ...
```

Cross-check when something fails:

```text
User: Why is this variant invalid?
Assistant: INVALID_VARIANT_VALUE on Color: variant value does not match the locked variant group value.

User: Show me the VLA settings for Color on that group.
Assistant: Color is locked and copy is enabled on the group.
```

In Cursor, larger validation result sets open in a **Canvas** beside the chat (summary cards by CLA/VLA/other, filter pills, issue cards). Same presentation pattern as completeness search results.

## Where MCP complements the UI

The Bluestone PIM UI excels at editing one product, one category, or one variant group at a time. CLA, VLA, and validation QA often span many products or categories at once. MCP read tools help with that wider view. They do not replace the screens you already use for configuration and fixes.

### CLA

CLAs live on the **CLA tab** when you edit a catalog node. To understand "what rules apply to products in Laptops?", you open the category, switch to CLA, and read propagate/lock/mandatory per attribute. That is the right place to configure rules.

For cross-category questions ("where is Brand used as a CLA?") or a quick rules scan before you open individual products, the MCP tools can answer in one conversation instead of visiting many categories in turn.

### VLA

VLAs are configured **per attribute on the variant group**: mark inherited by variants, set locked/mandatory/variant-defining, choose override vs fill-empty when propagating. On each variant, inherited attributes are marked as VLA but the **rule** (locked, mandatory) is on the group.

When you are reviewing a group end to end, MCP can return VLA flags and validation issues in one thread alongside the group settings you would read in the UI.

### Validation errors

Validation issues surface clearly in product context and sync workflows when you are fixing a specific product. When you want to **aggregate** across many products ("show me every invalid product in this category and group by CLA vs VLA"), MCP and chat make it easier to chain a category listing with bulk validation and a summary.

Completeness scores give a dashboard-friendly percentage. Validation is rule-specific across CLA, VLA, and attribute constraints. Read tools help you connect those layers in one place.

### What chat + MCP adds

The new tools complement the UI for **read-heavy QA**:

- Ask what CLA rules exist before diving into products
- Bulk validation on up to 100 IDs per call after a category listing
- Chain questions: rules → products → issues → attribute names, in one conversation
- Let the model summarize patterns ("most failures are locked Brand on this branch")

Partners can fork the unofficial server and add write tools (`forceCla`, `forceVla` propagation) later. This release is deliberately read-only: inspect rules and failures first, fix in the UI or via API you control.

## What works now (data quality reads)

Together with the existing completeness tools, the unofficial Bluestone PIM MCP server can now:

- Search and filter products by completeness score (`search_products`)
- Read completeness requirement breakdown per product (`get_product_completeness_detail`)
- List CLAs on a category and find categories using an attribute as CLA
- List and inspect VLAs on variant groups
- Read sync validation issues for one product or up to 100 products per call

Still not in scope: configuring CLAs or VLAs through MCP, catalog-wide "all invalid products" search (validation status filter in Search API is a plausible next step), or replacing Bluestone's own validation UI for edits.

## Try it

Connect Cursor, Claude Desktop, or another MCP client using the [unofficial MCP setup guide](https://bluestone-mcp-unofficial.vercel.app/connect). The Recent updates section on that page lists CLA, VLA, and validation reads at the top.

Source and tool definitions: [bluestone-pim-unofficial-mcp on GitHub](https://github.com/leafleaf90/bluestone-pim-unofficial-mcp).

For the official Bluestone PIM view on MCP and the data model, see [bluestonepim.com/mcp](https://www.bluestonepim.com/mcp) and [help.bluestonepim.com/the-data-model](https://help.bluestonepim.com/the-data-model).
