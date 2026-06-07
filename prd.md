**Product Requirements Document (PRD)**

Operational Test Timeline & Dependency Management Platform

_Version 9 - Phases 1–4 Implemented (Architecture, Auth & RBAC, Project Topologies + Workspace Shell + Membership, Document Ingestion)_

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
- **\[ARCHITECTURE\]** Controller arch-test allowlist (A6) was updated accordingly. Controllers may use: `App\Http\Requests`, `App\Http\Resources`, `App\Mail`, `App\Models`, `Illuminate\Http`, the `DB` and `Mail` facades, `AuthorizesRequests`, `Inertia`, and the `redirect` helper. **\[PHASE 4 UPDATE\]** `Symfony\Component\HttpFoundation` was added for streamed file-download responses (the document download controller returns a `StreamedResponse`); the file I/O itself stays on the model, not the controller. The earlier "controllers must not touch the DB facade" rule was **removed** as too restrictive (it forced needless indirection); transactions and raw queries are permitted but, by the convention above, generally live on models.
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

### Phase 5 - Polymorphic Commenting Infrastructure

Deploy the polymorphic comment schema and hook threads onto Document first to prove the plumbing across the API boundary before wiring it to Tasks.

### Phase 6 - Task Core Lifecycle & Temporal Logic Plumbing

Build atomic CRUD for the 5-tier recursive Task structure. Per C5 (no service layer), `start_date`/`duration_days` logic lives on the `Task` model (domain methods + scopes) with controllers staying thin; keep MVP logic simple (manual locking first) before layering in cascading propagation. Dispatch domain events (TaskCreated, TaskUpdated) on create/update and register simple immediate listeners for internal state and system logging — this is where the generic event/listener foundation (deferred in Phase 3) gets built.

### Phase 7 - UI Design System & Gantt State Engine

Lock the component rules - button variants, typography scale, responsive layout wrappers - then build the deterministic Zustand-based viewport store with row virtualization that drives five-level Gantt visibility, designed so date propagation can later mutate bar positions through the same engine.

### Future Phase - Notification Engine Deployment

Add new listeners (e.g., SendTaskAssignmentNotification) that handle delivery criteria, per-user preferences, batching/throttling, and message queuing - built on top of the Phase 6 event foundation without altering it.

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

# Architecture Issues - Resolved

Both architecture-review conflicts have been resolved and folded into the sections above:

- Isolation model: Organization is removed as a tenancy entity; the Project is the isolation boundary, owned by its creating user, who invites editors and viewers. "Organization" survives only as a descriptive task tag.
- Task date defaults: V1 uses manual dates with is_date_locked defaulting to true and no cascading propagation. The independent-lock model and propagation are documented as the post-MVP target.