export type ChangelogEntry = {
  version: string;
  date: string;
  items: string[];
};

export const APP_VERSION = __APP_VERSION__;

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.2.0',
    date: '2026-08-18',
    items: [
      'Added transactional workspace ownership transfer and self-service collaborator departure.',
      'Added safe account deletion that requires shared ownership to be transferred or deleted first.',
      'Added private, membership-authorized board Presence with an online collaborator indicator.',
      'Preserved invitation revocations and added immutable owner-only workspace audit history with CSV export.',
      'Preserved shared boards and invitation attribution when a contributing user deletes their account.',
      'Expanded live Supabase, browser, deployment, and CI verification for the complete collaboration lifecycle.',
    ],
  },
  {
    version: '0.1.0',
    date: '2026-08-18',
    items: [
      'Added multi-board workspaces with owner, editor, and view-only collaborator roles.',
      'Added secure, expiring invitation links with optional email binding and one-time acceptance.',
      'Added realtime board, comment, activity, member, and board-list synchronization.',
      'Migrated legacy personal boards safely to board-scoped tenancy with RLS on every shared data path.',
      'Added durable database-backed write limits, request IDs, structured server-error logs, and expanded release verification.',
      'Added responsive workspace switching and collaboration management without increasing the 12-function Vercel footprint.',
    ],
  },
  {
    version: '0.0.4',
    date: '2026-08-17',
    items: [
      'Fixed partial task updates so unrelated edits never clear the due date.',
      'Hardened API validation, malformed-response handling, and database error privacy.',
      'Removed vulnerable type-only deployment tooling and updated the dependency graph to zero known advisories.',
      'Improved stacked-dialog keyboard focus and kept failed comment drafts intact for retry.',
      'Reduced board and stats query payloads and added database-level payload constraints.',
      'Made task relations and demo seeding recover safely from partial API failures, and isolated x402 from normal stats requests.',
      'Added a strict deployment security policy, private API caching rules, and CI verification for the Vercel configuration.',
      'Split the root application into focused header, summary, workspace-manager, dialog, and release-data modules.',
      'Aligned due-date filters, stats, and demo data with the browser\'s local calendar across time zones.',
      'Moved network write throttling ahead of authentication and made stored activity history append-only.',
      'Made clear-board transactional and standardized missing-record responses across destructive APIs.',
    ],
  },
  {
    version: '0.0.3',
    date: '2026-06-18',
    items: [
      'Premium design pass: a full design-token system (spacing, radius, type, elevation, motion).',
      'Refreshed surfaces with softer radii, layered depth, a signature accent, and a glass header.',
      'Elevated stats with animated count-up, refined cards, and a more inviting empty state.',
      'Added a dark mode with a one-tap theme toggle.',
      'Tactile micro-interactions (press feedback) and AA-contrast, 44px touch targets throughout.',
    ],
  },
  {
    version: '0.0.2',
    date: '2026-06-18',
    items: [
      'Drag a card from anywhere on its body; a dedicated edit icon opens the detail drawer.',
      'Added a Clear board action to reset the board to an empty state.',
      'Atomic, transactional task reorder plus faster single-task hydration on the API.',
      'Granular activity events for assignee and label changes.',
      'Unit + component tests, two-user RLS isolation checks, CI, and a root error boundary.',
    ],
  },
  {
    version: '0.0.1',
    date: '2026-06-18',
    items: [
      'Added mobile status navigation and compact stats so every lane is discoverable at phone width.',
      'Added repeatable browser smoke coverage for create, edit, comment, filter, and drag/drop workflows.',
      'Refined drag/drop animation with long-press card activation, immediate handle drag, and stable overlay sizing.',
      'Added active filter chips, manual sync status, inline column task capture, and richer activity details.',
      'Improved task and workspace dialogs with focus handling, Escape close, and clearer keyboard states.',
      'Added this in-app changelog behind the version number.',
    ],
  },
];
