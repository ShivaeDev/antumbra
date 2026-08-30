import { SightSource } from "@antumbra/contract";
import { type Gate, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { AgentDomain } from "#domain.ts";
import { attributeIntents } from "#sight-diagnostics.ts";
import { domainKernelLayer, sightSourceTestLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, type ScriptedBackend } from "#test/harness.ts";
import { eventually } from "#test/session-recovery-fixture.ts";

interface Hold {
	open: boolean;
}

// why: production gates are pure predicates over a snapshot; this double is
// the test's hand on that predicate, so an Intent can be held in "queued"
// without waiting on a real capacity condition.
const holdGate = (hold: Hold): Gate => ({
	admits: () => hold.open,
	id: "test-hold",
});

const sightLayer = (temporary: TemporaryPersistence, scripted: ScriptedBackend, hold: Hold) =>
	sightSourceTestLayer.pipe(
		Layer.provideMerge(
			domainKernelLayer(temporary, scripted.backend, {
				gates: [holdGate(hold)],
			}),
		),
	);

const spawnRequest = {
	backend: "scripted",
	charter: "chart the reef",
	role: "navigator",
};

const words = (intents: ReadonlyArray<{ readonly kind: string; readonly state: string }>) =>
	intents.map((intent) => `${intent.kind} ${intent.state}`);

it.live("a spawn held before admission stands on the fleet itself", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* sight.spawn(spawnRequest);
			const fleet = yield* sight.fleet;
			expect(fleet.agents).toEqual([]);
			expect(words(fleet.diag.intents)).toEqual(["agent/spawn queued"]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted, { open: false })));
	}),
);

it.live("a draining session shows its execution word beside its intent", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const hold: Hold = { open: true };
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			const receipt = yield* sight.spawn(spawnRequest);
			yield* eventually(
				Effect.gen(function* () {
					const fleet = yield* sight.fleet;
					const opened = fleet.agents.flatMap((agent) => agent.sessions).find((session) => session.id === receipt.sessionId);
					expect(opened?.diag.execution).toBe("active");
					expect(opened?.diag.current).toBe(true);
				}),
			);
			hold.open = false;
			yield* db.AgentSession.where({ id: receipt.sessionId }).update({
				executionStatus: "draining",
			});
			yield* kernel.submit(domain.siesta, { sessionId: receipt.sessionId });
			const fleet = yield* sight.fleet;
			const agent = fleet.agents.find((row) => row.id === receipt.agentId);
			const session = agent?.sessions.find((row) => row.id === receipt.sessionId);
			expect(session?.diag.execution).toBe("draining");
			// why: draining is on its way to rest, not out of reach. The words
			// wake it once the drain has settled, so the fleet keeps saying the
			// admiral may speak to it.
			expect(session?.canSend).toBe(true);
			expect(session?.canInterrupt).toBe(false);
			expect(words(session?.diag.intents ?? [])).toContain("session/siesta queued");
			expect(agent?.diag.currentSessionId).toBe(receipt.sessionId);
			expect(fleet.diag.intents).toEqual([]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted, hold)));
	}),
);

it("attributes a pending intent to the most specific row that exists", () => {
	const attribution = attributeIntents(
		[
			{
				agentId: "agent-1",
				detail: "waiting on a berth",
				id: "intent-1",
				kind: "agent/spawn",
				sessionId: "session-1",
				state: "running",
			},
			{
				agentId: "agent-1",
				detail: null,
				id: "intent-2",
				kind: "agent/retire",
				sessionId: null,
				state: "queued",
			},
			{
				agentId: "agent-2",
				detail: null,
				id: "intent-3",
				kind: "agent/spawn",
				sessionId: "session-2",
				state: "queued",
			},
		],
		new Set(["agent-1"]),
		new Set(["session-1"]),
	);
	// why: the reason travels with the mark, so attribution carries a sentence
	// the reader will otherwise have to go to the database for.
	expect(attribution.sessions.get("session-1")).toEqual([
		{
			detail: "waiting on a berth",
			id: "intent-1",
			kind: "agent/spawn",
			state: "running",
		},
	]);
	expect(attribution.agents.get("agent-1")).toEqual([{ detail: null, id: "intent-2", kind: "agent/retire", state: "queued" }]);
	expect(attribution.loose).toEqual([{ detail: null, id: "intent-3", kind: "agent/spawn", state: "queued" }]);
});
