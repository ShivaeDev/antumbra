import { it } from "@antumbra/persistence/testing";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Fiber, Schema, Stream } from "effect";
import type { IntentStatus } from "#fsm.ts";
import { maxConcurrency } from "#gate.ts";
import { defineIntent } from "#intent.ts";
import { Kernel } from "#kernel.ts";
import { KernelLive } from "#layer.ts";
import { statusesUntilTerminal } from "#test/harness.ts";
import { IntentExecution } from "#workflow.ts";

const Mode = Schema.Literals(["cancel", "queued", "run", "wait"]);
const Payload = Schema.Struct({ mode: Mode });

const until = <E, R>(changes: Stream.Stream<IntentStatus, E, R>, status: IntentStatus) =>
	changes.pipe(
		Stream.takeUntil((current) => current === status),
		Stream.runDrain,
	);

it.effectDB("returns decoded payloads for every nonterminal status", function* () {
	const runStarted = yield* Deferred.make<void>();
	const runRelease = yield* Deferred.make<void>();
	const cancelStarted = yield* Deferred.make<void>();
	const cancelRelease = yield* Deferred.make<void>();
	const kind = defineIntent({
		execute: (payload) => {
			if (payload.mode === "wait") {
				return IntentExecution.use((execution) => execution.wait("operator input required"));
			}
			if (payload.mode === "run") {
				return Deferred.succeed(runStarted, undefined).pipe(Effect.andThen(Deferred.await(runRelease)));
			}
			if (payload.mode === "cancel") {
				return Deferred.succeed(cancelStarted, undefined).pipe(Effect.andThen(Effect.uninterruptible(Deferred.await(cancelRelease))));
			}
			return Effect.void;
		},
		payload: Payload,
		tag: "test/active-statuses",
	});
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		const waiting = yield* kernel.submit(kind, { mode: "wait" });
		yield* until(waiting.changes, "waiting");
		const running = yield* kernel.submit(kind, { mode: "run" });
		yield* Deferred.await(runStarted);
		const cancelling = yield* kernel.submit(kind, { mode: "cancel" });
		yield* Deferred.await(cancelStarted);
		const cancelFiber = yield* Effect.forkChild(kernel.cancel(cancelling.id));
		yield* until(kernel.changes(cancelling.id), "cancelling");
		const queued = yield* kernel.submit(kind, { mode: "queued" });

		const active = yield* kernel.active(kind);
		const byMode = new Map(active.map((row) => [row.payload.mode, row]));
		expect(byMode.get("wait")).toMatchObject({
			detail: "operator input required",
			id: waiting.id,
			status: "waiting",
		});
		expect(byMode.get("run")).toMatchObject({
			id: running.id,
			status: "running",
		});
		expect(byMode.get("cancel")).toMatchObject({
			id: cancelling.id,
			status: "cancelling",
		});
		expect(byMode.get("queued")).toMatchObject({
			id: queued.id,
			status: "queued",
		});

		yield* kernel.cancel(waiting.id);
		yield* kernel.cancel(queued.id);
		yield* Deferred.succeed(runRelease, undefined);
		yield* Deferred.succeed(cancelRelease, undefined);
		yield* Fiber.join(cancelFiber);
		yield* statusesUntilTerminal(kernel.changes(running.id));
		expect(yield* kernel.active(kind)).toEqual([]);
	}).pipe(
		Effect.provide(
			KernelLive({
				gates: [maxConcurrency(2)],
				kinds: [kind],
			}),
		),
	);
});

it.effectDB("rejects active queries for an unregistered kind instance", function* () {
	const options = {
		execute: () => Effect.void,
		payload: Payload,
		tag: "test/active-impostor",
	};
	const registered = defineIntent(options);
	const impostor = defineIntent(options);
	yield* Effect.gen(function* () {
		const kernel = yield* Kernel;
		expect((yield* Effect.flip(kernel.active(impostor)))._tag).toBe("UnregisteredIntentTag");
	}).pipe(Effect.provide(KernelLive({ kinds: [registered] })));
});
