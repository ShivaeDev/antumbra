import type { SessionSituation } from "@antumbra/contract";
import { expect, it } from "@effect/vitest";
import { situationsByAgent } from "#agent-situations.ts";

it("preserves assignment order and repeated Changes across an agent's Pieces", () => {
	const first: SessionSituation = { changeId: "first", reference: "#1", situation: "merge_conflicts" };
	const second: SessionSituation = { changeId: "second", reference: "#2", situation: "checks_failed" };
	const situations = situationsByAgent(
		[
			{ agentId: "agent-1", pieceId: "piece-2" },
			{ agentId: "agent-2", pieceId: "piece-1" },
			{ agentId: "agent-1", pieceId: "piece-1" },
		],
		new Map([
			["piece-1", [first]],
			["piece-2", [second, first]],
		]),
	);
	expect(situations.get("agent-1")?.map((situation) => situation.changeId)).toEqual(["second", "first", "first"]);
	expect(situations.get("agent-2")?.map((situation) => situation.changeId)).toEqual(["first"]);
	expect(situations.get("unassigned") ?? []).toEqual([]);
});
