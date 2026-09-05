import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Clock, Effect } from "effect";
import { dayStart } from "#costs/days.ts";
import { costsLayer, costsView, crewedAgent, openedSession, openedVoyage, spentTurn } from "#test/costs-fixture.ts";

it.effectDB("sums every turn an agent spent, across its sessions and its delegated nodes", function* (db) {
	yield* Effect.gen(function* () {
		const at = new Date(yield* Clock.currentTimeMillis);
		yield* openedVoyage(db, "voyage-reef", "Chart the reef");
		yield* crewedAgent(db, "agent-navigator", "voyage-reef");
		yield* openedSession(db, { agentId: "agent-navigator", backend: "claude", id: "session-root" });
		yield* openedSession(db, { agentId: "agent-navigator", backend: "claude", id: "session-node", parentSessionId: "session-root" });
		yield* spentTurn(db, { at, cacheReadTokens: 400, costUsd: 0.5, inputTokens: 100, outputTokens: 10, seq: 0, sessionId: "session-root" });
		yield* spentTurn(db, { at, cacheReadTokens: 600, costUsd: 0.25, inputTokens: 200, outputTokens: 20, seq: 0, sessionId: "session-node" });

		const view = yield* costsView;
		expect(view.total).toEqual({
			cacheReadTokens: 1000,
			cacheWriteTokens: 0,
			costPartial: false,
			costUsd: 0.75,
			inputTokens: 300,
			outputTokens: 30,
			turns: 2,
		});
		expect(view.agents).toHaveLength(1);
		expect(view.agents[0]?.agentId).toBe("agent-navigator");
		expect(view.agents[0]?.sessionIds.toSorted()).toEqual(["session-node", "session-root"]);
		expect(view.agents[0]?.total.inputTokens).toBe(300);
		expect(view.voyages).toEqual([{ name: "Chart the reef", total: view.total, voyageId: "voyage-reef" }]);
		expect(view.unassigned.turns).toBe(0);
	}).pipe(Effect.provide(costsLayer));
});

it.effectDB("marks a total partial when only some contributing turns reported a cost", function* (db) {
	yield* Effect.gen(function* () {
		const at = new Date(yield* Clock.currentTimeMillis);
		yield* openedVoyage(db, "voyage-reef", "Chart the reef");
		yield* crewedAgent(db, "agent-claude", "voyage-reef");
		yield* crewedAgent(db, "agent-codex", "voyage-reef");
		yield* openedSession(db, { agentId: "agent-claude", backend: "claude", id: "session-claude" });
		yield* openedSession(db, { agentId: "agent-codex", backend: "codex", id: "session-codex" });
		yield* spentTurn(db, { at, costUsd: 0.4, inputTokens: 100, outputTokens: 10, seq: 0, sessionId: "session-claude" });
		yield* spentTurn(db, { at, inputTokens: 900, outputTokens: 90, seq: 0, sessionId: "session-codex" });

		const view = yield* costsView;
		expect(view.total.costUsd).toBe(0.4);
		expect(view.total.costPartial).toBe(true);
		expect(view.voyages[0]?.total.costPartial).toBe(true);
	}).pipe(Effect.provide(costsLayer));
});

it.effectDB("reads a cost as not reported when no contributing turn carried one", function* (db) {
	yield* Effect.gen(function* () {
		const at = new Date(yield* Clock.currentTimeMillis);
		yield* openedVoyage(db, "voyage-codex", "Codex only");
		yield* crewedAgent(db, "agent-codex", "voyage-codex");
		yield* openedSession(db, { agentId: "agent-codex", backend: "codex", id: "session-codex" });
		yield* spentTurn(db, { at, inputTokens: 500, outputTokens: 50, model: "gpt-5-codex", seq: 0, sessionId: "session-codex" });

		const view = yield* costsView;
		expect(view.total.costUsd).toBeNull();
		expect(view.total.costPartial).toBe(false);
		expect(view.models).toEqual([{ model: "gpt-5-codex", total: view.total }]);
	}).pipe(Effect.provide(costsLayer));
});

it.effectDB("keeps spend by agents on no voyage out of the voyage rows", function* (db) {
	yield* Effect.gen(function* () {
		const at = new Date(yield* Clock.currentTimeMillis);
		yield* crewedAgent(db, "agent-loose", null);
		yield* openedSession(db, { agentId: "agent-loose", backend: "claude", id: "session-loose" });
		yield* spentTurn(db, { at, costUsd: 0.1, inputTokens: 70, outputTokens: 7, seq: 0, sessionId: "session-loose" });

		const view = yield* costsView;
		expect(view.voyages).toEqual([]);
		expect(view.unassigned).toEqual(view.total);
		expect(view.unassigned.costUsd).toBe(0.1);
	}).pipe(Effect.provide(costsLayer));
});

it.effectDB("lays the last thirty days out in order, split by backend, and leaves older turns out of the series", function* (db) {
	yield* Effect.gen(function* () {
		const now = new Date(yield* Clock.currentTimeMillis);
		yield* openedVoyage(db, "voyage-reef", "Chart the reef");
		yield* crewedAgent(db, "agent-claude", "voyage-reef");
		yield* crewedAgent(db, "agent-codex", "voyage-reef");
		yield* openedSession(db, { agentId: "agent-claude", backend: "claude", id: "session-claude" });
		yield* openedSession(db, { agentId: "agent-codex", backend: "codex", id: "session-codex" });
		yield* spentTurn(db, { at: now, costUsd: 0.2, inputTokens: 100, outputTokens: 10, seq: 0, sessionId: "session-claude" });
		yield* spentTurn(db, { at: now, inputTokens: 300, outputTokens: 30, seq: 0, sessionId: "session-codex" });
		yield* spentTurn(db, { at: dayStart(now, 2), costUsd: 0.9, inputTokens: 40, outputTokens: 4, seq: 1, sessionId: "session-claude" });
		yield* spentTurn(db, { at: dayStart(now, 40), costUsd: 7, inputTokens: 11, outputTokens: 1, seq: 2, sessionId: "session-claude" });

		const view = yield* costsView;
		expect(view.days).toHaveLength(30);
		expect(view.days.at(-1)?.backends.map((entry) => entry.backend)).toEqual(["claude", "codex"]);
		expect(view.days.at(-1)?.backends[0]?.total).toMatchObject({ costUsd: 0.2, inputTokens: 100, turns: 1 });
		expect(view.days.at(-1)?.backends[1]?.total).toMatchObject({ costUsd: null, inputTokens: 300, turns: 1 });
		expect(view.days.at(-3)?.backends).toEqual([{ backend: "claude", total: view.days.at(-3)?.backends[0]?.total }]);
		expect(view.days.at(-3)?.backends[0]?.total.inputTokens).toBe(40);
		expect(view.days.filter((day) => day.backends.length > 0)).toHaveLength(2);
		expect(view.total.inputTokens).toBe(451);
	}).pipe(Effect.provide(costsLayer));
});
