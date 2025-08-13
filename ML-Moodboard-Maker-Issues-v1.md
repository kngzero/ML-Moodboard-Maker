
# ML Moodboard Maker — Issue Backlog (v1)

Use this document to create GitHub issues (copy/paste each block). Each item includes **Summary**, **Acceptance Criteria**, and suggested **Labels**.

---

## [feat] Undo / Redo (history)
**Summary**  
Add time-travel for board state (images, spans, crop, branding, layout).

**Acceptance Criteria**  
- [ ] ⌘/Ctrl+Z undoes last action; ⌘/Ctrl+Shift+Z (or Ctrl+Y) redoes  
- [ ] Works for add/remove/reorder/span/crop/branding/layout changes  
- [ ] History capped (e.g., 100 steps) with memory-safe pruning

**Labels**: enhancement, ux

---

## [feat] Multi-select & bulk actions
**Summary**  
Select multiple tiles to move, delete, set span, or crop together.

**Acceptance Criteria**  
- [ ] Shift/Cmd click toggles selection; drag box (optional)  
- [ ] Bulk delete with single confirm  
- [ ] Bulk set span (Flexible grid & Grid)  
- [ ] Keyboard: Arrow keys nudge selection by one cell

**Labels**: enhancement, ux

---

## [feat] Snap grid & smart guides
**Summary**  
Optional snapping to grid & alignment guides during drag/resize.

**Acceptance Criteria**  
- [ ] Toggle “Snap” overlay with adjustable granularity  
- [ ] Guide lines appear when edges align; snapping radius ~4–8px  
- [ ] No jitter; snap can be temporarily bypassed with Alt

**Labels**: enhancement, ux

---

## [feat] Span-resize in Grid mode (parity with Flexible grid)
**Summary**  
Enable 1×2, 2×2, etc. spans in **Grid** mode using the same ⇲ handle.

**Acceptance Criteria**  
- [ ] Resize handle on Grid tiles  
- [ ] No layout breakage; columns respected  
- [ ] Works with reorder

**Labels**: enhancement

---

## [feat] Lock / Hide per tile
**Summary**  
Lock prevents move/resize; Hide excludes from export and hides visually (dim overlay).

**Acceptance Criteria**  
- [ ] Per-tile lock state with icon  
- [ ] Hidden tiles not rendered into PNG/JPEG/WEBP/PDF  
- [ ] Bulk lock/hide via multi-select

**Labels**: enhancement, ux

---

## [feat] Replace image in place
**Summary**  
Swap the image source while preserving span, crop, and position.

**Acceptance Criteria**  
- [ ] “Replace” action on tile  
- [ ] On replace, tile keeps colSpan/rowSpan & crop  
- [ ] Handles local files and URLs

**Labels**: enhancement

---

## [feat] Branding presets (header layouts)
**Summary**  
Quick presets for branding block: Left/Center/Right, S/M/L title & logo sizes.

**Acceptance Criteria**  
- [ ] Preset dropdown updates header instantly  
- [ ] Exports match on-screen appearance

**Labels**: enhancement, ux

---

## [feat] Export presets (1×/2×/3×, transparent PNG, multi-page PDF)
**Summary**  
Common output sizes & options to reduce clicks and increase reliability.

**Acceptance Criteria**  
- [ ] Scale selector (1×/2×/3×); transparent background for PNG  
- [ ] Auto multi-page PDF for tall boards (paginate cleanly)  
- [ ] Output dimensions match preset within ±1px

**Labels**: enhancement

---

## [feat] Canvas-based exporter (reduce html-to-image flakiness)
**Summary**  
Primary renderer draws branding & tiles to `<canvas>` with `drawImage` + text; html-to-image becomes fallback.

**Acceptance Criteria**  
- [ ] Canvas exports produce identical or better fidelity  
- [ ] Remote-image decode order handled; fewer blank tiles  
- [ ] Option to force legacy DOM export for debugging

**Labels**: enhancement, reliability

---

## [feat] Project save/load format (`.mlmboard`)
**Summary**  
Bundle board state + assets in a single file for round-tripping and sharing.

**Acceptance Criteria**  
- [ ] Save `.mlmboard` (zip: `meta.json` + `assets/…`)  
- [ ] Load reproduces board exactly (images, spans, crop, branding)  
- [ ] Versioned schema with forward-compat guard

**Labels**: enhancement, persistence

---

## [feat] Autosave & recovery
**Summary**  
Local autosave with “Recover last session” prompt.

**Acceptance Criteria**  
- [ ] Snapshot after key actions; throttle to avoid perf hits  
- [ ] On load, detect previous session & offer restore  
- [ ] Clear autosave on explicit “New board”

