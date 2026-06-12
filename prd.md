**Product Requirements Document (PRD)**

Operational Test Timeline & Dependency Management Platform

_Version 15 - Phases 1–8 Implemented (Architecture, Auth & RBAC, Project Topologies + Workspace Shell + Membership, Document Ingestion, Polymorphic Commenting, Activity-Logging Foundation, Task Core Lifecycle + Temporal Logic + Domain Event Bus + Dependencies, UI Design System + Gantt State Engine, Schedule Rules Engine). Phase 8 delivered automatic push-only date propagation along finish-to-start dependencies with a dry-run/confirm protocol, the target 3-lock model (independent start/end/duration locks, max two of three — replacing `is_date_locked`), engine-derived parent roll-up envelopes, hierarchy-aware cycle detection, and derived schedule-conflict surfacing (red dashed dependency lines + warning badges). Phase 9 (Timeline Quick Authoring & On-Chart Dependency Editing) is specified below — see the "Phase 9 Specification" section._

# Overview

The Operational Test Timeline & Dependency Management Platform is a web-based project planning and visualization application designed to support complex operational test and evaluation (OT&E) activities. The system provides hierarchical Gantt chart planning, dependency management, task accountability, and schedule traceability tailored to operational test workflows.

The platform is intended to replace generic project planning tools with a purpose-built system optimized for:

- Operational test campaigns
- Multi-organization coordination
- Dependency-heavy schedules
- Leadership reporting
- What-if schedule analysis
- Long-duration, evolving programs

The system emphasizes:

- Hierarchical planning
- Dependency propagation
- Traceability of schedule changes
- Role-based collaboration
- Rapid visualization for presentations and reviews

# Goals

## Primary Goals

- Allow users to build and manage complex Gantt timelines.
- Support hierarchical drill-down into task groups and subtasks.
- Capture dependency relationships and visualize them (with automatic recalculation as a later enhancement).
- Provide accountability and traceability for task ownership and schedule changes.
- Support operational test workflows with workday-aware scheduling.
- Provide presentation-ready timeline visualization and export capability.

# Non-Goals (Version 1)

The following are explicitly out of scope for Version 1:

- Automatic cascading schedule propagation (dependencies are defined and visualized, but dates are manual in V1)
- Formal approval workflow for schedule changes
- Resource leveling algorithms
- Automatic manpower optimization
- Real-time collaborative editing
- Financial budgeting
- Critical path optimization engines
- AI-assisted scheduling
- Native desktop/mobile applications
- Cross-project scenario branching (planned future enhancement)
- User-facing notification delivery layer (email / in-app alert center / SMS) - event dispatch is in scope, delivery is deferred

# Target Users

## Primary Users

- Operational test planners
- Test directors
- Program managers
- Mission planners
- Squadron leadership

## Secondary Users

- External stakeholders
- Data analysts
- Supporting organizations
- View-only leadership audiences

# User Roles

Roles are scoped per project. The single **owner** is stored as `owner_id` on the `projects` table (one owner per project, enforced by the column). Invited members are stored on the `project_user` pivot with a role of **admin**, **editor**, or **viewer**; the owner is also mirrored into the pivot with the `owner` role so member and accessible-project queries stay single-table (`owner_id` remains the authoritative source of ownership). A user may be an owner of one project and a viewer of another. There is no global/system admin tier in V1 — `admin` is a per-project role.

## Owner

The user who creates a project owns it. The owner can:

- Create and manage the project
- Invite and remove members and set their roles (admin/editor/viewer)
- Create templates
- Configure work schedules and holidays
- Modify all tasks and metadata
- Configure project and field classification markings
- Export reports
- Delete/archive the project (owner only)

## Admin

A project administrator with full operational control short of deleting the project. Can:

- Everything an editor can do
- Invite and remove members and set their roles (admin/editor/viewer)
- Configure project settings, calendars, and classification

Cannot:

- Delete the project (owner only)

## Editor

Can:

- Create and modify tasks
- Add comments and attachments
- Update task status
- Modify dependencies
- View changelog history

Cannot:

- Manage project membership or roles
- Configure project settings, calendars, or classification

## Viewer

Can:

- View projects
- Drill into tasks
- Export snapshots/screenshots
- View comments and attachments

Cannot:

- Modify project data

# Technical Stack

## Backend

- PHP
- Laravel Framework
- Laravel Fortify (authentication)
- Laravel Inertia (backend/frontend glue - the application is not a REST API; controllers pass props directly to React pages)
- Spatie Laravel Activity Log (audit / changelog)
- Laravel Wayfinder (build-time TypeScript type generation)
- Pest PHP (testing + architecture conformance tests)

## Frontend

- React
- TypeScript
- Tailwind CSS
- Laravel Inertia
- Zustand (Gantt viewport state store)

## Database

- MySQL or PostgreSQL

# Core Features

## 1\. Project Management

Users can:

- Create projects
- Edit project metadata
- Archive projects
- Save projects as templates

### Project Metadata

Each project contains:

- Name
- Description
- Start date
- End date
- Organizations involved (descriptive tags, not tenancy)
- Project owner (the creating user)
- Status
- Project classification marking (baseline classification for all underlying data)

## 2\. Hierarchical Task Structure

The system shall support:

- Task groups
- Parent/child tasks
- Nested subtasks up to a maximum depth of five (5) levels
- **\[V1 DECISION\]** Hierarchy depth is capped at five levels for Version 1 to keep the dependency propagation algorithm tractable and the visualization legible.

Example hierarchy:

- Aircraft
  - Sensor Integration
    - EO Calibration
    - SAR Verification
- Ground Segment
- Data Link

Users must be able to:

- Expand/collapse hierarchy
- Drill into subtasks
- View rolled-up schedules

## 3\. Gantt Chart Visualization

The application shall provide:

- Interactive Gantt timeline
- Zoom levels: day, month, quarter, and year
- Horizontal scrolling
- Dependency visualization lines
- Drag-and-drop timeline adjustments
- Expand/collapse task hierarchy

- **\[PHASE 9\]** The timeline becomes a primary authoring surface: a keyboard-driven row selection model, name-only quick task/subtask creation via an inline draft row with smart defaults, inline rename, and pointer-anchored custom context menus (FR-18 – FR-20, FR-22). See "Phase 9 Specification".

### Zoom-Adaptive Level of Detail

- **\[V1 DECISION\]** The Gantt chart shall behave like a slippy web map (e.g., Google Maps): the level of detail adapts to the zoom level. As the user zooms out, lower-level subtasks progressively fold/hide so only higher-level parent tasks remain visible. As the user zooms in, subtasks and additional details progressively reappear.

### Temporal Resolution

- **\[V1 DECISION\]** All scheduling is at day-grain resolution. Tasks have a start date and end date expressed in whole days; the system does not model hours, minutes, or seconds. Durations are expressed in days.

### Visual Indicators

Tasks may display:

- Risk level
- Status
- Assigned organization
- Dependency status
- Schedule slippage
- Manual-lock indicator (when start, end, or duration is pinned)

## 4\. Dependency Management

### Supported Dependency Type

Version 1 supports finish-to-start dependencies, including multiple predecessors per task. Dependencies can be defined and visualized in V1; automatic schedule propagation is deferred (see below).

### Multi-Dependency Support

Tasks may depend on multiple predecessor tasks. When automatic propagation is later enabled, a task with multiple predecessors will be scheduled to start after the latest predecessor finishes.

### Schedule Propagation - Deferred to a Later Phase

- **\[V1 DECISION\]** Decision: automatic cascading schedule propagation is NOT in the V1 MVP. In V1, task dates are entered and adjusted manually; defining a dependency records the relationship and draws it on the Gantt, but changing a predecessor does not automatically move dependents. This keeps the MVP free of the cascading-scheduling complexity while still capturing the dependency graph.
- **\[V1 DECISION\]** Data model: tasks carry an is_date_locked boolean that defaults to TRUE in V1, protecting manually entered dates. The richer model (independent start/end/duration locks and propagation that treats locked fields as fixed constraints) is specified below as the target design for the phase when propagation is implemented.

### Circular Dependency Handling (applies when propagation lands)

- **\[V1 DECISION\]** When automatic propagation is implemented, the system shall detect circular dependencies and raise an error to the user. The user resolves the cycle by removing the offending dependency or by pinning a task with a manual date lock, which removes it from propagation and breaks the cycle. In V1, because dates are manual, cycles do not affect scheduling but the system may still warn when one is created.

### Target Locking Model (future propagation phase)

- **\[V1 DECISION\]** When propagation is added, the single is_date_locked boolean is intended to be replaced by independent locks on start date, end date, and duration. A maximum of two of the three may be explicitly locked (locking both start and end derives a locked duration). Locks apply only to time fields; all other task data remains live-editable. Until then, is_date_locked governs manual date protection.

### Dependency Visualization

Dependencies shall be displayed graphically on the Gantt chart in V1, independent of whether propagation is active.

- **\[PHASE 9\]** Dependencies become creatable and removable directly on the Gantt: drag from a bar's finish-side handle to a target task (or a context-menu link mode), and remove via a clickable connector or the task context menu, reusing the Phase 8 dry-run/confirm protocol unchanged (FR-21). See "Phase 9 Specification".

## 5\. Workday-Aware Scheduling

The system shall:

- Support workday durations
- Exclude weekends
- Exclude configurable holidays

### Default Calendar

The application shall ship with a standard weekend configuration and common public holidays (region configurable).

### Custom Calendars

Admins may:

- Add/remove holidays
- Configure working days
- Configure organization-specific schedules

## 6\. Task Metadata

Each task shall support:

### Core Fields

- Name
- Description
- Start date
- End date
- Duration
- Status
- Percent complete

### Organizational Fields

- Assigned organization
- Assigned team
- Assigned individual(s)

### Classification Fields

- **\[V1 DECISION\]** Each task, description, and input field shall support its own per-field classification marking, constrained by the project's baseline classification. Data tagged to a different program than the project's marking cannot be added to the project.

### Risk Level

- Low
- Medium
- High

### Tracking Fields

- Tags
- Dependencies
- Watchers/followers
- Manual lock flags (start / end / duration)

## 7\. Task Detail View

Each task shall have a dedicated detail panel/page with:

- Full task metadata
- Dependency list
- Assigned personnel
- Change history
- Comments
- Attachments
- Classification marking and lock status

## 8\. Comments & Collaboration

Tasks shall support chronological comments, status updates, and discussion threads.

### Attachments

Users may upload PDFs, images, documents, and spreadsheets.

## 9\. Change Tracking & Audit Log

The system shall maintain an append-only changelog for schedule modifications, implemented using the Spatie Laravel Activity Log package.

- **\[V1 DECISION\]** The changelog is append-only: every change, deletion, and archive action is recorded permanently and log entries can never be edited or removed. The underlying task and project data remains mutable; immutability applies to the audit trail, not to the data itself.

### Tracked Changes

- Start date changes
- End date changes
- Duration changes
- Dependency changes
- Ownership changes
- Lock/unlock actions

### Change Metadata

Each log entry records:

- User
- Timestamp
- Previous value
- New value
- Optional reason/comment

## 10\. Concurrency Handling

- **\[V1 DECISION\]** Version 1 does not implement real-time collaborative editing or application-level record locking. Concurrent edit conflicts are handled at the database layer: if two users edit the same record concurrently, the system throws an exception and warns the affected user that their changes were not saved because someone else had the record open. More sophisticated optimistic locking is deferred to a future version.

## 11\. Notifications (Event Foundation in V1; Delivery Deferred)

The platform defines a notification model with a notification inbox, assignment alerts, task update alerts, and mention/ping notifications. However, the user-facing DELIVERY layer (email, in-app alert center, SMS) is deferred to a later phase. In Version 1 the system fires the underlying domain events (see Architecture section A10) so no core logic must change when delivery is added later.

- **\[V1 DECISION\]** Clarification: the original draft listed notifications as a fully delivered V1 feature. The refined approach separates the event (the recorded fact that something happened) from the notification (delivery to a human). V1 dispatches and logs events; human-facing delivery channels are a future phase.
- **\[PHASE 3 UPDATE\]** Exception — **project invitation email is delivered now.** Inviting a member queues a `ProjectInvitationMail` (Laravel Mailable) containing a tokenized accept link. This is a deliberate, narrowly-scoped delivery channel required for the membership flow to function for not-yet-registered invitees; it does not constitute the broader notification engine (per-user preferences, batching/throttling, inbox/alert center, SMS), which remains deferred. Invitations are also surfaced in-app on the Projects index for already-registered invitees.

### Trigger Events

The following events are dispatched on the event bus and will drive notifications once the delivery layer is built:

- Assigned to a task
- Watched task changes
- User is mentioned
- Dependency changes impact owned task

## 12\. Templates

Users shall be able to save projects as templates and create projects from templates. Templates preserve task hierarchy, dependencies, metadata structure, and organizational assignments.

## 13\. Exporting & Reporting

### Screenshot Export

- **\[V1 DECISION\]** The primary export mechanism for Version 1 is a screenshot of the current Gantt view as the user has configured it. The user sets the desired zoom level and level of detail, then exports/captures that view for downstream use in briefings and presentations. Full paginated PDF rendering of arbitrarily long timelines is not a Version 1 priority.
- **\[V1 DECISION\]** Decision: exports show the timeline only. Comments and attachments are NOT embedded in exports - leadership briefings want a clean timeline.

### Future Export Enhancements

Potential future exports: CSV, JSON, PDF, and PowerPoint-ready formats.

## 14\. Schedule Baselines & Comparison

- **\[V1 DECISION\]** Decision: baseline comparison is IN scope for V1, supporting the "traceable schedule history" success metric. Users can capture a named baseline (a snapshot of the schedule at a point in time) and compare the current schedule against any saved baseline to see how dates have shifted.

Capabilities:

- Capture one or more named baselines per project
- Compare current schedule vs. a selected baseline
- Surface per-task slippage (movement of start/end relative to baseline)
- Visualize baseline vs. current on the Gantt where practical

## 15\. Future Enhancements

### Automatic Schedule Propagation

Cascading finish-to-start propagation - where moving a predecessor automatically shifts dependents, treating locked fields as fixed constraints, with circular-dependency detection - is the headline post-MVP enhancement (see the dependency section for the target model).

### Scenario Forking / What-If Analysis

Future versions may support project cloning, branching schedules, and alternative scenario modeling.

### Potential Future Features

