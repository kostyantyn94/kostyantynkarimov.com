# kostyantynkarimov.com

Interactive portfolio of Kostyantyn (Kostya) Karimov. Reply to him in Russian; code, comments and site copy in English.

## Before writing content

Read `notes/PLAN.md` (plan, decisions, content and positioning rules) and `notes/CONTENT.md` (site copy draft).
`notes/` is gitignored and private: never commit it, quote it in commits, or copy its rules into tracked files.
Facts about Kostya come only from those notes and his CV. Do not invent metrics.

## Design system

- Tokens live in `src/styles/global.css` as CSS variables for both themes (`[data-theme='dark']`), mapped to Tailwind colors in `@theme inline`. Default Tailwind colors are disabled on purpose: use `bg-bg`, `bg-surface`, `text-ink`, `text-muted`, `border-border`, `text-ok` / `text-review` / `text-error`.
- Status colors mark pipeline states only. Keep text at WCAG AA (4.5:1) in both themes; `--faint` is decorative only.
- Monochrome by design: do not add accent colors or gradients without asking Kostya.
- Code is shown without font ligatures (`<=>` must read as typed).
- Every new component goes on `/styleguide` too.

## Commands

- `npm run dev`, or `npx astro dev --background` with `astro dev stop|status|logs`
- `npm run ci` = format check + `astro check` + Vitest + build. Run it before every commit.

## Dependencies

Pin new packages to a release at least two weeks old (`npm install --save-exact pkg@x.y.z`) unless there is a reason not to.

## Git

Commits are authored as Kostyantyn Karimov (repo-local config) with a `Co-Authored-By` trailer for Claude.
Push to `github.com/kostyantyn94/kostyantynkarimov.com` as `kostyantyn94`: the active `gh` account on this machine
is a different one, so use `GH_TOKEN=$(gh auth token -u kostyantyn94)` for `gh` commands.
