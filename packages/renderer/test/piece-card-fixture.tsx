import type { PieceView } from "@antumbra/contract";
import { PieceCard } from "#views/piece-card.tsx";

const charter = [
	"# Sound the shoals",
	"",
	"Take **every** depth along the northern edge, then:",
	"",
	"- log each sounding",
	"- mark the ones under `three fathoms`",
].join("\n");

export const soundings: PieceView = {
	agents: [],
	artifactHistory: [],
	artifacts: [],
	awaitingRulings: [{ question: "which reef?", rulingId: "ruling-1" }],
	board: [
		{
			authorAgentId: null,
			body: "## Log entry\n\nFound **two** shoals.",
			createdAt: "2026-08-15T09:10:00.000Z",
			id: "entry-1",
			kind: "note",
			register: "smooth",
			seq: 1,
		},
	],
	canRetireCrew: false,
	changes: [],
	charter,
	dependsOn: ["piece-2"],
	expectation: "the depths are recorded",
	id: "piece-1",
	launchedAt: null,
	parkedAt: null,
	reports: [],
	role: "hand",
	state: "held",
	title: "soundings",
};

const chart: PieceView = {
	...soundings,
	charter: "draw the chart",
	dependsOn: [],
	id: "piece-2",
	title: "the chart",
};

const pieces = [soundings, chart];

export const card = (piece: PieceView): React.ReactElement => (
	<PieceCard onError={() => undefined} piece={piece} pieces={pieces} voyageId="voyage-reef" />
);
