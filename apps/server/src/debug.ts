import { DebugRpc } from "@antumbra/platform-feature/debug.ts";
import { rebuild } from "@antumbra/server-storage/rebuild.ts";
import { Effect } from "effect";
export const debugHandlers = DebugRpc.toLayer({ "debug.rebuildProjections": () => rebuild().pipe(Effect.orDie) });
