// Wrangler's Text rule (see wrangler.toml) inlines imported .md files
// as their raw string contents at build time. This declaration teaches
// TypeScript the same so `import md from '../../TERMS.md'` is typed.
declare module '*.md' {
  const content: string;
  export default content;
}
