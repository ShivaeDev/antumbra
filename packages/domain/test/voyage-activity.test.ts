import { expect, it } from "@effect/vitest";
import { piece, RELEASED, session, withChanges, world } from "#test/piece-ladder-fixtures.ts";
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
