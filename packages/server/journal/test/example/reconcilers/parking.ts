import { reconciler } from "@antumbra/platform-feature/reconciler.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Effect } from "effect";
import { park } from "#example/commands/park.ts";
import { Roster } from "#example/ports/roster.ts";
import { atWork } from "#example/queries/at-work.ts";

export const parking = reconciler("parking", {
	watch: atWork,
	each: (row) => row.id,
	ports: [Roster],
	run: Effect.fn("pieces.parking")(function* (row, reconciling) {
		const requestId = Id.Request.make(`park:${row.id}`);
		yield* reconciling.ports.roster.announce({ pieceId: row.id, requestId });
		yield* reconciling.commit(park, { pieceId: row.id, reason: "at rest", requestId });
	}),
});
