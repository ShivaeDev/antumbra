import { expect, it } from "@effect/vitest";
import { type WorkLinks, workByAgent } from "#agent-work.ts";

const workOf = (links: WorkLinks, agentId: string) => workByAgent(links).get(agentId) ?? [];

const links = (overrides?: Partial<WorkLinks>): WorkLinks => ({
	assignments: [{ agentId: "agent-1", pieceId: "piece-1" }],
	crews: [{ agentId: "captain", role: "captain", voyageId: "voyage-1" }],
	memberships: [
		{ pieceId: "piece-1", voyageId: "voyage-1" },
		{ pieceId: "piece-1", voyageId: "voyage-2" },
		{ pieceId: "piece-2", voyageId: "voyage-1" },
	],
	pieces: [
		{ id: "piece-1", title: "soundings" },
		{ id: "piece-2", title: "the chart" },
	],
	voyages: [
		{ id: "voyage-1", name: "the reef" },
		{ id: "voyage-2", name: "the strait" },
	],
	...overrides,
});

it("names every voyage for every piece assigned to an agent", () => {
	expect(
		workOf(
			links({
				assignments: [
					{ agentId: "agent-1", pieceId: "piece-1" },
					{ agentId: "agent-1", pieceId: "piece-2" },
				],
			}),
			"agent-1",
		),
	).toEqual([
		{ kind: "piece", pieceId: "piece-1", pieceTitle: "soundings", voyageId: "voyage-1", voyageName: "the reef" },
		{ kind: "piece", pieceId: "piece-1", pieceTitle: "soundings", voyageId: "voyage-2", voyageName: "the strait" },
		{ kind: "piece", pieceId: "piece-2", pieceTitle: "the chart", voyageId: "voyage-1", voyageName: "the reef" },
	]);
});

it("names an unassigned captain by every voyage it commands", () => {
	expect(
		workOf(
			links({
				crews: [
					{ agentId: "captain", role: "captain", voyageId: "voyage-1" },
					{ agentId: "captain", role: "captain", voyageId: "voyage-2" },
				],
			}),
			"captain",
		),
	).toEqual([
		{ kind: "voyage", voyageId: "voyage-1", voyageName: "the reef" },
		{ kind: "voyage", voyageId: "voyage-2", voyageName: "the strait" },
	]);
});

it("shows piece work instead of command when a captain is assigned", () => {
	expect(workOf(links({ assignments: [{ agentId: "captain", pieceId: "piece-2" }] }), "captain")).toEqual([
		{ kind: "piece", pieceId: "piece-2", pieceTitle: "the chart", voyageId: "voyage-1", voyageName: "the reef" },
	]);
	expect(workOf(links({ assignments: [{ agentId: "captain", pieceId: "piece-2" }], memberships: [] }), "captain")).toEqual([]);
});
