/**
 * Empty stand-in for the `server-only` package under vitest.
 *
 * The real package throws by design when imported outside a `react-server`
 * module condition (see its own source) — exactly the condition vitest runs
 * under (`environment: "node"`, no Next.js runtime). Next.js itself strips
 * `server-only` imports at build time and never executes the package's own
 * code (see phase-03 insight 1), so aliasing it to an empty module here
 * mirrors production behavior instead of weakening the DAL's own
 * `import "server-only";` guard, which stays a real import.
 */
export {};
