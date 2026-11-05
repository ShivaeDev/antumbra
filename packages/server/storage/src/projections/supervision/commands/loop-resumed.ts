import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const loopResumed = fact("LoopResumed", { loop: Schema.String });

export const loopResumedMaterializer = Effect.fn("supervision.loopResumed")(function* (
	fact: FactValue<typeof loopResumed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		yield* rows.stoppedLoop.count({ where: { loop: fact.loop } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		yield* rows.stoppedLoop.updateVoid({ ...{ state: "resumed" }, loop: fact.loop }).pipe(Effect.orDie);
});
