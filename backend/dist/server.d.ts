import { PrismaClient } from '../generated/prisma/index.js';
declare const app: import("express-serve-static-core").Express;
declare const prisma: PrismaClient<{
    log: ("query" | "warn" | "error")[];
}, "query" | "warn" | "error", import("../generated/prisma/runtime/library.js").DefaultArgs>;
export { app, prisma };
//# sourceMappingURL=server.d.ts.map