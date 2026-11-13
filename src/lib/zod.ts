import { z } from "zod";

// Zod 4 tests whether it may compile validators with `new Function`. Under our CSP
// that test is blocked and shows up as a policy violation on every page, so turn it off.
z.config({ jitless: true });

export { z };
