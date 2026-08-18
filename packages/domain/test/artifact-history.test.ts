import { expect, it } from "@effect/vitest";
import { pieceView } from "#piece-view.ts";
import type { PieceRow, VoyageWorld } from "#voyage-rows.ts";

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
	id,
	pieceId: piece.id,
	supersededByArtifactId: id === "artifact-old" ? "artifact-new" : null,
	title: id,
	uri: `https://example.test/${id}.svg`,
});

const world: VoyageWorld = {
	agentStatus: new Map(),
	artifacts: new Map([
		["artifact-old", artifact("artifact-old")],
		["artifact-new", artifact("artifact-new")],
	]),
	assignments: [],
	changes: [],
	crews: [],
	currentSessionByAgent: new Map(),
	edges: [],
	memberships: [],
	pieceChanges: [],
	pieceReports: [],
	pieces: [piece],
	reports: new Map(),
	repos: new Map(),
	sessions: [],
	voyages: [],
};

it("shows only the terminal Artifact as current and keeps its predecessor in History", () => {
	const view = pieceView(world, new Map([[piece.id, "done"]]), piece);

	expect(view.artifacts.map((row) => row.id)).toEqual(["artifact-new"]);
	expect(view.artifactHistory).toMatchObject([
		{
			id: "artifact-old",
			successorArtifactId: "artifact-new",
		},
	]);
	expect(view.state).toBe("done");
});