- Automatic cascading schedule propagation with selective per-field locking
- Formal approval workflow for schedule changes
- AI schedule recommendations
- Critical path analysis
- Resource optimization
- Live collaboration
- Multi-project dashboards
- Multiple simultaneous calendars per project
- Dependency lag/lead

# Functional Requirements

**FR-1.** Users shall be able to create projects.

**FR-2.** Users shall be able to create hierarchical tasks up to five levels deep.

**FR-3.** Users shall be able to define finish-to-start dependencies between tasks, including multiple predecessors, and see them visualized.

**FR-4.** In V1, task dates are set manually; defining a dependency does not move dependent dates. Automatic schedule propagation is deferred to a later phase, at which point it shall treat locked fields as fixed constraints.

**FR-5.** The system shall support workday-aware durations at day-grain resolution.

**FR-6.** When automatic propagation is implemented, the system shall detect circular dependencies and require the user to resolve them via removal or manual locking. In V1 the system may warn when a cycle is created.

**FR-7.** Tasks carry an is_date_locked flag (default true) protecting manual dates in V1. The target model replaces it with independent locks on up to two of {start date, end date, duration} when propagation lands.

**FR-8.** Users shall be able to export the current Gantt view as a screenshot, showing the timeline only (no embedded comments or attachments).

**FR-9.** The system shall maintain an append-only schedule changelog via Spatie Laravel Activity Log.

**FR-10.** Users shall be able to assign tasks to organizations (as descriptive tags), teams, and individuals.

**FR-11.** Users shall be able to attach files and comments to tasks.

**FR-12.** The system shall dispatch domain events for assignment, watched-task, mention, and dependency-impact occurrences. User-facing notification delivery (email/in-app/SMS) is deferred to a future phase, **except project invitation email, which is delivered as of Phase 3** (a tokenized accept link sent to invitees).

**FR-13.** The system shall support a per-project baseline classification and per-field classification markings, preventing cross-program data contamination.

**FR-14.** The system shall handle concurrent edit conflicts at the database layer and warn the user when a save is rejected.

**FR-15.** The Gantt chart shall adapt displayed level of detail to the current zoom level, folding subtasks when zoomed out.

**FR-16.** A project is owned by its creating user, who may invite other users as editors or viewers; access is scoped to project membership.

**FR-17.** Users shall be able to capture schedule baselines (snapshots) and compare the current schedule against a saved baseline.

**FR-18.** The Gantt timeline shall support a keyboard-driven row selection model (click or arrow-key navigation, visible highlight) with hotkeys for creating, renaming, opening, and deleting tasks.

**FR-19.** Users shall be able to create tasks and subtasks from the timeline by name alone via an inline draft row; all other fields receive smart defaults (context-anchored start date, 1 work-day duration) so every quick task immediately renders a bar. Enter chains the next draft for rapid scaffolding.

**FR-20.** Users shall be able to rename a task inline from the timeline without opening the task detail page.

