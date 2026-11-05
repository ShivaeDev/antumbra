import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Effect, Schema } from "effect";
import { Records } from "#records.ts";

export const loopForgotten = fact("LoopForgotten", { loop: Schema.String });

export const loopForgottenMaterializer = Effect.fn("supervision.loopForgotten")(function* (
	fact: FactValue<typeof loopForgotten>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		yield* rows.stoppedLoop.count({ where: { loop: fact.loop } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		)
	)
		yield* rows.stoppedLoop.delete(fact.loop).pipe(Effect.orDie);
});
