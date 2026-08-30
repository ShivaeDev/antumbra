import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type NewAgentSession } from "@antumbra/persistence";
import { acquireTemporaryPersistence } from "@antumbra/persistence/testing";
import { SessionFabricLive } from "@antumbra/session-fabric";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Result } from "effect";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";

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

// why: an Agent can no longer hold two open Sessions — the durable law admits
// one open root apiece — so the newest-wins repair this file used to prove now
// lives at the migration boundary, against the legacy histories that can still
// contain that state. What stays reachable through the public surface is the
// rest of the guarantee: the Session an Agent holds is adopted, resumed, woken.
it.live("adopts and wakes the one Session an Agent holds", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const layer = Layer.mergeAll(temporary.layer, DomainFeedsLive, SessionFabricLive);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const current = yield* makeCurrentSessionRecovery;
			yield* db.transaction(createAgent("agent-holding", null).pipe(Effect.andThen(createSession("agent-holding", "session-held"))));

			expect(Result.isSuccess(yield* current.resumable("session-held"))).toBe(true);
			expect(Option.getOrThrow(yield* db.Agent.where({ id: "agent-holding" }).first()).currentSessionId).toBe("session-held");
			expect(Option.getOrThrow(yield* db.AgentSession.where({ id: "session-held" }).first()).executionStatus).toBe("idle");
			yield* current.awaken("session-held");
			expect(Option.getOrThrow(yield* db.AgentSession.where({ id: "session-held" }).first()).executionStatus).toBe("active");
		}).pipe(Effect.provide(layer));
	}),
);

it.live("dormant Agents never regain an execution", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const layer = Layer.mergeAll(temporary.layer, DomainFeedsLive, SessionFabricLive);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const current = yield* makeCurrentSessionRecovery;
			yield* db.transaction(createAgent("agent-dormant", null, "dormant").pipe(Effect.andThen(createSession("agent-dormant", "session-dormant"))));
			const refused = yield* current.resumable("session-dormant");
			expect(Result.isFailure(refused)).toBe(true);
			if (Result.isFailure(refused)) {
				expect(refused.failure._tag).toBe("agent-not-alive");
			}
		}).pipe(Effect.provide(layer));
	}),
);
