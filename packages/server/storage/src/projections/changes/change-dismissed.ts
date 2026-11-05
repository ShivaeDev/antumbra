import type { changeDismissed } from "@antumbra/domain-changes/facts/change-dismissed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const changeDismissedMaterializer = Effect.fn("changes.changeDismissed")(function* (
	fact: FactValue<typeof changeDismissed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.changeVerdict.count({ where: { changeId: fact.changeId } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		yield* rows.changeVerdict
			.insertVoid({ changeId: fact.changeId, verdict: "dismissed", landedAt: new Date(fact.at).toISOString() })
			.pipe(Effect.orDie);
});
