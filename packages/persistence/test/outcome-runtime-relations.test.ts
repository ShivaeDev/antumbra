import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Effect } from "effect";

const pieceId = "piece-soundings";
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
	pieceId,
	title: "Reef chart",
};

it.effectDB("rejects an outcome relation to a report nothing wrote and takes a piece no table holds", function* (db) {
	yield* db.Report.create(report);
	yield* db.Artifact.create(artifact);

	const orphan = yield* Effect.flip(db.PieceReport.create({ pieceId, reportId: "missing-report" }));

	expect(orphan._tag).toBe("PrismaError");
	expect(yield* db.PieceReport.all()).toEqual([]);
	expect(yield* db.Artifact.all()).toEqual([expect.objectContaining(artifact)]);
});
