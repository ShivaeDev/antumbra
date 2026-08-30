import { Option } from "effect";
import type { VoyageCaptain } from "#voyage-captain.ts";
import type { PieceCounts, VoyageSummary } from "#voyage-view.ts";

// why: the three tallies a fleet reader steers by — what was never released,
// what was pulled back, and what is landed — beside the whole they were
// counted from. The rest of the ladder is the voyage captain's business.
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

// why: two lines per voyage, in a shape a model can scan and a test can
// assert: who it is and where it stands on the first, what it steers by on
// the second. Context is left out — the flagship asks for detail elsewhere.
const voyageLines = (voyage: VoyageSummary): ReadonlyArray<string> => [
	[
		`- ${voyage.id} ${voyage.name} [${voyage.state}]`,
		voyage.kind,
		voyage.backend,
		countsPart(voyage.counts),
		captainPart(voyage.captain),
		stirredPart(voyage.lastStirredAt),
	].join(" · "),
	`  north star: ${voyage.northStar}`,
];

export const renderFleet = (voyages: ReadonlyArray<VoyageSummary>): string => ["# Fleet", "", ...voyages.flatMap(voyageLines)].join("\n");
