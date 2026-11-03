import { PieceProgress, VoyagePieceProgress } from "@antumbra/platform-vocabulary/piece.ts";
import { progressOf } from "@antumbra/platform-vocabulary/piece-progress.ts";
import { VoyageProgress } from "@antumbra/platform-vocabulary/voyage.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect, Schema } from "effect";
import { SqlClient } from "effect/sql";
import { all, edges, evidence, members, progress } from "#postgres/pieces/read.ts";

export const projectProgress = Effect.fn("PieceHistory.projectProgress")(function* () {
	const sql = yield* SqlClient.SqlClient;
	const pieces = yield* all();
	const standing = yield* members();
	const next = progressOf({ pieces, edges: yield* edges(), ...(yield* evidence()) });
	for (const row of next) {
		const current = yield* progress(row.id);
		if (current === null || !Schema.toEquivalence(PieceProgress)(current, row)) {
			yield* sql`insert into antumbra.piece_progress ${sql.insert(row)} on conflict (id) do update set ${sql.update(row)}`;
			yield* invalidateOnCommit(["pieceProgress", `pieceProgress:${row.voyageId}`]);
		}
		const source = pieces.find((piece) => piece.id === row.id);
		const moments = [source?.launchedAt, source?.parkedAt].filter((at): at is string => typeof at === "string");
		const member = {
			id: row.id,
			voyageId: row.voyageId,
			state: row.state,
			concluded: row.concluded,
			lastStirredAt: moments.toSorted().at(-1) ?? null,
		};
		const previous = standing.find((item) => item.id === row.id);
		if (previous === undefined || !Schema.toEquivalence(VoyagePieceProgress)(previous, member)) {
			yield* sql`insert into antumbra.voyage_piece_progress ${sql.insert(member)} on conflict (id) do update set ${sql.update(member)}`;
			yield* invalidateOnCommit(["voyagePieceProgress", `voyagePieceProgress:${row.voyageId}`]);
		}
	}
	yield* projectVoyageProgress();
});

const projectVoyageProgress = Effect.fn("PieceHistory.projectVoyageProgress")(function* () {
	const sql = yield* SqlClient.SqlClient;
	const standing = yield* sql`select * from antumbra.voyage_progress`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(VoyageProgress))));
	const contributions = yield* members();
	for (const current of standing) {
		const pieces = contributions.filter((piece) => piece.voyageId === current.id);
		const counts = { abandoned: 0, active: 0, blocked: 0, done: 0, held: 0, landing: 0, parked: 0, ready: 0 };
		for (const piece of pieces) counts[piece.state] += 1;
		const moments = pieces.flatMap((piece) => (piece.lastStirredAt === null ? [] : [piece.lastStirredAt]));
		const row = {
			id: current.id,
			total: pieces.length,
			counts,
			state: counts.active > 0 ? ("underWay" as const) : ("quiet" as const),
			lastStirredAt: moments.toSorted().at(-1) ?? null,
			concluded: pieces.length > 0 && pieces.every((piece) => piece.concluded),
		};
		if (!Schema.toEquivalence(VoyageProgress)(current, row)) {
			yield* sql`update antumbra.voyage_progress set ${sql.update({ ...row, counts: JSON.stringify(counts) })} where id = ${row.id}`;
			yield* invalidateOnCommit(["voyageProgress"]);
		}
	}
});
