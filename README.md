# ⚽ QDB Downloader

QDB Downloader is a Windows desktop application for maintaining date-based football-data snapshots from Transfermarkt. A project such as `2026/1` has one required reference date, while its imported Soccerbot season remains an independent optional source parameter.

The application is local-first: Electrobun owns SQLite, filesystem access, and Soccerbot; a standalone, zoneless Angular renderer communicates with that process through serializable typed RPC.

## 🗂️ Workspace

- `projects/electrobun/src` — Angular Material/CDK desktop view.
- `projects/electrobun/desktop` — Electrobun process, SQLite migrations, Soccerbot, and exports.
- `projects/electrobun/shared` — RPC contracts and date-only utilities.
- `projects/docs` — prerendered documentation for GitHub Pages.
- `examples` — retained repository data, intentionally excluded from all application code and tooling.

## 📋 Prerequisites

- [Bun](https://bun.sh/) 1.3 or newer.
- A Windows host for producing the supported release artifact.

## 🛠️ Development

```bash
bun install --frozen-lockfile
bun run start
```

The Angular renderer starts on `127.0.0.1:4200`; Electrobun waits for it and opens the desktop window. Documentation is available separately with `bun run start:docs`.

### 🐧 WSL

Run the complete development application inside WSL with:

```bash
bun run start:wsl
```

Open `http://127.0.0.1:4200` in your browser. Angular and the Bun backend both run in Ubuntu; no X server or GTK window is needed. SQLite data is stored at `~/.local/share/qdb-downloader/qdb-downloader.sqlite`. Exports are written to `~/Downloads/QDB Downloader`, or to `~/.local/share/qdb-downloader/exports` when the Downloads directory does not exist. You can override these locations with `QDB_DATABASE_PATH` and `QDB_EXPORT_DIRECTORY`.

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

Husky runs Prettier and ESLint against staged files before a commit. Commit messages must follow the Angular conventional-commit convention.

## 📦 Packaging and releases

`bun run package:desktop` creates a stable artifact for the current host. Stable `vMAJOR.MINOR.PATCH` tags from `master` validate the repository, build the unsigned Windows x64 release, attach artifacts and SHA-256 checksums to GitHub Releases, and then deploy the static documentation.

### 🪟 Installing the Windows release

1. Download `stable-win-x64-QDBDownloader-Setup.zip` from the GitHub Release.
2. Extract the entire ZIP archive. Keep the `.installer` directory beside the EXE.
3. Run `QDB Downloader-Setup.exe` from the extracted directory. Do not run it directly inside the ZIP.

The installer is currently unsigned. Antivirus software or Windows SmartScreen may warn about it. Verify that the archive came from the expected GitHub Release and compare its SHA-256 checksum before deciding whether to continue. Do not disable antivirus globally. The `.tar.zst` and `update.json` assets support Electrobun updates and are not manual installers.

If setup closes unexpectedly, open PowerShell in the extracted directory and capture its output:

```powershell
& '.\QDB Downloader-Setup.exe' *>&1 | Tee-Object installer.log
```

The extracted layout must contain all three entries:

```text
QDB Downloader-Setup.exe
.installer/QDB Downloader-Setup.metadata.json
.installer/QDB Downloader-Setup.tar.zst
```

The documentation build uses the GitHub Pages base path:

```bash
bun run build:docs
```

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development commands, architecture rules, and the pull-request process. Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## 🏷️ Changelog

Release history is maintained in [CHANGELOG.md](CHANGELOG.md) with `auto-changelog`.

## 🔒 Security

Report vulnerabilities privately according to [SECURITY.md](SECURITY.md).

## 📄 License

QDB Downloader is available under the [MIT License](LICENSE.md).
