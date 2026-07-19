# QDB Downloader development instructions

QDB Downloader is an Angular 22 and Electron workspace. Applications live under `projects/`; `examples/` remains excluded from application code, tests, builds, and releases.

## Angular

- Generate Angular artifacts through Angular CLI.
- Use standalone, strict, zoneless Angular APIs, signals, and Signal Forms.
- Use native template control flow and accessible Angular Material/CDK components.
- Use CSS stylesheets. Material owns interactive components; Tailwind is limited to layout utilities without preflight.

## Electron and SQLite

- Electron main owns SQLite, Soccerbot, dialogs, updates, and filesystem access.
- Expose only narrow serializable operations through the sandboxed, context-isolated preload API.
- Do not enable Node integration in Angular.
- Keep SQL values parameterized and dynamic identifiers allowlisted.
- Preserve migrations, foreign keys, WAL, prepared statements, transactions, and project isolation.

## Snapshot data

- Treat reference dates as validated `YYYY-MM-DD` calendar strings without `Date` or UTC serialization.
- Keep Soccerbot source season independent from the project reference date.
- Normalize Transfermarkt data at the desktop boundary and upsert only within the active project.
- Never introduce FIFA terminology or mappings.

## Verification

Run formatting, linting, type checking, tests, builds, and relevant packaging checks. Do not commit SQLite databases, `.electron`, `dist`, `out`, coverage, or generated output.
