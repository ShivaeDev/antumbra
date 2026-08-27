import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import type { MooragePlan } from "@antumbra/plugin-api";
import { expect, it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import type { SpawnFields } from "#index.ts";
import { makeEnsureSessionRow } from "#moorage-session.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";

const AGENT = "agent-two-roots";

const payload: SpawnFields = {
	agentId: AGENT,
	backend: "scripted",
	charter: "answer through one Session",
	role: "hand",
	runner: "local",
	sessionId: "session-second",
};

const plan: MooragePlan = { berths: [], root: `/tmp/moorage/${AGENT}` };

const seed = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: payload.charter,
		currentSessionId: payload.sessionId,
		id: AGENT,
		role: payload.role,
		status: "spawning",
	});
	yield* db.AgentSession.create({
		agentId: AGENT,
		backend: "scripted",
		charterDeliveredAt: null,
		completeness: "recording",
		cwd: plan.root,
		executionStatus: "active",
		id: "session-first",
		kind: null,
		label: null,
		nativeRef: null,
		outcome: null,
		parentSessionId: null,
		rootSessionId: "session-first",
		status: "open",
	} satisfies NewAgentSession);
});

// why: the durable law is a partial unique index, and an index states itself in
// driver words nobody keeps. Read first, the same law refuses by name and says
// which Session already holds the Agent's answer.
it.live("a second open root is refused by name, not by the index", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const ensureSessionRow = yield* makeEnsureSessionRow;
			yield* db.transaction(seed);

			const refusal = yield* Effect.flip(ensureSessionRow(payload, plan));
			expect(refusal._tag).toBe("AgentRootAlreadyOpen");
			if (refusal._tag === "AgentRootAlreadyOpen") {
				expect(refusal.openSessionId).toBe("session-first");
				expect(refusal.sessionId).toBe("session-second");
				expect(refusal.message).toContain("session-first");
			}
			expect((yield* db.AgentSession.all()).map((row) => row.id)).toEqual([
				"session-first",
			]);
		}).pipe(Effect.provide(Layer.merge(temporary.layer, DomainFeedsLive)));
	}),
);
