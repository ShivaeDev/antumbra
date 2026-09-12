import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { restartCleared } from "#facts/restart-cleared.ts";
import { RESTART } from "#ids.ts";
import { restart } from "#rows/restart.ts";
export const restartClearedMaterializer = materializer(restartCleared, { writes: [restart], run: (_fact, rows) => rows.restart.delete(RESTART) });
