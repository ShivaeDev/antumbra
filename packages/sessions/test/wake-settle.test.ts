import { defineIntent, Kernel } from "@antumbra/kernel";
import { expect, it } from "@effect/vitest";
import { Effect, Ref, Stream } from "effect";
import { makeSettleWakes, WakePayload } from "#index.ts";

it.effect("advances only parked wakes addressed to the ended Session", () =>
	Effect.gen(function* () {
		const wake = defineIntent({
			execute: () => Effect.void,
			payload: WakePayload,
			tag: "test/settle-wakes",
		});
		const active = [
			{ id: "parked-here", payloadJson: JSON.stringify({ sessionId: "session-one" }), status: "waiting" },
			{ id: "running-here", payloadJson: JSON.stringify({ sessionId: "session-one" }), status: "running" },
			{ id: "parked-elsewhere", payloadJson: JSON.stringify({ sessionId: "session-two" }), status: "waiting" },
		] as const;
		const retried = yield* Ref.make<ReadonlyArray<string>>([]);
		const kernel = Kernel.of({
			active: (kind) =>
				Effect.forEach(active, (intent) =>
					kind.decode(intent.payloadJson).pipe(
						Effect.orDie,
						Effect.map((payload) => ({
							detail: null,
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
		const settle = yield* makeSettleWakes(wake).pipe(Effect.provideService(Kernel, kernel));

		yield* settle("session-one").pipe(Effect.provideService(Kernel, kernel));

		expect(yield* Ref.get(retried)).toEqual(["parked-here"]);
	}),
);
