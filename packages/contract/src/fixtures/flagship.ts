import type { VoyageSummary, VoyageView } from "#voyage-views.ts";

export const flagshipSummary: VoyageSummary = {
	captain: null,
	captainSettings: { backend: null, effort: null, model: null },
	counts: { active: 0, done: 0, pieces: 0, ready: 0 },
	crewSettings: { backend: null, effort: null, model: null },
	focusedAt: null,
	id: "voyage-flagship",
	kind: "flagship",
	name: "Flagship",
	northStar: "The fleet sails well.",
	state: "quiet",
};

export const flagshipView: VoyageView = {
	...flagshipSummary,
	board: [],
	context: "Fleet-level rulings and findings belong here.",
	crew: [],
	pieces: [],
};
