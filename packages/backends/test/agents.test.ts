import { type IntentStatus, Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Schedule, Stream } from "effect";
import { AGENTS_ALIVE_GAUGE, AgentDomain } from "#domain.ts";
import type { RetireFields, SpawnFields } from "#index.ts";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
} from "#test/harness.ts";

const TERMINAL: ReadonlySet<IntentStatus> = new Set([
	"cancelled",
	"failed",
	"succeeded",
]);

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => TERMINAL.has(status)),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const eventually = <A, E, R>(check: Effect.Effect<A, E, R>) =>
	check.pipe(
		Effect.catchDefect((defect) => Effect.fail(defect)),
		Effect.retry(Schedule.spaced(10).pipe(Schedule.upTo({ duration: 2000 }))),
	);

const submitSpawn = (payload: SpawnFields) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const submission = yield* kernel.submit(domain.spawn, payload);
		return yield* untilTerminal(submission.changes);
	});

const submitRetire = (payload: RetireFields) =>
	Effect.gen(function* () {
		const kernel = yield* Kernel;
		const domain = yield* AgentDomain;
		const submission = yield* kernel.submit(domain.retire, payload);
		return yield* untilTerminal(submission.changes);
	});

const spawnPayload = (suffix: string): SpawnFields => ({
	agentId: `agent-${suffix}`,
	backend: "scripted",
	charter: `charter for ${suffix}`,
	repos: [],
	role: "test hand",
	runner: "local",
	sessionId: `session-${suffix}`,
});

it.live("spawn brings an agent alive, chartered, with events flowing", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const outcome = yield* submitSpawn(spawnPayload("a"));
			expect(outcome).toBe("succeeded");
			const agent = yield* db.Agent.where({ id: "agent-a" }).first();
			expect(Option.getOrThrow(agent).status).toBe("alive");
			const session = yield* db.AgentSession.where({ id: "session-a" }).first();
			expect(Option.getOrThrow(session).charterDeliveredAt).not.toBeNull();
			const live = yield* scripted.session("session-a");
			expect(live).toBeDefined();
			if (live === undefined) {
				return;
			}
			expect(yield* live.sent).toEqual(["charter for a"]);
			yield* live.emit({ kind: "system/thinking_tokens", payload: "{}" });
			yield* live.emit({ kind: "assistant", payload: '{"text":"hi"}' });
			yield* eventually(
				Effect.gen(function* () {
					const events = yield* db.SessionEvent.where({
						sessionId: "session-a",
					}).all();
					expect(events).toHaveLength(1);
					expect(events[0]?.kind).toBe("assistant");
					expect(events[0]?.seq).toBe(0);
				}),
			);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("spawn against an unknown backend tag fails visibly", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const outcome = yield* submitSpawn({
				...spawnPayload("b"),
				backend: "nope",
			});
			expect(outcome).toBe("failed");
			const agent = yield* db.Agent.where({ id: "agent-b" }).first();
			expect(Option.isNone(agent)).toBe(true);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("retire closes the session, the rows, and is idempotent", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* submitSpawn(spawnPayload("c"));
			const first = yield* submitRetire({ agentId: "agent-c" });
			expect(first).toBe("succeeded");
			const agent = yield* db.Agent.where({ id: "agent-c" }).first();
			expect(Option.getOrThrow(agent).status).toBe("retired");
			const session = yield* db.AgentSession.where({ id: "session-c" }).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
			const live = yield* scripted.session("session-c");
			expect(live !== undefined && (yield* live.closed)).toBe(true);
			const again = yield* submitRetire({ agentId: "agent-c" });
			expect(again).toBe("succeeded");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("boot reclaim marks agents the last life left alive as dormant", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* submitSpawn(spawnPayload("d"));
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
		const live = yield* scripted.session("session-d");
		expect(live !== undefined && (yield* live.closed)).toBe(true);
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const agent = yield* db.Agent.where({ id: "agent-d" }).first();
			expect(Option.getOrThrow(agent).status).toBe("dormant");
			const session = yield* db.AgentSession.where({ id: "session-d" }).first();
			expect(Option.getOrThrow(session).status).toBe("closed");
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);

it.live("the alive-agents gauge tracks births and deaths", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const gauge = domain.gauges[AGENTS_ALIVE_GAUGE] ?? Effect.succeed(-1);
			expect(yield* gauge).toBe(0);
			yield* submitSpawn(spawnPayload("e"));
			expect(yield* gauge).toBe(1);
			yield* submitRetire({ agentId: "agent-e" });
			expect(yield* gauge).toBe(0);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
