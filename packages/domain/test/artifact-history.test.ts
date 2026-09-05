import { expect, it } from "@effect/vitest";
import { pieceViews } from "#piece-view.ts";
import type { VoyageDetailRows } from "#voyage/detail/rows.ts";
import type { PieceRow } from "#voyage-rows.ts";

const piece: PieceRow = {
	charter: "draw the reef",
	expectation: "a chart lands",
	id: "piece-chart",
	launchedAt: null,
	parkedAt: null,
	role: "cartographer",
	title: "Chart",
};

const artifact = (id: string) => ({
	authorAgentId: "agent-chart",
	basename: `${id}.md`,
	byteSize: id.length,
	digest: "0".repeat(64),
	id,
	pieceId: piece.id,
	supersededByArtifactId: id === "artifact-old" ? "artifact-new" : null,
	title: id,
});

const world: VoyageDetailRows = {
	agentStatus: new Map(),
	artifacts: new Map([
		["artifact-old", artifact("artifact-old")],
		["artifact-new", artifact("artifact-new")],
	]),
	assignments: [],
	changes: [],
	crews: [],
	currentSessionByAgent: new Map(),
	dismissedChangeIds: new Set(),
	edges: [],
	memberships: [],
	pieceChanges: [],
	pieceReports: [],
	pieceVerdicts: new Map(),
	rulingGates: [],
	pieces: [piece],
	reports: new Map(),
	roleSettings: new Map(),
	repos: new Map(),
	sessions: [],
};

it("shows only the terminal Artifact as current and keeps its predecessor in History", () => {
	const [view] = pieceViews(world, new Map([[piece.id, "done"]]), [piece]);

	expect(view?.artifacts.map((row) => row.id)).toEqual(["artifact-new"]);
	expect(view?.artifactHistory).toMatchObject([
		{
			id: "artifact-old",
			successorArtifactId: "artifact-new",
		},
	]);
	expect(view?.state).toBe("done");
});
