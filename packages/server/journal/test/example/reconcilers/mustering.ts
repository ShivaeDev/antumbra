import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import { Effect } from "effect";
import { Roster } from "#example/ports/roster.ts";
import { atWork } from "#example/queries/at-work.ts";
import { chartered } from "#example/queries/chartered.ts";

export const mustering = reconciler("mustering", {
	watch: chartered,
	ports: [Roster],
	run: Effect.fn("pieces.mustering")(function* (reading, reconciling) {
		const launched = yield* reconciling.read(atWork, {});
		yield* reconciling.ports.roster.muster({ chartered: reading.pieces.length, launched: launched.length });
	}),
});