**FR-21.** Users shall be able to create finish-to-start dependencies directly on the timeline (drag from a bar's finish-side handle to a target task, or a context-menu link mode) and remove them (click a connector, or via the task context menu), with the Phase 8 dry-run/confirm protocol surfacing cascade conflicts unchanged.

**FR-22.** The timeline shall provide custom context menus (replacing the native menu) on task rows/bars, empty chart space, and dependency connectors, scoped to the user's role.

# Non-Functional Requirements

## Performance & Scale

- **\[V1 DECISION\]** Version 1 targets projects of fewer than one thousand (1,000) total tasks (top-level plus drill-down combined) and a maximum hierarchy depth of five levels.
- Gantt interactions should remain responsive at the V1 target scale.
- Timeline recalculation should complete within a few seconds for typical projects.

## Security

- Role-based access control
- Secure authentication via Laravel Fortify
- Per-project and per-field classification enforcement

## Availability

Web-based availability across modern browsers.

## Usability

Optimized for rapid schedule review during meetings and briefings.

# Assumptions

- Users are familiar with operational planning concepts.
- Projects may span months or years.
- Most dependencies are finish-to-start.
- Users primarily interact through desktop browsers.
- Version 1 operates at the unclassified level, but the data model supports higher classifications at the project and field level.

# Resolved Decisions

The following questions have been resolved for Version 1:

**Isolation & ownership:** Organization is dropped as a tenancy entity. The Project is the isolation boundary, owned by its creating user who invites editors/viewers. "Organization" remains only as a descriptive task tag.

**Schedule propagation:** Deferred. V1 uses manual dates with is_date_locked defaulting to true; dependencies are defined and visualized but do not auto-shift dependents. Propagation (with selective locking and cycle detection) is the headline post-MVP enhancement.

**Exports:** Timeline only - no embedded comments or attachments. Screenshot of the configured Gantt view is the V1 mechanism; PDF is deprioritized.

**Approval workflow:** No formal approval workflow in V1; recorded as a future enhancement.

**Baselines:** In scope for V1 - users can capture named baselines and compare current schedule against them.

**Audit log immutability:** The changelog is append-only (immutable entries) while data remains mutable; implemented with Spatie Laravel Activity Log.

**Concurrency:** Handled at the database layer for V1, with a user-facing warning on rejected saves.

**Temporal resolution:** Day-grain only; zoom levels day / month / quarter / year.

**Zoom behavior:** Slippy-map-style level-of-detail folding of subtasks based on zoom; deterministic Zustand store with row virtualization.

**Scale:** Under 1,000 tasks, max depth 5 for V1.

**Classification:** Per-project baseline marking plus per-field markings; cross-program data blocked.

**Backend glue:** Laravel Inertia, not REST. Morph maps, FormRequests, and API Resource classes enforced as conventions.

# Remaining Open Questions

All previously flagged open issues have been resolved. No outstanding product questions remain for Version 1 scope.

# Success Metrics

The platform is successful if users can:

- Build operational test schedules faster than with generic tools
- Clearly visualize dependencies and impacts
- Rapidly brief timelines to leadership
- Maintain traceable schedule history
- Coordinate across organizations efficiently

# Architecture & Engineering Specification

This section captures system architecture, data isolation, type safety, testing, and build sequencing. These are implementation-level decisions that complement the product requirements above. Items are marked \[ARCHITECTURE\] to distinguish engineering direction from product requirements.

## A1. Data Isolation & Ownership

- **\[ARCHITECTURE\]** The Project is the top-level data-isolation boundary. There is no Organization tenancy layer. Every query fetching tasks, documents, or files must scope through an active project the requesting user has access to. No cross-project leakage and no orphaned records.
- **\[ARCHITECTURE\]** Ownership and membership: a Project is owned by the User who created it. The owner invites other users to the project, each granted a role (editor or viewer). Users access only the projects they own or have been invited to. Project membership and roles are held on a project_user pivot table.
- **\[ARCHITECTURE\]** Access scoping is enforced at the middleware/policy layer; requests for projects the user is not a member of are blocked.
- **\[V1 DECISION\]** Decision: Organization is removed as a hard tenancy entity. "Organization" survives only as a descriptive label on tasks (e.g., the squadron, unit, or contractor responsible for a task), not as an isolation boundary or an owning account. Multi-organization coordination happens through per-project invitation and organization tags on tasks, not through a tenancy wall.

## A2. Role-Based Access Control (RBAC)

- **\[ARCHITECTURE\]** Roles (owner, editor, viewer) are scoped per project on the project_user pivot, not globally. The project owner has full administrative control of that project (settings, calendars, classification, membership). Editors and viewers behave as defined in the User Roles section above. This aligns the project-level RBAC with the product role model.

## A3. End-to-End Type Safety

- **\[ARCHITECTURE\]** Use Laravel Wayfinder to inspect Eloquent models, relations, and FormRequests at build time and emit native TypeScript definitions (.d.ts) into the React client source. A column type change in a migration must break the frontend build immediately, eliminating drift between backend and frontend contracts.

## A4. Domain Data Model

Core relational nodes:

- User - system operator; owns projects they create and joins others via the project_user pivot.
- Project - the top-level isolation boundary and workspace; owned by a user via an `owner_id` foreign key (single owner per project); contains tasks, documents, and teams. Also carries the row-level classification scaffold (see Implementation Status).
- ProjectUser (pivot) - project_id, user_id, and a role column for project-level RBAC. Invited members hold `admin` / `editor` / `viewer`; the owner is mirrored here with `owner` while `projects.owner_id` stays authoritative.
- Document - project artifacts, telemetry logs, evaluation criteria; belongs to a Project.
- Comment - polymorphic node (commentable_id / commentable_type) attachable to either a Document or a Task.
- Task - recursive, self-referencing via parent_id, nested up to five levels.

## A5. Task Temporal Model

- **\[ARCHITECTURE\]** Day-grain scheduling is implemented as end_date = start_date + duration_days, where duration is an integer scalar in days. This matches the product decision that all scheduling is at whole-day resolution with no hour/minute/second granularity.
- **\[ARCHITECTURE\]** Tasks carry an is_date_locked boolean and a hierarchy_level integer (valid values 1-5) plus a sort_order for sibling ordering.
- **\[V1 DECISION\]** Decision: V1 ships with manual dates and is_date_locked defaulting to TRUE - there is no cascading propagation in the MVP. The richer model (independent start/end/duration locks, propagation treating locked fields as fixed constraints) is the documented target for the later propagation phase, not a V1 requirement. This keeps the MVP simple and is reflected in the dependency section and FR-4 / FR-6 / FR-7.

## A6. Automated Conformity Enforcement

- **\[ARCHITECTURE\]** Architectural invariants are enforced programmatically with Pest PHP architecture tests, run locally and in CI/CD, that break the build on structural drift. Enforced rules include: FormRequests live only in App\\Http\\Requests and are used only by controllers; request classes carry the Request suffix; and controllers may use only an explicit allowlist of layers (FormRequests, API Resources, Models, Mailables, `Illuminate\\Http`, the `DB`/`Mail` facades, `Inertia`, `AuthorizesRequests`, and the `redirect` helper). **\[PHASE 3 UPDATE\]** The original wording allowed a `Services` layer and forbade the DB facade; both are obsolete — there is no service layer (C5) and the DB-facade prohibition was removed.

## A7. Document Ingestion

- **\[ARCHITECTURE\]** Multi-MIME file upload controllers are bound strictly to project contexts, with an abstracted storage target layer (local disk vs. cloud object storage) and automated indexing of metadata paths plus user audit trails.

## A8. Operational Security / Network Handling

- **\[ARCHITECTURE\]** Data and communication regarding operational test incidents may occur on unclassified networks only where technical directives, security classification guides, and the specific data parameters explicitly permit it. Where they do not, strict system-isolation handling applies. This reinforces the per-project and per-field classification model defined above.

## A9. UI Design System

- **\[ARCHITECTURE\]** Aesthetic: clean, high-end engineered technical-documentation style (reminiscent of Laravel Docs or an engineering computation pad) - sharp corners, no soft or bouncy borders, strict grid-block structural section lines. Standardize global button variants (sizes and states), an absolute typography sizing scale, and responsive main-layout wrappers before building complex client-side tracking code.

## A10. System Events & Notification Deferral

- **\[ARCHITECTURE\]** Modules are decoupled via a strict publish/subscribe model on Laravel's native event system. When an action occurs (file uploaded, task date modified, etc.), the controller or service never directly calls a communication layer. It dispatches an asynchronous internal domain event and continues.
- **\[ARCHITECTURE\]** Events are deliberately thin: they carry only the affected Eloquent model. Example - a TaskUpdated event constructed with the public Task model, using SerializesModels for queue safety. Companion events include TaskCreated.
- **\[ARCHITECTURE\]** V1 listeners handle internal concerns only: activity logging and audit tracking (via Spatie Activity Log), telemetry, and Wayfinder type sync. The user-facing notification delivery layer (email outbox, in-app alert center, SMS) is registered as separate listeners in a later phase, with no change to core Task or Document logic.

Deferral rationale - notification engines hide significant structural complexity that would balloon the MVP:

- Per-user notification preferences (e.g., email for Level 1 tasks, in-app only for Level 3 subtasks).
- Batching and throttling (avoiding 50 separate emails on a bulk project update).
- Queue configuration, retries, and failed-delivery state handling.
- **\[ARCHITECTURE\]** By separating the event (the historical fact that something happened) from the notification (delivery to a human), core workflows can ship now while delivery listeners are added later without touching dispatch sites.
- **\[PHASE 3 UPDATE\]** The generic event-bus/listener foundation has not yet been built (no `TaskCreated`/`TaskUpdated` events exist until Phase 6). The one delivery channel live today — project invitation email — is dispatched directly (`Mail::to(...)->queue(...)` from the invitation controller). When the event foundation lands, this can move behind a listener without changing the invite call site. Note also that the **service-layer assumption in A10's first bullet is superseded** — see "Backend Coding Conventions" C5: there is no service layer; controllers orchestrate, and domain behavior lives on rich models.

## A11. Frontend Gantt State Machine

The Gantt chart is the most complex component of the interface - a dense data grid tracking five levels of hierarchical nesting, variable zoom scopes, and per-user layout preferences simultaneously. Managing this with ordinary React local state or high-level context providers would cause render-performance bottlenecks and unmaintainable state bugs. The Gantt viewport is therefore treated as a deterministic, externally managed state engine.

### State Store: Zustand

- **\[ARCHITECTURE\]** State management uses Zustand. The viewport problem is fundamentally DERIVED state - given an expansion map plus a zoom/scroll configuration, compute the layout - rather than modal state with a fixed set of legally constrained transitions. Zustand computes the visibility/layout map outside the React render loop, exposed via memoized selectors, keeping it lightweight.
- **\[ARCHITECTURE\]** XState was considered and deferred. A formal state machine earns its place only if genuinely modal interactions appear (e.g., a drag-to-reschedule mode vs. a dependency-linking mode vs. normal mode) where legal transitions must be enforced. If those arrive later, XState can be layered in for that specific concern without rewriting the Zustand store.

### What the Store Tracks

- Expansion state: which parent nodes the user has toggled open or closed. When a parent is collapsed, all descendant tasks (Levels 2-5 beneath it) are pruned from the active layout engine.
- Viewport configuration: the current time-scale zoom level (day / month / quarter / year) and horizontal scroll position. A zoom change recomputes the horizontal positioning of every visible time block simultaneously.
- Active workspace context.

### Design Principles

- **\[ARCHITECTURE\]** Eliminate render cascades: the layout engine computes the visibility map outside the React render loop; a row re-renders only if its explicit visibility status or coordinates change.
- **\[ARCHITECTURE\]** Deterministic layout: given a viewport configuration and an expansion map, computed positions are 100% deterministic, eliminating visual blinking and track drift.
- **\[ARCHITECTURE\]** Separation of concerns: components stay purely presentational, reading calculated absolute pixel/grid dimensions from the store without knowing why they are visible or how wide they should be.
- **\[ARCHITECTURE\]** The sharp-cornered, fixed-grid design system (A9) maps the store's calculations to rigid integer pixel boundaries, so column widths, row heights, and indentations are mathematical steps - making geometric containment and task-interval intersection cheap to compute without heavy runtime CSS layout.

### Row Virtualization

- **\[ARCHITECTURE\]** Row virtualization is a required companion to the state machine. Even under the V1 cap of fewer than 1,000 tasks across five tiers, the DOM should mount only the rows currently in the viewport. Virtualization pairs naturally with the store, which already knows the visible-row list and each row's coordinates.

### Forward Compatibility with Date Propagation

- **\[ARCHITECTURE\]** Although cascading date propagation is deferred for the MVP, the store is the surface through which it will eventually flow. The layout source-of-truth for bar positions must be designed to be mutated by dependency recalculation - not only by user zoom/scroll/expand actions - so propagation can be added later without retrofitting the engine.

### Integration Sequence

- **\[ARCHITECTURE\]** This engine is built in Phase 7, after Phase 6 delivers clean nested task arrays from the backend (as Inertia props / API Resource payloads) and the design-system rules are locked. That sequencing avoids chasing a moving target: the work focuses purely on computation logic fed by clean data producing predictable layouts.

# Backend Coding Conventions

The following conventions are enforced project-wide (where practical, via the Pest architecture tests described in A6). They keep the codebase legible, the request boundary disciplined, and the data handed to the frontend clean and predictable.

## C1. Inertia, Not REST

- **\[ARCHITECTURE\]** The application uses Laravel Inertia as the backend/frontend glue. There is no separate REST API layer for the first-party client: controllers resolve data and pass it directly to React pages as Inertia props. API Resource classes (C4) shape those props. Any future REST surface (e.g., for third-party integrations) would be an additive, explicitly scoped concern, not the primary architecture.

## C2. Morph Maps for All Polymorphic Models

- **\[ARCHITECTURE\]** All models participating in polymorphic relationships must use Eloquent morph maps to register short, human-readable aliases (e.g., "task", "document") instead of storing fully-qualified class names in commentable_type and similar columns. This keeps the database readable, decouples stored data from PHP namespaces, and lets classes be moved or renamed without a data migration.

## C3. FormRequests for Authorization & Validation

- **\[ARCHITECTURE\]** FormRequest classes are used to the maximum extent practical. Every controller action that accepts input routes through a dedicated FormRequest that owns both authorization (the authorize() method) and validation (the rules() method). Controllers do not perform inline validation or ad-hoc authorization checks. This is reinforced by the A6 architecture tests requiring FormRequests to live only in App\\Http\\Requests, carry the Request suffix, and be used only by controllers.

## C4. API Resource Classes for Frontend Payloads

- **\[ARCHITECTURE\]** Laravel Eloquent API Resource classes transform models and collections into frontend-ready data structures before they are handed to Inertia. Raw Eloquent models are never serialized straight to the frontend; Resource classes define the explicit shape, field selection, and any computed/derived attributes (such as the day-grain end_date = start_date + duration_days) so the React layer receives a stable, predictable contract that pairs with the Wayfinder-generated TypeScript types.
- **\[PHASE 3 UPDATE\]** `JsonResource::withoutWrapping()` is enabled globally (in `AppServiceProvider`) so Resources serialize without the top-level `data` envelope — props arrive as plain objects/arrays, which is what the Inertia/React contract expects. Resource collections passed as Inertia props are therefore plain arrays.

## C5. No Service Layer — Skinny Controllers, Rich Models \[PHASE 3\]

- **\[ARCHITECTURE\]** There is **no service-class layer**. An early Phase-3 draft introduced `App\Services\*` wrappers; they were removed because most were thin pass-throughs over Eloquent and the indirection obscured trivial operations. Responsibilities are placed where they naturally belong:
  - **FormRequests** own authorization + validation, including cross-field/domain guards (e.g., the invite guards: cannot invite the owner, an existing member, or create a duplicate pending invitation) via `prepareForValidation()` and the `after()` validation hook.
  - **Rich models** own domain behavior and multi-write/stateful transitions: e.g. `ProjectInvitation::accept()` (transactional pivot attach + status flip), `decline()`/`revoke()`, the `creating` hook that defaults token/status/expiry, and query scopes (`pending()`, `forEmail()`); `Project::updateMemberRole()` / `removeMember()` (with owner-protection guards).
  - **Controllers** stay thin: resolve the request, call model/Eloquent methods, dispatch a Mailable where needed, and return an Inertia response or redirect.
- **\[ARCHITECTURE\]** Controller arch-test allowlist (A6) was updated accordingly. Controllers may use: `App\Http\Requests`, `App\Http\Resources`, `App\Mail`, `App\Models`, `Illuminate\Http`, the `DB` and `Mail` facades, `AuthorizesRequests`, `Inertia`, and the `redirect` helper. **\[PHASE 4 UPDATE\]** `Symfony\Component\HttpFoundation` was added for streamed file-download responses (the document download controller returns a `StreamedResponse`); the file I/O itself stays on the model, not the controller. The earlier "controllers must not touch the DB facade" rule was **removed** as too restrictive (it forced needless indirection); transactions and raw queries are permitted but, by the convention above, generally live on models. **\[PHASE 6 UPDATE\]** `App\Events` was added to the allowlist: controllers dispatch thin domain events (`TaskCreated` / `TaskUpdated` / `CommentCreated`) per A10, while the listeners that react to them (telemetry now, notification delivery later) stay out of the controller layer.
- **\[ARCHITECTURE\]** Controllers conform to the Laravel preset's resourceful-method rule: actions are limited to standard names (`index/create/store/show/edit/update/destroy`) or are **single-action invokable** controllers. Non-resourceful operations therefore get their own invokable controller (e.g., `RestoreProjectController`, `AcceptInvitationController`, `DeclineInvitationController`, `SidebarCollapsedController`, `SidebarWidthController`).

# Build Roadmap

Recommended build sequence - from the data core outward, maximizing UI stability before the dynamic Gantt visualization. This is engineering sequencing, not a change to product scope.

### Phase 1 - Baseline Architecture & Automated Enforcement — ✅ COMPLETED

Scaffold the Laravel shell and configure Pest. Commit the architecture tests so the build rejects any code violating the request/naming/layer paradigms. Delivered: architecture test suite, `pint.json`, and a `composer lint` gate (Pint + Rector + tests). See Implementation Status & Established Conventions.

### Phase 2 - Core Auth & Project Access Controls (RBAC) — ✅ COMPLETED

Stand up authentication and the project membership model with owner/admin/editor/viewer roles. Deliver middleware/policies that block requests for projects the user is not a member of. Delivered: headless Fortify auth, the Inertia + React + TypeScript + Tailwind v4 frontend toolchain, the `Project` model + `project_user` pivot, `ProjectPolicy`, `EnsureProjectMember` middleware, and unit/feature/browser tests. (The `Project` model and pivot — originally sketched for Phase 3 — landed here because RBAC depends on them.)

### Phase 3 - Project Topologies, Workspace Shell & Membership — ✅ COMPLETED

Delivered project CRUD (create / edit / archive / restore), the per-project Settings page (General / Members / Danger tabs), the membership-management UI, pending **email** invitations (token + accept / decline / revoke), and the application shell: a top nav (logo + global cross-project search placeholder with ⌘K affordance) and a **collapsible, drag-resizable left sidebar** (custom, no new dependency) containing the workspace switcher (with the user/account menu) and project-scoped navigation. The switcher shows the **3 most-recently-updated projects (always including the current one)**; the full list lives on the Projects index. Established the no-service-layer convention (C5), the design-system primitives, and `lucide-react` as the icon library. See "Implementation Status & Established Conventions (through Phase 3)".

(Originally scoped as "route write actions through FormRequests + a Service"; the Service part was dropped — see C5.)

### Phase 4 - Document Ingestion Subsystem — ✅ COMPLETED

Multi-MIME upload controllers bound to project context, with an abstract storage layer (local vs. cloud) and automated metadata indexing plus audit trails. Delivered: the `documents` table + rich `Document` model with per-field classification (constrained by the project baseline), a config-driven `documents` disk (private `local` by default, swappable to `s3`), upload/update/delete + authorized streamed download/inline-preview controllers, the Documents index and show page (upload modal, list, click-through, inline preview, download, edit, delete), and unit/feature/browser tests. See "Implementation Status & Established Conventions (through Phase 4)".

### Phase 5 - Polymorphic Commenting Infrastructure — ✅ COMPLETED

Deploy the polymorphic comment schema and hook threads onto Document first to prove the plumbing across the API boundary before wiring it to Tasks. Delivered: the polymorphic `comments` table + rich `Comment` model (`commentable` morphTo, per-field classification constrained by the project baseline), `CommentPolicy` (editors+ create, author edits own, owner/admin moderate-delete), Store/Update FormRequests, `CommentResource` (per-comment `can{}` block), a skinny nested `CommentController` (store/update/destroy), the comments thread on the Documents show page (a Comments tab), and unit/feature/browser tests. See "Implementation Status & Established Conventions (through Phase 5)".

### Phase 6 - Task Core Lifecycle & Temporal Logic Plumbing — ✅ COMPLETED

Build atomic CRUD for the 5-tier recursive Task structure. Per C5 (no service layer), `start_date`/`duration_days` logic lives on the `Task` model (domain methods + scopes) with controllers staying thin; keep MVP logic simple (manual locking first) before layering in cascading propagation. Dispatch domain events (TaskCreated, TaskUpdated) on create/update and register simple immediate listeners for internal state and system logging — this is where the generic event/listener foundation (deferred in Phase 3) gets built. **\[ACTIVITY-LOG NOTE\]** The append-only audit trail (PRD §9) is already built (see the Activity-Logging Foundation status section below); Task picks it up simply by adding `use LogsModelActivity;`. Note the audit trail is captured via Eloquent model events (Spatie), independent of the generic domain-event bus Phase 6 still introduces — the two are complementary, not the same mechanism.

### Phase 7 - UI Design System & Gantt State Engine — ✅ COMPLETED

Locked the component rules and built the deterministic Zustand-based viewport store with row virtualization driving five-level Gantt visibility, designed so date propagation can later mutate bar positions through the same engine. Delivered: the `projects.timeline` page; the pure layout/axis/geometry engine; a three-tier zoom-adaptive axis (day/month/quarter/year) with weekend shading and a today marker; drag-to-reschedule (auto-unlocks), dependency connector lines (FR-3), sibling reordering via drag **and** buttons (`spatie/eloquent-sortable`), infinite horizontal scroll with header panning and prev/next/Today controls + keyboard hotkeys; and **workday-aware scheduling** (work-day vs calendar-day durations, FR-5). Baselines (FR-17) and screenshot export (FR-8) remain deferred. See "Implementation Status & Established Conventions (through Phase 7)".

### Phase 8 - Schedule Rules Engine (Automatic Date Propagation) — ✅ COMPLETED

The headline post-MVP enhancement, pulled forward: a pure, deterministic propagation engine (`app/Support/Propagation`) that makes tasks reactive. Push-only finish-to-start propagation (slack preserved; multiple predecessors = max constraint), the target locking model from §4 (independent `lock_start`/`lock_end`/`lock_duration`, max two of three; `is_date_locked` dropped), engine-maintained parent envelopes (rolled-up schedules, §2), hierarchy-aware cycle detection (FR-6), a dry-run/confirm protocol for edits whose cascade would introduce conflicts, and derived conflict surfacing on the Gantt. See "Implementation Status & Established Conventions (through Phase 8)".

### Phase 9 - Timeline Quick Authoring & On-Chart Dependency Editing — PLANNED

Turn the timeline from a viewer-with-drag into the primary authoring surface: a row selection model with keyboard navigation and hotkeys, an inline draft row for name-only task/subtask creation with smart defaults and Enter-chaining (FR-18, FR-19), inline rename (FR-20), drag-to-link + context-menu dependency creation and on-chart removal riding the Phase 8 dry-run/confirm protocol unchanged (FR-21), and pointer-anchored custom context menus (FR-22). Backend lift is deliberately small: a quick-store endpoint with server-side defaults, a rename endpoint, and a destroy redirect-back option — no engine or dependency-endpoint changes. Reparenting of existing tasks remains deferred. See "Phase 9 Specification" below.

### Future Phase - Notification Engine Deployment

Add new listeners (e.g., SendTaskAssignmentNotification) that handle delivery criteria, per-user preferences, batching/throttling, and message queuing - built on top of the Phase 6 event foundation without altering it.

# Phase 9 Specification — Timeline Quick Authoring & On-Chart Dependency Editing

## Overview

Phase 9 makes the Timeline page the fastest place to build out a plan. Power users scaffold a task tree by typing names — hotkey, name, Enter, name, Enter — and wire up dependencies by dragging between bars, returning later to enrich tasks with detail. Three pillars:

1. **Selection + keyboard model** — a prerequisite: hotkeys need a "current row".
2. **Inline quick-create** — name-only creation of siblings and subtasks with smart defaults; every quick task gets dates so it renders a bar immediately.
3. **On-chart dependencies** — create by drag-to-link (or context-menu link mode), remove by clicking a connector; the Phase 8 `schedulePreview`/confirm protocol is reused unchanged.

All mutating affordances are editor+ only (`ProjectPolicy::update`); viewers retain a read-only timeline.

## P9-1. Selection & Keyboard Model

A new `selectedTaskId` lives in the Gantt store (`useGanttStore`).

- **Acquire selection:** click anywhere on a row's left-pane cell (outside the name link, chevron, and reorder grip) or click — not drag — a task bar. Clear: Esc (when no draft/rename/link is active) or click on empty chart space.
- **Visual:** full-row highlight spanning both panes, distinct from hover; uses `accent-*` tokens with dark variants.
- **Virtualization-safe focus:** rows unmount when scrolled away, so keyboard handling stays on the scroll container (`tabIndex=0`) with `aria-activedescendant` pointing at stable per-row ids (`gantt-row-{taskId}`). Any operation on the selection first calls `virtualizer.scrollToIndex()` so the row is mounted and visible.
- **Reconciliation:** when `setTasks()` drops the selected task (concurrent edit/delete), selection moves to the nearest surviving visible row (next, else previous, else cleared).

### Hotkey map

Added to the existing keydown handling in `GanttChart.tsx`, with the existing guards (ignore when an input/textarea/select/contenteditable is focused; ignore modified keys except where listed). Mutating keys are no-ops for viewers. No conflicts with existing D/M/Q/Y zoom and T (today).

| Key | Action |
|---|---|
| ArrowUp / ArrowDown | Move selection through visible rows (selects first/last row when nothing is selected); auto-scrolls |
| ArrowLeft / ArrowRight | Collapse / expand the selected parent row (tree convention) |
| **N** | New task — draft row as next sibling after the selected row; at end of root tasks when nothing selected |
| **Shift+N** | New subtask — draft row as last child of the selected row; disabled at hierarchy level 5 |
| **F2** | Rename the selected task inline |
| **Enter** | Open the selected task's detail page |
| **Delete / Backspace** | Delete the selected task (confirm dialog; warns subtree is deleted) |
| **Esc** | Cancel draft / rename / link mode first; otherwise clear selection |

Hotkeys are discoverable via the existing `keyboard-shortcut` component: hints shown on context-menu items and in the timeline's shortcut legend alongside the zoom keys.

## P9-2. Inline Quick-Create (Draft Row)

**Surface decision: a transient inline draft row in the left pane** — not a modal or floating input — preserving positional context and the type-Enter-type-Enter flow.

- The store gains `draft: { parentId, afterId } | null`. `computeLayout()` splices one synthetic row at the draft's position (after `afterId`'s subtree within the sibling group, else at the end of the group), so row tops, content height, and the virtualizer count account for it naturally. The draft is keyed by a stable synthetic id and auto-focuses its `<input>`.
- The draft renders at the correct indent; the bar track shows a **ghost bar** at the smart-default dates so the user sees where the task will land.
- **Keys inside the draft input:**
  - **Enter** — commit (POST quick-store) and immediately open a fresh draft directly below (chaining).
  - **Esc** — cancel. Blur: commit if non-blank, cancel if blank/whitespace (never POST whitespace-only names).
  - **Tab / Shift+Tab** — indent/outdent **the draft only**: re-anchor `parentId` to the previous visible row's task / to the grandparent, clamped to depth 1–5. Committed tasks are never reparented (deferred — see Out of Scope).

