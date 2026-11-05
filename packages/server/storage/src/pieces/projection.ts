import { Piece, type PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import type { PieceEvent } from "@antumbra/platform-vocabulary/piece-event.ts";
import { invalidationKeys } from "@shivaedev/changes/keys.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { byId } from "#pieces/read.ts";

const rewire = Effect.fn("PieceHistory.projectWiring")(function* (id: PieceId, dependsOn: readonly PieceId[]) {
	const sql = yield* SqlClient.SqlClient;
	const standing = yield* sql`delete from "pieceEdge" where "to" = ${id} returning id`;
	if (standing.length > 0 || dependsOn.length > 0)
		yield* invalidateOnCommit(["pieceEdge", ...invalidationKeys([{ _tag: "Bucket", collection: "pieceEdge", field: "to", value: id }])]);
	for (const [order, from] of dependsOn.entries()) {
		yield* sql`insert into "pieceEdge" ${sql.insert({ id: `${from}/${id}`, from, to: id, edge_order: order })}`;
	}
});
export const apply = Effect.fn("PieceHistory.apply")(function* ({
	value,
	streamVersion,
}: {
	readonly value: typeof PieceEvent.Type;
	readonly streamVersion: number;
}) {
	const sql = yield* SqlClient.SqlClient;
	if (value._tag === "PieceChartered") {
		const row = Piece.make({
			id: value.id,
			voyageId: value.voyageId,
			title: value.title,
			charter: value.charter,
			expectation: value.expectation,
			role: value.role,
			charteredAt: value.charteredAt,
			launchedAt: null,
			parkedAt: null,
			verdict: null,
		});
		yield* sql`insert into "piece" ${sql.insert({ ...row, chartered_order: streamVersion })}`;
		yield* rewire(value.id, value.dependsOn);
	} else if (value._tag === "PieceRewired") {
		yield* rewire(value.id, value.dependsOn);
	} else {
		let patch: { launchedAt: string } | { parkedAt: string | null } | { verdict: "delivered" | "abandoned" };
		switch (value._tag) {
			case "PieceLaunched":
				patch = { launchedAt: value.launchedAt };
				break;
			case "PieceParked":
				patch = { parkedAt: value.parkedAt };
				break;
			case "PieceUnparked":
				patch = { parkedAt: null };
				break;
			case "PieceVerdictLanded":
				patch = { verdict: value.verdict };
				break;
		}
		yield* sql`update "piece" set ${sql.update(patch)} where id = ${value.id}`;
	}
	if (value._tag !== "PieceRewired") {
		const row = yield* byId(value.id);
		if (row !== null)
			yield* invalidateOnCommit(["piece", ...invalidationKeys([{ _tag: "Bucket", collection: "piece", field: "voyageId", value: row.voyageId }])]);
	}
});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	for (const table of ["voyagePieceProgress", "pieceProgress", "pieceEdge", "piece"]) {
		yield* sql`delete from ${sql(table)}`;
	}
	yield* invalidateOnCommit(["piece", "pieceEdge", "pieceProgress", "pieceOutcome", "pieceAssignmentWork", "pieceRulingGate", "voyagePieceProgress"]);
});
