import { SightSource } from "@antumbra/contract";
import { Kernel } from "@antumbra/kernel";
import { Database, type NewAgentSession, Writer } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { TestClock } from "effect/testing";
import { AgentDomain } from "#domain.ts";
import type { SpawnFields } from "#index.ts";
import { IDLE_SIESTA_AFTER_MILLIS } from "#session-idle.ts";
import { SightSourceLive } from "#sight.ts";
import {
	acquireTemporaryPersistence,
	callTool,
	domainKernelLayer,
	makeScriptedBackend,
	rawOf,
	type ScriptedBackend,
	sessionFor,
} from "#test/harness.ts";
import {
	eventually,
	reportsNativeRef,
	untilTerminal,
} from "#test/session-recovery-fixture.ts";

const HAND: SpawnFields = {
	agentId: "agent-idle",
	backend: "scripted",
	charter: "hold the same watch",
	role: "hand",
	runner: "local",
	sessionId: "session-idle",
};

const sessionRow = Effect.gen(function* () {
	const db = yield* Database;
	return Option.getOrThrow(
		yield* db.AgentSession.where({ id: HAND.sessionId }).first(),
	);
});

const sightLayer = (
	temporary: Parameters<typeof domainKernelLayer>[0],
	scripted: ScriptedBackend,
) =>
	SightSourceLive.pipe(
		Layer.provideMerge(
			domainKernelLayer(
				temporary,
				reportsNativeRef(scripted.backend, scripted, "native-idle"),
			),
		),
	);

const spawned = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const submission = yield* kernel.submit(domain.spawn, HAND);
	expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
});

const openedNatively = (scripted: ScriptedBackend) =>
	Effect.gen(function* () {
		const live = yield* sessionFor(scripted, HAND.agentId);
		yield* live.emit({
			nativeRef: "native-idle",
			raw: rawOf("session/opened"),
			type: "session.opened",
		});
		yield* eventually(
			Effect.gen(function* () {
				expect((yield* sessionRow).nativeRef).toBe("native-idle");
			}),
		);
		return live;
	});

// why: under a controlled clock nothing runs unless time is moved, so the
// rehearsal moves it and then lets every fiber the move woke reach its own
// next wait before reading anything.
const settled = (millis: number) =>
	TestClock.adjust(millis).pipe(
		Effect.andThen(Effect.repeat(Effect.yieldNow, { times: 50 })),
	);

const presenceOf = Effect.gen(function* () {
	const sight = yield* SightSource;
	const fleet = yield* sight.fleet;
	const session = fleet.agents
		.flatMap((agent) => agent.sessions)
		.find((row) => row.id === HAND.sessionId);
	return Option.getOrThrow(Option.fromUndefinedOr(session));
});

// why: the whole point of the correction. Saying "nothing to do" used to be the
// same act as being put away, so an Agent that had finished was an Agent that
// could not be spoken to. It stays where it was, and the next words find it
// there — no resume, no second provider session opened.
it.live("standing down keeps the acquisition, and the next words need no resume", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);

			expect(yield* callTool(live, "stand_down", undefined)).toEqual({
				ok: true,
				text: "standing by",
			});
			yield* eventually(
				Effect.gen(function* () {
					expect((yield* sessionRow).executionStatus).toBe("idle");
				}),
			);
			expect(yield* live.closed).toBe(false);
			const idle = yield* presenceOf;
			expect(idle.presence).toBe("idle");
			expect(idle.canSend).toBe(true);
			expect(idle.canInterrupt).toBe(false);

			yield* sight.send(HAND.sessionId, "one more thing");
			expect(yield* live.sent).toEqual([HAND.charter, "one more thing"]);
			// why: one provider session for the whole exchange is the evidence that
			// nothing was torn down and rebuilt behind the words.
			expect(yield* scripted.opened).toHaveLength(1);
			expect((yield* sessionRow).executionStatus).toBe("active");
			expect((yield* presenceOf).presence).toBe("working");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: the clock puts a Session to siesta, never the Agent. The row is already
