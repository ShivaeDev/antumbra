import type { PieceView } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PieceOutcomes } from "#views/piece-outcomes.tsx";

const artifact = {
	authorAgentId: "agent-chart",
	id: "artifact-current",
	title: "Current chart",
	uri: "https://example.test/current.svg",
};

const piece: PieceView = {
	agents: [],
	artifactHistory: [
		{
			...artifact,
			id: "artifact-old",
			successorArtifactId: artifact.id,
			title: "Old chart",
			uri: "https://example.test/old.svg",
		},
	],
	artifacts: [artifact],
	changes: [],
	charter: "draw the reef",
	dependsOn: [],
	expectation: "a chart lands",
	id: "piece-chart",
	launchedAt: null,
	parkedAt: null,
	reports: [],
	role: "cartographer",
	state: "done",
	title: "Chart",
};

it("keeps superseded Artifacts behind an explicit History disclosure", () => {
	const html = renderToStaticMarkup(<PieceOutcomes piece={piece} />);

	expect(html).toContain("Current chart");
	expect(html).toContain("History");
	expect(html).toContain("Old chart");
	expect(html).not.toContain("<a");
	expect(html).not.toContain("href=");
});
