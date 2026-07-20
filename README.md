# ⚽ QDB Downloader

QDB Downloader is a local-first desktop application for creating date-based football-data snapshots from Transfermarkt. A project such as `2026/1` has a required reference date; Soccerbot's optional source season stays independent.

Electron owns SQLite, Soccerbot, filesystem access, and native dialogs. A strict, standalone, zoneless Angular renderer communicates with it through a narrow typed IPC bridge.

## ✨ Features

- 📅 Create isolated snapshot projects with timezone-independent reference dates.
- 🏆 Browse leagues, teams, and players with server-side search, sorting, and pagination.
- 🔎 Preview Transfermarkt leagues or teams and select the squads and players to import.
- ⚖️ Review matching records and choose whether imported data and team/player ownership should replace stored values.
- 🗃️ Persist normalized data locally in SQLite with transactions, foreign keys, and WAL.
- 📤 Export complete project tables as JSON or RFC 4180 CSV.

## 🗂️ Workspace

- `projects/electron/src` — Angular Material/CDK renderer.
- `projects/electron/electron` — Electron main process, preload bridge, SQLite, Soccerbot, and exports.
- `projects/electron/shared` — serializable IPC contracts and date-only utilities.
- `projects/docs` — statically generated documentation for GitHub Pages.
- `examples` — retained repository data, intentionally excluded from application code and tooling.

## 📋 Prerequisites

- [Bun](https://bun.sh/) 1.3.14.
- Node.js 24 for Node-runtime desktop tests.
- WSLg when developing inside WSL.

## 🚀 Development

```bash
bun install --frozen-lockfile
bun run start
```

Angular starts on `127.0.0.1:4200`, Electron main and preload code compile into `.electron`, and Electron opens the desktop window. Run the documentation separately with `bun run start:docs`.

### 🐧 WSLg

Run the same command from Ubuntu:

```bash
bun run start
```

Use WSLg supplied by current Windows/WSL; do not override `DISPLAY` for Xming. Hardware acceleration is disabled to avoid the WebKit/GL failures encountered with the previous desktop runtime. Electron stores the development database in its Linux user-data directory. Set `QDB_DATABASE_PATH` only when a custom database location is needed.

The start command clears VS Code's inherited `ELECTRON_RUN_AS_NODE` value before launching Electron and disables Vite dependency prebundling, preventing the misleading esbuild `write EPIPE` shutdown seen when the desktop process exits during Angular startup.

## ✅ Quality commands

```bash
bun run format:check
bun run lint
bun run typecheck
bun run test
bun run test:coverage
bun run build
bun run validate
```

🪝 Husky formats and lints staged files before commit. Commit messages follow Angular Conventional Commits.

## 📦 Packaging and releases

```bash
bun run package:desktop
```

This packages Electron for the current host. Stable `vMAJOR.MINOR.PATCH` tags from `master` run validation, build Windows x64 with Electron Forge, publish Squirrel Setup and portable ZIP artifacts with SHA-256 checksums, then deploy documentation.

### 🔏 Code signing policy

Free code signing provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

- Committer and reviewer: [Dominik Hladík (`@Celtian`)](https://github.com/Celtian)
- Approver: [Dominik Hladík (`@Celtian`)](https://github.com/Celtian)
- Privacy: QDB Downloader contacts Transfermarkt only when a user initiates a data operation and automatically contacts GitHub Releases to check for application updates. Project data and exported files remain local and are not intentionally transmitted to other services.

### 🪟 Installing on Windows

Choose one release asset:

1. Download and run `QDB-Downloader-Setup.exe` for the normal installation.
2. Or download the Windows x64 ZIP, extract it completely, and run `QDB Downloader.exe`.

The application is currently unsigned. Windows SmartScreen or antivirus software may warn about it. Confirm that the file came from the expected GitHub Release and compare its `.sha256` checksum before deciding whether to continue. Do not disable antivirus globally.

🔄 Packaged installations check GitHub Releases for updates automatically.

## 📚 Documentation

```bash
bun run build:docs
```

The site is built with `/qdb-downloader/` as its GitHub Pages base path and uses `404.html` as its SPA fallback.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture rules, commands, and the pull-request process. Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## 🏷️ Changelog

Release history is maintained in [CHANGELOG.md](CHANGELOG.md) with `auto-changelog`.

## 🔒 Security

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## 📄 License

QDB Downloader is available under the [MIT License](LICENSE.md).
