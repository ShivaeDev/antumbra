import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const loopFailed = fact("LoopFailed", { loop: Schema.String, message: Schema.String, trace: Schema.String });

export const loopFailedMaterializer = Effect.fn("supervision.loopFailed")(function* (
	fact: FactValue<typeof loopFailed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const stopped = { at: fact.at, loop: fact.loop, message: fact.message, state: "stopped", trace: fact.trace } as const;
	if (
		yield* rows.stoppedLoop.count({ where: { loop: fact.loop } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		yield* rows.stoppedLoop.updateVoid({ ...stopped, loop: fact.loop }).pipe(Effect.orDie);
	else yield* rows.stoppedLoop.insertVoid(stopped).pipe(Effect.orDie);
});
