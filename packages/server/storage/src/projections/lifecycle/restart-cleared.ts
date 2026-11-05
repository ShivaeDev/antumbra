import type { restartCleared } from "@antumbra/domain-lifecycle/facts/restart-cleared.ts";
import { RESTART } from "@antumbra/domain-lifecycle/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const restartClearedMaterializer = Effect.fn("Lifecycle.restartCleared")(function* (_fact: FactValue<typeof restartCleared>) {
	yield* (yield* Records).restart.delete(RESTART).pipe(Effect.orDie);
});
