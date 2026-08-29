import type { Ruling, RulingSubject } from "@antumbra/rulings";
import { expect, it } from "@effect/vitest";
import { Option } from "effect";
import { rulingStaleness } from "#ruling-staleness.ts";
import { piece, world } from "#test/piece-ladder-fixtures.ts";
import type { VoyageWorld } from "#voyage-rows.ts";

const ruling = (subjects: ReadonlyArray<RulingSubject>): Ruling => ({
	answer: Option.none(),
	choices: [],
	context: "the shoal was surveyed once",
	createdAt: new Date("2026-08-15T09:00:00.000Z"),
	declared: { radius: "voyage", urgency: "pressing" },
	gatedPieceIds: [],
	id: "ruling-1",
	question: "which reading do we plot against?",
	radius: "voyage",
	reclassifications: [],
	requester: { agentId: "agent-1", kind: "agent" },
	subjects,
	supersession: Option.none(),
	urgency: "pressing",
	withdrawal: Option.none(),
});

const staleIn = (built: VoyageWorld, subjects: ReadonlyArray<RulingSubject>) =>
	rulingStaleness(built)(ruling(subjects));

const reef = {
	memberships: [
		{ pieceId: "alpha", voyageId: "voyage-1" },
		{ pieceId: "bravo", voyageId: "voyage-1" },
	],
	pieces: [piece("alpha"), piece("bravo")],
};

it("reads a ruling on a landed piece as stale", () => {
	const built = world({ pieceReports: [{ pieceId: "alpha", reportId: "r" }] });

	expect(staleIn(built, [{ id: "alpha", kind: "piece" }])).toBe(true);
});

// why: writing a piece off is a decision to stop, so the ruling written for it
// has nothing left to bind either — abandoned concludes as surely as done.
it("reads a ruling on an abandoned piece as stale", () => {
	const built = world({ pieceVerdicts: new Map([["alpha", "abandoned"]]) });

	expect(staleIn(built, [{ id: "alpha", kind: "piece" }])).toBe(true);
});

it("reads a ruling on a piece still being worked as fresh", () => {
	const built = world({});

	expect(staleIn(built, [{ id: "alpha", kind: "piece" }])).toBe(false);
});

// why: staleness is every named subject, not any of them — one live piece is
// enough for the answer to still be needed somewhere.
it("keeps a ruling fresh while one of its pieces is unfinished", () => {
	const built = world({
		pieceReports: [{ pieceId: "alpha", reportId: "r" }],
		pieces: [piece("alpha"), piece("bravo")],
	});

	expect(
		staleIn(built, [
			{ id: "alpha", kind: "piece" },
			{ id: "bravo", kind: "piece" },
		]),
	).toBe(false);
});

it("reads a ruling on a voyage whose every piece concluded as stale", () => {
	const built = world({
		...reef,
		pieceReports: [
			{ pieceId: "alpha", reportId: "r" },
			{ pieceId: "bravo", reportId: "s" },
		],
	});

	expect(staleIn(built, [{ id: "voyage-1", kind: "voyage" }])).toBe(true);
});

it("reads a ruling on a voyage still under way as fresh", () => {
	const built = world({
		...reef,
		pieceReports: [{ pieceId: "alpha", reportId: "r" }],
	});

	expect(staleIn(built, [{ id: "voyage-1", kind: "voyage" }])).toBe(false);
});

// why: a voyage nobody has chartered work for has not finished; it has not
// started, and a rule written for it is waiting rather than outlived.
it("reads a ruling on a voyage with no pieces as fresh", () => {
	const built = world({ memberships: [], pieces: [] });

	expect(staleIn(built, [{ id: "voyage-1", kind: "voyage" }])).toBe(false);
});

it("never reads a ruling scoped only by tags as stale", () => {
	const built = world({ pieceVerdicts: new Map([["alpha", "abandoned"]]) });

	expect(staleIn(built, [{ kind: "tag", tag: "surveying" }])).toBe(false);
	expect(staleIn(built, [])).toBe(false);
});

// why: a repository outlives any amount of work, so it neither ages a ruling
// nor keeps one alive — the pieces beside it decide.
it("ignores subjects that never conclude", () => {
	const built = world({ pieceVerdicts: new Map([["alpha", "abandoned"]]) });

	expect(
		staleIn(built, [
			{ id: "alpha", kind: "piece" },
			{ id: "repo-1", kind: "repo" },
			{ kind: "tag", tag: "surveying" },
		]),
	).toBe(true);
});
