# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Supabase Community

The Community feed uses Supabase when a researcher signs in with Supabase. To initialize it:

1. Apply `supabase/migrations/001_initial_schema.sql` to create the researcher and expedition tables.
2. Apply `supabase/migrations/002_community_schema.sql` to create the Community tables and Row Level Security policies.

The second migration creates `community_posts`, `community_comments`, `community_post_endorsements`, `community_comment_endorsements`, and `community_bookmarks`. Authenticated researchers can read the shared feed; each researcher can write only as themselves, and bookmarks and endorsement identities are private to their owner. Aggregate endorsement counts are returned through authenticated database functions. Existing preview posts are not uploaded or seeded into Supabase.

Supabase sign-in loads and persists Community posts, comments, endorsements, and bookmarks. Choosing Offline Local Mode keeps Community in its temporary, in-memory preview mode.
