import type { RawPayload } from "@antumbra/vocabulary/session-events.ts";
import { expect, it } from "@effect/vitest";
import { Effect, Option, Stream } from "effect";
import { makeBackendCapacityController } from "#backend-capacity.ts";

const raw = (kind: string): RawPayload => ({
	kind,
	payload: JSON.stringify({ kind }),
	source: "scripted",
});

it.effect("publishes and remembers classified provider capacity", () =>
	Effect.gen(function* () {
		const capacity = yield* makeBackendCapacityController((evidence) =>
			evidence.kind === "limit"
				? Option.some({
						detail: "provider quota exhausted",
						reason: "usage-limit" as const,
						status: "blocked" as const,
					})
				: Option.none(),
		);
		capacity.observe(raw("other"), 40);
		expect(yield* capacity.source.current).toEqual(Option.none());

		capacity.observe(raw("limit"), 42);
		const state = yield* Stream.runHead(capacity.source.states);
		const change = Option.getOrThrow(Option.getOrThrow(state));
		expect(change).toMatchObject({
			observedAt: 42,
			reason: "usage-limit",
			status: "blocked",
		});
		expect(yield* capacity.source.current).toEqual(Option.some(change));
	}),
);

it.effect("latches a hard block until the source is explicitly cleared", () =>
	Effect.gen(function* () {
		const capacity = yield* makeBackendCapacityController((evidence) => {
			if (evidence.kind === "limit") {
				return Option.some({
					detail: "provider quota exhausted",
					reason: "usage-limit" as const,
					status: "blocked" as const,
				});
			}
			return evidence.kind === "allowed" ? Option.some({ status: "available" as const }) : Option.none();
		});

		capacity.observe(raw("limit"), 40);
		capacity.observe(raw("allowed"), 41);
		expect(Option.getOrThrow(yield* capacity.source.current).status).toBe("blocked");

		const clearAt = yield* capacity.source.clear;
		expect(clearAt).toBeGreaterThan(40);
		expect(yield* capacity.source.current).toEqual(Option.none());
		expect(yield* Stream.runHead(capacity.source.states)).toEqual(Option.some(Option.none()));
		capacity.observe(raw("allowed"), 42);
		expect(Option.getOrThrow(yield* capacity.source.current).status).toBe("available");
	}),
);
