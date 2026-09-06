import { setupServer } from "msw/node";

import { handlers } from "./handlers";

/**
 * Node-side MSW server, shared by every vitest project. Lifecycle is wired in
 * `tests/setup/msw-node.ts` (the root `setupFiles` entry), not here, so a test
 * that needs a one-off response can `server.use(...)` without re-listening.
 */
export const server = setupServer(...handlers);
