# Migrations

A **history log** of every schema change to Redis data. Not auto-run by the
deploy pipeline — files here exist as a paper trail so:

1. A reviewer can scan one chronological list and know exactly what shape
   every key has had over time.
2. When a change requires backfilling existing rows, the script lives next
   to its record and can be invoked manually (temporary dev-admin route,
   removed in the same PR).
3. Code reviewers on schema PRs have a single artifact to look at.

## When to add a migration file

| Change | Add a file? |
|---|---|
| Add an optional field with a default in `getX()` | No — reader handles missing values |
| Add a **required** field to existing rows | **Yes** |
| Rename a field (e.g. `owner` → `ownerUsername`) | **Yes** |
| Change value encoding (JSON ↔ flat, comma-list ↔ set) | **Yes** |
| Add a brand-new key namespace | No (the helpers in `core/*.ts` are the record) |
| Drop a field | Optional — only if you want cleanup |

When in doubt: would old rows written before this PR behave wrong under
the new code? If yes, add a migration. If they'd default cleanly, don't.

## File format

```
NNNN-short-description.ts
```

Numbered sequentially (`0001`, `0002`, ...). The file exports:

```ts
export const meta = {
  id: 'NNNN-short-description',
  date: 'YYYY-MM-DD',
  author: 'reddit-username',
  // Brief explanation of what's changing and WHY. The why is the
  // important part — code shows the what.
  description: '...',
  // Keys touched. Helps future readers grep.
  keys: ['player:{id}', 'user:{username}'],
};

// Optional: the backfill script. Omit entirely if no backfill is
// needed (the file is then pure documentation).
export async function up(): Promise<{ scanned: number; migrated: number }> {
  // e.g. iterate every player:* hash and set the new field.
  // MUST be idempotent — running twice should not double-migrate.
}
```

## Running a backfill

Migrations are **not** auto-executed. The flow:

1. In the same PR, temporarily wire `up()` into a route in the dev-admin
   block of `src/server/index.ts` (inside the
   `if (process.env.NODE_ENV !== 'production')` guard):

   ```ts
   import { up as up0001 } from './migrations/0001-add-player-skin-colors';
   devAdmin.post('/migrate/0001', async (c) => c.json(await up0001()));
   ```

2. `devvit playtest` so the new server picks up the change.
3. Hit the route via the dev-tools admin panel (or `curl`).
4. Watch logs, confirm output.
5. **Remove the temporary route in the same PR** before merging — the
   migration file stays as the historical record; the route doesn't.

For production: same shape, but the route should be guarded by
`adminProcedure` on `trpc` so only creator-admins can invoke it. Remove
after a single confirmed run.

## Reader defensiveness is the safety net

Every `getX` parser in `core/*.ts` defaults missing fields (`Number(raw.x ??
0)`, `try { JSON.parse } catch`). Keep doing this even when adding
migrations — it's what makes a forgotten migration a paper-trail problem
instead of a data-integrity problem.
