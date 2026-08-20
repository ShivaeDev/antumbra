import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";

const createAgent = (
	id: string,
	currentSessionId: string | null,
	status = "alive",
) =>
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
		}),
	);

it.live("recovery repairs to newest before allowing only that Session", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const layer = Layer.merge(temporary.layer, DomainFeedsLive);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const current = yield* makeCurrentSessionRecovery;
			yield* writer.write(
				createAgent("agent-newest", null).pipe(
					Effect.andThen(createSession("agent-newest", "session-a")),
					Effect.andThen(createSession("agent-newest", "session-b")),
				),
			);

			expect(Option.isNone(yield* current.resumable("session-a"))).toBe(true);
			expect(
				Option.getOrThrow(yield* db.Agent.where({ id: "agent-newest" }).first())
					.currentSessionId,
			).toBe("session-b");
			expect(
				(yield* db.AgentSession.where({ agentId: "agent-newest" }).all()).map(
					(session) => [session.id, session.status],
				),
			).toEqual([
				["session-a", "closed"],
				["session-b", "open"],
			]);
			expect(Option.isSome(yield* current.resumable("session-b"))).toBe(true);
			expect(
				Option.getOrThrow(
					yield* db.AgentSession.where({ id: "session-b" }).first(),
				).executionStatus,
			).toBe("idle");
			yield* current.awaken("session-b");
			expect(
				Option.getOrThrow(
					yield* db.AgentSession.where({ id: "session-b" }).first(),
				).executionStatus,
			).toBe("active");
		}).pipe(Effect.provide(layer));
	}),
);

it.live("an explicit current Session closes newer stale history", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const layer = Layer.merge(temporary.layer, DomainFeedsLive);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const writer = yield* Writer;
			const current = yield* makeCurrentSessionRecovery;
			yield* writer.write(
				createAgent("agent-explicit", "session-a").pipe(
					Effect.andThen(createSession("agent-explicit", "session-a")),
					Effect.andThen(createSession("agent-explicit", "session-b")),
				),
			);

			expect(Option.isNone(yield* current.resumable("session-b"))).toBe(true);
			expect(
				Option.getOrThrow(
					yield* db.AgentSession.where({ id: "session-b" }).first(),
				).status,
			).toBe("closed");
			expect(Option.isSome(yield* current.resumable("session-a"))).toBe(true);
		}).pipe(Effect.provide(layer));
	}),
);

it.live("dormant Agents never regain an execution", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const layer = Layer.merge(temporary.layer, DomainFeedsLive);
		yield* Effect.gen(function* () {
			const writer = yield* Writer;
			const current = yield* makeCurrentSessionRecovery;
			yield* writer.write(
				createAgent("agent-dormant", null, "dormant").pipe(
					Effect.andThen(createSession("agent-dormant", "session-dormant")),
				),
			);
			expect(Option.isNone(yield* current.resumable("session-dormant"))).toBe(
				true,
			);
		}).pipe(Effect.provide(layer));
	}),
);
