import type { VoyageSummary, VoyageView } from "#voyage-views.ts";

// why: boot writes the flagship row and stops there, so the fixture fleet
// sails the way a first run does — the fleet's own voyage is on the list with
// no captain aboard until one is hailed.
export const flagshipSummary: VoyageSummary = {
	backend: "claude",
	captain: null,
	counts: { active: 0, done: 0, pieces: 0, ready: 0 },
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
