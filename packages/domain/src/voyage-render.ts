import { Option } from "effect";
import { pieceLine } from "#piece-line.ts";
import type { PieceView } from "#piece-view.ts";
import type { VoyageCaptain } from "#voyage-captain.ts";
import type { VoyageView } from "#voyage-view.ts";

const listed = (lines: ReadonlyArray<string>): string => (lines.length === 0 ? "- none" : lines.join("\n"));

const crewLines = (pieces: ReadonlyArray<PieceView>): ReadonlyArray<string> =>
	pieces.flatMap((piece) => piece.agents.map((agent) => `- ${agent.agentId} on ${piece.title} [${agent.status}]`));

const authored = (authorAgentId: string | null): string => (authorAgentId === null ? "" : ` by ${authorAgentId}`);

const landedLines = (pieces: ReadonlyArray<PieceView>): ReadonlyArray<string> =>
	pieces.flatMap((piece) => [
		...piece.reports.map((report) => `- ${report.id} ${report.title} — report${authored(report.authorAgentId)}`),
		...piece.artifacts.map((artifact) => `- ${artifact.title} — artifact${authored(artifact.authorAgentId)}`),
	]);

const changeLines = (pieces: ReadonlyArray<PieceView>): ReadonlyArray<string> =>
	pieces.flatMap((piece) =>
		piece.changes.map((change) =>
			[`- ${change.stage}`, change.host, change.title, change.url ?? "no url", `${change.checks}/${change.review}/${change.mergeable}`].join(" · "),
		),
	);

const captainLine = (captain: Option.Option<VoyageCaptain>): string =>
	Option.match(captain, {
		onNone: () => "- none",
		onSome: (row) => `- ${row.agentId} [${row.status}]`,
	});

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
		`## Changes`,
		listed(changeLines(view.pieces)),
		``,
		`## Captain`,
		captainLine(view.captain),
	].join("\n");
