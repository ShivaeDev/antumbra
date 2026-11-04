import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Piece, PieceEdge, PieceProgress, VoyagePieceProgress } from "@antumbra/platform-vocabulary/piece.ts";
import { PieceEvent } from "@antumbra/platform-vocabulary/piece-event.ts";
import { PieceAssignmentWork, PieceOutcome, PieceRulingGate } from "@antumbra/platform-vocabulary/piece-evidence.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Schema } from "effect";
import { PieceHistory } from "#postgres/pieces/service.ts";

export const journalPieces = Effect.fn("PieceFixture.readJournal")(function* (filename: string) {
	const source = yield* SqliteClient.make({ filename, readonly: true });
	const entries = yield* source`select seq, name, payload, requestId from journal where name in
 ('PieceChartered', 'PieceLaunched', 'PieceParked', 'PieceUnparked', 'PieceRewired', 'PieceVerdictLanded') order by seq`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(Schema.Struct({ name: Schema.String, payload: Schema.String, requestId: Request })))),
	);
	const events = yield* Effect.forEach(entries, (entry) =>
		Effect.gen(function* () {
			const payload = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)))(entry.payload);
			const value = yield* Schema.decodeUnknownEffect(PieceEvent)({ ...payload, _tag: entry.name });
			return { requestId: entry.requestId, value };
		}),
	);
	const pieces = yield* source`select * from piece order by charteredAt, rowid`.pipe(
		Effect.flatMap(
			Schema.decodeUnknownEffect(
				Schema.Array(Schema.Struct({ ...Piece.fields, verdict: Schema.NullOr(Schema.fromJsonString(Piece.fields.verdict)) })),
			),
		),
	);
	const edges = yield* source`select * from pieceEdge order by id`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(PieceEdge))));
	const progress = yield* source`select * from pieceProgress order by id`.pipe(
		Effect.flatMap(
			Schema.decodeUnknownEffect(
				Schema.Array(
					Schema.Struct({
						...PieceProgress.fields,
						eligible: Schema.fromJsonString(Schema.Boolean),
						settledDone: Schema.fromJsonString(Schema.Boolean),
						abandoned: Schema.fromJsonString(Schema.Boolean),
						concluded: Schema.fromJsonString(Schema.Boolean),
					}),
				),
			),
		),
	);
	const members = yield* source`select * from voyagePieceProgress order by id`.pipe(
		Effect.flatMap(
			Schema.decodeUnknownEffect(
				Schema.Array(
					Schema.Struct({
						...VoyagePieceProgress.fields,
						concluded: Schema.fromJsonString(Schema.Boolean),
					}),
				),
			),
		),
	);
	const outcomes = yield* source`select * from pieceOutcome order by id`.pipe(Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(PieceOutcome))));
	const assignments = yield* source`select * from pieceAssignmentWork order by id`.pipe(
		Effect.flatMap(
			Schema.decodeUnknownEffect(
				Schema.Array(
					Schema.Struct({
						...PieceAssignmentWork.fields,
						working: Schema.fromJsonString(Schema.Boolean),
					}),
				),
			),
		),
	);
	const gates = yield* source`select * from pieceRulingGate order by id`.pipe(
		Effect.flatMap(Schema.decodeUnknownEffect(Schema.Array(PieceRulingGate))),
	);
	return { events, pieces, edges, progress, members, outcomes, assignments, gates };
});

export const replayPieceFixture = Effect.fn("PieceFixture.replay")(function* (snapshot: Effect.Success<ReturnType<typeof journalPieces>>) {
	const history = yield* PieceHistory;
	for (const event of snapshot.events) yield* history.append(event.requestId, event.value);
	for (const piece of snapshot.pieces) {
		const outcomes = snapshot.outcomes.filter((row) => row.pieceId === piece.id);
		const assignments = snapshot.assignments.filter((row) => row.pieceId === piece.id);
		const gates = snapshot.gates.filter((row) => row.pieceId === piece.id);
		if (outcomes.length + assignments.length + gates.length > 0) {
			yield* history.append(Request.make(`fixture:piece-progress:${piece.id}`), {
				_tag: "PieceProgressObserved",
				id: piece.id,
				outcomes,
				assignments,
				gates,
			});
		}
	}
	yield* history.rebuild();
	const pieces = yield* history.all();
	const edges = (yield* history.edges()).toSorted((a, b) => a.id.localeCompare(b.id));
	const progress = yield* Effect.forEach(
		pieces.toSorted((a, b) => a.id.localeCompare(b.id)),
		(piece) => history.progress(piece.id),
	);
	const evidence = yield* history.evidence();
	const matches =
		Schema.toEquivalence(Schema.Array(Piece))(snapshot.pieces, pieces) &&
		Schema.toEquivalence(Schema.Array(PieceEdge))(snapshot.edges, edges) &&
		Schema.toEquivalence(Schema.Array(Schema.NullOr(PieceProgress)))(snapshot.progress, progress) &&
		Schema.toEquivalence(Schema.Array(VoyagePieceProgress))(snapshot.members, yield* history.members()) &&
		Schema.toEquivalence(Schema.Array(PieceOutcome))(snapshot.outcomes, evidence.outcomes) &&
		Schema.toEquivalence(Schema.Array(PieceAssignmentWork))(snapshot.assignments, evidence.assignments) &&
		Schema.toEquivalence(Schema.Array(PieceRulingGate))(snapshot.gates, evidence.gates);
	if (!matches)
		return yield* Effect.fail(new PieceFixtureMismatch({ message: "Piece history does not reproduce the captured journal rows and progress" }));
	return { pieces: pieces.length, events: snapshot.events.length };
});
export class PieceFixtureMismatch extends Schema.TaggedError<PieceFixtureMismatch>()("PieceFixtureMismatch", { message: Schema.String }) {}
