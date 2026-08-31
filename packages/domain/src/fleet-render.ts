import { Option } from "effect";
import type { VoyageCaptain } from "#voyage-captain.ts";
import type { PieceCounts, VoyageSummary } from "#voyage-view.ts";

const countsPart = (counts: PieceCounts): string => {
	const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
	return `${total} pieces (${counts.held} unlaunched, ${counts.parked} parked, ${counts.done} landed)`;
};

const captainPart = (captain: Option.Option<VoyageCaptain>): string =>
	Option.match(captain, {
		onNone: () => "captain none",
		onSome: (row) => `captain ${row.agentId} [${row.status}]`,
	});

const stirredPart = (at: Date | null): string => (at === null ? "never stirred" : `last stirred ${at.toISOString()}`);

const voyageLines = (voyage: VoyageSummary): ReadonlyArray<string> => [
	[
		`- ${voyage.id} ${voyage.name} [${voyage.state}]`,
		voyage.kind,
		`captain on ${voyage.captainBackend}`,
		`crew on ${voyage.crewBackend}`,
		countsPart(voyage.counts),
		captainPart(voyage.captain),
		stirredPart(voyage.lastStirredAt),
	].join(" · "),
	`  north star: ${voyage.northStar}`,
];

export const renderFleet = (voyages: ReadonlyArray<VoyageSummary>): string => ["# Fleet", "", ...voyages.flatMap(voyageLines)].join("\n");
