# Contributing

Thanks for improving QDB Downloader.

## Prerequisites

- Bun 1.3.14
- Node.js 24.18 or newer, but earlier than Node.js 25
- WSLg or a native Linux desktop for Linux development
- Windows or the Windows CI runner for supported release artifacts

## Getting Started

```bash
bun install --frozen-lockfile
bun run start
```

Inside WSL, Electron runs as a Linux application through WSLg. Do not configure Xming-specific `DISPLAY` values. Generated databases, `.electron`, `dist`, `out`, exports, and coverage must not be committed.

## Workspace Structure

- `projects/electron/src/` contains the standalone Angular renderer.
- `projects/electron/electron/` contains Electron main/preload code, SQLite, Soccerbot, and exports.
- `projects/electron/shared/` contains serializable IPC contracts and shared utilities.
- `projects/docs/` contains the static documentation application.
- `examples/` remains excluded repository data.

Use strict, standalone, zoneless Angular with CSS stylesheets. Generate Angular artifacts through Angular CLI and keep applications under `projects/`.

## Project Commands

- `bun run start` — compile and launch Angular with Electron.
- `bun run start:docs` — serve documentation.
- `bun run build` — build Angular, docs, Electron main, and preload.
- `bun run test` — run Angular and Node-runtime Vitest suites.
- `bun run lint` — lint TypeScript and Angular templates.
- `bun run format:check` — verify Prettier formatting.
- `bun run validate` — run all source quality gates.
- `bun run package:desktop` — package Electron for the current host.
- `bun run release:windows` — create Windows Squirrel and ZIP artifacts.

## Contribution Process

1. Create a focused branch from `master`.
2. Use Angular Conventional Commits such as `feat(import): add squad selection`.
3. Add or update tests for changed behavior.
4. Run `bun run validate` and `bun run build`.
5. Explain behavioral, SQLite, IPC, Soccerbot, documentation, and packaging effects in the pull request.

## Coding and Data Standards

- Follow `AGENTS.md` and `.github/copilot-instructions.md`.
- Use signals and Signal Forms for new renderer forms and state.
- Keep SQLite, Soccerbot, dialogs, Electron, and filesystem APIs outside Angular.
- Expose narrow serializable operations through the context-isolated preload API.
- Parameterize SQLite values and allowlist dynamic identifiers.
- Keep reference dates as validated `YYYY-MM-DD` calendar strings without UTC conversion.
- Keep Soccerbot source seasons independent from snapshot reference dates.
- Maintain keyboard operation, visible focus, ARIA semantics, and WCAG AA contrast.

## Git Hooks

`bun install` configures Husky. Pre-commit runs lint-staged; commit-message enforces Angular Conventional Commits.

## Reporting Issues

Include expected and actual behavior, reproduction steps, application version, operating system, reference date, optional source season, and sanitized logs. Report security concerns according to [SECURITY.md](SECURITY.md).
