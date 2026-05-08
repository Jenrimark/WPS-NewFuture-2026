# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Full-stack training repository organized by weekly lessons (`week01`-`week08`). Each week contains `practice/` (in-class) and `homework/` (graded).

**Student:** 吴汉东, 中国地质大学（武汉）, ID: 20231003912

## Git Conventions

[Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <subject>`

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. Imperative mood. Breaking changes: `!` suffix or `BREAKING CHANGE:` footer.

---

## Current Focus: Week 07 — Online Poster Designer

**Assignment directory:** `week07/homework/poster/`

### Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Build | Vite | 8.x |
| UI | React + TypeScript | 19.x / 6.x |
| Styling | Tailwind CSS + shadcn/ui | v4 / base-nova |
| Canvas | Fabric.js | 7.3.x |
| State | Zustand | 5.x |
| Icons | Lucide React | latest |
| Color Picker | react-colorful | latest |
| Backend | Go + Gin + GORM + SQLite | — |
| Deploy | Docker single container | port 8080 |

### Directory Structure

```
week07/homework/poster/
├── client/               # Frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   │   └── ui/       # shadcn/ui components
│   │   ├── lib/          # Utilities (cn, etc.)
│   │   ├── store/        # Zustand stores
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css     # Tailwind v4 + shadcn theme
│   ├── components.json   # shadcn/ui config (base-nova, lucide)
│   ├── vite.config.ts
│   └── package.json
├── server/               # Backend (Go, port 8080)
├── progress.md           # Development progress tracking
└── README.md             # Required: project info + task list + tech notes
```

### Build & Run Commands

```bash
# Frontend
cd week07/homework/poster/client
npm run dev      # Dev server :5173 (proxy → :8080/api)
npm run build    # Production build → dist/

# Backend
cd week07/homework/poster/server
go run .         # API server :8080

# Docker (from poster/)
cd week07/homework/poster
docker compose up -d --build   # http://localhost:8080
```

### API Endpoints

```
POST /api/register   { username, password }
POST /api/login      { username, password }
```

### Feature Requirements (from 要求.md)

**1. Auth:** Login/register, persistent multi-day sessions, per-user poster storage.

**2. Layout — Three-column:**
- Top toolbar: Logo, title, undo/redo, logout, download
- Left panel: Vertical tabs — Text / Shape / Image
- Center: Zoomable canvas with +/- controls at bottom
- Right panel: Dynamic — canvas properties (no selection) or element properties (selected)

**3. Canvas:** 600×800px default, custom size with aspect ratio lock, color/image background, reset background.

**4. Text elements:** Click or drag to place. Properties: font, size, color, bold/italic/underline/strikethrough, alignment, letter-spacing, line-height, opacity, shadow. Click to edit inline.

**5. Shape elements:** SVG shapes in categories (基础/节日/其它). Properties: fill, stroke, shadow.

**6. Image elements:** Preset images, local upload (Ali OSS direct upload, private read), AI generation (Ali Cloud Bailian). Properties panel on select.

**7. Element operations:** Selection box (dashed + handles), drag move, smart alignment guides, resize handles, rotate handle, right-click context menu (layer order), alignment (center H/V).

**8. Undo/Redo:** Operation history, buttons greyed when unavailable.

**9. Export:** Download canvas as PNG.

### Submission Requirements

- `client/`: `npm run dev` (port 5173) + `npm run build`
- `server/`: port 8080
- `docker compose up -d --build` from `poster/` directory
- `README.md`: project info, task list, core tech notes
- Video: ≤5min, show text/SVG/image operations, explain core tech points
- `.env` files must be submitted (for grading)

### Installed Skills

- **UI/UX Pro Max** — 67 styles, 96 palettes, 57 font pairings. Use for design system generation:
  ```bash
  python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --design-system
  ```
- **superpowers** — brainstorming, TDD, debugging, planning, code review skills
- **planning-with-files** — Manus-style file-based planning
