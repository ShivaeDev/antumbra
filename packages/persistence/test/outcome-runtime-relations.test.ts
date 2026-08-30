import { persistenceIt } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";

const it = persistenceIt();
const piece = {
	charter: "sound the shallows",
	expectation: "the soundings land",
	id: "piece-soundings",
	launchedAt: null,
	parkedAt: null,
	role: "surveyor",
	title: "Soundings",
};
const report = {
	authorAgentId: null,
	body: "depths measured",
	id: "report-soundings",
	title: "Reef soundings",
};
const artifact = {
	authorAgentId: null,
	basename: "reef.md",
	byteSize: 6,
	digest: "0".repeat(64),
	id: "artifact-chart",
	pieceId: piece.id,
	title: "Reef chart",
};

it.effectDB("rejects every orphan Piece outcome relation", function* (db) {
	yield* db.Piece.create(piece);
	yield* db.Report.create(report);
	yield* db.Artifact.create(artifact);

	const failures = yield* Effect.all([
		Effect.flip(db.PieceReport.create({ pieceId: "missing-piece", reportId: report.id })),
		Effect.flip(db.PieceReport.create({ pieceId: piece.id, reportId: "missing-report" })),
		Effect.flip(
			db.Artifact.create({
				...artifact,
				id: "artifact-orphan",
				pieceId: "missing-piece",
			}),
		),
	]);
	for (const failure of failures) {
		expect(failure._tag).toBe("PrismaError");
	}
	expect(yield* db.PieceReport.all()).toEqual([]);
	expect(yield* db.Artifact.all()).toEqual([expect.objectContaining(artifact)]);
});