// idle and stays idle — reclaiming the process changes who is listening, not
// what the record says — so the Session remains open and resumable throughout.
it.effect("an idle session crosses into siesta at the threshold", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* spawned;
			const live = yield* sessionFor(scripted, HAND.agentId);
			yield* callTool(live, "stand_down", undefined);
			expect((yield* sessionRow).executionStatus).toBe("idle");

			// why: a whole demand pass short of the threshold, so the pass has
			// certainly run and certainly declined to reclaim anything.
			yield* settled(IDLE_SIESTA_AFTER_MILLIS - 10_000);
			expect(yield* db.Intent.where({ tag: "session/siesta" }).all()).toEqual(
				[],
			);
			expect(yield* live.closed).toBe(false);

			yield* settled(20_000);
			expect(yield* live.closed).toBe(true);
			// why: the process is gone and the record is untouched — the Session is
			// still open, still idle, and still names the conversation to resume.
			const row = yield* sessionRow;
			expect(row.status).toBe("open");
			expect(row.executionStatus).toBe("idle");
			expect(
				(yield* db.Intent.where({ tag: "session/siesta" }).all()).map(
					(intent) => intent.status,
				),
			).toEqual(["succeeded"]);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: wake-on-send. An asleep root is resumed through the machinery a hail
// already uses, and the words the admiral sent are what it is told on arrival —
// one act, no separate wake control to find.
it.live("a send to an asleep root resumes it and delivers the words", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const domain = yield* AgentDomain;
			const kernel = yield* Kernel;
			const sight = yield* SightSource;
			yield* spawned;
			const first = yield* openedNatively(scripted);
			yield* callTool(first, "stand_down", undefined);
			// why: the siesta is asked for directly, standing in for the hour the
			// clock would otherwise have to pass — the threshold itself is proved
			// on its own above, and this rehearsal is about waking.
			const siesta = yield* kernel.submit(domain.siesta, {
				sessionId: HAND.sessionId,
			});
			expect(yield* untilTerminal(siesta.changes)).toBe("succeeded");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* first.closed).toBe(true);
				}),
			);
			expect((yield* presenceOf).presence).toBe("asleep");
			expect((yield* presenceOf).canSend).toBe(true);

			yield* sight.send(HAND.sessionId, "come about");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
				}),
			);
			const resumed = yield* sessionFor(scripted, HAND.agentId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* resumed.sent).toEqual(["come about"]);
					expect((yield* sessionRow).executionStatus).toBe("active");
				}),
			);
			const reopened = (yield* scripted.opened)[1];
			expect(reopened?.resume).toEqual(Option.some("native-idle"));
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: retirement is the one state that refuses, and it refuses with a typed
// error rather than by going quiet.
it.live("a send to a retired agent's session refuses", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* sight.retire(HAND.agentId);
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* live.closed).toBe(true);
					expect((yield* sessionRow).status).toBe("closed");
				}),
			);
			expect((yield* presenceOf).canSend).toBe(false);
			expect((yield* presenceOf).presence).toBe("ended");
			const refused = yield* Effect.flip(
				sight.send(HAND.sessionId, "still aboard?"),
			);
			expect(refused.message).toContain("has ended");
			const ghost = yield* Effect.flip(sight.send("ghost", "anyone aboard?"));
			expect(ghost.message).toContain("no session ghost");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: a Session is addressed by its root. Making send state-aware widened what
// it will do, never what it will do it to — a child's conversation is one its
// parent is still holding, and nothing outside may speak into it.
it.live("a send addressed at a subsession is still refused", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const sight = yield* SightSource;
			const writer = yield* Writer;
			yield* spawned;
			yield* openedNatively(scripted);
			yield* writer.write(
				db.AgentSession.create({
					agentId: HAND.agentId,
					backend: "scripted",
					createdAt: new Date(2),
					cwd: "/tmp/agent-idle",
					executionStatus: "active",
					id: "session-idle-child",
					kind: "task",
					label: "sound the reef",
					nativeRef: "native-idle-child",
					parentSessionId: HAND.sessionId,
					rootSessionId: HAND.sessionId,
					status: "open",
				} satisfies NewAgentSession),
			);
			const refused = yield* Effect.flip(
				sight.send("session-idle-child", "answer me directly"),
			);
			expect(refused.message).toContain("subsession");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);

// why: idleness is only ever true of a live process, so a restart necessarily
// leaves an idle Session asleep. Boot must read that as an ordinary resumable
// Session — not a failure, and not something to resume unasked — and the send
// is what brings it back.
it.live("a restart leaves an idle session asleep until it is spoken to", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			yield* spawned;
			const live = yield* openedNatively(scripted);
			yield* callTool(live, "stand_down", undefined);
			expect((yield* sessionRow).executionStatus).toBe("idle");
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));

		yield* Effect.gen(function* () {
			const sight = yield* SightSource;
			// why: nothing may wake it on its own — not boot, not a projection,
			// not the passage of a demand pass.
			yield* Effect.sleep(100);
			expect(yield* scripted.opened).toHaveLength(1);
			const asleep = yield* presenceOf;
			expect(asleep.presence).toBe("asleep");
			expect(asleep.canSend).toBe(true);
			expect((yield* sessionRow).status).toBe("open");

			yield* sight.send(HAND.sessionId, "report your position");
			yield* eventually(
				Effect.gen(function* () {
					expect(yield* scripted.opened).toHaveLength(2);
					const resumed = yield* sessionFor(scripted, HAND.agentId);
					expect(yield* resumed.sent).toEqual(["report your position"]);
				}),
			);
		}).pipe(Effect.provide(sightLayer(temporary, scripted)));
	}),
);