### Smart defaults (resolved server-side)

Every quick task gets dates — **never create unscheduled tasks from the timeline** (an invisible row on a chart-first surface reads as a bug).

- `start_date`: **context anchor** — the `after_id` sibling's start date if scheduled; else the parent's start date; else today. Parallel same-day start, not chained after the sibling's end: serial chaining would imply a dependency that doesn't exist, and Phase 9 makes real dependencies cheap. The anchor also prevents a today-default from dragging a far-future parent envelope back to today.
- `duration_days = 1`, `duration_unit = work_days` (matches the full form's default), `status = not_started`, `percent_complete = 0`, default risk, no locks, `base_classification` = the lowest marking the project baseline dominates.
- After save the engine runs exactly as full-form creation does: new task pinned (`lock_start` override) via `previewSchedule()` + `commitSchedule()` — ancestors' envelopes reshape, no confirm gate.

### Optimistic UX

Consistent with the drag/reorder patterns (optimistic preview held until the server confirms):

- On Enter, the draft freezes into a greyed **pending placeholder row** (name, indent, ghost bar) and a fresh draft opens below — typing is never blocked.
- POSTs use `preserveScroll: true, preserveState: true`; the round-trip's updated `tasks` prop replaces the placeholder via `setTasks()` in the same render. Validation errors reopen the draft inline with the message.
- **Creates are serialized:** one POST in flight; subsequent commits queue client-side and flush in order (sort position depends on the prior create existing). A mid-queue failure stops the flush and reopens the failed item as a draft, leaving later queued items as drafts beneath it. No client-token reconciliation needed given serialization.

## P9-3. Inline Rename

F2 or context-menu **Rename** swaps the selected row's name for a pre-filled, pre-selected inline input (same treatment as the draft row). Enter commits via the rename endpoint; Esc reverts. Round-trip uses `preserveScroll/preserveState`. No engine run (a name can't move dates).

## P9-4. On-Chart Dependencies

Both creation modes drive one **linking state machine** (store slice `linking: { sourceTaskId } | null`; transient pointer position stays in component state). Direction is single and consistent everywhere: **you always link from predecessor to successor**.

### Drag-to-link (primary)

- Hovering a bar (editors only) reveals a circular **connector handle at the bar's finish (right) edge** — FS-only engine. Pointer-down starts linking; an elbow preview line (same styling as `DependencyLayer`) follows the cursor in a top overlay SVG.
- **Valid drop target:** another task's bar or its row's bar track. Client-side pre-checks from data already in the store: not self, not ancestor/descendant, not a duplicate edge. Invalid hover targets get a red tint, not-allowed cursor, and a short reason tooltip. Cycle detection stays server-side (`ScheduleGraph::wouldLoop`) and surfaces as a normal validation error flash.
- **Autoscroll:** pointer near the container's top/bottom edges scrolls vertically in a rAF loop; horizontal edges reuse the existing range-extension behavior.
- **Drop** → `POST projects.tasks.dependencies.store` on the target with `{ predecessor_id: source }`, `preserveScroll/preserveState`. Cascade conflicts ride the **existing** dry-run protocol: the backend flashes `schedulePreview`, the already-mounted preview dialog shows moves/conflicts, and confirm resubmits with `confirm: true`. Zero new confirm UX.
- Esc or pointer-up off-target cancels.

### Context-menu link mode (fallback; covers bar-less tasks)

**"Link to successor…"** on the task context menu enters the same linking state in click-to-complete mode: a persistent hint bar appears ("Linking *Foo* → click a task to make it the successor — Esc to cancel"); clicking any row or bar completes with identical validation and POST. This is the path for unscheduled (bar-less) source tasks. A reverse "link from predecessor…" mode is cut — one direction, one mental model.

### Removal

