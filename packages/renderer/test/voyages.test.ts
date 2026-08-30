import type { BoardEntryView, PieceState, PieceView, VoyageCaptainView, VoyageSummary } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { actsFor, captainAtWork } from "#voyages/acts.ts";
import { authorLabel, awaitingRulingLabel, captainCallLabel, dependsOnLabel, whenLabel } from "#voyages/labels.ts";
import { byFlagship, byLadder, bySalience } from "#voyages/order.ts";

const piece = (id: string, title: string, state: PieceState, dependsOn: ReadonlyArray<string> = []): PieceView => ({
	agents: [],
	artifactHistory: [],
	artifacts: [],
	awaitingRulings: [],
	board: [],
	canRetireCrew: false,
	changes: [],
	charter: `do ${title}`,
	dependsOn,
	expectation: `${title} is landed`,
	id,
	launchedAt: null,
	parkedAt: null,
	reports: [],
	role: "hand",
	state,
	title,
});

const captain = (status: string, atWork: boolean): VoyageCaptainView => ({
	agentId: "agent-1",
	atWork,
	sessionId: "session-1",
	status,
});

const entry = (id: string, register: BoardEntryView["register"]): BoardEntryView => ({
	authorAgentId: null,
	body: id,
	createdAt: "2026-08-15T09:10:00.000Z",
	id,
	register,
});

describe("byLadder", () => {
	it("orders pieces by what deserves attention, then by title", () => {
		const ordered = byLadder([
			piece("4", "delta", "done"),
			piece("2", "bravo", "ready"),
			piece("1", "alpha", "active"),
			piece("3", "charlie", "ready"),
			piece("5", "echo", "parked"),
			piece("6", "foxtrot", "abandoned"),
		]);
		expect(ordered.map((row) => row.title)).toEqual(["alpha", "bravo", "charlie", "echo", "delta", "foxtrot"]);
	});
});

describe("bySalience", () => {
	it("leads with the smooth log and keeps each register in order", () => {
		const ordered = bySalience([entry("rough-1", "rough"), entry("smooth-1", "smooth"), entry("rough-2", "rough"), entry("smooth-2", "smooth")]);
		expect(ordered.map((row) => row.id)).toEqual(["smooth-1", "smooth-2", "rough-1", "rough-2"]);
	});
});

describe("actsFor", () => {
	it("offers only the verbs a piece's derived state can accept", () => {
		expect(actsFor(piece("1", "alpha", "held"))).toEqual(["launch", "workNow", "rewire"]);
		expect(actsFor(piece("1", "alpha", "ready"))).toEqual(["park", "rewire"]);
		expect(actsFor(piece("1", "alpha", "blocked"))).toEqual(["park", "workNow", "rewire"]);
		expect(actsFor(piece("1", "alpha", "parked"))).toEqual(["unpark", "rewire"]);
	});

	it("an active or abandoned piece offers nothing but repositioning", () => {
		expect(actsFor(piece("1", "alpha", "active"))).toEqual(["rewire"]);
		expect(actsFor(piece("1", "alpha", "abandoned"))).toEqual(["rewire"]);
	});

	// why: the redo lever — a piece that derived done from a landed report
	// while its code died with a closed change has no other honest way to run.
	it("a landed piece can still be asked to run again", () => {
		expect(actsFor(piece("1", "alpha", "done"))).toEqual(["workNow", "rewire"]);
	});
});

describe("captainAtWork", () => {
	it("takes the domain's judgment rather than reading a status again", () => {
		expect(captainAtWork(captain("alive", true))).toBe(true);
		expect(captainAtWork(captain("spawning", true))).toBe(true);
	});

	it("no captain, or one that stood down, leaves the voyage unaddressed", () => {
		expect(captainAtWork(null)).toBe(false);
		expect(captainAtWork(captain("alive", false))).toBe(false);
		expect(captainAtWork(captain("retired", false))).toBe(false);
	});
});

describe("captainCallLabel", () => {
	it("offers the wake to a captain that is alive but not at work", () => {
		expect(captainCallLabel(captain("alive", false))).toBe("Wake the captain");
	});

	it("offers the hail when no captain of this voyage can be woken", () => {
		expect(captainCallLabel(null)).toBe("Hail a captain");
		expect(captainCallLabel(captain("retired", false))).toBe("Hail a captain");
		expect(captainCallLabel(captain("dormant", false))).toBe("Hail a captain");
	});
});

describe("awaitingRulingLabel", () => {
	it("names the ruling holding a piece by its question", () => {
		expect(awaitingRulingLabel({ question: "which reef?", rulingId: "r-1" })).toBe("Awaiting ruling r-1: which reef?");
	});
});

describe("dependsOnLabel", () => {
	const alpha = piece("1", "alpha", "done");
	const bravo = piece("2", "bravo", "done");

	it("names what gates a piece by title", () => {
		const gated = piece("3", "charlie", "blocked", ["1", "2"]);
		expect(dependsOnLabel(gated, [alpha, bravo, gated])).toBe("Depends on: alpha, bravo");
	});

	it("says nothing for a piece nothing gates", () => {
		expect(dependsOnLabel(alpha, [alpha])).toBe("");
	});

	it("falls back to the id when the piece is not on the voyage", () => {
		const gated = piece("3", "charlie", "blocked", ["elsewhere"]);
		expect(dependsOnLabel(gated, [gated])).toBe("Depends on: elsewhere");
	});
});

describe("authorLabel", () => {
	it("an entry with no author agent is one you wrote", () => {
		expect(authorLabel(null)).toBe("you");
		expect(authorLabel("0123456789abcdef")).toBe("01234567");
	});
});

describe("whenLabel", () => {
	it("reads a stamp down to the minute", () => {
		expect(whenLabel("2026-08-15T09:10:33.000Z")).toBe("2026-08-15 09:10");
	});
});

describe("byFlagship", () => {
	const voyage = (id: string, kind: VoyageSummary["kind"]): VoyageSummary => ({
		captain: null,
		captainBackend: "scripted",
		counts: { active: 0, done: 0, pieces: 0, ready: 0 },
		crewBackend: "scripted",
		focusedAt: null,
		id,
		kind,
		name: id,
		northStar: `${id} sails`,
		state: "quiet",
	});

	it("leads with the fleet's own voyage and keeps the rest in order", () => {
		const ordered = byFlagship([voyage("reef", "voyage"), voyage("fleet", "flagship"), voyage("shallows", "voyage")]);
		expect(ordered.map((row) => row.id)).toEqual(["fleet", "reef", "shallows"]);
	});

	it("a list without the flagship is left as it was", () => {
		const ordered = byFlagship([voyage("reef", "voyage"), voyage("shallows", "voyage")]);
		expect(ordered.map((row) => row.id)).toEqual(["reef", "shallows"]);
	});
});
