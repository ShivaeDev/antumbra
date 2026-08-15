import type { BoardEntryView, PieceState, PieceView } from "@antumbra/contract";
import { describe, expect, it } from "vitest";
import { actsFor, captainAtWork } from "#voyages/acts.ts";
import {
	artifactHref,
	authorLabel,
	dependsOnLabel,
	whenLabel,
} from "#voyages/labels.ts";
import { byLadder, bySalience } from "#voyages/order.ts";

const piece = (
	id: string,
	title: string,
	state: PieceState,
	dependsOn: ReadonlyArray<string> = [],
): PieceView => ({
	agents: [],
	artifacts: [],
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

const entry = (id: string, register: string): BoardEntryView => ({
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
		]);
		expect(ordered.map((row) => row.title)).toEqual([
			"alpha",
			"bravo",
			"charlie",
			"echo",
			"delta",
		]);
	});
});

describe("bySalience", () => {
	it("leads with the smooth log and keeps each register in order", () => {
		const ordered = bySalience([
			entry("rough-1", "rough"),
			entry("smooth-1", "smooth"),
			entry("rough-2", "rough"),
			entry("smooth-2", "smooth"),
		]);
		expect(ordered.map((row) => row.id)).toEqual([
			"smooth-1",
			"smooth-2",
			"rough-1",
			"rough-2",
		]);
	});
});

describe("actsFor", () => {
	it("offers only the verbs a piece's derived state can accept", () => {
		expect(actsFor(piece("1", "alpha", "held"))).toEqual(["launch", "rewire"]);
		expect(actsFor(piece("1", "alpha", "ready"))).toEqual(["park", "rewire"]);
		expect(actsFor(piece("1", "alpha", "blocked"))).toEqual(["park", "rewire"]);
		expect(actsFor(piece("1", "alpha", "parked"))).toEqual([
			"unpark",
			"rewire",
		]);
	});

	it("an active or landed piece offers nothing but repositioning", () => {
		expect(actsFor(piece("1", "alpha", "active"))).toEqual(["rewire"]);
		expect(actsFor(piece("1", "alpha", "done"))).toEqual(["rewire"]);
	});
});

describe("captainAtWork", () => {
	it("a captain alive or being born is an address already", () => {
		expect(captainAtWork({ agentId: "agent-1", status: "alive" })).toBe(true);
		expect(captainAtWork({ agentId: "agent-1", status: "spawning" })).toBe(
			true,
		);
	});

	it("no captain, or one that has stood down, leaves the voyage unaddressed", () => {
		expect(captainAtWork(null)).toBe(false);
		expect(captainAtWork({ agentId: "agent-1", status: "dormant" })).toBe(
			false,
		);
		expect(captainAtWork({ agentId: "agent-1", status: "retired" })).toBe(
			false,
		);
	});
});

describe("dependsOnLabel", () => {
	const alpha = piece("1", "alpha", "done");
	const bravo = piece("2", "bravo", "done");

	it("names what gates a piece by title", () => {
		const gated = piece("3", "charlie", "blocked", ["1", "2"]);
		expect(dependsOnLabel(gated, [alpha, bravo, gated])).toBe(
			"depends on: alpha, bravo",
		);
	});

	it("says nothing for a piece nothing gates", () => {
		expect(dependsOnLabel(alpha, [alpha])).toBe("");
	});

	it("falls back to the id when the piece is not on the voyage", () => {
		const gated = piece("3", "charlie", "blocked", ["elsewhere"]);
		expect(dependsOnLabel(gated, [gated])).toBe("depends on: elsewhere");
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

describe("artifactHref", () => {
	it("links what lives on the web and shows what does not", () => {
		expect(artifactHref("https://example.test/chart.png")).toBe(
			"https://example.test/chart.png",
		);
		expect(artifactHref("/tmp/reef/chart.png")).toBeUndefined();
	});
});
