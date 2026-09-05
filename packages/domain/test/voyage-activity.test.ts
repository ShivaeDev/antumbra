import { expect, it } from "@effect/vitest";
import { change, piece, RELEASED, session, withChanges, world } from "#test/piece-ladder-fixtures.ts";
import { lastStirredAt } from "#voyage-activity.ts";

const LATER = new Date("2026-08-16T09:00:00.000Z");

const onVoyage = { pieceId: "alpha", voyageId: "voyage-1" };

it("a voyage whose only piece is still held has never stirred", () => {
	const held = world({
		memberships: [onVoyage],
		pieces: [{ ...piece("alpha"), launchedAt: null }],
	});
	expect(lastStirredAt(held, "voyage-1")).toBe(null);
});

it("the last stirring is the newest moment among its rows", () => {
	const released = world({ memberships: [onVoyage] });
	expect(lastStirredAt(released, "voyage-1")).toEqual(RELEASED);

	const parked = world({
		memberships: [onVoyage],
		pieces: [{ ...piece("alpha"), parkedAt: LATER }],
	});
	expect(lastStirredAt(parked, "voyage-1")).toEqual(LATER);

	const hailed = world({
		crews: [{ agentId: "agent-1", role: "captain", voyageId: "voyage-1" }],
		memberships: [onVoyage],
		sessions: [{ ...session("active"), createdAt: LATER }],
	});
	expect(lastStirredAt(hailed, "voyage-1")).toEqual(LATER);

	const touched = withChanges(["open"], { memberships: [onVoyage] });
	expect(lastStirredAt(touched, "voyage-1")).toEqual(RELEASED);
});

it("another voyage's rows do not stir this one", () => {
	const elsewhere = world({
		crews: [{ agentId: "agent-1", role: "captain", voyageId: "voyage-2" }],
		memberships: [{ pieceId: "alpha", voyageId: "voyage-2" }],
		sessions: [session("active")],
	});
	expect(lastStirredAt(elsewhere, "voyage-1")).toBe(null);
});

it("linked changes stir every member piece's voyage regardless of stage or dismissal", () => {
	const touched = world({
		memberships: [onVoyage, { pieceId: "beta", voyageId: "voyage-1" }],
		pieces: [piece("alpha"), piece("beta"), piece("elsewhere")],
		changes: [
			change("shared", "landed"),
			{ ...change("dismissed", "withdrawn"), activityAt: LATER },
			{ ...change("unrelated", "open"), activityAt: new Date(LATER.getTime() + 1) },
		],
		pieceChanges: [
			{ pieceId: "alpha", changeId: "shared", purpose: "produces" },
			{ pieceId: "beta", changeId: "shared", purpose: "produces" },
			{ pieceId: "beta", changeId: "dismissed", purpose: "produces" },
			{ pieceId: "elsewhere", changeId: "unrelated", purpose: "produces" },
		],
		dismissedChangeIds: new Set(["dismissed"]),
	});
	expect(lastStirredAt(touched, "voyage-1")).toEqual(LATER);
	expect(lastStirredAt({ ...touched, changes: touched.changes.filter((row) => row.id !== "dismissed") }, "voyage-1")).toEqual(RELEASED);
});

it("assigned agents contribute historical sessions without crew membership", () => {
	const assigned = world({
		memberships: [onVoyage],
		assignments: [{ agentId: "agent-1", pieceId: "alpha" }],
		sessions: [{ ...session("idle"), status: "closed", createdAt: LATER }],
	});
	expect(lastStirredAt(assigned, "voyage-1")).toEqual(LATER);
});
