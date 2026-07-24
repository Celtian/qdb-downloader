# ⚽ QDB Downloader

QDB Downloader is a local-first Windows desktop application for building dated football-data snapshots from Transfermarkt, Soccerway, WorldFootball, and Eurofotbal. Each project has a required reference date that describes the snapshot as a whole. Transfermarkt accepts an optional separate four-digit season, Soccerway and WorldFootball do not use seasons, and Eurofotbal embeds the season in league Source IDs such as `chance-liga/2026-2027`.

Electron owns SQLite, Soccerbot, filesystem access, and native dialogs. A strict, standalone, zoneless Angular renderer communicates with it through a narrow typed IPC bridge.

## ✨ Features

- 📅 Create isolated snapshot projects with timezone-independent reference dates, then search, rename, review totals, or delete them.
- 🔎 Preview leagues or teams from supported sources, select squads and players, and cancel long squad fetches after the current team.
- ⚖️ Add new data or update existing sources with explicit missing-record, name, and ownership policies plus a complete change summary before commit.
- 🏆 Browse leagues, teams, and players with database-backed search, sorting, pagination, drill-down links, detailed filters including New, Old, and custom badges, optional league tiers from 1 to 10, and remembered table layouts.
- ✏️ Edit league and team names, countries, source identities, seasons, league tiers, and team-to-league relationships, or apply countries, tiers, and reusable custom badges to a page selection.
- 🗑️ Delete individual or selected records with impact-aware confirmations, remove records from selected sources in Project settings, or clear every project from Global settings.
- 🗃️ Persist normalized data locally in SQLite with transactions, foreign keys, and WAL.
- 📤 Export selected leagues, unassigned teams, and descendants with reusable column presets as separate JSON, nested Single JSON, or RFC 4180 CSV.
- 🎨 Use Global settings for the theme, badge timing, custom badges, and finder layouts; use Project settings to reset the active project's saved filters.

See the [managing data guide](https://celtian.github.io/qdb-downloader/managing-data) for league classification, bulk changes, and safe deletion workflows.

## 🌍 Supported sources

Every provider supports league and direct-team imports. Transfermarkt remains the recommended default; the alternatives are useful when its coverage or data does not fit the import.

| Provider          | Best use and import behavior                                                                                            | Season handling                                                                | Example league / team Source IDs                                           | Player source links              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------- |
| **Transfermarkt** | Recommended for the broadest coverage and fast imports.                                                                 | Optional separate four-digit season, such as `2026`.                           | `GB1` / `281`                                                              | Not available through Soccerbot. |
| **Soccerway**     | Global alternative when Transfermarkt data is unavailable. Imports are slower because requests are rate-limited.        | Not used.                                                                      | `czech-republic/chance-liga/standings/bNFMkskm` / `slavia-prague/viXGgnyB` | Available.                       |
| **WorldFootball** | Global alternative with detailed player profiles. Profiles load separately, so fetch no more than two squads per batch. | Not used.                                                                      | `co7093/mexico-lp---serie-b` / `te237557/artesanos-metepec`                | Available.                       |
| **Eurofotbal**    | Very fast, Europe-focused imports. Use the final canonical URL because redirected URLs cannot be loaded.                | The league season is embedded in the Source ID; teams have no separate season. | `chance-liga/2026-2027` / `cesko/sparta-praha`                             | Not available through Soccerbot. |

See the [import guide](https://celtian.github.io/qdb-downloader/importing) for complete canonical URL examples and provider-specific guidance.

## 🗂️ Workspace

- `projects/electron/src` — Angular Material/CDK renderer.
- `projects/electron/electron` — Electron main process, preload bridge, SQLite, Soccerbot, and exports.
- `projects/electron/shared` — serializable IPC contracts and date-only utilities.
- `projects/docs` — statically generated documentation for GitHub Pages.
- `examples` — retained repository data, intentionally excluded from application code and tooling.

## 📋 Prerequisites

- [Bun](https://bun.sh/) 1.3.14.
- Node.js 24.18 or newer, but earlier than Node.js 25, for Node-runtime desktop tooling and tests.
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

### 🪟 Installing on Windows

Choose one release asset:

1. Download and run `QDB-Downloader-Setup.exe` for the normal installation.
2. Or download the Windows x64 ZIP, extract it completely, and run `QDB Downloader.exe`.

The application is currently unsigned. Windows SmartScreen or antivirus software may warn about it. Confirm that the file came from the expected GitHub Release and compare its `.sha256` checksum before deciding whether to continue. Do not disable antivirus globally.

🔄 Packaged installations check GitHub Releases for updates automatically.

## 📚 Documentation

Read the [QDB Downloader documentation](https://celtian.github.io/qdb-downloader/) for installation, importing, browsing, managing stored data, updating, and exporting guidance.

```bash
bun run build:docs
```

The static site is built with `/qdb-downloader/` as its GitHub Pages base path and uses `404.html` as its SPA fallback.

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture rules, commands, and the pull-request process. Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

If QDB Downloader is useful to you, support the project by [starring the repository](https://github.com/Celtian/qdb-downloader) on GitHub.

## 🏷️ Changelog

Release history is maintained in [CHANGELOG.md](CHANGELOG.md) with `auto-changelog`.

## 🔒 Security

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## 📄 License

QDB Downloader is available under the [MIT License](LICENSE.md).
