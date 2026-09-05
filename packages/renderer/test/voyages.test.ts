import type { BoardEntryView, PieceState, PieceView, VoyageSummary } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { actsFor } from "#voyages/acts.ts";
import { dependsOnLabel } from "#voyages/labels.ts";
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

	it("a landed piece can still be asked to run again", () => {
		expect(actsFor(piece("1", "alpha", "done"))).toEqual(["workNow", "rewire"]);
	});
});

describe("dependsOnLabel", () => {
	it("falls back to the id when the piece is not on the voyage", () => {
		const gated = piece("3", "charlie", "blocked", ["elsewhere"]);
		expect(dependsOnLabel(gated, [gated])).toBe("Depends on: elsewhere");
	});
});

describe("byFlagship", () => {
	const voyage = (id: string, kind: VoyageSummary["kind"]): VoyageSummary => ({
		captain: null,
		captainBackend: "scripted",
		captainEffort: null,
		captainModel: null,
		counts: { active: 0, done: 0, pieces: 0, ready: 0 },
		crewBackend: "scripted",
		crewEffort: null,
		crewModel: null,
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
