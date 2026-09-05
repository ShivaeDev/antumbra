import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { expect, it } from "@effect/vitest";
import { Effect, ManagedRuntime, Option, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { KernelReach } from "#kernel-reach/service.ts";
import { abandonRestartIntent, honorRestartIntent, recordRestartIntent } from "#restart.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend, rawOf, type ScriptedBackend, sessionFor } from "#test/harness.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";
import { eventually, untilTerminal } from "#test/session-recovery-fixture.ts";

const RESTART_RESUME = { key: "restart:resume" };

const spawnHand = (agentId: string, sessionId: string) =>
	Effect.gen(function* () {
		const domain = yield* AgentDomain;
		const kernel = yield* Kernel;
		const submission = yield* kernel.submit(domain.spawn, {
			agentId,
			backend: "scripted",
			charter: "hold until restart",
			role: "hand",
			runner: "local",
			sessionId,
		});
		expect(yield* untilTerminal(submission.changes)).toBe("succeeded");
	});

const restHand = (scripted: ScriptedBackend, agentId: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const live = yield* sessionFor(scripted, agentId);
		yield* live.emit({ durationMs: 1200, raw: rawOf("turn/completed"), status: "completed", type: "turn.completed" });
		yield* eventually(
			Effect.gen(function* () {
				expect((yield* db.AgentSession.where({ agentId }).all())[0]?.executionStatus).toBe("idle");
			}),
		);
	});

interface RecordedWake {
	readonly intentStillRecorded: boolean;
	readonly sessionId: string;
}

it.live("a restart wakes the roots it cut mid-turn and leaves those at rest, once the intent is forgotten", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		const abandoned = ManagedRuntime.make(domainKernelLayer(temporary, scripted.backend));
		yield* Effect.promise(() => abandoned.runPromise(spawnHand("restart-stranded", "restart-session-stranded")));
		yield* Effect.promise(() => abandoned.dispose());

		yield* Effect.gen(function* () {
			const db = yield* Database;
			yield* spawnHand("restart-one", "restart-session-one");
			yield* spawnHand("restart-two", "restart-session-two");
			yield* spawnHand("restart-idle", "restart-session-idle");
			yield* restHand(scripted, "restart-idle");

			yield* recordRestartIntent;
			expect(Option.getOrThrow(yield* db.AppMeta.where(RESTART_RESUME).first()).value).toBe(
				JSON.stringify(["restart-session-one", "restart-session-two"]),
			);

			const wakes = yield* Ref.make<ReadonlyArray<RecordedWake>>([]);
			const recordingReach = KernelReach.of({
				...(yield* KernelReach),
				...fakeKernelReach,
				submitWake: ({ sessionId }) =>
					Effect.gen(function* () {
						const intent = yield* db.AppMeta.where(RESTART_RESUME).first();
						yield* Ref.update(wakes, (all) => [...all, { intentStillRecorded: Option.isSome(intent), sessionId }]);
						return `wake-${sessionId}`;
					}),
			});
			yield* honorRestartIntent.pipe(Effect.provideService(KernelReach, recordingReach));
			expect(yield* Ref.get(wakes)).toEqual([
				{ intentStillRecorded: false, sessionId: "restart-session-one" },
				{ intentStillRecorded: false, sessionId: "restart-session-two" },
			]);

			yield* honorRestartIntent.pipe(Effect.provideService(KernelReach, recordingReach));
			expect(yield* Ref.get(wakes)).toHaveLength(2);

			yield* recordRestartIntent;
			yield* abandonRestartIntent;
			expect(yield* db.AppMeta.where(RESTART_RESUME).first()).toEqual(Option.none());
			yield* honorRestartIntent.pipe(Effect.provideService(KernelReach, recordingReach));
			expect(yield* Ref.get(wakes)).toHaveLength(2);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