**Labels**: enhancement, persistence, ux

---

## [feat] Templates library (IG, A4/A3, 16:9, Pinterest)
**Summary**  
One-click presets for layout, padding, gaps, and safe margins.

**Acceptance Criteria**  
- [ ] Template selector applies columns/gaps/padding + canvas size where relevant  
- [ ] Safe margin overlay toggle  
- [ ] Export matches target aspect

**Labels**: enhancement, ux

---

## [feat] Asset panel (thumbnails, recent, drag-to-place)
**Summary**  
Side drawer to manage assets, re-use images, and drag onto board.

**Acceptance Criteria**  
- [ ] Thumbnails grid with search/filter  
- [ ] Drag from panel onto board  
- [ ] “Collect” remote URLs into local cache (desktop) or warn about CORS (web)

**Labels**: enhancement, ux

---

## [perf] Virtualized rendering for large boards
**Summary**  
Only render tiles in/near viewport; pre-rasterize offscreen for smooth scroll.

**Acceptance Criteria**  
- [ ] 200+ tiles scroll smoothly on mid-range hardware  
- [ ] No visible pop-in; exports still include all tiles

**Labels**: performance

---

## [feat] Palette extraction & background suggestions
**Summary**  
Extract top colors from tiles and offer one-click background options.

**Acceptance Criteria**  
- [ ] Palette (5–8 swatches) updates when images change  
- [ ] Contrast hint for title/description text  
- [ ] Apply background from palette

**Labels**: enhancement, ux

---

## [refactor] Extract core board logic to a reusable module
**Summary**  
Move state/reducers (images, spans, crop, history) into `/core` to share across web & desktop.

**Acceptance Criteria**  
- [ ] `useBoardState()` hook with pure reducers + types  
- [ ] Web & Tauri consume the same core APIs  
- [ ] Unit tests cover reducers

**Labels**: refactor, tech-debt

---

## [test] Playwright end-to-end tests
**Summary**  
Automate critical flows: add images, reorder, resize, crop, export.

**Acceptance Criteria**  
- [ ] CI runs Playwright on PRs  
- [ ] Visual snapshot for export (tolerances set)  
- [ ] Flake-free on CI runners

**Labels**: testing, ci

---

## [ci] GitHub Actions: Pages deploy + Tauri release on tags
**Summary**  
Automate web deploys to Pages; build desktop installers on semver tags.

**Acceptance Criteria**  
- [ ] Pages workflow builds & publishes `dist/` on main  
- [ ] Tauri action builds Mac/Win/Linux on `v*.*.*` tag and drafts a release  
- [ ] Checksums and artifacts attach to release

**Labels**: ci, release

---

## [ux] Remove or rethink “Rows (visual)” control
**Summary**  
This slider is confusing outside **Grid** mode. Either hide in other modes or remove entirely.

**Acceptance Criteria**  
- [ ] Hidden in Automatic/Flexible grid  
- [ ] Optional: rename to “Row height” with clearer effect in Grid only  
- [ ] Docs updated

**Labels**: ux, cleanup

---

### Appendix — Optional bulk creation with GitHub CLI
If you want to create issues quickly from this doc, run (inside your repo) and paste each section’s body when prompted:
```bash
gh issue create --title "feat: Undo / Redo (history)"
gh issue create --title "feat: Multi-select & bulk actions"
gh issue create --title "feat: Snap grid & smart guides"
gh issue create --title "feat: Span-resize in Grid mode (parity with Flexible grid)"
gh issue create --title "feat: Lock / Hide per tile"
gh issue create --title "feat: Replace image in place"
gh issue create --title "feat: Branding presets (header layouts)"
gh issue create --title "feat: Export presets (1×/2×/3×, transparent PNG, multi-page PDF)"
gh issue create --title "feat: Canvas-based exporter (reduce html-to-image flakiness)"
gh issue create --title "feat: Project save/load format (.mlmboard)"
gh issue create --title "feat: Autosave & recovery"
gh issue create --title "feat: Templates library (IG, A4/A3, 16:9, Pinterest)"
gh issue create --title "feat: Asset panel (thumbnails, recent, drag-to-place)"
gh issue create --title "perf: Virtualized rendering for large boards"
gh issue create --title "feat: Palette extraction & background suggestions"
gh issue create --title "refactor: Extract core board logic to a reusable module"
gh issue create --title "test: Playwright end-to-end tests"
gh issue create --title "ci: GitHub Actions: Pages deploy + Tauri release on tags"
gh issue create --title "ux: Remove or rethink “Rows (visual)” control"
```
