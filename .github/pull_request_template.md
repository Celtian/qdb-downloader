## ✍️ Describe your changes

Explain what changed and why.

## 🔗 Related issue

Link the related issue, if one exists.

## 🧪 How to test

List the commands and manual scenarios used to verify the change.

## 📦 Data and release impact

- SQLite/migration impact: none / describe
- RPC contract impact: none / describe
- Soccerbot/import impact: none / describe
- Packaged artifact impact: none / describe
- Documentation impact: none / describe

## ✅ Checklist

- [ ] I performed a self-review and kept the change focused.
- [ ] I added or updated tests for changed behavior.
- [ ] `bun run format:check`, `bun run lint`, and `bun run test` pass.
- [ ] The production build passes for affected projects.
- [ ] Renderer changes are keyboard accessible and meet WCAG AA.
- [ ] Desktop changes keep SQLite, Soccerbot, and filesystem access behind typed RPC.
- [ ] Date-only values remain timezone independent.
- [ ] I updated relevant documentation.
