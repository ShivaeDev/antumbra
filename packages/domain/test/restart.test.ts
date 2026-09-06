import { Kernel } from "@antumbra/kernel";
import { Database } from "@antumbra/persistence";
import { SessionRestart } from "@antumbra/sessions/restart/service";
import { endsTurn } from "@antumbra/testing";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Ref } from "effect";
import { AgentDomain } from "#domain.ts";
import { KernelReach } from "#kernel-reach/service.ts";
import { honorRestartIntent } from "#restart.ts";
import { domainKernelLayer } from "#test/domain-layers.ts";
import { acquireTemporaryPersistence, makeScriptedBackend } from "#test/harness.ts";
import { fakeKernelReach } from "#test/kernel-reach-fixture.ts";
import { untilTerminal } from "#test/session-recovery-fixture.ts";

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

interface RecordedWake {
	readonly intentStillRecorded: boolean;
	readonly sessionId: string;
}

it.effect("a restart wakes the roots it cut mid-turn and leaves those at rest, once the intent is forgotten", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* spawnHand("restart-stranded", "restart-session-stranded").pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));

		yield* Effect.gen(function* () {
			const db = yield* Database;
			const restart = yield* SessionRestart;
			yield* spawnHand("restart-one", "restart-session-one");
			yield* spawnHand("restart-two", "restart-session-two");
			yield* spawnHand("restart-idle", "restart-session-idle");
			yield* endsTurn(scripted, "restart-session-idle");

			yield* restart.record();
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

			yield* restart.record();
			yield* restart.abandon();
			expect(yield* db.AppMeta.where(RESTART_RESUME).first()).toEqual(Option.none());
			yield* honorRestartIntent.pipe(Effect.provideService(KernelReach, recordingReach));
			expect(yield* Ref.get(wakes)).toHaveLength(2);
		}).pipe(Effect.provide(domainKernelLayer(temporary, scripted.backend)));
	}),
);
