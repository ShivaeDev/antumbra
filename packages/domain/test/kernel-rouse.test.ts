import { defineIntent, IntentExecution, type IntentStatus, Kernel, KernelLive } from "@antumbra/kernel";
import { WakePayload } from "@antumbra/sessions";
import { SessionInputId } from "@antumbra/vocabulary/session-input.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Layer, Option, Ref, Stream } from "effect";
import { makeRouseSession } from "#kernel-rouse.ts";
import { acquireTemporaryPersistence } from "#test/harness.ts";

const untilWaiting = <E, R>(changes: Stream.Stream<IntentStatus, E, R>) =>
	changes.pipe(
		Stream.takeUntil((status) => status === "waiting"),
		Stream.runLast,
		Effect.map(Option.getOrThrow),
	);

const expectDistinctDemandAdvances = Effect.gen(function* () {
	const firstPayload = {
		inputId: SessionInputId.make("00000000-0000-4000-8000-000000000044"),
		sessionId: "session-one",
	} as const;
	const secondPayload = {
		message: "Please continue",
		sessionId: "session-one",
	} as const;
	const retried = yield* Ref.make<ReadonlyArray<string>>([]);
	const submitted = yield* Ref.make<ReadonlyArray<unknown>>([]);
	const kernel = Kernel.of({
		active: (kind) =>
			kind.decode(JSON.stringify(firstPayload)).pipe(
				Effect.orDie,
				Effect.map((payload) => [{ detail: "session is asleep", id: "input-wake", payload, status: "waiting" as const }]),
			),
		cancel: () => Effect.die("unexpected cancel"),
		changes: () => Stream.empty,
		retry: (id) => Ref.update(retried, (ids) => [...ids, id]),
		retryIfWaiting: () => Effect.die("unexpected conditional retry"),
		submit: (_kind, payload) =>
			Ref.update(submitted, (payloads) => [...payloads, payload]).pipe(
				Effect.as({
					changes: Stream.empty,
					id: "prompt-wake",
				}),
			),
		transitions: Stream.empty,
	});
	const wake = defineIntent({
		execute: () => Effect.void,
		payload: WakePayload,
		tag: "test/rouse-distinct-demand",
	});
	const rouse = yield* makeRouseSession(wake).pipe(Effect.provideService(Kernel, kernel));
	const result = yield* rouse(secondPayload).pipe(Effect.provideService(Kernel, kernel));
	expect(result.id).toBe("prompt-wake");
	expect(result.retried).toBe(false);
	expect(yield* Ref.get(retried)).toEqual(["input-wake"]);
	expect(yield* Ref.get(submitted)).toEqual([secondPayload]);
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

it.effect("a distinct prompt advances the parked input before submitting itself", () => expectDistinctDemandAdvances);

it.live("repeating a parked prompt advances an input that parked again", () =>
	Effect.gen(function* () {
		const inputId = SessionInputId.make("00000000-0000-4000-8000-000000000046");
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
			changes: () => Stream.empty,
			retry: (id) => Ref.update(retried, (ids) => [...ids, id]),
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
		expect(yield* Ref.get(retried)).toEqual([inputWakeId, promptWakeId]);
	}),
);
