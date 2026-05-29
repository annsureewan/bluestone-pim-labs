## Project submission checklist

- [ ] Added entry to `projects.json`
- [ ] All required fields present: `name`, `description`, `github`, `status`
- [ ] Optional `author` / `authorUrl` added if you want a display name on the card
- [ ] `status` is one of: `live`, `beta`, `wip`, `archived`
- [ ] URLs start with `https://`
- [ ] `github` URL (if included) points to `https://github.com/`
- [ ] Description is one or two sentences, no em dashes

The `validate-projects.json` CI check will run automatically and flag any schema errors.
