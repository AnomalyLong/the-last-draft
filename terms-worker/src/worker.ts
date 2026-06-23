import { marked } from 'marked';
// Bundled at build time via the Text rule in wrangler.toml — no runtime
// fetch. To update what gets served, edit the root TERMS.md and redeploy.
import termsMarkdown from '../../TERMS.md';

// Minimal styled shell. System fonts only (no external font loading) and
// dark theme that mirrors the game's accent palette. The container is
// narrow (~760px) for comfortable legal-document reading.
const page = (bodyHtml: string): string => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms and Conditions · The Last Draft</title>
  <meta name="description" content="Terms and Conditions for The Last Draft, a Reddit game by Anomaly Games Inc.">
  <meta name="robots" content="index, follow">
  <style>
    :root {
      --bg: #02060a;
      --fg: #d6e4f5;
      --muted: #8aa0b0;
      --accent: #19e6c4;
      --accent-2: #c084ff;
      --border: rgba(255, 255, 255, 0.08);
    }
    * { box-sizing: border-box; }
    html { background: var(--bg); }
    body {
      margin: 0;
      padding: 48px 16px 80px;
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      background:
        radial-gradient(ellipse at 15% 0%, rgba(192, 132, 255, 0.08), transparent 55%),
        radial-gradient(ellipse at 85% 100%, rgba(25, 230, 196, 0.06), transparent 55%),
        var(--bg);
      background-attachment: fixed;
      color: var(--fg);
    }
    main { max-width: 760px; margin: 0 auto; }
    h1 {
      font-size: 32px;
      font-weight: 800;
      letter-spacing: 0.06em;
      line-height: 1.2;
      margin: 0 0 8px;
      background: linear-gradient(135deg, var(--accent), var(--accent-2));
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    h2 {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
      letter-spacing: 0.02em;
      margin: 44px 0 12px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      color: #ffffff;
    }
    h3 {
      font-size: 17px;
      font-weight: 600;
      line-height: 1.4;
      margin: 24px 0 8px;
      color: #cbd5e1;
    }
    p, li {
      font-size: 15px;
      line-height: 1.7;
      color: var(--fg);
    }
    p strong, li strong { color: var(--accent); font-weight: 700; }
    a {
      color: var(--accent);
      text-decoration: underline;
      text-underline-offset: 3px;
      text-decoration-thickness: 1px;
    }
    a:hover { color: var(--accent-2); }
    ul { padding-left: 22px; }
    li { margin: 6px 0; }
    code {
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
      font-size: 13px;
      color: var(--accent-2);
    }
    hr {
      margin: 40px 0;
      border: 0;
      border-top: 1px solid var(--border);
    }
    footer {
      margin-top: 64px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      color: var(--muted);
      font-size: 13px;
      line-height: 1.5;
      text-align: center;
    }
    footer a { color: var(--muted); }
    footer a:hover { color: var(--accent); }
    @media (max-width: 600px) {
      body { padding: 32px 14px 56px; }
      h1 { font-size: 26px; }
      h2 { font-size: 19px; margin-top: 36px; }
      h3 { font-size: 16px; }
      p, li { font-size: 14px; }
    }
  </style>
</head>
<body>
  <main>
${bodyHtml}
    <footer>
      © Anomaly Games Inc. · PH106-35 Hollywood Avenue, North York, Ontario, Canada<br>
      <a href="mailto:info@anomalygames.ai">info@anomalygames.ai</a>
    </footer>
  </main>
</body>
</html>`;

// Rendered once at module load — marked is synchronous and the source
// markdown is a static import. Re-execution per request would be wasted
// work; the Worker process caches this for the lifetime of the isolate.
const renderedBody = marked.parse(termsMarkdown, { async: false }) as string;
const html = page(renderedBody);

export default {
  fetch(): Response {
    return new Response(html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        // Five-minute edge cache. Short enough that a redeploy goes live
        // quickly; long enough that the Worker isn't hit on every page
        // refresh from the same visitor.
        'cache-control': 'public, max-age=300',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin',
      },
    });
  },
};
