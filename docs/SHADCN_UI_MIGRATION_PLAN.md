# FinOps student portal: shadcn/ui migration plan

Date: 28 October 2026  
Status: Proposed implementation plan; no packages installed or UI migrated by this document.  
Project root: `C:\Users\HP\Documents\finops-main\finops-main`

## 1. Objective and recommendation

Convert the student portal to a consistent, compact design built with shadcn/ui components. Keep the recent library → classroom → lesson flow, the FinOps logo, existing URLs, and the learning, submission, authentication, and protected media behavior.

Start with the learning library and classroom as a pilot. Establish reusable styles there before converting the remaining student pages. Extend the same system to admin and public pages only after the student pilot is verified.

shadcn/ui supplies component source that becomes part of this repository. It is not an automatic page converter or a complete product design. We still need to define hierarchy, spacing, content presentation, interaction states, and application behavior. Its official setup supports adding it to an existing Next.js project. [Official Next.js installation](https://ui.shadcn.com/docs/installation/next).

## 2. Findings from this repository

| Area | Current state | Migration implication |
| --- | --- | --- |
| Framework | `next` declared as `^15.5.18`, React as `^19.2.6` | Keep the current framework during the UI migration; verify installed versions and lockfile before setup. |
| Styling | Tailwind CSS 4; `app/globals.css` imports `tailwindcss` | Follow Tailwind 4 setup; inspect the existing Tailwind config before changing it. |
| UI foundation | No `components.json` or `components/ui` directory found | Initialize shadcn/ui in the existing project. |
| Imports | `@/*` maps to the project root | Reuse the current alias for generated components. |
| Icons | `lucide-react` already installed | Reuse it; avoid introducing another icon library. |
| Theme | Custom brand, public, and dashboard variables in global CSS | Introduce semantic tokens with a compatibility layer. |
| CSS overrides | `.portal-content .dash-page` and student text overrides affect descendant styles | Remove overrides incrementally; avoid globally replacing existing theme variables. |
| Portal shell | `components/PortalShell.tsx` serves both student and admin | Student shell changes must not unexpectedly alter admin behavior. |
| Classroom | `BatchClassroomView`, `BatchLibraryCard`, and `StudentLearningLibrary` already separate the main views | Convert these components instead of rebuilding the navigation flow. |
| Dashboard | Continue learning, next class, and upcoming work already exist | Refine their presentation and states; do not duplicate those features. |
| Media | Protected MP4 and HLS players already exist | Update their surrounding layout first; preserve playback internals. |
| Verification | Existing Playwright scripts cover UI, classroom, loading, and video | Adapt selectors deliberately and preserve behavior assertions. |

These observations are a source review, not a measured production performance audit. A shadcn/ui migration alone will not make database queries or media delivery faster.

## 3. Scope boundaries

### Included in the recommended student migration

- Student shell, mobile navigation, shared header, and account actions.
- Dashboard, batch library, selected classroom, and lesson layout.
- Assignments, tests, notices, and faculty presentation.
- Schedule and individual meeting pages.
- Progress and certificates, messages, notifications, and internship applications.
- Shared loading, empty, error, validation, success, and disabled states.
- Responsive behavior, keyboard interaction, and visual regression checks.

### Separate follow-up work

- Admin pages and public marketing pages, beyond regression checks for shared CSS.
- New backend features, database redesign, authorization changes, or payment changes.
- Video encoding, storage infrastructure, offline viewing, or download permissions.
- New analytics, saved playback positions, lesson completion semantics, or messaging capabilities without supporting API data.
- A global theme switcher. The first release uses a consistent light portal with an intentional dark media viewing surface; retain a compatibility dark scope while individual legacy views are migrated.

## 4. Target appearance and density

The student portal should look like one application. Use a light neutral background, white surfaces, blue primary actions, restrained borders, and the existing logo. Use semantic status colors together with words or icons. Avoid decorative gradients and extra nested cards where a simple row is enough.

| Element | Target specification |
| --- | --- |
| Desktop sidebar | Approximately 240px, grouped links, visible active page |
| Top bar | One shared bar, approximately 56–64px; no second page header duplicating navigation |
| Page container | Centered, about 1200px maximum; 16px mobile and 24px desktop gutters |
| Page heading | 24–28px, semibold; one h1 per page |
| Section heading | 16–18px, semibold |
| Body / supporting text | 14px / 12–13px; readable contrast |
| Spacing | Consistent 4px scale; usually 12–16px within sections and 20–24px between them |
| Cards | 12px radius, subtle border, 16–20px padding |
| Lesson rows | About 72–88px for short titles; grow naturally for long titles |
| Interactive targets | Aim for 44px for touch actions; keep compact desktop controls accessible |
| Classroom header | Title and course metadata share a row when space permits; description stays collapsed |
| Classroom tabs | Approximately 44px tall; horizontally scrollable on narrow screens |
| Sticky offsets | Use shared header-height variables; avoid independent hardcoded offsets |

Treat these as layout targets, not fixed heights that clip text. Verify at 360px, 390px, 768px, 1280px, and 1440px, plus 200% text zoom.

## 5. shadcn/ui setup and theme strategy

### 5.1 Establish the foundation

1. Record the current Git status and preserve unrelated changes.
2. Read `AGENTS.md` and the installed Next.js guides relevant to implementation. If bundled guides are absent, use official documentation matching the installed version.
3. Inspect the lockfile, resolved framework versions, global CSS, PostCSS setup, and import alias.
4. Use the official `ui.shadcn.com` registry. Choose and record one primitive base supported by the CLI at implementation time, then use it consistently. Review its Link composition and controlled Tabs APIs before copying examples.
5. Initialize inside the existing project root. Do not scaffold another Next.js application.
6. Review every generated CSS and dependency change. Keep the existing logo, fonts, routes, and public-site styles.
7. Commit the selected setup and dependency lockfile together after validation.

Illustrative commands for the future implementation, not commands executed for this plan:

```powershell
Set-Location 'C:\Users\HP\Documents\finops-main\finops-main'
npx shadcn@latest init
npx shadcn@latest add button card badge input label separator skeleton alert
npx shadcn@latest add tabs sheet dropdown-menu tooltip collapsible progress
```

Confirm CLI options and component availability against current official documentation when implementing. Add Dialog, Select, Textarea, Table, Checkbox, and Pagination only where required. Keep the native date input for the pilot; add a calendar popover later only if it improves date selection. Avoid adding a large data-table or form stack just for visual consistency.

### 5.2 Token migration

Define semantic tokens for background, foreground, card, muted, primary, border, input, ring, destructive, and sidebar. Map these into Tailwind utilities using the generated Tailwind 4 setup. The official theme model supports semantic CSS variables. [Theming documentation](https://ui.shadcn.com/docs/theming).

- Audit the existing `--border` variable: it already has a global role and must not be overwritten blindly.
- Introduce portal-scoped theme values while maintaining legacy variables for untouched pages.
- Move each converted component from hardcoded `bg-[#...]`, `text-slate-*`, and custom border values to semantic classes.
- Make the player a deliberate dark scope, including controls, focus rings, and any portal-rendered popovers.
- Ensure dialogs and menus inherit the intended theme when rendered outside the component subtree.
- Remove an old CSS override only after its remaining consumers are identified and converted.
- Default controls should not need repeated `!important` fixes.

## 6. Component conversion map

| Existing UI | Target components | Behavior to retain |
| --- | --- | --- |
| Custom actions and links | Button variants with the selected base's supported link composition | Real links for navigation, buttons for actions; no nested interactive controls |
| Batch and dashboard cards | Card, Badge, Progress | Actual counts and progress only; whole-card links remain valid |
| Classroom section navigation | Controlled Tabs | `batch` and `tab` query parameters, browser history, keyboard navigation |
| About batch / extra resources | Collapsible | Optional content stays collapsed initially |
| Search and filters | Input, Label, Button or Select | Search scope is explained; category/date changes reset pagination |
| Loading UI | Skeleton and textual status | Independent section loading and stable layout |
| Errors | Alert and retry action | Auth failures remain distinct from empty results |
| Mobile navigation | Sheet; optionally Sidebar composition later | Focus containment, Escape, focus return, active route |
| User menu | Dropdown Menu | Existing account actions and sign-out semantics |
| Submission forms | Label, Input, Textarea, existing validation | Submission payloads, busy states, feedback, and draft retention |
| Assessment confirmations | Dialog where already required by behavior | No accidental start, duplicate submit, or loss of an active attempt |
| Learning playlist | Native list, Button, Badge; Scroll Area if needed | Protected viewer identity, selected asset, playback permission checks |
| Reports and admin-style lists | Table plus narrow-screen presentation | Important fields stay available without horizontal page overflow |

Keep generated primitives in `components/ui`. Keep product-specific components outside that folder. Avoid editing primitives to add batch IDs, API requests, or student business logic.

## 7. Page-by-page implementation

### A. Batch library: `/student/batches`

- Preserve searchable live classroom cards and a separate self-paced section.
- Standardize card title, course, status, dates, and action placement.
- Keep pending enrollments secondary and collapsed.
- Distinguish no enrollment, no search match, request failure, and loading.
- Do not fetch every classroom's S3 inventory on the overview page.

### B. Classroom: `/student/batches?batch=ID`

- Preserve the compact header and back link.
- Display only the selected classroom, including on direct entry and refresh.
- Convert section navigation to controlled Tabs whose value comes from the URL.
- Preserve the existing replace-history behavior for tab changes so Back can return to the library. Validate before changing any navigation semantics.
- Keep accessible tab/panel relationships and focus behavior.
- Unavailable or unauthorized IDs must show an explicit unavailable state, never another batch.
- Preserve focused recorded-course URLs through the `recorded` query parameter.

### C. Learning files and player

- Keep one library heading, small category controls, search, date filter, and compact file rows.
- Represent ready, processing, failed, and unavailable files distinctly.
- Open a video in the current player-and-playlist layout; mobile stacks the list below the video.
- Preserve Back to learning files, selected lesson indication, and reduced-motion support.
- Keep the existing metadata-only versus on-play media loading behavior; do not prefetch an entire recording.
- Do not replace `ProtectedVideoPlayer`, `S3VideoPlayer`, or HLS access/renewal code to achieve a visual migration.
- Preserve legacy resource fallback when isolated storage is disabled and the existing additional-resources entry point when storage is available.

### D. Assignments, tests, notices, and faculty

- Use clear titles, due dates, status badges, and one primary action per assessment row.
- Preserve submission validation, attachments, feedback, attempt rules, timing, and authorization.
- Avoid unmounting an in-progress assessment merely to show a different loading state. Warn about unsaved work only where actual draft-loss behavior requires it.
- Notices use readable text blocks with dates; faculty uses compact profile rows.
- Define honest empty states for each tab.

### E. Remaining student pages

| Page | Planned conversion |
| --- | --- |
| `/student` | Reuse existing Continue learning, next class, and work data; standardize Card, Progress, Badge, and Skeleton presentation. |
| `/student/meetings` | Compact upcoming/past session rows, readable dates/timezone, clear join/view actions, meaningful empty/error states. |
| `/student/meetings/[id]` | Consistent details header and joining state; preserve current meeting access. |
| `/student/report` | Consistent progress cards, report rows, and certificate actions; show only actual achievements. |
| `/student/chats` | Standardize conversation list, message area, composer, loading, and send errors; keep existing transport and message order. |
| `/student/notifications` | Compact readable rows, clear unread status, retained read actions. |
| `/student/internship-applications` | Consistent fields, validation, application status, submission busy/success/error states. |

## 8. Proposed file structure

```text
components.json                         # generated project configuration
components/ui/                          # installed shadcn primitives
lib/utils.ts                            # generated/shared class helper, if selected setup uses it
components/PortalShell.tsx              # shared shell; protect admin compatibility
components/BrandLogo.tsx                # retain existing asset and meaningful alt text
components/BatchLibraryCard.tsx         # Card/Badge/Progress composition
components/BatchClassroomView.tsx       # compact header and controlled Tabs
components/StudentLearningLibrary.tsx   # file browsing and selected-resource layout
components/student/                     # proposed extracted student presentation pieces
  ClassroomHeader.tsx
  LearningFileRow.tsx
  LessonPlaylist.tsx
  AssessmentRow.tsx
  StudentEmptyState.tsx
app/student/batches/page.tsx            # existing routes and workspace orchestration
app/student/...                         # convert page by page
app/globals.css                        # semantic tokens and transitional compatibility
scripts/test-classroom-ui.cjs           # retain navigation/playback coverage
scripts/test-ui-refresh.cjs             # shared/public/admin regression coverage
scripts/test-video-ui.ts                # protected segmented playback coverage
```

Extract components when they make behavior or reuse clearer. Do not split every JSX fragment into another file. Preserve stable component identity around players and active assessments.

## 9. Loading and speed work

Handle performance as a measured workstream alongside visual conversion:

1. Capture cold and warm load timings, API durations, request counts, response sizes, and route JavaScript for dashboard, library, classroom, and player.
2. Separate slow API/database responses from slow rendering and media startup.
3. Keep independent requests parallel and optional sections lazy; maintain cancellation on navigation.
4. Investigate duplicate fetching before adding a cache library. If authenticated caching is introduced, scope it by user and clear it on logout or account change.
5. Preserve storage processing polling only when needed, and avoid requests from unmounted views.
6. Load heavy viewers only when selected where compatible with existing protected playback.
7. Compare baseline and migrated results. Investigate a repeatable increase of more than 10% in route JavaScript or median timings rather than accepting it silently.

Measure LCP, INP, and CLS where feasible, but do not promise field scores based on fixture tests. Server/database fixes discovered during this work need separate estimates. Installing shadcn/ui is not itself a performance fix.

## 10. Delivery phases and estimates

Estimates assume one experienced developer, the current APIs remain usable, and no major new features. Hours include implementation and the stated validation. They are planning ranges, not a fixed delivery promise.

| Phase | Deliverable and completion gate | Hours |
| --- | --- | ---: |
| 0. Baseline | Reproduce or explain the current tab-navigation test timeout, inventory states, capture visual/performance baseline | 2–4 |
| 1. Foundation | shadcn setup, chosen primitive base, tokens, compatibility CSS, verified sample components | 4–6 |
| 2. Library/classroom pilot | Convert cards, header, tabs, file controls, lesson rows, and player surroundings; desktop/mobile checks | 6–10 |
| 3. Shell | Student navigation and mobile Sheet, user menu, sticky offset/focus checks; admin regression | 3–5 |
| 4. Assessments | Assignment/test presentation, form states, notices and faculty; no submission regressions | 4–7 |
| 5. Other student pages | Dashboard, schedule/details, reports, messages, notifications, internships | 8–14 |
| 6. Performance | Measurement, bounded request/render improvements, before/after record | 3–6 |
| 7. Final QA | Build, types, lint, accessibility, browser regression and supported session smoke checks | 4–6 |
| **Full student portal** | **All phases above** | **34–58** |

- **Classroom pilot only, including setup:** phases 0–2 plus 2–3 hours of final QA = **14–23 hours**, roughly 2–3 focused working days.
- **Full student portal:** **34–58 hours**, roughly 5–8 focused working days at 7–8 productive hours per day. Feedback and environment delays can extend calendar time.
- **Optional admin conversion:** preliminary additional **24–40 hours**, subject to a dedicated audit of the large admin workspace, forms, tables, and finance flows.
- **Optional public-site conversion:** preliminary additional **16–28 hours**, subject to a page/template inventory and marketing design review.
- **Entire project:** indicative **74–126 hours** combining those scopes; this is not a committed full-project quote before the additional audits.

The earlier 21–35 hour estimate described general visual polish. A real component-system migration adds setup, theme isolation, shared component conversion, and regression work, so this deeper estimate supersedes it. Likewise, the earlier 4–7 hour batch polish estimate did not include installing and integrating shadcn/ui.

Suggested sequence: baseline → foundation → classroom pilot → shell → assessments → remaining student pages → measured performance work → final QA. Review the pilot before applying its pattern everywhere; no need to wait for a full portal rewrite to see a usable result.

## 11. Verification and acceptance criteria

### Navigation and application behavior

- Library, selected batch, recorded-course, and `tab` deep links work on entry and refresh.
- Back/forward and tab selection behave consistently; unavailable IDs never select a different batch.
- Search, category, date filters, pagination, and storage-disabled fallback work.
- Assignment submission, validation, feedback, and test timing/attempt behavior remain intact.
- Session expiration and authorization failures do not expose protected content.

### Media

- MP4 and HLS playback, pause, seeking, playlist switching, and fullscreen still work.
- Protected grants, renewal, watermarking, and denial handling retain their current behavior.
- Browsing does not eagerly download full recordings.
- Player tests account for `preload="none"`: start MP4 playback before expecting duration metadata.

### Visual and accessibility

- No horizontal page overflow at the target widths; scrollable tabs remain reachable.
- Long titles, zero counts, missing descriptions, and large lists render sensibly.
- One h1, labelled inputs, visible focus, descriptive icon actions, and readable contrast.
- Tabs support arrows and Home/End; dialogs/Sheet support Escape and focus return.
- Sticky header and tabs do not cover focused content, including after opening a lesson.
- Loading, empty, error, and disabled states are visually distinct and readable.
- No public/admin style regression from shared theme changes.

### Engineering checks

```powershell
npx tsc --noEmit --incremental false
npx eslint <changed-source-files>
npm run build
git diff --check
```

Run the existing classroom, broader UI, loading, and video scripts against an isolated local build. Check each script's actual base-URL configuration; do not assume every script uses the same port. Use synthetic accounts/API fixtures for repeatable checks and an authorized real session for private-data smoke testing when available.

The latest compact-layout browser run timed out waiting for the Assignments tab URL on the development server. Earlier isolated production classroom/video suites passed. This does not establish the root cause: phase 0 must distinguish a navigation defect from test timing or development-server behavior before accepting a new baseline. Prefer waiting for URL commitment and visible panel state over relying only on a document `load` event for client-side transitions.

## 12. Risks and mitigation

| Risk | Mitigation |
| --- | --- |
| Global variables or descendant overrides break other pages | Scoped token migration and public/admin screenshots at each shared-style change |
| Generated components overwrite custom code | Review generator diffs and preserve product logic outside primitives |
| Mixing primitive bases creates inconsistent APIs | Choose one base during setup; use matching official component documentation |
| Tab conversion changes history or focus | Controlled URL state and dedicated keyboard/back/refresh checks |
| Remount loses playback or assessment state | Stable keys and component boundaries; verify before/after interactions |
| Private data leaks through shared caching | Avoid global unauthenticated cache keys; isolate and clear user state |
| New dependencies increase initial JavaScript | Install only used components; measure route bundles |
| UI promises unsupported features | Display only fields and progress supported by existing data |

## 13. Rollout and completion

Deliver small, reviewable changes: foundation, classroom pilot, shell, assessments, remaining pages, then final cleanup. Keep old styles available until their last consumers are migrated. Revert a specific migration change if it regresses a critical flow; avoid bundling backend or database changes with the UI rollout.

Completion means the agreed student pages use the same tokens and components, critical behavior checks pass, no unexplained baseline failures remain, protected content still behaves correctly, and updated desktop/mobile screenshots plus a short validation report are available. This plan does not authorize publishing or deploying a new release.

## 14. Official implementation references

- [Next.js installation for an existing project](https://ui.shadcn.com/docs/installation/next)
- [Semantic theme variables](https://ui.shadcn.com/docs/theming)
- [Available components](https://ui.shadcn.com/docs/components)
- [Sidebar composition](https://ui.shadcn.com/docs/components/sidebar)

The concrete layout, migration order, risk assessment, and estimates above are recommendations based on this repository; they are not promises made by the component library.
