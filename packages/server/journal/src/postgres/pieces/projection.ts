import { Piece, type PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import type { PieceEvent } from "@antumbra/platform-vocabulary/piece-event.ts";
import type { PieceProgressObserved } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import { projectProgress } from "#postgres/pieces/progress.ts";
import { byId } from "#postgres/pieces/read.ts";

const rewire = Effect.fn("PieceHistory.projectWiring")(function* (id: PieceId, dependsOn: readonly PieceId[]) {
	const sql = yield* SqlClient.SqlClient;
	const standing = yield* sql`delete from antumbra.piece_edges where "to" = ${id} returning id`;
	if (standing.length > 0 || dependsOn.length > 0) yield* invalidateOnCommit(["pieceEdge", `pieceEdge:${id}`]);
	for (const [order, from] of dependsOn.entries()) {
		yield* sql`insert into antumbra.piece_edges ${sql.insert({ id: `${from}/${id}`, from, to: id, edge_order: order })}`;
	}
});
const observe = Effect.fn("PieceHistory.projectEvidence")(function* (value: typeof PieceProgressObserved.Type) {
	const sql = yield* SqlClient.SqlClient;
	for (const [table, key, rows] of [
		["piece_outcomes", "pieceOutcome", value.outcomes],
		["piece_assignments", "pieceAssignmentWork", value.assignments],
		["piece_ruling_gates", "pieceRulingGate", value.gates],
	] as const) {
		const removed = yield* sql`delete from ${sql(`antumbra.${table}`)} where "pieceId" = ${value.id} returning id`;
		for (const row of rows) yield* sql`insert into ${sql(`antumbra.${table}`)} ${sql.insert(row)}`;
		if (removed.length > 0 || rows.length > 0) yield* invalidateOnCommit([key, `${key}:${value.id}`]);
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
		yield* sql`insert into antumbra.pieces ${sql.insert({ ...row, chartered_order: streamVersion })}`;
		yield* rewire(value.id, value.dependsOn);
	} else if (value._tag === "PieceRewired") {
		yield* rewire(value.id, value.dependsOn);
	} else if (value._tag === "PieceProgressObserved") {
		yield* observe(value);
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
		yield* sql`update antumbra.pieces set ${sql.update(patch)} where id = ${value.id}`;
	}
	if (value._tag !== "PieceRewired" && value._tag !== "PieceProgressObserved") {
		const row = yield* byId(value.id);
		if (row !== null) yield* invalidateOnCommit(["piece", `piece:${row.voyageId}`]);
	}
	yield* projectProgress();
});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	for (const table of [
		"voyage_piece_progress",
		"piece_progress",
		"piece_ruling_gates",
		"piece_assignments",
		"piece_outcomes",
		"piece_edges",
		"pieces",
	]) {
		yield* sql`delete from ${sql(`antumbra.${table}`)}`;
	}
	yield* invalidateOnCommit(["piece", "pieceEdge", "pieceProgress", "pieceOutcome", "pieceAssignmentWork", "pieceRulingGate", "voyagePieceProgress"]);
	yield* projectProgress();
});
