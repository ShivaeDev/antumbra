import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import { Database } from "@antumbra/persistence";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { AgentDomain } from "#domain.ts";
import { hailCaptain } from "#hail.ts";
import { sessionFor } from "#test/harness.ts";
import { aliveAgent, openReefVoyage, retireOneAlive, sessionIdOf, terminalIntent } from "#test/voyage-fixtures.ts";

const CAPTAIN_TOOLS = [
	"charter_piece",
	"launch_piece",
	"park_piece",
	"unpark_piece",
	"rewire_piece",
	"read_voyage",
	"read_report",
	"read_mail",
	"mark_read",
	"write_board",
	"read_board",
	"add_context",
	"request_ruling",
	"rule_on",
	"pass_up",
	"reclassify_ruling",
	"read_rulings",
];

it.effectApp("hailing a voyage brings it a captain and puts it under way", function* ({ scripted }) {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const boards = yield* Boards;
	const voyage = yield* openReefVoyage;
	yield* boards.write(
		BoardScope.Voyage({ voyageId: voyage.id }),
		EntryInput.Note({
			authorAgentId: Option.none(),
			body: "the eastern approach is safe",
			register: "rough",
		}),
	);

	const hailed = yield* domain.voyages.hail(voyage.id);
	expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
	const captain = yield* aliveAgent(hailed.agentId);
	expect(captain.role).toBe("captain");
	expect(yield* db.VoyageAgent.all()).toMatchObject([{ agentId: hailed.agentId, role: "captain", voyageId: voyage.id }]);

	const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
	expect(view.state).toBe("underWay");
	expect(Option.getOrThrow(view.captain)).toEqual({
		agentId: hailed.agentId,
		atWork: true,
		sessionId: yield* sessionIdOf(hailed.agentId),
		status: "alive",
	});

	const live = yield* sessionFor(scripted, hailed.agentId);
	expect(live.tools.map((tool) => tool.name)).toEqual(CAPTAIN_TOOLS);
	expect((yield* live.sent)[0]).toContain("the eastern approach is safe");
});

it.effectApp("a second hail reaches the captain the voyage already has", function* () {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const voyage = yield* openReefVoyage;
	const hailed = yield* domain.voyages.hail(voyage.id);
	expect(yield* terminalIntent(hailed.intentId)).toBe("succeeded");
	yield* aliveAgent(hailed.agentId);

	const again = yield* hailCaptain(voyage.id);
	expect(again.agentId).toBe(hailed.agentId);
	expect(Option.getOrThrow(yield* db.Intent.where({ id: again.intentId }).first()).tag).toBe("agent/wake");
	expect(yield* db.Agent.all()).toHaveLength(1);
	expect(yield* db.VoyageAgent.all()).toHaveLength(1);
	expect(yield* Effect.flip(domain.voyages.hail("no-such-voyage"))).toMatchObject({ _tag: "VoyageNotFound" });
});

it.effectApp("a retired captain is history, and the voyage may be hailed again", { clock: "live" }, function* ({ scripted }) {
	const db = yield* Database;
	const domain = yield* AgentDomain;
	const voyage = yield* openReefVoyage;
	const first = yield* domain.voyages.hail(voyage.id);
	expect(yield* terminalIntent(first.intentId)).toBe("succeeded");
	yield* aliveAgent(first.agentId);

	yield* retireOneAlive(scripted);
	expect(Option.getOrThrow(yield* domain.voyages.read(voyage.id)).state).toBe("quiet");

	const second = yield* domain.voyages.hail(voyage.id);
	expect(second.agentId).not.toBe(first.agentId);
	expect(yield* terminalIntent(second.intentId)).toBe("succeeded");
	yield* aliveAgent(second.agentId);

	expect((yield* db.VoyageAgent.all()).length).toBe(2);
	const view = Option.getOrThrow(yield* domain.voyages.read(voyage.id));
	expect(Option.getOrThrow(view.captain)).toEqual({
		agentId: second.agentId,
		atWork: true,
		sessionId: yield* sessionIdOf(second.agentId),
		status: "alive",
	});
});
