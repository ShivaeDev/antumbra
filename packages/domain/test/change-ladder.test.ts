import { changeStatus } from "@antumbra/changes";
import { expect, it } from "@effect/vitest";
import { pieceOutcomeTally } from "#outcome-status.ts";
import { change, piece, stateOf, withChanges, world } from "#test/piece-ladder-fixtures.ts";

it("a change counts as landed, pending or withdrawn by its stage", () => {
	expect(changeStatus(change("a", "landed"))).toBe("landed");
	expect(changeStatus(change("a", "open"))).toBe("pending");
	expect(changeStatus(change("a", "prepared"))).toBe("pending");
	expect(changeStatus(change("a", "withdrawn"))).toBe("withdrawn");
});

it("a report and an artifact land a piece outright", () => {
	const built = world({
		artifacts: new Map([
			[
				"artifact-1",
				{
					authorAgentId: null,
					basename: "chart.md",
					byteSize: 7,
					digest: "0".repeat(64),
					id: "artifact-1",
					pieceId: "alpha",
					supersededByArtifactId: null,
					title: "chart",
				},
			],
		]),
		pieceReports: [{ pieceId: "alpha", reportId: "report-1" }],
	});
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 2, pending: 0 });
	expect(stateOf(built)).toBe("done");
});

it("a pending change holds a piece short of done, however much else landed", () => {
	const built = withChanges(["open"], {
		pieceReports: [{ pieceId: "alpha", reportId: "report-1" }],
	});
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 1, pending: 1 });
	expect(stateOf(built)).toBe("landing");
});

it("a change alone is enough to hold a piece landing", () => {
	expect(stateOf(withChanges(["open"]))).toBe("landing");
	expect(stateOf(withChanges(["prepared"]))).toBe("landing");
	expect(stateOf(withChanges(["landed", "open"]))).toBe("landing");
});

it("a piece is done when every change of it has landed", () => {
	const built = withChanges(["landed", "landed"]);
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 2, pending: 0 });
	expect(stateOf(built)).toBe("done");
});

it("a withdrawn change with nothing replacing it stops counting at all", () => {
	const built = withChanges(["withdrawn"]);
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 0, pending: 0 });
	expect(stateOf(built)).toBe("ready");
});

it("a withdrawn change counts only while a replacement is under way", () => {
	expect(pieceOutcomeTally(withChanges(["withdrawn", "open"]), "alpha")).toEqual({ landed: 0, pending: 2 });
	expect(pieceOutcomeTally(withChanges(["withdrawn", "prepared"]), "alpha")).toEqual({ landed: 0, pending: 2 });
	expect(pieceOutcomeTally(withChanges(["withdrawn", "landed"]), "alpha")).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(withChanges(["withdrawn", "landed"]))).toBe("done");
});

it("a dismissed change counts for nothing even while a sibling is open", () => {
	const built = withChanges(["withdrawn", "open"], {
		dismissedChangeIds: new Set(["change-0"]),
	});
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 0, pending: 1 });
});

it("a withdrawn change alone leaves a reported piece done rather than landing", () => {
	const reported = withChanges(["withdrawn"], {
		pieceReports: [{ pieceId: "alpha", reportId: "report-1" }],
	});
	expect(pieceOutcomeTally(reported, "alpha")).toEqual({
		landed: 1,
		pending: 0,
	});
	expect(stateOf(reported)).toBe("done");
});

it("a delivered verdict is a landed outcome and the ladder derives done", () => {
	const built = world({ pieceVerdicts: new Map([["alpha", "delivered"]]) });
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(built)).toBe("done");
});

it("a delivered verdict does not outrank a change still on its way", () => {
	const built = withChanges(["open"], {
		pieceVerdicts: new Map([["alpha", "delivered"]]),
	});
	expect(stateOf(built)).toBe("landing");
});

it("an abandoned piece reads abandoned rather than done", () => {
	const built = world({ pieceVerdicts: new Map([["alpha", "abandoned"]]) });
	expect(pieceOutcomeTally(built, "alpha")).toEqual({ landed: 1, pending: 0 });
	expect(stateOf(built)).toBe("abandoned");
});

it("an abandoned piece stops gating what depended on it", () => {
	const built = world({
		changes: [change("change-0", "open")],
		edges: [{ fromPieceId: "bravo", toPieceId: "alpha" }],
		pieceChanges: [{ changeId: "change-0", pieceId: "bravo", purpose: "produces" }],
		pieceVerdicts: new Map([["bravo", "abandoned"]]),
		pieces: [piece("alpha"), piece("bravo")],
	});
	expect(stateOf(built, "bravo")).toBe("abandoned");
	expect(stateOf(built)).toBe("ready");
});

it("landing sits below blocked and above ready on the ladder", () => {
	const gated = withChanges(["open"], {
		edges: [{ fromPieceId: "bravo", toPieceId: "alpha" }],
		pieces: [piece("alpha"), piece("bravo")],
	});
	expect(stateOf(gated)).toBe("blocked");
});
