# Repository Guidelines

## Project Structure & Module Organization

- `src/`: Action source (ESM). Entry is `src/index.js`, calls `cloudflare.js`
  and `cloudflare-statuscheck.js`.
- `dist/`: Compiled bundle from `ncc`. Do not edit files here.
- `test/`: Node test files (`*.test.js`) and JSON fixtures in `test/fixtures/`.
- Root: `action.yml` (inputs/outputs), configs (`eslint.config.js`,
  `.prettierrc`), CI, and docs.

## Build, Test, and Development Commands

- `npm run lint` — Lints all files with ESLint.
- `npm test` — Runs Node’s `node:test` suite.
- `npm run prepare` — Bundles to `dist/` via `@vercel/ncc` with source maps.
- `npm run build` — `lint` + `test` + `prepare` (use before publishing).
- First-time setup: `npm i` (installs Husky hooks). Node `>=20` is required.

## Coding Style & Naming Conventions

- Formatting via Prettier: single quotes, no semicolons, no trailing commas.
- ESLint: `@eslint/js` recommended rules; Node globals enabled; `dist/` ignored.
- Files: kebab-case for filenames (`cloudflare-statuscheck.js`), camelCase for
  functions/vars.
- Keep modules small and focused; prefer pure functions and explicit inputs.

## Testing Guidelines

- Framework: built-in `node:test`; mocking via `esmock`.
- Place fixtures in `test/fixtures/*.json` and import with `readFileSync` as in
  existing tests.
- Name tests `*.test.js` and colocate under `test/`.
- Run locally with `npm test`; add tests for new inputs, filtering, and failure
  paths.

## Commit & Pull Request Guidelines

- Conventional Commits enforced by Commitlint/Husky (e.g.,
  `feat: add wait flag`, `fix: handle empty result`).
- Pre-commit runs lint-staged (Prettier + ESLint). Ensure `npm test` passes.
- PRs should include: clear description, linked issues, rationale, and test
  updates. If `action.yml` or outputs change, update `README.md` examples.

## Security & Configuration Tips

- Required secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`; optional
  `CLOUDFLARE_ACCOUNT_EMAIL`.
- Never log tokens or emails. Prefer dependency injection and mocks in tests;
  avoid live API calls.
- Do not commit changes to `dist/` without running `npm run build`.
