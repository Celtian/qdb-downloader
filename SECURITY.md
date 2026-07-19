# Security Policy

## Supported Versions

Security fixes are applied to the latest release and the current `master` branch. Users should update to the newest published QDB Downloader release.

## Reporting a Vulnerability

Do not open a public issue for a suspected vulnerability. Report security concerns privately by email:

- dominik.hladik@seznam.cz

Include the affected version and operating system, component or RPC operation, reproduction steps, potential impact, sanitized proof-of-concept input, and a suggested mitigation when possible.

## Response Expectations

- Initial acknowledgment within five business days.
- Triage and severity assessment after acknowledgment.
- Coordinated disclosure after a fix is available.

## Security Model

The Angular renderer does not receive raw SQLite, Soccerbot, or filesystem access. Electrobun exposes narrow typed RPC operations, and the WSL development server binds to localhost. SQLite statements use strict bindings and controlled identifiers, imports commit transactionally, and export-directory opening is restricted to directories created by the active process.

Reports describing arbitrary SQL execution, unintended local-file access, untrusted remote content execution, RPC boundary bypasses, or Transfermarkt input that compromises local data are particularly important.
