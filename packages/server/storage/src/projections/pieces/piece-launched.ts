import type { pieceLaunched } from "@antumbra/domain-pieces/facts/piece-launched.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";

export const pieceLaunchedMaterializer = Effect.fn("pieces.PieceLaunched")(function* (
	fact: FactValue<typeof pieceLaunched>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* rows.piece.updateVoid({ ...{ launchedAt: fact.launchedAt }, id: fact.id }).pipe(Effect.orDie);
});
