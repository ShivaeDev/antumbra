import { Option } from "effect";
import { pieceLine } from "#piece-line.ts";
import type { PieceView } from "#piece-view.ts";
import type { VoyageCaptain } from "#voyage-captain.ts";
import type { VoyageView } from "#voyage-view.ts";

const listed = (lines: ReadonlyArray<string>): string =>
	lines.length === 0 ? "- none" : lines.join("\n");

const crewLines = (pieces: ReadonlyArray<PieceView>): ReadonlyArray<string> =>
	pieces.flatMap((piece) =>
		piece.agents.map(
			(agent) => `- ${agent.agentId} on ${piece.title} [${agent.status}]`,
		),
	);

const authored = (authorAgentId: string | null): string =>
	authorAgentId === null ? "" : ` by ${authorAgentId}`;

const landedLines = (pieces: ReadonlyArray<PieceView>): ReadonlyArray<string> =>
	pieces.flatMap((piece) => [
		...piece.reports.map(
			(report) => `- ${report.title} — report${authored(report.authorAgentId)}`,
		),
		...piece.artifacts.map(
			(artifact) =>
				`- ${artifact.title} — artifact${authored(artifact.authorAgentId)}`,
		),
	]);

const captainLine = (captain: Option.Option<VoyageCaptain>): string =>
	Option.match(captain, {
		onNone: () => "- none",
		onSome: (row) => `- ${row.agentId} [${row.status}]`,
	});

// why: what a captain is shown when it asks where its voyage stands — the
// same facts the views hold, in a shape a model can read and a test can
// assert whole.
export const renderVoyage = (view: VoyageView): string =>
	[
		`# ${view.name} [${view.state}]`,
		``,
		`## Pieces`,
		listed(view.pieces.map(pieceLine)),
		``,
		`## Crew`,
		listed(crewLines(view.pieces)),
		``,
		`## Landed`,
		listed(landedLines(view.pieces)),
		``,
		`## Captain`,
		captainLine(view.captain),
	].join("\n");
