# Contributing

Thanks for your interest in improving QDB Downloader.

## Prerequisites

- Bun 1.3.14
- Enough free disk space for SQLite snapshots and Electrobun packages
- Windows for producing the supported release artifact

Development works inside WSL through the Bun HTTP transport. Native Electrobun development depends on a supported desktop environment.

## Getting Started

1. Fork and clone the repository.
2. Install dependencies from the lockfile:

```bash
bun install --frozen-lockfile
```

3. Start the application inside WSL:

```bash
bun run start:wsl
```

For native Electrobun development, use `bun run start`. Generated databases, application bundles, exports, coverage, and release artifacts must not be committed.

## Workspace Structure

- `projects/electrobun/src/` contains the standalone Angular renderer.
- `projects/electrobun/desktop/` contains Electrobun and WSL desktop services, SQLite, Soccerbot, and exports.
- `projects/electrobun/shared/` contains serializable contracts and shared utilities.
- `projects/docs/` contains the statically generated documentation application.
- `examples/` is retained repository data and is intentionally excluded from application logic and tooling.

The workspace uses strict, standalone, zoneless Angular applications and CSS stylesheets. Generate Angular artifacts with Angular CLI and keep applications under `projects/`.

## Project Commands

- `bun run start` — start the Angular renderer and native Electrobun shell.
- `bun run start:wsl` — start Angular and the Bun backend inside WSL.
- `bun run start:docs` — serve the documentation application.
- `bun run build` — build the renderer and docs and type-check desktop code.
- `bun run test` — run Angular, desktop, database, scraper, and shared tests.
- `bun run lint` — lint TypeScript and Angular templates.
- `bun run format:check` — verify Prettier formatting.
- `bun run validate` — run all source validation.
- `bun run package:desktop` — package Electrobun for the current supported host.

## Contribution Process

1. Create a focused branch from `master`.
2. Use Angular Conventional Commit messages such as `feat(import): add squad selection` or `fix(db): preserve project isolation`.
3. Add or update tests for changed behavior.
4. Before opening a pull request, run:

```bash
bun run validate
bun run build
```

5. Explain what changed, why it changed, how it was tested, and whether it affects SQLite, RPC, Soccerbot, documentation, or release artifacts.

## Coding and Data Standards

- Follow `AGENTS.md` and `.github/copilot-instructions.md`.
- Use Signal Forms and signals for new renderer forms and state.
- Keep SQLite, Soccerbot, dialogs, and filesystem access outside Angular.
- Expose narrow serializable operations through typed RPC or the equivalent WSL transport.
- Parameterize SQLite values and constrain dynamic identifiers with allowlists.
- Treat reference dates as validated `YYYY-MM-DD` calendar strings without UTC conversion.
- Keep Soccerbot seasons independent from snapshot reference dates.
- Maintain keyboard operation, visible focus, ARIA semantics, and WCAG AA contrast.

## Reporting Issues

Include expected and actual behavior, reproduction steps, the application version, operating system, snapshot reference date, optional source season, and relevant logs. Remove private information before posting.

Report security concerns privately as described in `SECURITY.md`.

## Git Hooks

`bun install` configures Husky. The pre-commit hook formats and lints staged files through lint-staged. The commit-message hook enforces Angular Conventional Commits.
