import { paceWords } from "#tools/voyages/pace.ts";
import type { VoyageReading } from "#tools/voyages/reading.ts";

const listed = (lines: readonly string[]): string => (lines.length === 0 ? "- none" : lines.join("\n"));
const authored = (id: string | null): string => (id === null ? "" : ` by ${id}`);

const pieceLine = (piece: VoyageReading["pieces"][number]): string =>
	[
		`- ${piece.id}`,
		piece.title,
		`[${piece.state}]`,
		...(piece.dependencies.length === 0
			? []
			: [
					`depends on ${piece.dependencies
						.map((dependency) => dependency.id)
						.sort()
						.join(", ")}`,
				]),
		...(piece.gates.length === 0
			? []
			: [
					`awaits ruling ${piece.gates
						.toSorted((a, b) => a.rulingId.localeCompare(b.rulingId))
						.map((gate) => `${gate.rulingId}: ${gate.question}`)
						.join("; ")}`,
				]),
	].join(" ");

export const renderVoyage = (reading: VoyageReading): string =>
	[
		`# ${reading.voyage.name} [${reading.progress?.state ?? "quiet"}]`,
		paceWords(reading.pace),
		"",
		"## Pieces",
		listed(reading.pieces.map(pieceLine)),
		"",
		"## Crew",
		listed(reading.pieces.flatMap((piece) => piece.agents.map((agent) => `- ${agent.id} on ${piece.title} [${agent.status}]`))),
		"",
		"## Landed",
		listed(
			reading.pieces.flatMap((piece) => [
				...piece.reports.map((report) => `- ${report.id} ${report.title} — report${authored(report.authorAgentId)}`),
				...piece.artifacts.map((artifact) => `- ${artifact.title} — artifact${authored(artifact.authorAgentId)}`),
			]),
		),
		"",
		"## Changes",
		listed(
			reading.pieces.flatMap((piece) =>
				piece.changes.map((change) =>
					[`- ${change.stage}`, change.host, change.title, change.url ?? "no url", `${change.checks}/${change.review}/${change.mergeable}`].join(
						" · ",
					),
				),
			),
		),
		"",
		"## Captain",
		reading.captain === null ? "- none" : `- ${reading.captain.id} [${reading.captain.status}]`,
	].join("\n");
