import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { it } from "@antumbra/persistence/testing";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { expect } from "@effect/vitest";
import { Effect, Layer, Option, Result } from "effect";
import { CurrentSessions } from "#current/service.ts";

const layer = CurrentSessions.layer.pipe(Layer.provide(Layer.mergeAll(DomainFeedsLive, SessionFabricLive)));

const createAgent = (id: string, currentSessionId: string | null, status = "alive") =>
	Database.use((db) =>
		db.Agent.create({
			charter: `charter ${id}`,
			currentSessionId,
			id,
			role: "test hand",
			status,
		}),
	);

const createSession = (agentId: string, id: string) =>
	Database.use((db) =>
		db.AgentSession.create({
			agentId,
			backend: "scripted",
			charterDeliveredAt: new Date(1),
			createdAt: new Date(1),
			cwd: `/tmp/${agentId}`,
			executionStatus: "idle",
			id,
			nativeRef: `native-${id}`,
			parentSessionId: null,
			rootSessionId: id,
			status: "open",
		} satisfies NewAgentSession),
	);

it.effectDB("adopts and wakes the one Session an Agent holds", function* () {
	yield* Effect.gen(function* () {
		const db = yield* Database;
		const current = yield* CurrentSessions;
		yield* createAgent("agent-holding", null).pipe(Effect.andThen(createSession("agent-holding", "session-held")));

		yield* current.resumable("session-held");
		expect(Option.getOrThrow(yield* db.Agent.where({ id: "agent-holding" }).first()).currentSessionId).toBe("session-held");
		yield* current.awaken("session-held");
		expect(Option.getOrThrow(yield* db.AgentSession.where({ id: "session-held" }).first()).executionStatus).toBe("active");
	}).pipe(Effect.provide(layer));
});

it.effectDB("dormant Agents never regain an execution", function* () {
	yield* Effect.gen(function* () {
		const current = yield* CurrentSessions;
		yield* createAgent("agent-dormant", null, "dormant").pipe(Effect.andThen(createSession("agent-dormant", "session-dormant")));
		const refused = yield* current.resumable("session-dormant");
		expect(Result.isFailure(refused)).toBe(true);
		if (Result.isFailure(refused)) {
			expect(refused.failure._tag).toBe("agent-not-alive");
		}
	}).pipe(Effect.provide(layer));
});
