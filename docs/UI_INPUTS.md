# UI Inputs (Iterative)

## Critical Rule
**Claude must NOT wait for UI approval. Build the baseline UI immediately, then iterate when screenshots or Figma arrive.**

---

## How UI Will Be Provided
- Figma (when available)
- Screenshots pasted into chat (most common)
- Written instructions (spacing, layout, component choices)

UI specs are NOT fully known at start. Build a clean baseline and iterate.

---

## Build Approach
- Use shadcn/ui + Tailwind as the component foundation
- Keep layout modular — sections and components should be swappable
- Avoid pixel-perfect hard-coding until visuals are provided
- Prioritize recruiter readability: clean typography, good whitespace, clear hierarchy

---

## Default Baseline Pages

### Public: `/`
Sections (top to bottom):
1. **Hero** — name, positioning statement, primary CTA
2. **Proof cards** — ClipNET, StudySpring, MyHeadSpace (3 cards)
3. **Activity widget** — last 3 public_activity items + "Last active: X ago" + subtle realtime indicator
4. **Projects list** — lower/scroll section, portfolio projects
5. **Experience timeline**
6. **Contact**

### Public: `/now`
- Longer activity history (load more)
- List of `public_activity` items, ordered newest first
- Each item: action message + relative timestamp

### Public: `/chat` (or embedded on `/`)
- Recruiter Agent chat UI
- Input field + send button
- Message thread showing question + answer + sources
- Quota indicator (remaining prompts today)
- Google sign-in prompt for anonymous users nearing limit

### Private: `/myheadspace` — MyHeadSpace v2
- 3-column layout:
  - Publicly VIEWABLE — anyone can visit and browse the workspace (glass wall approach)
  - Unauthorized users who attempt mutations see a toast: "This workspace is Gilvin's private area — only he can make changes."
  - Do NOT redirect unauthorized users — visibility is intentional for recruiters
  - Has its own distinct nav/header showing "MyHeadSpace" branding
  - 3-column layout:
  - **Left sidebar** (`~240px`): MyHeadSpace logo/title, categories list with project counts, "+ New Category" button at bottom
  - **Middle column** (`flex-1`): selected project title, task list (checkbox + title + timestamp), "+ New Task" button
  - **Right panel** (`~320px`): "Notes" heading, selected task name, textarea for note body, Save button in purple

---

## What Claude Should Ask For (Only When Blocked)
- Which screenshot maps to which section or page
- Any must-keep colors or fonts if visible in a design
