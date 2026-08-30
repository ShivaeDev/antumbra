import { defineIntent, IntentExecution, type IntentStatus, isTerminalIntentStatus, Kernel, KernelLive } from "@antumbra/kernel";
import { type WakeFields, WakePayload } from "@antumbra/sessions";
import { SessionInputId } from "@antumbra/vocabulary/session-input";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Layer, Option, Ref, Stream } from "effect";
import { makeRouseSession } from "#kernel-rouse.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";

const untilWaiting = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => status === "waiting"),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const untilTerminal = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(Stream.takeUntil(isTerminalIntentStatus), Stream.runLast, Effect.map(Option.getOrThrow));

const expectDistinctDemandAdvances = (tag: string, secondPayload: WakeFields) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const firstInputId = SessionInputId.make("00000000-0000-4000-8000-000000000044");
		const firstAdvanced = yield* Deferred.make<void>();
		const firstAttempts = yield* Ref.make(0);
		const executed = yield* Ref.make<ReadonlyArray<WakeFields>>([]);
		const wake = defineIntent({
			execute: (payload) =>
				Effect.gen(function* () {
					yield* Ref.update(executed, (seen) => [...seen, payload]);
					if (payload.inputId !== firstInputId) {
						yield* Deferred.await(firstAdvanced);
						return;
					}
					const attempt = yield* Ref.updateAndGet(firstAttempts, (count) => count + 1);
					if (attempt === 1) {
						return yield* IntentExecution.use((execution) => execution.wait("session is asleep"));
					}
					yield* Deferred.succeed(firstAdvanced, undefined);
				}),
			payload: WakePayload,
			tag,
		});
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const rouse = yield* makeRouseSession(wake);
			const firstPayload = {
				inputId: firstInputId,
				sessionId: "session-one",
			} as const;
			const first = yield* rouse(firstPayload);
			expect(yield* untilWaiting(first.changes)).toBe("waiting");

			const second = yield* rouse(secondPayload);
			expect(second.id).not.toBe(first.id);
			expect(second.retried).toBe(false);
			const [firstStatus, secondStatus] = yield* Effect.all([untilTerminal(kernel.changes(first.id)), untilTerminal(second.changes)], {
				concurrency: "unbounded",
			});
			expect(firstStatus).toBe("succeeded");
			expect(secondStatus).toBe("succeeded");
			expect(yield* Ref.get(firstAttempts)).toBe(2);
			const seen = yield* Ref.get(executed);
			expect(seen).toHaveLength(3);
			expect(seen.filter((candidate) => candidate.inputId === firstInputId)).toHaveLength(2);
			expect(seen).toContainEqual(secondPayload);
			expect(yield* kernel.active(wake)).toEqual([]);
		}).pipe(Effect.provide(KernelLive({ kinds: [wake] }).pipe(Layer.provideMerge(temporary.layer))));
	});

it.live("an input wake replaces a parked bare wake without orphaning its input", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const wake = defineIntent({
			execute: () => IntentExecution.use((execution) => execution.wait("session is asleep")),
			payload: WakePayload,
			tag: "test/rouse-input-identity",
		});
		yield* Effect.gen(function* () {
			const kernel = yield* Kernel;
			const parked = yield* kernel.submit(wake, { sessionId: "session-one" });
			expect(yield* untilWaiting(parked.changes)).toBe("waiting");

			const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000043");
			const rouse = yield* makeRouseSession(wake);
			const replacement = yield* rouse({ inputId, sessionId: "session-one" });
			expect(yield* untilWaiting(replacement.changes)).toBe("waiting");

			expect(replacement.id).not.toBe(parked.id);
			expect(replacement.retried).toBe(false);
			expect(yield* kernel.active(wake)).toEqual([
				{
					detail: expect.stringContaining("session is asleep"),
					id: replacement.id,
					payload: { inputId, sessionId: "session-one" },
					status: "waiting",
				},
			]);
		}).pipe(Effect.provide(KernelLive({ kinds: [wake] }).pipe(Layer.provideMerge(temporary.layer))));
	}),
);

it.live("a later input advances both distinct input wakes", () =>
	expectDistinctDemandAdvances("test/rouse-distinct-inputs", {
		inputId: SessionInputId.make("00000000-0000-4000-8000-000000000045"),
		sessionId: "session-one",
	}),
);

it.live("a later prompt advances itself and the distinct input wake", () =>
	expectDistinctDemandAdvances("test/rouse-input-then-prompt", {
		message: "Please continue",
		sessionId: "session-one",
	}),
);

it.live("repeating a parked prompt advances an input that parked again", () =>
	Effect.gen(function* () {
		const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000046");
		const inputAdvanced = yield* Deferred.make<void>();
		const promptAdvanced = yield* Deferred.make<void>();
		const retried = yield* Ref.make<ReadonlyArray<string>>([]);
		const inputWakeId = "input-wake";
		const promptWakeId = "prompt-wake";
		const promptPayload = {
			message: "Please continue",
			sessionId: "session-one",
		} as const;
		const parked = [
			{
				detail: "session is still asleep",
				id: inputWakeId,
				payloadJson: JSON.stringify({ inputId, sessionId: "session-one" }),
				status: "waiting",
			},
			{
				detail: "session is still asleep",
				id: promptWakeId,
				payloadJson: JSON.stringify(promptPayload),
				status: "waiting",
			},
		] as const;
		const progress = (id: string) => (id === inputWakeId ? inputAdvanced : promptAdvanced);
		const advancePrompt = Deferred.await(inputAdvanced).pipe(Effect.andThen(Deferred.succeed(promptAdvanced, undefined)));
		const markAdvanced = (id: string) => (id === inputWakeId ? Deferred.succeed(inputAdvanced, undefined) : advancePrompt);
		const retry = (id: string) => Ref.update(retried, (ids) => [...ids, id]).pipe(Effect.andThen(markAdvanced(id)), Effect.asVoid);
		const kernel = Kernel.of({
			active: (kind) =>
				Effect.forEach(parked, (intent) =>
					kind.decode(intent.payloadJson).pipe(
						Effect.orDie,
						Effect.map((payload) => ({
							detail: intent.detail,
							id: intent.id,
							payload,
							status: intent.status,
						})),
					),
				),
			cancel: () => Effect.die("unexpected cancel"),
			changes: (id) => Stream.fromEffect(Deferred.await(progress(id))).pipe(Stream.map(() => "succeeded" as const)),
			retry,
			retryIfWaiting: () => Effect.die("unexpected conditional retry"),
			submit: () => Effect.die("unexpected submit"),
			transitions: Stream.empty,
		});
		const wake = defineIntent({
			execute: () => Effect.void,
			payload: WakePayload,
			tag: "test/rouse-input-rewait",
		});
		const rouse = yield* makeRouseSession(wake).pipe(Effect.provideService(Kernel, kernel));
		const repeated = yield* rouse(promptPayload).pipe(Effect.provideService(Kernel, kernel));
		expect(repeated.id).toBe(promptWakeId);
		expect(repeated.retried).toBe(true);
		const [inputStatus, promptStatus] = yield* Effect.all([untilTerminal(kernel.changes(inputWakeId)), untilTerminal(repeated.changes)], {
			concurrency: "unbounded",
		});
		expect(inputStatus).toBe("succeeded");
		expect(promptStatus).toBe("succeeded");
		expect(yield* Ref.get(retried)).toEqual([inputWakeId, promptWakeId]);
	}),
);
