import { Database, type PrismaError } from "@antumbra/persistence";
import type { HeldResourceRead } from "@antumbra/resource-reclamation";
import { Effect } from "effect";
import { changeRow } from "#change-read.ts";
import { pieceChangeRow } from "#change-rows.ts";
import { heldBerths } from "#held-berths.ts";

export const changeHeldResourceRead = Effect.gen(function* () {
	const db = yield* Database;
	return {
		held: (berths) =>
			Effect.gen(function* () {
				const changes = yield* Effect.forEach(
					yield* db.Change.all(),
					changeRow,
				);
				const pieceChanges = yield* Effect.forEach(
					yield* db.PieceChange.all(),
					pieceChangeRow,
				);
				return heldBerths(berths, changes, yield* db.Repo.all(), pieceChanges);
			}),
	} satisfies HeldResourceRead<
		| PrismaError
		| Effect.Error<ReturnType<typeof changeRow>>
		| Effect.Error<ReturnType<typeof pieceChangeRow>>
	>;
});
