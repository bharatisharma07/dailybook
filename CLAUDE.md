# Trace Windows Prototype — Context & Rules

## Project Goal
Build a lightweight, keyboard-driven Windows menubar overlay app (like Trace macOS) for logging
work context via slash commands. This directory is a rapid React prototype — all persistence is
in `localStorage`; no Rust database bindings are used.

## Tech Stack
- Frontend: React + Tailwind CSS + Lucide Icons
- App Framework: Tauri 2.0 (Rust)
- Storage: localStorage (prototype) → SQLite in Phase 3
- State: single-file App.tsx, no external state library

## Architecture Rules
1. Zero Taskbar footprint in production (skipTaskbar). Prototype keeps it visible for dev ease.
2. Hotkey: `Alt+Space` toggles overlay — wired in Phase 1 (`trace-windows`), not in this proto.
3. Keep memory footprint low (<30 MB idle).
4. Tailwind CSS only — no Material UI / Chakra / shadcn.
5. Everything that can live in the frontend does. Only move to Rust when the browser API can't do it.

## Slash Commands
| Command   | Behaviour                               |
|-----------|-----------------------------------------|
| /log      | Record a work context entry             |
| /task     | Add an actionable item                  |
| /done     | Mark a task complete                    |
| /flag     | Highlight a key decision or milestone   |
| /screen   | Mock a screen-context snapshot entry    |

## Terminal Commands
- Dev mode : `pnpm tauri dev`
- Build    : `pnpm tauri build`
- Icons    : run `../trace-windows/setup.ps1` first if icons folder is empty
