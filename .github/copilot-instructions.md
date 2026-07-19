# QDB Downloader development instructions

QDB Downloader is an Angular 22 and Electrobun workspace. Applications live under `projects/`; existing `examples/` are retained but excluded from application code, tests, builds, and releases.

## Angular

- Use Angular CLI to generate Angular artifacts.
- Use standalone, strict, zoneless Angular APIs.
- Use signals and Signal Forms for new state and forms.
- Use native template control flow and accessible Angular Material/CDK components.
- Use CSS stylesheets only. Material owns interactive components; Tailwind is limited to layout utilities and must not enable preflight.

## Electrobun and SQLite

- The Electrobun Bun process owns SQLite, Soccerbot, dialogs, and filesystem access.
- Expose only narrow serializable operations through the typed RPC contract.
- Keep SQL values parameterized and constrain dynamic identifiers with explicit allowlists.
- Preserve migrations, foreign keys, WAL, prepared statements, strict bindings, transactions, and project isolation.
- The WSL browser transport must provide the same application operations without importing the Electrobun native wrapper.

## Snapshot data

- Treat project reference dates as validated `YYYY-MM-DD` calendar strings; do not serialize them through `Date` or UTC.
- Keep Soccerbot's optional source season independent from the project reference date.
- Normalize Transfermarkt data at the desktop boundary and upsert only within the active project.
- Never introduce FIFA terminology or mappings.

## Verification

Run formatting, linting, type checking, tests, and builds appropriate to the change. Do not commit SQLite databases, `dist/`, `.electrobun/`, artifacts, coverage, or generated output.
