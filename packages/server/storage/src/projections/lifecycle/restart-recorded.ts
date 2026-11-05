import type { restartRecorded } from "@antumbra/domain-lifecycle/facts/restart-recorded.ts";
import { RESTART } from "@antumbra/domain-lifecycle/ids.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const restartRecordedMaterializer = Effect.fn("Lifecycle.RestartRecorded")(function* (
	fact: FactValue<typeof restartRecorded>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		yield* rows.restart.count({ where: { id: RESTART } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		yield* rows.restart.updateVoid({ ...{ sessionIds: fact.sessionIds }, id: RESTART }).pipe(Effect.orDie);
	else yield* rows.restart.insertVoid({ id: RESTART, sessionIds: fact.sessionIds }).pipe(Effect.orDie);
});
