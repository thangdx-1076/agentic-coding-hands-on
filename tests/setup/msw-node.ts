import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "@/mocks/node";

/**
 * Root `setupFiles` entry — applies to BOTH vitest projects (`node` and
 * `jsdom`). Safe there because MSW's Node integration patches `http`/`https`
 * and global `fetch` at the process level, below whatever DOM shim supplies
 * globals; it never touches jsdom itself.
 *
 * `onUnhandledRequest: "error"` is the point of the whole layer: a request
 * that escapes the handler list fails the test loudly instead of silently
 * reaching (or failing to reach) a real host.
 */
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

// Drop any per-test `server.use(...)` override so tests stay independent.
afterEach(() => server.resetHandlers());

afterAll(() => server.close());
