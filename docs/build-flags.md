# Build & CLI Flags

Notes on environment flags this project uses. None of these are secrets.

## `DEVVIT_ALLOW_SOURCE_UPLOAD=1`

Tells the Devvit CLI to skip the interactive "may we upload your source?"
prompt during `devvit publish`.

**Where it actually takes effect:** it is passed inline on the publish
command, which is the allow-listed form in `.claude/settings.local.json`:

```
DEVVIT_ALLOW_SOURCE_UPLOAD=1 npx devvit publish --public
```

**Why it is NOT in `.env`:** the CLI reads this flag straight from the
process environment —

```js
// node_modules/@devvit/cli/dist/lib/config.js
export const DEVVIT_ALLOW_SOURCE_UPLOAD = () =>
  process.env.DEVVIT_ALLOW_SOURCE_UPLOAD === '1';
```

It does **not** load `.env` into `process.env` for this flag. A line in
`.env` reading `DEVVIT_ALLOW_SOURCE_UPLOAD=1` therefore has no effect.

That line existed anyway because the CLI wrote it itself when the publish
prompt was answered (`publish.js:452` calls
`project.setEnvVariable('DEVVIT_ALLOW_SOURCE_UPLOAD', '1')`). It was a
write-only breadcrumb, never read back. It has been moved here.

## About the `.env` file

`.env` is **CLI-managed** — do not hand-maintain it, and expect it to
reappear after being deleted. The Devvit CLI will create or update it on
demand (`createOrUpdateEnvFile` in `cli/dist/util/project.js`).

It is now **gitignored and untracked**, because the CLI writes real
credentials into it:

```js
// node_modules/@devvit/cli/dist/lib/auth/AuthTokenStore.js:90
await writeVariableToDotEnv(DEVVIT_AUTH_TOKEN, rawToken, DEFAULT_DOTENV_PATH);
```

So `devvit login` drops an auth token into `.env`. While it was tracked,
that token would have been committed on the next `git add`. Keeping it
ignored means each developer's token stays local.

Variables the CLI manages in `.env`:

| Variable | Purpose |
| --- | --- |
| `DEVVIT_AUTH_TOKEN` | Auth credential — **secret**, never commit |
| `DEVVIT_SUBREDDIT` | Default playtest subreddit |
| `DEVVIT_APP_NAME` | App name |

The app bundle never ships it: `.env` is in the CLI's
`ALWAYS_IGNORED_PATHS` alongside `node_modules` and `.git`
(`cli/dist/util/getAppSourceZip.js:6`).