- Connectors in `DependencyLayer` become interactive: each visible path gains an invisible twin hit-path (`stroke-width: 10`, `pointer-events: stroke`; the layer drops `pointer-events-none`). Hover highlights the connector; click or right-click opens a small menu at the pointer: header "*Pred* → *Succ*", destructive item **Remove dependency** → existing `DELETE projects.tasks.dependencies.destroy`. No extra confirm (matches the endpoint's current behavior; re-adding is one drag).
- Fallback for hard-to-click lines: the task context menu's **Dependencies ▸** submenu lists current predecessors, each with a Remove action.

## P9-5. Context Menus

A new `ContextMenu` component in `components/ui/` — pointer-anchored portaled panel, structurally a sibling of `dropdown-menu.tsx` (reuses its item/label/separator styling; adds open-at-`{x,y}` from `onContextMenu` + `preventDefault`, viewport-edge flipping, one-open-at-a-time, Esc/outside-click dismissal). No new dependency. Menus per surface:

1. **Task row / task bar (same menu):** New task below (N) · New subtask (Shift+N; disabled at depth 5 with reason) · Rename (F2) · — · Link to successor… · Dependencies ▸ (predecessors → Remove; empty state "No dependencies") · — · Open details (Enter) · — · Delete… (Del, destructive). Viewers see only "Open details".
2. **Empty timeline area:** New task (at end of roots) · — · Expand all · Collapse all · Go to today (T).
3. **Dependency connector:** header "*Pred* → *Succ*" · Remove dependency.

Items show hotkey hints via the `keyboard-shortcut` component and disable with a stated reason (depth cap, role).

## P9-6. Backend Additions (deliberately minimal)

Per C5 (skinny controllers, rich models) and C1 (Inertia, not REST). No engine or dependency-endpoint changes.

1. **Quick store** — `POST /projects/{project}/tasks/quick` (`projects.tasks.quick-store`), invokable `QuickStoreTaskController` + `QuickStoreTaskRequest`. Input: `name` (required, max 255), `parent_id` (nullable; in-project + `canHaveChildren()` guards as in `StoreTaskRequest`), `after_id` (nullable; must belong to the same sibling group as `parent_id`). Server fills all defaults (P9-2), computes insert-after `sort_order` (shift later siblings in a transaction), dispatches `TaskCreated`, runs the pinned `commitSchedule`, `redirect()->back()`. A separate request class — not `StoreTaskRequest` — because defaults belong server-side and the full form's required fields would force a faked payload.
2. **Rename** — `PATCH /projects/{project}/tasks/{task}/rename` (`projects.tasks.rename`), invokable `RenameTaskController`, body `{ name }`. Dispatches `TaskUpdated`, `redirect()->back()`. Reusing `tasks.update` was rejected: it demands the full field set and runs a schedule preview for a no-op.
3. **Destroy redirect** — `TaskController@destroy` accepts an optional flag (e.g. `from=timeline`) to redirect back instead of to `tasks.index`. Default unchanged.

Activity logging is automatic (`LogsModelActivity`); dependency add/remove keep logging `DependencyAdded`/`DependencyRemoved` via the existing controller.

## P9-7. Out of Scope (deferred)

- **Indent/outdent (reparenting) of existing tasks** — `UpdateTaskRequest` deliberately forbids `parent_id`; doing it right needs subtree `hierarchy_level` re-leveling, depth validation against the deepest descendant, `sort_order` resequencing in both sibling groups, a double engine pass, and activity logging. Its own phase. (Draft-row Tab indenting needs none of that.)
- Cross-parent drag reorder (reorder stays sibling-scoped).
- Dependency types beyond finish-to-start; lag/lead.
- Reverse "link from predecessor" mode; multi-select; bulk operations; undo.
- Editing dates/status from context menus (the detail page exists; menus stay shallow).
- Touch/long-press affordances — desktop power-user feature.

## P9-8. Edge Cases

1. **Max depth 5:** Shift+N / menu item disabled with reason at level 5; draft Tab clamps; server re-validates via `canHaveChildren()`.
2. **Viewer role:** no handles, drafts, or mutating hotkeys; navigation, selection, and Enter-to-open still work; task menu reduces to "Open details"; connector menu hidden.
3. **Shift+N on a collapsed parent:** auto-expand before opening the draft so it's visible.
4. **Zoom LOD fold:** if the draft's depth exceeds the current zoom's `maxDepth`, switch to the nearest zoom level that shows it (existing focal-point-preserving zoom change) before opening the draft.
5. **Propagation during quick ops:** quick create commits unconditionally (pinned new task — matches full-form store semantics); conflicts it creates surface as the existing dashed-red derived edges, not a modal. Dependency adds keep the confirm gate. If a `schedulePreview` dialog opens while a draft is active, the draft input is disabled until the dialog resolves.
6. **Concurrent edits:** `setTasks()` reconciliation drops a dangling `selectedTaskId` (nearest-row fallback); a draft whose `afterId` vanished re-anchors to the end of its parent group (or cancels if the parent vanished).
7. **Linking endpoints off-screen:** the preview line draws from the source bar's layout coordinates; the overlay spans the full content size (like `DependencyLayer`) so it clips naturally.
8. **Linking to a bar-less successor:** allowed via row click in click-click mode; the engine schedules/pushes it on commit per existing semantics.
9. **Right-click on resize handle / reorder grip:** the context menu wins (`preventDefault`, no drag start).

## P9-9. Testing

- **Pest feature tests:** `QuickStoreTaskTest` — date anchoring (sibling / parent / today), classification floor, `after_id` positioning + sibling-group guard, depth cap, viewer 403, envelope reshaping, serialized inserts keep order. `RenameTaskTest` — validation, authorization, no schedule side-effects. Destroy redirect-back. Existing `TaskDependencyTest` already covers the store/destroy/confirm protocol.
- **Layout unit tests:** `computeLayout()` draft-row splice — after-subtree insertion, end-of-group, collapsed parents, zoom fold.
- **Pest browser tests (Playwright):** N → type → Enter → type → Enter creates two ordered tasks with bars; Shift+N under a collapsed parent auto-expands; Tab indents the draft; F2 rename round-trips; drag handle → bar creates a dependency and draws the connector; a conflicting link pops the preview dialog and confirm commits; right-click connector removes the edge; arrow-key navigation scrolls the virtualized list; viewer sees no editing affordances.

## P9-10. Build Sequence (each step shippable)

1. Backend endpoints + feature tests (quick-store, rename, destroy redirect).
2. Store slices (`selectedTaskId`, `draft`, `linking`) + `computeLayout` draft splice + unit tests.
3. Selection, keyboard navigation, hotkeys, `aria-activedescendant` wiring.
4. Draft row component + serialized commit queue + pending placeholders.
5. `ContextMenu` UI component; task/empty/connector menus; inline rename.
6. Linking state machine: handles, preview overlay, autoscroll; connector hit-areas + removal.
7. Browser test suite.

# Implementation Status & Established Conventions (through Phase 2)

This section records what has actually been built and the engineering conventions now locked in, so Phase 3 starts from a known foundation. Phases 1–2 of the Build Roadmap are complete and fully tested (72 tests passing at the close of Phase 2).

## Backend Conventions

### Enums (`app/Enums`, string-backed)

- **`Role`** — `Owner`, `Admin`, `Editor`, `Viewer`. Capability predicates `canEdit()`, `canManageMembers()`, `canConfigureProject()` are the single source of role capability logic (consumed by the policy).
- **`ProjectStatus`** — `Active`, `Completed`; `label()`, `isActive()`.
- **`BaseClassification`** — `UNCLASSIFIED` / `CUI` / `CONFIDENTIAL` / `SECRET` / `TOP_SECRET`; `label()`, `level(): int`, and `dominates(self): bool` — the seam future baseline-vs-field enforcement will use to ensure a field marking never exceeds the project baseline.
- **`ThemePreference`** — `Light` / `Dark` / `System`.

### Models & Data

- **Audit stamps** — the `HasUserStamps` trait plus `userStamps()` / `softDeletesWithUserStamps()` Blueprint macros (in `AppServiceProvider`) add `created_by` / `updated_by` / `deleted_by` (nullOnDelete) and timestamps/soft deletes. Every domain table uses these macros; raw `->timestamps()` is forbidden (arch-tested).
- **Classification scaffold** — the `classification()` Blueprint macro adds `base_classification` (default UNCLASSIFIED), `special_access_required` (bool), `handling_caveats` (json; e.g. SCI `['SI','TK']`), and `programs` (json; SAR program/level list). The `HasClassification` trait merges the casts via `initializeHasClassification()`. Currently applied to `Project` as a **row/project-level baseline**; per-field markings remain the documented V1 target and will reuse `BaseClassification::dominates()`.
- **Morph map** — `Relation::enforceMorphMap(['user' => User, 'project' => Project, …])` in `AppServiceProvider`; every polymorphic participant must be registered here (no FQCN in the DB).
- **Project** — `owner_id` FK (single authoritative owner), `members()` belongsToMany over `project_user` (`role` pivot column), `owner()` belongsTo, plus `roleFor()` / `isOwner()` / `isMember()`. A `booted()` `created` hook mirrors the owner into the pivot (role `owner`) so `members()` and `User::projects()` are single-query.
- **User** — `theme` column with a `$attributes` default (so freshly created instances are never null), `ownedProjects()` (hasMany) and `projects()` (belongsToMany = all accessible projects).
- Model shape: a `#[Fillable([...])]` attribute, a `casts()` method, `SoftDeletes`, and a factory with semantic states (`withOwner`, `withMember`). All enforced by `tests/Feature/Arch` (the `#[Fillable]` requirement is enforced by a dedicated `ModelsArchTest` case as of Phase 4).

### Authentication (headless Fortify)

- Enabled features: registration, resetPasswords, updateProfileInformation, updatePasswords. Disabled for V1: two-factor, passkeys, email verification (no mail delivery yet — their migrations were removed).
- `FortifyServiceProvider` binds Inertia pages to Fortify's view routes (`Auth/Login`, `Auth/Register`, `Auth/ForgotPassword`, `Auth/ResetPassword`) and keeps the login throttle limiter. `fortify.home` → `/dashboard`.

### Authorization

- **`ProjectPolicy`** (auto-discovered) is the single authority for actions: `create` (any authenticated user), `view` (member), `update` (canEdit), `manageMembers` / `updateSettings` (canManageMembers / canConfigureProject), `delete` (owner only).
- **Two layers**: the `EnsureProjectMember` middleware (alias `project.member`) is the coarse membership gate on project route groups; controllers additionally call `$this->authorize(...)` via the `AuthorizesRequests` trait for explicit per-action checks. Both delegate to `ProjectPolicy`.

### HTTP / Routing

- Inertia, not REST (C1). Controllers are plain classes (extend nothing, `Controller` suffix). _(This Phase-2 snapshot originally listed an `App\Services` layer and forbade the DB facade; that was **superseded in Phase 3** — see C5 and the "through Phase 3" status for the current controller allowlist.)_
- Routes are split: `routes/web.php` (public/guest) and `routes/dashboard.php` (loaded behind the `web` + `auth` group via the `then` callback in `bootstrap/app.php`). Route model binding + Wayfinder helpers throughout.

## Frontend Conventions

- **Stack** — Inertia v3 + React + TypeScript (strict) + Tailwind v4, built by Vite with the React, Wayfinder, and Tailwind plugins. Entry: `resources/js/app.tsx`; pages resolved from `resources/js/Pages/**` with **PascalCase** filenames (e.g. `Auth/Login.tsx`, `Projects/Show.tsx`).
- **Path alias** — `@/*` → `resources/js/*`.
- **Type-safe routing** — Wayfinder generates typed route/action helpers into `@/routes` and `@/actions` (regenerate via build or `php artisan wayfinder:generate --with-form`); never hardcode URLs. Shared Inertia props are typed in `@/types` (`SharedProps`: `auth.user`, `flash`, sidebar state) and provided by `HandleInertiaRequests`.
- **Design system (A9)** — primitives in `components/ui/*` (`Button` primary/secondary, `Input` md/lg, `Label`, `Card`, `InputError`) and `layouts/*` (`auth-layout`, `app-layout`). Helpers: `utils/cn.ts` (class join) and `utils/focusRing.ts` (shared focus-visible rings). Tailwind v4 is CSS-first in `resources/css/app.css` (`@theme`): an **accent** palette (aliased to blue so it can be re-skinned in one place), `border` / `border-dark` tokens, class-based dark mode via `@custom-variant dark`, and custom scrollbars. Use the `accent-*` / `border` tokens rather than raw colors.

## Testing & Quality Gates

- **Pest** suites: `Unit`, `Feature`, `Browser` (registered in `tests/Pest.php` + `phpunit.xml`); `LazilyRefreshDatabase`.
- **Architecture tests** (`tests/Feature/Arch`) enforce: controller layer (`toOnlyUse` allowlist) + suffix, FormRequest location + `Request` suffix + base class + `rules()`/`authorize()`, model invariants (Model base, `casts()`, SoftDeletes, HasUserStamps, factory, morph alias, datetime casts), and migration invariants (macros present, no `->timestamps()`). **\[PHASE 3 UPDATE\]** The "controllers must not use the DB facade" rule was removed; the controller allowlist now also permits `App\Http\Resources`, `App\Mail`, the `DB`/`Mail` facades, and the `redirect` helper (see C5). The `App\Services` namespace was removed from the allowlist (the service layer no longer exists).
- **Browser tests** (Pest v4 + Playwright) cover the auth flows and a guest-page smoke pass (`assertNoSmoke`). Screenshots are git-ignored.
- **Commands** — `composer lint` (Pint + Rector + tests), `php artisan test --compact`, `vendor/bin/pint --dirty`.

# Implementation Status & Established Conventions (through Phase 3)

This section records what Phase 3 added on top of the Phase 1–2 foundation, and the conventions now locked in. Phases 1–3 are complete and fully tested (124 tests passing at the close of Phase 3).

## Backend (Phase 3)

### Enums & constants
- **`InvitationStatus`** (string-backed) — `Pending` / `Accepted` / `Declined` / `Revoked`; `label()`, `isPending()`. Expiry is evaluated against `expires_at`, not stored as a status.
- **`Role`** gained `label()` (for resource/UI display).
- **`ProjectInvitation::EXPIRY_DAYS = 14`** — single source for the invitation validity window (used by the model's `creating` hook).

### Data model
- **`project_invitations` table** — `project_id` (cascade), `inviter_id` (nullable FK → users, nullOnDelete), `email`, `role`, `token` (unique, 64-char), `status` (default pending), `expires_at` / `accepted_at` / `declined_at` / `revoked_at`, `accepted_by`, plus the `userStamps()` + `softDeletesWithUserStamps()` macros. Morph alias `project_invitation`.
- **`ProjectInvitation` model (rich)** — relations `project()`, `inviter()`, `acceptedBy()`; predicates `isExpired()` / `isActionable()`; scopes `pending()` and `forEmail()`; transition methods `accept(User)` (transactional pivot attach + status flip, idempotent for existing members), `decline()`, `revoke()`; a `creating` hook that defaults `token`/`status`/`expires_at`.
- **`Project` model** gained `invitations()` (hasMany), and membership-mutation methods `updateMemberRole(User, Role)` / `removeMember(User)` — both guard the singular owner (`abort 403`); owner remains authoritative via `owner_id`.

### HTTP / routing
- **Controllers (skinny, no services — C5):** `ProjectController` (`index/create/store/show/update/destroy`), plus invokable `ProjectSettingsController`, `RestoreProjectController`, `AcceptInvitationController`, `DeclineInvitationController`, `SidebarCollapsedController`, `SidebarWidthController`, and resourceful `ProjectMemberController` (`update/destroy`) and `ProjectInvitationController` (`store/destroy`).
- **FormRequests:** `StoreProjectRequest`, `UpdateProjectRequest`, `StoreInvitationRequest` (with `prepareForValidation` lowercasing + `after()` domain guards), `UpdateProjectMemberRequest`, `UpdateSidebarCollapsedRequest`, `UpdateSidebarWidthRequest`. Several expose a typed `role()` accessor so controllers never import enums.
- **API Resources:** `ProjectResource` (full workspace payload incl. a `can{}` ability block from `ProjectPolicy`), `ProjectSummaryResource` (switcher/list rows), `ProjectMemberResource`, `ProjectInvitationResource`. `JsonResource::withoutWrapping()` is global (C4).
- **Routes** (`routes/dashboard.php`, behind `web`+`auth`): project CRUD; `projects.restore` (`withTrashed` binding); `projects.settings`; nested `projects.members.*` and `projects.invitations.*` (the revoke route uses `scopeBindings`); non-member-scoped `invitations.show` (bound by `{invitation:token}`), `invitations.accept`, `invitations.decline`; and `sidebar.collapsed` / `sidebar.width`.
- **Mailable:** `ProjectInvitationMail` (queued, Markdown) with a tokenized accept link, dispatched from `ProjectInvitationController@store`.
- **Shared Inertia props** (`HandleInertiaRequests`): `recentProjects` (the ≤3 most-recently-updated accessible projects by `projects.updated_at`, always including the current project resolved from the route), `sidebarWidth`, `sidebarCollapsed`, `flash.status`, `auth.user`. The full accessible-project list is a per-page prop on the Projects index, not shared.

### Authorization
- **`ProjectInvitationPolicy`** — `respondToInvitation` allows the invitee whose email matches (case-insensitive). The tokenized `invitations.show` link is the bearer secret for discovery; accept/decline are email-gated.
- Project abilities unchanged from Phase 2 (`ProjectPolicy`): `create`/`view`/`update`/`manageMembers`/`updateSettings`/`delete`.

## Frontend (Phase 3)
- **App shell** — `layouts/app-layout` composes a full-width top nav (`components/shell/top-nav`: logo, always-visible global cross-project search **placeholder** with a ⌘K affordance) + a **collapsible, drag-resizable left sidebar** (`components/shell/resizable-sidebar`, custom — **no new dependency**, ⌘B toggle, width/collapsed persisted to the session via the sidebar routes) hosting the **project switcher** (`components/shell/project-switcher`, which also contains the account/logout menu) and project-scoped nav (`components/shell/sidebar-nav`, with disabled "coming soon" placeholders for Phase 4–7 features).
- **Pages** (`resources/js/Pages`): `Projects/Index` (cards + status dots + pending-invitation panel + archived/restore), `Projects/Create`, `Projects/Settings` (General / Members / Danger tabs), `Invitations/Show` (token landing).
- **Design-system primitives** (`components/ui/*`, kebab-case files, default exports; compound components use named exports): `button` (variants `primary`/`secondary`/`danger`/`ghost`, sizes `default`/`sm`/`icon`, plus `ButtonLink` + `buttonClasses`), `dropdown-menu`, `select`, `textarea`, `avatar`, `badge`, `modal`, `confirm-dialog`, `fieldset` + `FieldRow` (the bordered label/field grid), `page-header`, `sidebar-tooltip`, `keyboard-shortcut`. Helpers in `utils/` (`cn`, `focusRing`, `navLink`) and `ROLE_LABELS` in `@/types`.
- **Icons:** `lucide-react` is the icon library (installed; do not add other icon packs).
- **Types:** `@/types` mirrors the Resources (`Project`, `ProjectSummary`, `ProjectMember`, `ProjectInvitation`, `Role`, `ProjectStatus`, `SharedProps`). `tsc --noEmit` is part of the verification loop alongside `npm run build`.

## Phase 4 Starting Point

Project CRUD, membership, invitations, the app shell, the switcher, and the full design-system + arch conventions (C1–C5) are in place. Phase 4 (Document Ingestion) should follow C5 (skinny controllers / rich models / FormRequests / API Resources), register any new polymorphic models in the morph map, use the migration macros, and reuse the shell + `components/ui` primitives for any UI. Note: the generic domain-event/listener foundation is still **not** built (deferred to Phase 6); only invitation email is delivered today.

# Implementation Status & Established Conventions (through Phase 4)

This section records what Phase 4 added on top of the Phase 1–3 foundation. Phases 1–4 are complete and fully tested (135 tests passing at the close of Phase 4).

## Backend (Phase 4)

### Framework hardening
- **`AppServiceProvider::boot()`** was reorganized into small `configure*()` steps and gained app-wide guardrails: `Model::shouldBeStrict()` (non-production), `Date::use(CarbonImmutable)`, `Password::defaults()` (min-8 in production), and `DB::prohibitDestructiveCommands()` (production). Mass-assignment protection stays **on**: every model declares an explicit `#[Fillable]` allowlist (enforced by a new `ModelsArchTest` case so it can't regress), and controllers set non-fillable/server-derived fields explicitly rather than mass-assigning them. `shouldBeStrict()` is what surfaced the `ProjectSummaryResource` pivot guard (now `relationLoaded('pivot')`).
- **`HasUserStamps`** stamps the audit columns (`created_by`/`updated_by`/`deleted_by`) directly, never via mass assignment — the soft-delete hook uses `forceFill(...)->saveQuietly()` so the stamp bypasses the `#[Fillable]` guard (these columns are intentionally not fillable).

### Storage
- **`documents` disk** (`config/filesystems.php`) — config-driven via `DOCUMENTS_DISK_DRIVER` (private `local` by default, `s3`-swappable without code changes), rooted at `storage/app/private/documents`. This is the abstract local-vs-cloud storage layer A7 calls for. The disk name is pinned to a single constant `Document::DISK` so the storage target lives in one place. Uploads are stored under a per-project subdirectory (`{project_id}/…`); files are never publicly served — they are streamed through an authorized download route only.

### Enums
- **`DocumentType`** (string-backed) — `Pdf` / `Image` / `Spreadsheet` / `Document` / `Other`; `label()` and a static `fromMime(string): self` that buckets an uploaded MIME type into a display group. Keeps file-category copy out of the React layer.

### Data model
- **`documents` table** — `project_id` (cascade), `name`, `description`, `disk`, `path`, `original_filename`, `mime_type`, `size_bytes`, `checksum` (sha256), the `classification()` macro (per-field marking, default UNCLASSIFIED), plus `userStamps()` + `softDeletesWithUserStamps()`. Morph alias `document` (registered now; reused by Phase 5 comments). Index on `project_id`.
- **`Document` model (rich)** — traits `HasClassification`, `HasFactory`, `HasUserStamps`, `SoftDeletes`; `const DISK`; **`#[Fillable]`** limited to the user-editable fields (`name`, `description`, `base_classification`) — storage metadata (`disk`, `path`, `original_filename`, `mime_type`, `size_bytes`, `checksum`) is intentionally non-fillable and set explicitly by the controller, never mass-assigned. Relation `project()`; scope `forProject()`; `type(): DocumentType` (derived from the stored MIME, content-guessed via `getMimeType()` at upload). Domain/file behavior lives on the model (per C5): `download(): StreamedResponse` (attachment), `inline(): StreamedResponse` (in-browser preview — inline disposition + `X-Content-Type-Options: nosniff`, both reading the content-derived stored MIME), and `deleteWithFile()` (soft-deletes the audit row in a transaction, then hard-deletes the blob after commit so a row failure leaves the file intact — filesystem deletes cannot join the DB transaction).
- **`Project` model** gained `documents(): HasMany`.
- **Audit trail** is the existing `HasUserStamps` macro (uploader = `created_by`, `deleted_by` on delete). The generic domain-event bus remains deferred to Phase 6 — no `DocumentUploaded` event yet.

### HTTP / routing
- **Controllers (skinny, no services — C5):** `DocumentController` (`index/show/store/update/destroy`) and invokable `DownloadDocumentController` (attachment) + `PreviewDocumentController` (inline preview), both returning the model's `StreamedResponse`. `destroy` redirects to the index (not `back()`) so deleting from the show page lands on a valid URL.
- **FormRequests:** `StoreDocumentRequest` (file + metadata + classification; `after()` guard rejecting a marking the project baseline does not `dominates()`; typed `classification()` accessor) and `UpdateDocumentRequest` (metadata-only, same classification guard).
- **API Resource:** `DocumentResource` — `type`/`base_classification` as `{value,label}`, computed `size_label` (`Number::fileSize`), `download_url`, `preview_url`, and `uploaded_by` (`whenLoaded('creator')`). It carries **no per-document `can{}` block**: edit/delete abilities depend only on the project, so the frontend reuses the project-level `ProjectResource.can.update` (avoids an N+1 re-evaluating the policy per row). Upload/edit/delete gate on `ProjectPolicy::update` (editors+, via the FormRequest or `authorize('update')`); index/download rely on the `project.member` membership middleware — **no separate DocumentPolicy**, and the controllers no longer duplicate the middleware's `view` check.
- **Routes** (`routes/dashboard.php`, project-scoped behind `project.member`): `projects.documents.index/show/store/update/destroy`, `projects.documents.download`, and `projects.documents.preview` (write/scoped routes use `scopeBindings()`).
- **Arch allowlist:** `Symfony\Component\HttpFoundation` added for the streamed download response type (A6/C5 note).

## Frontend (Phase 4)
- **Documents index** (`resources/js/Pages/Documents/Index.tsx`) — `PageHeader` + upload modal, a table listing name/type/classification badges/size/uploader, a row-level **Download** anchor (a plain `<a>`, not Inertia `Link`, so the browser performs the download), **Edit** modal, and **Delete** `ConfirmDialog`. Each row is **click-through to the show page** (`router.visit`); the action cell calls `stopPropagation()` so its buttons don't also navigate. Empty-state card when there are no documents.
- **Document show page** (`resources/js/Pages/Documents/Show.tsx`) — back link + title + header **Download**, with a `SectionNav` (`?tab=` query, like Settings) of **Preview / Details / Edit** (Edit only when `project.can.update`). Preview renders an inline `<img>` for images and an `<iframe>` for PDFs (both off `preview_url`), with a download fallback for other types. Edit hosts the shared edit form plus a delete danger action. This is the surface Phase 5 comments will attach to. *(Versions/Attachments were intentionally omitted — no backing models yet.)*
- **Shared partials/utils** — the document edit form was extracted to `Partials/EditDocumentForm` (used inline on the show page and wrapped by `Partials/EditDocumentModal`); the baseline-capped classification list helper lives in `@/utils/classification`.
- **Sidebar** — the previously-disabled **Documents** nav item is now an active link (`components/shell/sidebar-nav`).
- **Types** — `@/types` gained `Document` (incl. `download_url`/`preview_url`), `BaseClassificationValue`, and the ordered `CLASSIFICATIONS` constant.

## Phase 5 Starting Point
Document ingestion (model, storage, controllers, index **and show page**) is in place and the `document` morph alias is registered. The show page is the intended host for comment threads: Phase 5 (Polymorphic Commenting) can hook comments onto `Document` (e.g. a new Comments section/tab on `Documents/Show`) to prove the polymorphic plumbing before wiring it to Tasks. The domain-event/listener foundation is still deferred to Phase 6.

# Implementation Status & Established Conventions (through Phase 5)

This section records what Phase 5 added on top of the Phase 1–4 foundation. Phases 1–5 are complete and fully tested (156 tests passing at the close of Phase 5).

## Product decisions (Phase 5)
- **Threading:** comments are a **flat chronological list** — no nested replies in V1 (a `parent_id` self-reference can be added later without reshaping the schema).
- **Classification:** each comment carries its **own per-field `base_classification`**, constrained by the project baseline (the first per-field marking in the app, proving the `BaseClassification::dominates()` seam beyond the document-level baseline).
- **Permissions:** editors+ create; the **author** edits/deletes their own comment; the project **owner/admin** may delete any comment (moderation); viewers are read-only.

## Backend (Phase 5)

### Data model
- **`comments` table** — polymorphic `$table->morphs('commentable')` (`commentable_id` + `commentable_type` + composite index), `body` text, the `classification()` macro (per-field marking, default UNCLASSIFIED), plus `userStamps()` + `softDeletesWithUserStamps()`. Morph alias `comment`.
- **`Comment` model (rich)** — traits `HasClassification`, `HasFactory`, `HasUserStamps`, `SoftDeletes`; **`#[Fillable]`** limited to `body` + `base_classification` — the `commentable` association is set via the relationship (`$document->comments()->create(...)`), never mass-assigned. Relation `commentable(): MorphTo`; `creator()` from `HasUserStamps`.
- **`Document` model** gained `comments(): MorphMany`. (Wiring comments to `Task` is deferred to Phase 6, when the Task model exists; the factory's `forTask()` state lands then.)
- **Audit trail** is the existing `HasUserStamps` (author = `created_by`). The generic domain-event bus is still deferred to Phase 6 — no `CommentCreated` event yet.

### HTTP / routing
- **Controller (skinny, no services — C5):** `CommentController` — `store/update/destroy` only (comments load with the document show page, so there is no `index`/`show`); each action redirects back. `destroy` calls `$this->authorize('delete', $comment)` then soft-deletes.
- **FormRequests:** `StoreCommentRequest` (`authorize` via `can('create', [Comment::class, $document])`) and `UpdateCommentRequest` (`authorize` via `can('update', $comment)`), both with `body` + `base_classification` rules, the project-baseline `after()` guard (reusing `dominates()`), and a typed `classification()` accessor.
- **API Resource:** `CommentResource` — `body`, `base_classification` as `{value,label}`, `author` (`whenLoaded('creator')` → `{id,name}`), ISO8601 timestamps, and a **per-comment `can{update,delete}` block**. Unlike `DocumentResource` (which reuses a project-level ability block to avoid N+1), comment abilities are per-author, so the per-row block is necessary; `DocumentController@show` sets the `commentable`→`project` relations from the models already in hand so the policy walk adds no per-comment queries and never trips `shouldBeStrict()` lazy-loading.
- **Routes** (`routes/dashboard.php`, project-scoped behind `project.member` + `scopeBindings`): `projects.documents.comments.{store,update,destroy}`.

### Authorization
- **`CommentPolicy`** (auto-discovered) — `create(User, Document)` = `canEdit()`; `update(User, Comment)` = author only; `delete(User, Comment)` = author **or** `canManageMembers()` on the commentable's project.

## Frontend (Phase 5)
- **Documents show page** (`resources/js/Pages/Documents/Show.tsx`) — a new **Comments** tab (`MessageSquare` icon, with a live count) in the existing `SectionNav`, visible to all members (viewers included).
- **Comment thread** (`resources/js/Pages/Documents/Partials/CommentsSection.tsx`) — a composer (editors+ only, `Textarea` + baseline-capped classification `Select`) and a flat list of comment cards (`Avatar` + author + relative timestamp + classification `Badge` + body), each with a `DropdownMenu` exposing inline **Edit** (when `comment.can.update`) and **Delete** via `ConfirmDialog` (when `comment.can.delete`). All actions use `useForm` against the Wayfinder comment routes with `preserveScroll`. No new dependencies — reuses the existing `components/ui` primitives, `formatRelativeDate`/`formatDateTime`, and `@/utils/classification`.
- **Types** — `@/types` gained `Comment` (incl. the `can{}` block); `Document` gained `comments: Comment[]`.

## Phase 6 Starting Point
The polymorphic comment plumbing is proven end-to-end on `Document`. Phase 6 (Task Core Lifecycle) can: register the `task` morph alias, add `Task::comments(): MorphMany`, add the `CommentFactory::forTask()` state, and reuse `CommentsSection` on the task detail view. The `update`/`delete` abilities and `CommentResource` already generalize over any commentable whose project is resolvable via `commentable->project`; only the `create` gate (typed to `Document` today, and the document-scoped `CommentController`/routes) needs a task-scoped counterpart. The generic domain-event/listener foundation (`TaskCreated`/`TaskUpdated`, and retrofitting a `CommentCreated` listener) is also built in Phase 6.

# Implementation Status & Established Conventions (Activity-Logging Foundation — pre–Phase 6)

This section records the append-only audit-log foundation (PRD §9 / FR-9 / A10) built **between Phases 5 and 6**, ahead of the Task work so Tasks inherit auditing for free. Fully tested (164 tests passing).

## Product decisions (Activity-Logging Foundation)
- **One trait, all models:** a single shared concern is applied to every domain model so capture is uniform; a model never hand-rolls its own logging.
- **Append-only is enforced, not just intended:** audit entries are immutable at the Eloquent layer — any attempt to update or delete one throws. The underlying domain data stays mutable; only the trail is frozen. The `activitylog:clean` command is deliberately **not** scheduled.
- **What is logged:** each model's `#[Fillable]` set, dirty values only, empty changesets skipped. The causer is the authenticated user. Secrets are excluded per model (the `User` password is never recorded).
- **Read surface now:** activity is surfaced today on the **Documents show page** (a "History" tab) and the **Project Settings** page (a "History" tab) to prove the read path end-to-end; the Task detail view picks up the same component in Phase 6.

## Backend
- **Package:** `spatie/laravel-activitylog` **5.0.0** (a revised API vs older v4 docs). The trait lives at `Spatie\Activitylog\Models\Concerns\LogsActivity`; the subject relation is **`activitiesAsSubject()`** (not `activities()`); `attribute_changes` is a real column populated natively (shape `{ attributes: {…new}, old: {…prev} }` — `created` omits `old`, `deleted` omits `attributes`); the empty-log toggle is `dontLogEmptyChanges()`. The `properties` column is left free for `withProperties()` (the future per-change **reason** field, §9).
- **Shared trait** — `app/Models/Concerns/LogsModelActivity.php` composes Spatie's `LogsActivity` with `logFillable()->logOnlyDirty()->dontLogEmptyChanges()->useLogName('default')`. Per-model exclusions come from an optional `protected array $activityLogExcept`, read via a `property_exists`-guarded method so Eloquent's `__get` (which would throw under `Model::shouldBeStrict()` for an undeclared property) is bypassed. Applied to **Project, Document, Comment, ProjectInvitation, User**; `User` sets `['password']`.
- **Custom Activity model** — `app/Models/Activity.php` extends Spatie's `Activity` and is registered via `config/activitylog.php` (`activity_model`). Its `booted()` rejects `updating`/`deleting` (append-only). It is intentionally **exempt** from the domain-model arch conventions (no SoftDeletes/HasUserStamps/Fillable/factory/morph alias): `ModelsArchTest` ignores `App\Models\Activity` in the namespace expectations and rejects it from `getModels()`. (The `activity_log` migration was already excluded from `MigrationsArchTest`.)
- **API Resource** — `ActivityResource` (`event`, `description`, `causer` via `whenLoaded`, `attribute_changes`, ISO8601 `created_at`). `DocumentResource` gained `activities` (`whenLoaded('activitiesAsSubject')`, absent on the index to keep it lean). `DocumentController@show` and `ProjectSettingsController` eager-load `activitiesAsSubject` with `causer` (avoids `shouldBeStrict` lazy-loading) and pass it to the page.

## Frontend
- **Reusable component** — `resources/js/components/activity-log.tsx` renders the newest-first trail (causer avatar + event badge + relative timestamp + a compact `old → new` per-field diff), with an empty state. Used by both the Documents show page and the Project Settings page. No new dependencies (reuses `components/ui` primitives + `formatRelativeDate`/`formatDateTime`).
- **Types** — `@/types` gained `Activity`; `Document` gained `activities: Activity[]`.

## Action logging (user actions on resources)
Beyond attribute-change logging (Spatie's auto `created`/`updated`/`deleted`), the trait also records discrete **actions** a user performs on a resource that don't mutate it and so are invisible to the change logger.
- **`ActivityAction` enum** (`app/Enums/ActivityAction.php`, string-backed, `label()`) is the catalog of action verbs: `Downloaded` (wired), `Previewed` / `Exported` (defined for the vocabulary, not yet wired), and — **\[PHASE 6\]** — `Attached` / `Detached` (task document attach/detach) and `DependencyAdded` / `DependencyRemoved` (task predecessor add/remove), all wired. Named to avoid clashing with Spatie's own `ActivityEvent` enum.
- **`LogsModelActivity::logAction(ActivityAction, array $properties = [])`** logs via Spatie's fluent `activity()` logger (`performedOn($this)`, `event(...)`, causer auto-resolved, append-only via the custom `Activity` model). Available on every model, so any resource gets consistent one-line action logging.
- **Metadata seam:** `logAction()` merges a per-model `activityActionMeta()` (returns `[]` today, so nothing extra is persisted) over any explicit `$properties` and writes the result to the entry's existing **`properties`** column (skipped when empty, so it stays null). `activityActionMeta()` is the single place to later add request context (IP, user-agent, …) — every action log picks it up automatically with no call-site changes. No new column or migration.
- **Wired now:** `Document::download()` calls `logAction(ActivityAction::Downloaded)` (the invokable `DownloadDocumentController` stays thin per C5); inline preview is intentionally **not** logged (it fires on every show-page open — noisy view-tracking, deferred). **\[PHASE 6\]** `TaskDocumentController` logs `Attached` / `Detached` (with the document name) and `TaskDependencyController` logs `DependencyAdded` / `DependencyRemoved` (with the predecessor name) on the task subject — both surface in the task's History tab.
- **Read surface:** `ActivityResource` exposes `properties`; `components/activity-log.tsx` maps the action verbs in `EVENT_LABELS` and renders `properties` when present. Action entries (no `attribute_changes`) render cleanly as causer + event badge + time and flow through the same `activitiesAsSubject()` History tab — no new read plumbing.
- **Deferred:** preview/view logging; a subject-less helper for global/account events (`logAction()` always attaches to a resource); populating `activityActionMeta()`.

## Phase 6 hookup
Adding the audit trail to `Task` is a one-liner: `use LogsModelActivity;` on the model. The Task detail view reuses `components/activity-log.tsx` (load `activitiesAsSubject` with `causer`, expose via the task's resource). Task-specific tracked fields (start/end/duration/dependency/lock changes per §9) are captured automatically once those columns are in the model's `#[Fillable]` set. The optional per-change **reason/comment** (§9) remains unbuilt — it will ride on the activity `properties` bag via `withProperties(['reason' => …])` when a UI for it is added.

# Implementation Status & Established Conventions (through Phase 6)

This section records what Phase 6 added on top of the Phase 1–5 + Activity-Logging foundation. Phases 1–6 are complete and fully tested (216 tests passing at the close of Phase 6, including task↔document attachments, task completion, and dependency/attachment audit actions).

## Product decisions (Phase 6)
- **Metadata scope:** Phase 6 ships the **core + simple** task fields — hierarchy, temporal (`start_date` / `duration_days` / derived `end_date` / `is_date_locked`), per-field classification, `status`, `percent_complete`, `risk_level`, `organization` (a string tag), and `tags` (json). Relational assignees/teams/watchers and their assignment/watch events are **deferred** (they pair with the notification engine).
- **Temporal model:** `end_date` is **derived, not stored** (A5): `endDate()` = `start_date` + (`duration_days` − 1) at **calendar-day grain**. Workday/holiday-aware computation (FR-5/§5) is a documented future swap point on that single method, landing with project calendars. No cascading propagation (manual `is_date_locked`, default true).
- **Reparenting deferred:** `parent_id` is settable only on create; the depth-cap (five tiers) and same-project guards live in `StoreTaskRequest::after()`. Drag-reorder / move-parent UI is a Phase 7 (Gantt) concern.
- **Dependencies:** finish-to-start with multiple predecessors (FR-3), stored as a **plain self-referencing pivot** (`task_dependencies`, no Eloquent model — like `project_user`). V1 **blocks** edges that would close a cycle (FR-6) via `Task::wouldCreateCycle()`; propagation/line-drawing visualization is Phase 7. Adding/removing a predecessor is recorded in the task's audit trail via `logAction()` — `ActivityAction::DependencyAdded` / `DependencyRemoved` verbs, with the predecessor name in the entry `properties`.
- **Document attachments (§7):** tasks can attach existing project documents **and** upload-and-attach in one step, via a **plain `document_task` pivot** (a document may attach to many tasks; detaching never deletes the document). This is the §7 "Attachments" the Phase-4 show page deferred. Attachments are project-scoped (a document and the task must share a project). Attach/detach are recorded in the task's audit trail via `logAction()` — new `ActivityAction::Attached` / `Detached` verbs, with the document name in the entry `properties`.
- **Task completion:** a one-click "mark complete" (sets `status` = complete, `percent_complete` = 100). A parent with incomplete descendants must explicitly opt into cascading — the request rejects completing it otherwise (`include_subtasks`), and the UI confirms before marking the whole subtree complete. Each affected task dispatches `TaskUpdated` (so the change rides the event bus and the audit trail).

## Backend (Phase 6)

### Enums
- **`TaskStatus`** (`NotStarted` / `InProgress` / `Blocked` / `Complete`) and **`RiskLevel`** (`Low` / `Medium` / `High`), both string-backed with `label()`.

### Data model
- **`tasks` table** — `project_id` (cascade), self-referencing `parent_id` (nullable, cascade), `name`, `description`, `start_date` (nullable), `duration_days` (default 1), `is_date_locked` (default **true**), `hierarchy_level` (1–5), `sort_order`, `status`, `percent_complete`, `risk_level`, `organization` (nullable), `tags` (json), the `classification()` macro, plus `userStamps()` + `softDeletesWithUserStamps()`. Indexes on `(project_id, parent_id)` and `(project_id, sort_order)`. Morph alias `task`.
- **`Task` model (rich)** — traits `HasClassification`, `HasFactory`, `HasUserStamps`, `LogsModelActivity`, `SoftDeletes`; `const MAX_DEPTH = 5`; **`#[Fillable]`** limited to user-editable fields (structural `project_id`/`parent_id`/`hierarchy_level`/`sort_order` are set explicitly by the controller). Relations `project()`, `parent()`, `children()` (ordered), `comments()` MorphMany, `predecessors()`/`successors()` (belongsToMany over `task_dependencies`). Scopes `forProject`/`roots`/`ordered`. Domain methods `endDate()`, `canHaveChildren()`, `wouldCreateCycle()`, plus completion helpers `descendantIds()` (BFS), `hasIncompleteDescendants()`, and `markComplete(bool $includeSubtasks)` (returns the updated tasks). A `deleting` booted hook soft-deletes the whole subtree (model-owned multi-write, per C5).
- **`task_dependencies` table** — plain pivot: `predecessor_id` + `successor_id` (FK tasks, cascade), `type` (default `finish_to_start`), `userStamps()` + `softDeletesWithUserStamps()`, `unique([predecessor_id, successor_id])`.
- **`document_task` table** — plain pivot: `document_id` + `task_id` (FK cascade), `unique([document_id, task_id])`. Relations `Task::documents()` / `Document::tasks()` (belongsToMany). The upload path was factored onto the model as `Document::storeUploadedFile()` (blob write + server-derived metadata, per C5) and is shared by `DocumentController@store` and `UploadTaskDocumentController`.
- **`Project`** gained `tasks(): HasMany`; **`Document::comments()`** plumbing reused — `Task::comments()` is the second polymorphic host. `CommentFactory::forTask()` state added (the Phase-5 stub).
- **Audit trail** is the existing `LogsModelActivity` one-liner (no new mechanism). The Task detail view reuses `components/activity-log.tsx`.

### Domain event/listener foundation (the bus deferred since Phase 3)
- **`App\Events\TaskCreated` / `TaskUpdated` / `CommentCreated`** — thin (`Dispatchable` + `SerializesModels`), carrying only the affected model (A10).
- **`App\Listeners\RecordDomainEventTelemetry`** — the first subscriber: simple, **synchronous (immediate)**, union-typed `handle()` (auto-discovered), logging a telemetry line so the bus is observable. This is the seam future notification-delivery listeners attach to without touching dispatch sites. It is **complementary** to Spatie audit logging, not the same mechanism.
- **Dispatch sites:** `TaskController@store`/`@update`; `CompleteTaskController` (one `TaskUpdated` per task in the completed subtree); `CommentController@store` and `TaskCommentController@store`. `App\Events` added to the `ControllersArchTest` allowlist (A6/C5).

### HTTP / routing
- **Controllers (skinny, no services — C5):** `TaskController` (`index` builds the nested tree from one query; `show` loads subtree + comments + `activitiesAsSubject` + `predecessors` + `documents`, and passes `availableTasks` for the dependency picker and `projectDocuments` for the attach picker; `store` derives `parent_id`/`hierarchy_level`/`sort_order`; `destroy` soft-deletes the subtree and redirects to the index). `TaskCommentController` (`store/update/destroy`), `TaskDependencyController` (`store/destroy`), `TaskDocumentController` (`store`=attach existing / `destroy`=detach), and invokable `UploadTaskDocumentController` (upload-and-attach) and `CompleteTaskController` (mark complete, optionally cascading). `TaskDependencyController` and `TaskDocumentController` also write `logAction()` audit entries (dependency added/removed, document attached/detached).
- **FormRequests:** `StoreTaskRequest` / `UpdateTaskRequest` (core-field rules; `after()` classification + depth/same-project guards), `StoreDependencyRequest` (self/duplicate/cross-project/cycle guards), `StoreTaskDocumentRequest` (same-project + no-duplicate attach guards), and `CompleteTaskRequest` (`include_subtasks`; `after()` rejects completing a parent with incomplete descendants unless they're included). `StoreCommentRequest` generalized to resolve the commentable from `route('document') ?? route('task')`.
- **API Resources:** `TaskResource` (Labeled status/risk/classification, computed `end_date`, recursive `children`, and `predecessors`/`successors`/`documents`/`comments`/`activities` `whenLoaded`; **no per-task `can{}`** — abilities reuse `ProjectResource.can.update`, per `DocumentResource`). `DependencyResource` (minimal `{id, name}` for the predecessor/successor lists and the dependency picker); attached documents reuse `DocumentResource`.
- **Routes** (`routes/dashboard.php`, project-scoped behind `project.member` + `scopeBindings`): `projects.tasks.{index,store,show,update,destroy}`, `projects.tasks.complete`, nested `projects.tasks.comments.*`, `projects.tasks.dependencies.*` (the dependency `destroy` scopes its `{predecessor}` through the `predecessors` relationship), and `projects.tasks.documents.{store,upload,destroy}`.

### Authorization
- **`CommentPolicy::create`** generalized to `Document|Task`, gating on the commentable's project role (`canEdit()`); `update`/`delete` already generalized. No separate `TaskPolicy` — task abilities ride on `ProjectPolicy::update` (editors+), with the `project.member` middleware as the membership gate.

## Frontend (Phase 6)
- **Shared comment thread** — `components/comments-section.tsx` (commentable-agnostic `CommentsThread`, driven by route-URL builders). `Documents/Partials/CommentsSection` is now a thin wrapper over it; the task detail page drives it with the task comment routes.
- **Pages** (`resources/js/Pages/Tasks`): `Index` (a collapsible nested **task tree** with create/add-child/edit modals + delete confirm, a per-row **Mark complete** action, depth-capped parent picker, click-through to detail, empty state) and `Show` (back link + `SectionNav` tabs **Details / Comments / Dependencies / Attachments / History / Edit**). `Partials/TaskForm` (shared create/edit form; tags entered comma-separated, transformed to an array on submit) and `Partials/badges.ts` (status/risk badge tones + tooltips + `flattenTasks` / `hasIncompleteSubtasks` / `countIncompleteSubtasks`). Marking a parent with incomplete subtasks complete opens a `ConfirmDialog` that cascades (`include_subtasks`). The Details tab lists the task's direct subtasks (name + status + percent, each linking to its own detail page) so nesting stays visible from the show page. The Attachments tab attaches existing project documents or uploads new ones (reusing `Documents/Partials/UploadDocumentModal`, now accepting an `action` override). The Dependencies tab shows both directions — **Depends on** (editable predecessors) and **Required by** (read-only successors, managed from each successor's own tab); `TaskResource` exposes both `predecessors` and `successors`.
- **Primitives:** new `components/ui/tooltip.tsx` (a fixed-position tooltip portaled to `document.body` so overflow containers don't clip it), used across the task-tree row actions and the status/risk badges.
- **Sidebar:** the previously-disabled **Tasks** nav item is now an active link (`components/shell/sidebar-nav`). **Timeline** stays disabled until Phase 7.
- **Types:** `@/types` gained `Task` (incl. `predecessors` / `successors` / `documents`), `TaskStatusValue`, `RiskLevelValue`, `Dependency`, and the ordered `TASK_STATUSES` / `RISK_LEVELS` constants.

## Phase 7 Starting Point
Task CRUD, the recursive tree, temporal logic, dependencies (both directions), comments, document attachments, task completion, audit (including dependency/attachment actions), and the generic event bus are all in place — delivering the clean nested task arrays (TaskResource) the A11 Gantt engine consumes. Phase 7 (UI Design System & Gantt State Engine) layers the deterministic Zustand viewport store + row virtualization on top, designed so date propagation can later mutate bar positions through the same engine. Drag-reorder/move-parent, workday-aware `endDate()`, and the notification-delivery listeners (on the Phase 6 bus) remain future work.

# Implementation Status & Established Conventions (through Phase 7)

This section records what Phase 7 added on top of the Phase 1–6 + Activity-Logging foundation. Phases 1–7 are complete and fully tested (262 tests passing at the time of writing). Phase 7 was built incrementally (7.0–7.7) and then extended with several follow-on enhancements (workday-aware scheduling, axis polish, a today marker, navigation controls, and task reordering).

## Product decisions (Phase 7)
- **Gantt is the timeline surface:** a dedicated `projects.timeline` page (sidebar "Timeline" item), separate from the `Tasks/Index` tree. Both consume identical nested `TaskResource` arrays via `Project::taskTree()`.
- **Deterministic, externally-managed viewport (A11):** all layout (visible-row list + integer-pixel coordinates) is computed in a Zustand store outside the React render loop; components are purely presentational and read the precomputed `layout`.
- **Zoom-adaptive level of detail (FR-15):** day / month / quarter / year. Zooming out folds deeper hierarchy tiers (`ZOOM_CONFIG[zoom].maxDepth` = 5/4/3/2) and switches the axis calendar units.
- **Drag-to-reschedule:** dragging a bar body moves `start_date`; dragging the right edge changes `duration_days`; both snap to whole days. Dragging a task **auto-unlocks** it (`is_date_locked = false`) — the user is taking explicit manual control (resolves the default-locked-on-create tension). Editors+ only.
- **Workday-aware scheduling (FR-5) — now implemented:** tasks carry a `duration_unit` (`work_days` default / `calendar_days`); `Task::endDate()` derives the inclusive end via a project `WorkCalendar` (weekends excluded by default). This realises the workday-aware §5/FR-5 requirement that Phase 6 had stubbed as calendar-day-only. Custom holidays / per-project calendar settings remain a future enhancement (the calendar is currently the Sat/Sun default).
- **Sibling reordering:** tasks can be reordered among their siblings (same `parent_id`, project-scoped) by **drag** (a row grip handle with a drop indicator) **or** up/down **buttons**, backed by `spatie/eloquent-sortable`. Reparenting / move-to-different-parent is **not** in scope (still deferred).
- **Deferred (still future work):** schedule baselines & comparison (FR-17/§14), screenshot export (FR-8), automatic date propagation, reparenting, and the notification-delivery layer.

## Backend (Phase 7)
- **`TimelineController`** (invokable) → `Inertia::render('Timeline/Show')` with `ProjectResource` + `TaskResource::collection($project->taskTree(['creator', 'predecessors']))`. `Project::taskTree(array $with = ['creator'])` is the shared one-query nested-tree builder (also used by `TaskController@index`; the timeline additionally eager-loads `predecessors` for the dependency lines).
- **Workday calendar (`app/Support`):** `WorkCalendar` (non-working weekdays, JS-compatible `0=Sun…6=Sat`; `default()` = Sat/Sun; `isWorkingDay()`, `endDateForWorkDays()`) and `Schedule::endDate(start, durationDays, DurationUnit, WorkCalendar)`. `Project::workCalendar()` returns the default for now and is exposed on `ProjectResource` as `work_calendar`. `DurationUnit` enum (`calendar_days` / `work_days`, `label()`); added to the `tasks` table via the `add_duration_unit_to_tasks_table` migration and to `Task` `#[Fillable]`/casts; `TaskResource` exposes `duration_unit` as `{value,label}`.
- **Reschedule:** invokable `RescheduleTaskController` + `RescheduleTaskRequest`; route `projects.tasks.reschedule` (PATCH). Sets `start_date`/`duration_days`, clears `is_date_locked`, dispatches `TaskUpdated`, redirects `back()` (so the timeline reloads in place rather than navigating to the task detail page — the generic `update` action still redirects to `show`).
- **Reorder:** `Task` implements `Spatie\EloquentSortable\Sortable` (`SortableTrait`, `$sortable` on `sort_order`, `sort_when_creating = false`); `buildSortQuery()` scopes neighbours to `project_id` + `parent_id` (sibling-relative). Invokable `ReorderTasksController` + `ReorderTaskRequest` (route `projects.tasks.reorder`, PATCH, declared **before** the `/tasks/{task}` routes to avoid param capture). The request guards that `ordered_ids` is **exactly** the sibling group (rejects foreign/missing/partial sets); the controller calls `Task::setNewOrder()` in a transaction and records an `ActivityAction::Reordered` audit entry on the parent task (or the project for root-level reorders). No `TaskUpdated` (nothing schedule/content changed).
- **`ActivityAction`** gained `Reordered`. Arch allowlist unchanged (the new controllers use only already-permitted layers).

## Frontend (Phase 7)
- **State engine (`stores/useGanttStore.ts`, Zustand):** holds `tasks`, `zoom`, `collapsed`, `viewportWidth`, an **extendable** `rangeStart`/`rangeEnd`, and `anchorToken`/`anchorScroll`; recomputes `layout` eagerly in each action. Actions: `init`, `setTasks`, `setZoom`, `setViewportWidth`, `extendRangeStart`/`extendRangeEnd` (infinite scroll), `goToWeek` (Today/jump), `reorderSiblings` (optimistic), `toggleCollapse`/`expandAll`/`collapseAll`.
- **Pure modules:** `utils/gantt.ts` (integer-pixel geometry constants + date↔pixel helpers incl. `addDays`/`startOfWeek`/`endOfWeek`), `utils/ganttLayout.ts` (`computeLayout` → flat rows with `siblingIds`, `computeRange`, `reorderTree`, `collectParentIds`), `utils/ganttAxis.ts` (three-tier `buildAxis`: primary/secondary/tertiary bands with day/weekday/month/quarter/**fiscal-year** units, weekend flags), and `utils/date.ts`.
- **Components (`Pages/Timeline/`):** `Show.tsx` (full-bleed page + store sync + empty state with a "New task" CTA), `GanttChart.tsx` (single scroll container; sticky three-tier axis header; sticky-left virtualized tree pane via `@tanstack/react-virtual`; toolbar with prev/Today/next, expand/collapse-all, zoom control), and partials `TimelineAxis`, `TaskBar`, `TaskBarTooltip`, `DependencyLayer` (FtS connector SVG), `WeekendBands`, `TodayLine` (dotted red current-day marker), `ZoomControl`, plus `barAppearance.ts`. Custom-pointer hooks: `useGanttDrag` (reschedule), `useGanttReorder` (sibling drag), and header click-drag panning — no DnD/gesture dependency.
- **Interactions:** infinite horizontal scroll (range grows near either edge, left-extension compensated so there is no jump); header drag-to-pan; prev/next/Today buttons; keyboard hotkeys (`d/m/q/y` zoom, `t` Today). Bars show status fill, percent-complete, risk stripe, organization tag, and a manual-lock icon. Reorder shows a grip handle + drop indicator and up/down buttons (editors only).
- **New dependencies:** `zustand`, `@tanstack/react-virtual` (frontend); `spatie/eloquent-sortable` (backend).
- **Layout primitive:** `layouts/app-layout` gained a `fullBleed` mode so the Gantt fills the viewport (no centered max-width column).

## Seeders
- **`TaskSeeder`** seeds a realistic multi-tier operational-test campaign (the "F-35 Block 4 Operational Test Campaign") into a project — five phases, three levels deep (~21 tasks), staggered dates straddling today, varied status/risk/organization/tags, finish-to-start dependencies, and a couple of unlocked tasks for drag demos. Runs standalone or is driven by `DatabaseSeeder` (which also creates the `test@example.com` user and a few extra projects for index/switcher variety).

## Next-phase starting point
The interactive Gantt is complete and feeds off the existing `TaskResource`. Remaining V1-scope work not yet built: **schedule baselines & comparison (FR-17)** — which pairs naturally with the timeline (slippage overlays) — and **screenshot export (FR-8)**. The roadmap's next named phase is **Notification Engine Deployment**, built on the Phase 6 event bus. Automatic date propagation, reparenting, and per-project calendar/holiday settings remain documented post-MVP enhancements.

# Implementation Status & Established Conventions (through Phase 8)

This section records what Phase 8 (Schedule Rules Engine) added on top of the Phase 1–7 foundation. Phases 1–8 are complete and fully tested (270 unit/feature tests + browser suite passing at the close of Phase 8).

## Product decisions (Phase 8)

- **Push-only propagation:** when a predecessor's (derived) end moves such that a successor would start on or before it, unlocked successors slide to the earliest valid start (`predecessor end + 1 day` per the successor's `duration_unit`/work calendar), duration preserved. Moving a predecessor **earlier never pulls successors back** — deliberate slack/buffers survive. Multiple predecessors = max constraint (§4).
- **3-lock model (FR-7 target, delivered):** `is_date_locked` was dropped and replaced by independent `lock_start` / `lock_end` / `lock_duration` booleans; at most **two of three** may be set (two locks derive the third — fully pinned). Migration mapped `true` → start+duration locked (pinned, preserving V1 protection) and `false` → duration-only (slides freely). One-lock semantics: pinned start (or end+duration) ⇒ the engine never moves it (conflict instead); **end-only lock = deadline** — a push compresses the duration against the fixed end (min 1 day, then conflict); duration-only/none ⇒ slides.
- **Locks bind the engine, not the user:** dragging a bar or editing the form is an explicit manual act — new dates apply and lock flags stay as they were (replaces Phase 7's drag auto-unlock). The edited task is likewise pinned for that propagation run, so the engine never "bounces" an explicit placement; any violation it creates surfaces as a conflict.
- **Dry-run + confirm:** every schedule-affecting edit (Gantt drag, task form, new dependency) runs the engine as a preview first. A cascade introducing **new conflicts** is not committed — the preview (moves + conflicts) is flashed back (`flash.schedulePreview`) and the client resubmits with `confirm: true` or cancels. Non-conflicting cascades commit silently with a count in the status flash ("Task rescheduled — 3 dependent tasks moved."). Task create/delete roll-ups commit without a confirm gate (delete can only shrink envelopes; create surfaces conflicts via derived state).
- **Conflicts are derived, never stored:** a conflict is `successor.start_date <= predecessor.endDate()` computed from data (engine: `ScheduleGraph::conflicts()`; read side: `Task::scheduleConflictIds()`, exposed as `schedule_conflicts` when `predecessors` are loaded). Locked tasks never move automatically; confirmed edits leave the violated edge flagged until the user unlocks, reschedules, or removes it.
- **Parent roll-up (§2 rolled-up schedules):** a task with children carries **engine-maintained denormalized envelope dates** (start = min child start; end = max child end; all-unscheduled subtree ⇒ unscheduled). Stored-but-recomputed so `taskTree()`/`TaskResource` stay one-query. Parent dates are read-only (FormRequests reject changes; the form shows a derived summary; parent bars aren't draggable); parent lock flags are inert (children govern). An envelope inexpressible in the parent's duration unit falls back to calendar days. When a dependency pushes a *parent*, its children move **minimally** (slack inside the group compresses first), not as a rigid shift.
- **Hierarchy-aware cycle detection (FR-6):** dependencies between a task and its own ancestor/descendant are rejected outright, and `wouldCreateCycle` now detects loops *through* the hierarchy (pushing a subtree grows ancestor envelopes, which push their dependency successors…) via a monotone closure — not just plain edge cycles.

## Backend (Phase 8)

- **Inverse date math:** `WorkCalendar` gained `nextWorkingDay()`, `startDateForWorkDays()`, `workDaysBetween()`; `Schedule` gained `startDate()`, `durationBetween()` (null for impossible spans, mirroring the TS contract), and `nextStartAfter()`. All mirror `resources/js/utils/schedule.ts` exactly (unit-tested parity, e.g. Friday end → Monday start for work-day successors).
- **Engine (`app/Support/Propagation/`, pure — no Eloquent/DB/HTTP, enforced by `SupportArchTest`):** `TaskNode` (schedule snapshot + lock predicates), `ScheduleGraph` (whole-project snapshot: nodes, FtS edges, calendar; envelope helpers, `conflicts()`, `wouldLoop()`), `SchedulePropagator::propagate()` (single pass: dependency edges expanded to leaf level, Kahn topological order, per-leaf constraint evaluation honoring locks, then bottom-up roll-up — terminating by construction), and value objects `TaskMove` (with reason `dependency_push` / `deadline_compression` / `rollup` + cause attribution), `ScheduleConflict`, `PropagationResult` (`newConflictsVersus()`, `pushedMoves()`, `toPreviewPayload()`).
- **Orchestration (C5 — rich models, no service layer):** `Project::scheduleGraph(overrides, extraEdges)` (two queries; seed edits applied in-memory; not-yet-attached edges previewable), `previewSchedule()`, and `commitSchedule(result, cause)` (transaction; per moved task: update with Spatie auto-log disabled, one `logAction(ActivityAction::SchedulePropagated, …)` entry attributing the cause + reason + old/new values, and a `TaskUpdated` dispatch).
- **Schema:** `replace_date_lock_with_schedule_locks` (add 3 lock columns → backfill → drop `is_date_locked`); `backfill_parent_rollup_dates` (pure roll-up over raw rows, per project). `Task` gained lock helpers (`lockCount()`, `isFullyPinned()`, `startIsPinned()`), a `saving` invariant (throws over 2 locks), `scheduleConflictIds()`, and `sharesLineageWith()`; `TaskFactory` states are now `pinned()` / `unlocked()` / `startLocked()` / `endLocked()`.
- **HTTP:** no new routes. `RescheduleTaskController`, `TaskController@update`, and `TaskDependencyController@store` all run preview → (maybe) flash `schedulePreview` → commit + cascade; `TaskController@store/@destroy` commit roll-ups directly. FormRequests gained the three lock rules + max-2-of-3 `after()` guard, parent schedule-edit guards (changes only — resubmitting derived values is fine), the ancestor/descendant dependency guard, and a `confirm` rule. `HandleInertiaRequests` shares `flash.schedulePreview`. Controller arch allowlist gained `App\Support`.

## Frontend (Phase 8)

- **Types:** `Task` carries `lock_start`/`lock_end`/`lock_duration` + `schedule_conflicts?: number[]`; `SharedProps.flash.schedulePreview` is typed (`SchedulePreview` with `moves`/`conflicts`).
- **Lock UI:** the three existing schedule-form modes map 1:1 onto lock combinations (`start_duration` → start+duration, `start_end` → start+end, `fixed_duration` → duration only) via `inferScheduleMode()`/`locksForScheduleMode()`; shared lock helpers (`scheduleLockCount`, `isFullyPinned`, `describeScheduleLocks`) live in `utils/schedule.ts`. Bars show a lock icon for any *date* lock (dimmed when not fully pinned); the task Show page describes the active combination. Parent forms render a read-only "derived from subtasks" schedule row and pass stored values through verbatim.
- **`components/schedule-preview-dialog.tsx`:** the dry-run confirmation — lists conflicted dependencies and the tasks that would move, then resubmits the flashed `input` + `confirm: true` to the originating route (reschedule/update/dependency) or cancels. Mounted on the Timeline, Tasks index, and task Show pages.
- **Conflict surfacing:** `DependencyLayer` renders violated edges as dashed red connectors with a red arrowhead (`data-conflict`); `TaskBar` shows a `TriangleAlert` badge + a tooltip "Conflict" row; the Show page's Dependencies tab badges conflicted predecessors. Parent bars are non-interactive (leaf-only dragging).
- **Cascade rendering needed zero new plumbing:** drags already reload the full task tree (`setTasks` → deterministic relayout), so backend-moved successors render automatically.

## Seeders

- `TaskSeeder` is reactive-by-default (duration-only locks; blueprint nodes opt into `pinned`), normalizes the seeded schedule through the engine (parents become true envelopes, violated movable successors are pushed), and plants one deliberate conflict — a date-pinned "DV Day Demonstration" scheduled before its EW-suite predecessor can finish — so the red dashed conflict treatment is visible out of the box.

## Next-phase starting point

The schedule is now fully reactive. Remaining V1-scope work: **schedule baselines & comparison (FR-17/§14)** and **screenshot export (FR-8)**. The roadmap's next named phase is **Notification Engine Deployment** (on the Phase 6 event bus). Documented future enhancements that now have natural seams: per-edge lag/lead (a column on `task_dependencies` consumed by `Schedule::nextStartAfter`), per-project calendars/holidays (hydrate `Project::workCalendar()`), a fourth "deadline" form mode (`lock_end` only — already engine-supported), and reparenting (the roll-up + cycle closure already model hierarchy coupling).

# Architecture Issues - Resolved

Both architecture-review conflicts have been resolved and folded into the sections above:

- Isolation model: Organization is removed as a tenancy entity; the Project is the isolation boundary, owned by its creating user, who invites editors and viewers. "Organization" survives only as a descriptive task tag.
- Task date defaults: V1 uses manual dates with is_date_locked defaulting to true and no cascading propagation. The independent-lock model and propagation are documented as the post-MVP target.